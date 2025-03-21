/**
 * AudioPlayer.js
 * Handles audio playback using both HTML5 Audio and Web Audio API
 */

import { detectIOS, detectSafari } from './DeviceDetection';
import { ensureAudioUnlocked } from './AudioUnlock';

/**
 * Play audio using HTML5 Audio element (better for iOS)
 * @param {string} audioUrl URL to the audio file
 * @param {Function} onStart Callback when audio playback starts
 * @param {Function} onEnd Callback when audio playback ends
 * @param {Function} onVisualize Callback for visualization updates
 * @returns {Promise<HTMLAudioElement>} A promise resolving to the audio element
 */
export function playWithAudioElement(audioUrl, onStart, onEnd, onVisualize) {
  return new Promise((resolve, reject) => {
    try {
      console.log('Playing audio with HTML5 Audio element');
      
      // Create audio element
      const audio = new Audio();
      
      // Critical for iOS: Set up event handlers BEFORE setting src
      audio.preload = 'auto';
      
      // Add all event handlers
      const events = {};
      
      // Track loading events
      events.loadstart = () => console.log('Audio loadstart event');
      events.durationchange = () => console.log('Audio durationchange event');
      events.loadedmetadata = () => console.log('Audio loadedmetadata event');
      events.loadeddata = () => console.log('Audio loadeddata event');
      
      // Critical success path events
      events.canplay = () => console.log('Audio canplay event');
      events.canplaythrough = () => {
        console.log('Audio canplaythrough event - attempting playback');
        
        // Start visualization heartbeat before actual playback
        if (onVisualize) {
          startVisualizationHeartbeat(onVisualize);
        }
        
        try {
          // On iOS Safari, we need a slight delay before play() to ensure it works
          if (detectIOS() || detectSafari()) {
            setTimeout(() => {
              try {
                audio.play().catch(playError => {
                  console.error('Delayed play error:', playError);
                  reject(playError);
                });
              } catch (e) {
                console.error('Error in delayed play:', e);
                reject(e);
              }
            }, 100);
          } else {
            // Non-iOS can play immediately
            audio.play().catch(playError => {
              console.error('Play error:', playError);
              reject(playError);
            });
          }
        } catch (e) {
          console.error('Error initiating playback:', e);
          reject(e);
        }
      };
      
      // Playback events
      events.playing = () => {
        console.log('Audio playing event');
        if (onStart) onStart(audio);
      };
      
      events.pause = () => console.log('Audio pause event');
      events.seeking = () => console.log('Audio seeking event');
      events.seeked = () => console.log('Audio seeked event');
      events.waiting = () => console.log('Audio waiting event');
      
      // Success/failure events
      events.ended = () => {
        console.log('Audio ended event');
        stopVisualizationHeartbeat();
        if (onEnd) onEnd();
        resolve(audio);
      };
      
      events.error = (e) => {
        const errorDetails = audio.error ? 
          `code: ${audio.error.code}, message: ${audio.error.message}` : 
          'unknown error';
        console.error(`Audio error event: ${errorDetails}`, e);
        stopVisualizationHeartbeat();
        if (onEnd) onEnd();
        reject(new Error(`Audio playback error: ${errorDetails}`));
      };
      
      // Register all event handlers
      Object.entries(events).forEach(([event, handler]) => {
        audio.addEventListener(event, handler, { once: event === 'ended' || event === 'error' });
      });
      
      // iOS Safari requires audio to be loaded with src AFTER event handlers
      audio.src = audioUrl;
      
      // Start loading the audio
      try {
        audio.load();
      } catch (loadError) {
        console.error('Error loading audio:', loadError);
        reject(loadError);
      }
      
      // Set a safety timeout in case events don't fire
      setTimeout(() => {
        // If we haven't reached the ended event, assume something went wrong
        if (!events.ended.called) {
          // Try one last direct play attempt
          try {
            audio.play().catch(e => {
              console.error('Last chance play attempt failed:', e);
              reject(new Error('Audio playback timeout'));
            });
          } catch (e) {
            reject(new Error('Audio playback timeout'));
          }
        }
      }, 3000);
    } catch (error) {
      console.error('Error setting up audio element:', error);
      reject(error);
    }
  });
}

/**
 * Play audio using Web Audio API (better for visualization)
 * @param {Blob} audioBlob The audio blob to play
 * @param {AudioContext} audioContext The audio context to use
 * @param {Function} onEnd Callback when audio playback ends
 * @returns {Promise<{source: AudioBufferSourceNode, analyser: AnalyserNode}>} The audio source and analyzer
 */
export async function playWithWebAudio(audioBlob, audioContext, onEnd) {
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Create source
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Create analyzer for visualizations
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.7;
    
    // Connect the source to the analyzer and output
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    
    // Add event handlers
    source.onended = () => {
      console.log('Audio source playback ended');
      if (onEnd) onEnd();
    };
    
    // Start playback
    source.start(0);
    
    return { source, analyser };
  } catch (error) {
    console.error("Error in playWithWebAudio:", error);
    throw error;
  }
}

// Heartbeat interval for visualization
let visualizationHeartbeatInterval = null;

