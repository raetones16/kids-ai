/**
 * MobileFriendlyTTSService.js
 * A unified TTS service with optimized mobile support, particularly for iOS Safari
 * Consolidates functionality from the previous three TTS services.
 */

export class MobileFriendlyTTSService {
  constructor() {
    // API settings
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    
    // Device detection flags
    this.isIOSDevice = this.detectIOS();
    this.isSafariDevice = this.detectSafari();
    this.isMobileDevice = this.detectMobile();
    
    // Audio state
    this.audioContext = null;
    this.isAudioContextInitialized = false;
    this.currentSource = null;
    this.analyserNode = null;
    this.audioElement = null;
    this.dummyOscillator = null;
    
    // HTML5 Audio fallbacks for iOS
    this.audioQueue = [];
    this.isPlaying = false;
    
    // Event callbacks
    this.onStartCallback = null;
    this.onEndCallback = null;
    this.onErrorCallback = null;
    
    // Safety mechanisms
    this.timeoutId = null;
    this.heartbeatInterval = null;
    this.speakingStartTime = 0;
    this.maxSpeakingDuration = 30000; // Maximum time in speaking state (30 seconds)
    
    console.log(`MobileFriendlyTTSService initialized - Device detection: iOS=${this.isIOSDevice}, Safari=${this.isSafariDevice}, Mobile=${this.isMobileDevice}`);
  }
  
  //-------------------- DEVICE DETECTION --------------------//
  
  // Detect iOS devices
  detectIOS() {
    return [
      'iPad Simulator', 'iPhone Simulator', 'iPod Simulator',
      'iPad', 'iPhone', 'iPod'
    ].includes(navigator.platform) ||
    // iPad on iOS 13+ detection
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
  }
  
