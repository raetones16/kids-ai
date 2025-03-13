import {
  ProfileApi,
  ConversationApi, 
  SettingsApi, 
  MigrationApi,
  checkBackendAvailability
} from './ApiService';

/**
 * Storage Service
 * Provides data storage and retrieval with fallback to localStorage when backend is unavailable
 */
export class StorageService {
  constructor(namespace = 'kids-ai') {
    this.namespace = namespace;
    this.isBackendAvailable = false;
    this.backendAvailabilityPromise = this.checkBackendAvailability();
    
    // Initialize parent PIN if it doesn't exist in localStorage
    this.initializeParentPin();
  }
  
  // Map backend field names to frontend field names
  mapProfileFromBackend(profile) {
    if (!profile) return null;
    
    // Create a mapped profile with proper field names
    const mappedProfile = {
      ...profile,
      customInstructions: profile.custom_instructions,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    };
    
    // Ensure customInstructions are loaded
    if (!mappedProfile.customInstructions && profile.custom_instructions) {
      mappedProfile.customInstructions = profile.custom_instructions;
    }
    
    return mappedProfile;
  }
  
  // Map frontend field names to backend field names
  mapProfileToBackend(profile) {
    return {
      ...profile,
      custom_instructions: profile.customInstructions
    };
  }
  
  // Map backend field names to frontend field names for conversations
  mapConversationFromBackend(conversation) {
    if (!conversation) return null;
    
    return {
      ...conversation,
      childId: conversation.child_id,
      threadId: conversation.thread_id,
      startedAt: conversation.started_at,
      lastActivityAt: conversation.last_activity_at
    };
  }
  
  // Map frontend field names to backend field names for conversations
  mapConversationToBackend(conversation) {
    return {
      ...conversation,
      child_id: conversation.childId,
      thread_id: conversation.threadId,
      started_at: conversation.startedAt,
      last_activity_at: conversation.lastActivityAt
    };
  }
  