/**
 * Start regular callbacks for visualization when using HTML5 Audio
 * @param {Function} onVisualize Callback for visualization
 */
export function startVisualizationHeartbeat(onVisualize) {
  // Clear any existing heartbeat
  stopVisualizationHeartbeat();
  
  // Create a new heartbeat interval
  visualizationHeartbeatInterval = setInterval(() => {
    if (onVisualize) {
      onVisualize();
    }
  }, 100); // 10 updates per second
}

/**
 * Stop the visualization heartbeat
 */
export function stopVisualizationHeartbeat() {
  if (visualizationHeartbeatInterval) {
    clearInterval(visualizationHeartbeatInterval);
    visualizationHeartbeatInterval = null;
  }
}

/**
 * Fallback for using browser's native speech synthesis
 * @param {string} text The text to speak
 * @param {Function} onStart Callback when speech starts
 * @param {Function} onEnd Callback when speech ends
 * @param {Function} onVisualize Callback for visualization updates
 * @returns {Promise<void>} Promise that resolves when speech completes
 */
export function speakWithNativeSpeechSynthesis(text, onStart, onEnd, onVisualize) {
  return new Promise((resolve, reject) => {
    // Ensure the speech synthesis interface exists
    if (!window.speechSynthesis) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }
    
    console.log('Using native SpeechSynthesis API as fallback');
    
    // Set up speech synthesis
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Start visualization heartbeat
    if (onVisualize) {
      startVisualizationHeartbeat(onVisualize);
    }
    
    // Get available voices - iOS often requires a delay
    let voices = window.speechSynthesis.getVoices();
    
    // Set up event handlers
    utterance.onstart = () => {
      console.log('Native speech synthesis started');
      if (onStart) onStart();
    };
    
    utterance.onend = () => {
      console.log('Native speech synthesis ended');
      stopVisualizationHeartbeat();
      if (onEnd) onEnd();
      resolve();
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      stopVisualizationHeartbeat();
      if (onEnd) onEnd();
      reject(new Error(`Speech synthesis error: ${event.error || 'unknown'}`));
    };
    
    // Function to actually speak once voices are available
    const doSpeak = () => {
      try {
        voices = window.speechSynthesis.getVoices();
        selectNativeSpeechVoice(utterance, voices);
        
        // Make sure speech synthesis is reset before speaking
        window.speechSynthesis.cancel();
        
        // Set a small timeout to make sure cancel has completed
        setTimeout(() => {
          try {
            window.speechSynthesis.speak(utterance);
            
            // iOS/Chrome workaround for premature ending
            if (detectIOS() || /Chrome/i.test(navigator.userAgent)) {
              keepSpeechSynthesisActive();
            }
          } catch (e) {
            console.error('Error in speechSynthesis.speak:', e);
            reject(e);
          }
        }, 100);
      } catch (e) {
        console.error('Error setting up speech synthesis:', e);
        reject(e);
      }
    };
    
    // If no voices available yet, wait for them to load
    if (!voices || voices.length === 0) {
      console.log('No voices available yet, waiting for voiceschanged event');
      
      // Set up event handler for voices loaded
      const voicesChangedHandler = () => {
        console.log('voiceschanged event fired');
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        doSpeak();
      };
      
      window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
      
      // Also set a timeout in case the event never fires (happens on some browsers)
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        console.log('Timeout waiting for voices, trying anyway');
        doSpeak();
      }, 1000);
    } else {
      // Voices already available, select one and speak
      doSpeak();
    }
  });
}

// Keep speech synthesis active (iOS/Chrome fix) - global interval
let speechKeepAliveInterval = null;

/**
 * Keep speech synthesis active on iOS and Chrome
 */
function keepSpeechSynthesisActive() {
  // Clear any existing interval
  if (speechKeepAliveInterval) {
    clearInterval(speechKeepAliveInterval);
  }
  
  // Create an interval to keep speech synthesis active
  speechKeepAliveInterval = setInterval(() => {
    // Check if still speaking
    if (window.speechSynthesis.speaking) {
      console.log('Keeping speech synthesis active...');
      window.speechSynthesis.pause();
      setTimeout(() => {
        window.speechSynthesis.resume();
      }, 10);
    } else {
      clearInterval(speechKeepAliveInterval);
      speechKeepAliveInterval = null;
    }
  }, 5000); // Check every 5 seconds
  
  // Clear interval after maximum speaking duration as a safety measure
  setTimeout(() => {
    if (speechKeepAliveInterval) {
      clearInterval(speechKeepAliveInterval);
      speechKeepAliveInterval = null;
    }
  }, 60000); // 1 minute maximum
}

/**
 * Helper to select an appropriate voice for native speech synthesis
 * @param {SpeechSynthesisUtterance} utterance The utterance to set voice for
 * @param {Array<SpeechSynthesisVoice>} voices Available voices
 */
function selectNativeSpeechVoice(utterance, voices) {
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

export default {
  playWithAudioElement,
  playWithWebAudio,
  speakWithNativeSpeechSynthesis,
  startVisualizationHeartbeat,
  stopVisualizationHeartbeat
};
