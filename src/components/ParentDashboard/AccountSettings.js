import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { User, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthService } from '../../services/AuthService';
import { StorageService } from '../../services/StorageService';

const authService = new AuthService();
const storageService = new StorageService();

const AccountSettings = () => {
  // Credentials state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // PIN state
  const [newPin, setNewPin] = useState(['', '', '', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '', '', '']);
  
  // UI state
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load current credentials
  const loadCurrentCredentials = async () => {
    try {
      const credentials = await authService.getParentCredentials();
      setUsername(credentials.username);
    } catch (err) {
      console.error('Failed to load credentials:', err);
      setError('Failed to load current account information');
    }
  };

  // Handle account form submission
  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    
    // Reset messages
    setError(null);
    setSuccess(null);
    
    // Validate input
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    
    if (password && password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // If password field is empty, we're just updating username
    // Get current credentials to maintain the password
    let newPassword = password;
    if (!password) {
      try {
        const credentials = await authService.getParentCredentials();
        newPassword = credentials.password;
      } catch (err) {
        console.error('Failed to get current credentials:', err);
        setError('Failed to update account settings');
        return;
      }
    }
    
    // Update credentials
    setIsLoading(true);
    
    try {
      await authService.updateParentCredentials(username, newPassword);
      setSuccess('Account settings updated successfully');
      
      // Clear password fields
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Failed to update credentials:', err);
      setError('Failed to update account settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pin input change
  const handlePinChange = (index, value, pinType) => {
    // Only allow single digit numbers
    if (!/^\d?$/.test(value)) return;
    
    // Update the PIN digit
    const updatedPin = pinType === 'new' 
      ? [...newPin] 
      : [...confirmPin];
      
    updatedPin[index] = value;
    
    if (pinType === 'new') {
      setNewPin(updatedPin);
    } else {
      setConfirmPin(updatedPin);
    }
    
    // Clear any previous error/success messages
    setError(null);
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
      } else if (pinType === 'new') {
        // If at the end of newPin, focus first confirmPin input
        const firstConfirmInput = document.querySelector('input[name="confirm-pin-0"]');
        if (firstConfirmInput) {
          firstConfirmInput.focus();
        }
      }
    }
  };
  
  // Handle key navigation between PIN digits
  const handleKeyDown = (index, e, pinType) => {
    const pin = pinType === 'new' ? newPin : confirmPin;
    
    // Move to previous input on backspace if current is empty
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.querySelector(
        `input[name="${pinType}-pin-${index - 1}"]`
      );
      if (prevInput) {
        prevInput.focus();
      }
    }
    
    // Allow left/right arrow navigation
    if (e.key === 'ArrowLeft' && index > 0) {
      const prevInput = document.querySelector(
        `input[name="${pinType}-pin-${index - 1}"]`
      );
      if (prevInput) {
        prevInput.focus();
      }
    }
    if (e.key === 'ArrowRight' && index < 5) {
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
    const newPinValue = newPin.join('');
    const confirmPinValue = confirmPin.join('');
    
    if (newPinValue.length !== 6 || confirmPinValue.length !== 6) {
      setError('Please enter all 6 digits for both PINs');
      return;
    }
    
    // Check if PINs match
    if (newPinValue !== confirmPinValue) {
      setError('PINs do not match. Please try again.');
      return;
    }
    
    try {
      // Update PIN via storageService
      setIsLoading(true);
      await storageService.updateParentPin(newPinValue);
      setSuccess('PIN updated successfully');
      
      // Clear the form
      setNewPin(['', '', '', '', '', '']);
      setConfirmPin(['', '', '', '', '', '']);
    } catch (err) {
      console.error('Error updating PIN:', err);
      setError('An error occurred while updating PIN');
    } finally {
      setIsLoading(false);
    }
  };

  // Load current credentials on component mount
  useEffect(() => {
    loadCurrentCredentials();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Account Settings</h2>
        <p className="text-muted-foreground">Manage your parent account and security settings</p>
      </div>
      
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 text-red-800 rounded-md border border-red-200">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="flex items-start gap-2 p-3 bg-green-50 text-green-800 rounded-md border border-green-200">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}
      
      {/* Credentials Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Login Credentials
          </CardTitle>
          <CardDescription>
            Update your username and password. These credentials are used to initially access the application.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form id="credentials-form" onSubmit={handleAccountSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-xs text-muted-foreground">(leave blank to keep current)</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={isLoading || !password}
              />
            </div>
          </form>
          
          <div className="bg-muted p-3 mt-6 rounded-md">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Default credentials are:<br />
              Username: <strong>parent</strong> | Password: <strong>password123</strong>
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end">
          <Button 
            type="submit"
            form="credentials-form"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Credentials'}
          </Button>
        </CardFooter>
      </Card>
      
      {/* PIN Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Dashboard PIN
          </CardTitle>
          <CardDescription>
            Update the 6-digit PIN used to access the parent dashboard from the child selection screen.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form id="pin-form" onSubmit={handlePinSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>New PIN</Label>
              <div className="flex justify-center gap-2">
                {newPin.map((digit, index) => (
                  <Input
                    key={`new-${index}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    name={`new-pin-${index}`}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value, 'new')}
                    onKeyDown={(e) => handleKeyDown(index, e, 'new')}
                    className="w-12 h-14 text-xl text-center"
                    disabled={isLoading}
                    required
                  />
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Confirm New PIN</Label>
              <div className="flex justify-center gap-2">
                {confirmPin.map((digit, index) => (
                  <Input
                    key={`confirm-${index}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    name={`confirm-pin-${index}`}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value, 'confirm')}
                    onKeyDown={(e) => handleKeyDown(index, e, 'confirm')}
                    className="w-12 h-14 text-xl text-center"
                    disabled={isLoading}
                    required
                  />
                ))}
              </div>
            </div>
          </form>
          
          <div className="bg-muted p-3 mt-6 rounded-md">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Default PIN is: <strong>000000</strong>
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end">
          <Button 
            type="submit"
            form="pin-form"
            disabled={isLoading}
          >
            {isLoading ? 'Updating...' : 'Update PIN'}
          </Button>
        </CardFooter>
      </Card>
      
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
        <p className="text-amber-800 text-sm">
          <strong>Important:</strong> Remember your credentials and PIN. If you forget them, you'll need to reset the application to regain access.
        </p>
      </div>
    </div>
  );
};

export default AccountSettings;
