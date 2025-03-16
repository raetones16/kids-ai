import { SettingsApi } from '../ApiService';
import { BaseStorageService } from './BaseStorageService';

/**
 * Settings Storage Service
 * Manages application settings and PIN management
 */
export class SettingsStorageService extends BaseStorageService {
  constructor(namespace = 'kids-ai') {
    super(namespace);
  }
  
  // Initialize default parent PIN if not set
  async initializeParentPin() {
    const settings = await this.getSettings();
    if (!settings.parentPin) {
      await this.saveSettings({
        ...settings,
        parentPin: '000000' // Default PIN as per requirements
      });
    }
  }
  
  // Get application settings
  async getSettings() {
    try {
      // Wait for backend availability check
      await this.backendAvailabilityPromise;
      
      if (this.isBackendAvailable) {
        try {
          return await SettingsApi.getSettings();
        } catch (apiError) {
          console.error('Error getting settings from API:', apiError);
          // Fall back to localStorage
          const data = localStorage.getItem(`${this.namespace}.settings`);
          return data ? JSON.parse(data) : {};
        }
      } else {
        const data = localStorage.getItem(`${this.namespace}.settings`);
        return data ? JSON.parse(data) : {};
      }
    } catch (error) {
      console.error('Error getting settings:', error);
      // Fall back to localStorage on API error
      const data = localStorage.getItem(`${this.namespace}.settings`);
      return data ? JSON.parse(data) : {};
    }
  }
  
  // Save application settings
  async saveSettings(settings) {
    try {
      // Wait for backend availability check
      await this.backendAvailabilityPromise;
      
      if (this.isBackendAvailable) {
        try {
          // Only PIN updates are supported via API
          if (settings.parentPin) {
            await SettingsApi.updateParentPin(settings.parentPin);
          }
          
          // Also save to localStorage for redundancy
          localStorage.setItem(`${this.namespace}.settings`, JSON.stringify(settings));
          
          return settings;
        } catch (apiError) {
          console.error('Error saving settings to API:', apiError);
          // Fall back to localStorage
          localStorage.setItem(`${this.namespace}.settings`, JSON.stringify(settings));
          return settings;
        }
      } else {
        localStorage.setItem(`${this.namespace}.settings`, JSON.stringify(settings));
        return settings;
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      // Try localStorage as last resort
      localStorage.setItem(`${this.namespace}.settings`, JSON.stringify(settings));
      return settings;
    }
  }
  
  // Verify parent PIN
  async verifyParentPin(pin) {
    try {
      // Wait for backend availability check
      await this.backendAvailabilityPromise;
      
      if (this.isBackendAvailable) {
        try {
          const result = await SettingsApi.verifyParentPin(pin);
          return result.valid;
        } catch (apiError) {
          console.error('Error verifying PIN with API:', apiError);
          // Fall back to localStorage
          const settings = await this.getSettings();
          return settings.parentPin === pin;
        }
      } else {
        const settings = await this.getSettings();
        return settings.parentPin === pin;
      }
    } catch (error) {
      console.error('Error verifying PIN:', error);
      // Fall back to localStorage on API error
      const settings = JSON.parse(localStorage.getItem(`${this.namespace}.settings`) || '{}');
      return settings.parentPin === pin;
    }
  }
  
  // Update parent PIN
  async updateParentPin(pin) {
    try {
      // Wait for backend availability check
      await this.backendAvailabilityPromise;
      
      if (this.isBackendAvailable) {
        try {
          await SettingsApi.updateParentPin(pin);
          
          // Also update localStorage
          const settings = await this.getSettings();
          settings.parentPin = pin;
          localStorage.setItem(`${this.namespace}.settings`, JSON.stringify(settings));
          
          return true;
        } catch (apiError) {
          console.error('Error updating PIN with API:', apiError);
          // Fall back to localStorage
          const settings = await this.getSettings();
          settings.parentPin = pin;
          localStorage.setItem(`${this.namespace}.settings`, JSON.stringify(settings));
          return true;
        }
      } else {
        const settings = await this.getSettings();
        settings.parentPin = pin;
        localStorage.setItem(`${this.namespace}.settings`, JSON.stringify(settings));
        return true;
      }
    } catch (error) {
      console.error('Error updating PIN:', error);
      throw error;
    }
  }
}