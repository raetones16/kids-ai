import React from 'react';
import './CircleAnimation.css';

/**
 * A simplified version of the circle animation using CSS instead of Three.js
 */
const SimpleCircleAnimation = ({ state = 'idle' }) => {
  // Determine circle classes based on state
  const circleClass = `simple-circle state-${state}`;
  
  // Log state changes to help with debugging
  console.log(`Circle animation state: ${state}`);
  
  // Render different animations based on state
  return (
    <div className="circle-animation">
      <div className={circleClass}>
        {state === 'listening' && (
          <>
            <div className="ripple ripple-1"></div>
            <div className="ripple ripple-2"></div>
            <div className="ripple ripple-3"></div>
          </>
        )}
        
        {state === 'thinking' && (
          <>
            <div className="orbit"></div>
            <div className="satellite satellite-1"></div>
            <div className="satellite satellite-2"></div>
            <div className="satellite satellite-3"></div>
          </>
        )}
        
        {state === 'speaking' && (
          <>
            <div className="wave wave-1"></div>
            <div className="wave wave-2"></div>
            <div className="wave wave-3"></div>
          </>
        )}
      </div>
    </div>
  );
};

export default SimpleCircleAnimation;
