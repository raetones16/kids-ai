import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { User } from 'lucide-react';

// Default colors if no color is stored with the profile
const DEFAULT_COLORS = [
  'bg-blue-500', // Blue
  'bg-green-500', // Green
  'bg-red-500', // Red
  'bg-yellow-500', // Yellow
  'bg-purple-500', // Purple
];

const LoginScreen = ({ childProfiles, onChildLogin, onParentLogin }) => {
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
          <Button 
            variant="outline" 
            onClick={onParentLogin}
            className="gap-2"
          >
            <User className="h-4 w-4" />
            <span>Parent</span>
          </Button>
        </div>
        
        {childProfiles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
          </div>
        ) : (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-8 text-center">
              <p className="mb-2 text-muted-foreground">No child profiles have been created yet.</p>
              <p className="text-muted-foreground">Parents need to create profiles through the Parent Dashboard.</p>
            </CardContent>
          </Card>
        )}

        {/* Parent Help Text */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Parents: Click the "Parent" button above to access the dashboard</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