  // Detect Safari browser
  detectSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  }
  
  // Detect any mobile device
  detectMobile() {
    return this.detectIOS() || 
      /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (window.innerWidth <= 768);
  }
  
  //-------------------- AUDIO INITIALIZATION --------------------//
  
  // Initialize audio context during user interaction
  initAudioContext(options = {}) {
    try {
      // On iOS specifically, we need a new context each time
      const forceNew = options?.forceNew || false;
      
      if ((this.isIOSDevice || forceNew) && this.audioContext) {
        try {
          // Try to close the existing context
          if (this.audioContext.state !== 'closed') {
            this.audioContext.close();
          }
          this.audioContext = null;
          this.isAudioContextInitialized = false;
        } catch (e) {
          console.warn('Error closing AudioContext:', e);
        }
      }
      
      if (!this.audioContext) {
        // Create a new AudioContext
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.isAudioContextInitialized = true;
        console.log('MobileFriendlyTTSService: Created new AudioContext, state:', this.audioContext.state);
      }
      
      // On iOS/Safari, audio context might be in suspended state and needs user interaction
      if (this.audioContext.state === 'suspended') {
        // Try to resume the context
        this.audioContext.resume().then(() => {
          console.log('MobileFriendlyTTSService: AudioContext resumed successfully');
        }).catch(err => {
          console.error('MobileFriendlyTTSService: Failed to resume AudioContext:', err);
        });
      }
      
      // Critical: unlock audio on iOS with silent sound during user gesture
      this.unlockAudio();
      
      return true;
    } catch (error) {
      console.error('MobileFriendlyTTSService: Error initializing audio context:', error);
      return false;
    }
  }
  
  // iOS-specific audio unlocking with silent sound
  unlockAudio() {
    if (!this.audioContext) return;
    
    try {
      // Create and play a silent sound to unlock audio
      const silentBuffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      
      // For iOS Safari, also create and play a silent HTML5 Audio element
      if (this.isIOSDevice) {
        const silence = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
        silence.play().catch(e => console.log('Silent audio play attempt:', e));
      }
      
      console.log('MobileFriendlyTTSService: Audio unlock attempt completed');
    } catch (e) {
      console.warn('MobileFriendlyTTSService: Error during audio unlock:', e);
    }
  }
  
  //-------------------- MAIN TTS METHODS --------------------//
  
  // Primary speak method with platform-specific optimizations
  async speak(text, voice = 'fable') {
    if (!text || !text.trim()) return;
    
    // Initialize audio context during user interaction
    this.initAudioContext();
    
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
      console.log('MobileFriendlyTTSService: Safety timeout triggered - forcing end of speech state');
      this.stop();
    }, this.maxSpeakingDuration);
    
    // Call start callback
    if (this.onStartCallback) {
      this.onStartCallback();
    }
    
    try {
      console.log(`MobileFriendlyTTSService: Speaking text of length ${text.length}`);
      
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
        // iOS/Safari: Use HTML5 Audio element (better compatibility)
        await this.playWithAudioElement(audioUrl);
      } else {
        // Other browsers: Use Web Audio API (better visualization)
        await this.playWithWebAudio(audioBlob);
      }
      
      return this.analyserNode;
    } catch (error) {
      console.error('Error in MobileFriendlyTTSService:', error);
      
      // Try native speech synthesis as a last resort fallback
      if (window.speechSynthesis) {
        try {
          console.log('Trying native speech synthesis as a fallback');
          await this.speakWithNativeSpeechSynthesis(text);
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
  
  // Mobile-optimized playback with HTML5 Audio element
  async playWithAudioElement(audioUrl) {
    return new Promise((resolve, reject) => {
      try {
        // Create audio element
        const audio = new Audio();
        this.audioElement = audio;
        
        // Set up event handlers before setting the source
        audio.oncanplaythrough = () => {
          console.log('Audio can play through - starting playback');
          
          // Start the heartbeat for visualization even before play starts
          this.startVisualizationHeartbeat();
          
          // iOS Safari often requires play() to be called directly from a user action
          // but here we're likely in an async context, so use this workaround
          if (this.isIOSDevice) {
            // Force playback with small delay to ensure proper setup
            setTimeout(() => {
              audio.play().catch(e => {
                console.error('Error in delayed audio play:', e);
                reject(e);
              });
            }, 50);
          } else {
            // Normal playback for other browsers
            audio.play().catch(e => {
              console.error('Error in audio play:', e);
              reject(e);
            });
          }
        };
        
        // Playback events
        audio.onplay = () => {
          console.log('Audio element playback started');
          this.isPlaying = true;
          if (this.onStartCallback) this.onStartCallback();
        };
        
        audio.onended = () => {
          console.log('Audio element playback ended');
          this.stop();
          resolve();
        };
        
        audio.onerror = (e) => {
          console.error('Audio element error:', e);
          this.stop();
          reject(new Error('Audio playback error'));
        };
        
        // For iOS Safari, we need to set the source last
        // to avoid audio loading issues
        audio.src = audioUrl;
        
        // Create a dummy analyzer for visualization
        // even though we can't directly analyze HTML5 Audio
        this.analyserNode = this.createDummyAnalyser();
      } catch (error) {
        console.error('Error setting up audio element:', error);
        reject(error);
      }
    });
  }
  
  // Traditional playback with Web Audio API (better for visualization)
  async playWithWebAudio(audioBlob) {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Create source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Set up analyzer
      this.setupAnalyzer(source);
      
      // Store source
      this.currentSource = source;
      
      // Add event handlers
      source.onended = () => {
        console.log('Audio source playback ended');
        this.stop();
      };
      
      // Start playback
      source.start(0);
    } catch (error) {
      console.error("Error in playWithWebAudio:", error);
      throw error;
    }
  }
  
  // Last-resort fallback using browser's native speech synthesis
  async speakWithNativeSpeechSynthesis(text) {
    return new Promise((resolve, reject) => {
      // Ensure the speech synthesis interface exists
      if (!window.speechSynthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }
      
      // Set up speech synthesis
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Create a dummy analyzer for visualization
      this.analyserNode = this.createDummyAnalyser();
      
      // Start visualization heartbeat
      this.startVisualizationHeartbeat();
      
      // Get available voices
      let voices = window.speechSynthesis.getVoices();
      
      // Set up event handlers
      utterance.onstart = () => {
        console.log('Native speech synthesis started');
        this.isPlaying = true;
        if (this.onStartCallback) this.onStartCallback();
      };
      
      utterance.onend = () => {
        console.log('Native speech synthesis ended');
        this.stop();
        resolve();
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        this.stop();
        reject(new Error('Speech synthesis error'));
      };
      
      // If no voices available yet, wait for them to load
      if (!voices || voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          voices = window.speechSynthesis.getVoices();
          this.selectNativeSpeechVoice(utterance, voices);
          window.speechSynthesis.speak(utterance);
        };
      } else {
        // Voices already available, select one and speak
        this.selectNativeSpeechVoice(utterance, voices);
        window.speechSynthesis.speak(utterance);
      }
      
      // Add workaround for iOS and Chrome issue where speech can sometimes stop prematurely
      if (this.isIOSDevice || /Chrome/i.test(navigator.userAgent)) {
        // Create an interval to keep speech synthesis active
        const speechKeepAliveInterval = setInterval(() => {
          // Check if still speaking
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          } else {
            clearInterval(speechKeepAliveInterval);
          }
        }, 5000); // Check every 5 seconds
        
        // Clear interval after maximum speaking duration
        setTimeout(() => {
          clearInterval(speechKeepAliveInterval);
        }, this.maxSpeakingDuration);
      }
    });
  }
  
  // Helper to select an appropriate voice for native speech synthesis
  selectNativeSpeechVoice(utterance, voices) {
    // Try to find a good voice - prioritize natural sounding voices
    const preferredVoices = [
      voices.find(v => v.name.includes('Samantha')), // iOS/macOS
      voices.find(v => v.name.includes('Google') && v.name.includes('US English')),
      voices.find(v => v.name.includes('Daniel')), // UK English
      voices.find(v => v.name.includes('US English')), // Any US English
      voices.find(v => v.lang === 'en-US'),
      voices.find(v => v.lang.startsWith('en')),
      voices[0] // Fallback to first available voice
    ];
    
    // Find first non-null voice from the preferred list
    utterance.voice = preferredVoices.find(v => v !== undefined);
    
    if (utterance.voice) {
      console.log(`Using voice: ${utterance.voice.name} (${utterance.voice.lang})`);
    }
    
    // Set other speech parameters
    utterance.rate = 1.0; // Normal speaking rate
    utterance.pitch = 1.0; // Normal pitch
    utterance.volume = 1.0; // Full volume
  }
  
  //-------------------- AUDIO VISUALIZATION --------------------//
  
  // Set up audio analyzer for visualization
  setupAnalyzer(source) {
    // Create analyzer node if needed
    if (!this.analyserNode) {
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.7;
    }
    
    // Connect the source to the analyzer and output
    source.connect(this.analyserNode);
    this.analyserNode.connect(this.audioContext.destination);
  }
  
  // Create a dummy analyzer for HTML5 Audio playback or native speech synthesis
  createDummyAnalyser() {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    
    try {
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      
      // Create a low-volume oscillator to feed the analyzer with data
      // for visualization purposes only
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
      
      // Set volume extremely low (essentially silent but enough for analyzer)
      gainNode.gain.setValueAtTime(0.001, this.audioContext.currentTime);
      
      oscillator.connect(gainNode);
      gainNode.connect(analyser);
      // Don't connect to destination to avoid hearing it
      
      oscillator.start();
      
      // Store oscillator for cleanup later
      this.dummyOscillator = oscillator;
      
      return analyser;
    } catch (error) {
      console.error('Failed to create dummy analyser:', error);
      return null;
    }
  }
  
  // Start regular callbacks for visualization when using HTML5 Audio
  startVisualizationHeartbeat() {
    // Clear any existing heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Create a new heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      if (this.isPlaying && this.onStartCallback) {
        // This triggers visualization updates
        this.onStartCallback();
      } else if (!this.isPlaying) {
        // Clean up if we're not playing anymore
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    }, 100); // 10 updates per second
  }
  
  // Get audio data for visualization
  getAudioData() {
    // First check if we have a real analyzer node with data
    if (this.analyserNode && this.isPlaying) {
      try {
        const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
        this.analyserNode.getByteFrequencyData(dataArray);
        
        // Check if we have actual data (not all zeros)
        let hasData = false;
        for (let i = 0; i < dataArray.length; i++) {
          if (dataArray[i] > 0) {
            hasData = true;
            break;
          }
        }
        
        if (hasData) {
          return dataArray;
        }
      } catch (e) {
        // Fall back to generating fake data
      }
    }
    
    // If no analyzer or no real data, generate fake data for visualization
    return this.generateFakeAudioData();
  }
  
  // Generate fake audio data for consistent animation
  generateFakeAudioData() {
    // Create array with sensible size
    const fakeData = new Uint8Array(64);
    
    if (!this.isPlaying) {
      // Return empty data if we're not playing
      return fakeData;
    }
    
    // Create dynamic waveform data
    const time = Date.now() * 0.001; // Current time in seconds
    
    for (let i = 0; i < fakeData.length; i++) {
      // Position in array (0-1)
      const position = i / fakeData.length;
      
      // Create multiple sine waves for complexity
      fakeData[i] = Math.floor(
        80 + // base level
        Math.sin(time * 1.1 + position * 4.8) * 40 + // slow wave
        Math.sin(time * 2.7 + position * 9.4) * 30 + // medium wave
        Math.sin(time * 4.3 + position * 2.3) * 20 + // fast wave
        (Math.random() * 30) // noise
      );
      
      // Ensure values are in valid range
      fakeData[i] = Math.max(0, Math.min(255, fakeData[i]));
    }
    
    return fakeData;
  }
  
  //-------------------- CLEANUP & STATE MANAGEMENT --------------------//
  
  // Comprehensive stop method to clean up all resources
  stop() {
    console.log('MobileFriendlyTTSService: Stopping playback');
    
    // Clear safety timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      console.log('MobileFriendlyTTSService: Cleared safety timeout');
    }
    
    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('MobileFriendlyTTSService: Cleared heartbeat interval');
    }
    
    // Stop HTML5 Audio if it exists
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.src = '';
        this.audioElement = null;
        console.log('MobileFriendlyTTSService: Stopped HTML5 Audio element');
      } catch (e) {
        console.log('Non-critical error when stopping HTML5 Audio:', e);
      }
    }
    
    // Stop dummy oscillator if exists
    if (this.dummyOscillator) {
      try {
        this.dummyOscillator.stop();
        this.dummyOscillator.disconnect();
        console.log('MobileFriendlyTTSService: Stopped dummy oscillator');
      } catch (e) {
        // Ignore errors when stopping
        console.log('Non-critical error when stopping dummy oscillator:', e);
      }
      this.dummyOscillator = null;
    }
    
    // Stop audio source
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
        console.log('MobileFriendlyTTSService: Stopped and disconnected audio source');
      } catch (e) {
        // Ignore errors when stopping (might already be stopped)
        console.log('Non-critical error when stopping audio source:', e);
      }
      this.currentSource = null;
    }
    
    // Clean up analyzer if it exists
    if (this.analyserNode) {
      try {
        this.analyserNode.disconnect();
        console.log('MobileFriendlyTTSService: Disconnected analyzer node');
      } catch (e) {
        // Ignore disconnection errors
        console.log('Non-critical error when disconnecting analyzer:', e);
      }
    }
    
    // Always make sure native speech synthesis is cancelled too
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      console.log('MobileFriendlyTTSService: Cancelled native speech synthesis');
    }
    
    // Clear the audio queue
    this.audioQueue = [];
    
    // Signal that playback has stopped
    if (this.isPlaying) {
      this.isPlaying = false;
      console.log('MobileFriendlyTTSService: Set isPlaying to false');
      
      // Call end callback immediately to ensure UI updates right away
      if (this.onEndCallback) {
        console.log('MobileFriendlyTTSService: Calling onEndCallback');
        this.onEndCallback();
      }
    }
  }
  
  //-------------------- EVENT HANDLERS --------------------//
  
  // Event handler registration methods
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