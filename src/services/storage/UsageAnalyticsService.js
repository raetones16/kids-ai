import { BaseStorageService } from './BaseStorageService';
import { StatsApi } from '../ApiService';

/**
 * Usage Analytics Service
 * Handles usage statistics calculations
 */
export class UsageAnalyticsService extends BaseStorageService {
  constructor(namespace = 'kids-ai', conversationStorage) {
    super(namespace);
    this.conversationStorage = conversationStorage;
  }
  
  // Get usage statistics for a child
  async getChildUsageStats(childId) {
    try {
      // Wait for backend availability check
      await this.backendAvailabilityPromise;
      
      if (this.isBackendAvailable) {
        try {
          // Get stats directly from the new dedicated API endpoint
          const stats = await StatsApi.getChildStats(childId);
          return stats;
        } catch (apiError) {
          console.error(`Error getting stats from API for child ${childId}:`, apiError);
          // Fall back to the old method if API call fails
          return this._getChildUsageStatsFromLocalData(childId);
        }
      } else {
        // Fallback to calculating from local data if backend not available
        return this._getChildUsageStatsFromLocalData(childId);
      }
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
  
  // Legacy method to calculate stats from local data
  async _getChildUsageStatsFromLocalData(childId) {
    try {
      // Get all conversations for this child
      const response = await this.conversationStorage.getConversationsByChildId(childId);
      
      // Handle both legacy format and new paginated format
      const conversations = response.conversations || response;
      
      if (!Array.isArray(conversations)) {
        console.error('Conversations data is not an array:', conversations);
        throw new Error('Invalid conversations data format');
      }
      // Process conversations to ensure they all have messages
      const processedConversations = await Promise.all(
        conversations.map(async (conv) => {
          if (!conv.messages || conv.messages.length === 0) {
            try {
              // Get messages if they're not included in the conversation
              const messages = await this.conversationStorage.getConversationMessages(conv.id);
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
      console.error(`Error calculating stats from local data for child ${childId}:`, error);
      return {
        totalConversations: 0,
        totalMessages: 0,
        totalUserMessages: 0,
        totalAssistantMessages: 0,
        averageMessagesPerConversation: '0'
      };
    }
  }
}