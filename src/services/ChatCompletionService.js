import OpenAI from "openai";

export class ChatCompletionService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }

    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Allow browser usage
      maxRetries: 2, // Reduce retries to speed up error responses
    });

    // Track the last response to avoid repetition
    this.lastResponse = null;
    
    // Maximum number of past messages to include for context
    this.maxContextMessages = 10;
  }

  // Create empty thread ID - just for compatibility
  async createThread() {
    // Instead of creating a thread, we just return a unique identifier
    // that will be used to track the conversation in local storage
    return `chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // Generate custom instructions based on child profile
  generateSystemPrompt(childProfile) {
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

  // Send a message and get a streaming response
  async sendMessage(childId, threadId, message, childProfile, onChunk, recentMessages = []) {
    try {
      const startTime = performance.now();
      console.log("Starting sendMessage at", startTime);
      
      // Format recent messages in the format expected by the ChatCompletion API
      const formattedMessages = this.formatMessagesForChatAPI(recentMessages, childProfile);
      
      // Add the new message
      formattedMessages.push({
        role: "user",
        content: message
      });

      // Log the messages we're sending to the API
      console.log(`Sending ${formattedMessages.length} messages to Chat API`);
      
      // Create a streaming response
      const stream = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: formattedMessages,
        stream: true,
        temperature: 0.7, // Balance between creativity and consistency
        max_tokens: 150,  // Limit response length for faster replies
      });

      let fullResponse = "";
      
      // Process the stream
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          
          // Call the chunk callback with the content
          const isPausePoint = this.isGoodBreakpoint(content);
          
          if (onChunk) {
            onChunk(
              content,
              isPausePoint,
              chunk.choices[0]?.finish_reason === "stop",
              fullResponse
            );
          }
        } else if (chunk.choices[0]?.finish_reason === "stop") {
          // If this is the final chunk, make sure we send a signal with the complete text
          if (onChunk) {
            // First call with the current chunk if it exists
            if (content) {
              const isPausePoint = this.isGoodBreakpoint(content);
              onChunk(content, isPausePoint, false, fullResponse);
            }
            
            // Then call to signal completion
            onChunk("", true, true, fullResponse);
          }
        }
      }
      
      // Store this response to check for repetition in the future
      this.lastResponse = fullResponse;
      
      console.log(`Chat completion completed in ${performance.now() - startTime}ms`);
      return fullResponse;
    } catch (error) {
      console.error("Error sending message:", error);
      throw new Error("Failed to get AI response. Please try again later.");
    }
  }
  
  // Format messages for the Chat API
  formatMessagesForChatAPI(recentMessages, childProfile) {
    // Start with the system prompt
    const formattedMessages = [{
      role: "system",
      content: this.generateSystemPrompt(childProfile)
    }];
    
    // Add up to maxContextMessages recent messages, ignoring welcome message
    const filteredMessages = recentMessages.filter(msg => 
      !msg.content?.includes('Hello! Tap the circle to start talking with me')
    );
    
    // Take only the most recent messages up to our limit
    const messagesToInclude = filteredMessages.slice(-this.maxContextMessages);
    
    // Format and add each message
    messagesToInclude.forEach(msg => {
      formattedMessages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      });
    });
    
    return formattedMessages;
  }

  // Helper method to determine if a text chunk ends at a good breakpoint for TTS
  isGoodBreakpoint(text) {
    // Check if the chunk ends with sentence-ending punctuation followed by a space
    const sentenceEndRegex = /[.!?]\s*$/;
    if (sentenceEndRegex.test(text)) return true;

    // Check if the chunk ends with a comma, colon, or semicolon followed by a space
    const pausePunctuationRegex = /[,;:]\s*$/;
    if (pausePunctuationRegex.test(text)) return true;

    // Check if the chunk is longer than 80 characters (arbitrary breakpoint for long text)
    if (text.length >= 80) return true;

    return false;
  }
}
