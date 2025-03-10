export class TextToSpeechService {
  constructor() {
    // Check for browser support
    if (!window.speechSynthesis) {
      throw new Error('Speech synthesis not supported in this browser');
    }
    
    this.synthesis = window.speechSynthesis;
    this.voice = null;
    this.onStartCallback = null;
    this.onEndCallback = null;
    this.onBoundaryCallback = null;
    
    // Initialize with British English voice if available
    this.initializeVoice();
  }
  
  async initializeVoice() {
    // Wait for voices to be loaded
    if (speechSynthesis.getVoices().length === 0) {
      await new Promise(resolve => {
        speechSynthesis.onvoiceschanged = resolve;
      });
    }
    
    const voices = this.synthesis.getVoices();
    
    // Find a British English voice
    this.voice = voices.find(voice => 
      voice.lang.includes('en-GB') && (voice.name.includes('Female') || !voice.name.includes('Male'))
    );
    
    // Fallback to any English voice
    if (!this.voice) {
      this.voice = voices.find(voice => voice.lang.includes('en')) || voices[0];
    }
  }
  
  speak(text) {
    // Cancel any ongoing speech
    this.synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (this.voice) {
      utterance.voice = this.voice;
    }
    
    utterance.lang = 'en-GB';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => {
      if (this.onStartCallback) this.onStartCallback();
    };
    
    utterance.onend = () => {
      if (this.onEndCallback) this.onEndCallback();
    };
    
    utterance.onboundary = (event) => {
      if (this.onBoundaryCallback) this.onBoundaryCallback(event);
    };
    
    this.synthesis.speak(utterance);
  }
  
  stop() {
    this.synthesis.cancel();
  }
  
  onStart(callback) {
    this.onStartCallback = callback;
    return this;
  }
  
  onEnd(callback) {
    this.onEndCallback = callback;
    return this;
  }
  
  onBoundary(callback) {
    this.onBoundaryCallback = callback;
    return this;
  }
}
