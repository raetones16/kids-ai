/**
 * Authentication Service
 * Manages parent login with username/password and session persistence
 */
export class AuthService {
  constructor(namespace = 'kids-ai') {
    this.namespace = namespace;
    this.defaultCredentials = {
      username: 'parent',
      password: 'password123'
    };
    this.sessionKey = `${this.namespace}.session`;
    
    // Initialize default parent account if it doesn't exist
    this.initializeParentAccount();
  }
  
  // Initialize default parent account
  async initializeParentAccount() {
    const storedCredentials = localStorage.getItem(`${this.namespace}.parent_credentials`);
    
    if (!storedCredentials) {
      localStorage.setItem(
        `${this.namespace}.parent_credentials`, 
        JSON.stringify(this.defaultCredentials)
      );
    }
  }
  
  // Get parent credentials
  async getParentCredentials() {
    const storedCredentials = localStorage.getItem(`${this.namespace}.parent_credentials`);
    return storedCredentials 
      ? JSON.parse(storedCredentials) 
      : this.defaultCredentials;
  }
  
  // Update parent credentials
  async updateParentCredentials(username, password) {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }
    
    const credentials = { username, password };
    localStorage.setItem(
      `${this.namespace}.parent_credentials`,
      JSON.stringify(credentials)
    );
    
    return true;
  }
  
  // Login parent with username/password
  async loginParent(username, password) {
    const credentials = await this.getParentCredentials();
    
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
      
      return session;
    } else {
      throw new Error('Invalid username or password');
    }
  }
  
  // Get current session
  async getSession() {
    const sessionData = localStorage.getItem(this.sessionKey);
    return sessionData ? JSON.parse(sessionData) : null;
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
  
  // Login child (simpler process, just sets session)
  async loginChild(childId, childName) {
    if (!childId || !childName) {
      throw new Error('Child ID and name are required');
    }
    
    // Create session
    const session = {
      type: 'child',
      id: childId,
      name: childName,
      timestamp: new Date().toISOString()
    };
    
    // Store session
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
    
    return session;
  }
  
  // Logout any user (parent or child)
  async logout() {
    localStorage.removeItem(this.sessionKey);
    return true;
  }
}
