import { SearchApi, checkBackendAvailability } from './ApiService';
import ContentSafetyService from './safety/ContentSafetyService';
import { extractFortniteInfo, extractPresidentInfo, extractGameReleaseInfo, extractTVShowInfo, extractMovieReleaseInfo, extractStreamingInfo } from './extractors';

/**
 * Service for handling web search functionality via Brave Search API
 */
export class SearchService {
  constructor() {
    this.isBackendAvailable = false;
    this.checkBackendAvailability();
    
    // Track the current year for recency queries
    this.currentYear = new Date().getFullYear();
    
    // Cache for search results
    this.cachedResults = new Map();
    this.cacheExpiry = 15 * 60 * 1000; // 15 minutes cache
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
  
  /**
   * Enhance the search query with time-context based on topic and recency terms
   * @param {string} query - Original query
   * @param {string} cleanQuery - Cleaned query
   * @returns {string} Enhanced query
   */
  enhanceQuery(query, cleanQuery, age = 8) {
    // Default to 8 if no age provided
    let enhancedQuery = cleanQuery || query;
    const lowerQuery = enhancedQuery.toLowerCase();
    
    // Check for recency indicators
    const hasRecencyTerms = this.containsRecencyTerms(lowerQuery);
    
    // Always add current year to recency queries
    if (hasRecencyTerms && !lowerQuery.includes(this.currentYear.toString())) {
      enhancedQuery = `${enhancedQuery} ${this.currentYear}`;
      console.log(`Added current year to query: ${enhancedQuery}`);
    }
    
    // Game-specific enhancements
    if (this.isGameRelatedQuery(lowerQuery)) {
      if (hasRecencyTerms) {
        // Check if specific platform is mentioned
        if (lowerQuery.includes('switch') || lowerQuery.includes('nintendo')) {
          enhancedQuery = `${enhancedQuery} nintendo switch new releases`;
        } else if (lowerQuery.includes('playstation') || lowerQuery.includes('ps5') || lowerQuery.includes('ps4')) {
          enhancedQuery = `${enhancedQuery} playstation new releases`;
        } else if (lowerQuery.includes('xbox')) {
          enhancedQuery = `${enhancedQuery} xbox new releases`;
        } else {
          enhancedQuery = `${enhancedQuery} new video game releases`;
        }
        console.log(`Enhanced game query: ${enhancedQuery}`);
      }
    }
    
    // Movie-specific enhancements
    else if (this.isMovieRelatedQuery(lowerQuery)) {
      if (hasRecencyTerms) {
        enhancedQuery = `${enhancedQuery} new movie releases`;
      }
      
      // Check for cinema/theater specific terms
      if (lowerQuery.includes('cinema') || lowerQuery.includes('theater') || 
          lowerQuery.includes('theatre') || lowerQuery.includes('showing')) {
        enhancedQuery = `${enhancedQuery} movies in theaters now ${this.currentYear}`;
        console.log(`Enhanced cinema query: ${enhancedQuery}`);
      }
      
      // Check for kids/family specific terms
      // Always add age-appropriate terms for children
      if (age < 13) {
        if (!lowerQuery.includes('kids') && !lowerQuery.includes('family') && !lowerQuery.includes('children')) {
          enhancedQuery = `${enhancedQuery} family friendly`;
          console.log(`Added family-friendly to query: ${enhancedQuery}`);
        }
        
        // Add more specific age targeting for younger children
        if (age <= 8) {
          enhancedQuery = `${enhancedQuery} for kids children's PG`;
          console.log(`Added children's content indicators to query: ${enhancedQuery}`);
        }
      }
      
      console.log(`Enhanced movie query: ${enhancedQuery}`);
    }
    
    // TV-specific enhancements
    else if (this.isTVRelatedQuery(lowerQuery) && hasRecencyTerms) {
      enhancedQuery = `${enhancedQuery} new tv series episodes`;
      console.log(`Enhanced TV query: ${enhancedQuery}`);
    }
    
    // Streaming service specific enhancements
    else if (this.isStreamingQuery(lowerQuery)) {
      // Extract the service name
      let streamingService = '';
      if (lowerQuery.includes('netflix')) streamingService = 'netflix';
      else if (lowerQuery.includes('disney+')) streamingService = 'disney+';
      else if (lowerQuery.includes('hulu')) streamingService = 'hulu';
      else if (lowerQuery.includes('prime')) streamingService = 'amazon prime';
      
      if (streamingService) {
        enhancedQuery = `${enhancedQuery} ${streamingService} new releases ${this.currentYear} this month`;
        
        // Add age-appropriate terms for streaming services
        if (age < 13) {
          enhancedQuery = `${enhancedQuery} kids family friendly`;
          
          if (age <= 8) {
            enhancedQuery = `${enhancedQuery} children's animated`;
          }
        }
        
        console.log(`Enhanced streaming query: ${enhancedQuery}`);
      }
    }
    
    // Fortnite - keep existing enhancement
    else if (enhancedQuery.toLowerCase().includes('fortnite')) {
      if (!enhancedQuery.includes('2025') && !enhancedQuery.includes('current')) {
        enhancedQuery = `${enhancedQuery} 2025 current chapter season`;
        console.log(`Enhanced Fortnite query to: ${enhancedQuery}`);
      }
    }
    
    // President - keep existing enhancement
    else if (enhancedQuery.toLowerCase().includes('president')) {
      if (!enhancedQuery.includes('2025') && !enhancedQuery.includes('current')) {
        enhancedQuery = `${enhancedQuery} current 2025`;
        console.log(`Enhanced president query to: ${enhancedQuery}`);
      }
    }
    
    // Always add "current" to recency queries if not already present
    if (hasRecencyTerms && !enhancedQuery.toLowerCase().includes('current')) {
      enhancedQuery = `${enhancedQuery} current`;
      console.log(`Added 'current' to query: ${enhancedQuery}`);
    }
    
    return enhancedQuery;
  }
  
  /**
   * Check if query contains recency-related terms
   * @param {string} query - The query to check
   * @returns {boolean} Whether query contains recency terms
   */
  containsRecencyTerms(query) {
    const recencyTerms = [
      'latest', 'recent', 'new', 'newest', 'current', 
      'just released', 'just came out', 'this year', 
      'this month', 'this week', 'today', 'now',
      'currently', 'showing', 'in theaters', 'at the cinema',
      'in the cinema', 'available', 'out now', 'can watch',
      'playing', 'out in'
    ];
    
    // Direct terms check
    if (recencyTerms.some(term => query.includes(term))) {
      console.log(`Recency term detected: ${recencyTerms.find(term => query.includes(term))}`);
      return true;
    }
    
    // Context pattern detection - check for availability questions
    if (
      (query.includes('are there') || query.includes('what') || query.includes('can i')) &&
      (query.includes('cinema') || query.includes('theater') || query.includes('theatre') || 
       query.includes('watch') || query.includes('stream') || query.includes('netflix') || 
       query.includes('disney+') || query.includes('hulu') || query.includes('see'))
    ) {
      console.log('Availability question detected as recency query');
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if query is related to games
   * @param {string} query - The query to check
   * @returns {boolean} Whether query is game-related
   */
  isGameRelatedQuery(query) {
    const gameTerms = [
      'game', 'gaming', 'fortnite', 'minecraft', 'roblox',
      'nintendo', 'switch', 'playstation', 'ps5', 'ps4', 'xbox', 
      'console', 'steam', 'epic games'
    ];
    
    return gameTerms.some(term => query.includes(term));
  }
  
  /**
   * Check if query is related to movies
   * @param {string} query - The query to check
   * @returns {boolean} Whether query is movie-related
   */
  isMovieRelatedQuery(query) {
    const movieTerms = [
      'movie', 'film', 'cinema', 'theater', 'theatre', 'boxoffice',
      'watch', 'showing'
    ];
    
    return movieTerms.some(term => query.includes(term));
  }
  
  /**
   * Check if query is related to TV shows
   * @param {string} query - The query to check
   * @returns {boolean} Whether query is TV-related
   */
  isTVRelatedQuery(query) {
    const tvTerms = [
      'tv', 'television', 'show', 'series', 'episode', 'streaming'
    ];
    
    return tvTerms.some(term => query.includes(term)) && 
           !this.isStreamingQuery(query); // Avoid overlap with streaming queries
  }
  
  /**
   * Check if query is specifically about streaming services
   * @param {string} query - The query to check
   * @returns {boolean} Whether query is about streaming services
   */
  isStreamingQuery(query) {
    const streamingTerms = [
      'netflix', 'hulu', 'disney+', 'amazon prime', 'streaming',
      'hbo', 'paramount+', 'peacock', 'apple tv'
    ];
    
    return streamingTerms.some(term => query.includes(term));
  }
  
  /**
   * Perform a search query
   * @param {string} query - The search query text
   * @param {number} count - Number of results to return (default: 5)
   * @returns {Promise<Object>} Search results
   */
  /**
   * Perform a search query with age-appropriate results
   * @param {string} query - The search query text
   * @param {number} count - Number of results to return
   * @param {number} age - Child's age for age-appropriate content
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
      
      // Extract a better search query from user input
      const cleanQuery = this.extractSearchQuery(query);
      
      // Enhance the query for better results with age context
      const enhancedQuery = this.enhanceQuery(query, cleanQuery, age);
      console.log(`Extracted clean search query: "${cleanQuery}" from original: "${query}"`);
      console.log(`Enhanced to: "${enhancedQuery}"`);
      
      // Create cache key based on enhanced query
      const cacheKey = enhancedQuery.toLowerCase();
      
      // Check cache first
      const cachedResult = this.checkCache(cacheKey);
      if (cachedResult) {
        console.log(`Using cached search results for: "${query}"`);
        return cachedResult;
      }
      
      // Perform search using the backend API with enhanced query
      const results = await SearchApi.search(enhancedQuery, count);
      
      // Extract dates from results
      const resultDates = this.extractDatesFromResults(results.web?.results || []);
      
      // Process results with age context
      const extractedFacts = this.extractFactsFromResults(results.web?.results || [], enhancedQuery, query, age);
      
      // Store the original query in the results object for reference
      results.originalQuery = query;
      results.cleanQuery = cleanQuery;
      results.enhancedQuery = enhancedQuery;
      results.extractedFacts = extractedFacts;
      results.resultDates = resultDates;
      
      // Cache the results
      this.cacheResults(cacheKey, results);
      
      return results;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }
  
  /**
   * Check cache for existing results
   * @param {string} key - Cache key
   * @returns {Object|null} Cached results or null
   */
  checkCache(key) {
    if (this.cachedResults.has(key)) {
      const { timestamp, data } = this.cachedResults.get(key);
      const now = Date.now();
      
      // Return if cache is still valid
      if (now - timestamp < this.cacheExpiry) {
        return data;
      } else {
        // Clean up expired cache
        this.cachedResults.delete(key);
      }
    }
    return null;
  }
  
  /**
   * Cache search results
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   */
  cacheResults(key, data) {
    this.cachedResults.set(key, {
      timestamp: Date.now(),
      data
    });
    
    // Clean up old cache entries if we have too many
    if (this.cachedResults.size > 50) {
      this.cleanCache();
    }
  }
  
  /**
   * Clean up expired cache entries
   */
  cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cachedResults.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        this.cachedResults.delete(key);
      }
    }
  }
  
