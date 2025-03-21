import React, { useEffect, useState, useRef } from "react";
import CanvasCircleAnimation from "../CanvasCircleAnimation";

const MainCircle = ({ interfaceState, audioData, audioStream, onClick, ttsService }) => {
  const [dimensions, setDimensions] = useState({});
  const resizeTimeoutRef = useRef(null);
  const initialRenderRef = useRef(true);
  const audioInitializedRef = useRef(false);

  // Function to handle clicks and initialize audio
  const handleClick = (e) => {
    // Initialize audio context during user interaction for mobile browsers
    if (ttsService && !audioInitializedRef.current) {
      console.log("Initializing audio context on user interaction");
      if (typeof ttsService.initAudioContext === 'function') {
        ttsService.initAudioContext();
        audioInitializedRef.current = true;
      }
    }
    
    // Call the original onClick handler
    if (onClick) {
      onClick(e);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      // Debounce resize events to avoid too many re-renders
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        // Update dimensions on resize
        setDimensions({
          key: Date.now(), // Force canvas recreation on resize
          width: window.innerWidth,
          height: window.innerHeight
        });
      }, 150); // Small delay to batch resize events
    };

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Set initial dimensions with a slight delay to ensure proper sizing
    if (initialRenderRef.current) {
      // Set immediate dimensions
      setDimensions({
        key: 'initial',
        width: window.innerWidth,
        height: window.innerHeight
      });
      
      // Then update after layout is complete
      const initialTimer = setTimeout(() => {
        initialRenderRef.current = false;
        setDimensions({
          key: Date.now(),
          width: window.innerWidth,
          height: window.innerHeight
        });
      }, 300);
      
      return () => {
        clearTimeout(initialTimer);
        window.removeEventListener('resize', handleResize);
      };
    }

    // Cleanup
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div 
      className="circle-container" 
      onClick={handleClick} 
      style={{ transition: 'all 0.3s ease-in-out' }}
    >
      <CanvasCircleAnimation
        state={interfaceState}
        audioData={audioData}
        audioStream={audioStream}
        key={dimensions.key} // Force recreation on resize
      />
      <div className="mic-hint">
        {interfaceState === "idle" && "Tap to talk"}
        {interfaceState === "listening" && "Listening..."}
        {interfaceState === "thinking" && "Thinking..."}
        {interfaceState === "speaking" && "Speaking..."}
        {interfaceState === "searching" && "Searching..."}
      </div>
    </div>
  );
};

export default MainCircle;