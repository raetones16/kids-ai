import React, { useEffect, useRef } from 'react';
import './SubtitleDisplay.css';

const SubtitleDisplay = ({ messages }) => {
  const containerRef = useRef(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  // Only display the last 3 messages for simplicity
  const recentMessages = messages.slice(-3);

  return (
    <div className="subtitle-display" ref={containerRef}>
      {recentMessages.map((message, index) => (
        <div 
          key={index} 
          className={`message ${message.role === 'assistant' ? 'ai-message' : 'user-message'}`}
        >
          {message.content}
        </div>
      ))}
    </div>
  );
};

export default SubtitleDisplay;
