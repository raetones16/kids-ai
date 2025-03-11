import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import LoginScreen from './components/LoginScreen';
import ParentLogin from './components/ParentLogin';
import PinEntryModal from './components/ParentDashboard/PinEntryModal';
import ChatInterface from './components/ChatInterface';
import ParentDashboard from './components/ParentDashboard';
import DebugPanel from './components/DebugPanel';
import { StorageService } from './services/StorageService';
import { AssistantService } from './services/AssistantService';
import { MockAssistantService } from './services/MockAssistantService';
import { AuthService } from './services/AuthService';
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
  
  // Store services in refs
  const assistantRef = useRef(null);
  const storageService = useRef(new StorageService());
  const authService = useRef(new AuthService());
  
  // State for authentication modals
  const [showParentAuth, setShowParentAuth] = useState(true); // Start with parent auth
  const [showPinModal, setShowPinModal] = useState(false);

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
        
        // Check for existing session
        const session = await authService.current.getSession();
        if (session) {
          Logger.debug('App', 'Found existing session', session);
          setUser(session);
          setShowParentAuth(false); // Don't show auth if we have a session
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
  const handleChildLogin = async (childId) => {
    Logger.info('App', `Login attempt for child ID: ${childId}`);
    
    const childProfile = childProfiles.find(profile => profile.id === childId);
    if (childProfile) {
      try {
        const session = await authService.current.loginChild(childId, childProfile.name);
        setUser(session);
        Logger.info('App', `Login successful for: ${childProfile.name}`);
      } catch (error) {
        Logger.error('App', `Login failed for child ID: ${childId}`, error);
      }
    } else {
      Logger.error('App', `Login failed: Child profile not found for ID: ${childId}`);
    }
  };

  // Handle parent login button click
  const handleParentLoginClick = () => {
    Logger.info('App', 'Parent dashboard access requested');
    setShowPinModal(true);
  };
  
  // Handle successful parent login
  const handleParentLoginSuccess = (session) => {
    Logger.info('App', 'Parent login successful');
    setUser(session);
    setShowParentAuth(false);
  };
  
  // Handle parent login cancel
  const handleParentLoginCancel = () => {
    setShowParentAuth(false);
  };
  
  // Handle successful PIN entry
  const handlePinSuccess = async (pin) => {
    try {
      // Verify PIN
      const isValid = await storageService.current.verifyParentPin(pin);
      
      if (isValid) {
        // Set user as parent
        const parentUser = {
          type: 'parent',
          id: 'parent',
          name: 'Parent'
        };
        setUser(parentUser);
        setShowPinModal(false);
        return true;
      } else {
        // PIN is invalid
        return false;
      }
    } catch (err) {
      console.error('Error verifying PIN:', err);
      return false;
    }
  };

  // Handle logout
  const handleLogout = async () => {
    Logger.info('App', `Logout for user: ${user?.name || 'unknown'}`);
    await authService.current.logout();
    setUser(null);
  };

  if (!appIsReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Show parent login if no session exists */}
      {showParentAuth ? (
        <ParentLogin
          onLoginSuccess={handleParentLoginSuccess}
          onCancel={handleParentLoginCancel}
        />
      ) : user ? (
        user.type === 'child' ? (
          <ChatInterface 
            childId={user.id} 
            childName={user.name} 
            onLogout={handleLogout}
            assistantRef={assistantRef.current}
            useMockApi={!USE_REAL_API}
          />
        ) : user.type === 'parent' ? (
          <ParentDashboard 
            onLogout={handleLogout}
          />
        ) : (
          <LoginScreen 
            childProfiles={childProfiles} 
            onChildLogin={handleChildLogin}
            onParentLogin={handleParentLoginClick}
          />
        )
      ) : (
        <LoginScreen 
          childProfiles={childProfiles} 
          onChildLogin={handleChildLogin}
          onParentLogin={handleParentLoginClick}
        />
      )}
      
      {/* PIN Entry Modal */}
      {showPinModal && (
        <PinEntryModal 
          onVerify={handlePinSuccess} 
          onCancel={() => setShowPinModal(false)} 
        />
      )}
      
      {/* Include debug panel in development mode */}
      {DEBUG_MODE && <DebugPanel />}
    </div>
  );
}

export default App;
