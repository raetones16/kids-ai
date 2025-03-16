import React from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { User, LogOut } from "lucide-react";

// Default colors if no color is stored with the profile
const DEFAULT_COLORS = [
  "bg-blue-500", // Blue
  "bg-green-500", // Green
  "bg-red-500", // Red
  "bg-yellow-500", // Yellow
  "bg-purple-500", // Purple
];

const LoginScreen = ({
  childProfiles,
  onChildLogin,
  onParentLogin,
  onCompleteLogout,
  reloadProfiles,
  showCompleteLogout = false,
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-8 md:p-20 relative">
      {/* Background Image */}
      <div
        className="fixed inset-0 z-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/background-images/Profile.svg")',
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Content - added a higher z-index and some bg opacity to make content stand out */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center pb-16">
        {/* Logout Button - Positioned absolutely at top right with padding */}
        {showCompleteLogout && (
          <Button
            variant="outline"
            onClick={onCompleteLogout}
            className="gap-2 fixed top-6 right-6 z-20 bg-background/80 hover:bg-grey-90"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log Out</span>
          </Button>
        )}

        <div className="text-3xl font-bold mb-4 text-foreground">Kids AI</div>

        <div className="w-full max-w-3xl flex flex-col items-center">
          {/* Centered heading */}
          <h2 className="text-2xl font-semibold pb-8 text-center text-foreground">
            Who's talking today?
          </h2>

          {/* Responsive profile layout - 2x2 grid on mobile, centered flex on larger screens */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-4 sm:gap-6 w-full">
            {/* Child Profiles */}
            {childProfiles.map((profile) => (
              <Card
                key={profile.id}
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer w-full max-w-[180px] shadow-medium bg-background/80 backdrop-blur-sm"
                onClick={() => onChildLogin(profile.id)}
              >
                <CardContent className="p-3 sm:p-6 flex flex-col items-center justify-center">
                  <div
                    className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl font-bold mb-2 sm:mb-4 ${getProfileColor(
                      profile
                    )}`}
                  >
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-base sm:text-xl font-semibold text-center">
                    {profile.name}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Parent Card - Always last */}
            <Card
              className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer w-full max-w-[180px] shadow-medium bg-background/80 backdrop-blur-sm"
              onClick={onParentLogin}
            >
              <CardContent className="p-3 sm:p-6 flex flex-col items-center justify-center">
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl font-bold mb-2 sm:mb-4 bg-slate-600">
                  <User className="h-7 w-7 sm:h-10 sm:w-10" />
                </div>
                <div className="text-base sm:text-xl font-semibold text-center">Parent</div>
              </CardContent>
            </Card>
          </div>

          {/* Show message only if no child profiles */}
          {childProfiles.length === 0 && (
            <div className="mt-4 p-4 text-center bg-background/80 backdrop-blur-sm rounded-lg">
              <p className="text-muted-foreground">
                No child profiles have been created yet.
              </p>
              <p className="text-muted-foreground">
                Create profiles through the Parent Dashboard.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
