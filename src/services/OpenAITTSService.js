/**
 * OpenAITTSService.js
 * Service to handle text-to-speech using OpenAI's TTS API
 * Optimized with streaming, chunking, and low-latency features
 */

export class OpenAITTSService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    this.apiKey = apiKey;
    this.audioContext = null; // Initialize later on user interaction
    this.onStartCallback = null;
    this.onEndCallback = null;
    this.onErrorCallback = null;
    this.currentSource = null;
    this.analyserNode = null;
    this.isAudioContextInitialized = false;
    
    // For audio chunking
    this.audioQueue = [];
    this.isPlaying = false;
    this.sentenceRegex = /[.!?]\s+/g; // For breaking text into sentences
    
    // Adjust for better initial response - make first chunk smaller
    this.firstChunkSizeTarget = 30; // Target 30 characters for first chunk to get speech started faster
    this.chunkSizeTarget = 100; // Target 100 characters for subsequent chunks
    
    // Prefetch and parallel processing management
    this.prefetchQueue = []; // Queue for managing prefetch requests
    this.maxPrefetchCount = 2; // Maximum number of chunks to prefetch
    this.inProgressFetches = new Map(); // Track in-progress fetches to avoid duplicates
    this.processedChunks = new Set(); // Track which chunks we've already processed
    
    // Response format options - use WAV for even lower latency
    this.responseFormat = 'wav'; // Use wav for lowest latency
  }
  
  // Initialize the audio context (should be called after a user gesture)
  initAudioContext() {
    if (!this.isAudioContextInitialized) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.isAudioContextInitialized = true;
    } else if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
  
  // Process text chunk for TTS with true streaming
  async speakChunkStreaming(chunk, voice = 'fable') {
    if (!chunk || chunk.trim() === '') return null;
    
    // Normalize the chunk to ensure consistent handling
    chunk = chunk.trim();
    
    // Check if we've already processed this exact chunk
    const chunkHash = `${chunk}-${voice}`;
    if (this.processedChunks.has(chunkHash)) {
      console.log(`Already processed chunk "${chunk.substring(0, 20)}...", skipping`);
      return null;
    }
    
    // Initialize audio context if not already done
    if (!this.isAudioContextInitialized) {
      console.warn('AudioContext not initialized. Call initAudioContext() after a user interaction.');
      return null;
    }
    
    // Make sure the audio context is running
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    try {
      // Start a timer to measure TTS API performance
      const startTime = performance.now();
      
      // Check if we're already fetching this chunk (avoid duplicates in prefetch)
      if (this.inProgressFetches.has(chunkHash)) {
        console.log(`Already fetching chunk "${chunk.substring(0, 20)}...", returning existing promise`);
        const fetchResult = await this.inProgressFetches.get(chunkHash).promise;
        return fetchResult;
      }
      
      // Create an AbortController to allow cancelling the fetch
      const controller = new AbortController();
      const { signal } = controller;
      
      // Create the promise for the fetch operation
      const fetchPromise = (async () => {
        try {
          // Call OpenAI TTS API with the chunk
          const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'tts-1',
              input: chunk,
              voice: voice, // 'nova' is a female British voice
              response_format: this.responseFormat, // Use wav for lowest latency
              speed: 1.0 // Normal speech rate for better comprehension
            }),
            signal // Add AbortController signal to allow cancellation
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI TTS API error: ${error.error?.message || 'Unknown error'}`);
          }
          
          // Start processing the audio stream as soon as it starts arriving
          const reader = response.body.getReader();
          const chunks = [];
          let receivedLength = 0;
          
          // Log when we start receiving data
          console.log(`TTS API for "${chunk.substring(0, 20)}..." started receiving data after ${performance.now() - startTime}ms`);
          
          let firstChunkTime = null;
          
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              break;
            }
            
            if (!firstChunkTime) {
              firstChunkTime = performance.now();
              console.log(`First audio chunk received after ${firstChunkTime - startTime}ms`);
            }
            
            chunks.push(value);
            receivedLength += value.length;
          }
          
          // Concatenate all chunks into a single Uint8Array
          const allChunks = new Uint8Array(receivedLength);
          let position = 0;
          for (const chunk of chunks) {
            allChunks.set(chunk, position);
            position += chunk.length;
          }
          
          // Create blob and URL
          const audioBlob = new Blob([allChunks], { type: `audio/${this.responseFormat}` });
          const audioUrl = URL.createObjectURL(audioBlob);
          
          // Measure total TTS API latency
          console.log(`TTS API for "${chunk.substring(0, 20)}..." completed in ${performance.now() - startTime}ms`);
          
          // Start a timer for audio decoding
          const decodeStartTime = performance.now();
          
          // Set up audio nodes for visualization
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
          
          console.log(`Audio decoding completed in ${performance.now() - decodeStartTime}ms`);
          
          // Mark this chunk as processed
          this.processedChunks.add(chunkHash);
          
          return {
            buffer: audioBuffer,
            url: audioUrl
          };
        } finally {
          // Remove from in-progress fetches when done (success or error)
          this.inProgressFetches.delete(chunkHash);
        }
      })();
      
      // Store the promise in the in-progress fetches map
      this.inProgressFetches.set(chunkHash, {
        promise: fetchPromise,
        controller: controller
      });
      
      // Return the result of the promise
      return fetchPromise;
    } catch (error) {
      console.error('Error processing TTS chunk:', error);
      
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      
      return null;
    }
  }
  
  // Find optimal breakpoints for chunking
  findOptimalChunkBreakpoint(text, targetSize = this.chunkSizeTarget, isFirstChunk = false) {
    // Adjust target size if it's the first chunk
    const actualTargetSize = isFirstChunk ? this.firstChunkSizeTarget : targetSize;
    
    // If text is shorter than target, return the whole thing
    if (text.length <= actualTargetSize) {
      return text.length;
    }
    
    // Priority order for break points:
    // 1. Sentence end (.!?)
    // 2. Comma, semicolon, colon (,;:)
    // 3. End of word (space)
    // 4. Hard break if nothing else found
    
    // Look in a window around the target size
    const windowStart = Math.max(0, actualTargetSize - 10);
    const windowEnd = Math.min(text.length, actualTargetSize + 20);
    const searchText = text.substring(windowStart, windowEnd);
    
    // For first chunk, prefer ANY punctuation or space
    if (isFirstChunk) {
      // For first chunk, check for any punctuation followed by a space
      const punctuationMatch = searchText.match(/[.,!?;:]\s+/);
      if (punctuationMatch) {
        return windowStart + punctuationMatch.index + punctuationMatch[0].length;
      }
      
      // Or any space after a decent number of characters
      const spaceMatch = searchText.match(/\s+/);
      if (spaceMatch && windowStart + spaceMatch.index > actualTargetSize / 2) {
        return windowStart + spaceMatch.index + 1;
      }
      
      // For first chunk, accept even shorter length to get started quickly
      return Math.min(actualTargetSize, text.length);
    }
    
    // For subsequent chunks, be more precise about break points
    // Check for sentence endings
    const sentenceMatch = searchText.match(/[.!?]\s+/);
    if (sentenceMatch) {
      return windowStart + sentenceMatch.index + sentenceMatch[0].length;
    }
    
    // Check for other punctuation
    const punctuationMatch = searchText.match(/[,;:]\s+/);
    if (punctuationMatch) {
      return windowStart + punctuationMatch.index + punctuationMatch[0].length;
    }
    
    // Find the last space
    const lastSpaceIndex = searchText.lastIndexOf(' ');
    if (lastSpaceIndex !== -1) {
      return windowStart + lastSpaceIndex + 1;
    }
    
    // If no good breakpoint, just split at target size
    return actualTargetSize;
  }
  
  // Break text into optimal chunks for TTS with special handling for first chunk
  optimizeTextChunks(text) {
    const chunks = [];
    let remainingText = text.trim();
    
    // Process first chunk with smaller target size to get speech started faster
    if (remainingText.length > 0) {
      const firstBreakpoint = this.findOptimalChunkBreakpoint(remainingText, this.chunkSizeTarget, true);
      chunks.push(remainingText.substring(0, firstBreakpoint));
      remainingText = remainingText.substring(firstBreakpoint);
    }
    
    // Process remaining text with normal chunk size
    while (remainingText.length > 0) {
      // Find the optimal breakpoint for this chunk
      const breakpoint = this.findOptimalChunkBreakpoint(remainingText, this.chunkSizeTarget, false);
      
      // Add this chunk to our list
      chunks.push(remainingText.substring(0, breakpoint));
      
      // Update the remaining text
      remainingText = remainingText.substring(breakpoint);
    }
    
    return chunks;
  }
  
  // Process input and handle prefetching for upcoming chunks
  async prefetchNextChunks(textChunks, currentIndex, voice = 'fable') {
    const remainingChunks = textChunks.slice(currentIndex + 1);
    
    // Only prefetch up to maxPrefetchCount chunks
    const chunksToFetch = remainingChunks.slice(0, this.maxPrefetchCount);
    
    if (chunksToFetch.length === 0) return;
    
    console.log(`Prefetching ${chunksToFetch.length} upcoming chunks`);
    
    // Create prefetch promises for each chunk
    const prefetchPromises = chunksToFetch.map((chunk, idx) => {
      // Short delay to prioritize main chunk processing
      const delay = idx * 30; // Reduce delay to start prefetching sooner
      return new Promise(resolve => {
        setTimeout(async () => {
          try {
            await this.speakChunkStreaming(chunk, voice);
            resolve();
          } catch (error) {
            console.warn('Error prefetching chunk:', error);
            resolve(); // Still resolve to not block others
          }
        }, delay);
      });
    });
    
    // Don't await the prefetch - let it happen in the background
    Promise.all(prefetchPromises).catch(err => {
      console.warn('Error in prefetch queue:', err);
    });
  }
  
  // Improved streaming speech method with optimized chunking
  async speakStreamOptimized(text, voice = 'fable') {
    if (!text || text.trim() === '') return false;
    
    // Clean the text
    text = text.trim();
    
    // Initialize audio context if needed
    if (!this.isAudioContextInitialized) {
      console.warn('AudioContext not initialized. Call initAudioContext() after a user interaction.');
      return false;
    }
    
    try {
      // Reset the processed chunks tracking to avoid issues with similar chunks
      this.processedChunks = new Set();
      
      // Break the text into optimized chunks with special handling for first chunk
      const chunks = this.optimizeTextChunks(text);
      console.log(`Optimized "${text}" into ${chunks.length} chunks`);
      
      // Process the first chunk immediately
      if (chunks.length > 0) {
        // Start prefetching ALL remaining chunks in parallel for smaller messages
        if (chunks.length > 1) {
          this.prefetchNextChunks(chunks, 0, voice);
        }
        
        // Process the first chunk
        const audioResult = await this.speakChunkStreaming(chunks[0], voice);
        if (!audioResult) return false;
        
        // Add to queue
        this.audioQueue.push(audioResult);
        
        // If nothing is playing, start playback
        if (!this.isPlaying) {
          this.isPlaying = true;
          
          // Notify that we're starting speech
          if (this.onStartCallback) {
            this.onStartCallback();
          }
          
          // Start playing the queue
          this.playNextInQueue();
        }
        
        // Process the rest of the chunks sequentially
        // (loading them into the queue while the audio is playing)
        if (chunks.length > 1) {
          for (let i = 1; i < chunks.length; i++) {
            // Process the next chunk
            const audioResult = await this.speakChunkStreaming(chunks[i], voice);
            if (audioResult) {
              this.audioQueue.push(audioResult);
              
              // Prefetch upcoming chunks
              if (i < chunks.length - 1) {
                this.prefetchNextChunks(chunks, i, voice);
              }
            }
          }
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error in streaming TTS:', error);
      
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      
      return false;
    }
  }
  
  // Check if a chunk is contained within another chunk that was already processed
  isChunkSubsetOfProcessed(chunk) {
    // Clean the chunk for consistent comparison
    chunk = chunk.trim();
    
    // Skip very small chunks as they're more likely to be duplicates
    if (chunk.length < 5) return true;
    
    // Check against each processed chunk
    for (const processedChunk of this.processedChunks) {
      // Extract just the chunk text from the hash (remove the voice part)
      const processedText = processedChunk.split('-')[0];
      if (processedText && processedText.includes(chunk)) {
        return true;
      }
    }
    
    return false;
  }
  
  // New streaming speech method that processes chunks as they arrive
  // With additional streaming optimizations
  async speakStream(chunk, isPausePoint, isComplete, voice = 'fable') {
    // Check if this is an empty or very small chunk
    if (!chunk || chunk.trim().length < 2) {
      return false;
    }
    
    // Clean the chunk
    chunk = chunk.trim();
    
    // Check if this chunk is a subset of a chunk we've already processed
    if (this.isChunkSubsetOfProcessed(chunk)) {
      console.log(`Chunk "${chunk.substring(0, 20)}..." is a subset of already processed content, skipping`);
      return false;
    }
    
    // For larger chunks or complete messages, use the optimized streaming method
    if (chunk.length > 40 || isComplete) {
      return this.speakStreamOptimized(chunk, voice);
    }
    
    // Initialize audio context if needed
    if (!this.isAudioContextInitialized) {
      console.warn('AudioContext not initialized. Call initAudioContext() after a user interaction.');
      return false;
    }
    
    try {
      // Process the new chunk
      const audioResult = await this.speakChunkStreaming(chunk, voice);
      if (!audioResult) return false;
      
      // Add to queue
      this.audioQueue.push(audioResult);
      
      // If this is the first chunk and nothing is playing, start playback
      if (!this.isPlaying) {
        this.isPlaying = true;
        
        // Notify that we're starting speech
        if (this.onStartCallback) {
          this.onStartCallback();
        }
        
        // Start playing the queue
        this.playNextInQueue();
      }
      
      return true;
    } catch (error) {
      console.error('Error in streaming TTS:', error);
      
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      
      return false;
    }
  }
  
  // Backward compatibility method for full-text speech
  async speak(text, voice = 'fable') {
    // Cancel any current audio
    this.stop();
    
    if (!text) return;
    
    // Clear any existing audio queue
    this.audioQueue = [];
    
    // Reset the processed chunks tracking
    this.processedChunks = new Set();
    
    // Use the optimized streaming method for all text
    this.speakStreamOptimized(text, voice);
    return this.analyserNode;
  }
  
  // Play the next audio segment in the queue
  playNextInQueue() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      
      // Notify that speech has ended
      if (this.onEndCallback) {
        this.onEndCallback();
      }
      
      return;
    }
    
    const nextAudio = this.audioQueue.shift();
    
    // Set up audio nodes for visualization
    const source = this.audioContext.createBufferSource();
    source.buffer = nextAudio.buffer;
    
    // Create analyser for audio visualization
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 256;
    
    source.connect(this.analyserNode);
    this.analyserNode.connect(this.audioContext.destination);
    
    // Set up event handlers for when this segment ends
    source.onended = () => {
      // Clean up URL object
      URL.revokeObjectURL(nextAudio.url);
      
      // Play the next segment
      this.playNextInQueue();
    };
    
    // Store source for potential stopping
    this.currentSource = source;
    
    // Start playback
    source.start(0);
  }
  
  // Stop audio and clean up
  stop() {
    // Stop current playback
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Ignore errors when stopping (might already be stopped)
      }
      this.currentSource = null;
    }
    
    // Clear queues
    this.audioQueue = [];
    this.isPlaying = false;
    
    // Stop any in-progress fetches
    for (const { controller } of this.inProgressFetches.values()) {
      try {
        controller.abort();
      } catch (e) {
        // Ignore abort errors
      }
    }
    this.inProgressFetches.clear();
    
    // Reset the processed chunks tracking
    this.processedChunks = new Set();
  }
  
  // Get audio data for visualization
  getAudioData() {
    if (!this.analyserNode || !this.isAudioContextInitialized) return null;
    
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }
  
  // Event handlers
  onStart(callback) {
    this.onStartCallback = callback;
    return this;
  }
  
  onEnd(callback) {
    this.onEndCallback = callback;
    return this;
  }
  
  onError(callback) {
    this.onErrorCallback = callback;
    return this;
  }
  
  // Utility function to set the response format
  // Allows switching between 'opus', 'wav', 'mp3', etc.
  setResponseFormat(format) {
    const validFormats = ['opus', 'wav', 'mp3', 'aac', 'flac', 'pcm'];
    if (!validFormats.includes(format)) {
      console.warn(`Invalid format: ${format}. Using 'wav' instead.`);
      this.responseFormat = 'wav';
    } else {
      this.responseFormat = format;
      console.log(`TTS response format set to ${format}`);
    }
    return this;
  }
}
