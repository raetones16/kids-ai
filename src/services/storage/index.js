import { ProfileStorageService } from './ProfileStorageService';
import { ConversationStorageService } from './ConversationStorageService';
import { SettingsStorageService } from './SettingsStorageService';
import { UsageAnalyticsService } from './UsageAnalyticsService';
import { StorageMigrationService } from './StorageMigrationService';

/**
 * Main Storage Service
 * Composes individual storage services while maintaining backward compatibility
 */
export class StorageService {
  constructor(namespace = 'kids-ai') {
    this.namespace = namespace;
    
    // Initialize individual services
    // Order matters here due to dependencies
    this.profileStorage = new ProfileStorageService(namespace);
    this.conversationStorage = new ConversationStorageService(namespace, this.profileStorage);
    this.settingsStorage = new SettingsStorageService(namespace);
    this.analyticsService = new UsageAnalyticsService(namespace, this.conversationStorage);
    this.migrationService = new StorageMigrationService(namespace);
    
    // Initialize parent PIN if it doesn't exist in localStorage
    this.initializeParentPin();
  }
  
  // Initialize default parent PIN if not set
  async initializeParentPin() {
    await this.settingsStorage.initializeParentPin();
  }
  
  // Child Profile Methods
  async saveChildProfile(profile) {
    return this.profileStorage.saveChildProfile(profile);
  }
  
  async getChildProfiles() {
    return this.profileStorage.getChildProfiles();
  }
  
  async getChildProfileById(id) {
    return this.profileStorage.getChildProfileById(id);
  }
  
  async deleteChildProfile(id) {
    return this.profileStorage.deleteChildProfile(id);
  }
  
  // Conversation Methods
  async saveConversation(conversation) {
    return this.conversationStorage.saveConversation(conversation);
  }
  
  async getConversations() {
    return this.conversationStorage.getConversations();
  }
  
  async getConversationsByChildId(childId, page, limit) {
    return this.conversationStorage.getConversationsByChildId(childId, page, limit);
  }
  
  async getConversationById(id) {
    return this.conversationStorage.getConversationById(id);
  }
  
  async saveMessage(conversationId, message) {
    return this.conversationStorage.saveMessage(conversationId, message);
  }
  
  async getConversationMessages(conversationId) {
    return this.conversationStorage.getConversationMessages(conversationId);
  }
  
  // Usage Statistics Methods
  async getChildUsageStats(childId) {
    return this.analyticsService.getChildUsageStats(childId);
  }
  
  // Settings Methods
  async getSettings() {
    return this.settingsStorage.getSettings();
  }
  
  async saveSettings(settings) {
    return this.settingsStorage.saveSettings(settings);
  }
  
  async verifyParentPin(pin) {
    return this.settingsStorage.verifyParentPin(pin);
  }
  
  async updateParentPin(pin) {
    return this.settingsStorage.updateParentPin(pin);
  }
  
  // Migration Methods
  async migrateToBackend() {
    return this.migrationService.migrateToBackend();
  }
  
  // Map methods for backward compatibility
  mapProfileFromBackend(profile) {
    return this.profileStorage.mapProfileFromBackend(profile);
  }
  
  mapProfileToBackend(profile) {
    return this.profileStorage.mapProfileToBackend(profile);
  }
  
  mapConversationFromBackend(conversation) {
    return this.conversationStorage.mapConversationFromBackend(conversation);
  }
  
  mapConversationToBackend(conversation) {
    return this.conversationStorage.mapConversationToBackend(conversation);
  }
}