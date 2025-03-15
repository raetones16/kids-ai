import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";

// Define a fixed set of colors for profiles
const PROFILE_COLORS = [
  "bg-blue-500 hover:bg-blue-600", // Blue
  "bg-green-500 hover:bg-green-600", // Green
  "bg-red-500 hover:bg-red-600", // Red
  "bg-yellow-500 hover:bg-yellow-600", // Yellow
  "bg-purple-500 hover:bg-purple-600", // Purple
  "bg-pink-500 hover:bg-pink-600", // Pink
  "bg-indigo-500 hover:bg-indigo-600", // Indigo
  "bg-orange-500 hover:bg-orange-600", // Orange
  "bg-teal-500 hover:bg-teal-600", // Teal
  "bg-cyan-500 hover:bg-cyan-600", // Cyan
];

const ProfileManager = ({
  profiles,
  selectedChildId,
  onProfileChange,
  onSelectChild,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(null);

  // Initialize new profile form
  const handleAddProfile = () => {
    // Assign a random color if creating a new profile
    const existingColors = profiles.map((p) => p.color || "");

    // Find colors that aren't already used
    const availableColors = PROFILE_COLORS.filter(
      (color) => !existingColors.includes(color)
    );

    // If all colors are used, just pick a random one from the full set
    const colorPool =
      availableColors.length > 0 ? availableColors : PROFILE_COLORS;
    const randomColor = colorPool[Math.floor(Math.random() * colorPool.length)];

    setCurrentProfile({
      id: uuidv4(),
      name: "",
      dob: "",
      customInstructions: "",
      color: randomColor,
    });
    setEditMode(true);
    setShowConfirmDelete(false);
  };

  // Initialize edit profile form - Can be triggered by clicking the card or the edit button
  const handleEditProfile = (profile, e) => {
    if (e) e.stopPropagation(); // Prevent propagation only if event is provided (from edit button)

    // Ensure the profile has a color, assign one if missing
    const profileWithColor = {
      ...profile,
      color: profile.color || PROFILE_COLORS[0],
    };
    setCurrentProfile(profileWithColor);
    setEditMode(true);
    setShowConfirmDelete(false);
  };

  // Handle profile save (create/update)
  const handleSaveProfile = (e) => {
    e.preventDefault();

    if (!currentProfile.name || !currentProfile.dob) return;

    // Ensure profile has a color before saving
    const profileToSave = {
      ...currentProfile,
      color: currentProfile.color || PROFILE_COLORS[0],
    };

    // Check if this is a new or existing profile
    const isNew = !profiles.some((p) => p.id === profileToSave.id);
    onProfileChange(isNew ? "create" : "update", profileToSave);

    // Select the profile if it's new
    if (isNew) {
      onSelectChild(profileToSave.id);
    }

    // Exit edit mode
    setEditMode(false);
    setCurrentProfile(null);
  };

  // Handle profile deletion
  const handleDeleteProfile = () => {
    if (currentProfile) {
      onProfileChange("delete", currentProfile);
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

  // Get profile color, with fallback
  const getProfileColor = (profile) => {
    return profile.color || PROFILE_COLORS[0];
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
              <p className="text-muted-foreground mb-4">
                No child profiles yet. Create your first profile to get started.
              </p>
              <Button onClick={handleAddProfile} className="gap-2">
                <PlusCircle className="h-4 w-4" /> Create Profile
              </Button>
            </div>
          ) : (
            profiles.map((profile) => (
              <Card
                key={profile.id}
                className={`cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${
                  selectedChildId === profile.id
                    ? "border-primary border-2"
                    : ""
                }`}
                onClick={() => handleEditProfile(profile)} // Changed to call handleEditProfile directly
              >
                <div className="relative">
                  <div className="absolute top-2 right-2 z-10">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 rounded-full bg-background shadow-sm border p-0 flex items-center justify-center"
                      onClick={(e) => handleEditProfile(profile, e)}
                      aria-label="Edit profile"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex items-center justify-center w-12 h-12 rounded-full text-white font-bold ${getProfileColor(
                        profile
                      )}`}
                    >
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-xl">{profile.name}</h3>
                      <p className="text-muted-foreground text-sm">
                        {new Date(profile.dob).toLocaleDateString("en-GB")}
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
        <div className="bg-grey-20 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">
            {currentProfile.id &&
            profiles.some((p) => p.id === currentProfile.id)
              ? "Edit Profile"
              : "Create Profile"}
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={currentProfile.name}
                onChange={(e) =>
                  setCurrentProfile({ ...currentProfile, name: e.target.value })
                }
                placeholder="Child's name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={currentProfile.dob}
                onChange={(e) =>
                  setCurrentProfile({ ...currentProfile, dob: e.target.value })
                }
                max={new Date().toISOString().split("T")[0]} // Can't select future dates
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Profile Color</Label>
              <div className="flex flex-wrap gap-2">
                {PROFILE_COLORS.map((color, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`w-8 h-8 rounded-full ${color} transition-all ${
                      currentProfile.color === color
                        ? "ring-2 ring-offset-2 ring-primary"
                        : "opacity-70 hover:opacity-100"
                    }`}
                    onClick={() =>
                      setCurrentProfile({ ...currentProfile, color })
                    }
                    aria-label={`Select color ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">
                Custom Instructions (Optional)
              </Label>
              <Textarea
                id="instructions"
                value={currentProfile.customInstructions || ""}
                onChange={(e) =>
                  setCurrentProfile({
                    ...currentProfile,
                    customInstructions: e.target.value,
                  })
                }
                placeholder="Add any special instructions or information about this child to help the AI provide better responses"
                rows="4"
              />
              <p className="text-xs text-muted-foreground">
                Example: "Emma loves science and space. She might sometimes ask
                about these topics."
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-between mt-6">
              {!showConfirmDelete ? (
                <>
                  <div className="space-x-2">
                    <Button type="submit">Save Profile</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                  </div>

                  {currentProfile.id &&
                    profiles.some((p) => p.id === currentProfile.id) && (
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
                <div className="w-full bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                  <p className="text-destructive mb-4">
                    Are you sure you want to delete this profile? This will
                    remove all conversation history.
                  </p>
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
