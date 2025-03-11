import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
import MainCircle from './MainCircle';
import TextInput from './TextInput';
import ErrorDisplay from './ErrorDisplay';
import SubtitleDisplay from '../SubtitleDisplay';
import { useChat } from '../../hooks/useChat';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import '../ChildInterface.css'; // Import the CSS file

// SVG for keyboard icon
const KeyboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="12" x="3" y="6" rx="2" />
    <line x1="7" y1="10" x2="7" y2="10" />
    <line x1="12" y1="10" x2="12" y2="10" />
    <line x1="17" y1="10" x2="17" y2="10" />
    <line x1="7" y1="14" x2="17" y2="14" />
  </svg>
);

const ChatInterface = ({ childId, childName, onLogout, assistantRef, useMockApi = false }) => {
  const [showTextInput, setShowTextInput] = useState(false);
  const [error, setError] = useState(null);
  const [audioData, setAudioData] = useState(null);
  const animationFrameRef = useRef(null);
  
  // Initialize chat hook
  const { 
    messages,
    interfaceState, 
    setInterfaceState,
    processUserInput,
    initializeWelcomeMessage,
    getAudioData,
    conversationReady,
    tts
  } = useChat(assistantRef, childId, childName);
  
  // Initialize speech recognition hook
  const {
    startListening,
    stopListening,
    error: speechError,
    isAvailable: speechAvailable
  } = useSpeechRecognition(interfaceState, setInterfaceState, processUserInput);
  
  // Set error from speech recognition
  useEffect(() => {
    if (speechError) {
      setError(speechError);
      setShowTextInput(true);
    }
  }, [speechError]);
  
  // Set up animation frame for audio visualization
  useEffect(() => {
    const updateAudioData = () => {
      const data = getAudioData();
      if (data) {
        setAudioData(data);
      }
      animationFrameRef.current = requestAnimationFrame(updateAudioData);
    };
    
    animationFrameRef.current = requestAnimationFrame(updateAudioData);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [getAudioData]);
  
  // Handle microphone button click
  const handleMicrophoneClick = async () => {
    console.log('Microphone clicked, current state:', interfaceState);

    // First-time initialization when user interacts
    if (!conversationReady) {
      console.log('First-time initialization of conversation');
      try {
        // Show a loading state during initialization
        setInterfaceState('thinking');
        
        await initializeWelcomeMessage();
        return; // Don't start listening on the first click
      } catch (error) {
        console.error('Error initializing conversation:', error);
        setError('Failed to start conversation. Please try again.');
        setInterfaceState('idle');
      }
    }
    
    // Normal microphone behavior after initialization
    if (interfaceState === 'idle') {
      // Make sure audio context is initialized
      if (tts && typeof tts.initAudioContext === 'function') {
        tts.initAudioContext();
      }
      
      if (!speechAvailable) {
        setError('Speech recognition is not available on your device');
        setShowTextInput(true);
        return;
      }
      
      // Clear any previous errors
      setError(null);
      
      // Start listening
      const success = startListening();
      if (!success) {
        setShowTextInput(true);
      }
    } else if (interfaceState === 'listening') {
      stopListening();
    }
  };

  // Handle text input submit
  const handleTextSubmit = async (text) => {
    // Make sure audio context is initialized
    if (tts && typeof tts.initAudioContext === 'function') {
      tts.initAudioContext();
    }
    
    try {
      await processUserInput(text);
    } catch (err) {
      setError(err.message || 'Failed to get a response. Please try again.');
    }
  };

  // Toggle text input visibility
  const toggleTextInput = () => {
    setShowTextInput(!showTextInput);
  };

  return (
    <div className="child-interface">
      <Header childName={childName} onLogout={onLogout} />

      <div className="main-content">
        {error ? (
          <ErrorDisplay 
            message={error} 
            onRetry={() => window.location.reload()} 
          />
        ) : (
          <>
            <MainCircle 
              interfaceState={interfaceState} 
              audioData={audioData} 
              onClick={handleMicrophoneClick} 
            />

            <SubtitleDisplay messages={messages} />
            
            <button 
              className={`keyboard-toggle ${showTextInput ? 'active' : ''}`} 
              onClick={toggleTextInput}
              aria-label="Toggle keyboard input"
            >
              <KeyboardIcon />
              <span className="keyboard-label">Type</span>
            </button>
            
            <TextInput 
              onSubmit={handleTextSubmit} 
              interfaceState={interfaceState} 
              visible={showTextInput} 
            />
            
            {useMockApi && (
              <div className="status-badge mock">
                Using Mock AI (Offline Mode)
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
