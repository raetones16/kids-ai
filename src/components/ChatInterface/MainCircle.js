import React, { useEffect, useState } from "react";
import CanvasCircleAnimation from "../CanvasCircleAnimation";

const MainCircle = ({ interfaceState, audioData, audioStream, onClick }) => {
  const [dimensions, setDimensions] = useState({});

  useEffect(() => {
    const handleResize = () => {
      // Update dimensions on resize
      setDimensions({
        key: Date.now() // Force canvas recreation on resize
      });
    };

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Call once to set initial dimensions
    handleResize();

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="circle-container" onClick={onClick} style={{ transition: 'all 0.3s ease-in-out' }}>
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
