export class SpeechRecognitionService {
  constructor(language = 'en-GB') {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported in this browser');
    }
    
    // Create a fresh instance each time
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = language;
    this.recognition.maxAlternatives = 1;
    this.isListening = false;
    this.onResultCallback = null;
    this.onEndCallback = null;
    this.onErrorCallback = null;
    
    this.setupEventListeners();
    console.log('Speech recognition service initialized');
  }
  
  setupEventListeners() {
    this.recognition.onresult = (event) => {
      console.log('Speech recognition result event:', event);
      if (event.results && event.results.length > 0) {
        const result = event.results[0];
        const transcript = result[0].transcript;
        console.log('Transcript:', transcript, 'isFinal:', result.isFinal);
        
        if (result.isFinal && this.onResultCallback) {
          this.onResultCallback(transcript);
        }
      }
    };
    
    this.recognition.onend = () => {
      console.log('Speech recognition ended naturally');
      this.isListening = false;
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      if (this.onErrorCallback) {
        this.onErrorCallback(event.error);
      }
    };

    this.recognition.onnomatch = () => {
      console.log('Speech recognition no match');
      // No speech was recognized
      if (this.onErrorCallback) {
        this.onErrorCallback('No speech detected');
      }
    };

    this.recognition.onaudiostart = () => {
      console.log('Speech recognition audio started');
    };

    this.recognition.onaudioend = () => {
      console.log('Speech recognition audio ended');
    };

    this.recognition.onspeechstart = () => {
      console.log('Speech recognition speech started');
    };

    this.recognition.onspeechend = () => {
      console.log('Speech recognition speech ended');
    };
  }
  
  start() {
    console.log('Starting speech recognition...');
    if (this.isListening) {
      console.warn('Speech recognition already active, stopping first');
      this.stop();
    }
    
    try {
      this.recognition.start();
      this.isListening = true;
      console.log('Speech recognition started successfully');
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      this.isListening = false;
      if (this.onErrorCallback) {
        this.onErrorCallback(error.message || 'Failed to start speech recognition');
      }
    }
  }
  
  stop() {
    console.log('Stopping speech recognition...');
    if (this.isListening) {
      try {
        this.recognition.stop();
        this.isListening = false;
        console.log('Speech recognition stopped successfully');
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
        // Force reset state
        this.isListening = false;
      }
    } else {
      console.log('Speech recognition was not active, nothing to stop');
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
