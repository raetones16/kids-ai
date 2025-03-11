import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Keyboard, X } from 'lucide-react';
import Header from './Header';
import MainCircle from './MainCircle';
import TextInput from './TextInput';
import ErrorDisplay from './ErrorDisplay';
import SubtitleDisplay from '../SubtitleDisplay';
import { useChat } from '../../hooks/useChat';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import '../ChildInterface.css'; // Retain original CSS for animations and layout

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

  // Define a consistent container for both subtitle and text input
  const containerClass = "w-full max-w-lg px-4";

  return (
    <div className={`min-h-screen flex flex-col bg-gray-100 child-interface ${showTextInput ? 'chat-bottom-space' : ''}`}>
      <Header childName={childName} onLogout={onLogout} />

      <div className="flex-grow flex flex-col items-center justify-center">
        {error ? (
          <div className="w-full max-w-md px-4">
            <ErrorDisplay 
              message={error} 
              onRetry={() => window.location.reload()} 
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full">
            <div className="circle-container-wrapper mb-4">
              <MainCircle 
                interfaceState={interfaceState} 
                audioData={audioData} 
                onClick={handleMicrophoneClick} 
              />
            </div>

            <div className={containerClass + " mt-4"}>
              <SubtitleDisplay messages={messages} />
            </div>
            
            {/* Only show the text input when toggled - use same container class */}
            {showTextInput && (
              <div className={containerClass + " mt-4"}>
                <TextInput 
                  onSubmit={handleTextSubmit} 
                  interfaceState={interfaceState} 
                  visible={true} 
                />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Fixed Position Keyboard Toggle Button */}
      <div className="fixed left-6 bottom-6 z-50">
        <Button
          variant="secondary"
          onClick={toggleTextInput}
          aria-label={showTextInput ? "Hide keyboard" : "Show keyboard"}
          className="rounded-full w-12 h-12 bg-white border border-gray-200 shadow-md flex items-center justify-center"
        >
          {showTextInput 
            ? <X className="h-5 w-5 text-black" /> 
            : <Keyboard className="h-5 w-5 text-black" />
          }
        </Button>
      </div>
      
      {useMockApi && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded text-center text-sm">
          Using Mock AI (Offline Mode)
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
