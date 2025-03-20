import React, { useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import { User, MessageSquare, Settings, LogOut, Search, X, AlertCircle } from "lucide-react";

import ProfileManager from "./ProfileManager";
import ConversationViewer from "./ConversationViewer";
import AccountSettings from "./AccountSettings";
import { StorageService } from "../../services/StorageService";

// Import tailwind styles
import "../../globals.css";

const storageService = new StorageService();

const ParentDashboard = ({ onLogout }) => {
  // Initialize state from session if available, with direct URL parameter handling
  const initializeActiveTab = () => {
    // Check for URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['profiles', 'conversations', 'account'].includes(tabParam)) {
      console.log("Setting tab from URL parameter:", tabParam);
      return tabParam;
    }
    
    // Check sessionStorage second (most reliable for browser refreshes)
    try {
      const sessionTab = sessionStorage.getItem('kids-ai.dashboard.activeTab');
      if (sessionTab && ['profiles', 'conversations', 'account'].includes(sessionTab)) {
        console.log("Restoring dashboard tab from sessionStorage:", sessionTab);
        return sessionTab;
      }
    } catch (error) {
      console.error("Error retrieving dashboard tab from sessionStorage:", error);
    }
    
    // Then check stored session
    try {
      const sessionData = localStorage.getItem("kids-ai.session");
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session && session.dashboardTab) {
          console.log("Restoring dashboard tab from session:", session.dashboardTab);
          return session.dashboardTab;
        }
      }
    } catch (error) {
      console.error("Error retrieving dashboard tab from session:", error);
    }
    return "profiles"; // Default tab
  };

  const [activeTab, setActiveTab] = useState(initializeActiveTab);
  const [childProfiles, setChildProfiles] = useState([]);
  
  // Initialize selected child ID from session if available
  const initializeSelectedChildId = () => {
    // Check sessionStorage first (most reliable for browser refreshes)
    try {
      const sessionChildId = sessionStorage.getItem('kids-ai.dashboard.selectedChildId');
      if (sessionChildId) {
        console.log("Restoring selected child ID from sessionStorage:", sessionChildId);
        return sessionChildId;
      }
    } catch (error) {
      console.error("Error retrieving selected child ID from sessionStorage:", error);
    }
    
    // Then check localStorage session
    try {
      const sessionData = localStorage.getItem("kids-ai.session");
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session && session.selectedChildId) {
          console.log("Restoring selected child ID from session:", session.selectedChildId);
          return session.selectedChildId;
        }
      }
    } catch (error) {
      console.error("Error retrieving selected child ID from session:", error);
    }
    return null; // Default value
  };

  const [selectedChildId, setSelectedChildId] = useState(initializeSelectedChildId);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
  
  // Centralized state synchronization function
  const synchronizeSessionState = useCallback((forceSync = false) => {
    try {
      const sessionData = localStorage.getItem("kids-ai.session");
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session && session.type === "parent" && session.id === "parent") {
          // Create updated session with current state
          const updatedSession = {
            ...session,
            dashboardTab: activeTab,
            selectedChildId: selectedChildId || session.selectedChildId,
            timestamp: new Date().toISOString()
          };
          
          // Update localStorage
          localStorage.setItem("kids-ai.session", JSON.stringify(updatedSession));
          console.log("Session synchronized with current state:", updatedSession);
        }
      }
    } catch (e) {
      console.error("Error synchronizing session:", e);
    }
  }, [activeTab, selectedChildId]);
  
  // Ensure session data stays synchronized with component state
  useEffect(() => {
    // Only run this if we have real values to save
    if (activeTab) {
      console.log("Synchronizing session data with activeTab:", activeTab);
      
      // Run the synchronization
      synchronizeSessionState();
      
      // Use sessionStorage for more reliable tab state persistence
      sessionStorage.setItem('kids-ai.dashboard.activeTab', activeTab);
      if (selectedChildId) {
        sessionStorage.setItem('kids-ai.dashboard.selectedChildId', selectedChildId);
      }
      
      // Update URL with tab parameter
      const url = new URL(window.location);
      url.searchParams.set('tab', activeTab);
      url.searchParams.set('accessing', 'dashboard');
      window.history.replaceState({}, '', url);
      
      // Also update session before page unload
      const handleBeforeUnload = () => {
        synchronizeSessionState(true);
        sessionStorage.setItem('kids-ai.dashboard.activeTab', activeTab);
        if (selectedChildId) {
          sessionStorage.setItem('kids-ai.dashboard.selectedChildId', selectedChildId);
        }
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [activeTab, selectedChildId, synchronizeSessionState]);
  
  // Additional effect to refresh session data periodically
  useEffect(() => {
    // Regularly sync session to prevent losing state on refresh
    const intervalId = setInterval(() => {
      synchronizeSessionState(true);
    }, 10000); // Every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [synchronizeSessionState]);

  // Load child profiles on component mount
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const profiles = await storageService.getChildProfiles();
        setChildProfiles(profiles);

        // No automatic selection of the first profile on initial load
      } catch (err) {
        console.error("Error loading profiles:", err);
        setError("Failed to load child profiles");
      }
    };

    loadProfiles();
  }, []);
  
  // Component is unmounting - clean up
  useEffect(() => {
    return () => {
      console.log('ParentDashboard component unmounting');
      // Clear all intervals and timeouts
      const timerId = setTimeout(() => {}, 0);
      for (let i = 0; i < timerId; i++) {
        clearTimeout(i);
        clearInterval(i);
      }
      
      // Clear session storage to be safe
      sessionStorage.removeItem('kids-ai.dashboard.activeTab');
      sessionStorage.removeItem('kids-ai.dashboard.selectedChildId');
    };
  }, []);

  // Update child profiles after changes
  const refreshChildProfiles = async () => {
    try {
      const profiles = await storageService.getChildProfiles();
      setChildProfiles(profiles);
    } catch (err) {
      console.error("Error refreshing profiles:", err);
    }
  };

  // Handle tab selection
  const handleTabSelect = useCallback((tab) => {
    console.log(`Switching to tab: ${tab}`);
    setActiveTab(tab);
    
    // Auto-select first profile for conversation history tab if none selected
    if (
      tab === "conversations" &&
      !selectedChildId &&
      childProfiles.length > 0
    ) {
      const firstChildId = childProfiles[0].id;
      setSelectedChildId(firstChildId);
    }
    
    // Immediately synchronize tab selection
    setTimeout(() => {
      // Update URL with tab parameter
      const url = new URL(window.location);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url);
      
      // The synchronizeSessionState effect will handle saving to localStorage
      synchronizeSessionState(true);
    }, 0);
  }, [childProfiles, selectedChildId, synchronizeSessionState]);

  // Handle child profile changes
  const handleProfileChange = async (action, profileData) => {
    try {
      setError(null);

      switch (action) {
        case "create":
        case "update":
          await storageService.saveChildProfile(profileData);
          break;
        case "delete":
          await storageService.deleteChildProfile(profileData.id);
          if (selectedChildId === profileData.id) {
            const profiles = await storageService.getChildProfiles();
            setSelectedChildId(profiles.length > 0 ? profiles[0].id : null);
          }
          break;
        default:
          console.warn(`Unknown action: ${action}`);
      }

      await refreshChildProfiles();
    } catch (err) {
      console.error(`Error during profile ${action}:`, err);
      setError(`Failed to ${action} profile`);
    }
  };

  // Handle child selection
  const handleChildSelect = useCallback((childId) => {
    setSelectedChildId(childId);
    // State synchronization handled by the useEffect
  }, []);

  // Handle child selection for conversation history
  const handleChildSelectForConversation = useCallback((value) => {
    setSelectedChildId(value);
    // State synchronization handled by the useEffect
  }, []);

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
      <header className="border-b bg-[#0E1116] text-foreground sticky top-0 z-50">
        <div className="flex h-16 items-center justify-between px-6">
          <h1 className="text-xl font-semibold m-0 flex items-center">
            Parent Dashboard
          </h1>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              console.log('Dashboard logout button clicked');
              // Force logout by clearing all relevant state and storage
              try {
                // Clear all sessionStorage
                sessionStorage.clear();
                
                // Set selection session in localStorage
                const profileSelectionSession = {
                  type: "parent",
                  id: "selection",
                  timestamp: new Date().toISOString()
                };
                localStorage.setItem("kids-ai.session", JSON.stringify(profileSelectionSession));
                
                // Force a page navigation to root with reload
                window.location.href = window.location.origin;
              } catch (error) {
                console.error('Error during forced logout:', error);
                // As a last resort, try the normal logout handler
                onLogout();
              }
            }}
          >
            <LogOut className="h-4 w-4" />
            Exit Dashboard
          </Button>
        </div>
      </header>

      <div className="container mx-auto pb-0 w-full max-w-5xl px-6 sm:px-8 md:px-10">
        {error && (
          <div className="flex items-start gap-2 p-4 my-4 bg-destructive/20 dark:bg-destructive/30 text-destructive dark:text-white/90 rounded-md border-2 border-destructive shadow-md">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Responsive Tab Navigation - Now Sticky */}
        <div className="sticky top-16 z-40 bg-background py-4 mb-4">
          <div className="container mx-auto w-full max-w-5xl px-0 sm:px-8 md:px-10">
            {/* Mobile dropdown for small screens */}
            <div className="block sm:hidden">
              <Select value={activeTab} onValueChange={handleTabSelect}>
                <SelectTrigger className="w-full bg-grey-10 text-foreground text-base">
                  <SelectValue>
                    {activeTab === "profiles" && (
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        <span>Child Profiles</span>
                      </div>
                    )}
                    {activeTab === "conversations" && (
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        <span>Conversation History</span>
                      </div>
                    )}
                    {activeTab === "account" && (
                      <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        <span>Account Settings</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profiles">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      <span className="text-base">Child Profiles</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="conversations">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      <span className="text-base">Conversation History</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="account">
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      <span className="text-base">Account Settings</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Button tabs for larger screens */}
            <div className="hidden sm:block overflow-x-auto">
              <div className="inline-flex p-0 bg-grey-10 rounded-lg w-full justify-center gap-[10px]">
                <Button
                  variant={activeTab === "profiles" ? "default" : "outline"}
                  size="default"
                  className="gap-2 rounded-md text-base font-medium px-5 py-2.5 h-auto"
                  onClick={() => handleTabSelect("profiles")}
                >
                  <User className="h-5 w-5" />
                  Child Profiles
                </Button>

                <Button
                  variant={
                    activeTab === "conversations" ? "default" : "outline"
                  }
                  size="default"
                  className="gap-2 rounded-md text-base font-medium px-5 py-2.5 h-auto"
                  onClick={() => handleTabSelect("conversations")}
                >
                  <MessageSquare className="h-5 w-5" />
                  Conversation History
                </Button>

                <Button
                  variant={activeTab === "account" ? "default" : "outline"}
                  size="default"
                  className="gap-2 rounded-md text-base font-medium px-5 py-2.5 h-auto"
                  onClick={() => handleTabSelect("account")}
                >
                  <Settings className="h-5 w-5" />
                  Account Settings
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="w-full">
          {/* Child Profiles */}
          {activeTab === "profiles" && (
            <ProfileManager
              profiles={childProfiles}
              selectedChildId={selectedChildId}
              onProfileChange={handleProfileChange}
              onSelectChild={handleChildSelect}
            />
          )}

          {/* Conversation History */}
          {activeTab === "conversations" && (
            <>
              {childProfiles.length > 0 && (
                <div className="space-y-4 mb-4">
                  <h2 className="text-2xl font-bold">Conversation History</h2>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                    <div className="w-full sm:w-auto">
                      <Select
                        value={selectedChildId}
                        onValueChange={handleChildSelectForConversation}
                      >
                        <SelectTrigger className="w-full min-w-[200px] py-3 h-auto">
                          <SelectValue placeholder="Select a child">
                            {selectedChildId && (
                              <span>
                                Select child:{" "}
                                {childProfiles.find(
                                  (p) => p.id === selectedChildId
                                )?.name || ""}
                              </span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {childProfiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Search bar component moved here from ConversationViewer */}
                    {selectedChildId && (
                      <div className="relative w-full sm:w-auto sm:flex-grow sm:max-w-md">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="search"
                          placeholder="Search conversations..."
                          className="w-full bg-background py-3 h-auto pl-8 pr-8 rounded-md border border-input shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-base max-w-full"
                          value={selectedChildId ? searchQuery : ""}
                          onChange={(e) => {
                            if (selectedChildId) {
                              setSearchQuery(e.target.value);
                            }
                          }}
                          disabled={!selectedChildId}
                        />
                        {searchQuery && (
                          <button
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                            onClick={() => setSearchQuery("")}
                            aria-label="Clear search"
                            disabled={!selectedChildId}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedChildId ? (
                <ConversationViewer
                  childId={selectedChildId}
                  childName={
                    childProfiles.find((p) => p.id === selectedChildId)?.name ||
                    "Child"
                  }
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              ) : (
                <div className="bg-muted rounded-lg p-6 text-center">
                  <p className="text-muted-foreground">
                    Please select a child profile to view conversation history.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Account Settings */}
          {activeTab === "account" && <AccountSettings />}
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
