import { ProfileApi } from '../ApiService';
import { BaseStorageService } from './BaseStorageService';

/**
 * Profile Storage Service
 * Handles all operations related to child profiles
 */
export class ProfileStorageService extends BaseStorageService {
  constructor(namespace = 'kids-ai') {
    super(namespace);
  }
  
  // Save a child profile
  async saveChildProfile(profile) {
    try {
      // Ensure profile has an ID
      if (!profile.id) {
        profile.id = `profile-${Date.now()}`;
      }
      
      // Wait for backend availability check
      await this.backendAvailabilityPromise;
      
      if (this.isBackendAvailable) {
        // Use backend API
        try {
          // Check if this is a new profile with a generated UUID
          // UUIDs typically look like: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
          const isNewUuid = profile.id && profile.id !== 'new' && 
                           profile.id.includes('-') && 
                           !profile.createdAt; // No createdAt means it's likely new
          
          if (isNewUuid || profile.id === 'new') {
            // Create a new profile instead of updating
            console.log('Creating new profile with backend API');
            const newProfile = await ProfileApi.createProfile(this.mapProfileToBackend(profile));
            return this.mapProfileFromBackend(newProfile);
          } else if (profile.id) {
            // Update existing profile
            console.log('Updating existing profile with backend API');
            const updatedProfile = await ProfileApi.updateProfile(profile.id, this.mapProfileToBackend(profile));
            return this.mapProfileFromBackend(updatedProfile);
          } else {
            // Fallback case - create new profile
            console.log('Fallback: Creating new profile with backend API');
            const newProfile = await ProfileApi.createProfile(this.mapProfileToBackend(profile));
            return this.mapProfileFromBackend(newProfile);
          }
        } catch (apiError) {
          console.error('API error saving profile:', apiError);
          // Fall back to localStorage
          return this._saveProfileToLocalStorage(profile);
        }
      } else {
        // Fallback to localStorage
        return this._saveProfileToLocalStorage(profile);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      // Try localStorage as last resort
      return this._saveProfileToLocalStorage(profile);
    }
  }
  
  // Helper to save profile to localStorage
  _saveProfileToLocalStorage(profile) {
    try {
      const profiles = JSON.parse(localStorage.getItem(`${this.namespace}.profiles`) || '[]');
      const existingIndex = profiles.findIndex(p => p.id === profile.id);
      
      if (existingIndex >= 0) {
        profiles[existingIndex] = { 
          ...profiles[existingIndex], 
          ...profile, 
          updatedAt: new Date().toISOString() 
        };
      } else {
        // Generate an ID for new profiles if needed
        const newProfile = { 
          ...profile, 
          id: profile.id || `profile-${Date.now()}`, 
          createdAt: new Date().toISOString(), 
          updatedAt: new Date().toISOString() 
        };
        profiles.push(newProfile);
      }
      
      localStorage.setItem(`${this.namespace}.profiles`, JSON.stringify(profiles));
      return profile;
    } catch (error) {
      console.error('Error saving profile to localStorage:', error);
      throw error;
    }
  }
  
  // Get all child profiles
  async getChildProfiles() {
    try {
      // Wait for backend availability check
      await this.backendAvailabilityPromise;
      
      if (this.isBackendAvailable) {
        try {
          const profiles = await ProfileApi.getProfiles();
          // Map backend field names to frontend field names
          return profiles.map(profile => this.mapProfileFromBackend(profile));
        } catch (apiError) {
          console.error('API error getting profiles:', apiError);
          // Fall back to localStorage
          const data = localStorage.getItem(`${this.namespace}.profiles`);
          return data ? JSON.parse(data) : [];
        }
      } else {
        const data = localStorage.getItem(`${this.namespace}.profiles`);
        return data ? JSON.parse(data) : [];
      }
    } catch (error) {
      console.error('Error getting profiles:', error);
      // Fall back to localStorage on API error
      const data = localStorage.getItem(`${this.namespace}.profiles`);
      return data ? JSON.parse(data) : [];
    }
  }
  
  // Get a specific child profile
  async getChildProfileById(id) {
    try {
      // Wait for backend availability check
      await this.backendAvailabilityPromise;
      
      if (this.isBackendAvailable) {
        try {
          const profile = await ProfileApi.getProfile(id);
          return this.mapProfileFromBackend(profile);
        } catch (apiError) {
          console.error(`Error getting profile ${id} from API:`, apiError);
          // Fall back to localStorage
          const profiles = JSON.parse(localStorage.getItem(`${this.namespace}.profiles`) || '[]');
          return profiles.find(p => p.id === id);
        }
      } else {
        const profiles = await this.getChildProfiles();
        return profiles.find(p => p.id === id);
      }
    } catch (error) {
      console.error(`Error getting profile ${id}:`, error);
      // Fall back to localStorage on API error
      const profiles = JSON.parse(localStorage.getItem(`${this.namespace}.profiles`) || '[]');
      return profiles.find(p => p.id === id);
    }
  }
  
  // Delete a child profile
  async deleteChildProfile(id) {
    try {
      // Wait for backend availability check
      await this.backendAvailabilityPromise;
      
      if (this.isBackendAvailable) {
        try {
          await ProfileApi.deleteProfile(id);
          return true;
        } catch (apiError) {
          console.error(`Error deleting profile ${id} from API:`, apiError);
          // Fall back to localStorage
          return this._deleteProfileFromLocalStorage(id);
        }
      } else {
        return this._deleteProfileFromLocalStorage(id);
      }
    } catch (error) {
      console.error(`Error deleting profile ${id}:`, error);
      // Try localStorage as last resort
      return this._deleteProfileFromLocalStorage(id);
    }
  }
  
  // Helper to delete profile from localStorage
  _deleteProfileFromLocalStorage(id) {
    const profiles = JSON.parse(localStorage.getItem(`${this.namespace}.profiles`) || '[]');
    const updatedProfiles = profiles.filter(p => p.id !== id);
    
    localStorage.setItem(`${this.namespace}.profiles`, JSON.stringify(updatedProfiles));
    
    // Also delete all conversations for this child
    const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
    const updatedConversations = conversations.filter(c => c.childId !== id);
    
    localStorage.setItem(`${this.namespace}.conversations`, JSON.stringify(updatedConversations));
    
    return true;
  }
}