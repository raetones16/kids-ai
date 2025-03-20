/**
 * DirectTtsService.js
 * A direct implementation of TTS using the backend API proxy to OpenAI
 * This bypasses the streaming/chunking logic to ensure a single, unified speech experience
 */

export class DirectTtsService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    this.isPlaying = false;
    this.audioContext = null;
    this.currentSource = null;
    this.onStartCallback = null;
    this.onEndCallback = null;
    this.analyserNode = null;
    this.timeoutId = null;
    this.speakingStartTime = 0;
    this.maxSpeakingDuration = 30000; // Maximum time in speaking state (30 seconds)
  }
  
  // Initialize audio context (needed for Web Audio API)
  initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } else if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
  
  // Speak the text as a single unified utterance
  async speak(text, voice = 'fable') {
    if (!text || !text.trim()) return;
    
    // Initialize audio context if needed
    this.initAudioContext();
    
    // Stop any current playback
    this.stop();
    
    try {
      console.log('DirectTtsService: Starting to speak text');
      // Signal that speech is starting and track start time
      this.isPlaying = true;
      this.speakingStartTime = Date.now();
      console.log('DirectTtsService: Speech started at:', this.speakingStartTime);
      
      // Set a safety timeout to prevent getting stuck in speaking state
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }
      
      // Force reset to idle state after timeout period
      this.timeoutId = setTimeout(() => {
        console.log('DirectTtsService: Safety timeout triggered - forcing end of speech state');
        this.stop();
      }, this.maxSpeakingDuration);
      
      if (this.onStartCallback) {
        console.log('DirectTtsService: Calling onStartCallback');
        this.onStartCallback();
      }
      
      // Call backend TTS API instead of OpenAI directly
      const response = await fetch(`${this.baseUrl}/ai/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          voice
        })
      });
      
      if (!response.ok) {
        throw new Error(`Backend TTS API error: ${response.status}`);
      }
      
      console.log('DirectTtsService: API response received, processing audio');
      
      // Get audio data as a blob
      const audioBlob = await response.blob();
      
      // Create a source from the blob
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Create source and connect to an analyzer for visualization
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Set up analyzer for visualization data
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 128; // Smaller FFT size for better performance
      this.analyserNode.smoothingTimeConstant = 0.7; // Add smoothing for more natural visualization
      source.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);
      
      // Store source for potential stopping
      this.currentSource = source;
      
      // Set up event handler for when audio ends
      source.onended = () => {
        console.log('Audio playback ended');
        this.isPlaying = false;
        if (this.onEndCallback) this.onEndCallback();
      };
      
      // Create a heartbeat to ensure we maintain the speaking state while audio is playing
      // This helps keep the animation going even if the analyzer doesn't produce data
      this.heartbeatInterval = setInterval(() => {
        // Only continue if we're still playing
        if (this.isPlaying) {
          // Force a call to the start callback to ensure speaking state is maintained
          if (this.onStartCallback) {
            this.onStartCallback();
          }
        } else {
          // Clear interval if we're no longer playing
          clearInterval(this.heartbeatInterval);
        }
      }, 500); // Check every 500ms
      
      // Make sure we're in playing state
      this.isPlaying = true;
      if (this.onStartCallback) {
        console.log('DirectTtsService: Calling onStartCallback again before play');
        this.onStartCallback();
      }
      
      // Start playback
      console.log('DirectTtsService: Starting audio playback');
      source.start(0);
      
      return this.analyserNode;
    } catch (error) {
      console.error('Error in TTS:', error);
      this.isPlaying = false;
      throw error;
    }
  }
  
  // Stop any current playback
  stop() {
    console.log('DirectTtsService: Stopping playback');
    
    // Clear safety timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      console.log('DirectTtsService: Cleared safety timeout');
    }
    
    // Clear heartbeat interval first
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('DirectTtsService: Cleared heartbeat interval');
    }
    
    // Stop audio source
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
        console.log('DirectTtsService: Stopped and disconnected audio source');
      } catch (e) {
        // Ignore errors when stopping (might already be stopped)
        console.log('Non-critical error when stopping audio source:', e);
      }
      this.currentSource = null;
    }
    
    // Clean up analyzer if it exists
    if (this.analyserNode) {
      try {
        this.analyserNode.disconnect();
        console.log('DirectTtsService: Disconnected analyzer node');
      } catch (e) {
        // Ignore disconnection errors
        console.log('Non-critical error when disconnecting analyzer:', e);
      }
    }
    
    // Signal that playback has stopped
    if (this.isPlaying) {
      this.isPlaying = false;
      console.log('DirectTtsService: Set isPlaying to false');
      
      // Call end callback immediately to ensure UI updates right away
      if (this.onEndCallback) {
        console.log('DirectTtsService: Calling onEndCallback');
        this.onEndCallback();
      }
    }
  }
  
  // Get audio data for visualization
  getAudioData() {
    // First check if we have an analyzer node and are still playing
    if (!this.analyserNode || !this.audioContext || !this.isPlaying) {
      return this.generateFakeAudioData();
    }
    
    // Try to get real frequency data
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    
    // Check if we actually have data (sometimes the analyzer returns all zeros)
    let hasData = false;
    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > 0) {
        hasData = true;
        break;
      }
    }
    
    // If we have real data, return it
    if (hasData) {
      return dataArray;
    } else {
      // Otherwise generate fake data
      return this.generateFakeAudioData();
    }
  }
  
  // Generate fake audio data for consistent animation
  generateFakeAudioData() {
    // Create array with sensible size
    const fakeData = new Uint8Array(64);
    
    if (!this.isPlaying) {
      // Return empty data if we're not playing
      return fakeData;
    }
    
    // Create dynamic waveform data
    const time = Date.now() * 0.001; // Current time in seconds
    
    for (let i = 0; i < fakeData.length; i++) {
      // Position in array (0-1)
      const position = i / fakeData.length;
      
      // Create multiple sine waves for complexity
      fakeData[i] = Math.floor(
        80 + // base level
        Math.sin(time * 1.1 + position * 4.8) * 40 + // slow wave
        Math.sin(time * 2.7 + position * 9.4) * 30 + // medium wave
        Math.sin(time * 4.3 + position * 2.3) * 20 + // fast wave
        (Math.random() * 30) // noise
      );
      
      // Ensure values are in valid range
      fakeData[i] = Math.max(0, Math.min(255, fakeData[i]));
    }
    
    return fakeData;
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
}
