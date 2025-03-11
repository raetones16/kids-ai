import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import LoginScreen from './components/LoginScreen';
import ChatInterface from './components/ChatInterface';
import DebugPanel from './components/DebugPanel';
import { StorageService } from './services/StorageService';
import { AssistantService } from './services/AssistantService';
import { MockAssistantService } from './services/MockAssistantService';
import Logger from './utils/Logger';

// Get API key from environment variable
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

// Flags for services
const USE_REAL_API = true;
const DEBUG_MODE = true;

function App() {
  const [user, setUser] = useState(null);
  const [childProfiles, setChildProfiles] = useState([]);
  const [appIsReady, setAppIsReady] = useState(false);
  
  // Store service in ref
  const assistantRef = useRef(null);
  const storageService = useRef(new StorageService());

  // Initialize app
  useEffect(() => {
    Logger.info('App', 'Application initializing');
    
    const initializeApp = async () => {
      try {
        // Initialize the real or mock assistant based on flag
        if (USE_REAL_API) {
          assistantRef.current = new AssistantService(OPENAI_API_KEY);
          Logger.info('App', 'Using real OpenAI API');
        } else {
          assistantRef.current = new MockAssistantService();
          Logger.info('App', 'Using mock AI service');
        }
        
        // Check for existing login
        const storedSession = localStorage.getItem('kids-ai.session');
        if (storedSession) {
          const parsedSession = JSON.parse(storedSession);
          Logger.debug('App', 'Found existing session', parsedSession);
          setUser(parsedSession);
        }

        // Load child profiles
        const profiles = await storageService.current.getChildProfiles();
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
        <ChatInterface 
          childId={user.id} 
          childName={user.name} 
          onLogout={handleLogout}
          assistantRef={assistantRef.current}
          useMockApi={!USE_REAL_API}
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
