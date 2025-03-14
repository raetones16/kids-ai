import React from 'react';
import CanvasCircleAnimation from '../CanvasCircleAnimation';

const MainCircle = ({ interfaceState, audioData, audioStream, onClick }) => {
  return (
    <div className="circle-container" onClick={onClick}>
      <CanvasCircleAnimation 
        state={interfaceState} 
        audioData={audioData}
        audioStream={audioStream}
      />
      <div className="mic-hint">
        {interfaceState === 'idle' && 'Tap to talk'}
        {interfaceState === 'listening' && 'Listening...'}
        {interfaceState === 'thinking' && 'Thinking...'}
        {interfaceState === 'speaking' && 'Speaking...'}
        {interfaceState === 'searching' && 'Searching...'}
      </div>
    </div>
  );
};

export default MainCircle;
