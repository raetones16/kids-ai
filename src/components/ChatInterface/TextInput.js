import React, { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Send } from 'lucide-react';

const TextInput = ({ onSubmit, interfaceState, visible }) => {
  const [textInput, setTextInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim() || interfaceState !== 'idle') return;
    
    onSubmit(textInput.trim());
    setTextInput('');
  };

  if (!visible) return null;

  return (
    <form 
      className="w-full flex justify-center gap-2 mobile-keyboard-form" 
      onSubmit={handleSubmit}
    >
      <Input
        type="text"
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        placeholder="Type your message..."
        disabled={interfaceState !== 'idle'}
        className="flex-grow text-center"
        autoFocus
      />
      <Button 
        type="submit" 
        disabled={interfaceState !== 'idle' || !textInput.trim()}
        className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full p-0 bg-black text-white hover:bg-gray-800"
      >
        <Send size={18} />
      </Button>
    </form>
  );
};

export default TextInput;
