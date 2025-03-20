/**
 * ChatCompletionService.js
 * Service for interacting with OpenAI Chat Completions API through our backend proxy
 */

import SearchService from "./SearchService";
import ContentSafetyService from "./safety/ContentSafetyService";

export class ChatCompletionService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

    // Track the last response to avoid repetition
    this.lastResponse = null;

    // Maximum number of past messages to include for context
    this.maxContextMessages = 10;
  }

  // Create empty thread ID - just for compatibility
  async createThread() {
    // We no longer need to call the backend API for thread creation
    // Just return a local ID for compatibility
    return `chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // Generate custom instructions based on child profile
  generateSystemPrompt(childProfile) {
    // Calculate age based on date of birth
    let age = 8; // Default age if calculation fails
    if (childProfile.dob) {
      try {
        // Log the DOB to help with debugging
        console.log(`Calculating age from DOB: ${childProfile.dob}`);
        
        // Handle different date formats consistently
        let birthDate;
        // Check if the date is in DD/MM/YYYY format
        if (childProfile.dob.includes('/')) {
          const [day, month, year] = childProfile.dob.split('/');
          birthDate = new Date(year, month - 1, day); // Month is 0-based in JS Date
        } else {
          // Assume ISO format (YYYY-MM-DD)
          birthDate = new Date(childProfile.dob);
        }
        
        const today = new Date();
        
        // Check if the date is valid
        if (isNaN(birthDate.getTime())) {
          console.error('Invalid date format for DOB:', childProfile.dob);
        } else {
          // Calculate age
          age = today.getFullYear() - birthDate.getFullYear();

          // Adjust age if birthday hasn't occurred yet this year
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          
          console.log(`Calculated age: ${age} (DOB: ${childProfile.dob})`);
        }
      } catch (err) {
        console.error('Error calculating age:', err);
        // Keep the default age of 8
      }
    } else if (childProfile.age) {
      // Fallback to age field for backward compatibility
      age = childProfile.age;
      console.log(`Using explicit age from profile: ${age}`);
    } else {
      console.log(`No DOB or age found, using default age: ${age}`);
    }

    // Parse custom instructions for debugging
    // No longer using parsed interests
    if (childProfile.customInstructions) {
      // Log the custom instructions to verify they're being loaded
      console.log(`Custom instructions loaded for ${childProfile.name || 'child'}:`, childProfile.customInstructions);
    } else {
      console.log(`No custom instructions found for ${childProfile.name || 'child'}`);
    }

    // Add current date and time for better contextual awareness
    const now = new Date();

    // Define explicit date formatting to avoid any locale issues
    const day = now.getDate();
    const month = now.getMonth() + 1; // getMonth() is zero-based
    const year = now.getFullYear();

    // Format is handled in the date string assembly below

    // Format time (HH:MM)
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const formattedTime = `${hours}:${minutes}`;

    // Get day of week
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayOfWeek = daysOfWeek[now.getDay()];

    const dateTimeInfo = `Today's date is ${day} ${
      [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ][now.getMonth()]
    } ${year}. The current time is ${formattedTime}. Today is ${dayOfWeek}.`;

    // More concise instructions for faster processing
    let basePrompt = `
      You are a friendly, helpful assistant for ${
        childProfile.name || "the child"
      }, age ${age}.

      ${dateTimeInfo}

      CRITICAL PERSONAL INFORMATION YOU MUST REMEMBER:
      - ${childProfile.name}'s name is ${childProfile.name}.
      - ${childProfile.name} is ${age} years old.
      ${childProfile.customInstructions ? `- Personal details: ${childProfile.customInstructions}` : ""}

      IMPORTANT INSTRUCTIONS FOR INTERACTIONS:
      - Keep responses very short and direct.
      - Aim for 1-3 sentences in most responses.
      - Get to the point immediately without excess context.
      - Response time is critical - be brief but helpful.
      - Start speaking without preamble or thinking time.
      - Use simpler vocabulary suitable for a ${age}-year-old.
      - Use British English in all responses.
      - Never repeat your previous responses.
      - If asked about the current date, time, or day of the week, always use the accurate information provided above.
      - IMPORTANT: Today's date is exactly ${day} ${
      [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ][now.getMonth()]
    } ${year}.
      - When asked about current events, provide the latest information directly without mentioning that you're using web search.
      - FACTUAL ACCURACY: For questions about current world facts (e.g., presidents, sports, games like Fortnite, movies), prioritize any search information provided to you over your training data. This is critical for giving correct answers.

      MOST IMPORTANT INSTRUCTION: When ${
        childProfile.name
      } asks any personal question about themselves, their name, their family, their hobbies, or where they live, ALWAYS answer using the personal information provided above. NEVER say you don't know this information.
    `;

    // Enhance the system prompt with age-appropriate safety instructions
    return ContentSafetyService.enhanceSystemPromptWithSafeguards(
      basePrompt,
      age
    );
  }

  // Send a message and get a streaming response
  async sendMessage(
    childId,
    threadId,
    message,
    childProfile,
    onChunk,
    recentMessages = []
  ) {
    try {
      const startTime = performance.now();
      console.log("Starting sendMessage at", startTime);

      // Format recent messages in the format expected by the ChatCompletion API
      const formattedMessages = this.formatMessagesForChatAPI(
        recentMessages,
        childProfile
      );

      // Debug log the child profile and system prompt
      console.log("Using child profile:", childProfile);
      console.log("Full system prompt:\n", formattedMessages[0]?.content);

      // Calculate age for content filtering
      let age = 8; // Default age
      if (childProfile?.dob) {
        // Use the same date parsing logic as in generateSystemPrompt
        let birthDate;
        if (childProfile.dob.includes('/')) {
          const [day, month, year] = childProfile.dob.split('/');
          birthDate = new Date(year, month - 1, day);
        } else {
          birthDate = new Date(childProfile.dob);
        }
        
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();

        // Adjust age if birthday hasn't occurred yet this year
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        console.log(`Content filtering age calculated: ${age} (DOB: ${childProfile.dob})`);
      } else if (childProfile?.age) {
        age = childProfile.age;
        console.log(`Using explicit age from profile for filtering: ${age}`);
      }

      // Only screen for completely inappropriate content
      if (ContentSafetyService.containsBlockedTopic(message)) {
        console.log("Blocked topic detected in user message");
        // Instead of performing a search, provide a safe alternative response
        formattedMessages.push({
          role: "system",
          content:
            "The user has asked about an inappropriate topic. Respond with a gentle redirection without specifically repeating any inappropriate terms they used.",
        });

        // Add the original message for context, but we've added instructions above
        formattedMessages.push({
          role: "user",
          content: message,
        });
      } else {
        // For most topics, just handle normally
        formattedMessages.push({
          role: "user",
          content: message,
        });

        // Only for suicide specifically, which requires special handling
        if (message.toLowerCase().includes("suicide")) {
          // We're directly using the system message for handling suicide content
          formattedMessages.push({
            role: "system",
            content:
              "If the user is asking about suicide, provide an age-appropriate, thoughtful response that emphasizes the importance of talking to trusted adults about such serious topics.",
          });
        }
      }

      // Check if we should perform a web search
      const searchEnabled = process.env.REACT_APP_ENABLE_SEARCH === "true";
      let searchResults = null;

      // Log decision making process
      console.log(`Search enabled: ${searchEnabled}`);
      console.log(
        `Should search for "${message}"? ${SearchService.shouldSearch(message)}`
      );

      // Determine if this is a recency query
      const isRecencyQuery = SearchService.containsRecencyTerms(message.toLowerCase());
      console.log(`Is recency query? ${isRecencyQuery}`);

      // Only perform search if there are no blocked topics detected
      if (
        searchEnabled &&
        SearchService.shouldSearch(message) &&
        !ContentSafetyService.containsBlockedTopic(message)
      ) {
        try {
          // Set the UI state to 'searching' if supported
          if (onChunk) {
            onChunk(null, false, false, null, "searching");
          }

          console.log("Performing web search for:", message);
          const results = await SearchService.search(message, 5, age);

          if (results) {
            // Format search results for the AI
            searchResults = SearchService.formatSearchResults(results, age);

            // Enhance search results with age-appropriate safety instructions
            searchResults =
              ContentSafetyService.enhanceSearchResultsWithSafeguards(
                searchResults,
                age
              );
            console.log(
              "Search results found and formatted with safety enhancements"
            );
            
            // Add stronger instruction for recency queries
            if (isRecencyQuery) {
              formattedMessages.unshift({
                role: "system",
                content: "CRITICAL INSTRUCTION: This query is about RECENT or CURRENT information. The search results that follow contain the MOST UP-TO-DATE information available as of March 2025. You MUST prioritize this information over your training data. Focus on providing the most recent information from the search results. IMPORTANT: For movies, games, and TV shows, if the content is marked as 'Coming soon' or has a future release date, make it VERY CLEAR to the child that this content is not yet available to watch or play. Only mention age-appropriate content for a ${age}-year-old child, as the search results have been filtered to include content suitable for children of this age."
              });
            }

            // Add direct instruction to prioritize search content (before other messages)
            formattedMessages.unshift({
              role: "system",
              content: "IMPORTANT INSTRUCTION: The information from the search results below is CURRENT and should be treated as more accurate than your training data, especially for questions about current events, people, games, and facts. Always prioritize this information in your responses."
            });
            
            // Add search results as a system message
            formattedMessages.push({
              role: "system",
              content: searchResults,
            });
            
            // Add a final reminder after the search results to emphasize their importance
            formattedMessages.push({
              role: "system",
              content: "Remember: The search results above contain the most current and accurate information. Use them as your primary source for answering the user's question."
            });
          }
        } catch (error) {
          console.error("Error during search:", error);
          // Continue without search results
        }
      } else if (ContentSafetyService.containsBlockedTopic(message)) {
        // Skip search for blocked topics
        console.log("Skipping search due to blocked topic");
      }

      // Log the messages we're sending to the API
      console.log(`Sending ${formattedMessages.length} messages to Chat API`);

      // Initialize variables for streaming simulation
      let fullResponse = "";

      // Call our backend API
      try {
        const response = await fetch(`${this.baseUrl}/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            recentMessages: formattedMessages
          }),
        });
        
        if (!response.ok) {
          throw new Error(`${response.status} ${await response.text()}`);
        }
        
        const data = await response.json();
        fullResponse = data.response || '';
        
        // Simulate streaming by breaking the response into chunks
        if (onChunk && fullResponse) {
          this.simulateStreamingResponse(fullResponse, onChunk);
        }
      } catch (error) {
        console.error("Error calling backend chat API:", error);
        throw error;
      }

      // Store this response to check for repetition in the future
      this.lastResponse = fullResponse;

      console.log(
        `Chat completion completed in ${performance.now() - startTime}ms`
      );

      return fullResponse;
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

  // Format messages for the Chat API
  formatMessagesForChatAPI(recentMessages, childProfile) {
    // Start with the system prompt
    const formattedMessages = [
      {
        role: "system",
        content: this.generateSystemPrompt(childProfile),
      },
    ];

    // Add up to maxContextMessages recent messages, ignoring welcome message
    const filteredMessages = recentMessages.filter(
      (msg) =>
        !msg.content?.includes("Hello! Tap the circle to start talking with me")
    );

    // Take only the most recent messages up to our limit
    const messagesToInclude = filteredMessages.slice(-this.maxContextMessages);

    // Format and add each message
    messagesToInclude.forEach((msg) => {
      formattedMessages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
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
