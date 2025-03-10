export class SpeechRecognitionService {
  constructor(language = 'en-GB') {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported in this browser');
    }
    
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = language;
    this.isListening = false;
    this.onResultCallback = null;
    this.onEndCallback = null;
    this.onErrorCallback = null;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.recognition.onresult = (event) => {
      const result = event.results[0];
      const transcript = result[0].transcript;
      
      if (result.isFinal && this.onResultCallback) {
        this.onResultCallback(transcript);
      }
    };
    
    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    };
    
    this.recognition.onerror = (event) => {
      this.isListening = false;
      if (this.onErrorCallback) {
        this.onErrorCallback(event.error);
      }
    };
  }
  
  start() {
    if (!this.isListening) {
      try {
        this.recognition.start();
        this.isListening = true;
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        if (this.onErrorCallback) {
          this.onErrorCallback(error.message);
        }
      }
    }
  }
  
  stop() {
    if (this.isListening) {
      try {
        this.recognition.stop();
        this.isListening = false;
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
  }
  
  onResult(callback) {
    this.onResultCallback = callback;
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
