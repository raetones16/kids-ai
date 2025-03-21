/**
 * AudioUnlock.js
 * Utilities for unlocking audio on iOS and other mobile platforms
 */

import { detectIOS, detectSafari } from './DeviceDetection';

/**
 * Creates and initializes an AudioContext with proper mobile handling
 * @param {boolean} forceNew Force creating a new context even if one exists
 * @returns {AudioContext|null} The initialized AudioContext
 */
export function createAudioContext(forceNew = false) {
  let audioContext = null;
  
  try {
    // Create a new AudioContext
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log('Created new AudioContext, state:', audioContext.state);
    
    // On iOS/Safari, audio context might be in suspended state
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        console.log('AudioContext resumed successfully');
      }).catch(err => {
        console.error('Failed to resume AudioContext:', err);
      });
    }
    
    return audioContext;
  } catch (error) {
    console.error('Error creating audio context:', error);
    return null;
  }
}

/**
 * Global tracking for audio unlocking state
 */
let _audioUnlocked = false;

/**
 * Check if audio has been unlocked
 * @returns {boolean} True if audio has been unlocked
 */
export function isAudioUnlocked() {
  return _audioUnlocked;
}

/**
 * Set the audio unlocked state
 * @param {boolean} state The new unlocked state
 */
export function setAudioUnlocked(state) {
  _audioUnlocked = state;
}

/**
 * Comprehensive audio unlocking for iOS and other mobile browsers
 * Must be called during a user interaction (click/touch)
 * @param {AudioContext} audioContext The audio context to unlock
 */
export function unlockAudio(audioContext) {
  if (!audioContext) return;
  
  const isIOS = detectIOS();
  const isSafari = detectSafari();
  
  try {
    console.log('Attempting comprehensive audio unlock sequence');
    
    // 1. Create and play a silent sound through audio context
    const silentBuffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = silentBuffer;
    source.connect(audioContext.destination);
    source.start(0);
    
    // 2. For iOS Safari, also create and play a silent HTML5 Audio element
    if (isIOS || isSafari) {
      // Create a very short base64 encoded silence MP3
      const silence = new Audio("data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//////////////////////////////////////////////////////////////////8AAABhTEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQAB9AAAAnGMHkkIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAADgnABGiAAQBCqgCRMAAgEAH///////////////7+n/9FTuQsQH//////2NG0jWUGlio5gLQTOtIoeR2WX////X4s9Atb/JRVCbBUpeRUq//////////////////9RUi0f2jn/+xDECgPCjAEQAABN4AAANIAAAAQVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==");
      
      // Add event handlers before attempting playback
      silence.addEventListener('canplaythrough', () => {
        console.log('Silent audio can play through');
        
        // Attempt to play immediately
        const playPromise = silence.play();
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('Silent audio playback started');
            _audioUnlocked = true;
          }).catch(e => {
            console.error('Silent audio play failed:', e);
          });
        }
      }, { once: true });
      
      silence.addEventListener('error', (e) => {
        console.error('Silent audio error:', e);
      }, { once: true });
      
      // Force preload
      silence.load();
    }
    
    // 3. Also try to resume AudioContext (needed on some browsers)
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        console.log('AudioContext resumed during unlock');
        _audioUnlocked = true;
      }).catch(e => {
        console.warn('AudioContext resume failed:', e);
      });
    }
    
    // 4. Use webkitAudioContext specific method if available (older iOS)
    if (audioContext && typeof audioContext.createGain === 'function') {
      const gain = audioContext.createGain();
      gain.gain.value = 1;
      gain.connect(audioContext.destination);
    }
    
    console.log('Audio unlock sequence completed');
    _audioUnlocked = true;
  } catch (e) {
    console.warn('Error during audio unlock:', e);
  }
}

/**
 * Ensures audio is unlocked before playback
 * @param {AudioContext} audioContext The audio context to ensure is unlocked
 * @returns {Promise<void>} A promise that resolves when audio is unlocked
 */
export async function ensureAudioUnlocked(audioContext) {
  // If not iOS or Safari, just return
  if (!detectIOS() && !detectSafari()) {
    return Promise.resolve();
  }
  
  console.log('Ensuring audio is unlocked before playback');
  
  // If already unlocked, just make sure AudioContext is resumed
  if (_audioUnlocked && audioContext) {
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch (e) {
        console.warn('Error resuming AudioContext:', e);
      }
    }
    return Promise.resolve();
  }
  
  // Attempt unlock again
  unlockAudio(audioContext);
  
  // Create and play a short silent MP3 to ensure playback is allowed
  return new Promise((resolve) => {
    const silence = new Audio("data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//////////////////////////////////////////////////////////////////8AAABhTEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQAB9AAAAnGMHkkIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAADgnABGiAAQBCqgCRMAAgEAH///////////////7+n/9FTuQsQH//////2NG0jWUGlio5gLQTOtIoeR2WX////X4s9Atb/JRVCbBUpeRUq//////////////////9RUi0f2jn/+xDECgPCjAEQAABN4AAANIAAAAQVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==");
    
    // Add event handlers
    silence.addEventListener('canplaythrough', () => {
      const playPromise = silence.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('Silence played successfully, audio should be unlocked');
          _audioUnlocked = true;
          resolve();
        }).catch(e => {
          console.error('Silence play failed:', e);
          resolve(); // Continue anyway
        });
      } else {
        _audioUnlocked = true;
        resolve();
      }
    }, { once: true });
    
    silence.addEventListener('error', () => {
      console.error('Silence playback error');
      resolve(); // Continue anyway
    }, { once: true });
    
    // Load the audio
    silence.load();
    
    // Set a timeout in case it never fires canplaythrough
    setTimeout(() => {
      console.log('Timeout waiting for silence to be ready, continuing anyway');
      resolve();
    }, 1000);
  });
}

export default {
  createAudioContext,
  unlockAudio,
  ensureAudioUnlocked,
  isAudioUnlocked,
  setAudioUnlocked
};
