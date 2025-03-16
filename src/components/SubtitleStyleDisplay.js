import React, { useRef, useEffect } from 'react';
import './SubtitleStyleDisplay.css';

const SubtitleStyleDisplay = ({ messages }) => {
  const containerRef = useRef(null);
  
  // Set text color CSS variable to match our theme
  useEffect(() => {
    if (containerRef.current) {
      // Get the computed grey-100 color from CSS
      const grey100 = getComputedStyle(document.documentElement)
        .getPropertyValue('--grey-100').trim();
      
      // Set the text color variable using our grey-100
      containerRef.current.style.setProperty('--text-color', `hsl(${grey100})`);
    }
  }, []);
  
  // Filter out any welcome messages or duplicates
  const filteredMessages = messages.filter((message, index) => {
    // Skip empty messages
    if (!message.content || !message.content.trim()) {
      return false;
    }
    
    // Remove welcome messages
    if (message.content.includes('Hello! Tap the circle to start talking with me')) {
      return false;
    }
    
    // Check for duplicate content
    const isExactDuplicate = messages.findIndex((m, i) => 
      i !== index && m.content === message.content && m.role === message.role
    ) !== -1;
    
    return !isExactDuplicate;
  });
  
  // Only get the most recent user and assistant messages
  const getRecentMessages = () => {
    // Start from the most recent message and work backwards
    const recentMessages = { user: null, assistant: null };
    
    // Simple approach - just get the most recent messages of each type
    // after filtering out duplicates
    for (let i = filteredMessages.length - 1; i >= 0; i--) {
      const message = filteredMessages[i];
      
      if (message.role === 'assistant' && !recentMessages.assistant) {
        recentMessages.assistant = message;
      }
      
      if (message.role === 'user' && !recentMessages.user) {
        recentMessages.user = message;
      }
      
      // Stop once we have both message types
      if (recentMessages.user && recentMessages.assistant) {
        break;
      }
    }
    
    return recentMessages;
  };
  
  const { user, assistant } = getRecentMessages();
  
  return (
    <div className="subtitle-style-container" ref={containerRef}>
      {/* User's question shown smaller and above */}
      {user && (
        <div className="user-question">
          {user.content}
        </div>
      )}
      
      {/* Assistant's response as the main subtitle */}
      {assistant && (
        <div className="assistant-subtitle">
          {assistant.content}
        </div>
      )}
      
      {/* Show placeholder if no messages */}
      {!assistant && !user && (
        <div className="subtitle-placeholder">
          Tap the circle to start talking
        </div>
      )}
    </div>
  );
};

export default SubtitleStyleDisplay;