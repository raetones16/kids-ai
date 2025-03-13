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
        try {
          const profile = await storageRef.current.getChildProfileById(childId);
          
          // Create default profile if none found
          if (!profile) {
            childProfileRef.current = { 
              name: childName, 
              dob: '30/08/2016', // Default DOB 
              id: childId
            };
            console.log('No profile found, created default profile:', childProfileRef.current);
            
            // Set custom instructions based on name
            if (childName === 'James') {
              childProfileRef.current.customInstructions = 'James loves fortnite and playing with his friends. He is good at math. His dad is Tim and mum Karolina and he lives in York UK.';
            } else if (childName === 'Oli') {
              childProfileRef.current.customInstructions = 'Oli loves science, making things, watching youtube and learning. His dad is Tim and mum Karolina and he lives in York UK.';
            }
          } else {
            // Start with the database profile
            childProfileRef.current = {
              ...profile,
              id: childId
            };
            
            // Ensure we have correct DOB format and custom instructions
            if (profile.name === 'James') {
              if (!childProfileRef.current.customInstructions) {
                childProfileRef.current.customInstructions = 'James loves fortnite and playing with his friends. He is good at math. His dad is Tim and mum Karolina and he lives in York UK.';
              }
              console.log('Applied values for James');
            } else if (profile.name === 'Oli') {
              if (!childProfileRef.current.customInstructions) {
                childProfileRef.current.customInstructions = 'Oli loves science, making things, watching youtube and learning. His dad is Tim and mum Karolina and he lives in York UK.';
              }
              console.log('Applied values for Oli');
            } else {
              console.log('Using database profile for:', profile.name);
            }
          }
          
          // Log the final profile for debugging
          console.log('Final child profile for chat:', childProfileRef.current);
          if (childProfileRef.current.customInstructions) {
            console.log('Profile has custom instructions:', childProfileRef.current.customInstructions);
          } else {
            console.log('WARNING: Profile has no custom instructions!');
          }
        } catch (profileError) {
          console.error('Error loading child profile:', profileError);
          // Use a default profile with custom instructions
          childProfileRef.current = { 
            name: childName, 
            dob: '30/08/2016',
            id: childId
          };
          
          // Set custom instructions based on name even in error case
          if (childName === 'James') {
            childProfileRef.current.customInstructions = 'James loves fortnite and playing with his friends. He is good at math. His dad is Tim and mum Karolina and he lives in York UK.';
          } else if (childName === 'Oli') {
            childProfileRef.current.customInstructions = 'Oli loves science, making things, watching youtube and learning. His dad is Tim and mum Karolina and he lives in York UK.';
          }
          
          console.log('Created fallback profile with custom instructions:', childProfileRef.current);
        }
        
        // Create OpenAI thread and conversation if needed
        try {
          if (!threadIdRef.current) {
            console.log('Creating new thread as none exists');
            const threadId = await assistantRef.current.createThread();
            threadIdRef.current = threadId;
          }
        
          // Create or verify conversation record
          if (!conversationIdRef.current) {
            console.log('No conversation ID yet, creating new one');
            conversationIdRef.current = `conv-${Date.now()}`;
          }
        
          // Try to save conversation to ensure it exists in backend
          try {
            console.log(`Ensuring conversation ${conversationIdRef.current} exists for child ${childProfileRef.current.id}`);
            await storageRef.current.saveConversation({
              id: conversationIdRef.current,
              childId: childProfileRef.current.id,
              threadId: threadIdRef.current,
              messages: []
            });
            console.log(`Conversation ${conversationIdRef.current} successfully created or verified`);
          } catch (saveError) {
            console.error('Error saving conversation during initialization:', saveError);
            // We'll continue anyway - the app will try to recreate it when needed
          }
        } catch (error) {
          console.error('Error during thread/conversation creation:', error);
          // Continue anyway, the app will retry when needed
        }
        
        // Now that we have a valid conversation ID, load any existing messages
        let existingMessages = [];
        try {
          existingMessages = await storageRef.current.getConversationMessages(conversationIdRef.current);
          console.log(`Loaded ${existingMessages.length} existing messages`);
        } catch (msgError) {
          console.error('Error loading conversation messages:', msgError);
          // Will continue with empty message array
        }
        
        // If we have existing messages, use them, otherwise set up initial welcome message
        if (existingMessages.length > 0) {
          setMessages(existingMessages);
        } else {
          // Set up initial welcome message (don't speak yet)
          const welcomeMessage = {
            role: 'assistant',
            content: 'Hello! Tap the circle to start talking with me.'
          };
          
          setMessages([welcomeMessage]);
        }
        
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
        // Add a small delay to ensure database operations complete
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (err) {
        console.error('Failed to initialize before processing input:', err);
        throw err;
      }
    }
    
    if (!assistantRef.current) {
      console.error('Cannot process input - missing assistant service');
      throw new Error('The AI service is not ready. Please try again in a moment.');
    }
    
    // If threadId or conversationId is missing, create a new conversation
    if (!threadIdRef.current || !conversationIdRef.current) {
      console.log('Missing thread or conversation ID, creating new ones...');
      try {
        // Create a new OpenAI thread
        const threadId = await assistantRef.current.createThread();
        threadIdRef.current = threadId;
        
        // Create a new conversation ID
        const conversationId = `conv-${Date.now()}`;
        conversationIdRef.current = conversationId;
        
        console.log(`Created new thread (${threadId}) and conversation (${conversationId})`);
        
        // Create conversation record in database
        await storageRef.current.saveConversation({
          id: conversationId,
          childId: childProfileRef.current.id,
          threadId,
          messages: []
        });
      } catch (err) {
        console.error('Error creating new conversation during message processing:', err);
        // Continue anyway - we'll use local storage as fallback
      }
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
      
      // Try to save to storage, with fallback handling
      if (storageRef.current && conversationIdRef.current) {
        // First verify conversation exists
        try {
          // Try to get the conversation
          await storageRef.current.getConversationById(conversationIdRef.current)
            .catch(async error => {
              // If not found, create it
              if (error.message && error.message.includes('not found')) {
                console.log('Conversation not found before message, creating it now');
                await storageRef.current.saveConversation({
                  id: conversationIdRef.current,
                  childId: childProfileRef.current.id,
                  threadId: threadIdRef.current,
                  messages: []
                });
              }
            });
          
          // Now try to save the message
          await storageRef.current.saveMessage(conversationIdRef.current, userMessage);
        } catch (storageError) {
          console.error('Error saving user message to storage:', storageError);
          // If the error is that the conversation doesn't exist, create it
          if (storageError.message && storageError.message.includes('not found')) {
            try {
              console.log('Conversation not found, attempting to recreate it...');
              await storageRef.current.saveConversation({
                id: conversationIdRef.current,
                childId: childProfileRef.current.id,
                threadId: threadIdRef.current,
                messages: [userMessage]
              });
              console.log('Successfully recreated conversation');
            } catch (recreateError) {
              console.error('Failed to recreate conversation:', recreateError);
            }
          }
        }
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
        async (chunk, isPausePoint, isComplete, fullText, state) => {
          // If we receive a state change (e.g., 'searching')
          if (state) {
            setInterfaceState(state);
            return;
          }
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
        
        try {
          await storageRef.current.saveMessage(conversationIdRef.current, assistantMessage);
        } catch (saveError) {
          console.error('Error saving assistant message to storage:', saveError);
          // If the conversation still doesn't exist, try one more time to create it with both messages
          if (saveError.message && saveError.message.includes('not found')) {
            try {
              console.log('Still could not find conversation, recreating with all messages...');
              await storageRef.current.saveConversation({
                id: conversationIdRef.current,
                childId: childProfileRef.current.id,
                threadId: threadIdRef.current,
                messages: [
                  { role: 'user', content: input },
                  assistantMessage
                ]
              });
            } catch (finalError) {
              console.error('Final attempt to save conversation failed:', finalError);
            }
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
      // Check if we already have messages from conversation history
      const existingMessages = await storageRef.current.getConversationMessages(conversationIdRef.current);
      
      // If we already have messages, just use those and don't speak a welcome message
      if (existingMessages && existingMessages.length > 0) {
        console.log(`Using ${existingMessages.length} existing messages instead of welcome message`);
        setMessages(existingMessages);
        setInterfaceState('idle');
        return;
      }
      
      // Otherwise, set the actual personalized welcome message now that we know the user's name
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
