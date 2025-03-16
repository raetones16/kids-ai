import OpenAI from "openai";

export class AssistantService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }

    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Allow browser usage
      maxRetries: 2, // Reduce retries to speed up error responses
    });
    this.assistants = {};
    this.lastResponse = null; // Track the last response to avoid repetition
    
    // Add tracking for ongoing runs
    this.activeRuns = new Map(); // Track active runs
    
    // Polling configuration
    this.pollingConfig = {
      initialMessageCheckDelay: 150, // Start checking for messages sooner
      subsequentMessageCheckDelay: 200, // Frequency to check for new messages
      runStatusCheckFrequency: 3, // Check run status every N message checks
      maxPollingAttempts: 60, // Maximum polling attempts
    };
  }

  // Create or retrieve an assistant for a specific child
  async getAssistantForChild(childId, childProfile) {
    if (this.assistants[childId]) {
      return this.assistants[childId];
    }

    try {
      // Optimize instructions for shorter responses and faster processing
      const instructions = this.generateInstructions(childProfile);
      
      // Try to create a new assistant with child-specific instructions
      const assistant = await this.client.beta.assistants.create({
        name: `${childProfile.name}'s Assistant`,
        instructions,
        model: "gpt-4o-mini", // Using mini model for speed
      });

      this.assistants[childId] = assistant;
      return assistant;
    } catch (error) {
      console.error("Error creating assistant:", error);
      throw new Error("Failed to create AI assistant. Please try again later.");
    }
  }

  // Generate custom instructions based on child profile
  generateInstructions(childProfile) {
    // Calculate age based on date of birth
    let age = "";
    if (childProfile.dob) {
      const birthDate = new Date(childProfile.dob);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();

      // Adjust age if birthday hasn't occurred yet this year
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    } else if (childProfile.age) {
      // Fallback to age field for backward compatibility
      age = childProfile.age;
    } else {
      age = 8; // Default age if neither is provided
    }

    // Parse custom instructions to identify interests
    let interests = [];
    if (childProfile.customInstructions) {
      // Look for key phrases like "loves X" or "interested in Y"
      const interestPatterns = [
        /loves? (.*?)\./i,
        /enjoys? (.*?)\./i,
        /interested in (.*?)\./i,
        /likes? (.*?)\./i,
        /fan of (.*?)\./i,
      ];

      for (const pattern of interestPatterns) {
        const match = childProfile.customInstructions.match(pattern);
        if (match && match[1]) {
          interests.push(match[1].trim());
        }
      }
    }

    // More concise instructions for faster processing
    return `
      You are a friendly, helpful assistant for ${childProfile.name}, age ${age}.

      IMPORTANT INSTRUCTIONS FOR SPEED AND PERFORMANCE:
      - Keep responses very short and direct.
      - Aim for 1-3 sentences in most responses.
      - Get to the point immediately without excess context.
      - Response time is critical - be brief but helpful.
      - Start speaking without preamble or thinking time.
      - Use simpler vocabulary suitable for a ${age}-year-old.
      - Use British English in all responses.
      - Never repeat your previous responses.

      ${
        childProfile.customInstructions
          ? `Context about ${childProfile.name}: ${childProfile.customInstructions}`
          : ""
      }

      ${
        interests.length > 0
          ? `${childProfile.name} is interested in: ${interests.join(", ")}`
          : ""
      }
    `;
  }

  // Create a new thread for conversation
  async createThread() {
    try {
      const thread = await this.client.beta.threads.create();
      return thread.id;
    } catch (error) {
      console.error("Error creating thread:", error);
      throw new Error(
        "Failed to create conversation thread. Please try again later."
      );
    }
  }

  // Sync local conversation history with OpenAI thread
  async syncConversationHistory(threadId, messages) {
    try {
      // Filter out welcome messages and empty messages
      const filteredMessages = messages.filter(msg => 
        msg.content && 
        msg.content.trim() && 
        !msg.content.includes('Hello! Tap the circle to start talking with me')
      );
      
      // Only sync a reasonable number of previous messages (last 6 messages = 3 exchanges)
      const messagesToSync = filteredMessages.slice(-6);
      
      // If we only have the current message or no messages, just use the original thread
      if (messagesToSync.length <= 1) {
        console.log('Not enough meaningful conversation history to sync, using current thread');
        
        // Add the current message to the existing thread if there's only one message
        if (messagesToSync.length === 1) {
          const msg = messagesToSync[0];
          await this.client.beta.threads.messages.create(threadId, {
            role: msg.role,
            content: msg.content
          });
          console.log(`Added single ${msg.role} message to existing thread: "${msg.content.substring(0, 30)}..."`);
        }
        
        return threadId;
      }
      
      // Create a new thread for a clean start
      const newThreadId = await this.createThread();
      console.log(`Created new thread ${newThreadId} for history sync with ${messagesToSync.length} messages`);
      
      // Add messages in chronological order
      for (const msg of messagesToSync) {
        await this.client.beta.threads.messages.create(newThreadId, {
          role: msg.role,
          content: msg.content
        });
        console.log(`Added ${msg.role} message to thread: "${msg.content.substring(0, 30)}..."`);
      }
      
      return newThreadId;
    } catch (error) {
      console.error("Error syncing conversation history:", error);
      // Fall back to the original thread if sync fails
      return threadId;
    }
  }

  // Send a message and get a streaming response
  async sendMessage(childId, threadId, message, childProfile, onChunk, recentMessages = []) {
    try {
      const startTime = performance.now();
      console.log("Starting sendMessage at", startTime);
      
      // Get or create assistant for this child
      const assistant = await this.getAssistantForChild(childId, childProfile);

      // If we have recent messages, sync the thread with this history
      if (recentMessages && recentMessages.length > 0) {
        console.log(`Syncing ${recentMessages.length} recent messages with thread`);
        threadId = await this.syncConversationHistory(threadId, recentMessages);
        // Update the thread ID reference in the calling code
        if (typeof onChunk === 'function') {
          console.log(`Passing new thread ID back to caller: ${threadId}`);
          onChunk('', false, false, '', threadId); // Use the last parameter to pass back the new thread ID
        }
      } else {
        // Original thread verification code (only needed if we're not syncing)
        try {
          // Check if the thread exists and has a valid history
          const existingMessages = await this.client.beta.threads.messages.list(threadId);
          console.log(`Thread has ${existingMessages.data.length} existing messages`);
          
          // If the thread seems broken (empty or has tons of messages), create a new one
          if (existingMessages.data.length === 0 || existingMessages.data.length > 20) {
            console.log('Thread appears to be in a bad state, creating a new one');
            const newThreadId = await this.createThread();
            threadId = newThreadId;
          }
        } catch (error) {
          // If error accessing thread, create a new one
          console.error('Error accessing thread, creating a new one:', error);
          const newThreadId = await this.createThread();
          threadId = newThreadId;
        }

        // Add the user message to the thread
        await this.client.beta.threads.messages.create(threadId, {
          role: "user",
          content: message,
        });
      }
      
      console.log(`Message processing prepared in ${performance.now() - startTime}ms`);

      // Run the assistant on the thread
      const run = await this.client.beta.threads.runs.create(threadId, {
        assistant_id: assistant.id,
      });
      
      console.log(`Run created in ${performance.now() - startTime}ms`);

      // If streaming with callback function, use streaming approach
      if (typeof onChunk === "function") {
        return this.streamResponseOptimized(threadId, run.id, onChunk);
      } else {
        // Fallback to non-streaming for backward compatibility
        const response = await this.waitForCompletion(threadId, run.id);
        return response;
      }
    } catch (error) {
      console.error("Error sending message:", error);
      throw new Error("Failed to get AI response. Please try again later.");
    }
  }

  // Stream the assistant's response in chunks (highly optimized)
  async streamResponseOptimized(threadId, runId, onChunk) {
    const startTime = performance.now();
    let runStatus;
    let attempts = 0;
    let lastMessageId = null; // Track the last seen message ID
    let fullResponse = ""; // Collect the full response
    let lastPollingTime = 0;
    let isFirstChunk = true;
    
    // Create a state updater function outside the loop to avoid ESLint warnings
    const updateMessageState = (newLastMessageId, newFullResponse) => {
      lastMessageId = newLastMessageId;
      fullResponse = newFullResponse;
    };
    
    try {
      // Start parallel fetch of initial status and messages
      const [initialStatus, initialMessages] = await Promise.all([
        this.client.beta.threads.runs.retrieve(threadId, runId),
        this.client.beta.threads.messages.list(threadId),
      ]);
      
      console.log(`Initial status and messages retrieved in ${performance.now() - startTime}ms`);

      runStatus = initialStatus;
      
      // Check if we already have an answer (unlikely but possible)
      const gotInitialResponse = this.processMessages(
        initialMessages,
        lastMessageId,
        fullResponse,
        onChunk,
        runStatus,
        updateMessageState,
        isFirstChunk
      );
      
      if (gotInitialResponse) {
        isFirstChunk = false;
      }

      // Implement an optimized polling strategy
      while (runStatus.status === "in_progress" || runStatus.status === "queued") {
        // Calculate adaptive delay based on whether we have some response yet
        const currentDelay = fullResponse 
          ? this.pollingConfig.subsequentMessageCheckDelay 
          : this.pollingConfig.initialMessageCheckDelay;
          
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        
        // Time-based throttling of message fetching
        const currentTime = Date.now();
        const timeSinceLastPolling = currentTime - lastPollingTime;
        
        // Always check messages first (they appear before run completion)
        if (timeSinceLastPolling > 100) { // Ensure at least 100ms between message checks
          // eslint-disable-next-line no-await-in-loop
          const messages = await this.client.beta.threads.messages.list(threadId);
          lastPollingTime = currentTime;
          
          const gotNewResponse = this.processMessages(
            messages,
            lastMessageId,
            fullResponse,
            onChunk,
            runStatus,
            updateMessageState,
            isFirstChunk
          );
          
          if (gotNewResponse && isFirstChunk) {
            isFirstChunk = false;
            console.log(`Got first response chunk in ${performance.now() - startTime}ms`);
          }
        }
        
        // Check run status less frequently to reduce API calls
        if (attempts % this.pollingConfig.runStatusCheckFrequency === 0) {
          // eslint-disable-next-line no-await-in-loop
          runStatus = await this.client.beta.threads.runs.retrieve(threadId, runId);
          
          // If the run is completed, wrap up
          if (runStatus.status === "completed") {
            console.log(`Run completed in ${performance.now() - startTime}ms`);
            
            // Make one final check for messages to ensure we have everything
            // eslint-disable-next-line no-await-in-loop
            const finalMessages = await this.client.beta.threads.messages.list(threadId);
            this.processMessages(
              finalMessages,
              lastMessageId,
              fullResponse,
              onChunk,
              runStatus,
              updateMessageState,
              isFirstChunk
            );
            
            // Mark as complete with a final empty chunk
            onChunk("", false, true, fullResponse);
            break;
          } else if (runStatus.status !== "in_progress" && runStatus.status !== "queued") {
            throw new Error(`Run failed with status: ${runStatus.status}`);
          }
        }
        
        attempts++;
        
        // Safety check to avoid infinite loops
        if (attempts >= this.pollingConfig.maxPollingAttempts) {
          console.warn(`Exceeded maximum polling attempts (${this.pollingConfig.maxPollingAttempts}), stopping.`);
          break;
        }
      }
      
      // Store this response to check for repetition in the future
      this.lastResponse = fullResponse;
      
      return fullResponse;
    } catch (error) {
      console.error("Error in streaming response:", error);
      throw new Error("Failed to stream AI response. Please try again later.");
    }
  }

  // Helper method to process messages and extract new content
  processMessages(
    messages,
    lastMessageId,
    fullResponse,
    onChunk,
    runStatus,
    updateState,
    isFirstChunk = false
  ) {
    const assistantMessages = messages.data.filter(
      (msg) => msg.role === "assistant"
    );

    if (assistantMessages.length > 0) {
      const latestMessage = assistantMessages[0];

      // If we haven't seen this message yet or it's been updated
      if (
        lastMessageId !== latestMessage.id ||
        (lastMessageId === latestMessage.id && latestMessage.content.length > 0)
      ) {
        // Extract text content from the message
        if (latestMessage.content && latestMessage.content.length > 0) {
          const textContent = latestMessage.content.find(
            (item) => item.type === "text"
          );

          if (textContent) {
          const currentText = textContent.text.value;
          
          // Check for duplicate/repeating response (comparing with lastResponse)
          if (this.lastResponse && 
          currentText.startsWith(this.lastResponse.substring(0, 20)) &&
          this.lastResponse.length > 20) {
          console.warn("Detected potential repeated response - this shouldn't happen with the optimizations");
          }

          // For all message updates, we'll send the full current text to ensure consistency
          // This prevents issues with partial or mangled updates from the API
          if (fullResponse !== currentText) {
                // Send the complete new text rather than just a chunk
          // This prevents issues when the API changes parts of its response
          onChunk(
                  currentText, // Send the complete text as the chunk
            this.isGoodBreakpoint(currentText),
            runStatus.status === "completed",
            currentText,
          null // Placeholder for thread ID, not needed for regular chunks
          );

          // Update state with the full text
          updateState(latestMessage.id, currentText);
          return true;
              }
          }
        }

        // Update the message ID even if no new content
        updateState(latestMessage.id, fullResponse);
      }
    }

    return false;
  }

  // Poll for completion of the assistant's response (optimized)
  async waitForCompletion(threadId, runId) {
    let runStatus;
    let attempts = 0;
    const maxAttempts = 30; // Timeout after 30 attempts
    let initialDelay = 300; // Start with a shorter initial polling time

    // Poll for status with exponential backoff
    do {
      try {
        // Calculate delay with exponential backoff (but cap at 2 seconds)
        const currentDelay = Math.min(
          initialDelay * Math.pow(1.2, attempts),
          2000
        );

        // Wait before checking again
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        runStatus = await this.client.beta.threads.runs.retrieve(
          threadId,
          runId
        );
        attempts++;

        // If too many attempts, break out with an error
        if (attempts >= maxAttempts) {
          throw new Error("Response timed out. Please try again later.");
        }
      } catch (error) {
        console.error("Error checking run status:", error);
        throw new Error("Failed to get AI response. Please try again later.");
      }
    } while (
      runStatus.status === "in_progress" ||
      runStatus.status === "queued"
    );

    if (runStatus.status !== "completed") {
      throw new Error(`Run failed with status: ${runStatus.status}`);
    }

    try {
      // Get the messages after completion
      const messages = await this.client.beta.threads.messages.list(threadId);

      // Find the most recent assistant message
      const assistantMessages = messages.data.filter(
        (msg) => msg.role === "assistant"
      );
      if (assistantMessages.length === 0) {
        throw new Error("No assistant response found");
      }

      const latestMessage = assistantMessages[0];

      // Extract the text content
      if (latestMessage.content && latestMessage.content.length > 0) {
        const textContent = latestMessage.content.find(
          (item) => item.type === "text"
        );
        if (textContent) {
          const response = textContent.text.value;
          this.lastResponse = response; // Store this response
          return response;
        }
      }

      throw new Error("No text content found in assistant response");
    } catch (error) {
      console.error("Error retrieving messages:", error);
      throw new Error("Failed to get AI response. Please try again later.");
    }
  }

  // Helper method to determine if a text chunk ends at a good breakpoint for TTS
  isGoodBreakpoint(text) {
    // Check if the chunk ends with sentence-ending punctuation followed by a space
    const sentenceEndRegex = /[.!?]\s$/;
    if (sentenceEndRegex.test(text)) return true;

    // Check if the chunk ends with a comma, colon, or semicolon followed by a space
    const pausePunctuationRegex = /[,;:]\s$/;
    if (pausePunctuationRegex.test(text)) return true;

    // Check if the chunk is longer than 80 characters (arbitrary breakpoint for long text)
    if (text.length >= 80) return true;

    return false;
  }
}
