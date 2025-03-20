import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { User, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { AuthService } from "../../services/AuthService";
import { StorageService } from "../../services/StorageService";

const authService = new AuthService();
const storageService = new StorageService();

const AccountSettings = () => {
  // Credentials state with safe initialization
  const [username, setUsername] = useState(() => {
    // Provide a safe empty default that can never be undefined
    try {
      // Try to get from sessionStorage for persistence
      const sessionUsername = sessionStorage.getItem('kids-ai.settings.username');
      return sessionUsername || "";
    } catch (e) {
      return "";
    }
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Track mounted state and other refs for state management
  const isMounted = useRef(true);
  const usernameRef = useRef("");
  const errorRef = useRef(null);
  
  // Clean up function that runs when component unmounts
  useEffect(() => {
    return () => {
      console.log('AccountSettings component unmounting');
      // Clear any interval timers
      const timerId = setTimeout(() => {}, 0);
      for (let i = 0; i < timerId; i++) {
        clearTimeout(i);
      }
      
      // Mark component as unmounted to prevent state updates
      isMounted.current = false;
    };
  }, []);

  // Safe state setter functions that access the refs directly
  const safeSetUsername = useCallback((value) => {
    if (!isMounted.current) return;
    
    const safeValue = value || "";
    usernameRef.current = safeValue; // Update ref
    setUsername(safeValue); // Update state
    
    // Save to sessionStorage
    try {
      sessionStorage.setItem('kids-ai.settings.username', safeValue);
    } catch (e) {
      console.error('Error saving username to sessionStorage:', e);
    }
  }, []);
  
  const safeSetPassword = useCallback((value) => {
    if (!isMounted.current) return;
    setPassword(value || "");
  }, []);
  
  const safeSetConfirmPassword = useCallback((value) => {
    if (!isMounted.current) return;
    setConfirmPassword(value || "");
  }, []);
  
  const safeSetError = useCallback((value) => {
    if (!isMounted.current) return;
    errorRef.current = value;
    setError(value);
  }, []);
  
  // PIN state with explicit default values and guaranteed array creation
  const [newPin, setNewPin] = useState(() => {
    // Try to get from sessionStorage first
    try {
      const savedPinState = sessionStorage.getItem('kids-ai.settings.pinState');
      if (savedPinState) {
        const parsedState = JSON.parse(savedPinState);
        if (parsedState.newPin && Array.isArray(parsedState.newPin) && parsedState.newPin.length === 6) {
          return parsedState.newPin;
        }
      }
    } catch (e) {
      console.error('Error retrieving PIN state from session storage:', e);
    }
    return Array(6).fill("");
  });
  
  const [confirmPin, setConfirmPin] = useState(() => {
    // Try to get from sessionStorage first
    try {
      const savedPinState = sessionStorage.getItem('kids-ai.settings.pinState');
      if (savedPinState) {
        const parsedState = JSON.parse(savedPinState);
        if (parsedState.confirmPin && Array.isArray(parsedState.confirmPin) && parsedState.confirmPin.length === 6) {
          return parsedState.confirmPin;
        }
      }
    } catch (e) {
      console.error('Error retrieving PIN state from session storage:', e);
    }
    return Array(6).fill("");
  });

  // UI state
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const successRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Safe setter for success state
  const safeSetSuccess = useCallback((value) => {
    if (!isMounted.current) return;
    successRef.current = value;
    setSuccess(value);
  }, []);

  // Load current credentials with no dependencies
  const loadCurrentCredentials = useCallback(async () => {
    if (!isMounted.current) return;
    
    // Initialize all text fields with safe empty defaults
    safeSetUsername("");
    safeSetPassword("");
    safeSetConfirmPassword("");
    
    try {
      const credentials = await authService.getParentCredentials();
      safeSetUsername(credentials.username);
    } catch (err) {
      console.error("Failed to load credentials:", err);
      safeSetError("Failed to load current account information");
    }
  }, []);

  // Handle account form submission
  const handleAccountSubmit = async (e) => {
    e.preventDefault();

    // Reset messages
    safeSetError(null);
    safeSetSuccess(null);

    // Validate input
    if (!username.trim()) {
      safeSetError("Username is required");
      return;
    }

    if (password && password.length < 6) {
      safeSetError("Password must be at least 6 characters long");
      return;
    }

    if (password && password !== confirmPassword) {
      safeSetError("Passwords do not match");
      return;
    }

    // Update credentials
    setIsLoading(true);

    try {
      await authService.updateParentCredentials(username, password);
      safeSetSuccess("Account settings updated successfully");

      // Clear password fields
      safeSetPassword("");
      safeSetConfirmPassword("");
    } catch (err) {
      console.error("Failed to update credentials:", err);
      safeSetError(err.message || "Failed to update account settings");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pin input change with enhanced error handling
  const handlePinChange = (index, value, pinType) => {
    // Ensure we're working with valid arrays
    if (!Array.isArray(newPin) || !Array.isArray(confirmPin)) {
      console.error('PIN arrays are invalid, resetting them');
      setNewPin(() => Array(6).fill(""));
      setConfirmPin(() => Array(6).fill(""));
      return;
    }
    // Only allow single digit numbers or empty string
    if (value !== "" && !/^\d$/.test(value)) return;

    // Create new PIN array
    let updatedPin;
    if (pinType === "new") {
      updatedPin = [...newPin];
    } else {
      updatedPin = [...confirmPin];
    }

    // Update the specified digit
    updatedPin[index] = value;

    // Update state based on PIN type
    if (pinType === "new") {
      setNewPin(updatedPin);
    } else {
      setConfirmPin(updatedPin);
    }

    // Clear any previous error/success messages
    safeSetError(null);
    setSuccess(null);

    // Auto-focus next input if value was entered
    if (value) {
      const nextIndex = index + 1;
      if (nextIndex < 6) {
        const nextInput = document.querySelector(
          `input[name="${pinType}-pin-${nextIndex}"]`
        );
        if (nextInput) {
          nextInput.focus();
        }
      } else if (pinType === "new") {
        // If at the end of newPin, focus first confirmPin input
        const firstConfirmInput = document.querySelector(
          'input[name="confirm-pin-0"]'
        );
        if (firstConfirmInput) {
          firstConfirmInput.focus();
        }
      }
    }
  };

  // Handle key navigation between PIN digits
  const handleKeyDown = (index, e, pinType) => {
    const pin = pinType === "new" ? newPin : confirmPin;

    // Move to previous input on backspace if current is empty
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      const prevInput = document.querySelector(
        `input[name="${pinType}-pin-${index - 1}"]`
      );
      if (prevInput) {
        prevInput.focus();
      }
    }

    // Allow left/right arrow navigation
    if (e.key === "ArrowLeft" && index > 0) {
      const prevInput = document.querySelector(
        `input[name="${pinType}-pin-${index - 1}"]`
      );
      if (prevInput) {
        prevInput.focus();
      }
    }
    if (e.key === "ArrowRight" && index < 5) {
      const nextInput = document.querySelector(
        `input[name="${pinType}-pin-${index + 1}"]`
      );
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  // Handle pin update
  const handlePinSubmit = async (e) => {
    e.preventDefault();

    // Clear any previous messages
    setError(null);
    setSuccess(null);

    // Check if both PINs are complete (6 digits)
    const newPinValue = newPin.join("");
    const confirmPinValue = confirmPin.join("");

    if (newPinValue.length !== 6 || confirmPinValue.length !== 6) {
      safeSetError("Please enter all 6 digits for both PINs");
      return;
    }

    // Check if PINs match
    if (newPinValue !== confirmPinValue) {
      safeSetError("PINs do not match. Please try again.");
      return;
    }

    try {
      // Update PIN via storageService
      setIsLoading(true);
      await storageService.updateParentPin(newPinValue);
      safeSetSuccess("PIN updated successfully");

      // Clear the form - using Array.fill for guaranteed arrays
      setNewPin(() => Array(6).fill(""));
      setConfirmPin(() => Array(6).fill(""));
    } catch (err) {
      console.error("Error updating PIN:", err);
      safeSetError("An error occurred while updating PIN");
    } finally {
      setIsLoading(false);
    }
  };

  // Load current credentials on component mount and preserve PIN state values
  useEffect(() => {
    // Initial load of credentials
    loadCurrentCredentials();
    
    // Create a cleanup function that ensures the PIN arrays are valid
    // when this component unmounts and remounts
    return () => {
      // First mark component as unmounted to prevent state updates
      isMounted.current = false;
      
      // Store current state in session storage to survive refreshes/tab changes
      try {
        // Only attempt to save if we have valid arrays
        if (Array.isArray(newPin) && Array.isArray(confirmPin)) {
          const pinState = {
            newPin: newPin.map(digit => digit || ""),
            confirmPin: confirmPin.map(digit => digit || "")
          };
          sessionStorage.setItem('kids-ai.settings.pinState', JSON.stringify(pinState));
        }
      } catch (e) {
        console.error('Error saving PIN state to session storage:', e);
      }
    };
  }, [newPin, confirmPin, loadCurrentCredentials]);
  
  // Additional safety check to ensure PIN arrays are always arrays
  // Use a ref to prevent infinite loops
  const wasPinArrayFixed = useRef(false);
  
  useEffect(() => {
    // Only fix once per render and skip the rest of the effect if already fixed
    if (wasPinArrayFixed.current) return;
    
    // Verify PIN arrays every time the component renders
    let shouldFixPin = false;

    if (!Array.isArray(newPin) || newPin.length !== 6) {
      console.warn('newPin is not a valid array, will reset');
      shouldFixPin = true;
    }
    
    if (!Array.isArray(confirmPin) || confirmPin.length !== 6) {
      console.warn('confirmPin is not a valid array, will reset');
      shouldFixPin = true;
    }

    // If either array needs fixing, do it once
    if (shouldFixPin) {
      wasPinArrayFixed.current = true;
      // Use setTimeout to avoid state updates during render
      setTimeout(() => {
        if (isMounted.current) {
          setNewPin(Array(6).fill(""));
          setConfirmPin(Array(6).fill(""));
          wasPinArrayFixed.current = false; // Reset for next render
        }
      }, 0);
    }
  }, [newPin, confirmPin]);

  return (
    <div className="space-y-8 pb-6">
      <div>
        <h2 className="text-2xl font-bold">Account Settings</h2>
        <p className="text-muted-foreground">
          Manage your parent account and security settings
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-4 mb-4 bg-destructive/20 dark:bg-destructive/30 text-destructive dark:text-white/90 rounded-md border-2 border-destructive shadow-md">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-4 mb-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-md border-2 border-green-500 shadow-md">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {/* Two-column layout for cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Credentials Card */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Login Credentials
            </CardTitle>
            <CardDescription>
              Update your username and password. These credentials are used to
              initially access the application.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              id="credentials-form"
              onSubmit={handleAccountSubmit}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username || ""}
                  onChange={(e) => safeSetUsername(e.target.value)}
                  placeholder="Enter username"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password || ""}
                  onChange={(e) => safeSetPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword || ""}
                  onChange={(e) => safeSetConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={isLoading || !password}
                />
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex justify-end mt-auto">
            <Button type="submit" form="credentials-form" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Credentials"}
            </Button>
          </CardFooter>
        </Card>

        {/* PIN Card */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Dashboard PIN
            </CardTitle>
            <CardDescription>
              Update the 6-digit PIN used to access the parent dashboard from
              the child selection screen.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              id="pin-form"
              onSubmit={handlePinSubmit}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>New PIN</Label>
                <div className="flex justify-start gap-2">
                  {newPin.map((digit, index) => (
                    <Input
                      key={`new-${index}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      name={`new-pin-${index}`}
                      value={digit || ""}
                      onChange={(e) =>
                        handlePinChange(index, e.target.value, "new")
                      }
                      onKeyDown={(e) => handleKeyDown(index, e, "new")}
                      className="w-10 h-12 text-xl text-center"
                      disabled={isLoading}
                      required
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Confirm New PIN</Label>
                <div className="flex justify-start gap-2">
                  {confirmPin.map((digit, index) => (
                    <Input
                      key={`confirm-${index}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      name={`confirm-pin-${index}`}
                      value={digit || ""}
                      onChange={(e) =>
                        handlePinChange(index, e.target.value, "confirm")
                      }
                      onKeyDown={(e) => handleKeyDown(index, e, "confirm")}
                      className="w-10 h-12 text-xl text-center"
                      disabled={isLoading}
                      required
                    />
                  ))}
                </div>
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex justify-end mt-auto">
            <Button type="submit" form="pin-form" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update PIN"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="bg-accent/30 border border-accent/40 p-4 rounded-md">
        <p className="text-accent-foreground text-sm">
          <strong>Important:</strong> Remember your credentials and PIN. If you
          forget them, you'll need to reset the application to regain access.
        </p>
      </div>
    </div>
  );
};

export default AccountSettings;
