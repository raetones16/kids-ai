import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import "./components/MobileFixes.css"; // Mobile-specific fixes
import LoginScreen from "./components/LoginScreen";
import ParentLogin from "./components/ParentLogin";
import PinEntryModal from "./components/ParentDashboard/PinEntryModal";
import ChatInterface from "./components/ChatInterface";
import ParentDashboard from "./components/ParentDashboard";
import DebugPanel from "./components/DebugPanel";
import SvgWaveBackground from "./components/SvgWaveBackground";
import { Card, CardContent, CardHeader } from "./components/ui/card";
import { StorageService } from "./services/StorageService";
import { ChatCompletionService } from "./services/ChatCompletionService";
import { MockAssistantService } from "./services/MockAssistantService";
import { AuthService } from "./services/AuthService";
import Logger from "./utils/Logger";

// Get API key from environment variable - Not needed anymore since we use backend API
// const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

// Flags for services
const USE_REAL_API = true;
const DEBUG_MODE = false;

function App() {
  // Main state
  const [user, setUser] = useState(null);
  const [parentAuthenticated, setParentAuthenticated] = useState(false);
  const [childProfiles, setChildProfiles] = useState([]);
  const [appIsReady, setAppIsReady] = useState(false);
  const [isSessionChecking, setIsSessionChecking] = useState(true);

  // Store services in refs
  const assistantRef = useRef(null);
  const storageService = useRef(new StorageService());
  const authService = useRef(new AuthService());

  // UI state
  const [showParentAuth, setShowParentAuth] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  
  // Make sure we set the initial mounted state to true
  useEffect(() => {
    const timerId = setTimeout(() => {}, 0);
    console.log(`Clearing all timers below ID ${timerId}`);
    // Clear any lingering timers - this helps with unmount issues
    for (let i = 0; i < timerId; i++) {
      clearTimeout(i);
    }
    
    // Return cleanup function
    return () => {
      const timerId = setTimeout(() => {}, 0);
      for (let i = 0; i < timerId; i++) {
        clearTimeout(i);
      }
    };
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        Logger.info("App", "Checking for existing session");

        // Log localStorage content for debugging
        const sessionData = localStorage.getItem(`kids-ai.session`);
        console.log("Session in localStorage:", sessionData);
        
        // First, directly check localStorage for the most reliable session data
        try {
          if (sessionData) {
            const parsedSession = JSON.parse(sessionData);
            console.log("Found session in localStorage:", parsedSession);

            if (parsedSession && parsedSession.type) {
              console.log("Using session from localStorage, type:", parsedSession.type);
              
              // The key change: Only set parentAuthenticated if we're showing the profile selection screen
              // Do not set parentAuthenticated if going directly to parent dashboard
              if (parsedSession.type === "parent") {
                if (parsedSession.id === "parent" && parsedSession.name === "Parent") {
                  // This is a dashboard-specific parent session
                  console.log("This is a dashboard parent session, tab:", parsedSession.dashboardTab || 'profiles');
                  
                  // Make sure we have the dashboard tab persisted
                  const updatedSession = { ...parsedSession };
                  
                  // Ensure dashboard tab is set
                  if (!updatedSession.dashboardTab) {
                    updatedSession.dashboardTab = "profiles";
                  }
                  
                  // Add a timestamp if missing
                  if (!updatedSession.timestamp) {
                    updatedSession.timestamp = new Date().toISOString();
                  }
                  
                  // Save the updated session with all required fields
                  localStorage.setItem("kids-ai.session", JSON.stringify(updatedSession));
                  
                  // Update user state
                  setUser(updatedSession);
                  setParentAuthenticated(true);
                  loadChildProfiles();
                } else if (parsedSession.id === "selection") {
                  // This is a parent login but no specific user is set - profile selection
                  console.log("This is a profile selection parent session");
                  setParentAuthenticated(true);
                  setUser(null); // Important: Keep user null for profile selection
                  loadChildProfiles();
                } else {
                  // Unknown parent session type - default to profile selection
                  console.log("Unknown parent session type, defaulting to profile selection");
                  setParentAuthenticated(true);
                  setUser(null);
                  loadChildProfiles();
                }
              } else if (parsedSession.type === "child") {
                // Child login - straight to chat interface
                console.log("This is a child session");
                setUser(parsedSession);
              } else {
                // Unknown session type - clear it and show login
                console.log("Unknown session type, clearing session");
                localStorage.removeItem("kids-ai.session");
              }
              
              // Skip other session checking since we found a valid one
              setIsSessionChecking(false);
              return;
            }
          }
        } catch (parseError) {
          console.error("Error parsing raw session from localStorage:", parseError);
        }
        
        // If localStorage check failed, try the authentication service
        try {
          const session = await authService.current.getSession();
          console.log("Session returned by authService:", session);

          if (session) {
            Logger.info("App", "Found existing session", session);

            // If it's a parent session, we're authenticated
            if (session.type === "parent") {
              setParentAuthenticated(true);
              loadChildProfiles();
            }

            // Set the user in state
            setUser(session);
          }
        } catch (authError) {
          console.error("Error retrieving session from auth service:", authError);
        }

        setIsSessionChecking(false);
      } catch (error) {
        Logger.error("App", "Error checking existing session", error);
        setIsSessionChecking(false);
      }
    };

    checkExistingSession();
  }, []);

  // Handle URL parameters to ensure proper navigation
  useEffect(() => {
    if (isSessionChecking) return;
    
    // Check for URL parameters indicating dashboard access
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      const isAccessing = urlParams.get('accessing');
      
      // If URL indicates dashboard access but we're not showing dashboard, try to restore it
      if (tabParam && isAccessing === 'dashboard' && (!user || user.type !== 'parent' || user.id !== 'parent')) {
        console.log(`URL parameters indicate dashboard tab ${tabParam} but we're not showing dashboard`);
        
        // Only force dashboard if we're already parent authenticated
        if (parentAuthenticated) {
          console.log('Parent is authenticated, restoring dashboard view with tab:', tabParam);
          
          // Create parent dashboard user
          const dashboardUser = {
            type: 'parent',
            id: 'parent',
            name: 'Parent',
            dashboardTab: tabParam,
            timestamp: new Date().toISOString()
          };
          
          // Set user state to dashboard and update localStorage
          setUser(dashboardUser);
          localStorage.setItem('kids-ai.session', JSON.stringify(dashboardUser));
        }
      }
    } catch (error) {
      console.error('Error processing URL parameters:', error);
    }
  }, [isSessionChecking, user, parentAuthenticated]);

  // Initialize app
  useEffect(() => {
    if (isSessionChecking) {
      return; // Wait until session check is complete
    }

    Logger.info("App", "Application initializing");

    const initializeApp = async () => {
      try {
        // Initialize the real or mock assistant based on flag
        if (USE_REAL_API) {
          assistantRef.current = new ChatCompletionService();
          Logger.info("App", "Using real OpenAI API with Chat Completions");
        } else {
          assistantRef.current = new MockAssistantService();
          Logger.info("App", "Using mock AI service");
        }

        // App is ready
        setAppIsReady(true);
        Logger.info("App", "Application initialized successfully");
      } catch (error) {
        Logger.error("App", "Failed to initialize application", error);
        setAppIsReady(true); // Set app as ready even on error
      }
    };

    initializeApp();
  }, [isSessionChecking]);

  // Load child profiles
  const loadChildProfiles = async () => {
    try {
      const profiles = await storageService.current.getChildProfiles();
      Logger.debug("App", `Loaded ${profiles.length} profiles`, profiles);
      setChildProfiles(profiles);
    } catch (error) {
      Logger.error("App", "Failed to load profiles", error);
    }
  };

  // Handle parent login
  const handleParentLogin = () => {
    setShowParentAuth(true);
  };

  // Handle successful parent login
  const handleParentLoginSuccess = async (session) => {
    Logger.info("App", "Parent login successful");

    // Set parent authentication state
    setParentAuthenticated(true);
    setUser(null); // Important: Keep user null for profile selection screen
    
    // Create a session that indicates we're on the profile selection screen
    const profileSelectionSession = {
      type: "parent",
      id: "selection", // This ID indicates we're at the profile selection, not the dashboard
      timestamp: new Date().toISOString()
    };
    
    // Save this special session type to localStorage
    localStorage.setItem("kids-ai.session", JSON.stringify(profileSelectionSession));

    // Load child profiles
    await loadChildProfiles();

    // Hide login screen
    setShowParentAuth(false);
  };

  // Handle parent login cancel
  const handleParentLoginCancel = () => {
    setShowParentAuth(false);
  };

  // Handle child login
  const handleChildLogin = async (childId) => {
    Logger.info("App", `Login attempt for child ID: ${childId}`);

    const childProfile = childProfiles.find(
      (profile) => profile.id === childId
    );
    if (childProfile) {
      try {
        // Create the session first
        const sessionData = {
          type: "child",
          id: childId,
          name: childProfile.name,
          timestamp: new Date().toISOString()
        };
        
        // Store directly in localStorage for persistence
        localStorage.setItem("kids-ai.session", JSON.stringify(sessionData));
        
        // Try to login through the auth service (may be used for API authentication)
        try {
        await authService.current.loginChild(
          childId,
            childProfile.name
            );
          } catch (error) {
            Logger.error("App", "API login failed, using local only", error);
          }
        
        // Set the user with our consistent session data format
        setUser(sessionData);
        
        Logger.info("App", `Login successful for: ${childProfile.name}`);
      } catch (error) {
        Logger.error("App", `Login failed for child ID: ${childId}`, error);
      }
    } else {
      Logger.error(
        "App",
        `Login failed: Child profile not found for ID: ${childId}`
      );
    }
  };

  // Handle parent dashboard access
  const handleParentDashboardAccess = () => {
    setShowPinModal(true);
  };

  // Handle successful PIN verification
  const handlePinSuccess = async (pin) => {
    try {
      // Verify PIN
      const isValid = await storageService.current.verifyParentPin(pin);

      if (isValid) {
        // Set user as parent - this is a dashboard-specific parent user
        const parentUser = {
          type: "parent",
          id: "parent",
          name: "Parent",
          dashboardTab: "profiles", // Default tab
          timestamp: new Date().toISOString()
        };
        
        // Update both state and localStorage
        setUser(parentUser);
        localStorage.setItem("kids-ai.session", JSON.stringify(parentUser));
        
        setShowPinModal(false);
        return true;
      } else {
        // PIN is invalid
        return false;
      }
    } catch (err) {
      console.error("Error verifying PIN:", err);
      return false;
    }
  };

  // Handle logout from child chat interface
  const handleChildLogout = async () => {
    Logger.info(
      "App",
      `Logged out from child chat: ${user?.name || "unknown"}`
    );
    
    // Create a profile selection session instead of removing the session completely
    const profileSelectionSession = {
      type: "parent",
      id: "selection",
      timestamp: new Date().toISOString()
    };
    
    // Save the profile selection session
    localStorage.setItem("kids-ai.session", JSON.stringify(profileSelectionSession));
    
    // Reset the user but ensure parent authentication is maintained
    setUser(null);
    setParentAuthenticated(true);
    
    // Make sure we reload the child profiles for user selection screen
    await loadChildProfiles();
  };

  // Handle logout from parent dashboard
  const handleParentDashboardLogout = async () => {
    Logger.info("App", "Logged out from parent dashboard");
    console.log("handleParentDashboardLogout called");
    
    // First clear all sessionStorage items related to dashboard
    try {
      sessionStorage.removeItem('kids-ai.dashboard.activeTab');
      sessionStorage.removeItem('kids-ai.dashboard.selectedChildId');
      sessionStorage.removeItem('kids-ai.settings.pinState');
      sessionStorage.removeItem('kids-ai.settings.username');
    } catch (e) {
      console.error("Error clearing sessionStorage:", e);
    }
    
    // Preserve the dashboard state (tab selection, etc.) while creating a profile selection session
    try {
      // Create a profile selection session but preserve dashboard state
      const profileSelectionSession = {
        type: "parent",
        id: "selection",
        timestamp: new Date().toISOString()
      };
      
      // Save the profile selection session
      localStorage.setItem("kids-ai.session", JSON.stringify(profileSelectionSession));
      console.log("Saved profile selection session to localStorage:", profileSelectionSession);
    } catch (error) {
      console.error("Error setting profile selection session:", error);
    }
    
    // Reload child profiles before returning to selection screen
    try {
      await loadChildProfiles();
    } catch (e) {
      console.error("Error loading child profiles:", e);
    }
    
    // Reset the user state to null, but keep parent authenticated
    console.log("Setting user state to null");
    setUser(null);
  };

  // Handle complete logout - completely erases all session data
  const handleCompleteLogout = async () => {
    Logger.info("App", "Complete logout");
    
    try {
      // Clear all local storage session data - do this first to ensure UI state is reset
      localStorage.removeItem("kids-ai.session");
      
      // Clear any other related items that might cause persistence
      try {
        localStorage.removeItem(`kids-ai.remember_me`);
        localStorage.removeItem(`kids-ai.parent_credentials`);
        localStorage.removeItem(`kids-ai.sessionId`);
      } catch (error) {
        console.error("Error clearing secondary localStorage items:", error);
      }
      
      // Logout using auth service - true flag ensures we clear remember me data
      try {
        await authService.current.logout(true);
      } catch (error) {
        console.error("Error in auth service logout:", error);
      }
      
      // Reset all authentication state
      setUser(null);
      setParentAuthenticated(false);
      
      console.log("Complete logout successful");
    } catch (error) {
      console.error("Error during complete logout:", error);
      
      // Even if there's an error, still clear the UI state
      setUser(null);
      setParentAuthenticated(false);
      localStorage.removeItem("kids-ai.session");
    }
  };

  // Loading screen
  if (!appIsReady || isSessionChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="loader"></div>
      </div>
    );
  }

  // Parent login screen
  if (showParentAuth) {
    return (
      <ParentLogin
        onLoginSuccess={handleParentLoginSuccess}
        onCancel={handleParentLoginCancel}
      />
    );
  }

  // Determine what to show
  let content;

  if (user) {
    // User is logged in
    if (user.type === "child") {
      // Child is logged in - show chat interface
      content = (
        <ChatInterface
          childId={user.id}
          childName={user.name}
          onLogout={handleChildLogout}
          assistantRef={assistantRef.current}
          useMockApi={!USE_REAL_API}
        />
      );
    } else if (user.type === "parent") {
      // Parent dashboard is active
      content = <ParentDashboard onLogout={handleParentDashboardLogout} />;
    }
  } else if (parentAuthenticated) {
    // Parent is authenticated but no user is set - show profile selection
    content = (
      <LoginScreen
        childProfiles={childProfiles}
        onChildLogin={handleChildLogin}
        onParentLogin={handleParentDashboardAccess}
        onCompleteLogout={handleCompleteLogout}
        reloadProfiles={loadChildProfiles}
        showCompleteLogout={true}
      />
    );
  } else {
    // No authentication - show initial parent login button
    content = (
      <div className="min-h-screen flex items-center justify-center relative">
        {/* Background Image with wave effect */}
        <div className="fixed inset-0 z-0 w-full h-full overflow-hidden">
          <SvgWaveBackground
            imageUrl="/background-images/Login.svg"
            className="w-full h-full"
          />
        </div>

        <Card className="w-full max-w-sm mx-4 shadow-large p-8 relative z-10 bg-background/80 backdrop-blur-sm">
          <CardHeader className="p-0 mb-2">
            <h1 className="text-4xl font-bold text-center text-primary">
              Kids AI
            </h1>
          </CardHeader>
          <CardContent className="space-y-4 text-center p-0 pb-1">
            <p className="text-muted-foreground">
              A child-friendly AI assistant
            </p>
            <button
              onClick={handleParentLogin}
              className="px-6 py-3 bg-accent text-accent-foreground rounded-lg font-semibold hover:bg-accent/90 transition-all duration-200 ease-in-out w-full relative top-0 hover:top-0.5 hover:translate-y-0.5"
            >
              Parent Login
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {content}

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
