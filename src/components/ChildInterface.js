import React, { useState, useEffect, useRef } from 'react';
import './ChildInterface.css';
import SimpleCircleAnimation from './SimpleCircleAnimation';
import SubtitleDisplay from './SubtitleDisplay';
import { AssistantService } from '../services/AssistantService';
import { MockAssistantService } from '../services/MockAssistantService';
import { SpeechRecognitionService } from '../services/SpeechRecognitionService';
import { TextToSpeechService } from '../services/TextToSpeechService';
import { StorageService } from '../services/StorageService';

// Get API key from environment variable
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

// Flag to use real API instead of mock service
const USE_REAL_API = true;

// Simple flag to prevent multiple initializations
let isInitialized = false;

const ChildInterface = ({ childId, childName, onLogout }) => {
  const [interfaceState, setInterfaceState] = useState('idle');
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [error, setError] = useState(null);
  
  // Store services in refs
  const assistantRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const textToSpeechRef = useRef(null);
  const storageRef = useRef(null);
  const threadIdRef = useRef(null);
  const conversationIdRef = useRef(null);
  const childProfileRef = useRef(null);

  // One-time initialization
  useEffect(() => {
    // Prevent double initialization
    if (isInitialized) return;
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
    
    try {
      speechRecognitionRef.current = new SpeechRecognitionService();
      
      // Set up speech recognition callbacks
      speechRecognitionRef.current.onResult((transcript) => {
        console.log('Got speech result:', transcript);
        processUserInput(transcript);
      });
      
      speechRecognitionRef.current.onEnd(() => {
        setInterfaceState('idle');
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
    
    try {
      textToSpeechRef.current = new TextToSpeechService();
      
      // Set up text-to-speech callbacks
      textToSpeechRef.current.onStart(() => {
        setInterfaceState('speaking');
      });
      
      textToSpeechRef.current.onEnd(() => {
        setInterfaceState('idle');
      });
    } catch (err) {
      console.error('Failed to initialize text-to-speech:', err);
    }
    
    // Set up conversation
    const setupConversation = async () => {
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
        
        // Add welcome message
        const welcomeMessage = {
          role: 'assistant',
          content: `Hello ${childProfileRef.current.name}! What would you like to talk about today?`
        };
        
        setMessages([welcomeMessage]);
        
        await storageRef.current.saveMessage(conversationId, welcomeMessage);
        
        // Speak welcome message
        if (textToSpeechRef.current) {
          setTimeout(() => {
            textToSpeechRef.current.speak(welcomeMessage.content);
          }, 500);
        }
      } catch (err) {
        console.error('Error setting up conversation:', err);
        setError('Failed to start conversation. Please try again.');
        setShowTextInput(true); // Always show text input on error
      }
    };
    
    setupConversation();
    
    // Cleanup on unmount
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      if (textToSpeechRef.current) {
        textToSpeechRef.current.stop();
      }
      isInitialized = false;
    };
  }, [childId, childName, OPENAI_API_KEY]); // Only run once

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
      
      // Speak response
      if (textToSpeechRef.current) {
        textToSpeechRef.current.speak(response);
      }
    } catch (err) {
      console.error('Error processing input:', err);
      setInterfaceState('idle');
      setError('Failed to get a response. Please try again.');
    }
  };

  // Handle microphone button click
  const handleMicrophoneClick = () => {
    if (interfaceState === 'idle') {
      setInterfaceState('listening');
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.start();
      } else {
        setError('Speech recognition is not available');
        setShowTextInput(true);
      }
    } else if (interfaceState === 'listening') {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setInterfaceState('idle');
    }
  };

  // Handle text input submit
  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!textInput.trim() || interfaceState !== 'idle') return;
    
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
              <SimpleCircleAnimation state={interfaceState} />
              <div className="mic-hint">
                {interfaceState === 'idle' && 'Tap to talk'}
                {interfaceState === 'listening' && 'Listening...'}
                {interfaceState === 'thinking' && 'Thinking...'}
                {interfaceState === 'speaking' && 'Speaking...'}
              </div>
            </div>

            <SubtitleDisplay messages={messages} />
            
            <button className="text-toggle-button" onClick={toggleTextInput}>
              {showTextInput ? 'Hide Text Input' : 'Show Text Input'}
            </button>
            
            {showTextInput && (
              <form className="text-input-form" onSubmit={handleTextSubmit}>
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
            )}
            
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
