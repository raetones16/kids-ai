/**
 * OpenAITTSService.js
 * Service to handle text-to-speech using OpenAI's TTS API
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
  
  async speak(text, voice = 'nova') {
    // Cancel any current audio
    this.stop();
    
    if (!text) return;
    
    // Initialize audio context if not already done
    if (!this.isAudioContextInitialized) {
      console.warn('AudioContext not initialized. Call initAudioContext() after a user interaction.');
      return;
    }
    
    // Make sure the audio context is running
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    try {
      // Call OpenAI TTS API
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: voice, // 'nova' is a female British voice
          response_format: 'mp3'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI TTS API error: ${error.error?.message || 'Unknown error'}`);
      }
      
      // Get audio blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Trigger onStart callback
      if (this.onStartCallback) {
        this.onStartCallback();
      }
      
      // Set up audio nodes for visualization
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
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
        URL.revokeObjectURL(audioUrl);
      };
      
      // Store source for potential stopping
      this.currentSource = source;
      
      // Start playback
      source.start(0);
      
      return this.analyserNode;
    } catch (error) {
      console.error('Error in OpenAI TTS:', error);
      
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      
      // Fallback to browser TTS or handle error differently
      throw error;
    }
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
