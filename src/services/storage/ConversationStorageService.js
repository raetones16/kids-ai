import { ConversationApi } from '../ApiService';
import { BaseStorageService } from './BaseStorageService';

/**
 * Conversation Storage Service
 * Manages conversation data and messages
 */
export class ConversationStorageService extends BaseStorageService {
  constructor(namespace = 'kids-ai', profileStorage = null) {
    super(namespace);
    this.profileStorage = profileStorage;
  }
  
  async getChildProfiles() {
    if (this.profileStorage) {
      return await this.profileStorage.getChildProfiles();
    } else {
      // Fallback if profileStorage is not provided
      const data = localStorage.getItem(`${this.namespace}.profiles`);
      return data ? JSON.parse(data) : [];
    }
  }
  
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
  
  // Get conversations for a specific child (with pagination)
  async getConversationsByChildId(childId, page = 1, limit = 20) {
    try {
      // Wait for backend availability check
      await this.backendAvailabilityPromise;
      
      // Ensure page is a number and force a numeric value
      const pageNum = Number(page);
      const limitNum = Number(limit);
      
      console.log(`ConversationStorageService requesting page ${pageNum} (raw input was ${page})`);
      
      if (this.isBackendAvailable) {
        try {
          const response = await ConversationApi.getConversationsByChildId(childId, pageNum, limitNum);
          
          // Extract conversations from response (handling both old and new API formats)
          const conversations = response.conversations || response;
          
          // Map to frontend format
          const mappedConversations = conversations.map(conv => this.mapConversationFromBackend(conv));
          
          // If no conversations in backend, check localStorage as fallback
          if (mappedConversations.length === 0) {
            const localConversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
            const filteredLocalConversations = localConversations.filter(c => c.childId === childId);
            
            if (filteredLocalConversations.length > 0) {
              return {
                conversations: filteredLocalConversations,
                pagination: {
                  total: filteredLocalConversations.length,
                  page: 1,
                  limit: filteredLocalConversations.length,
                  pages: 1
                }
              };
            }
          }
          
          // Return object with conversations and pagination info when available
          return response.pagination ? 
            { conversations: mappedConversations, pagination: response.pagination } : 
            mappedConversations; // For backward compatibility
        } catch (apiError) {
          console.error(`Error getting backend conversations for child ${childId}:`, apiError);
          // Fall back to localStorage on API error
          const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
          const filtered = conversations.filter(c => c.childId === childId);
          
          return {
            conversations: filtered,
            pagination: {
              total: filtered.length,
              page: 1,
              limit: filtered.length,
              pages: 1
            }
          };
        }
      } else {
        // Use localStorage directly
        const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
        const filtered = conversations.filter(c => c.childId === childId);
        
        return {
          conversations: filtered,
          pagination: {
            total: filtered.length,
            page: 1,
            limit: filtered.length,
            pages: 1
          }
        };
      }
    } catch (error) {
      console.error(`Error getting conversations for child ${childId}:`, error);
      // As a last resort, try to parse from localStorage
      const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
      const filtered = conversations.filter(c => c.childId === childId);
      
      return {
        conversations: filtered,
        pagination: {
          total: filtered.length,
          page: 1,
          limit: filtered.length,
          pages: 1
        }
      };
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
      
      // Check for duplicates before adding the message
      if (conversation.messages && conversation.messages.length > 0) {
        // Check if there's already a message with the same role and content
        const existingMessage = conversation.messages.find(m => 
          m.role === message.role && m.content === message.content
        );
        
        if (existingMessage) {
          console.log(`Ignoring duplicate message save: ${message.role} message already exists with same content`);
          return conversation;
        }
        
        // For assistant messages, also check for similar content with small differences
        // This can happen with streaming responses
        if (message.role === 'assistant' && message.content) {
          const existingSimilarMessages = conversation.messages.filter(m => 
            m.role === 'assistant' && 
            m.content && 
            (m.content.startsWith(message.content.substring(0, 20)) || 
             message.content.startsWith(m.content.substring(0, 20)))
          );
          
          if (existingSimilarMessages.length > 0) {
            console.log(`Ignoring message that looks like a duplicate: found ${existingSimilarMessages.length} similar assistant responses`);
            return conversation;
          }
        }
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
}