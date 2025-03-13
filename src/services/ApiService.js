/**
 * API Service for communicating with the backend
 */

// Get API URL from environment variables or use default for development
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Helper for making API requests with error handling
async function apiRequest(url, options = {}) {
  try {
    // Set a timeout for fetch requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: controller.signal
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);

    // Parse JSON response
    const data = await response.json();

    // Check if the response was not successful
    if (!response.ok) {
      throw new Error(data.error || `API error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API request failed for ${url}:`, error);
    // Add more specific error message for timeouts and connection resets
    if (error.name === 'AbortError') {
      console.warn('Request timed out, falling back to local storage');
    } else if (error.code === 'ECONNRESET' || error.message?.includes('ECONNRESET')) {
      console.warn('Connection reset by server, falling back to local storage');
    }
    throw error;
  }
}

/**
 * Child profile API methods
 */
export const ProfileApi = {
  // Get all profiles
  async getProfiles() {
    return apiRequest(`${API_URL}/profiles`);
  },

  // Get a specific profile
  async getProfile(id) {
    return apiRequest(`${API_URL}/profiles/${id}`);
  },

  // Create a new profile
  async createProfile(profile) {
    return apiRequest(`${API_URL}/profiles`, {
      method: 'POST',
      body: JSON.stringify(profile)
    });
  },

  // Update a profile
  async updateProfile(id, profile) {
    return apiRequest(`${API_URL}/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(profile)
    });
  },

  // Delete a profile
  async deleteProfile(id) {
    return apiRequest(`${API_URL}/profiles/${id}`, {
      method: 'DELETE'
    });
  }
};

/**
 * Conversation API methods
 */
export const ConversationApi = {
  // Get all conversations for a child
  async getConversationsByChildId(childId) {
    return apiRequest(`${API_URL}/conversations/child/${childId}`);
  },

  // Get a specific conversation
  async getConversation(id) {
    return apiRequest(`${API_URL}/conversations/${id}`);
  },

  // Get messages for a conversation
  async getConversationMessages(conversationId) {
    return apiRequest(`${API_URL}/conversations/${conversationId}/messages`);
  },

  // Create a new conversation
  async createConversation(childId, threadId, id = null) {
    const data = { childId, threadId };
    
    // If ID is provided, include it in the request
    if (id) {
      data.id = id;
    }
    
    return apiRequest(`${API_URL}/conversations`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Add a message to a conversation
  async addMessage(conversationId, role, content) {
    return apiRequest(`${API_URL}/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role, content })
    });
  },

  // Delete a conversation
  async deleteConversation(id) {
    return apiRequest(`${API_URL}/conversations/${id}`, {
      method: 'DELETE'
    });
  }
};

/**
 * Settings API methods
 */
export const SettingsApi = {
  // Get settings
  async getSettings() {
    return apiRequest(`${API_URL}/settings`);
  },

  // Update parent PIN
  async updateParentPin(pin) {
    return apiRequest(`${API_URL}/settings/pin`, {
      method: 'PUT',
      body: JSON.stringify({ pin })
    });
  },

  // Verify parent PIN
  async verifyParentPin(pin) {
    return apiRequest(`${API_URL}/settings/verify-pin`, {
      method: 'POST',
      body: JSON.stringify({ pin })
    });
  }
};

/**
 * Search API methods
 */
export const SearchApi = {
  // Perform a search
  async search(query, count = 5) {
    return apiRequest(`${API_URL}/search?q=${encodeURIComponent(query)}&count=${count}`);
  }
};

/**
 * Migration API methods
 */
export const MigrationApi = {
  // Import data from localStorage
  async importLocalStorageData(data) {
    return apiRequest(`${API_URL}/migration/import`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

// Check if backend is available
export async function checkBackendAvailability() {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Backend availability check failed:', error);
    return false;
  }
}
