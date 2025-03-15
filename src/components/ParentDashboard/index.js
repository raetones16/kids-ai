import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import { User, MessageSquare, Settings, LogOut } from "lucide-react";

import ProfileManager from "./ProfileManager";
import ConversationViewer from "./ConversationViewer";
import AccountSettings from "./AccountSettings";
import { StorageService } from "../../services/StorageService";

// Import tailwind styles
import "../../globals.css";

const storageService = new StorageService();

const ParentDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState("profiles");
  const [childProfiles, setChildProfiles] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [error, setError] = useState(null);

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
  const handleTabSelect = (tab) => {
    setActiveTab(tab);
    
    // Auto-select first profile for conversation history tab if none selected
    if (tab === "conversations" && !selectedChildId && childProfiles.length > 0) {
      setSelectedChildId(childProfiles[0].id);
    }
  };

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
  const handleChildSelect = (childId) => {
    setSelectedChildId(childId);
  };

  // Handle child selection for conversation history
  const handleChildSelectForConversation = (value) => {
    setSelectedChildId(value);
  };

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
      <header className="border-b bg-[#0E1116] text-foreground">
        <div className="flex h-16 items-center justify-between px-6">
          <h1 className="text-xl font-semibold m-0 flex items-center">
            Kids AI - Parent Dashboard
          </h1>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
            Exit Dashboard
          </Button>
        </div>
      </header>

      <div className="container mx-auto py-6 w-full max-w-5xl px-6 sm:px-8 md:px-10">
        {error && (
          <div className="mb-6 bg-destructive/10 p-4 rounded-lg border border-destructive/20 text-destructive">
            {error}
          </div>
        )}

        {/* Simple Button Group Slider for Tabs */}
        <div className="mb-6 overflow-x-auto">
          <div className="inline-flex p-0 bg-grey-10 rounded-lg w-full justify-center gap-[8px]">
            <Button
              variant={activeTab === "profiles" ? "default" : "outline"}
              size="sm"
              className="gap-2 rounded-md"
              onClick={() => handleTabSelect("profiles")}
            >
              <User className="h-4 w-4" />
              Child Profiles
            </Button>

            <Button
              variant={activeTab === "conversations" ? "default" : "outline"}
              size="sm"
              className="gap-2 rounded-md"
              onClick={() => handleTabSelect("conversations")}
            >
              <MessageSquare className="h-4 w-4" />
              Conversation History
            </Button>

            <Button
              variant={activeTab === "account" ? "default" : "outline"}
              size="sm"
              className="gap-2 rounded-md"
              onClick={() => handleTabSelect("account")}
            >
              <Settings className="h-4 w-4" />
              Account Settings
            </Button>
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
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-2">Select Child</h2>
                  <Select
                    value={selectedChildId}
                    onValueChange={handleChildSelectForConversation}
                  >
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="Select a child" />
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
              )}

              {selectedChildId ? (
                <ConversationViewer
                  childId={selectedChildId}
                  childName={
                    childProfiles.find((p) => p.id === selectedChildId)?.name ||
                    "Child"
                  }
                />
              ) : (
                <div className="bg-muted rounded-lg p-6 text-center">
                  <p className="text-muted-foreground">Please select a child profile to view conversation history.</p>
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