  // Check if backend API is available
  async checkBackendAvailability() {
    try {
      this.isBackendAvailable = await checkBackendAvailability();
      console.log(`Backend API ${this.isBackendAvailable ? 'is' : 'is not'} available`);
      
      // Force backend usage in development mode
      if (process.env.NODE_ENV === 'development' && !this.isBackendAvailable) {
        console.error('BACKEND IS NOT AVAILABLE! Please start the backend server.');
        alert('Backend server is not available. Please start the backend server and refresh the page.');
      }
      
      return this.isBackendAvailable;
    } catch (error) {
      console.error('Error checking backend availability:', error);
      this.isBackendAvailable = false;
      
      // Force backend usage in development mode
      if (process.env.NODE_ENV === 'development') {
        console.error('BACKEND IS NOT AVAILABLE! Please start the backend server.');
        alert('Backend server is not available. Please start the backend server and refresh the page.');
      }
      
      return false;
    }
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
  
  // Migrate data from localStorage to backend
  async migrateToBackend() {
    try {
      if (!this.isBackendAvailable) {
        console.warn('Cannot migrate data: Backend is not available');
        return false;
      }
      
      // Get all data from localStorage
      const profiles = JSON.parse(localStorage.getItem(`${this.namespace}.profiles`) || '[]');
      const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
      const settings = JSON.parse(localStorage.getItem(`${this.namespace}.settings`) || '{}');
      
      // Send to backend
      const result = await MigrationApi.importLocalStorageData({
        profiles,
        conversations,
        settings
      });
      
      console.log('Migration result:', result);
      return result.success;
    } catch (error) {
      console.error('Migration error:', error);
      return false;
    }
  }
  
  /*
   * Child Profile Methods
   */
  
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
          if (profile.id && profile.id !== 'new') {
            // Update existing profile
            const updatedProfile = await ProfileApi.updateProfile(profile.id, this.mapProfileToBackend(profile));
            return this.mapProfileFromBackend(updatedProfile);
          } else {
            // Create new profile
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
  
  /*
   * Conversation Methods
   */
  
  // Save a conversation
  async saveConversation(conversation) {
    try {
      // Ensure conversation has required fields
      if (!conversation.id) {
        conversation.id = `conv-${Date.now()}`;
      }
      
      if (!conversation.childId && !conversation.child_id) {
        throw new Error('Missing childId for conversation');
      }
      
      if (!conversation.threadId && !conversation.thread_id) {
        conversation.threadId = `thread-${Date.now()}`;
      }
      
      const conversationToSave = {
        ...conversation,
        childId: conversation.childId || conversation.child_id,
        threadId: conversation.threadId || conversation.thread_id,
        messages: conversation.messages || []
      };
      
      // Wait for backend availability check
      await this.backendAvailabilityPromise;
      
      if (this.isBackendAvailable) {
        try {
          // Check if conversation exists in backend
          try {
            await ConversationApi.getConversation(conversationToSave.id);
            // Conversation exists, no action needed
          } catch (notFoundError) {
            // Conversation doesn't exist, create it
            console.log(`Creating conversation ${conversationToSave.id} in backend`);
            await ConversationApi.createConversation(
              conversationToSave.childId,
              conversationToSave.threadId,
              conversationToSave.id
            );
            
            // If the conversation has messages, save them too
            if (conversationToSave.messages && conversationToSave.messages.length > 0) {
              for (const message of conversationToSave.messages) {
                try {
                  await ConversationApi.addMessage(
                    conversationToSave.id,
                    message.role,
                    message.content
                  );
                } catch (msgError) {
                  console.error(`Failed to add message to backend conversation:`, msgError);
                }
              }
            }
          }
          
          // Always save to localStorage for redundancy
          this._saveConversationToLocalStorage(conversationToSave);
          
          return conversationToSave;
        } catch (apiError) {
          console.error('API error saving conversation:', apiError);
          // Fall back to localStorage
          return this._saveConversationToLocalStorage(conversationToSave);
        }
      } else {
        // Fallback to localStorage
        return this._saveConversationToLocalStorage(conversationToSave);
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
      // Try localStorage as last resort
      if (conversation) {
        return this._saveConversationToLocalStorage(conversation);
      }
      throw error;
    }
  }
  
  // Helper method to save conversation to localStorage
  _saveConversationToLocalStorage(conversation) {
    try {
      // Get all conversations from localStorage
      const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
      
      // Make sure we have required fields
      const conversationToSave = {
        ...conversation,
        id: conversation.id || `conv-${Date.now()}`,
        childId: conversation.childId || conversation.child_id,
        threadId: conversation.threadId || conversation.thread_id || `thread-${Date.now()}`,
        startedAt: conversation.startedAt || conversation.started_at || new Date().toISOString(), 
        lastActivityAt: conversation.lastActivityAt || conversation.last_activity_at || new Date().toISOString(),
        messages: conversation.messages || []
      };
      
      // Check if this conversation already exists
      const existingIndex = conversations.findIndex(c => c.id === conversationToSave.id);
      
      if (existingIndex >= 0) {
        // Update existing conversation
        conversations[existingIndex] = { 
          ...conversations[existingIndex], 
          ...conversationToSave
        };
        console.log(`Updated existing conversation ${conversationToSave.id} in localStorage`);
      } else {
        // Add new conversation
        conversations.push(conversationToSave);
        console.log(`Added new conversation ${conversationToSave.id} to localStorage`);
      }
      
      // Save back to localStorage
      localStorage.setItem(`${this.namespace}.conversations`, JSON.stringify(conversations));
      return conversationToSave;
    } catch (error) {
      console.error('Error saving conversation to localStorage:', error);
      throw error;
    }
  }
  
  // Get all conversations
  async getConversations() {
    try {
      // Wait for backend availability check
      await this.backendAvailabilityPromise;
      
      if (this.isBackendAvailable) {
        // Get all child profiles
        const profiles = await this.getChildProfiles();
        const allConversations = [];
        
        // Get conversations for each child
        for (const profile of profiles) {
          try {
            const conversations = await ConversationApi.getConversationsByChildId(profile.id);
            // Map to frontend format
            const mappedConversations = conversations.map(conv => this.mapConversationFromBackend(conv));
            allConversations.push(...mappedConversations);
          } catch (error) {
            console.error(`Error getting conversations for child ${profile.id}:`, error);
          }
        }
        
        return allConversations;
      } else {
        const data = localStorage.getItem(`${this.namespace}.conversations`);
        return data ? JSON.parse(data) : [];
      }
    } catch (error) {
      console.error('Error getting conversations:', error);
      // Fall back to localStorage on API error
      const data = localStorage.getItem(`${this.namespace}.conversations`);
      return data ? JSON.parse(data) : [];
    }
  }
  
  // Get conversations for a specific child
  async getConversationsByChildId(childId) {
    try {
      // Wait for backend availability check
      await this.backendAvailabilityPromise;
      
      if (this.isBackendAvailable) {
        try {
          const conversations = await ConversationApi.getConversationsByChildId(childId);
          
          // Map to frontend format
          const mappedConversations = conversations.map(conv => this.mapConversationFromBackend(conv));
          
          // If no conversations in backend, check localStorage as fallback
          if (mappedConversations.length === 0) {
            const localConversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
            const filteredLocalConversations = localConversations.filter(c => c.childId === childId);
            
            if (filteredLocalConversations.length > 0) {
              return filteredLocalConversations;
            }
          }
          
          return mappedConversations;
        } catch (apiError) {
          console.error(`Error getting backend conversations for child ${childId}:`, apiError);
          // Fall back to localStorage on API error
          const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
          return conversations.filter(c => c.childId === childId);
        }
      } else {
        // Use localStorage directly
        const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
        return conversations.filter(c => c.childId === childId);
      }
    } catch (error) {
      console.error(`Error getting conversations for child ${childId}:`, error);
      // As a last resort, try to parse from localStorage
      const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
      return conversations.filter(c => c.childId === childId);
    }
  }
  
  // Get a specific conversation
  async getConversationById(id) {
    try {
      // Wait for backend availability check
      await this.backendAvailabilityPromise;
      
      if (this.isBackendAvailable) {
        try {
          // Get the conversation
          const conversation = await ConversationApi.getConversation(id);
          
          // Map to frontend format
          const mappedConversation = this.mapConversationFromBackend(conversation);
          
          // Try to get messages as well
          try {
            const messages = await ConversationApi.getConversationMessages(id);
            return { ...mappedConversation, messages };
          } catch (msgError) {
            console.error(`Error getting messages for conversation ${id}:`, msgError);
            return mappedConversation;
          }
        } catch (apiError) {
          console.error(`Error getting conversation ${id} from API:`, apiError);
          // Fall back to localStorage
          const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
          return conversations.find(c => c.id === id);
        }
      } else {
        // Get from localStorage
        const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
        return conversations.find(c => c.id === id);
      }
    } catch (error) {
      console.error(`Error getting conversation ${id}:`, error);
      // Fall back to localStorage as last resort
      const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
      return conversations.find(c => c.id === id);
    }
  }
  
  // Save a message to a conversation
  async saveMessage(conversationId, message) {
    try {
      // Wait for backend availability check
      await this.backendAvailabilityPromise;
      
      if (this.isBackendAvailable) {
        try {
          // Make sure message has a timestamp
          const messageWithTimestamp = {
            ...message,
            timestamp: message.timestamp || new Date().toISOString()
          };
          
          // Add message to backend
          await ConversationApi.addMessage(
            conversationId,
            messageWithTimestamp.role,
            messageWithTimestamp.content
          );
          
          // Also add to localStorage
          await this._saveMessageToLocalStorage(conversationId, messageWithTimestamp);
          
          return messageWithTimestamp;
        } catch (apiError) {
          console.error(`Error saving message to backend for conversation ${conversationId}:`, apiError);
          // Fall back to localStorage
          return this._saveMessageToLocalStorage(conversationId, message);
        }
      } else {
        return this._saveMessageToLocalStorage(conversationId, message);
      }
    } catch (error) {
      console.error(`Error saving message to conversation ${conversationId}:`, error);
      throw error;
    }
  }
  
  // Helper method to save message to localStorage
  async _saveMessageToLocalStorage(conversationId, message) {
    try {
      // First, try to get the existing conversation
      let conversation = await this.getConversationById(conversationId);
      
      // If conversation doesn't exist, create it
      if (!conversation) {
        // This should not happen normally, but we'll handle it gracefully
        console.warn(`Conversation with ID ${conversationId} not found, creating a new one`);
        
        // We need a childId to create a conversation
        const childId = message.childId || 'unknown-child';
        
        conversation = {
          id: conversationId,
          childId,
          threadId: `thread-${Date.now()}`,
          messages: []
        };
      }
      
      // Ensure message has a timestamp
      const messageWithTimestamp = {
        ...message, 
        timestamp: message.timestamp || new Date().toISOString()
      };
      
      // Add the message to the conversation
      conversation.messages = [...(conversation.messages || []), messageWithTimestamp];
      conversation.lastActivityAt = new Date().toISOString();
      
      // Save the updated conversation
      return this.saveConversation(conversation);
    } catch (error) {
      console.error(`Error in _saveMessageToLocalStorage for ${conversationId}:`, error);
      throw error;
    }
  }
  
  // Get all messages from a conversation
  async getConversationMessages(conversationId) {
    try {
      // Wait for backend availability check
      await this.backendAvailabilityPromise;
      
      if (this.isBackendAvailable) {
        try {
          const messages = await ConversationApi.getConversationMessages(conversationId);
          
          // Ensure all messages have proper timestamp formatting
          return messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp || new Date().toISOString()
          }));
        } catch (apiError) {
          console.error(`Error getting backend messages for conversation ${conversationId}:`, apiError);
          // Fall back to localStorage
          const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
          const conversation = conversations.find(c => c.id === conversationId);
          return conversation ? (conversation.messages || []) : [];
        }
      } else {
        // Directly use localStorage
        const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
        const conversation = conversations.find(c => c.id === conversationId);
        
        if (!conversation) {
          return [];
        }
        
        return conversation.messages || [];
      }
    } catch (error) {
      console.error(`Error getting messages for conversation ${conversationId}:`, error);
      // Final fallback
      const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
      const conversation = conversations.find(c => c.id === conversationId);
      return conversation ? (conversation.messages || []) : [];
    }
  }
  
