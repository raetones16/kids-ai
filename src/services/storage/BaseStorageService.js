import { checkBackendAvailability } from '../ApiService';

/**
 * Base Storage Service
 * Provides core functionality for all storage services with fallback mechanisms
 */
export class BaseStorageService {
  constructor(namespace = 'kids-ai') {
    this.namespace = namespace;
    this.isBackendAvailable = false;
    this.backendAvailabilityPromise = this.checkBackendAvailability();
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

  // Map backend field names to frontend field names for profiles
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
  
  // Map frontend field names to backend field names for profiles
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
}