/**
 * TextToSpeechService.js
 * This file is kept for backward compatibility.
 * It now re-exports the MobileFriendlyTTSService.
 */

import { MobileFriendlyTTSService } from './MobileFriendlyTTSService';

// Re-export the mobile-friendly TTS service as the default TTS service
export { MobileFriendlyTTSService as TextToSpeechService };
