import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { User, MessageSquare, Settings, LogOut } from 'lucide-react';

import ProfileManager from './ProfileManager';
import ConversationViewer from './ConversationViewer';
import AccountSettings from './AccountSettings';
import { StorageService } from '../../services/StorageService';

// Import tailwind styles
import '../../globals.css';

const storageService = new StorageService();

const ParentDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('profiles');
  const [childProfiles, setChildProfiles] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [error, setError] = useState(null);

  // Load child profiles on component mount
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const profiles = await storageService.getChildProfiles();
        setChildProfiles(profiles);
        
        // Select the first child by default if available
        if (profiles.length > 0 && !selectedChildId) {
          setSelectedChildId(profiles[0].id);
        }
      } catch (err) {
        console.error('Error loading profiles:', err);
        setError('Failed to load child profiles');
      }
    };

    loadProfiles();
  }, [selectedChildId]);

  // Update child profiles after changes
  const refreshChildProfiles = async () => {
    try {
      const profiles = await storageService.getChildProfiles();
      setChildProfiles(profiles);
    } catch (err) {
      console.error('Error refreshing profiles:', err);
    }
  };

  // Handle child profile changes
  const handleProfileChange = async (action, profileData) => {
    try {
      setError(null);
      
      switch (action) {
        case 'create':
        case 'update':
          await storageService.saveChildProfile(profileData);
          break;
        case 'delete':
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
      {/* Header - Modified to remove default margins from h1 */}
      <header className="border-b bg-white">
        <div className="flex h-16 items-center justify-between px-6">
          <h1 className="text-xl font-semibold m-0 flex items-center">Kids AI - Parent Dashboard</h1>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
            Exit Dashboard
          </Button>
        </div>
      </header>

      <div className="container mx-auto py-6 w-full max-w-full px-6">
        {error && (
          <div className="mb-6 bg-red-50 p-4 rounded-lg border border-red-200 text-red-800">
            {error}
          </div>
        )}

        <Tabs defaultValue="profiles" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b mb-6">
            <TabsList className="bg-transparent h-12 w-full justify-start gap-2 px-0">
              <TabsTrigger value="profiles" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <User className="h-4 w-4" />
                Child Profiles
              </TabsTrigger>
              <TabsTrigger 
                value="conversations" 
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                disabled={!selectedChildId}
              >
                <MessageSquare className="h-4 w-4" />
                Conversation History
              </TabsTrigger>
              <TabsTrigger value="account" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Settings className="h-4 w-4" />
                Account Settings
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Child Profiles */}
          <TabsContent value="profiles" className="w-full">
            <Card className="p-6">
              <ProfileManager 
                profiles={childProfiles} 
                selectedChildId={selectedChildId}
                onProfileChange={handleProfileChange} 
                onSelectChild={handleChildSelect}
              />
            </Card>
          </TabsContent>

          {/* Conversation History */}
          <TabsContent value="conversations" className="w-full">
            <Card className="p-6">
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
                      {childProfiles.map(profile => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {selectedChildId && (
                <ConversationViewer 
                  childId={selectedChildId} 
                  childName={childProfiles.find(p => p.id === selectedChildId)?.name || 'Child'}
                />
              )}
            </Card>
          </TabsContent>

          {/* PIN Settings (now part of Account Settings) */}
          {/* Account Settings */}
          <TabsContent value="account" className="w-full">
            <Card className="p-6">
              <AccountSettings />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ParentDashboard;
