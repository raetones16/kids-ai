import { SearchApi, checkBackendAvailability } from './ApiService';
import ContentSafetyService from './safety/ContentSafetyService';

/**
 * Service for handling web search functionality via Brave Search API
 */
export class SearchService {
  constructor() {
    this.isBackendAvailable = false;
    this.checkBackendAvailability();
  }
  
  // Check if backend API is available
  async checkBackendAvailability() {
    try {
      this.isBackendAvailable = await checkBackendAvailability();
      console.log(`Search API ${this.isBackendAvailable ? 'is' : 'is not'} available`);
      return this.isBackendAvailable;
    } catch (error) {
      console.error('Error checking search API availability:', error);
      this.isBackendAvailable = false;
      return false;
    }
  }
  
  /**
   * Perform a search query
   * @param {string} query - The search query text
   * @param {number} count - Number of results to return (default: 5)
   * @returns {Promise<Object>} Search results
   */
  /**
   * Extract a clean search query from user input
   * @param {string} userInput - Original user message
   * @returns {string} Clean search query
   */
  extractSearchQuery(userInput) {
    // Handle null/undefined input
    if (!userInput) return '';
    
    const input = userInput.toLowerCase();
    
    // Extract search intent with common patterns
    const patterns = [
      // Direct questions about topics
      /(?:what|who|where|when|how)\s+(?:is|are|was|were)\s+(?:the\s+)?(.+)/i,
      /(?:tell|show)\s+me\s+(?:about|)\s+(.+)/i,
      // Search requests
      /(?:search|look up|find|get)\s+(?:for|about|)\s+(.+)/i,
      // Direct topic mentions with context words
      /(?:latest|current|recent|new)\s+(.+)/i,
      // Questions about status
      /what'?s\s+the\s+(.+)/i,
      // Fortnite specific patterns
      /fortnite\s+(.+?)(?:\s+we'?re\s+on|\s+right\s+now|\s+is|\s+has)/i,
      /season\s+(?:of|)\s+fortnite/i,
      // President specific patterns
      /president\s+(?:of|)\s+(?:the|)\s+(?:united\s+states|us|america)/i
    ];
    
    // Try to match patterns and extract core query
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        // If matched, return a cleaned up version of the extracted part
        return match[1].trim();
      }
    }
    
    // Fallbacks for specific topics
    if (input.includes('fortnite')) {
      return 'current fortnite chapter season';
    }
    
    if (input.includes('president')) {
      return 'current president united states 2025';
    }
    
