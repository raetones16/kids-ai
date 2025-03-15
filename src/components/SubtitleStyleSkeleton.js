import React, { useRef, useEffect } from 'react';
import './SubtitleStyleDisplay.css';
import { Skeleton } from './ui/skeleton';

const SubtitleStyleSkeleton = () => {
  const containerRef = useRef(null);
  
  // Set text color CSS variable to match our theme
  useEffect(() => {
    if (containerRef.current) {
      // Get the computed grey-30 color for dark mode compatibility
      const greyColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--grey-30').trim();
      
      // Set the skeleton color variable 
      containerRef.current.style.setProperty('--skeleton-color', `hsl(${greyColor})`);
    }
  }, []);
  
  return (
    <div className="subtitle-style-container" ref={containerRef}>
      {/* User's question skeleton */}
      <div className="user-question">
        <Skeleton className="h-4 w-3/4 max-w-xs mx-auto mb-1 bg-grey-30/50" />
      </div>
      
      {/* Assistant's response skeleton */}
      <div className="assistant-subtitle">
        <Skeleton className="h-5 w-full max-w-md mx-auto mb-2 bg-grey-30/50" />
        <Skeleton className="h-5 w-4/5 max-w-md mx-auto bg-grey-30/50" />
      </div>
    </div>
  );
};

export default SubtitleStyleSkeleton;
