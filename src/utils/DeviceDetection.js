/**
 * DeviceDetection.js
 * Utility functions for detecting device capabilities and characteristics
 */

// Detect iOS devices
export const isIOS = () => {
  return [
    'iPad Simulator', 'iPhone Simulator', 'iPod Simulator',
    'iPad', 'iPhone', 'iPod'
  ].includes(navigator.platform) ||
  // iPad on iOS 13+ detection
  (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
};

// Detect Safari browser
export const isSafari = () => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

// Detect Chrome browser
export const isChrome = () => {
  return /chrome/i.test(navigator.userAgent) && !/edge|edg/i.test(navigator.userAgent);
};

// Detect Firefox browser
export const isFirefox = () => {
  return /firefox/i.test(navigator.userAgent);
};

// Detect Edge browser
export const isEdge = () => {
  return /edge|edg/i.test(navigator.userAgent);
};

// Detect any mobile device based on user agent and screen size
export const isMobile = () => {
  return isIOS() || 
    /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 768);
};

// Detect tablet devices (larger mobile devices)
export const isTablet = () => {
  // Check for iPad specifically
  const isIPad = isIOS() && !/iPhone|iPod/.test(navigator.platform);
  
  // Or check for typical tablet dimensions
  const isTabletDimensions = window.innerWidth >= 600 && 
                            window.innerWidth <= 1024 && 
                            /Android|webOS/i.test(navigator.userAgent);
  
  return isIPad || isTabletDimensions;
};

// Detect if device has touch capability
export const hasTouchScreen = () => {
  return ('ontouchstart' in window) || 
         (navigator.maxTouchPoints > 0) || 
         (navigator.msMaxTouchPoints > 0);
};

// Detect high-DPI/Retina displays
export const isHighDPIScreen = () => {
  return window.devicePixelRatio > 1.5;
};

// Detect if user prefers reduced motion (accessibility)
export const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Get mobile OS version for iOS
export const getIOSVersion = () => {
  if (!isIOS()) return null;
  
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  if (match) {
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3] || 0, 10)
    };
  }
  return null;
};

// Get Android version
export const getAndroidVersion = () => {
  const match = navigator.userAgent.match(/Android (\d+)\.(\d+)\.?(\d+)?/);
  if (match) {
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3] || 0, 10)
    };
  }
  return null;
};

// Get device info in a structured format
export const getDeviceInfo = () => {
  return {
    isMobile: isMobile(),
    isTablet: isTablet(),
    isIOS: isIOS(),
    isSafari: isSafari(),
    isChrome: isChrome(),
    isFirefox: isFirefox(),
    isEdge: isEdge(),
    hasTouchScreen: hasTouchScreen(),
    isHighDPI: isHighDPIScreen(),
    prefersReducedMotion: prefersReducedMotion(),
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio,
    iosVersion: getIOSVersion(),
    androidVersion: getAndroidVersion()
  };
};

// Export a default object with all functions
export default {
  isIOS,
  isSafari,
  isChrome,
  isFirefox,
  isEdge,
  isMobile,
  isTablet,
  hasTouchScreen,
  isHighDPIScreen,
  prefersReducedMotion,
  getIOSVersion,
  getAndroidVersion,
  getDeviceInfo
};
