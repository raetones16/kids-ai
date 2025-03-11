import OpenAI from 'openai';

export class AssistantService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    this.client = new OpenAI({ 
      apiKey,
      dangerouslyAllowBrowser: true // Allow browser usage
    });
    this.assistants = {};
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
        model: "gpt-4o",
      });

      this.assistants[childId] = assistant;
      return assistant;
    } catch (error) {
      console.error('Error creating assistant:', error);
      throw new Error('Failed to create AI assistant. Please try again later.');
    }
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
    
    // Parse custom instructions to identify interests
    let interests = [];
    if (childProfile.customInstructions) {
      // Look for key phrases like "loves X" or "interested in Y"
      const interestPatterns = [
        /loves? (.*?)\./i,
        /enjoys? (.*?)\./i,
        /interested in (.*?)\./i,
        /likes? (.*?)\./i,
        /fan of (.*?)\./i
      ];
      
      for (const pattern of interestPatterns) {
        const match = childProfile.customInstructions.match(pattern);
        if (match && match[1]) {
          interests.push(match[1].trim());
        }
      }
    }
    
    return `
      You are a friendly, helpful assistant for ${childProfile.name}, who is ${age} years old.
      
      Always use age-appropriate language and concepts suitable for a ${age}-year-old child.
      
      ${childProfile.customInstructions ? `Additional context about ${childProfile.name} that may help you provide better responses: ${childProfile.customInstructions}` : ''}
      
      ${interests.length > 0 ? `While ${childProfile.name} has interests such as ${interests.join(', ')}, don't explicitly mention these unless they come up naturally in conversation. Let the child guide the topics of discussion.` : ''}
      
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
      console.error('Error creating thread:', error);
      throw new Error('Failed to create conversation thread. Please try again later.');
    }
  }

  // Send a message and get a response
  async sendMessage(childId, threadId, message, childProfile) {
    try {
      // Get or create assistant for this child
      const assistant = await this.getAssistantForChild(childId, childProfile);
      
      // Add the user message to the thread
      await this.client.beta.threads.messages.create(threadId, {
        role: "user",
        content: message
      });
      
      // Run the assistant on the thread
      const run = await this.client.beta.threads.runs.create(threadId, {
        assistant_id: assistant.id
      });
      
      // Wait for completion
      const response = await this.waitForCompletion(threadId, run.id);
      return response;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to get AI response. Please try again later.');
    }
  }
  
  // Poll for completion of the assistant's response
  async waitForCompletion(threadId, runId) {
    let runStatus;
    let attempts = 0;
    const maxAttempts = 30; // Timeout after 30 attempts (approximately 30 seconds)
    
    // Poll for status
    do {
      try {
        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.client.beta.threads.runs.retrieve(threadId, runId);
        attempts++;
        
        // If too many attempts, break out with an error
        if (attempts >= maxAttempts) {
          throw new Error('Response timed out. Please try again later.');
        }
      } catch (error) {
        console.error('Error checking run status:', error);
        throw new Error('Failed to get AI response. Please try again later.');
      }
    } while (runStatus.status === 'in_progress' || runStatus.status === 'queued');
    
    if (runStatus.status !== 'completed') {
      throw new Error(`Run failed with status: ${runStatus.status}`);
    }
    
    try {
      // Get the messages after completion
      const messages = await this.client.beta.threads.messages.list(threadId);
      
      // Find the most recent assistant message
      const assistantMessages = messages.data.filter(msg => msg.role === "assistant");
      if (assistantMessages.length === 0) {
        throw new Error("No assistant response found");
      }
      
      const latestMessage = assistantMessages[0];
      
      // Extract the text content
      if (latestMessage.content && latestMessage.content.length > 0) {
        const textContent = latestMessage.content.find(item => item.type === 'text');
        if (textContent) {
          return textContent.text.value;
        }
      }
      
      throw new Error("No text content found in assistant response");
    } catch (error) {
      console.error('Error retrieving messages:', error);
      throw new Error('Failed to get AI response. Please try again later.');
    }
  }
}
