import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';

const ProfileManager = ({ profiles, selectedChildId, onProfileChange, onSelectChild }) => {
  const [editMode, setEditMode] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Handle profile selection
  const handleSelectProfile = (profileId) => {
    if (onSelectChild) {
      onSelectChild(profileId);
    }
  };
  
  // Initialize new profile form
  const handleAddProfile = () => {
    setCurrentProfile({
      id: uuidv4(),
      name: '',
      dob: '',
      customInstructions: ''
    });
    setEditMode(true);
    setShowConfirmDelete(false);
  };
  
  // Initialize edit profile form
  const handleEditProfile = (profile, e) => {
    e.stopPropagation();
    setCurrentProfile({ ...profile });
    setEditMode(true);
    setShowConfirmDelete(false);
  };
  
  // Handle profile save (create/update)
  const handleSaveProfile = (e) => {
    e.preventDefault();
    
    if (!currentProfile.name || !currentProfile.dob) return;
    
    // Check if this is a new or existing profile
    const isNew = !profiles.some(p => p.id === currentProfile.id);
    onProfileChange(isNew ? 'create' : 'update', currentProfile);
    
    // Select the profile if it's new
    if (isNew) {
      onSelectChild(currentProfile.id);
    }
    
    // Exit edit mode
    setEditMode(false);
    setCurrentProfile(null);
  };
  
  // Handle profile deletion
  const handleDeleteProfile = () => {
    if (currentProfile) {
      onProfileChange('delete', currentProfile);
      setShowConfirmDelete(false);
      setEditMode(false);
      setCurrentProfile(null);
    }
  };
  
  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditMode(false);
    setCurrentProfile(null);
    setShowConfirmDelete(false);
  };
  
  // Generate a profile color based on name
  const getProfileColor = (name) => {
    const colors = [
      'bg-blue-500',   // Blue
      'bg-green-500',  // Green
      'bg-red-500',    // Red
      'bg-yellow-500', // Yellow
      'bg-purple-500', // Purple
    ];
    
    // Use the first character's code to pick a color
    const charCode = name.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Child Profiles</h2>
        {!editMode && profiles.length < 5 && (
          <Button onClick={handleAddProfile} className="gap-2">
            <PlusCircle className="h-4 w-4" /> Add Profile
          </Button>
        )}
      </div>
      
      {/* Profile List */}
      {!editMode ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.length === 0 ? (
            <div className="col-span-full bg-muted rounded-lg p-6 text-center">
              <p className="text-muted-foreground mb-4">No child profiles yet. Create your first profile to get started.</p>
              <Button onClick={handleAddProfile} className="gap-2">
                <PlusCircle className="h-4 w-4" /> Create Profile
              </Button>
            </div>
          ) : (
            profiles.map(profile => (
              <Card
                key={profile.id}
                className={`cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${
                  selectedChildId === profile.id ? 'border-primary border-2' : ''
                }`}
                onClick={() => handleSelectProfile(profile.id)}
              >
                <div className="relative">
                  <div className="absolute top-2 right-2 z-10">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => handleEditProfile(profile, e)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full text-white font-bold ${getProfileColor(profile.name)}`}>
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-xl">{profile.name}</h3>
                      <p className="text-muted-foreground text-sm">
                        {new Date(profile.dob).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                  {profile.customInstructions && (
                    <p className="mt-3 text-sm line-clamp-2 text-muted-foreground">
                      {profile.customInstructions}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="bg-muted rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">
            {currentProfile.id && profiles.some(p => p.id === currentProfile.id) 
              ? 'Edit Profile' 
              : 'Create Profile'}
          </h3>
            
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={currentProfile.name}
                onChange={(e) => setCurrentProfile({...currentProfile, name: e.target.value})}
                placeholder="Child's name"
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={currentProfile.dob}
                onChange={(e) => setCurrentProfile({...currentProfile, dob: e.target.value})}
                max={new Date().toISOString().split('T')[0]} // Can't select future dates
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="instructions">Custom Instructions (Optional)</Label>
              <Textarea
                id="instructions"
                value={currentProfile.customInstructions || ''}
                onChange={(e) => setCurrentProfile({...currentProfile, customInstructions: e.target.value})}
                placeholder="Add any special instructions or information about this child to help the AI provide better responses"
                rows="4"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">Example: "Emma loves science and space. She might sometimes ask about these topics."</p>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-between mt-6">
              {!showConfirmDelete ? (
                <>
                  <div className="space-x-2">
                    <Button type="submit">Save Profile</Button>
                    <Button type="button" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                  </div>
                  
                  {currentProfile.id && profiles.some(p => p.id === currentProfile.id) && (
                    <Button 
                      type="button" 
                      variant="destructive"
                      onClick={() => setShowConfirmDelete(true)}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" /> Delete Profile
                    </Button>
                  )}
                </>
              ) : (
                <div className="w-full bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-red-800 mb-4">Are you sure you want to delete this profile? This will remove all conversation history.</p>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="destructive"
                      onClick={handleDeleteProfile}
                    >
                      Yes, Delete Profile
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setShowConfirmDelete(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProfileManager;
