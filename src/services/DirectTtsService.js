/**
 * DirectTtsService.js
 * A direct implementation of TTS using the backend API proxy to OpenAI
 * This bypasses the streaming/chunking logic to ensure a single, unified speech experience
 * Enhanced with better mobile support
 */

export class DirectTtsService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    this.isPlaying = false;
    this.audioContext = null;
    this.currentSource = null;
    this.onStartCallback = null;
    this.onEndCallback = null;
    this.analyserNode = null;
    this.timeoutId = null;
    this.speakingStartTime = 0;
    this.maxSpeakingDuration = 30000; // Maximum time in speaking state (30 seconds)
    this.heartbeatInterval = null;
    this.audioElement = null;
    this.dummyOscillator = null;
  }
  
  // Enhanced AudioContext initialization for mobile compatibility
  initAudioContext(options = {}) {
    try {
      // On iOS specifically, we need a new context each time
      if ((this.isIOS() || options?.forceNew) && this.audioContext) {
        try {
          // Try to close the existing context
          if (this.audioContext.state !== 'closed') {
            this.audioContext.close();
          }
          this.audioContext = null;
        } catch (e) {
          console.warn('Error closing AudioContext:', e);
        }
      }

      if (!this.audioContext) {
        // Always create a new AudioContext instead of reusing
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('DirectTtsService: Created new AudioContext, state:', this.audioContext.state);
      }
      
      // On iOS/Safari, audio context might be in suspended state and needs user interaction
      if (this.audioContext.state === 'suspended') {
        // Try to resume the context
        this.audioContext.resume().then(() => {
          console.log('DirectTtsService: AudioContext resumed successfully, state:', this.audioContext.state);
        }).catch(err => {
          console.error('DirectTtsService: Failed to resume AudioContext:', err);
        });
      }
      
      // Critical: unlock audio on iOS with silent sound during user gesture
      if (this.isIOS()) {
        // Create and play a silent sound to unlock audio - critical for iOS
        const silentSound = this.audioContext.createBuffer(1, 1, 22050);
        const source = this.audioContext.createBufferSource();
        source.buffer = silentSound;
        source.connect(this.audioContext.destination);
        source.start(0);
        console.log('DirectTtsService: Played silent sound to unlock audio on iOS');
      }
    } catch (error) {
      console.error('DirectTtsService: Error initializing audio context:', error);
    }
  }
  
  // Helper to detect iOS devices
  isIOS() {
    return [
      'iPad Simulator', 'iPhone Simulator', 'iPod Simulator',
      'iPad', 'iPhone', 'iPod'
    ].includes(navigator.platform) ||
    // iPad on iOS 13 detection
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
  }
  
  // Helper to detect mobile devices
  isMobile() {
    return this.isIOS() || 
      /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (window.innerWidth <= 768);
  }
  
  // Multi-method speak function with improved mobile support
  async speak(text, voice = 'fable') {
    if (!text || !text.trim()) return;
    
    // Initialize audio context if needed
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
      console.log('DirectTtsService: Safety timeout triggered - forcing end of speech state');
      this.stop();
    }, this.maxSpeakingDuration);
    
    if (this.onStartCallback) {
      console.log('DirectTtsService: Calling onStartCallback');
      this.onStartCallback();
    }
    
    try {
      console.log('DirectTtsService: Starting to speak text');
      
      // Call backend TTS API instead of OpenAI directly
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
      
      console.log('DirectTtsService: API response received, processing audio');
      
      // Get audio data as a blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // CRITICAL CHANGE: First try with HTML5 Audio element (better mobile support)
      if (this.isMobile()) {
        await this.playWithAudioElement(audioUrl);
      } else {
        // Use Web Audio API for desktop (better visualization control)
        await this.playWithWebAudio(audioBlob);
      }
      
      return this.analyserNode;
    } catch (error) {
      console.error('Error in TTS:', error);
      
      // If TTS fails on mobile, try the built-in speech synthesis as a last resort
      if (this.isMobile() && window.speechSynthesis) {
        try {
          console.log('Trying native speech synthesis as a fallback for mobile');
          this.speakWithFallback(text);
          return this.analyserNode;
        } catch (fallbackError) {
          console.error('Error in fallback TTS:', fallbackError);
        }
      }
      
      // Always clean up
      this.stop();
      throw error;
    }
  }
  
  // New method to play with HTML5 Audio element (better for mobile)
  async playWithAudioElement(audioUrl) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      this.audioElement = audio;
      
      // Monitor playback with a heartbeat for visualization
      this.heartbeatInterval = setInterval(() => {
        if (this.isPlaying && this.onStartCallback) {
          this.onStartCallback();
        }
      }, 100);
      
      // Create a dummy analyzer for visualization
      this.analyserNode = this.createDummyAnalyser();
      
      // Set up event handlers
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
      
      // Start playback
      audio.play().catch(err => {
        console.error('Error playing audio element:', err);
        // If HTML5 Audio fails, try Web Audio as last resort
        this.stop();
        reject(err);
      });
    });
  }
  
  // Desktop method (existing, but made more robust)
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
  
  // Create a dummy analyzer for HTML5 Audio playback
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
  
  // Mobile-friendly fallback using browser's built-in TTS
  speakWithFallback(text) {
    console.log('Using native speech synthesis as a fallback for mobile');
    
    // Ensure the speech synthesis interface exists
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported on this device');
      this.isPlaying = false;
      if (this.onEndCallback) this.onEndCallback();
      return;
    }
    
    try {
      // Set up speech synthesis
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Get available voices
      let voices = window.speechSynthesis.getVoices();
      
      // If no voices available yet, wait for them to load
      if (!voices || voices.length === 0) {
        console.log('No voices available yet, waiting for voiceschanged event');
        window.speechSynthesis.onvoiceschanged = () => {
          voices = window.speechSynthesis.getVoices();
          this.selectVoiceAndSpeak(utterance, voices);
        };
      } else {
        // Voices already available, select one and speak
        this.selectVoiceAndSpeak(utterance, voices);
      }
      
      // Set up analyser node for visualization
      // Even though we can't get real audio data from native TTS,
      // we'll create a dummy analyzer for the visualization
      this.analyserNode = this.createDummyAnalyser();
      
      return this.analyserNode;
    } catch (error) {
      console.error('Error in fallback TTS:', error);
      this.isPlaying = false;
      if (this.onEndCallback) this.onEndCallback();
    }
  }
  
  // Helper to select an appropriate voice and start speaking
  selectVoiceAndSpeak(utterance, voices) {
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
    
    // Event handlers
    utterance.onstart = () => {
      console.log('Native speech started');
      this.isPlaying = true;
      // Make sure callback is called
      if (this.onStartCallback) this.onStartCallback();
    };
    
    utterance.onend = () => {
      console.log('Native speech ended');
      this.isPlaying = false;
      if (this.onEndCallback) this.onEndCallback();
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      this.isPlaying = false;
      if (this.onEndCallback) this.onEndCallback();
    };
    
    // Start speaking
    console.log('Starting native speech synthesis');
    window.speechSynthesis.cancel(); // Cancel any existing speech
    window.speechSynthesis.speak(utterance);
    
    // Add workaround for iOS and Chrome issue where speech can sometimes stop prematurely
    if (this.isIOS() || /Chrome/i.test(navigator.userAgent)) {
      // Create an interval to keep speech synthesis active
      const speechKeepAliveInterval = setInterval(() => {
        // Check if still speaking
        if (window.speechSynthesis.speaking) {
          console.log('Keeping speech synthesis active...');
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
  }
  
  // Improved stop method
  stop() {
    console.log('DirectTtsService: Stopping playback');
    
    // Clear safety timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      console.log('DirectTtsService: Cleared safety timeout');
    }
    
    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('DirectTtsService: Cleared heartbeat interval');
    }
    
    // Stop HTML5 Audio if it exists
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.src = '';
        this.audioElement = null;
        console.log('DirectTtsService: Stopped HTML5 Audio element');
      } catch (e) {
        console.log('Non-critical error when stopping HTML5 Audio:', e);
      }
    }
    
    // Stop dummy oscillator if exists
    if (this.dummyOscillator) {
      try {
        this.dummyOscillator.stop();
        this.dummyOscillator.disconnect();
        console.log('DirectTtsService: Stopped dummy oscillator');
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
        console.log('DirectTtsService: Stopped and disconnected audio source');
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
        console.log('DirectTtsService: Disconnected analyzer node');
      } catch (e) {
        // Ignore disconnection errors
        console.log('Non-critical error when disconnecting analyzer:', e);
      }
    }
    
    // Always make sure native speech synthesis is cancelled too
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      console.log('DirectTtsService: Cancelled native speech synthesis');
    }
    
    // Signal that playback has stopped
    if (this.isPlaying) {
      this.isPlaying = false;
      console.log('DirectTtsService: Set isPlaying to false');
      
      // Call end callback immediately to ensure UI updates right away
      if (this.onEndCallback) {
        console.log('DirectTtsService: Calling onEndCallback');
        this.onEndCallback();
      }
    }
  }
  
  // Get audio data for visualization
  getAudioData() {
    // First check if we have an analyzer node and are still playing
    if (!this.analyserNode || !this.audioContext || !this.isPlaying) {
      return this.generateFakeAudioData();
    }
    
    // Try to get real frequency data
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    
    // Check if we actually have data (sometimes the analyzer returns all zeros)
    let hasData = false;
    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > 0) {
        hasData = true;
        break;
      }
    }
    
    // If we have real data, return it
    if (hasData) {
      return dataArray;
    } else {
      // Otherwise generate fake data
      return this.generateFakeAudioData();
    }
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
