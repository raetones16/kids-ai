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
    
    // Log the original profile from backend for debugging
    console.log('Original profile from backend:', profile);
    
    // Create a mapped profile with proper field names
    const mappedProfile = {
      ...profile,
      customInstructions: profile.custom_instructions,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    };

    // Convert DOB to correct format if needed
    if (mappedProfile.dob && mappedProfile.dob.includes('-')) {
      // Keep it as is for now, the format will be handled in ChatCompletionService
      console.log(`Profile DOB in ISO format (${mappedProfile.dob}) - will be handled during processing`);
    }
    
    // Ensure customInstructions are loaded
    if (!mappedProfile.customInstructions && profile.custom_instructions) {
      mappedProfile.customInstructions = profile.custom_instructions;
      console.log(`Fixed customInstructions mapping for profile ID ${profile.id}`);
    }
    
    console.log('Final mapped profile:', mappedProfile);
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
      // Set a timeout for the availability check
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/health`, {
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      this.isBackendAvailable = response.ok;
      console.log(`Backend API ${this.isBackendAvailable ? 'is' : 'is not'} available`);
      return this.isBackendAvailable;
    } catch (error) {
      console.error('Error checking backend availability:', error);
      if (error.name === 'AbortError') {
        console.warn('Backend availability check timed out');
      }
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
        try {
          const profile = await ProfileApi.getProfile(id);
          const mappedProfile = this.mapProfileFromBackend(profile);
          console.log('Backend profile loaded:', profile);
          console.log('Mapped profile:', mappedProfile);
          return mappedProfile;
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
      console.log('Attempting to save conversation:', conversation);
      if (this.isBackendAvailable) {
        try {
          if (conversation.id) {
            // Check if conversation exists in the backend
            try {
              const existingConversation = await ConversationApi.getConversation(conversation.id);
              // Conversation exists, no need to create it
              console.log(`Conversation ${conversation.id} already exists in backend`);
            } catch (notFoundError) {
              // Conversation doesn't exist in backend, create it
              console.log(`Conversation ${conversation.id} not found in backend, creating it...`);
              
              // Make sure we have the required fields
              if (!conversation.childId && !conversation.child_id) {
                console.error('Missing childId for conversation creation', conversation);
                throw new Error('Missing childId for conversation creation');
              }
              
              const threadId = conversation.threadId || conversation.thread_id || `thread-${Date.now()}`;
              const childId = conversation.childId || conversation.child_id;
              
              try {
                // Create new conversation in backend
                await ConversationApi.createConversation(
                  childId,
                  threadId,
                  conversation.id
                );
                
                console.log(`Successfully created conversation ${conversation.id} in backend`);
                
                // If the conversation has messages, save them too
                if (conversation.messages && conversation.messages.length > 0) {
                  console.log(`Saving ${conversation.messages.length} messages to conversation ${conversation.id}`);
                  for (const message of conversation.messages) {
                    try {
                      await ConversationApi.addMessage(
                        conversation.id,
                        message.role,
                        message.content
                      );
                    } catch (msgError) {
                      console.error(`Failed to add message to backend conversation ${conversation.id}:`, msgError);
                      // Continue with other messages
                    }
                  }
                }
              } catch (createError) {
                console.error(`Error creating conversation in backend:`, createError);
                // Always save to localStorage as fallback
                this._saveConversationToLocalStorage(conversation);
              }
            }
            
            // Always save to localStorage as well for redundancy
            this._saveConversationToLocalStorage(conversation);
            
            // Return the conversation as is
            return conversation;
          } else {
            // Create new conversation
            try {
              const savedConversation = await ConversationApi.createConversation(
                conversation.childId, 
                conversation.threadId
              );
              console.log('Successfully created new conversation in backend:', savedConversation);
              
              // Also save to localStorage
              this._saveConversationToLocalStorage(savedConversation);
              
              return this.mapConversationFromBackend(savedConversation);
            } catch (createError) {
              console.error('Error creating new conversation in backend:', createError);
              // Fall back to localStorage
              return this._saveConversationToLocalStorage(conversation);
            }
          }
        } catch (apiError) {
          console.error(`Error saving conversation to backend:`, apiError);
          // Fall back to localStorage
          return this._saveConversationToLocalStorage(conversation);
        }
      } else {
        // Fallback to localStorage
        return this._saveConversationToLocalStorage(conversation);
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
      // Always try to save to localStorage as last resort
      try {
        return this._saveConversationToLocalStorage(conversation);
      } catch (finalError) {
        console.error('Final attempt to save conversation failed:', finalError);
        throw error; // Re-throw the original error
      }
    }
  }
  
  // Helper method to save conversation to localStorage
  _saveConversationToLocalStorage(conversation) {
    // Fallback to localStorage
    try {
      console.log('Saving conversation to localStorage:', conversation);
      
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
    console.log(`Fetching conversations for child ID: ${childId}`);
    try {
      if (this.isBackendAvailable) {
        try {
          const conversations = await ConversationApi.getConversationsByChildId(childId);
          console.log(`Received ${conversations.length} conversations from backend for child ${childId}:`, conversations);
          
          // If no conversations in backend, check localStorage as fallback
          if (conversations.length === 0) {
            console.log(`No conversations found in backend for child ${childId}, checking localStorage...`);
            const localConversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
            const filteredLocalConversations = localConversations.filter(c => c.childId === childId);
            
            if (filteredLocalConversations.length > 0) {
              console.log(`Found ${filteredLocalConversations.length} conversations in localStorage for child ${childId}`);
              return filteredLocalConversations;
            }
          }
          
          // Map backend field names to frontend field names
          const mappedConversations = conversations.map(conversation => this.mapConversationFromBackend(conversation));
          console.log('Mapped conversations:', mappedConversations);
          
          return mappedConversations;
        } catch (apiError) {
          console.error(`Error getting backend conversations for child ${childId}:`, apiError);
          // Fall back to localStorage on API error
          const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
          const filteredConversations = conversations.filter(c => c.childId === childId);
          console.log(`Found ${filteredConversations.length} conversations in localStorage for child ${childId}`);
          return filteredConversations;
        }
      } else {
        // Use localStorage directly
        const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
        const filteredConversations = conversations.filter(c => c.childId === childId);
        console.log(`Found ${filteredConversations.length} conversations in localStorage for child ${childId}`);
        return filteredConversations;
      }
    } catch (error) {
      console.error(`Error getting conversations for child ${childId}:`, error);
      // As a last resort, try to parse from localStorage
      try {
        const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
        const filteredConversations = conversations.filter(c => c.childId === childId);
        console.log(`Found ${filteredConversations.length} conversations in localStorage for child ${childId} (fallback)`);
        return filteredConversations;
      } catch (localError) {
        console.error('Could not retrieve conversations from localStorage:', localError);
        return [];
      }
    }
  }
  
  // Get a specific conversation
  async getConversationById(id) {
    try {
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
      try {
        const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
        return conversations.find(c => c.id === id);
      } catch (localError) {
        console.error('Error getting conversation from localStorage:', localError);
        return null;
      }
    }
  }
  
  // Save a message to a conversation
  async saveMessage(conversationId, message) {
    try {
      if (this.isBackendAvailable) {
        try {
          // Make sure message has a timestamp
          const messageWithTimestamp = {
            ...message,
            timestamp: message.timestamp || new Date().toISOString()
          };
          
          const savedMessage = await ConversationApi.addMessage(
            conversationId,
            messageWithTimestamp.role,
            messageWithTimestamp.content
          );
          
          return savedMessage;
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
      const conversation = await this.getConversationById(conversationId);
      
      if (!conversation) {
        throw new Error(`Conversation with ID ${conversationId} not found`);
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
      
      // If the conversation wasn't found, let the error propagate up
      // so the useChat hook can handle it by creating a new conversation
      throw error;
    }
  }
  
  // Get all messages from a conversation
  async getConversationMessages(conversationId) {
    try {
      if (this.isBackendAvailable) {
        try {
          const messages = await ConversationApi.getConversationMessages(conversationId);
          
          // Check if we received actual messages
          if (messages && Array.isArray(messages)) {
            // Ensure all messages have proper timestamp formatting
            return messages.map(msg => ({
              ...msg,
              timestamp: msg.timestamp || new Date().toISOString()
            }));
          } else {
            console.warn(`No valid messages returned for conversation ${conversationId}`);
            return [];
          }
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
      try {
        const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
        const conversation = conversations.find(c => c.id === conversationId);
        return conversation ? (conversation.messages || []) : [];
      } catch (localError) {
        console.error('Could not retrieve messages from localStorage:', localError);
        return [];
      }
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
