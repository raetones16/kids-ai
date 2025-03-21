import { useState, useRef, useEffect, useCallback } from 'react';
import { StorageService } from '../services/StorageService';
import { ChatTtsService } from '../services/ChatTtsService';

// Configuration flags
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

  // Initialize services and create conversation (this will only be called when the first question is asked)
  const initialize = useCallback(async () => {
    // If we're fully initialized including conversation, return
    if (isInitialized && threadIdRef.current && conversationIdRef.current) {
      return Promise.resolve();
    }
    
    // If we're still initializing, return the existing promise
    if (initPromiseRef.current) return initPromiseRef.current;

    // Create a new initialization promise to fully set up the conversation
    initPromiseRef.current = (async () => {
      try {
        console.log('Initializing chat services...');
        
        // Update the assistantRef
        assistantRef.current = assistantService;
        
        // Initialize storage service
        storageRef.current = new StorageService();
        
        // Set up text-to-speech service
        textToSpeechRef.current = new ChatTtsService();
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

  // Initialize on mount with welcome message
  useEffect(() => {
    // Just set up initial welcome message (don't create conversation yet)
    const welcomeMessage = {
      role: 'assistant',
      content: 'Hello! Tap the circle to start talking with me.'
    };
    
    setMessages([welcomeMessage]);
    
    // Initialize the TTS service
    if (!textToSpeechRef.current) {
      textToSpeechRef.current = new ChatTtsService();
      textToSpeechRef.current.initialize();
      
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
    }
    
    setIsInitialized(true);
    
    // Cleanup on unmount
    return () => {
      if (textToSpeechRef.current) {
        textToSpeechRef.current.stop();
      }
    };
  }, []);

  // Process user input (from speech or text) with streaming response
  const processUserInput = async (input) => {
    if (!input || input.trim() === '') {
      console.error('Empty input received');
      return;
    }
    
    // Check if we're already processing this exact input
    const lastUserMessage = messages.find(msg => msg.role === 'user');
    if (lastUserMessage && lastUserMessage.content === input) {
      console.log('Duplicate user message detected, not processing again');
      return;
    }
    
    // This is the user's first question, so we need to create a conversation
    // at this point, not before
    try {
      await initialize();
      // Add a small delay to ensure database operations complete
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (err) {
      console.error('Failed to initialize conversation for first question:', err);
      throw err;
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
      
      // Debug logging for diagnosing conversation and message saving issues
      console.log(`Saving user message to conversation: ${conversationIdRef.current}`);

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
        textToSpeechRef.current.initAudioContext({forceNew: true});
      }
      
      // Get all conversation messages from storage for context
      const allMessages = await storageRef.current.getConversationMessages(conversationIdRef.current);
      
      // Variables for collecting the complete response
      let completeResponse = '';
      const messageId = tempAssistantMessage.id;
      
      // Track if we received a new thread ID during processing
      let updatedThreadId = null;
      
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
        async (chunk, isPausePoint, isComplete, fullText, stateOrThreadId) => {
          // If we receive a new thread ID, update our reference
          if (stateOrThreadId && typeof stateOrThreadId === 'string' && stateOrThreadId.startsWith('thread_')) {
            updatedThreadId = stateOrThreadId;
            threadIdRef.current = stateOrThreadId;
            return;
          } 
          // If we received a state change (e.g., 'searching')
          else if (stateOrThreadId && typeof stateOrThreadId === 'string') {
            setInterfaceState(stateOrThreadId);
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
            // IMPORTANT: Only speak if we're not already speaking
            if (textToSpeechRef.current && interfaceState !== 'speaking') {
              setInterfaceState('speaking');
              try {
                await textToSpeechRef.current.speak(completeResponse);
              } catch (error) {
                console.error('Error speaking text:', error);
                // Ensure we reset to idle state on any TTS error
                setInterfaceState('idle');
                
                // Also make sure all TTS services are properly stopped to prevent audio issues
                if (textToSpeechRef.current) {
                  try {
                    textToSpeechRef.current.stop();
                  } catch (stopError) {
                    console.error('Additional error while stopping TTS:', stopError);
                  }
                }
                
                // Force browser TTS to stop as well
                if (window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
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
      // But ONLY if we didn't get a thread ID update during processing,
      // as that means the API is already handling message saving
      if (storageRef.current && conversationIdRef.current && !updatedThreadId) {
        const assistantMessage = {
          role: 'assistant',
          content: completeResponse || response
        };
        
        try {
          console.log(`Attempting to save assistant message to conversation ${conversationIdRef.current}`);
          await storageRef.current.saveMessage(conversationIdRef.current, assistantMessage);
          console.log('Successfully saved assistant message to storage');
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
      } else if (updatedThreadId) {
        console.log(`Not saving message to storage - thread was synced during processing. New thread ID: ${updatedThreadId}`);
      }
      
      return response;
    } catch (err) {
      console.error('Error processing input:', err);
      setInterfaceState('idle');
      throw new Error('Failed to get a response. Please try again.');
    }
  };

  // This function is no longer used - the welcome message is now handled by the initial state
  // Since it's referenced in the interface, we'll keep it as a no-op function that just returns
  const initializeWelcomeMessage = async () => {
    console.log('Welcome message function called but no longer used');
    return;
  };

  // Get audio data for visualizations
  const getAudioData = useCallback(() => {
    if (textToSpeechRef.current && 
        interfaceState === 'speaking' && 
        typeof textToSpeechRef.current.getAudioData === 'function') {
      // Get the audio data
      const audioData = textToSpeechRef.current.getAudioData();
      
      // If the TTS service isn't actually returning audio data,
      // generate some fake audio data for visualization
      if (!audioData || audioData.length === 0) {
        const fakeAudioData = new Uint8Array(128);
        for (let i = 0; i < fakeAudioData.length; i++) {
          // Create a more dynamic curve with some randomness
          const time = Date.now() * 0.003;
          const position = i / fakeAudioData.length;
          
          // Combine multiple sine waves for more interesting movement
          const value = 
            Math.sin(time + position * 8) * 30 + 
            Math.sin(time * 1.5 + position * 4) * 15 + 
            Math.sin(time * 0.5 + position * 12) * 10 + 
            Math.random() * 15;
          
          // Scale to appropriate range (0-255)
          fakeAudioData[i] = Math.max(0, Math.min(255, 50 + value));
        }
        console.log('Generated fake audio data for visualization');
        return fakeAudioData;
      }
      
      return audioData;
    }
    
    // Always return some data when in speaking state for consistent animation
    if (interfaceState === 'speaking') {
      const fakeAudioData = new Uint8Array(128);
      for (let i = 0; i < fakeAudioData.length; i++) {
        const time = Date.now() * 0.003;
        const position = i / fakeAudioData.length;
        const value = 
          Math.sin(time + position * 8) * 30 + 
          Math.sin(time * 1.5 + position * 4) * 15 + 
          Math.random() * 20;
        fakeAudioData[i] = Math.max(0, Math.min(255, 50 + value));
      }
      return fakeAudioData;
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
    // Only mark as conversation ready when we have initialized the basic services, not the actual conversation
    // The conversation will be created when the first question is asked
    conversationReady: isInitialized,
    isInitialized,
    tts: textToSpeechRef.current
  };
}