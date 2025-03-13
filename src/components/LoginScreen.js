import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { User, LogOut } from 'lucide-react';

// Default colors if no color is stored with the profile
const DEFAULT_COLORS = [
  'bg-blue-500', // Blue
  'bg-green-500', // Green
  'bg-red-500', // Red
  'bg-yellow-500', // Yellow
  'bg-purple-500', // Purple
];

const LoginScreen = ({ 
  childProfiles, 
  onChildLogin, 
  onParentLogin, 
  onCompleteLogout, 
  reloadProfiles,
  showCompleteLogout = false
}) => {
  // Get profile color, with fallback to a consistent color based on name
  const getProfileColor = (profile) => {
    // If profile has a stored color preference, use it
    if (profile.color) {
      return profile.color;
    }
    
    // Otherwise fall back to a color based on name
    const charCode = profile.name.charCodeAt(0) || 0;
    return DEFAULT_COLORS[charCode % DEFAULT_COLORS.length];
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="text-3xl font-bold mb-8">Kids AI</div>
      
      <div className="w-full max-w-3xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold">Who's talking today?</h2>
          {showCompleteLogout && (
            <Button 
              variant="outline" 
              onClick={onCompleteLogout} 
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Child Profiles */}
            {childProfiles.map(profile => (
              <Card 
                key={profile.id}
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onChildLogin(profile.id)}
              >
                <CardContent className="p-6 flex flex-col items-center justify-center">
                  <div 
                    className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4 ${getProfileColor(profile)}`}
                  >
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-xl font-medium">{profile.name}</div>
                </CardContent>
              </Card>
            ))}
            
            {/* Parent Card - Always last */}
            <Card 
              className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={onParentLogin}
            >
              <CardContent className="p-6 flex flex-col items-center justify-center">
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4 bg-slate-600"
                >
                  <User className="h-10 w-10" />
                </div>
                <div className="text-xl font-medium">Parent</div>
              </CardContent>
            </Card>
          </div>

        {/* Show message only if no child profiles */}
        {childProfiles.length === 0 && (
          <div className="mt-4 p-4 text-center">
            <p className="text-muted-foreground">No child profiles have been created yet.</p>
            <p className="text-muted-foreground">Create profiles through the Parent Dashboard.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;
