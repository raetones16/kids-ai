import * as React from "react";
import { toggleTheme } from "../../utils/themeUtils";
import { Button } from "./button";

/**
 * A simple theme toggle button component 
 * Switches between light and dark mode
 */
const ThemeToggle = ({ className }) => {
  // Detect initial theme
  const [isDark, setIsDark] = React.useState(false);
  
  React.useEffect(() => {
    // Initialize state based on actual theme
    setIsDark(document.documentElement.classList.contains("dark"));
    
    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          setIsDark(document.documentElement.classList.contains("dark"));
        }
      });
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    
    return () => observer.disconnect();
  }, []);
  
  const handleToggle = () => {
    toggleTheme();
  };
  
  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={handleToggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <span className="sr-only">Switch to light mode</span>
      ) : (
        <span className="sr-only">Switch to dark mode</span>
      )}
      
      {/* Sun icon for light mode */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={`w-5 h-5 ${!isDark ? "block" : "hidden"}`}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
        />
      </svg>
      
      {/* Moon icon for dark mode */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={`w-5 h-5 ${isDark ? "block" : "hidden"}`}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
        />
      </svg>
    </Button>
  );
};

export { ThemeToggle };
