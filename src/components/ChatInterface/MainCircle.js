import React from 'react';
import CircleAnimation from '../CircleAnimation';

const MainCircle = ({ interfaceState, audioData, onClick }) => {
  return (
    <div className="circle-container" onClick={onClick}>
      <CircleAnimation state={interfaceState} audioData={audioData} />
      <div className="mic-hint">
        {interfaceState === 'idle' && 'Tap to talk'}
        {interfaceState === 'listening' && 'Listening...'}
        {interfaceState === 'thinking' && 'Thinking...'}
        {interfaceState === 'speaking' && 'Speaking...'}
      </div>
    </div>
  );
};

export default MainCircle;
