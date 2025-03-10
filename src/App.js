import React, { useState, useEffect } from 'react';
import './App.css';
import LoginScreen from './components/LoginScreen';
import ChildInterface from './components/ChildInterface';
import DebugPanel from './components/DebugPanel';
import { StorageService } from './services/StorageService';
import Logger from './utils/Logger';

// Initialize the storage service
const storageService = new StorageService();

// Enable debug mode (true for development, false for production)
const DEBUG_MODE = true;

function App() {
  const [user, setUser] = useState(null);
  const [childProfiles, setChildProfiles] = useState([]);
  const [appIsReady, setAppIsReady] = useState(false);

  // Initialize app
  useEffect(() => {
    Logger.info('App', 'Application initializing');
    
    const initializeApp = async () => {
      try {
        // Check for existing login
        const storedSession = localStorage.getItem('kids-ai.session');
        if (storedSession) {
          const parsedSession = JSON.parse(storedSession);
          Logger.debug('App', 'Found existing session', parsedSession);
          setUser(parsedSession);
        }

        // Load child profiles
        const profiles = await storageService.getChildProfiles();
        Logger.debug('App', `Loaded ${profiles.length} profiles`);
        setChildProfiles(profiles);
        
        // App is ready
        setAppIsReady(true);
        Logger.info('App', 'Application initialized successfully');
      } catch (error) {
        Logger.error('App', 'Failed to initialize application', error);
      }
    };

    initializeApp();
  }, []);

  // Handle login for a child profile
  const handleChildLogin = (childId) => {
    Logger.info('App', `Login attempt for child ID: ${childId}`);
    
    const childProfile = childProfiles.find(profile => profile.id === childId);
    if (childProfile) {
      const user = {
        type: 'child',
        id: childId,
        name: childProfile.name
      };
      
      setUser(user);
      localStorage.setItem('kids-ai.session', JSON.stringify(user));
      Logger.info('App', `Login successful for: ${childProfile.name}`);
    } else {
      Logger.error('App', `Login failed: Child profile not found for ID: ${childId}`);
    }
  };

  // Handle logout
  const handleLogout = () => {
    Logger.info('App', `Logout for user: ${user?.name || 'unknown'}`);
    setUser(null);
    localStorage.removeItem('kids-ai.session');
  };

  if (!appIsReady) {
    return (
      <div className="app loading">
        <div className="loader">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      {user && user.type === 'child' ? (
        <ChildInterface 
          childId={user.id} 
          childName={user.name} 
          onLogout={handleLogout} 
        />
      ) : (
        <LoginScreen 
          childProfiles={childProfiles} 
          onChildLogin={handleChildLogin} 
        />
      )}
      
      {/* Include debug panel in development mode */}
      {DEBUG_MODE && <DebugPanel />}
    </div>
  );
}

export default App;