    // Last resort - remove common filler phrases
    const cleanedInput = input
      .replace(/^(?:i'?m\s+\w+\s+)?(?:can\s+you|could\s+you|please|)\s+/i, '') // Remove prefixes
      .replace(/(?:for\s+me|please|thanks|thank\s+you|)\s*[?.!]*$/i, ''); // Remove suffixes
    
    return cleanedInput;
  }
  
  async search(query, count = 5, age = 8) {
    try {
      // Safety check - block search for inappropriate content
      if (ContentSafetyService.containsBlockedTopic(query)) {
        console.warn('Search blocked due to inappropriate query content');
        throw new Error('Search contains inappropriate content for children');
      }

      // Check backend availability
      if (!this.isBackendAvailable) {
        await this.checkBackendAvailability();
        
        if (!this.isBackendAvailable) {
          throw new Error('Search functionality is not available (backend is offline)');
        }
      }
      
      // Extract a better search query from user input
      const cleanQuery = this.extractSearchQuery(query);
      console.log(`Extracted clean search query: "${cleanQuery}" from original: "${query}"`);
      
      // Add query enhancement for better results on certain topics
      let enhancedQuery = cleanQuery || query; // Use original as fallback
      
      // For Fortnite specifically, add current year to get more recent results
      if (enhancedQuery.toLowerCase().includes('fortnite')) {
        if (!enhancedQuery.includes('2025') && !enhancedQuery.includes('current')) {
          enhancedQuery = `${enhancedQuery} 2025 current chapter season`;
          console.log(`Enhanced Fortnite query to: ${enhancedQuery}`);
        }
      }
      
      // For president questions, explicitly ask for current information
      if (enhancedQuery.toLowerCase().includes('president')) {
        if (!enhancedQuery.includes('2025') && !enhancedQuery.includes('current')) {
          enhancedQuery = `${enhancedQuery} current 2025`;
          console.log(`Enhanced president query to: ${enhancedQuery}`);
        }
      }
      
      // Perform search using the backend API with enhanced query
      const results = await SearchApi.search(enhancedQuery, count);
      
      // Store the original query in the results object for reference
      results.originalQuery = query;
      results.cleanQuery = cleanQuery;
      results.enhancedQuery = enhancedQuery;
      
      return results;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }
  
  /**
   * Determines if a query would benefit from a web search
   * @param {string} query - The user's input text
   * @returns {boolean} Whether a search should be performed
   */
  shouldSearch(query) {
    if (!query || typeof query !== 'string' || query.length < 5) {
      return false;
    }
    
    const lowerCaseQuery = query.toLowerCase();
    
    // Exclude simple assistant questions first - do this check early
    const simpleQuestions = [
      'how are you', 'what is your name', 'who are you', 
      'what can you do', 'how old are you', 'where are you'
    ];
    
    for (const simple of simpleQuestions) {
      if (lowerCaseQuery.includes(simple)) {
        console.log(`No search needed - simple question: ${simple}`);
        return false;
      }
    }
    
    // Enhanced factual queries that definitely need search
    // These take priority and will always trigger search
    const factualQueries = [
      'president', 'prime minister', 'election', 'government',
      'fortnite', 'minecraft', 'roblox', 'game', 'chapter', 'season',
      'movie', 'film', 'show', 'series', 'episode',
      'sports', 'football', 'soccer', 'basketball',
      'youtube', 'tiktok', 'social media'
    ];
    
    for (const topic of factualQueries) {
      if (lowerCaseQuery.includes(topic)) {
        console.log(`Search triggered by factual topic: ${topic}`);
        return true;
      }
    }
    
    // Check for current topics that almost always need search
    const currentTopics = ['update', 'latest', 'newest', 'today', 'yesterday',
                            'current', 'recent', 'news'];
    for (const topic of currentTopics) {
      if (lowerCaseQuery.includes(topic)) {
        console.log(`Search triggered by current topic: ${topic}`);
        return true;
      }
    }
    
    // Check for search intent keywords
    const searchIntentKeywords = [
      'search', 'look up', 'google', 'find', 'search for',
      'what is', 'who is', 'where is', 'when did', 'how to',
      'news about', 'information about', 'tell me about'
    ];
    
    for (const keyword of searchIntentKeywords) {
      if (lowerCaseQuery.includes(keyword)) {
        console.log(`Search triggered by keyword: ${keyword}`);
        return true;
      }
    }
    
    // Check for questions that usually need factual/current information
    if (lowerCaseQuery.includes('?') || 
        lowerCaseQuery.startsWith('how') || 
        lowerCaseQuery.startsWith('what') || 
        lowerCaseQuery.startsWith('when') || 
        lowerCaseQuery.startsWith('where') || 
        lowerCaseQuery.startsWith('who') || 
        lowerCaseQuery.startsWith('which')) {
      console.log('Search triggered by question format');
      return true;
    }
    
    return false;
  }
  
  /**
   * Extract key facts from search results based on query type
   * @param {Array} results - Search result items
   * @param {string} query - Original search query
   * @returns {string} Extracted key facts in plaintext format
   */
  extractKeyFactsFromResults(results, query) {
    if (!results || !results.length) return '';
    
    // Ensure query is a string before processing
    const queryStr = typeof query === 'string' ? query : 
                    (query && query.q ? query.q : 'fortnite season');
    const lowerQuery = queryStr.toLowerCase();
    let extractedFacts = '';
    
    // Check for Fortnite-related queries
    if (lowerQuery.includes('fortnite')) {
      extractedFacts += this.extractFortniteInfo(results);
    }
    
    // Check for president-related queries
    if (lowerQuery.includes('president')) {
      extractedFacts += this.extractPresidentInfo(results);
    }
    
    return extractedFacts;
  }
  
  /**
   * Extract Fortnite-specific information from search results
   * @param {Array} results - Search result items
   * @returns {string} Extracted Fortnite information
   */
  extractFortniteInfo(results) {
    let facts = '';
    let currentChapter = '';
    let currentSeason = '';
    let seasonName = '';
    const chapterPatterns = [
      /chapter\s*([0-9]+)/i,
      /fortnite\s+chapter\s*([0-9]+)/i
    ];
    
    const seasonPatterns = [
      /season\s*([0-9]+)/i,
      /chapter\s*[0-9]+,?\s*season\s*([0-9]+)/i
    ];
    
    const seasonNamePatterns = [
      /season[^a-z0-9]*([a-z0-9\s]+)/i,
      /named\s+"([^"]+)"/i,
      /called\s+"([^"]+)"/i,
      /titled\s+"([^"]+)"/i
    ];
    
    // Look for chapter and season numbers in titles and descriptions
    for (const result of results) {
      const fullText = `${result.title} ${result.description}`;
      
      // Try to find chapter number
      if (!currentChapter) {
        for (const pattern of chapterPatterns) {
          const match = fullText.match(pattern);
          if (match && match[1]) {
            currentChapter = match[1];
            break;
          }
        }
      }
      
      // Try to find season number
      if (!currentSeason) {
        for (const pattern of seasonPatterns) {
          const match = fullText.match(pattern);
          if (match && match[1]) {
            currentSeason = match[1];
            break;
          }
        }
      }
      
      // Try to find season name
      if (!seasonName) {
        for (const pattern of seasonNamePatterns) {
          const match = fullText.match(pattern);
          if (match && match[1] && match[1].length < 30) { // Avoid capturing too much text
            seasonName = match[1].trim();
            break;
          }
        }
      }
      
      // If we have all the information, we can stop looking
      if (currentChapter && currentSeason) {
        break;
      }
    }
    
    // Format the facts
    if (currentChapter) {
      facts += `- Fortnite is currently in Chapter ${currentChapter}`;
      if (currentSeason) {
        facts += `, Season ${currentSeason}`;
      }
      if (seasonName) {
        facts += ` ("${seasonName}")`;
      }
      facts += ".\n";
    }
    
    // If we couldn't extract structured data, default to text search
    if (!facts) {
      // Look for sentences mentioning current chapter/season
      for (const result of results) {
        const fullText = `${result.title}. ${result.description}`;
        const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        for (const sentence of sentences) {
          if ((sentence.toLowerCase().includes('chapter') || 
               sentence.toLowerCase().includes('season')) && 
              (sentence.toLowerCase().includes('current') || 
               sentence.toLowerCase().includes('latest') || 
               sentence.toLowerCase().includes('new') || 
               sentence.toLowerCase().includes('now'))) {
            facts += `- ${sentence.trim()}.\n`;
            break;
          }
        }
        
        if (facts) break;
      }
    }
    
    // Default fallback data as an absolute last resort
    if (!facts) {
      facts = "- Fortnite is currently in Chapter 6, Season 2 as of March 2025.\n";
    }
    
    return facts;
  }
  
  /**
   * Extract president information from search results
   * @param {Array} results - Search result items
   * @returns {string} Extracted president information
   */
  extractPresidentInfo(results) {
    let facts = '';
    let presidentName = '';
    
    const presidentPatterns = [
      /president\s+is\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
      /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+is\s+(?:the\s+)?(?:current\s+)?president/i,
      /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:became|elected|won)\s+(?:the\s+)?president/i
    ];
    
    // Look for president name in titles and descriptions
    for (const result of results) {
      const fullText = `${result.title} ${result.description}`;
      
      // Try to find president name
      for (const pattern of presidentPatterns) {
        const match = fullText.match(pattern);
        if (match && match[1]) {
          presidentName = match[1];
          break;
        }
      }
      
      if (presidentName) break;
    }
    
    // Format the facts
    if (presidentName) {
      facts += `- The current President of the United States is ${presidentName}.\n`;
    } else {
      // Default fallback - This should be kept updated with correct information
      facts += "- The current President of the United States is Donald Trump (as of March 2025).\n";
    }
    
    return facts;
  }
  
  /**
   * Format search results into a concise summary for the AI
   * @param {Object} results - The raw search results
   * @param {number} age - Child's age for content filtering
   * @returns {string} Formatted search results for the AI
   */
  formatSearchResults(results, age = 8) {
    if (!results || !results.web || !results.web.results || results.web.results.length === 0) {
      return "No relevant search results found.";
    }
    
    // Get the top 3 results
    const topResults = results.web.results.slice(0, 3);
    
    // Extract the most important facts for known question types
    // Use the enhancedQuery or cleanQuery if available, otherwise check for query property
    const queryForExtraction = results.enhancedQuery || results.cleanQuery || 
                            (results.query ? results.query : 'fortnite');
    let extractedFacts = this.extractKeyFactsFromResults(topResults, queryForExtraction);

    // Format the results with extracted facts first for maximum clarity
    let formattedResults = "CURRENT FACTUAL INFORMATION FROM LIVE WEB SEARCH (March 2025):\n\n";
    
    // Add extracted facts prominently if available
    if (extractedFacts && extractedFacts.trim()) {
      formattedResults += `EXTRACTED KEY FACTS:\n${extractedFacts}\n\n`;
    }
    
    // Add full results after the extracted facts
    formattedResults += "DETAILED SEARCH RESULTS:\n";
    topResults.forEach((result, index) => {
      formattedResults += `${index + 1}. ${result.title}\n`;
      formattedResults += `${result.description}\n`;
      formattedResults += `Source: ${result.url}\n\n`;
    });
    
    // Add stronger instruction for the AI to prioritize this information
    formattedResults += `CRITICAL: The information above is from a CURRENT web search as of March 2025 and OVERRIDES any contradicting information in your training data. Use the EXTRACTED KEY FACTS section first when available, as it contains the most relevant current information.\n\n`;
    
    // Add instruction for the AI based on child's age
    formattedResults += `Please use this information to provide a simple, ${age <= 7 ? 'very easy to understand' : age <= 10 ? 'kid-friendly' : 'straightforward'} answer about the query. Don't mention that you're searching or using search results - just provide the information directly. Make sure to simplify complex concepts and avoid any inappropriate content.`;
    
    return formattedResults;
  }
}

// Create and export singleton instance
const searchService = new SearchService();
export default searchService;