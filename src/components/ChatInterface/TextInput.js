import React, { useState } from 'react';

const TextInput = ({ onSubmit, interfaceState, visible }) => {
  const [textInput, setTextInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim() || interfaceState !== 'idle') return;
    
    onSubmit(textInput.trim());
    setTextInput('');
  };

  return (
    <form 
      className={`text-input-form ${!visible ? 'hidden' : ''}`} 
      onSubmit={handleSubmit}
    >
      <input
        type="text"
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        placeholder="Type your message..."
        disabled={interfaceState !== 'idle'}
      />
      <button 
        type="submit" 
        disabled={interfaceState !== 'idle' || !textInput.trim()}
      >
        Send
      </button>
    </form>
  );
};

export default TextInput;
