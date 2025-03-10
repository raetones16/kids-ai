// Simple localStorage implementation for MVP
// Would be replaced with proper backend database in production
export class StorageService {
  constructor(namespace = 'kids-ai') {
    this.namespace = namespace;
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
}
