/**
 * MockAssistantService.js
 * A mock implementation of the AssistantService for development and testing.
 * This allows the app to function without requiring a connection to the OpenAI API.
 */

export class MockAssistantService {
  constructor() {
    this.assistants = {};
    this.threads = {};
    this.messages = {};
  }

  // Create or retrieve an assistant for a specific child
  async getAssistantForChild(childId, childProfile) {
    if (this.assistants[childId]) {
      return this.assistants[childId];
    }

    // Create a mock assistant
    const assistant = {
      id: `assistant-${Date.now()}-${childId}`,
      name: `${childProfile.name}'s Assistant`,
      instructions: this.generateInstructions(childProfile),
      model: "gpt-4o"
    };

    this.assistants[childId] = assistant;
    return assistant;
  }

  // Generate custom instructions based on child profile
  generateInstructions(childProfile) {
    // Calculate age based on date of birth
    let age = '';
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
    
    return `
      You are a friendly, helpful assistant for ${childProfile.name}, 
      who is ${age} years old.
      
      Always use age-appropriate language and concepts suitable for a ${age}-year-old child.
      ${childProfile.customInstructions ? `Additional context: ${childProfile.customInstructions}` : ''}
      
      Keep responses concise and engaging.
      If asked something inappropriate, gently redirect to a more suitable topic.
      
      Use British English in all your responses.
    `;
  }

  // Create a new thread for conversation
  async createThread() {
    // Simulate a delay for realism
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const threadId = `thread-${Date.now()}`;
    this.threads[threadId] = {
      id: threadId,
      messages: []
    };
    
    this.messages[threadId] = [];
    
    return threadId;
  }

  // Send a message and get a streaming response
  async sendMessage(childId, threadId, message, childProfile, onChunk, recentMessages = []) {
    // Store the thread and message history (for compatibility with new service)
    this.messages[threadId] = this.messages[threadId] || [];
    this.messages[threadId].push({
      role: "user",
      content: message
    });
    
    // Generate a mock response based on the message
    const response = this.generateResponse(message, childProfile);
    
    // Add assistant message to the thread
    this.messages[threadId].push({
      role: "assistant",
      content: response
    });
    
    // If onChunk is provided, simulate streaming behavior
    if (typeof onChunk === "function") {
      // Simulate a small initial delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Break the response into smaller chunks
      const words = response.split(' ');
      let streamedText = '';
      
      // Stream one word at a time with small delays
      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Add the next word plus a space
        const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
        streamedText += chunk;
        
        // Determine if this is a good breakpoint
        const isPausePoint = this.isSimulatedBreakpoint(i, words);
        const isComplete = i === words.length - 1;
        
        // Call the chunk callback
        onChunk(chunk, isPausePoint, isComplete, streamedText);
      }
      
      return response;
    }
    
    // If no callback provided, just return the full response after a simulated delay
    await new Promise(resolve => setTimeout(resolve, 1200));
    return response;
  }
  
  // Helper method to determine if this is a good breakpoint for TTS in mock mode
  isSimulatedBreakpoint(index, words) {
    // Create natural pauses in the response to simulate punctuation
    // We'll say every 4-6 words is a good break point
    return (index + 1) % Math.floor(Math.random() * 3 + 4) === 0;
  }
  
  // Helper method to format messages for compatibility with the Chat API
  formatMessagesForChatAPI(recentMessages, childProfile) {
    // This is just a compatibility method to match the interface
    return recentMessages;
  }
  
  // Generate a mock response
  generateResponse(message, childProfile) {
    const lowerMessage = message.toLowerCase();
    const name = childProfile.name;
    
    // Simple keyword-based responses
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return `Hello ${name}! It's lovely to chat with you today.`;
    }
    
    if (lowerMessage.includes('how are you')) {
      return `I'm doing well, thank you for asking! How are you feeling today, ${name}?`;
    }
    
    if (lowerMessage.includes('your name')) {
      return `I'm your AI assistant. I'm here to chat and help answer any questions you might have.`;
    }
    
    if (lowerMessage.includes('weather')) {
      return `I don't have real-time weather information, but I hope it's a lovely day where you are. What's your favourite type of weather, ${name}?`;
    }
    
    if (lowerMessage.includes('game') || lowerMessage.includes('play')) {
      return `I'd love to play a game! We could play I-spy, or I could ask you some fun riddles. Which would you prefer?`;
    }
    
    if (lowerMessage.includes('story')) {
      return `Once upon a time, there was a curious child named ${name} who loved to explore and discover new things. Would you like me to continue with the story?`;
    }
    
    if (lowerMessage.includes('animal')) {
      return `Animals are amazing! Did you know that elephants can't jump? What's your favourite animal, ${name}?`;
    }
    
    if (lowerMessage.includes('dinosaur')) {
      return `Dinosaurs are fascinating! The T-Rex was one of the largest carnivorous dinosaurs and lived about 68 million years ago. Which dinosaur do you like best?`;
    }
    
    if (lowerMessage.includes('space') || lowerMessage.includes('planet')) {
      return `Space is incredible! Our solar system has eight planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune. Earth is the only one we know has life on it.`;
    }
    
    // Default responses for when no keywords match
    const defaultResponses = [
      `That's an interesting thought, ${name}! Tell me more about it.`,
      `Thanks for sharing that with me. What else would you like to talk about?`,
      `That's fascinating! I'd love to hear more about what you think.`,
      `I'm enjoying our conversation, ${name}. What would you like to explore next?`,
      `That's a great question! I'm not entirely sure, but I'd love to learn about it together.`
    ];
    
    // Return a random default response
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  }
}
