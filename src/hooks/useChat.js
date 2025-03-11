import { useState, useRef, useEffect, useCallback } from 'react';
import { TextToSpeechService } from '../services/TextToSpeechService';
import { StorageService } from '../services/StorageService';
import { OpenAITTSService } from '../services/OpenAITTSService';

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
        if (USE_OPENAI_TTS) {
          textToSpeechRef.current = new OpenAITTSService(OPENAI_API_KEY);
          // Set to use Opus format for lower latency
          if (typeof textToSpeechRef.current.setResponseFormat === 'function') {
            textToSpeechRef.current.setResponseFormat('opus');
          }
          console.log('Using OpenAI TTS for voice output with Opus format');
        } else {
          textToSpeechRef.current = new TextToSpeechService();
          console.log('Using browser TTS for voice output');
        }
        
        // Set up TTS callbacks
        textToSpeechRef.current.onStart(() => {
          setInterfaceState('speaking');
        });
        
        textToSpeechRef.current.onEnd(() => {
          setInterfaceState('idle');
        });
        
        if (USE_OPENAI_TTS && textToSpeechRef.current.onError) {
          textToSpeechRef.current.onError((error) => {
            console.error('TTS error:', error);
            setInterfaceState('idle');
            
            try {
              const fallbackTTS = new TextToSpeechService();
              fallbackTTS.speak('I had a bit of trouble with my voice. Let me try again.');
            } catch (fallbackError) {
              console.error('Fallback TTS error:', fallbackError);
            }
          });
        }
        
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
      // IMPORTANT: Clear all existing messages to prevent repeats
      const userMessage = {
        role: 'user',
        content: input
      };
      
      // Replace the entire message history with just the previous messages and the new one
      setMessages(prev => {
        // Filter to get only the most recent context (up to 3 message pairs)
        const recentMessages = prev.slice(-6); // Keep last 6 messages (3 pairs of exchanges)
        return [...recentMessages, userMessage];
      });
      
      // Save to storage
      if (storageRef.current && conversationIdRef.current) {
        await storageRef.current.saveMessage(conversationIdRef.current, userMessage);
      }
      
      // Set thinking state
      setInterfaceState('thinking');
      console.log('Setting interface state to thinking');
      
      // Create a brand new placeholder message for the assistant response
      const tempAssistantMessage = {
        role: 'assistant',
        content: '',
        id: `assistant-${Date.now()}` // Add unique ID to prevent confusion
      };
      
      // Add placeholder message
      setMessages(prev => [...prev, tempAssistantMessage]);
      
      // Ensure audio context is initialized for streaming TTS
      if (USE_OPENAI_TTS && textToSpeechRef.current && 
          typeof textToSpeechRef.current.initAudioContext === 'function') {
        textToSpeechRef.current.initAudioContext();
      }
      
      // Get streaming response from assistant
      let fullResponse = '';
      let isFirstChunk = true;
      let lastSpeechChunk = '';
      
      // Track the current message for updates
      const messageId = tempAssistantMessage.id;
      
      // Start a timer to measure response time
      const startTime = Date.now();
      
      // Get streaming response from assistant
      const response = await assistantRef.current.sendMessage(
        childId,
        threadIdRef.current,
        input,
        childProfileRef.current,
        // Chunk handler callback
        async (chunk, isPausePoint, isComplete, fullText) => {
          // Update the accumulated response (for fallback)
          if (chunk && chunk.trim()) {
            fullResponse += chunk;
          }
          
          // Create a debug log for tracing
          if (chunk && chunk.trim()) {
            console.log(`Received chunk: "${chunk.substring(0, 20)}..." isPausePoint: ${isPausePoint}, isComplete: ${isComplete}`);
          }
          
          if (fullText) {
            console.log(`Full text provided: ${fullText.length} chars`);
          }
          
          // Use the complete text for message updates
          const displayText = fullText || fullResponse;
          
          // Only update the message if it contains actual content
          if (displayText && displayText.trim()) {
            // Update the message in state, ensuring we're updating the correct one
            setMessages(prev => {
              const updated = [...prev];
              // Find the assistant message with our specific ID and update only that one
              const assistantIndex = updated.findIndex(msg => 
                msg.role === 'assistant' && msg.id === messageId);
              
              if (assistantIndex >= 0) {
                updated[assistantIndex] = {
                  ...updated[assistantIndex],
                  content: displayText
                };
              }
              return updated;
            });
          }
          
          // Immediately start speaking after receiving the first good chunk
          if (isFirstChunk && chunk.length > 10) {
            console.log(`First chunk received in ${Date.now() - startTime}ms: "${chunk}"`);
            isFirstChunk = false;
            lastSpeechChunk = chunk;
            
            // Switch to speaking state 
            setInterfaceState('speaking');
            console.log('Setting interface state to speaking (first chunk)');
            
            // For first chunk, use the optimized streaming method if available
            if (textToSpeechRef.current && typeof textToSpeechRef.current.speakStreamOptimized === 'function') {
              await textToSpeechRef.current.speakStreamOptimized(chunk, 'nova');
            } else if (textToSpeechRef.current && typeof textToSpeechRef.current.speakStream === 'function') {
              await textToSpeechRef.current.speakStream(chunk, isPausePoint, isComplete);
            }
          } 
          // Process additional speech chunks if they're substantial or at a good break point
          else if (!isFirstChunk && ((chunk.length > 5 && isPausePoint) || isComplete)) {
            // Skip chunks we've already processed as part of larger chunks
            if (lastSpeechChunk.includes(chunk)) {
              console.log('Skipping chunk that was already processed in a larger chunk');
              return;
            }
            
            lastSpeechChunk = chunk;
            
            // For subsequent chunks or when complete, use the normal streaming method
            if (textToSpeechRef.current && typeof textToSpeechRef.current.speakStream === 'function') {
              await textToSpeechRef.current.speakStream(chunk, isPausePoint, isComplete);
            }
          }
          
          // For the final chunk when complete, process the full response if it's substantial
          if (isComplete && fullText && fullText.length > 0) {
            console.log(`Complete response received in ${Date.now() - startTime}ms, length: ${fullText.length} chars`);
            
            // If we didn't speak anything yet, speak the full response
            if (isFirstChunk) {
              isFirstChunk = false;
              console.log('Speaking complete response as no chunks were spoken yet');
              
              // Use the optimized streaming method for the full response
              if (textToSpeechRef.current && typeof textToSpeechRef.current.speakStreamOptimized === 'function') {
                await textToSpeechRef.current.speakStreamOptimized(fullText, 'nova');
              } else if (textToSpeechRef.current) {
                await textToSpeechRef.current.speak(fullText);
              }
            }
          }
        }
      );
      
      // Log timing information
      console.log(`Total response time: ${Date.now() - startTime}ms`);
      
      // Save the complete message to storage with the final full response
      if (storageRef.current && conversationIdRef.current) {
        const assistantMessage = {
          role: 'assistant',
          content: fullResponse
        };
        await storageRef.current.saveMessage(conversationIdRef.current, assistantMessage);
        
        // Make one final update to ensure the UI has the complete message
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
            // Final update with complete response
            updated[updated.length - 1] = {
              role: 'assistant',
              content: fullResponse
            };
          }
          return updated;
        });
      }
      
      // If we didn't use streaming TTS, fall back to regular TTS
      if (textToSpeechRef.current && 
          (!textToSpeechRef.current.speakStream || isFirstChunk === true)) {
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
      
      // Initialize audio context for OpenAI TTS
      if (USE_OPENAI_TTS && textToSpeechRef.current && 
          typeof textToSpeechRef.current.initAudioContext === 'function') {
        textToSpeechRef.current.initAudioContext();
      }
      
      // Set speaking state before TTS begins
      setInterfaceState('speaking');
      
      // Speak the welcome message now that audio context is initialized
      if (textToSpeechRef.current) {
        try {
          // Use optimized stream if available for welcome message
          if (typeof textToSpeechRef.current.speakStreamOptimized === 'function') {
            await textToSpeechRef.current.speakStreamOptimized(personalWelcomeMessage.content, 'nova');
          } else {
            await textToSpeechRef.current.speak(personalWelcomeMessage.content);
          }
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
