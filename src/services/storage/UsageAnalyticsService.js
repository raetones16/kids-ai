import { BaseStorageService } from './BaseStorageService';

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
      
      // Get all conversations for this child
      const conversations = await this.conversationStorage.getConversationsByChildId(childId);
      
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
}