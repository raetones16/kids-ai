/**
 * ChatTtsService.js
 * A simplified TTS manager that handles the full text at once instead of chunking
 * This ensures a smooth, natural speech experience with no gaps
 */

import { DirectTtsService } from './DirectTtsService';

export class ChatTtsService {
  constructor() {
    this.ttsService = null;
    this.initialized = false;
    this.isPlaying = false;
    this.onStartCallback = null;
    this.onEndCallback = null;
    this.onErrorCallback = null;
    this.timeoutId = null;
    this.speakingStartTime = 0;
    
    this.useOpenAI = true; // Default to OpenAI TTS
    this.maxSpeakingDuration = 60000; // Maximum time in speaking state (60 seconds)
  }
  
  // Initialize
  initialize() {
    if (this.initialized) return;
    
    try {
      if (this.useOpenAI) {
        // Use the updated DirectTtsService that calls our backend proxy
        this.ttsService = new DirectTtsService();
        
        // Set callbacks
        if (this.ttsService) {
          this.ttsService.onStart(() => {
            console.log('ChatTtsService: TTS service onStart callback fired');
            this.isPlaying = true;
            if (this.onStartCallback) this.onStartCallback();
          });
          
          this.ttsService.onEnd(() => {
            console.log('ChatTtsService: TTS service onEnd callback fired');
            this.isPlaying = false;
            if (this.onEndCallback) this.onEndCallback();
          });
        }
      } else {
        // Fallback to browser's built-in TTS
        this.ttsService = {
          speak: (text) => {
            const speechSynthesis = window.speechSynthesis;
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Set callbacks
            utterance.onstart = () => {
              console.log('Browser TTS onstart fired');
              this.isPlaying = true;
              if (this.onStartCallback) this.onStartCallback();
            };
            
            utterance.onend = () => {
              console.log('Browser TTS onend fired');
              this.isPlaying = false;
              if (this.onEndCallback) this.onEndCallback();
            };
            
            speechSynthesis.speak(utterance);
          },
          stop: () => {
            window.speechSynthesis.cancel();
          },
          initAudioContext: () => {}
        };
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize TTS service:', error);
      // Fallback to browser's built-in TTS
      try {
        this.ttsService = {
          speak: (text) => {
            const speechSynthesis = window.speechSynthesis;
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Set callbacks
            utterance.onstart = () => {
              console.log('Browser TTS fallback onstart fired');
              this.isPlaying = true;
              if (this.onStartCallback) this.onStartCallback();
            };
            
            utterance.onend = () => {
              console.log('Browser TTS fallback onend fired');
              this.isPlaying = false;
              if (this.onEndCallback) this.onEndCallback();
            };
            
            speechSynthesis.speak(utterance);
          },
          stop: () => {
            window.speechSynthesis.cancel();
          },
          initAudioContext: () => {}
        };
        this.initialized = true;
      } catch (fallbackError) {
        console.error('Fallback TTS error:', fallbackError);
      }
    }
  }
  
  // Ensure audio context is initialized (needed for OpenAI TTS)
  initAudioContext() {
    if (!this.initialized) {
      this.initialize();
    }
    
    if (this.ttsService && typeof this.ttsService.initAudioContext === 'function') {
      this.ttsService.initAudioContext();
    }
  }
  
  // Speak the entire text as a single unit
  async speak(text, voice = 'fable') {
    if (!text || !text.trim()) return;
    
    if (!this.initialized) {
      this.initialize();
    }
    
    // If already playing, don't start another speech
    if (this.isPlaying) {
      console.log('ChatTtsService: Already speaking, ignoring new speak request');
      return;
    }
    
    // Stop any current speech
    this.stop();
    
    try {
      console.log(`ChatTtsService: Speaking text of length ${text.length}: "${text.substring(0, 40)}..."`);
      
      // Start speech and track start time
      this.isPlaying = true;
      this.speakingStartTime = Date.now();
      console.log('ChatTtsService: Setting isPlaying to true, speech started at:', this.speakingStartTime);
      
      // Set a safety timeout to prevent getting stuck in speaking state
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }
      
      // Force reset to idle state after timeout period
      this.timeoutId = setTimeout(() => {
        console.log('ChatTtsService: Safety timeout triggered - forcing end of speech state');
        this.stop();
      }, this.maxSpeakingDuration);
      
      if (this.onStartCallback) {
        console.log('ChatTtsService: Calling onStartCallback');
        this.onStartCallback();
      }
      
      // Speak using the TTS service
      if (this.ttsService) {
        console.log('ChatTtsService: Calling TTS service speak method');
        // Always use the direct speak method to ensure the entire text is spoken as one unit
        await this.ttsService.speak(text, voice);
      }
    } catch (error) {
      console.error('ChatTtsService: Error speaking text:', error);
      
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      
      // Try fallback to browser's built-in TTS
      try {
        console.log('ChatTtsService: Trying fallback browser TTS');
        // Set playing state to ensure proper animation
        this.isPlaying = true;
        if (this.onStartCallback) {
          console.log('ChatTtsService: Calling onStartCallback for fallback');
          this.onStartCallback();
        }
        
        const speechSynthesis = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Add event handlers to manage state
        utterance.onstart = () => {
          console.log('Browser TTS started');
          this.isPlaying = true;
          if (this.onStartCallback) this.onStartCallback();
        };
        
        utterance.onend = () => {
          console.log('Browser TTS ended');
          this.isPlaying = false;
          if (this.onEndCallback) this.onEndCallback();
        };
        
        // Explicitly force the speaking state
        if (this.onStartCallback) this.onStartCallback();
        
        speechSynthesis.speak(utterance);
      } catch (fallbackError) {
        console.error('ChatTtsService: Fallback TTS error:', fallbackError);
      }
    }
  }
  
  // Stop any current speech
  stop() {
    // Clear any safety timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    if (this.ttsService) {
      if (typeof this.ttsService.stop === 'function') {
        this.ttsService.stop();
      }
    }
    
    // Make sure we update state and call the end callback
    if (this.isPlaying) {
      this.isPlaying = false;
      
      // Explicitly call the onEnd callback to ensure UI state is updated
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    }
    
    // Also ensure browser's built-in TTS is stopped as a fallback
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
  
  // Get audio data for visualizations
  getAudioData() {
    if (this.ttsService && typeof this.ttsService.getAudioData === 'function') {
      return this.ttsService.getAudioData();
    }
    return null;
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
