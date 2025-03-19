import React, { useState } from "react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";

const SettingsPanel = ({ onPinChange }) => {
  const [newPin, setNewPin] = useState(["", "", "", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle pin input change
  const handlePinChange = (index, value, pinType) => {
    // Only allow single digit numbers
    if (!/^\d?$/.test(value)) return;

    // Update the PIN digit
    const updatedPin = pinType === "new" ? [...newPin] : [...confirmPin];

    updatedPin[index] = value;

    if (pinType === "new") {
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
  const handleUpdatePin = async (e) => {
    e.preventDefault();

    // Clear any previous messages
    setError(null);
    setSuccess(null);

    // Check if both PINs are complete (6 digits)
    const newPinValue = newPin.join("");
    const confirmPinValue = confirmPin.join("");

    if (newPinValue.length !== 6 || confirmPinValue.length !== 6) {
      setError("Please enter all 6 digits for both PINs");
      return;
    }

    // Check if PINs match
    if (newPinValue !== confirmPinValue) {
      setError("PINs do not match. Please try again.");
      return;
    }

    try {
      // Update PIN via callback
      setIsLoading(true);
      const success = await onPinChange(newPinValue);

      if (success) {
        setSuccess("PIN updated successfully");
        // Clear the form
        setNewPin(["", "", "", "", "", ""]);
        setConfirmPin(["", "", "", "", "", ""]);
      } else {
        setError("Failed to update PIN. Please try again.");
      }
    } catch (err) {
      console.error("Error updating PIN:", err);
      setError("An error occurred while updating PIN");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">PIN Settings</h2>
        <p className="text-muted-foreground">
          Update the 6-digit PIN used to access the parent dashboard
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Parent Dashboard PIN
          </CardTitle>
          <CardDescription>
            This PIN is required to access the parent dashboard from the child
            selection screen. The default PIN is 000000.
          </CardDescription>
        </CardHeader>

        <CardContent>
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

          <form onSubmit={handleUpdatePin}>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">New PIN</label>
                <div className="flex justify-center gap-2">
                  {newPin.map((digit, index) => (
                    <input
                      key={`new-${index}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      name={`new-pin-${index}`}
                      value={digit}
                      onChange={(e) =>
                        handlePinChange(index, e.target.value, "new")
                      }
                      onKeyDown={(e) => handleKeyDown(index, e, "new")}
                      className="w-12 h-14 text-xl text-center border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={isLoading}
                      required
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm New PIN</label>
                <div className="flex justify-center gap-2">
                  {confirmPin.map((digit, index) => (
                    <input
                      key={`confirm-${index}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      name={`confirm-pin-${index}`}
                      value={digit}
                      onChange={(e) =>
                        handlePinChange(index, e.target.value, "confirm")
                      }
                      onKeyDown={(e) => handleKeyDown(index, e, "confirm")}
                      className="w-12 h-14 text-xl text-center border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={isLoading}
                      required
                    />
                  ))}
                </div>
              </div>
            </div>

            <CardFooter className="flex justify-end pt-6 px-0">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update PIN"}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>

      <div className="bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-400 p-4 rounded-md shadow-sm">
        <p className="text-amber-800 dark:text-amber-300 font-medium text-sm">
          <strong>Important:</strong> Remember your PIN. If you forget it,
          you'll need to reset the application to regain access to the parent
          dashboard.
        </p>
      </div>
    </div>
  );
};

export default SettingsPanel;
