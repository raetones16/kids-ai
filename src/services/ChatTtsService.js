/**
 * ChatTtsService.js
 * A simplified TTS manager updated to use the MobileFriendlyTTSService
 * as the primary implementation for cross-platform compatibility
 */

import { MobileFriendlyTTSService } from './MobileFriendlyTTSService';

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
    
    this.maxSpeakingDuration = 60000; // Maximum time in speaking state (60 seconds)
  }
  
  // Initialize the service
  initialize() {
    if (this.initialized) return;
    
    try {
      // Always use the MobileFriendlyTTSService
      this.ttsService = new MobileFriendlyTTSService();
      
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
        
        this.ttsService.onError((error) => {
          console.error('ChatTtsService: TTS service error:', error);
          this.isPlaying = false;
          if (this.onErrorCallback) this.onErrorCallback(error);
        });
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize TTS service:', error);
      
      // If initialization fails, still mark as initialized but in error state
      this.initialized = true;
      
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
    }
  }
  
  // Ensure audio context is initialized (during user interaction)
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
        await this.ttsService.speak(text, voice);
      }
    } catch (error) {
      console.error('ChatTtsService: Error speaking text:', error);
      
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      
      // Reset state
      this.isPlaying = false;
      
      // Explicitly call the onEnd callback to ensure UI state is updated
      if (this.onEndCallback) {
        this.onEndCallback();
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