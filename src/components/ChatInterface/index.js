import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Keyboard, X } from 'lucide-react';
import Header from './Header';
import MainCircle from './MainCircle';
import TextInput from './TextInput';
import ErrorDisplay from './ErrorDisplay';
import SubtitleStyleDisplay from '../SubtitleStyleDisplay';
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
  
  // Set up audio data updates
  useEffect(() => {
    console.log(`ChatInterface: State changed to ${interfaceState}`);
    
    // If we're in speaking state, start generating audio data
    if (interfaceState === 'speaking') {
      console.log('Starting speaking animation updates');
      
      // Create a fake audio data array if needed
      const generateFakeAudioData = () => {
        const data = new Uint8Array(64);
        const currentTime = Date.now() * 0.001; // Convert to seconds for smoother animation
        
        for (let i = 0; i < data.length; i++) {
          // Create wave pattern with multiple frequencies
          data[i] = Math.max(10, Math.min(255, 
            100 + // base value
            Math.sin(currentTime * 1.5 + i * 0.1) * 40 + // slow wave
            Math.sin(currentTime * 3 + i * 0.3) * 30 + // medium wave
            Math.sin(currentTime * 5 + i * 0.5) * 15 + // fast wave
            (Math.random() * 20) // random noise
          ));
        }
        return data;
      };
      
      // Update function using both real and fake data
      const updateAudioData = () => {
        // Try to get real audio data first
        const realData = getAudioData();
        
        if (realData && realData.length > 0) {
          setAudioData(realData);
        } else {
          // Fall back to generated data
          setAudioData(generateFakeAudioData());
        }
        
        if (interfaceState === 'speaking') {
          animationFrameRef.current = requestAnimationFrame(updateAudioData);
        }
      };
      
      // Start the animation
      animationFrameRef.current = requestAnimationFrame(updateAudioData);
    }
    
    return () => {
      // Clean up animation frame on state change or unmount
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [interfaceState, getAudioData]);
  
  // Handle microphone button click
  const handleMicrophoneClick = async () => {
    console.log('Microphone clicked, current state:', interfaceState);

    // First-time initialization when user interacts
    if (!conversationReady) {
      console.log('First-time initialization of conversation');
      try {
        // Show a loading state during initialization
        setInterfaceState('thinking');
        
        // IMPORTANT: Wait for a moment to allow the conversation creation to fully complete in the database
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Only play the welcome message if there are no existing messages
        if (messages.length <= 1) {
          await initializeWelcomeMessage();
        } else {
          // Just set the state back to idle if we already have conversation history
          setInterfaceState('idle');
        }
        return; // Don't start listening on the first click
      } catch (error) {
        console.error('Error initializing conversation:', error);
        setError('Failed to start conversation. Please try again.');
        setInterfaceState('idle');
      }
    }
    
    // Stop speaking if the circle is clicked while speaking
    if (interfaceState === 'speaking') {
    console.log('Stopping speech playback');
    if (tts) {
      try {
        // Stop the speech
        tts.stop();
        
        // Reset interface state immediately
        setInterfaceState('idle');
    console.log('Speech stopped, interface reset to idle');
    } catch (error) {
      console.error('Error stopping speech:', error);
      setInterfaceState('idle');
    }
    } else {
    setInterfaceState('idle');
    }
    return;
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
    } else if (interfaceState === 'thinking') {
      // If in thinking state, just log it but don't take any action
      console.log('Currently thinking, click ignored');
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
  const containerClass = "w-full max-w-2xl px-4";

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

            <div className={containerClass + " mt-8"}>
              <SubtitleStyleDisplay messages={messages} />
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
