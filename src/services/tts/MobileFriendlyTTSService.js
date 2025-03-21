/**
 * MobileFriendlyTTSService.js
 * Primary TTS service optimized for mobile platforms, especially iOS Safari
 */

import * as DeviceDetection from './DeviceDetection';
import * as AudioUnlock from './AudioUnlock';
import * as AudioPlayer from './AudioPlayer';
import * as Visualization from './Visualization';

export class MobileFriendlyTTSService {
  constructor() {
    // API settings
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    
    // Device detection
    this.isIOSDevice = DeviceDetection.detectIOS();
    this.isSafariDevice = DeviceDetection.detectSafari();
    this.isMobileDevice = DeviceDetection.detectMobile();
    
    // Audio state
    this.audioContext = null;
    this.isAudioContextInitialized = false;
    this.currentSource = null;
    this.analyserNode = null;
    this.audioElement = null;
    this.dummyOscillator = null;
    
    // Playing state
    this.isPlaying = false;
    
    // Event callbacks
    this.onStartCallback = null;
    this.onEndCallback = null;
    this.onErrorCallback = null;
    
    // Safety mechanisms
    this.timeoutId = null;
    this.speakingStartTime = 0;
    this.maxSpeakingDuration = 30000; // Maximum time in speaking state (30 seconds)
    
    console.log(`MobileFriendlyTTSService initialized:`, DeviceDetection.getDeviceInfo());
  }
  
  /**
   * Initialize audio context during user interaction
   */
  initAudioContext(options = {}) {
    try {
      const forceNew = options?.forceNew || false;
      
      // Close existing context if forcing new or on iOS
      if ((this.isIOSDevice || forceNew) && this.audioContext) {
        try {
          if (this.audioContext.state !== 'closed') {
            this.audioContext.close();
          }
          this.audioContext = null;
          this.isAudioContextInitialized = false;
        } catch (e) {
          console.warn('Error closing AudioContext:', e);
        }
      }
      
      // Create a new AudioContext if needed
      if (!this.audioContext) {
        this.audioContext = AudioUnlock.createAudioContext();
        this.isAudioContextInitialized = !!this.audioContext;
        console.log('Created new AudioContext, initialized:', this.isAudioContextInitialized);
      }
      
      // Critical: unlock audio on iOS with silent sound during user gesture
      AudioUnlock.unlockAudio(this.audioContext);
      
      return this.isAudioContextInitialized;
    } catch (error) {
      console.error('Error initializing audio context:', error);
      return false;
    }
  }
  
