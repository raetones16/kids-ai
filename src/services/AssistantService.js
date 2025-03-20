/**
 * AssistantService.js
 * Service for interacting with OpenAI Assistants API through our backend proxy
 */

export class AssistantService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
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
      // Call the backend API to create a new assistant
      const response = await fetch(`${this.baseUrl}/ai/assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ childId, childProfile }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create AI assistant');
      }
      
      const data = await response.json();
      this.assistants[childId] = data.assistant;
      return data.assistant;
    } catch (error) {
      console.error("Error creating assistant:", error);
      throw new Error("Failed to create AI assistant. Please try again later.");
    }
  }

  // Create a new thread for conversation
  async createThread() {
    try {
      const response = await fetch(`${this.baseUrl}/ai/thread`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create conversation thread');
      }
      
      const data = await response.json();
      return data.threadId;
    } catch (error) {
      console.error("Error creating thread:", error);
      throw new Error("Failed to create conversation thread. Please try again later.");
    }
  }

  // Send a message and get a streaming response
  async sendMessage(childId, threadId, message, childProfile, onChunk, recentMessages = []) {
    try {
      const startTime = performance.now();
      console.log("Starting sendMessage at", startTime);
      
      // Get or create assistant for this child
      const assistant = await this.getAssistantForChild(childId, childProfile);

      // Call the backend API to send the message
      const response = await fetch(`${this.baseUrl}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          childId,
          threadId,
          message,
          assistantId: assistant.id,
          recentMessages
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }
      
      const data = await response.json();
      
      // Update the thread ID if it changed
      if (data.threadId && data.threadId !== threadId) {
        console.log(`Thread ID changed from ${threadId} to ${data.threadId}`);
        threadId = data.threadId;
        if (typeof onChunk === 'function') {
          onChunk('', false, false, '', threadId);
        }
      }
      
      // Process the response text
      if (typeof onChunk === "function") {
        // Since we don't have true streaming from the backend yet, 
        // we'll simulate it by breaking up the response
        this.simulateStreamingResponse(data.response, onChunk);
      }
      
      // Store this response to check for repetition in the future
      this.lastResponse = data.response;
      
      return data.response;
    } catch (error) {
      console.error("Error sending message:", error);
      throw new Error("Failed to get AI response. Please try again later.");
    }
  }
  
  // Simulate streaming by breaking up the response into chunks
  simulateStreamingResponse(fullText, onChunk) {
    if (!fullText || typeof onChunk !== 'function') return;
    
    // Break the text into sentences
    const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];
    let accumulatedText = '';
    
    // Send each sentence as a chunk with a small delay
    sentences.forEach((sentence, index) => {
      setTimeout(() => {
        accumulatedText += sentence;
        const isLast = index === sentences.length - 1;
        
        onChunk(
          accumulatedText,
          this.isGoodBreakpoint(accumulatedText),
          isLast,
          accumulatedText
        );
        
        // Send final empty chunk to mark completion
        if (isLast) {
          setTimeout(() => {
            onChunk('', false, true, fullText);
          }, 100);
        }
      }, index * 150); // Small delay between chunks
    });
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
