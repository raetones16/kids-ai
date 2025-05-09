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
  
  // Check if backend is available - simple method that won't throw
  async checkBackendAvailability() {
    try {
      // Create an abort controller with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // Clear the timeout
      
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
    try {
      // Check backend availability
      await this.checkBackendAvailability();
      
      // Get the current session to get the username
      const session = await this.getSession();
      const currentUsername = session && session.type === 'parent' ? session.username : 'parent';
      
      // We don't want to expose the hashed password, so just return the username
      return { username: currentUsername };
    } catch (error) {
      console.error('Error getting parent credentials:', error);
      return { username: 'parent' };
    }
  }

  // Update parent credentials
  async updateParentCredentials(username, password) {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }
    
    try {
      // Check backend availability
      await this.checkBackendAvailability();
      
      // Get current username
      const currentCreds = await this.getParentCredentials();
      const currentUsername = currentCreds.username;
      
      if (this.isBackendAvailable) {
        // Use the backend API
        await AuthApi.updateCredentials(username, password, currentUsername);
        
        // Update the session if we have one
        const session = await this.getSession();
        if (session && session.type === 'parent') {
          session.username = username;
          localStorage.setItem(this.sessionKey, JSON.stringify(session));
        }
        
        return true;
      } else {
        // Fall back to localStorage - however this won't work with hashed passwords
        console.warn('Backend not available, credentials update may not work properly with hashed passwords');
        return false;
      }
    } catch (error) {
      console.error('Error updating parent credentials:', error);
      throw error;
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
    
    // Store session in localStorage only for simplicity and reliability
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
    
    this.currentUser = session;
    
    // Make sure we don't have a sessionId in localStorage that could cause validation to fail
    localStorage.removeItem(this.sessionIdKey);
    
    return session;
  }
  
  // Get current session from localStorage or backend
  async getSession() {
    console.log('AuthService: getSession() called');
    
    // First check if we already have a session in memory
    if (this.currentUser) {
      console.log('AuthService: Using session from memory', this.currentUser);
      return this.currentUser;
    }
    
    // Get session data directly from localStorage
    const sessionData = localStorage.getItem(this.sessionKey);
    const sessionId = localStorage.getItem(this.sessionIdKey);
    
    console.log('AuthService: Session data from localStorage:', {
      sessionId,
      sessionData,
      sessionKeyUsed: this.sessionKey
    });
    
    // If no session data, no session exists
    if (!sessionData) {
      console.log('AuthService: No session data found in localStorage');
      return null;
    }
    
    try {
      // Parse stored session
      const parsedSession = JSON.parse(sessionData);
      console.log('AuthService: Parsed session from localStorage:', parsedSession);
      
      // Store in memory for future use
      this.currentUser = parsedSession;
      
      // For child sessions, we should just return the session without any validation
      if (parsedSession.type === 'child') {
        console.log('AuthService: Child session detected, skipping backend validation');
        return parsedSession;
      }
      
      // Only validate with backend if we have a sessionId
      if (sessionId) {
        // Check backend availability without throwing - we'll try to validate if available
        const isBackendUp = await this.checkBackendAvailability().catch(() => false);
        
        if (isBackendUp) {
          // Validate session with backend
          try {
            console.log('AuthService: Validating session with backend');
            const result = await AuthApi.validateSession(sessionId);
            
            // Update session info
            this.currentUser = result.user;
            this.currentSessionId = result.sessionId;
            
            // Update localStorage
            localStorage.setItem(this.sessionKey, JSON.stringify(result.user));
            
            console.log('AuthService: Session validated successfully', result.user);
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
          console.log('AuthService: Backend not available, using stored session');
          return parsedSession;
        }
      } else {
        console.log('AuthService: No sessionId, using stored session directly');
        return parsedSession;
      }
    } catch (error) {
      console.error('Error parsing or validating session:', error);
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
      const sessionData = localStorage.getItem(this.sessionKey);
      let currentUserType = 'unknown';
      
      // Determine the type of user logging out
      if (sessionData) {
        try {
          const parsedSession = JSON.parse(sessionData);
          currentUserType = parsedSession.type || 'unknown';
        } catch (e) {
          console.warn('Error parsing session data:', e);
        }
      }
      
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
      
      // Only clear remember me data if explicitly requested OR if this is a parent logout
      // This ensures child logouts don't clear parent authentication
      if (clearRememberMe || currentUserType === 'parent') {
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
