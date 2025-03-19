import React, { useState, useRef, useEffect } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

const PinEntryModal = ({ onVerify, error: propError, onCancel }) => {
  const [pin, setPin] = useState(["", "", "", "", "", ""]); // 6-digit PIN
  const [error, setError] = useState(propError);
  const inputRefs = useRef([]);

  // Update error state when prop changes
  useEffect(() => {
    setError(propError);
  }, [propError]);

  // Initialize input refs
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 6);
    // Focus the first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Handle digit input
  const handleDigitChange = (index, value) => {
    // Only allow single digit numbers
    if (!/^\d?$/.test(value)) return;

    // Update the PIN digit
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // If digit entered and not the last input, focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Handle key navigation between PIN digits
  const handleKeyDown = (index, e) => {
    // Move to previous input on backspace if current is empty
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }

    // Allow left/right arrow navigation
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1].focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Handle PIN verification
  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullPin = pin.join("");

    // Only verify if PIN is complete (6 digits)
    if (fullPin.length === 6) {
      setError(null);
      const success = await onVerify(fullPin);

      if (!success) {
        setError("Invalid PIN. Please try again.");
      }
    }
  };

  return (
    <div className="fixed inset-0 p-4 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-background rounded-lg w-full max-w-md p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-2">
          Enter Parent Dashboard PIN
        </h2>
        <p className="text-muted-foreground mb-3">
          Please enter your 6-digit PIN to access the parent dashboard.
        </p>
        <p className="text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-3 rounded-md mb-6">
          <strong>Note:</strong> The default PIN is <code className="font-mono bg-background dark:bg-background/30 px-2 py-1 rounded border">000000</code>
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-center gap-2 my-6">
            {pin.map((digit, index) => (
              <Input
                key={index}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                ref={(el) => (inputRefs.current[index] = el)}
                className="w-10 h-12 text-center text-lg"
                required
              />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={pin.join("").length !== 6}>
              Verify
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PinEntryModal;
