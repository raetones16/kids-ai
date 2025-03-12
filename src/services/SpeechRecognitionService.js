export class SpeechRecognitionService {
  constructor(language = 'en-GB') {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported in this browser');
    }
    
    // Create a fresh instance each time
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true; // Keep listening even after pauses
    this.recognition.interimResults = true;
    this.recognition.lang = language;
    this.recognition.maxAlternatives = 1;
    
    this.isListening = false;
    this.finalResults = []; // Array to store all final results
    this.silenceTimer = null;
    this.lastResultTime = Date.now();
    
    // Default pause threshold
    this.pauseThreshold = 1000; // Default to 1 second
    
    // Callbacks
    this.onResultCallback = null;
    this.onEndCallback = null;
    this.onErrorCallback = null;
    
    this.setupEventListeners();
    console.log('Speech recognition service initialized with standard pause threshold');
  }
  
  setupEventListeners() {
    this.recognition.onresult = (event) => {
      console.log('Speech recognition result event:', event);
      this.lastResultTime = Date.now();
      
      // We'll only look at the most recent result (the last one in the results collection)
      if (event.results && event.results.length > 0) {
        // Get latest result (could be interim or final)
        const resultIndex = event.resultIndex;
        const result = event.results[resultIndex];
        
        console.log(`Result ${resultIndex}: "${result[0].transcript}", isFinal: ${result.isFinal}`);
        
        if (result.isFinal) {
          // Store each final result separately - we'll join them later when submitting
          this.finalResults.push(result[0].transcript.trim());
          console.log('Stored final results:', this.finalResults);
        }
        
        // Clear any existing silence timer
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
        }
        
        // Set a new timer for silence detection
        this.silenceTimer = setTimeout(() => {
          // If we have accumulated final results, submit them all together
          if (this.finalResults.length > 0) {
            // Join all the final results together with proper spacing
            const fullTranscript = this.finalResults.join(' ');
            console.log('Pause detected - submitting complete transcript:', fullTranscript);
            
            if (this.onResultCallback) {
              this.onResultCallback(fullTranscript);
              this.finalResults = []; // Reset after submitting
              this.stop(); // Stop listening after submission
            }
          }
        }, this.pauseThreshold);
      }
    };
    
    this.recognition.onend = () => {
      console.log('Speech recognition ended naturally');
      
      // If we have final results that weren't submitted yet, submit them now
      if (this.finalResults.length > 0) {
        const fullTranscript = this.finalResults.join(' ');
        console.log('Submitting final transcript on end:', fullTranscript);
        
        if (this.onResultCallback) {
          this.onResultCallback(fullTranscript);
          this.finalResults = [];
        }
      }
      
      this.isListening = false;
      
      if (this.onEndCallback) {
        this.onEndCallback();
      }
      
      // Clear any pending timers
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      
      // If we have collected final results before the error, submit them
      if (this.finalResults.length > 0) {
        const fullTranscript = this.finalResults.join(' ');
        
        if (this.onResultCallback) {
          this.onResultCallback(fullTranscript);
          this.finalResults = [];
        }
      }
      
      if (this.onErrorCallback) {
        this.onErrorCallback(event.error);
      }
      
      // Clear any pending timers
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
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
  
  // Set the pause threshold (in milliseconds)
  setPauseThreshold(milliseconds) {
    if (milliseconds >= 1000 && milliseconds <= 10000) {
      console.log(`Setting pause threshold to ${milliseconds}ms`);
      this.pauseThreshold = milliseconds;
      return true;
    } else {
      console.warn('Pause threshold must be between 1000ms and 10000ms');
      return false;
    }
  }
  
  start() {
    console.log('Starting speech recognition...');
    if (this.isListening) {
      console.warn('Speech recognition already active, stopping first');
      this.stop();
    }
    
    try {
      this.finalResults = []; // Reset results when starting
      this.lastResultTime = Date.now();
      
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
        // Clear any pending timers
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
        
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
