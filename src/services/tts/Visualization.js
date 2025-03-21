/**
 * Visualization.js
 * Provides audio visualization utilities for TTS service
 */

/**
 * Creates a dummy analyzer for visualization when real audio data isn't available
 * @param {AudioContext} audioContext The audio context to create the analyzer in
 * @returns {Object} The analyzer node and oscillator for cleanup
 */
export function createDummyAnalyser(audioContext) {
  if (!audioContext) return { analyser: null, oscillator: null };
  
  try {
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.7;
    
    // Create a low-volume oscillator to feed the analyzer with data
    // for visualization purposes only
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    
    // Set volume extremely low (essentially silent but enough for analyzer)
    gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
    
    oscillator.connect(gainNode);
    gainNode.connect(analyser);
    // Don't connect to destination to avoid hearing it
    
    oscillator.start();
    
    return { analyser, oscillator };
  } catch (error) {
    console.error('Failed to create dummy analyser:', error);
    return { analyser: null, oscillator: null };
  }
}

/**
 * Generate fake audio data for consistent visualization
 * @param {boolean} isPlaying Whether audio is currently playing
 * @returns {Uint8Array} Simulated frequency data
 */
export function generateFakeAudioData(isPlaying) {
  // Create array with sensible size
  const fakeData = new Uint8Array(64);
  
  if (!isPlaying) {
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

/**
 * Get audio data from an analyzer node
 * @param {AnalyserNode} analyserNode The analyzer node to get data from
 * @param {boolean} isPlaying Whether audio is currently playing
 * @returns {Uint8Array} Audio frequency data for visualization
 */
export function getAudioData(analyserNode, isPlaying) {
  // First check if we have a real analyzer node with data
  if (analyserNode && isPlaying) {
    try {
      const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
      analyserNode.getByteFrequencyData(dataArray);
      
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
      console.warn('Error getting analyzer data:', e);
      // Fall back to generating fake data
    }
  }
  
  // If no analyzer or no real data, generate fake data for visualization
  return generateFakeAudioData(isPlaying);
}

/**
 * Clean up visualization resources
 * @param {Object} resources The resources to clean up
 */
export function cleanupVisualization(resources) {
  const { oscillator, analyser } = resources || {};
  
  // Stop dummy oscillator if exists
  if (oscillator) {
    try {
      oscillator.stop();
      oscillator.disconnect();
    } catch (e) {
      // Ignore errors when stopping
      console.log('Non-critical error when stopping dummy oscillator:', e);
    }
  }
  
  // Clean up analyzer if it exists
  if (analyser) {
    try {
      analyser.disconnect();
    } catch (e) {
      // Ignore disconnection errors
      console.log('Non-critical error when disconnecting analyzer:', e);
    }
  }
}

export default {
  createDummyAnalyser,
  generateFakeAudioData,
  getAudioData,
  cleanupVisualization
};
