/**
 * TTS Service module exports
 */

// Main TTS Service
export { MobileFriendlyTTSService } from './MobileFriendlyTTSService';

// Utilities
export * as DeviceDetection from './DeviceDetection';
export * as AudioUnlock from './AudioUnlock';
export * as AudioPlayer from './AudioPlayer';
export * as Visualization from './Visualization';

// Default export for backward compatibility
export { MobileFriendlyTTSService as default } from './MobileFriendlyTTSService';
