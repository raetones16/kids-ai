/**
 * ChatTtsService.js
 * A simplified TTS manager that handles the full text at once instead of chunking
 * This ensures a smooth, natural speech experience with no gaps
 */

import { DirectTtsService } from './DirectTtsService';

export class ChatTtsService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.ttsService = null;
    this.initialized = false;
    this.isPlaying = false;
    this.onStartCallback = null;
    this.onEndCallback = null;
    this.onErrorCallback = null;
    
    this.useOpenAI = true; // Default to OpenAI TTS
  }
  
  initialize() {
    if (this.initialized) return;
    
    try {
      if (this.useOpenAI && this.apiKey) {
        this.ttsService = new DirectTtsService(this.apiKey);
        
        // Set callbacks
        if (this.ttsService) {
          this.ttsService.onStart(() => {
            this.isPlaying = true;
            if (this.onStartCallback) this.onStartCallback();
          });
          
          this.ttsService.onEnd(() => {
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
              this.isPlaying = true;
              if (this.onStartCallback) this.onStartCallback();
            };
            
            utterance.onend = () => {
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
    
    // Stop any current speech
    this.stop();
    
    try {
      console.log(`Speaking full text: "${text.substring(0, 40)}..."`);
      
      // Start speech
      this.isPlaying = true;
      if (this.onStartCallback) this.onStartCallback();
      
      // Speak using the TTS service
      if (this.ttsService) {
        // Always use the direct speak method to ensure the entire text is spoken as one unit
        await this.ttsService.speak(text);
      }
    } catch (error) {
      console.error('Error speaking text:', error);
      
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      
      // Try fallback to browser's built-in TTS
      try {
        const speechSynthesis = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.speak(utterance);
      } catch (fallbackError) {
        console.error('Fallback TTS error:', fallbackError);
      }
    }
  }
  
  // Stop any current speech
  stop() {
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
