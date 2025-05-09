import React, { useState, useEffect, useRef } from "react";
import SvgWaveBackground from "./SvgWaveBackground";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { AuthService } from "../services/AuthService";

const authService = new AuthService();

const ParentLogin = ({ onLoginSuccess, onCancel }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  // Check for saved credentials on component mount
  useEffect(() => {
    // Try to auto-login if credentials exist
    const attemptAutoLogin = async () => {
      try {
        // Check if we can automatically log in
        const session = await authService.autoLogin();
        if (session) {
          console.log("Auto-login successful");
          onLoginSuccess(session);
        }
      } catch (err) {
        console.log("No saved session found or auto-login failed");
        // No saved session, continue with manual login
      }
    };

    attemptAutoLogin();
  }, [onLoginSuccess]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      setError("Please enter both username and password");
      return;
    }
    
    // Blur inputs to prevent keyboard zoom issues
    if (usernameRef.current) usernameRef.current.blur();
    if (passwordRef.current) passwordRef.current.blur();

    setIsLoading(true);
    setError("");

    try {
      const session = await authService.loginParent(
        username,
        password,
        rememberMe
      );
      onLoginSuccess(session);
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Invalid username or password");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Background Image with wave effect */}
      <div className="fixed inset-0 z-0 w-full h-full overflow-hidden">
        <SvgWaveBackground 
          imageUrl="/background-images/Login.svg" 
          className="w-full h-full"
        />
      </div>

      <Card className="w-full max-w-sm mx-4 shadow-large relative z-10 bg-background/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl">Parent Login</CardTitle>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 w-full">
            {error && (
              <div className="bg-destructive/20 dark:bg-destructive/30 border-2 border-destructive text-destructive dark:text-white/90 p-4 rounded-md text-sm font-medium shadow-md">
                {error}
              </div>
            )}

            <div className="space-y-2 w-full">
              <Label htmlFor="username">Username</Label>
              <Input
                ref={usernameRef}
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                disabled={isLoading}
                required
                className="w-full max-w-none"
                inputMode="text"
                autoComplete="username"
              />
            </div>

            <div className="space-y-2 w-full">
              <Label htmlFor="password">Password</Label>
              <Input
                ref={passwordRef}
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={isLoading}
                required
                className="w-full max-w-none"
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={setRememberMe}
              />
              <Label htmlFor="remember-me" className="text-sm font-normal">
                Remember me forever
              </Label>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ParentLogin;
