import React, { useState, useEffect, useRef } from "react";
import "./App.css";
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

// Get API key from environment variable
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

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

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        Logger.info("App", "Checking for existing session");

        // Force backend availability check
        await storageService.current.checkBackendAvailability();

        // Debug: Log localStorage content
        console.log(
          "Session in localStorage:",
          localStorage.getItem(`kids-ai.session`)
        );

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
        } else {
          console.log(
            "No session found, checking if there is a raw session in localStorage"
          );
          // Backup check: try to directly parse from localStorage
          try {
            const rawSession = localStorage.getItem(`kids-ai.session`);
            if (rawSession) {
              const parsedSession = JSON.parse(rawSession);
              console.log("Found raw session in localStorage:", parsedSession);

              if (parsedSession && parsedSession.type) {
                console.log("Using raw session from localStorage");
                setUser(parsedSession);

                if (parsedSession.type === "parent") {
                  setParentAuthenticated(true);
                  loadChildProfiles();
                }
              }
            }
          } catch (parseError) {
            console.error("Error parsing raw session:", parseError);
          }
        }

        setIsSessionChecking(false);
      } catch (error) {
        Logger.error("App", "Error checking existing session", error);
        setIsSessionChecking(false);
      }
    };

    checkExistingSession();
  }, []);

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
          assistantRef.current = new ChatCompletionService(OPENAI_API_KEY);
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
        const session = await authService.current.loginChild(
          childId,
          childProfile.name
        );
        setUser(session);
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
        // Set user as parent
        const parentUser = {
          type: "parent",
          id: "parent",
          name: "Parent",
        };
        setUser(parentUser);
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
    // Just reset the user without clearing parent authentication
    setUser(null);
    // Make sure we reload the child profiles for user selection screen
    if (parentAuthenticated) {
      await loadChildProfiles();
    }
  };

  // Handle logout from parent dashboard
  const handleParentDashboardLogout = async () => {
    Logger.info("App", "Logged out from parent dashboard");
    // Reload child profiles before returning to selection screen
    await loadChildProfiles();
    // Reset the user, but keep parent authentication
    setUser(null);
  };

  // Handle complete logout
  const handleCompleteLogout = async () => {
    Logger.info("App", "Complete logout");
    // Logout using auth service - true flag ensures we clear remember me data
    await authService.current.logout(true);
    // Reset all authentication state
    setUser(null);
    setParentAuthenticated(false);
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
