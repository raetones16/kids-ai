import OpenAI from "openai";

export class AssistantService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }

    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Allow browser usage
    });
    this.assistants = {};
    this.lastResponse = null; // Track the last response to avoid repetition
  }

  // Create or retrieve an assistant for a specific child
  async getAssistantForChild(childId, childProfile) {
    if (this.assistants[childId]) {
      return this.assistants[childId];
    }

    try {
      // Try to create a new assistant with child-specific instructions
      const assistant = await this.client.beta.assistants.create({
        name: `${childProfile.name}'s Assistant`,
        instructions: this.generateInstructions(childProfile),
        model: "gpt-4o-mini",
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

    return `
      You are a friendly, helpful assistant for ${
        childProfile.name
      }, who is ${age} years old.

      Always use age-appropriate language and concepts suitable for a ${age}-year-old child.
      
      IMPORTANT: Always respond to the child's most recent question with a fresh response. Never repeat your previous responses.
      Each interaction should be treated as new - don't append your previous responses to new ones.

      ${
        childProfile.customInstructions
          ? `Additional context about ${childProfile.name} that may help you provide better responses: ${childProfile.customInstructions}`
          : ""
      }

      ${
        interests.length > 0
          ? `While ${childProfile.name} has interests such as ${interests.join(
              ", "
            )}, don't explicitly mention these unless they come up naturally in conversation. Let the child guide the topics of discussion.`
          : ""
      }

      Keep responses concise, engaging, and appropriate for a ${age}-year-old.
      If asked something inappropriate, gently redirect to a more suitable topic.

      Use British English in all your responses.

      Never begin conversations by directly asking if they want to talk about their specific interests. Start with open-ended questions or general friendly greetings.
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

  // Send a message and get a streaming response
  async sendMessage(childId, threadId, message, childProfile, onChunk) {
    try {
      // Get or create assistant for this child
      const assistant = await this.getAssistantForChild(childId, childProfile);

      // First, verify the thread is in a good state
      try {
        // Check if the thread exists and has a valid history
        const existingMessages = await this.client.beta.threads.messages.list(threadId);
        console.log(`Thread has ${existingMessages.data.length} existing messages`);
        
        // If the thread seems broken (empty or has tons of messages), create a new one
        if (existingMessages.data.length === 0 || existingMessages.data.length > 50) {
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

      // Run the assistant on the thread
      const run = await this.client.beta.threads.runs.create(threadId, {
        assistant_id: assistant.id,
      });

      // If streaming with callback function, use streaming approach
      if (typeof onChunk === "function") {
        return this.streamResponse(threadId, run.id, onChunk);
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

  // Stream the assistant's response in chunks (optimized)
  async streamResponse(threadId, runId, onChunk) {
    let runStatus;
    let attempts = 0;
    const maxAttempts = 60; // Longer max timeout for streaming
    let lastMessageId = null; // Track the last seen message ID
    let fullResponse = ""; // Collect the full response
    let polling = true;
    let initialDelay = 200; // Start with a short delay
    let runResolved = false;

    try {
      // Immediately check for messages and status in parallel
      const [initialStatus, initialMessages] = await Promise.all([
        this.client.beta.threads.runs.retrieve(threadId, runId),
        this.client.beta.threads.messages.list(threadId),
      ]);

      runStatus = initialStatus;

      // First check for initial messages
      this.processMessages(
        initialMessages,
        lastMessageId,
        fullResponse,
        onChunk,
        runStatus,
        (newLastMessageId, newFullResponse) => {
          lastMessageId = newLastMessageId;
          fullResponse = newFullResponse;
        }
      );

      // Setup polling with exponential backoff
      const pollForUpdates = async () => {
        if (!polling) return;

        try {
          // Adaptive polling - check messages first, run status less frequently
          const messages = await this.client.beta.threads.messages.list(
            threadId
          );

          this.processMessages(
            messages,
            lastMessageId,
            fullResponse,
            onChunk,
            runStatus,
            (newLastMessageId, newFullResponse) => {
              lastMessageId = newLastMessageId;
              fullResponse = newFullResponse;
            }
          );

          // Only check run status every 3 attempts to reduce API calls
          if (attempts % 3 === 0 || !fullResponse) {
            runStatus = await this.client.beta.threads.runs.retrieve(
              threadId,
              runId
            );
          }

          // If we have a response and run is completed, we're done
          if (runStatus.status === "completed") {
            runResolved = true;
            polling = false;

            // Send one final call with the complete message
            if (fullResponse) {
              // Call the chunk callback with a special flag to indicate this is the full response
              onChunk("", false, true, fullResponse);
              
              // Store this response to check for repetition in the future
              this.lastResponse = fullResponse;
            }
            return;
          } else if (
            runStatus.status !== "in_progress" &&
            runStatus.status !== "queued"
          ) {
            runResolved = true;
            polling = false;
            throw new Error(`Run failed with status: ${runStatus.status}`);
          }

          // Increment attempts counter
          attempts++;

          // Implement exponential backoff with a maximum delay
          const exponentialDelay = Math.min(
            initialDelay * Math.pow(1.2, attempts),
            800
          );

          // If we have some content already, poll faster
          const delay = fullResponse
            ? Math.min(exponentialDelay, 400)
            : exponentialDelay;

          // Check if we've exceeded max attempts
          if (attempts >= maxAttempts) {
            polling = false;
            throw new Error("Response timed out. Please try again later.");
          }

          // Schedule next poll
          await new Promise((resolve) => setTimeout(resolve, delay));
          await pollForUpdates();
        } catch (error) {
          if (!runResolved) {
            console.error("Error during polling:", error);
            polling = false;
            throw error;
          }
        }
      };

      // Start polling
      await pollForUpdates();

      // Final check to make sure we have the complete response
      if (fullResponse === "") {
        const finalMessages = await this.client.beta.threads.messages.list(
          threadId
        );
        const assistantMessages = finalMessages.data.filter(
          (msg) => msg.role === "assistant"
        );

        if (assistantMessages.length > 0) {
          const latestMessage = assistantMessages[0];

          if (latestMessage.content && latestMessage.content.length > 0) {
            const textContent = latestMessage.content.find(
              (item) => item.type === "text"
            );
            if (textContent) {
              fullResponse = textContent.text.value;
              // Send any remaining content
              await onChunk(fullResponse, true, true, fullResponse);
              
              // Store this response to check for repetition in the future
              this.lastResponse = fullResponse;
            }
          }
        }
      }

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
    updateState
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

            // If we have new content, send just the new part to the callback
            if (currentText.length > fullResponse.length) {
              const newChunk = currentText.substring(fullResponse.length);

              // Check if the chunk ends with a sentence or reasonable pause point
              const isPausePoint = this.isGoodBreakpoint(newChunk);

              // Call the chunk callback with the new text and the full text
              // This way the consumer can choose which one to use
              onChunk(
                newChunk,
                isPausePoint,
                runStatus.status === "completed",
                currentText
              );

              // Update state
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
    const maxAttempts = 30; // Timeout after 30 attempts (approximately 30 seconds)
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
