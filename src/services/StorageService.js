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
    this.checkBackendAvailability();
    
    // Initialize parent PIN if it doesn't exist in localStorage
    this.initializeParentPin();
  }
  
  // Map backend field names to frontend field names
  mapProfileFromBackend(profile) {
    if (!profile) return null;
    
    return {
      ...profile,
      customInstructions: profile.custom_instructions,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    };
  }
  
  // Map frontend field names to backend field names
  mapProfileToBackend(profile) {
    return {
      ...profile,
      custom_instructions: profile.customInstructions
    };
  }
  
  // Check if backend API is available
  async checkBackendAvailability() {
    try {
      this.isBackendAvailable = await checkBackendAvailability();
      console.log(`Backend API ${this.isBackendAvailable ? 'is' : 'is not'} available`);
      return this.isBackendAvailable;
    } catch (error) {
      console.error('Error checking backend availability:', error);
      this.isBackendAvailable = false;
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
      if (this.isBackendAvailable) {
        // Use backend API
        if (profile.id) {
          // Update existing profile
          const updatedProfile = await ProfileApi.updateProfile(profile.id, this.mapProfileToBackend(profile));
          return this.mapProfileFromBackend(updatedProfile);
        } else {
          // Create new profile
          const newProfile = await ProfileApi.createProfile(this.mapProfileToBackend(profile));
          return this.mapProfileFromBackend(newProfile);
        }
      } else {
        // Fallback to localStorage
        const profiles = await this.getChildProfiles();
        const existingIndex = profiles.findIndex(p => p.id === profile.id);
        
        if (existingIndex >= 0) {
          profiles[existingIndex] = { ...profiles[existingIndex], ...profile, updatedAt: new Date() };
        } else {
          // Generate an ID for new profiles
          const newProfile = { 
            ...profile, 
            id: profile.id || `profile-${Date.now()}`, 
            createdAt: new Date(), 
            updatedAt: new Date() 
          };
          profiles.push(newProfile);
        }
        
        localStorage.setItem(`${this.namespace}.profiles`, JSON.stringify(profiles));
        return profile;
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      throw error;
    }
  }
  
  // Get all child profiles
  async getChildProfiles() {
    try {
      if (this.isBackendAvailable) {
        const profiles = await ProfileApi.getProfiles();
        // Map backend field names to frontend field names
        return profiles.map(profile => this.mapProfileFromBackend(profile));
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
      if (this.isBackendAvailable) {
        const profile = await ProfileApi.getProfile(id);
        return this.mapProfileFromBackend(profile);
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
      if (this.isBackendAvailable) {
        await ProfileApi.deleteProfile(id);
        return true;
      } else {
        const profiles = await this.getChildProfiles();
        const updatedProfiles = profiles.filter(p => p.id !== id);
        
        localStorage.setItem(`${this.namespace}.profiles`, JSON.stringify(updatedProfiles));
        
        // Also delete all conversations for this child
        const conversations = await this.getConversations();
        const updatedConversations = conversations.filter(c => c.childId !== id);
        
        localStorage.setItem(`${this.namespace}.conversations`, JSON.stringify(updatedConversations));
        
        return true;
      }
    } catch (error) {
      console.error(`Error deleting profile ${id}:`, error);
      throw error;
    }
  }
  
  /*
   * Conversation Methods
   */
  
  // Save a conversation
  async saveConversation(conversation) {
    try {
      if (this.isBackendAvailable) {
        if (conversation.id) {
          // Update existing conversation is handled by lastActivityAt updates
          // and message additions
          return conversation;
        } else {
          // Create new conversation
          return await ConversationApi.createConversation(
            conversation.childId, 
            conversation.threadId
          );
        }
      } else {
        // Fallback to localStorage
        const conversations = await this.getConversations();
        const existingIndex = conversations.findIndex(c => c.id === conversation.id);
        
        if (existingIndex >= 0) {
          conversations[existingIndex] = { 
            ...conversations[existingIndex], 
            ...conversation, 
            lastActivityAt: new Date() 
          };
        } else {
          conversations.push({ 
            ...conversation, 
            id: conversation.id || `conv-${Date.now()}`,
            startedAt: new Date(), 
            lastActivityAt: new Date() 
          });
        }
        
        localStorage.setItem(`${this.namespace}.conversations`, JSON.stringify(conversations));
        return conversation;
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
  }
  
  // Get all conversations
  async getConversations() {
    try {
      if (this.isBackendAvailable) {
        // Backend doesn't have a "get all conversations" endpoint,
        // but we'll keep this for consistency with localStorage approach
        const profiles = await this.getChildProfiles();
        const allConversations = [];
        
        for (const profile of profiles) {
          const conversations = await ConversationApi.getConversationsByChildId(profile.id);
          allConversations.push(...conversations);
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
      if (this.isBackendAvailable) {
        return await ConversationApi.getConversationsByChildId(childId);
      } else {
        const conversations = await this.getConversations();
        return conversations.filter(c => c.childId === childId);
      }
    } catch (error) {
      console.error(`Error getting conversations for child ${childId}:`, error);
      // Fall back to localStorage on API error
      const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
      return conversations.filter(c => c.childId === childId);
    }
  }
  
  // Get a specific conversation
  async getConversationById(id) {
    try {
      if (this.isBackendAvailable) {
        const conversation = await ConversationApi.getConversation(id);
        // Get messages as well
        const messages = await ConversationApi.getConversationMessages(id);
        return { ...conversation, messages };
      } else {
        const conversations = await this.getConversations();
        return conversations.find(c => c.id === id);
      }
    } catch (error) {
      console.error(`Error getting conversation ${id}:`, error);
      // Fall back to localStorage on API error
      const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
      return conversations.find(c => c.id === id);
    }
  }
  
  // Save a message to a conversation
  async saveMessage(conversationId, message) {
    try {
      if (this.isBackendAvailable) {
        return await ConversationApi.addMessage(
          conversationId,
          message.role,
          message.content
        );
      } else {
        const conversation = await this.getConversationById(conversationId);
        
        if (!conversation) {
          throw new Error(`Conversation with ID ${conversationId} not found`);
        }
        
        conversation.messages = [...(conversation.messages || []), { 
          ...message, 
          timestamp: new Date() 
        }];
        conversation.lastActivityAt = new Date();
        
        return this.saveConversation(conversation);
      }
    } catch (error) {
      console.error(`Error saving message to conversation ${conversationId}:`, error);
      throw error;
    }
  }
  
  // Get all messages from a conversation
  async getConversationMessages(conversationId) {
    try {
      if (this.isBackendAvailable) {
        return await ConversationApi.getConversationMessages(conversationId);
      } else {
        const conversation = await this.getConversationById(conversationId);
        
        if (!conversation) {
          return [];
        }
        
        return conversation.messages || [];
      }
    } catch (error) {
      console.error(`Error getting messages for conversation ${conversationId}:`, error);
      // Fall back to localStorage on API error
      const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
      const conversation = conversations.find(c => c.id === conversationId);
      return conversation ? (conversation.messages || []) : [];
    }
  }
  
  /*
   * Settings Methods
   */
  
  // Get application settings
  async getSettings() {
    try {
      if (this.isBackendAvailable) {
        return await SettingsApi.getSettings();
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
      if (this.isBackendAvailable) {
        // Only PIN updates are supported via API
        if (settings.parentPin) {
          await SettingsApi.updateParentPin(settings.parentPin);
        }
        return settings;
      } else {
        localStorage.setItem(`${this.namespace}.settings`, JSON.stringify(settings));
        return settings;
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }
  
  // Verify parent PIN
  async verifyParentPin(pin) {
    try {
      if (this.isBackendAvailable) {
        const result = await SettingsApi.verifyParentPin(pin);
        return result.valid;
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
      if (this.isBackendAvailable) {
        await SettingsApi.updateParentPin(pin);
        return true;
      } else {
        const settings = await this.getSettings();
        settings.parentPin = pin;
        return this.saveSettings(settings);
      }
    } catch (error) {
      console.error('Error updating PIN:', error);
      throw error;
    }
  }
  
  /*
   * Usage Statistics Methods
   */
  
  // Get usage statistics for a child
  async getChildUsageStats(childId) {
    try {
      // TODO: Implement backend API for usage statistics
      // For now, we calculate them from the conversations
      const conversations = await this.getConversationsByChildId(childId);
      
      // Calculate basic statistics
      const totalConversations = conversations.length;
      
      let totalMessages = 0;
      let totalUserMessages = 0;
      let totalAssistantMessages = 0;
      
      // If using backend, we need to fetch messages for each conversation
      if (this.isBackendAvailable) {
        for (const conv of conversations) {
          const messages = await ConversationApi.getConversationMessages(conv.id);
          totalMessages += messages.length;
          totalUserMessages += messages.filter(m => m.role === 'user').length;
          totalAssistantMessages += messages.filter(m => m.role === 'assistant').length;
        }
      } else {
        // Using localStorage, messages are embedded in conversations
        conversations.forEach(conv => {
          if (conv.messages) {
            totalMessages += conv.messages.length;
            totalUserMessages += conv.messages.filter(m => m.role === 'user').length;
            totalAssistantMessages += conv.messages.filter(m => m.role === 'assistant').length;
          }
        });
      }
      
      return {
        totalConversations,
        totalMessages,
        totalUserMessages,
        totalAssistantMessages,
        averageMessagesPerConversation: totalConversations > 0 ? (totalMessages / totalConversations).toFixed(1) : 0
      };
    } catch (error) {
      console.error(`Error getting usage stats for child ${childId}:`, error);
      throw error;
    }
  }
  
  /*
   * Search Methods
   */
  
  // Perform a search query
  async search(query, count = 5) {
    try {
      if (this.isBackendAvailable) {
        const { SearchApi } = await import('./ApiService');
        return await SearchApi.search(query, count);
      } else {
        throw new Error('Search is only available when backend is connected');
      }
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }
}
