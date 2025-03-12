// Simple localStorage implementation for MVP
// Would be replaced with proper backend database in production
export class StorageService {
  constructor(namespace = 'kids-ai') {
    this.namespace = namespace;
    
    // Initialize parent PIN if it doesn't exist
    this.initializeParentPin();
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
  
  // Child profiles
  async saveChildProfile(profile) {
    const profiles = await this.getChildProfiles();
    const existingIndex = profiles.findIndex(p => p.id === profile.id);
    
    if (existingIndex >= 0) {
      profiles[existingIndex] = { ...profiles[existingIndex], ...profile, updatedAt: new Date() };
    } else {
      profiles.push({ ...profile, createdAt: new Date(), updatedAt: new Date() });
    }
    
    localStorage.setItem(`${this.namespace}.profiles`, JSON.stringify(profiles));
    return profile;
  }
  
  async getChildProfiles() {
    const data = localStorage.getItem(`${this.namespace}.profiles`);
    return data ? JSON.parse(data) : [];
  }
  
  async getChildProfileById(id) {
    const profiles = await this.getChildProfiles();
    return profiles.find(p => p.id === id);
  }
  
  async deleteChildProfile(id) {
    const profiles = await this.getChildProfiles();
    const updatedProfiles = profiles.filter(p => p.id !== id);
    
    localStorage.setItem(`${this.namespace}.profiles`, JSON.stringify(updatedProfiles));
    
    // Also delete all conversations for this child
    const conversations = await this.getConversations();
    const updatedConversations = conversations.filter(c => c.childId !== id);
    
    localStorage.setItem(`${this.namespace}.conversations`, JSON.stringify(updatedConversations));
    
    return true;
  }
  
  // Conversations
  async saveConversation(conversation) {
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
        startedAt: new Date(), 
        lastActivityAt: new Date() 
      });
    }
    
    localStorage.setItem(`${this.namespace}.conversations`, JSON.stringify(conversations));
    return conversation;
  }
  
  async getConversations() {
    const data = localStorage.getItem(`${this.namespace}.conversations`);
    return data ? JSON.parse(data) : [];
  }
  
  async getConversationsByChildId(childId) {
    const conversations = await this.getConversations();
    return conversations.filter(c => c.childId === childId);
  }
  
  async getConversationById(id) {
    const conversations = await this.getConversations();
    return conversations.find(c => c.id === id);
  }
  
  async saveMessage(conversationId, message) {
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
  
  // Get all messages from a conversation
  async getConversationMessages(conversationId) {
    const conversation = await this.getConversationById(conversationId);
    
    if (!conversation) {
      return [];
    }
    
    return conversation.messages || [];
  }
  
  // Settings management (including parent PIN)
  async getSettings() {
    const data = localStorage.getItem(`${this.namespace}.settings`);
    return data ? JSON.parse(data) : {};
  }
  
  async saveSettings(settings) {
    localStorage.setItem(`${this.namespace}.settings`, JSON.stringify(settings));
    return settings;
  }
  
  async verifyParentPin(pin) {
    const settings = await this.getSettings();
    return settings.parentPin === pin;
  }
  
  async updateParentPin(pin) {
    const settings = await this.getSettings();
    settings.parentPin = pin;
    return this.saveSettings(settings);
  }
  
  // Usage statistics
  async getChildUsageStats(childId) {
    const conversations = await this.getConversationsByChildId(childId);
    
    // Calculate basic statistics
    const totalConversations = conversations.length;
    
    let totalMessages = 0;
    let totalUserMessages = 0;
    let totalAssistantMessages = 0;
    
    conversations.forEach(conv => {
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
      averageMessagesPerConversation: totalConversations > 0 ? (totalMessages / totalConversations).toFixed(1) : 0
    };
  }
}
