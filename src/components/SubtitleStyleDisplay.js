import React, { useRef } from 'react';
import './SubtitleStyleDisplay.css';

const SubtitleStyleDisplay = ({ messages }) => {
  const containerRef = useRef(null);
  
  // Only get the most recent user and assistant messages
  const getRecentMessages = () => {
    // Start from the most recent message and work backwards
    const recentMessages = { user: null, assistant: null };
    
    // Iterate backward through messages to find the most recent of each type
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      
      if (message.role === 'assistant' && !recentMessages.assistant && message.content.trim()) {
        recentMessages.assistant = message;
      }
      
      if (message.role === 'user' && !recentMessages.user && message.content.trim()) {
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