  /**
   * Extract dates from search results
   * @param {Array} results - Search results
   * @returns {Array} Array of extracted dates with result indices
   */
  extractDatesFromResults(results) {
    if (!results || !results.length) return [];
    
    const dateInfo = [];
    const datePatterns = [
      // ISO format: 2023-03-15
      /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/,
      // Month name format: March 15, 2023
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:[,\s]+)(20\d{2})\b/i,
      // Slash format: 03/15/2023 or 15/03/2023
      /\b(\d{1,2})\/(\d{1,2})\/?(20\d{2})\b/,
      // Year only
      /\b(20\d{2})\b/
    ];
    
    results.forEach((result, index) => {
      const fullText = `${result.title} ${result.description}`;
      
      // Try each pattern
      for (const pattern of datePatterns) {
        const match = fullText.match(pattern);
        if (match) {
          let date;
          try {
            // Handle different formats
            if (pattern.toString().includes('January|February')) {
              // Month name format
              const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                                  'july', 'august', 'september', 'october', 'november', 'december'];
              const monthIndex = monthNames.indexOf(match[1].toLowerCase());
              if (monthIndex !== -1) {
                date = new Date(parseInt(match[3]), monthIndex, parseInt(match[2]));
              }
            } else if (pattern.toString().includes('20\\d{2})-')) {
              // ISO format
              date = new Date(match[0]);
            } else if (pattern.toString().includes('\\/')) {
              // Slash format - try both MM/DD/YYYY and DD/MM/YYYY
              // For simplicity, assume MM/DD/YYYY
              date = new Date(`${match[3]}-${match[1]}-${match[2]}`);
            } else {
              // Year only
              date = new Date(parseInt(match[1]), 0, 1);
            }
            
            // Check if date is valid
            if (!isNaN(date.getTime())) {
              // Check if the date is in the future
              const isFuture = date > new Date();
              
              dateInfo.push({
                index,
                date,
                text: match[0],
                year: date.getFullYear(),
                isFuture: isFuture
              });
              break; // Stop after finding first valid date
            }
          } catch (e) {
            console.log(`Error parsing date: ${match[0]}`, e);
          }
        }
      }
    });
    
    return dateInfo;
  }
  
  /**
   * Check if a query would benefit from a web search
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
   * @param {string} enhancedQuery - Enhanced search query
   * @param {string} originalQuery - Original user query
   * @returns {string} Extracted key facts in plaintext format
   */
  extractFactsFromResults(results, enhancedQuery, originalQuery, age = 8) {
    if (!results || !results.length) return '';
    
    // Ensure query is a string before processing
    const queryStr = typeof enhancedQuery === 'string' ? enhancedQuery : 
                    (enhancedQuery && enhancedQuery.q ? enhancedQuery.q : 'fortnite season');
    const lowerQuery = queryStr.toLowerCase();
    const originalLowerQuery = originalQuery.toLowerCase();
    let extractedFacts = '';
    
    // Check if this is an "availability now" type query
    const isAvailabilityNowQuery = 
      this.containsRecencyTerms(originalLowerQuery) && 
      (originalLowerQuery.includes('can i') || 
       originalLowerQuery.includes('are there') || 
       originalLowerQuery.includes('what') || 
       originalLowerQuery.includes('available') || 
       originalLowerQuery.includes('watch'));
    
    // Extract movie information - specifically for cinema/theater questions
    if (this.isMovieRelatedQuery(lowerQuery) && 
        (lowerQuery.includes('cinema') || lowerQuery.includes('theater') || 
         lowerQuery.includes('theatre'))) {
      extractedFacts += extractMovieReleaseInfo(results, this.currentYear, isAvailabilityNowQuery, age);
    }
    // Extract streaming service information
    else if (this.isStreamingQuery(lowerQuery)) {
      extractedFacts += extractStreamingInfo(results, lowerQuery, age);
    }
    // Extract game-specific information
    else if (this.isGameRelatedQuery(lowerQuery) && this.containsRecencyTerms(lowerQuery)) {
      extractedFacts += extractGameReleaseInfo(results, this.currentYear, isAvailabilityNowQuery, age);
    }
    // Extract TV-specific information
    else if (this.isTVRelatedQuery(lowerQuery) && this.containsRecencyTerms(lowerQuery)) {
      extractedFacts += extractTVShowInfo(results, this.currentYear, age);
    }
    // Check for Fortnite-related queries
    else if (lowerQuery.includes('fortnite')) {
      extractedFacts += extractFortniteInfo(results);
    }
    // Check for president-related queries
    else if (lowerQuery.includes('president')) {
      extractedFacts += extractPresidentInfo(results);
    }
    
    return extractedFacts;
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
    
    // Format with extracted facts first
    let formattedResults = "CURRENT FACTUAL INFORMATION FROM LIVE WEB SEARCH (March 2025):\n\n";
    
    // Add extracted facts prominently if available
    if (results.extractedFacts && results.extractedFacts.trim()) {
      formattedResults += `EXTRACTED KEY FACTS:\n${results.extractedFacts}\n\n`;
    }
    
    // Add full results after the extracted facts
    formattedResults += "DETAILED SEARCH RESULTS:\n";
    topResults.forEach((result, index) => {
      // Include date information if available
      const dateInfo = results.resultDates?.find(d => d.index === index);
      let dateText = '';
      
      if (dateInfo) {
        // If it's a future date, make this clear
        if (dateInfo.isFuture) {
          dateText = ` (Coming: ${dateInfo.text})`;
        } else {
          dateText = ` (${dateInfo.text})`;
        }
      }
      
      formattedResults += `${index + 1}. ${result.title}${dateText}\n`;
      formattedResults += `${result.description}\n`;
      formattedResults += `Source: ${result.url}\n\n`;
    });
    
    // Add stronger instruction for the AI to prioritize this information
    formattedResults += `CRITICAL: The information above is from a CURRENT web search as of March 2025 and OVERRIDES any contradicting information in your training data. Use the EXTRACTED KEY FACTS section first when available, as it contains the most relevant current information.\n\n`;
    
    // Add specific instruction for "what's available now" queries
    if (results.originalQuery && 
        (results.originalQuery.toLowerCase().includes('cinema') || 
         results.originalQuery.toLowerCase().includes('theater') ||
         results.originalQuery.toLowerCase().includes('watch') ||
         results.originalQuery.toLowerCase().includes('can i'))) {
      formattedResults += `IMPORTANT: If the question is about what's available NOW or what the child CAN WATCH, only mention content that is CURRENTLY AVAILABLE, not future releases. If a date is listed as 'Coming' or is in the future, make it clear that this content is not yet available.\n\n`;
    }
    
    // Add instruction for the AI based on child's age
    formattedResults += `Please use this information to provide a simple, ${age <= 7 ? 'very easy to understand' : age <= 10 ? 'kid-friendly' : 'straightforward'} answer about the query. Don't mention that you're searching or using search results - just provide the information directly. Make sure to simplify complex concepts and avoid any inappropriate content.`;
    
    return formattedResults;
  }
}

// Create and export singleton instance
const searchService = new SearchService();
export default searchService;