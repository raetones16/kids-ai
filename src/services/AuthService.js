/**
 * Authentication Service
 * Manages parent login, child login, and session persistence
 */
import { AuthApi } from './ApiService';

export class AuthService {
  constructor(namespace = 'kids-ai') {
    this.namespace = namespace;
    this.sessionKey = `${this.namespace}.session`;
    this.sessionIdKey = `${this.namespace}.sessionId`;
    this.rememberMeKey = `${this.namespace}.rememberMe`;
    this.credentialsKey = `${this.namespace}.parentCredentials`;
    this.currentUser = null;
    this.currentSessionId = null;
    this.isBackendAvailable = true; // Assume backend is available initially
  }
  
  // Check if backend is available
  async checkBackendAvailability() {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/health`);
      this.isBackendAvailable = response.ok;
      return this.isBackendAvailable;
    } catch (error) {
      console.error('Error checking backend availability:', error);
      this.isBackendAvailable = false;
      return false;
    }
  }
  
  // Get parent credentials
  async getParentCredentials() {
    // Check backend availability
    await this.checkBackendAvailability();
      
    if (this.isBackendAvailable) {
      // TODO: In a production version, we would have a proper endpoint
      // For now, just return the default credentials since we know they're fixed
      return { username: 'parent', password: 'password123' };
    } else {
      // Get credentials from localStorage with fallback to defaults
      const storedCredentials = localStorage.getItem(`${this.namespace}.parent_credentials`);
      return storedCredentials 
        ? JSON.parse(storedCredentials) 
        : { username: 'parent', password: 'password123' };
    }
  }

  // Update parent credentials
  async updateParentCredentials(username, password) {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }
    
    // Check backend availability
    await this.checkBackendAvailability();
    
    if (this.isBackendAvailable) {
      try {
        // TODO: Add proper API endpoint for updating credentials
        // For now, we'll just store in localStorage
        const credentials = { username, password };
        localStorage.setItem(`${this.namespace}.parent_credentials`, JSON.stringify(credentials));
        return true;
      } catch (error) {
        console.error('Error updating parent credentials in API:', error);
        // Fall back to updating in localStorage
        const credentials = { username, password };
        localStorage.setItem(`${this.namespace}.parent_credentials`, JSON.stringify(credentials));
        return true;
      }
    } else {
      // Store in localStorage
      const credentials = { username, password };
      localStorage.setItem(`${this.namespace}.parent_credentials`, JSON.stringify(credentials));
      return true;
    }
  }
  
  // Auto login from stored credentials
  async autoLogin() {
    // Check if we have a remember me flag and credentials
    const rememberMe = localStorage.getItem(this.rememberMeKey) === 'true';
    
    if (!rememberMe) {
      return null;
    }
    
    try {
      // Try to get stored credentials
      const storedCredentialsJson = localStorage.getItem(this.credentialsKey);
      
      if (!storedCredentialsJson) {
        return null;
      }
      
      const storedCredentials = JSON.parse(storedCredentialsJson);
      
      // Use the stored credentials to login
      if (storedCredentials && storedCredentials.username && storedCredentials.password) {
        return await this.loginParent(
          storedCredentials.username, 
          storedCredentials.password, 
          true, // Keep remember me active
          true  // Silent mode - don't throw errors
        );
      }
      
      return null;
    } catch (error) {
      console.error('Auto-login error:', error);
      return null;
    }
  }
  
  // Login parent with username/password
  async loginParent(username, password, rememberMe = false, silent = false) {
    try {
      // Check backend availability
      await this.checkBackendAvailability();
      
      if (this.isBackendAvailable) {
        try {
          // Try to login with backend
          const result = await AuthApi.login(username, password);
          
          // Store session info
          this.currentUser = result.user;
          this.currentSessionId = result.sessionId;
          
          // Save to localStorage
          localStorage.setItem(this.sessionKey, JSON.stringify(result.user));
          localStorage.setItem(this.sessionIdKey, result.sessionId);
          
          // If remember me is enabled, store credentials
          if (rememberMe) {
            localStorage.setItem(this.rememberMeKey, 'true');
            localStorage.setItem(this.credentialsKey, JSON.stringify({
              username,
              password
            }));
          }
          
          return result.user;
        } catch (apiError) {
          console.error('API login error:', apiError);
          
          // Check if it's an incorrect credentials error
          if (apiError.message && (apiError.message.includes('Invalid credentials') || apiError.message.includes('401'))) {
            throw new Error('Invalid username or password');
          }
          
          // For other errors, try legacy login
          return this.legacyLoginParent(username, password, rememberMe);
        }
      } else {
        // Fallback to legacy localStorage auth
        return this.legacyLoginParent(username, password, rememberMe);
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // If it's an authentication error, don't fall back unless in silent mode
      if (error.message && error.message.includes('Invalid') && !silent) {
        throw error;
      }
      
      // Try legacy login as fallback
      return this.legacyLoginParent(username, password, rememberMe);
    }
  }
  
  // Legacy login method using localStorage
  async legacyLoginParent(username, password, rememberMe = false) {
    console.log('Using legacy localStorage authentication');
    
    // Get stored credentials
    const storedCredentials = localStorage.getItem(`${this.namespace}.parent_credentials`);
    const credentials = storedCredentials 
      ? JSON.parse(storedCredentials) 
      : { username: 'parent', password: 'password123' };
    
    if (credentials.username === username && credentials.password === password) {
      // Create session
      const session = {
        type: 'parent',
        id: 'parent',
        name: 'Parent',
        timestamp: new Date().toISOString()
      };
      
      // Store session
      localStorage.setItem(this.sessionKey, JSON.stringify(session));
      this.currentUser = session;
      
      // If remember me is enabled, store credentials
      if (rememberMe) {
        localStorage.setItem(this.rememberMeKey, 'true');
        localStorage.setItem(this.credentialsKey, JSON.stringify({
          username,
          password
        }));
      }
      
      return session;
    } else {
      throw new Error('Invalid username or password');
    }
  }
  
  // Login child (using child ID)
  async loginChild(childId, childName) {
    if (!childId) {
      throw new Error('Child ID is required');
    }
    
    try {
      // Check backend availability
      await this.checkBackendAvailability();
      
      if (this.isBackendAvailable) {
        try {
          // Try to login with backend
          const result = await AuthApi.childLogin(childId);
          
          // Store session info
          this.currentUser = result.user;
          this.currentSessionId = result.sessionId;
          
          // Save to localStorage
          localStorage.setItem(this.sessionKey, JSON.stringify(result.user));
          localStorage.setItem(this.sessionIdKey, result.sessionId);
          
          return result.user;
        } catch (apiError) {
          console.error('Child login error:', apiError);
          
          // Try legacy login as fallback
          return this.legacyLoginChild(childId, childName);
        }
      } else {
        // Fallback to legacy localStorage auth
        return this.legacyLoginChild(childId, childName);
      }
    } catch (error) {
      console.error('Child login error:', error);
      
      // Try legacy login as fallback
      return this.legacyLoginChild(childId, childName);
    }
  }
  
  // Legacy child login method using localStorage
  async legacyLoginChild(childId, childName) {
    console.log('Using legacy localStorage child authentication');
    
    // Create session
    const session = {
      type: 'child',
      id: childId,
      name: childName,
      timestamp: new Date().toISOString()
    };
    
    // Store session
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
    this.currentUser = session;
    
    return session;
  }
  
  // Get current session from backend or localStorage
  async getSession() {
    // First check if we already have a session in memory
    if (this.currentUser) {
      return this.currentUser;
    }
    
    // Get session ID from localStorage
    const sessionId = localStorage.getItem(this.sessionIdKey);
    const sessionData = localStorage.getItem(this.sessionKey);
    
    // If no session data, no session exists
    if (!sessionData) {
      return null;
    }
    
    try {
      // Parse stored session
      const parsedSession = JSON.parse(sessionData);
      this.currentUser = parsedSession;
      
      // Check backend availability
      await this.checkBackendAvailability();
      
      if (this.isBackendAvailable && sessionId) {
        // Validate session with backend
        try {
          const result = await AuthApi.validateSession(sessionId);
          
          // Update session info
          this.currentUser = result.user;
          this.currentSessionId = result.sessionId;
          
          // Update localStorage
          localStorage.setItem(this.sessionKey, JSON.stringify(result.user));
          
          return result.user;
        } catch (validationError) {
          console.warn('Session validation failed:', validationError);
          // If validation fails, clear session data and return null
          localStorage.removeItem(this.sessionKey);
          localStorage.removeItem(this.sessionIdKey);
          this.currentUser = null;
          this.currentSessionId = null;
          return null;
        }
      } else {
        // If backend is not available, use stored session
        return parsedSession;
      }
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }
  
  // Check if user is authenticated
  async isAuthenticated() {
    const session = await this.getSession();
    return !!session;
  }
  
  // Check if session is parent
  async isParent() {
    const session = await this.getSession();
    return session && session.type === 'parent';
  }
  
  // Logout any user (parent or child)
  async logout(clearRememberMe = false) {
    try {
      const sessionId = localStorage.getItem(this.sessionIdKey);
      
      // Check backend availability
      await this.checkBackendAvailability();
      
      if (this.isBackendAvailable && sessionId) {
        // Try to logout with backend
        try {
          await AuthApi.logout(sessionId);
        } catch (logoutError) {
          console.warn('Backend logout failed:', logoutError);
          // Continue with local logout even if backend logout fails
        }
      }
      
      // Clear local session data
      localStorage.removeItem(this.sessionKey);
      localStorage.removeItem(this.sessionIdKey);
      this.currentUser = null;
      this.currentSessionId = null;
      
      // Only clear remember me data if explicitly requested
      if (clearRememberMe) {
        localStorage.removeItem(this.rememberMeKey);
        localStorage.removeItem(this.credentialsKey);
        console.log('Remember Me data cleared');
      }
      
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Always clear local session data even if there's an error
      localStorage.removeItem(this.sessionKey);
      localStorage.removeItem(this.sessionIdKey);
      this.currentUser = null;
      this.currentSessionId = null;
      
      return true;
    }
  }
}
