/**
 * DeviceDetection.js
 * Utility functions for detecting device capabilities and audio compatibility
 */

// Detect iOS devices - more comprehensive check
export function detectIOS() {
  // First check platform (most reliable but doesn't catch newer iPads)
  const isPlatformiOS = [
    'iPad Simulator', 'iPhone Simulator', 'iPod Simulator',
    'iPad', 'iPhone', 'iPod'
  ].includes(navigator.platform);
  
  // Check for iPad on iOS 13+ (uses Mac userAgent)
  const isiPadOS = navigator.userAgent.includes('Mac') && 'ontouchend' in document;
  
  // Check for any iOS/iPadOS identifiers in userAgent
  const hasIOSIdentifiers = /iPhone|iPad|iPod|iOS|iPadOS/i.test(navigator.userAgent);
  
  // Check for specific iOS webkit features
  const hasAppleDeviceIdentifiers = (
    navigator.userAgent.includes('Safari') && 
    !navigator.userAgent.includes('Chrome') && 
    navigator.vendor && 
    navigator.vendor.includes('Apple')
  );
  
  return isPlatformiOS || isiPadOS || hasIOSIdentifiers || hasAppleDeviceIdentifiers;
}

// Detect Safari browser - more comprehensive check
export function detectSafari() {
  const isSafariByRegex = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isSafariByVendor = navigator.vendor && navigator.vendor.includes('Apple');
  const isWebkitBrowser = 'WebkitAppearance' in document.documentElement.style;
  
  return (isSafariByRegex || isSafariByVendor) && isWebkitBrowser && !detectChrome();
}

// Detect Chrome browser
export function detectChrome() {
  return /CriOS|Chrome/i.test(navigator.userAgent) && !/Edge|Edg/i.test(navigator.userAgent);
}

// Detect any mobile device
export function detectMobile() {
  return detectIOS() || 
    /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 768);
}

// Get device info in a structured format
export function getDeviceInfo() {
  const isIOS = detectIOS();
  const isSafari = detectSafari();
  const isChrome = detectChrome();
  const isMobile = detectMobile();
  
  return {
    isIOS,
    isSafari,
    isChrome,
    isMobile,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    vendor: navigator.vendor || 'unknown',
    hasWebAudio: typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined',
    hasSpeechSynthesis: typeof window.speechSynthesis !== 'undefined'
  };
}

export default {
  detectIOS,
  detectSafari,
  detectChrome,
  detectMobile,
  getDeviceInfo
};