  /**
   * Primary speak method with platform-specific optimizations
   */
  async speak(text, voice = 'fable') {
    if (!text || !text.trim()) return;
    
    // Initialize audio context during user interaction
    this.initAudioContext();
    
    // Make sure audio is unlocked for iOS devices
    if (this.isIOSDevice || this.isSafariDevice) {
      await AudioUnlock.ensureAudioUnlocked(this.audioContext);
    }
    
    // Stop any current playback
    this.stop();
    
    // Begin tracking state
    this.isPlaying = true;
    this.speakingStartTime = Date.now();
    
    // Set safety timeout to prevent getting stuck in speaking state
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    // Force reset to idle state after timeout period
    this.timeoutId = setTimeout(() => {
      console.log('Safety timeout triggered - forcing end of speech state');
      this.stop();
    }, this.maxSpeakingDuration);
    
    // Call start callback
    if (this.onStartCallback) {
      this.onStartCallback();
    }
    
    try {
      console.log(`Speaking text of length ${text.length}`);
      
      // Call backend TTS API
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
      
      // Get audio data as a blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Platform-specific playback methods
      if (this.isIOSDevice || this.isSafariDevice) {
        // iOS/Safari: Always use HTML5 Audio element (better compatibility)
        this.audioElement = await AudioPlayer.playWithAudioElement(
          audioUrl,
          () => this.handleStart(),
          () => this.handleEnd(),
          () => this.handleVisualization()
        );
        
        // Create a dummy analyzer for visualization
        const dummyAnalysis = Visualization.createDummyAnalyser(this.audioContext);
        this.analyserNode = dummyAnalysis.analyser;
        this.dummyOscillator = dummyAnalysis.oscillator;
      } else {
        // Other browsers: Try Web Audio API first (better visualization)
        try {
          const { source, analyser } = await AudioPlayer.playWithWebAudio(
            audioBlob, 
            this.audioContext,
            () => this.handleEnd()
          );
          this.currentSource = source;
          this.analyserNode = analyser;
          
          // Make sure start callback is called
          this.handleStart();
        } catch (error) {
          console.warn('Web Audio API playback failed, falling back to Audio element:', error);
          
          // Fall back to HTML5 Audio element
          this.audioElement = await AudioPlayer.playWithAudioElement(
            audioUrl,
            () => this.handleStart(),
            () => this.handleEnd(),
            () => this.handleVisualization()
          );
          
          // Create a dummy analyzer for visualization
          const dummyAnalysis = Visualization.createDummyAnalyser(this.audioContext);
          this.analyserNode = dummyAnalysis.analyser;
          this.dummyOscillator = dummyAnalysis.oscillator;
        }
      }
      
      return this.analyserNode;
    } catch (error) {
      console.error('Error in TTS service:', error);
      
      // Try native speech synthesis as a last resort fallback
      if (window.speechSynthesis) {
        try {
          console.log('Trying native speech synthesis as a fallback');
          await AudioPlayer.speakWithNativeSpeechSynthesis(
            text,
            () => this.handleStart(),
            () => this.handleEnd(),
            () => this.handleVisualization()
          );
          
          // Create a dummy analyzer for native speech synthesis
          const dummyAnalysis = Visualization.createDummyAnalyser(this.audioContext);
          this.analyserNode = dummyAnalysis.analyser;
          this.dummyOscillator = dummyAnalysis.oscillator;
          
          return this.analyserNode;
        } catch (fallbackError) {
          console.error('Error in fallback TTS:', fallbackError);
        }
      }
      
      // Call error callback
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      
      // Always clean up
      this.stop();
      throw error;
    }
  }
  
  /**
   * Handle audio playback start
   */
  handleStart() {
    console.log('Audio playback started');
    this.isPlaying = true;
    
    if (this.onStartCallback) {
      this.onStartCallback();
    }
  }
  
  /**
   * Handle audio playback end
   */
  handleEnd() {
    console.log('Audio playback ended');
    this.stop();
    
    if (this.onEndCallback) {
      this.onEndCallback();
    }
  }
  
  /**
   * Handle visualization update
   */
  handleVisualization() {
    if (this.onStartCallback) {
      this.onStartCallback();
    }
  }
  
  /**
   * Stop playback and clean up resources
   */
  stop() {
    console.log('Stopping playback');
    
    // Clear safety timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    // Stop visualization heartbeat
    AudioPlayer.stopVisualizationHeartbeat();
    
    // Stop HTML5 Audio if it exists
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.src = '';
        this.audioElement = null;
      } catch (e) {
        console.log('Non-critical error when stopping HTML5 Audio:', e);
      }
    }
    
    // Clean up visualization resources
    Visualization.cleanupVisualization({
      oscillator: this.dummyOscillator,
      analyser: this.analyserNode
    });
    this.dummyOscillator = null;
    this.analyserNode = null;
    
    // Stop audio source
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (e) {
        // Ignore errors when stopping (might already be stopped)
        console.log('Non-critical error when stopping audio source:', e);
      }
      this.currentSource = null;
    }
    
    // Always make sure native speech synthesis is cancelled too
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    // Signal that playback has stopped
    this.isPlaying = false;
    
    // Clear URL Objects to prevent memory leaks
    if (window.URL && window.URL.revokeObjectURL) {
      try {
        // Basic garbage collection - may need more specific URL tracking in the future
        if (typeof window.gc === 'function') {
          window.gc();
        }
      } catch (e) {
        // Ignore errors during garbage collection
      }
    }
  }
  
  /**
   * Get audio data for visualization
   */
  getAudioData() {
    return Visualization.getAudioData(this.analyserNode, this.isPlaying);
  }
  
  /**
   * Register start event handler
   */
  onStart(callback) {
    this.onStartCallback = callback;
    return this;
  }
  
  /**
   * Register end event handler
   */
  onEnd(callback) {
    this.onEndCallback = callback;
    return this;
  }
  
  /**
   * Register error event handler
   */
  onError(callback) {
    this.onErrorCallback = callback;
    return this;
  }
}

export default MobileFriendlyTTSService;
