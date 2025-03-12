import { useState, useEffect, useRef, useCallback } from 'react';
import { SpeechRecognitionService } from '../services/SpeechRecognitionService';

export function useSpeechRecognition(interfaceState, setInterfaceState, onSpeechResult) {
  const [error, setError] = useState(null);
  const speechRecognitionRef = useRef(null);
  const initializedRef = useRef(false);
  
  // Store the callbacks in refs to avoid dependency changes
  const interfaceStateRef = useRef(interfaceState);
  const setInterfaceStateRef = useRef(setInterfaceState);
  const onSpeechResultRef = useRef(onSpeechResult);
  
  // Update the refs when the callbacks change
  useEffect(() => {
    interfaceStateRef.current = interfaceState;
    setInterfaceStateRef.current = setInterfaceState;
    onSpeechResultRef.current = onSpeechResult;
  }, [interfaceState, setInterfaceState, onSpeechResult]);

  // Initialize speech recognition only once
  useEffect(() => {
    if (initializedRef.current) return;
    
    try {
      speechRecognitionRef.current = new SpeechRecognitionService();
      initializedRef.current = true;
      
      // Set a shorter pause threshold (1 second)
      if (typeof speechRecognitionRef.current.setPauseThreshold === 'function') {
        speechRecognitionRef.current.setPauseThreshold(1000); // 1 second
      }
      
      // Set up speech recognition callbacks
      speechRecognitionRef.current.onResult((transcript) => {
        console.log('Got speech result:', transcript);
        // Only process non-empty transcripts
        if (transcript && transcript.trim()) {
          onSpeechResultRef.current(transcript);
        } else {
          console.log('Ignoring empty transcript');
          // Reset to idle state if we got an empty transcript
          setInterfaceStateRef.current('idle');
        }
      });
      
      speechRecognitionRef.current.onEnd(() => {
        console.log('Speech recognition ended');
        // Only set to idle if we're still in listening state
        if (interfaceStateRef.current === 'listening') {
          console.log('Setting state to idle after speech recognition ended');
          setInterfaceStateRef.current('idle');
        }
      });
      
      speechRecognitionRef.current.onError((error) => {
        console.error('Speech recognition error:', error);
        setInterfaceStateRef.current('idle');
        setError("I didn't catch that. Could you please try typing instead?");
      });
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      setError('Speech recognition is not available');
      initializedRef.current = false;
    }
    
    // Cleanup on unmount
    return () => {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping speech recognition during cleanup:', error);
        }
      }
    };
  }, []); // Empty dependency array with refs used inside to avoid re-initialization

  // Start listening
  const startListening = useCallback(() => {
    if (!speechRecognitionRef.current || !initializedRef.current) {
      console.error('Speech recognition not initialized');
      setError('Speech recognition is not available');
      return false;
    }
    
    setInterfaceState('listening');
    console.log('Starting speech recognition');
    
    try {
      speechRecognitionRef.current.start();
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setError('Speech recognition failed to start. Please try again.');
      setInterfaceState('idle');
      return false;
    }
  }, [setInterfaceState, setError]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!speechRecognitionRef.current || !initializedRef.current) {
      return false;
    }
    
    console.log('Stopping speech recognition');
    try {
      speechRecognitionRef.current.stop();
      setInterfaceState('idle');
      return true;
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
      return false;
    }
  }, [setInterfaceState]);

  return {
    startListening,
    stopListening,
    error,
    setError,
    isAvailable: initializedRef.current && !!speechRecognitionRef.current
  };
}
