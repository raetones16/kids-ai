import React, { useState, useRef, useEffect } from 'react';

const PinEntryModal = ({ onVerify, error: propError, onCancel }) => {
  const [pin, setPin] = useState(['', '', '', '', '', '']); // 6-digit PIN
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
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
    
    // Allow left/right arrow navigation
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Handle PIN verification
  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullPin = pin.join('');
    
    // Only verify if PIN is complete (6 digits)
    if (fullPin.length === 6) {
      setError(null);
      const success = await onVerify(fullPin);
      
      if (!success) {
        setError('Invalid PIN. Please try again.');
      }
    }
  };

  return (
    <div className="pin-modal-overlay">
      <div className="pin-modal">
        <h2>Enter Parent Dashboard PIN</h2>
        <p>Please enter your 6-digit PIN to access the parent dashboard.</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="pin-entry">
            {pin.map((digit, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                ref={(el) => (inputRefs.current[index] = el)}
                className="pin-digit"
                required
              />
            ))}
          </div>
          
          <div className="button-group">
            <button 
              type="button" 
              className="secondary-button"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="primary-button"
              disabled={pin.join('').length !== 6}
            >
              Verify
            </button>
          </div>
        </form>
        
        <div className="pin-help">
          <p>Default PIN: 000000</p>
          <p>You can change your PIN in the Settings tab.</p>
        </div>
      </div>
    </div>
  );
};

export default PinEntryModal;
