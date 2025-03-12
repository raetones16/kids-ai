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
      
      // Perform search using the backend API
      const results = await SearchApi.search(query, count);
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
    
    // Check for current topics that almost always need search
    const currentTopics = ['fortnite', 'minecraft', 'roblox', 'tiktok', 'youtube', 'game', 'update', 
                          'season', 'latest', 'newest', 'today', 'yesterday'];
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
      'news about', 'latest', 'recent', 'current', 'today',
      'information about', 'tell me about'
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
      
      // Exclude simple questions that don't need search
      const simpleQuestions = [
        'how are you', 'what is your name', 'who are you', 
        'what can you do', 'how old are you'
      ];
      
      for (const simple of simpleQuestions) {
        if (lowerCaseQuery.includes(simple)) {
          return false;
        }
      }
      
      console.log('Search triggered by question format');
      return true;
    }
    
    return false;
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
    
    // Format the results
    let formattedResults = "Here are some search results that might help answer this question:\n\n";
    
    topResults.forEach((result, index) => {
      formattedResults += `${index + 1}. ${result.title}\n`;
      formattedResults += `${result.description}\n`;
      formattedResults += `Source: ${result.url}\n\n`;
    });
    
    // Add instruction for the AI based on child's age
    formattedResults += `Please use this information to provide a simple, ${age <= 7 ? 'very easy to understand' : age <= 10 ? 'kid-friendly' : 'straightforward'} answer about the query. Don't mention that you're searching or using search results - just provide the information directly. Make sure to simplify complex concepts and avoid any inappropriate content.`;
    
    return formattedResults;
  }
}

// Create and export singleton instance
const searchService = new SearchService();
export default searchService;