  /*
   * Usage Statistics Methods
   */
  
  // Get usage statistics for a child
  async getChildUsageStats(childId) {
    try {
      // Wait for backend availability check
      await this.backendAvailabilityPromise;
      
      // Get all conversations for this child
      const conversations = await this.getConversationsByChildId(childId);
      
      // Process conversations to ensure they all have messages
      const processedConversations = await Promise.all(
        conversations.map(async (conv) => {
          if (!conv.messages || conv.messages.length === 0) {
            try {
              // Get messages if they're not included in the conversation
              const messages = await this.getConversationMessages(conv.id);
              return { ...conv, messages };
            } catch (error) {
              console.error(`Error getting messages for conversation ${conv.id}:`, error);
              return conv; // Return original conversation if fetching messages fails
            }
          }
          return conv;
        })
      );
      
      // Calculate basic statistics
      const totalConversations = processedConversations.length;
      
      let totalMessages = 0;
      let totalUserMessages = 0;
      let totalAssistantMessages = 0;
      
      // Calculate totals from all conversations
      processedConversations.forEach(conv => {
        if (conv.messages) {
          totalMessages += conv.messages.length;
          totalUserMessages += conv.messages.filter(m => m.role === 'user').length;
          totalAssistantMessages += conv.messages.filter(m => m.role === 'assistant').length;
        }
      });
      
      return {
        totalConversations,
        totalMessages,
        totalUserMessages,
        totalAssistantMessages,
        averageMessagesPerConversation: totalConversations > 0 ? (totalMessages / totalConversations).toFixed(1) : '0'
      };
    } catch (error) {
      console.error(`Error getting usage stats for child ${childId}:`, error);
      // Return default stats on error
      return {
        totalConversations: 0,
        totalMessages: 0,
        totalUserMessages: 0,
        totalAssistantMessages: 0,
        averageMessagesPerConversation: '0'
      };
    }
  }
  
  /*
   * Settings Methods
   */
  
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
