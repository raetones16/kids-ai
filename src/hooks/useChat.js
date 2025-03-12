import { useState, useRef, useEffect, useCallback } from 'react';
import { StorageService } from '../services/StorageService';
import { ChatTtsService } from '../services/ChatTtsService';

// Configuration flags from environment
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const USE_OPENAI_TTS = true; // Use OpenAI TTS instead of browser TTS

export function useChat(assistantService, childId, childName) {
  const [messages, setMessages] = useState([]);
  const [interfaceState, setInterfaceState] = useState('idle');
  const [isInitialized, setIsInitialized] = useState(false);

  // Store services in refs
  const storageRef = useRef(null);
  const textToSpeechRef = useRef(null);
  const threadIdRef = useRef(null);
  const conversationIdRef = useRef(null);
  const childProfileRef = useRef(null);
  const assistantRef = useRef(assistantService);
  const initPromiseRef = useRef(null);

  // Initialize services in a way that can be awaited
  const initialize = useCallback(async () => {
    // If we're already initialized or initializing, return the existing promise
    if (isInitialized) return Promise.resolve();
    if (initPromiseRef.current) return initPromiseRef.current;

    // Create a new initialization promise
    initPromiseRef.current = (async () => {
      try {
        console.log('Initializing chat services...');
        
        // Update the assistantRef
        assistantRef.current = assistantService;
        
        // Initialize storage service
        storageRef.current = new StorageService();
        
        // Set up text-to-speech service
        textToSpeechRef.current = new ChatTtsService(OPENAI_API_KEY);
        textToSpeechRef.current.initialize();
        console.log('Using unified TTS service with OpenAI TTS');
        
        // Set up TTS callbacks
        textToSpeechRef.current.onStart(() => {
          setInterfaceState('speaking');
        });
        
        textToSpeechRef.current.onEnd(() => {
          setInterfaceState('idle');
        });
        
        textToSpeechRef.current.onError((error) => {
          console.error('TTS error:', error);
          setInterfaceState('idle');
        });
        
        // Check if assistant service is available
        if (!assistantRef.current) {
          throw new Error('AI service not available');
        }

        // Load child profile
        const profile = await storageRef.current.getChildProfileById(childId);
        childProfileRef.current = profile || { 
          name: childName, 
          dob: new Date(Date.now() - 8 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 8 years old
          id: childId
        };
        
        // Create OpenAI thread
        console.log('Creating new conversation thread...');
        const threadId = await assistantRef.current.createThread();
        threadIdRef.current = threadId;
        
        // Create conversation record
        const conversationId = `conv-${Date.now()}`;
        conversationIdRef.current = conversationId;
        
        await storageRef.current.saveConversation({
          id: conversationId,
          childId: childProfileRef.current.id,
          threadId,
          messages: []
        });
        
        // Set up initial welcome message (don't speak yet)
        const welcomeMessage = {
          role: 'assistant',
          content: 'Hello! Tap the circle to start talking with me.'
        };
        
        setMessages([welcomeMessage]);
        setIsInitialized(true);
        console.log('Chat initialization complete!');
        
        return true;
      } catch (err) {
        console.error('Error initializing chat:', err);
        initPromiseRef.current = null; // Clear the promise so we can try again
        throw new Error('Failed to start conversation. Please try again.');
      }
    })();
    
    return initPromiseRef.current;
  }, [assistantService, childId, childName, isInitialized]);

  // Initialize on mount and when dependencies change
  useEffect(() => {
    initialize().catch(err => {
      console.error('Failed to initialize chat:', err);
    });
    
    // Cleanup on unmount
    return () => {
      if (textToSpeechRef.current) {
        textToSpeechRef.current.stop();
      }
    };
  }, [initialize]);

  // Process user input (from speech or text) with streaming response
  const processUserInput = async (input) => {
    if (!input || input.trim() === '') {
      console.error('Empty input received');
      return;
    }
    
    // Make sure we're fully initialized first
    if (!isInitialized) {
      try {
        await initialize();
      } catch (err) {
        console.error('Failed to initialize before processing input:', err);
        throw err;
      }
    }
    
    if (!assistantRef.current || !threadIdRef.current) {
      console.error('Cannot process input - missing dependencies');
      throw new Error('The AI service is not ready. Please try again in a moment.');
    }
    
    try {
      // Define the new user message
      const userMessage = {
        role: 'user',
        content: input
      };
      
      // Update the messages state with the new user message
      setMessages(prev => {
        return [...prev, userMessage];
      });
      
      // Save to storage
      if (storageRef.current && conversationIdRef.current) {
        await storageRef.current.saveMessage(conversationIdRef.current, userMessage);
      }
      
      // Set thinking state
      setInterfaceState('thinking');
      console.log('Setting interface state to thinking');
      
      // Create a placeholder for the assistant response
      const tempAssistantMessage = {
        role: 'assistant',
        content: '',
        id: `assistant-${Date.now()}` // Add unique ID
      };
      
      // Add placeholder message to the UI
      setMessages(prev => [...prev, tempAssistantMessage]);
      
      // Initialize audio context for streaming TTS
      if (USE_OPENAI_TTS && textToSpeechRef.current && 
          typeof textToSpeechRef.current.initAudioContext === 'function') {
        textToSpeechRef.current.initAudioContext();
      }
      
      // Get all conversation messages from storage for context
      const allMessages = await storageRef.current.getConversationMessages(conversationIdRef.current);
      
      // Variables for collecting the complete response
      let completeResponse = '';
      const messageId = tempAssistantMessage.id;
      
      // Start a timer to measure response time
      const startTime = Date.now();
      
      // Initialize audio context for TTS
      if (textToSpeechRef.current) {
        textToSpeechRef.current.initAudioContext();
      }
      
      // Process the streaming response from the API
      const response = await assistantRef.current.sendMessage(
        childId,
        threadIdRef.current,
        input,
        childProfileRef.current,
        // Process the streaming response with a simplified approach
        async (chunk, isPausePoint, isComplete, fullText) => {
          // Update the complete response with the full text when available
          if (fullText) {
            completeResponse = fullText;
          } else if (chunk) {
            completeResponse += chunk;
          }
          
          // Update the UI with the latest text
          setMessages(prev => {
            const updated = [...prev];
            const assistantIndex = updated.findIndex(msg => 
              msg.role === 'assistant' && msg.id === messageId);
            
            if (assistantIndex >= 0) {
              updated[assistantIndex] = {
                ...updated[assistantIndex],
                content: completeResponse
              };
            }
            return updated;
          });
          
          // Only when the response is complete, speak the entire text
          if (isComplete && completeResponse.trim()) {
            console.log(`Complete response received in ${Date.now() - startTime}ms, length: ${completeResponse.length} chars`);
            
            // Use our simplified TTS service to speak the complete response
            if (textToSpeechRef.current) {
              setInterfaceState('speaking');
              try {
                await textToSpeechRef.current.speak(completeResponse);
              } catch (error) {
                console.error('Error speaking text:', error);
                setInterfaceState('idle');
              }
            }
          }
        },
        // Pass the conversation history for context
        allMessages
      );
      
      // Log timing information
      console.log(`Total response time: ${Date.now() - startTime}ms`);
      
      // Save the complete assistant message to storage
      if (storageRef.current && conversationIdRef.current) {
        const assistantMessage = {
          role: 'assistant',
          content: completeResponse || response
        };
        await storageRef.current.saveMessage(conversationIdRef.current, assistantMessage);
      }
      
      return response;
    } catch (err) {
      console.error('Error processing input:', err);
      setInterfaceState('idle');
      throw new Error('Failed to get a response. Please try again.');
    }
  };

  // Initialize welcome message
  const initializeWelcomeMessage = async () => {
    // Make sure we're fully initialized first
    if (!isInitialized) {
      try {
        await initialize();
      } catch (err) {
        console.error('Failed to initialize before welcome message:', err);
        throw err;
      }
    }
    
    if (!conversationIdRef.current || !childProfileRef.current) {
      console.error('Cannot initialize welcome message - missing conversation or profile');
      throw new Error('The chat system is not ready yet. Please try again in a moment.');
    }
    
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
      
      // Initialize audio context for TTS
      if (textToSpeechRef.current) {
        textToSpeechRef.current.initAudioContext();
      }
      
      // Set speaking state before TTS begins
      setInterfaceState('speaking');
      
      // Speak the welcome message now that audio context is initialized
      if (textToSpeechRef.current) {
        try {
          await textToSpeechRef.current.speak(personalWelcomeMessage.content);
        } catch (err) {
          console.error('Error speaking welcome message:', err);
        }
      }
    } catch (error) {
      console.error('Error initializing welcome message:', error);
      throw error;
    }
  };

  // Get audio data for visualizations
  const getAudioData = useCallback(() => {
    if (textToSpeechRef.current && 
        interfaceState === 'speaking' && 
        typeof textToSpeechRef.current.getAudioData === 'function') {
      return textToSpeechRef.current.getAudioData();
    }
    return null;
  }, [interfaceState]);

  return {
    messages,
    interfaceState,
    setInterfaceState,
    processUserInput,
    initializeWelcomeMessage,
    getAudioData,
    conversationReady: isInitialized && !!threadIdRef.current,
    isInitialized,
    tts: textToSpeechRef.current
  };
}
