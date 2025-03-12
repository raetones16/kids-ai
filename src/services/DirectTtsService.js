/**
 * DirectTtsService.js
 * A direct implementation of TTS using the OpenAI API
 * This bypasses the streaming/chunking logic to ensure a single, unified speech experience
 */

export class DirectTtsService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.isPlaying = false;
    this.audioContext = null;
    this.currentSource = null;
    this.onStartCallback = null;
    this.onEndCallback = null;
    this.analyserNode = null;
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
  async speak(text, voice = 'nova') {
    if (!text || !text.trim()) return;
    
    // Initialize audio context if needed
    this.initAudioContext();
    
    // Stop any current playback
    this.stop();
    
    try {
      // Signal that speech is starting
      this.isPlaying = true;
      if (this.onStartCallback) this.onStartCallback();
      
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
          voice: voice,
          response_format: 'mp3' // Using mp3 for better quality
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      
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
      this.analyserNode.fftSize = 256;
      source.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);
      
      // Set up event handler for when audio ends
      source.onended = () => {
        this.isPlaying = false;
        if (this.onEndCallback) this.onEndCallback();
      };
      
      // Store source for potential stopping
      this.currentSource = source;
      
      // Start playback
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
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Ignore errors when stopping (might already be stopped)
      }
      this.currentSource = null;
    }
    
    this.isPlaying = false;
  }
  
  // Get audio data for visualization
  getAudioData() {
    if (!this.analyserNode || !this.audioContext) return null;
    
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
}
