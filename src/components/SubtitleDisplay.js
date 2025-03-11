import React, { useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
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
    <div 
      className="w-full max-h-40 overflow-y-auto rounded-lg p-4 bg-white shadow-sm"
      ref={containerRef}
    >
      {recentMessages.length === 0 ? (
        <p className="text-center text-muted-foreground italic">No messages yet</p>
      ) : (
        recentMessages.map((message, index) => (
          <div 
            key={index} 
            className={cn(
              "mb-2 py-2 px-3 rounded-lg max-w-[85%]",
              message.role === 'assistant' 
                ? "bg-primary/10 text-foreground mr-auto" 
                : "bg-black text-white ml-auto"
            )}
          >
            {message.content}
          </div>
        ))
      )}
    </div>
  );
};

export default SubtitleDisplay;
