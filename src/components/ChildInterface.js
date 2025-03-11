/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import './ChildInterface.css';
import CircleAnimation from './CircleAnimation';
import SubtitleDisplay from './SubtitleDisplay';
import { AssistantService } from '../services/AssistantService';
import { MockAssistantService } from '../services/MockAssistantService';
import { SpeechRecognitionService } from '../services/SpeechRecognitionService';
import { TextToSpeechService } from '../services/TextToSpeechService';
import { OpenAITTSService } from '../services/OpenAITTSService';
import { StorageService } from '../services/StorageService';

// Get API key from environment variable
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

// Flags for services
const USE_REAL_API = true;
const USE_OPENAI_TTS = true; // Use OpenAI TTS instead of browser TTS

// Simple flag to prevent multiple initializations
let isInitialized = false;

const ChildInterface = ({ childId, childName, onLogout }) => {
  const [interfaceState, setInterfaceState] = useState('idle');
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [error, setError] = useState(null);
  const [audioData, setAudioData] = useState(null);
  
  // Store services in refs
  const assistantRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const textToSpeechRef = useRef(null);
  const storageRef = useRef(null);
  const threadIdRef = useRef(null);
  const conversationIdRef = useRef(null);
  const childProfileRef = useRef(null);

  // Log state changes
  useEffect(() => {
    console.log(`Interface state changed to: ${interfaceState}`);
  }, [interfaceState]);

  // One-time initialization
  useEffect(() => {
    if (isInitialized) return;
    
    const setupServices = () => {
      isInitialized = true;
      console.log('Initializing services (one-time)');
      
      // Create service instances
      storageRef.current = new StorageService();
      
      // Initialize the real or mock assistant based on flag
      if (USE_REAL_API) {
        assistantRef.current = new AssistantService(OPENAI_API_KEY);
        console.log('Using real OpenAI API');
      } else {
        assistantRef.current = new MockAssistantService();
        console.log('Using mock AI service');
      }
      
      // Set up welcome message (don't speak yet)
      const welcomeMessage = {
        role: 'assistant',
        content: 'Hello! Tap the circle to start talking with me.'
      };
      setMessages([welcomeMessage]);
    };
    
    setupServices();
    
    // The below code doesn't use interfaceState or processUserInput from the closure
    // It sets up event handlers that will use the latest state values at the time they're called
    const setupSpeechRecognition = () => {
      try {
        speechRecognitionRef.current = new SpeechRecognitionService();
        
        // Set up speech recognition callbacks
        speechRecognitionRef.current.onResult((transcript) => {
          console.log('Got speech result:', transcript);
          processUserInput(transcript);
        });
        
        speechRecognitionRef.current.onEnd(() => {
          console.log('Speech recognition ended');
          // Only set to idle if we're still in listening state
          if (interfaceState === 'listening') {
            console.log('Setting state to idle after speech recognition ended');
            setInterfaceState('idle');
          }
        });
        
        speechRecognitionRef.current.onError((error) => {
          console.error('Speech recognition error:', error);
          setInterfaceState('idle');
          setShowTextInput(true); // Show text input on error
          
          // Show error message
          const errorMessage = {
            role: 'assistant',
            content: "I didn't catch that. Could you please try typing instead?"
          };
          setMessages(prev => [...prev, errorMessage]);
        });
      } catch (err) {
        console.error('Failed to initialize speech recognition:', err);
        setShowTextInput(true); // Show text input if speech fails
      }
    };
    
    setupSpeechRecognition();
    
    const setupTTS = () => {
      try {
        // Initialize either OpenAI TTS or browser TTS based on flag
        if (USE_OPENAI_TTS) {
          textToSpeechRef.current = new OpenAITTSService(OPENAI_API_KEY);
          console.log('Using OpenAI TTS for voice output');
        } else {
          textToSpeechRef.current = new TextToSpeechService();
          console.log('Using browser TTS for voice output');
        }
        
        // Set up text-to-speech callbacks
        textToSpeechRef.current.onStart(() => {
          setInterfaceState('speaking');
        });
        
        textToSpeechRef.current.onEnd(() => {
          setInterfaceState('idle');
        });
        
        // Set up error callback for OpenAI TTS
        if (USE_OPENAI_TTS && textToSpeechRef.current.onError) {
          textToSpeechRef.current.onError((error) => {
            console.error('TTS error:', error);
            setInterfaceState('idle');
            
            // Fallback to browser TTS if OpenAI TTS fails
            try {
              const fallbackTTS = new TextToSpeechService();
              fallbackTTS.speak('I had a bit of trouble with my voice. Let me try again.');
            } catch (fallbackError) {
              console.error('Fallback TTS error:', fallbackError);
            }
          });
        }
      } catch (err) {
        console.error('Failed to initialize text-to-speech:', err);
      }
    };
    
    setupTTS();
    
    // Prepare the conversation but don't start speaking yet
    const prepareConversation = async () => {
      try {
        // Load child profile
        const profile = await storageRef.current.getChildProfileById(childId);
        childProfileRef.current = profile || { 
          name: childName, 
          age: 8,
          id: childId
        };
        
        // Create thread
        const threadId = await assistantRef.current.createThread();
        threadIdRef.current = threadId;
        
        // Create conversation
        const conversationId = `conv-${Date.now()}`;
        conversationIdRef.current = conversationId;
        
        await storageRef.current.saveConversation({
          id: conversationId,
          childId: childProfileRef.current.id,
          threadId,
          messages: []
        });
      } catch (err) {
        console.error('Error preparing conversation:', err);
        setError('Failed to start conversation. Please try again.');
        setShowTextInput(true); // Always show text input on error
      }
    };
    
    prepareConversation();
    
    // Set up animation frame for audio visualization
    let animationFrameId;
    
    const updateAudioData = () => {
      if (textToSpeechRef.current && 
          interfaceState === 'speaking' && 
          typeof textToSpeechRef.current.getAudioData === 'function') {
        const data = textToSpeechRef.current.getAudioData();
        setAudioData(data);
      }
      animationFrameId = requestAnimationFrame(updateAudioData);
    };
    
    animationFrameId = requestAnimationFrame(updateAudioData);
    
    // Cleanup on unmount
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      if (textToSpeechRef.current) {
        textToSpeechRef.current.stop();
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      isInitialized = false;
    };
  }, [childId, childName]); // OPENAI_API_KEY is not a valid dependency since it's not from props or state

  // Process user input (from speech or text)
  const processUserInput = async (input) => {
    if (!input || !assistantRef.current || !threadIdRef.current) {
      console.error('Cannot process input - missing dependencies');
      return;
    }
    
    try {
      // Add user message to state
      const userMessage = {
        role: 'user',
        content: input
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Save to storage
      if (storageRef.current && conversationIdRef.current) {
        await storageRef.current.saveMessage(conversationIdRef.current, userMessage);
      }
      
      // Set thinking state
      setInterfaceState('thinking');
      console.log('Setting interface state to thinking');
      
      // Get response from assistant
      const response = await assistantRef.current.sendMessage(
        childId,
        threadIdRef.current,
        input,
        childProfileRef.current
      );
      
      // Add assistant message to state
      const assistantMessage = {
        role: 'assistant',
        content: response
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Save to storage
      if (storageRef.current && conversationIdRef.current) {
        await storageRef.current.saveMessage(conversationIdRef.current, assistantMessage);
      }
      
      // Change state to speaking
      setInterfaceState('speaking');
      console.log('Setting interface state to speaking');
      
      // Speak response
      if (textToSpeechRef.current) {
        // Ensure audio context is initialized
        if (USE_OPENAI_TTS && typeof textToSpeechRef.current.initAudioContext === 'function') {
          textToSpeechRef.current.initAudioContext();
        }
        
        try {
          await textToSpeechRef.current.speak(response);
        } catch (ttsError) {
          console.error('Error during speech synthesis:', ttsError);
          // Fallback to browser TTS
          try {
            const fallbackTTS = new TextToSpeechService();
            fallbackTTS.speak(response);
          } catch (fallbackError) {
            console.error('Fallback TTS error:', fallbackError);
          }
        }
      }
    } catch (err) {
      console.error('Error processing input:', err);
      setInterfaceState('idle');
      setError('Failed to get a response. Please try again.');
    }
  };

  // Handle microphone button click
  const handleMicrophoneClick = async () => {
    console.log('Microphone clicked, current state:', interfaceState);

    // First-time initialization when user interacts
    if (!conversationIdRef.current) {
      console.log('First-time initialization of conversation');
      try {
        // Set the actual personalized welcome message now that we know the user's name
        const personalWelcomeMessage = {
          role: 'assistant',
          content: `Hello ${childProfileRef.current?.name || 'there'}! What would you like to talk about today?`
        };
        
        setMessages([personalWelcomeMessage]);
        
        // Save the message to conversation if we have a conversation ID
        if (conversationIdRef.current) {
          await storageRef.current.saveMessage(conversationIdRef.current, personalWelcomeMessage);
        }
        
        // Initialize audio context for OpenAI TTS
        if (USE_OPENAI_TTS && textToSpeechRef.current && typeof textToSpeechRef.current.initAudioContext === 'function') {
          textToSpeechRef.current.initAudioContext();
        }
        
        // Speak the welcome message now that audio context is initialized
        if (textToSpeechRef.current) {
          try {
            await textToSpeechRef.current.speak(personalWelcomeMessage.content);
          } catch (err) {
            console.error('Error speaking welcome message:', err);
            // Fallback to browser TTS if OpenAI TTS fails
            try {
              const fallbackTTS = new TextToSpeechService();
              fallbackTTS.speak(personalWelcomeMessage.content);
            } catch (fallbackError) {
              console.error('Fallback TTS error:', fallbackError);
            }
          }
        }
        
        return; // Don't start listening on the first click
      } catch (error) {
        console.error('Error initializing conversation:', error);
      }
    }
    
    // Normal microphone behavior after initialization
    if (interfaceState === 'idle') {
      // Make sure audio context is initialized
      if (USE_OPENAI_TTS && textToSpeechRef.current && typeof textToSpeechRef.current.initAudioContext === 'function') {
        textToSpeechRef.current.initAudioContext();
      }
      
      setInterfaceState('listening');
      console.log('Starting speech recognition');
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.start();
        } catch (error) {
          console.error('Error starting speech recognition:', error);
          setError('Speech recognition failed to start. Please try again.');
          setInterfaceState('idle');
        }
      } else {
        console.error('Speech recognition not available');
        setError('Speech recognition is not available');
        setShowTextInput(true);
      }
    } else if (interfaceState === 'listening') {
      console.log('Stopping speech recognition');
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping speech recognition:', error);
        }
      }
      setInterfaceState('idle');
    }
  };

  // Handle text input submit
  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!textInput.trim() || interfaceState !== 'idle') return;
    
    // Make sure audio context is initialized
    if (USE_OPENAI_TTS && textToSpeechRef.current && typeof textToSpeechRef.current.initAudioContext === 'function') {
      textToSpeechRef.current.initAudioContext();
    }
    
    await processUserInput(textInput.trim());
    setTextInput('');
  };

  // Toggle text input visibility
  const toggleTextInput = () => {
    setShowTextInput(!showTextInput);
  };

  return (
    <div className="child-interface">
      <div className="interface-header">
        <h1>Hi, {childName}!</h1>
        <button className="logout-button" onClick={onLogout}>
          Sign Out
        </button>
      </div>

      <div className="main-content">
        {error ? (
          <div className="error-container">
            <div className="error-message">{error}</div>
            <button className="retry-button" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="circle-container" onClick={handleMicrophoneClick}>
              <CircleAnimation state={interfaceState} audioData={audioData} />
              <div className="mic-hint">
                {interfaceState === 'idle' && 'Tap to talk'}
                {interfaceState === 'listening' && 'Listening...'}
                {interfaceState === 'thinking' && 'Thinking...'}
                {interfaceState === 'speaking' && 'Speaking...'}
              </div>
            </div>

            <SubtitleDisplay messages={messages} />
            
            <button 
              className={`keyboard-toggle ${showTextInput ? 'active' : ''}`} 
              onClick={toggleTextInput}
              aria-label="Toggle keyboard input"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="12" x="3" y="6" rx="2" />
                <line x1="7" y1="10" x2="7" y2="10" />
                <line x1="12" y1="10" x2="12" y2="10" />
                <line x1="17" y1="10" x2="17" y2="10" />
                <line x1="7" y1="14" x2="17" y2="14" />
              </svg>
              <span className="keyboard-label">Type</span>
            </button>
            
            <form 
              className={`text-input-form ${!showTextInput ? 'hidden' : ''}`} 
              onSubmit={handleTextSubmit}
            >
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={interfaceState !== 'idle'}
                />
                <button 
                  type="submit" 
                  disabled={interfaceState !== 'idle' || !textInput.trim()}
                >
                  Send
                </button>
              </form>
            
            {!USE_REAL_API && (
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

export default ChildInterface;
