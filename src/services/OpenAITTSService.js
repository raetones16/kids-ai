/**
 * OpenAITTSService.js
 * Service to handle text-to-speech using OpenAI's TTS API
 * Enhanced with streaming and chunking capabilities
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
  
  // Process text chunk for TTS (optimized)
  async speakChunk(chunk, voice = 'nova') {
    if (!chunk || chunk.trim() === '') return null;
    
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
          response_format: 'mp3',
          speed: 1.0 // Slightly faster speech (default is 1.0)
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI TTS API error: ${error.error?.message || 'Unknown error'}`);
      }
      
      // Get audio blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Measure TTS API latency
      console.log(`TTS API for "${chunk.substring(0, 20)}..." completed in ${performance.now() - startTime}ms`);
      
      // Start a timer for audio decoding
      const decodeStartTime = performance.now();
      
      // Set up audio nodes for visualization
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      console.log(`Audio decoding completed in ${performance.now() - decodeStartTime}ms`);
      
      return {
        buffer: audioBuffer,
        url: audioUrl
      };
    } catch (error) {
      console.error('Error processing TTS chunk:', error);
      
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      
      return null;
    }
  }
  
  // New streaming speech method that processes chunks as they arrive (optimized)
  async speakStream(chunk, isPausePoint, isComplete, voice = 'nova') {
    // Skip empty or very short chunks unless they complete a sentence
    if (!chunk || (chunk.trim().length < 3 && !isPausePoint && !isComplete)) {
      return false;
    }
    
    // Initialize audio context if needed
    if (!this.isAudioContextInitialized) {
      console.warn('AudioContext not initialized. Call initAudioContext() after a user interaction.');
      return false;
    }
    
    try {
      // Process the new chunk
      const audioResult = await this.speakChunk(chunk, voice);
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
  
  // New method for streaming speech with chunks
  async speak(text, voice = 'nova') {
    // Cancel any current audio
    this.stop();
    
    if (!text) return;
    
    // Clear any existing audio queue
    this.audioQueue = [];
    
    // Process entire text at once (for backward compatibility)
    try {
      // Notify that we're starting speech
      if (this.onStartCallback) {
        this.onStartCallback();
      }
      
      const result = await this.speakChunk(text, voice);
      
      if (result) {
        // Set up audio nodes for visualization
        const source = this.audioContext.createBufferSource();
        source.buffer = result.buffer;
        
        // Create analyser for audio visualization
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 256;
        
        source.connect(this.analyserNode);
        this.analyserNode.connect(this.audioContext.destination);
        
        // Set up event handlers
        source.onended = () => {
          if (this.onEndCallback) {
            this.onEndCallback();
          }
          
          // Clean up URL object
          URL.revokeObjectURL(result.url);
        };
        
        // Store source for potential stopping
        this.currentSource = source;
        
        // Start playback
        source.start(0);
        
        return this.analyserNode;
      }
    } catch (error) {
      console.error('Error in OpenAI TTS:', error);
      
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      
      throw error;
    }
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
  
  stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Ignore errors when stopping (might already be stopped)
      }
      this.currentSource = null;
    }
  }
  
  // Get audio data for visualization
  getAudioData() {
    if (!this.analyserNode || !this.isAudioContextInitialized) return null;
    
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }
  
  // Break text into sentence-level chunks
  splitIntoSentences(text) {
    // Split text on sentence endings (period, question mark, exclamation point followed by space)
    const sentences = text.split(this.sentenceRegex);
    const result = [];
    
    let currentIndex = 0;
    for (const sentence of sentences) {
      if (sentence.trim() === '') continue;
      
      // Find where this sentence appears in the original text
      const sentenceIndex = text.indexOf(sentence, currentIndex);
      if (sentenceIndex === -1) continue;
      
      // Include the sentence ending punctuation
      const endIndex = sentenceIndex + sentence.length;
      let endChar = '';
      if (endIndex < text.length) {
        endChar = text.charAt(endIndex);
      }
      
      // Add to results
      result.push(sentence + endChar);
      currentIndex = endIndex + 1;
    }
    
    return result;
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
}
