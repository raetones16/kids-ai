/**
 * Extract movie release information with validation for current/upcoming releases
 * @param {Array} results - Search results
 * @param {number} currentYear - Current year for recency checks
 * @param {boolean} isAvailabilityNowQuery - Whether the query is about current availability
 * @returns {string} Formatted movie release information
 */
export function extractMovieReleaseInfo(results, currentYear, isAvailabilityNowQuery = false, age = 8) {
  let facts = "";
  const currentMovies = [];
  const upcomingMovies = [];
  const today = new Date();
  
  // Parse results to find movie titles and release dates
  results.forEach((result) => {
    const fullText = `${result.title} ${result.description}`;
    
    // Extract movie title from result title
    let movieTitle = null;
    // Try to extract from patterns like "Movie Title (2025)" or "Movie Title - Release Date"
    const titleMatch = result.title.match(/^(.+?)(?:\s+\(\d{4}\)|\s+-\s+|\s+\|\s+|:\s+)/);
    if (titleMatch && titleMatch[1]) {
      movieTitle = titleMatch[1].trim();
    } else {
      // Just use the title
      movieTitle = result.title;
    }
    
    // Look for release date in the text
    let releaseDate = null;
    let releaseDateObj = null;
    let isReleased = true; // Default to released unless proven otherwise
    
    // Check for specific release patterns
    const releasedMatch = fullText.match(/(?:released|in theaters|premiered|came out)(?:\s+on)?\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+)?\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:,\s+)?\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/i);
    
    if (releasedMatch) {
      releaseDate = releasedMatch[1];
      
      // Try to parse the date
      try {
        // Check for month name format (March 15, 2023)
        if (/[A-Za-z]+\s+\d{1,2}/.test(releaseDate)) {
          const parts = releaseDate.match(/([A-Za-z]+)\s+(\d{1,2})(?:,\s+)?(\d{4})?/);
          if (parts) {
            const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                              'july', 'august', 'september', 'october', 'november', 'december'];
            const monthIndex = monthNames.indexOf(parts[1].toLowerCase());
            const year = parts[3] ? parseInt(parts[3]) : currentYear;
            if (monthIndex !== -1) {
              releaseDateObj = new Date(year, monthIndex, parseInt(parts[2]));
            }
          }
        }
        
        // If date was parsed successfully
        if (releaseDateObj && !isNaN(releaseDateObj.getTime())) {
          isReleased = releaseDateObj <= today;
        }
      } catch (e) {
        console.log(`Error parsing movie release date: ${releaseDate}`, e);
      }
    }
    
    // Look for upcoming/future releases
    const upcomingMatch = fullText.match(/(?:coming|opens|releases|arrives)(?:\s+on|\s+in)?\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+)?\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:,\s+)?\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/i);
    
    if (!releaseDate && upcomingMatch) {
      releaseDate = upcomingMatch[1];
      isReleased = false;
    }
    
    // Explicitly check for "coming soon" or future indicators
    const isFuture = 
      fullText.toLowerCase().includes('coming soon') || 
      fullText.toLowerCase().includes('upcoming') ||
      fullText.toLowerCase().includes('trailer') ||
      fullText.toLowerCase().includes('announced') ||
      fullText.toLowerCase().includes('in production');
    
    if (isFuture) {
      isReleased = false;
    }
    
    // Check if explicitly mentioned as in theaters now
    const isNowShowing = 
      fullText.toLowerCase().includes('now showing') || 
      fullText.toLowerCase().includes('now playing') ||
      fullText.toLowerCase().includes('in theaters now') ||
      fullText.toLowerCase().includes('currently in theaters');
    
    if (isNowShowing) {
      isReleased = true;
    }
    
    // Add to appropriate list (current or upcoming)
    if (movieTitle) {
      // Check for age-appropriateness
      const isKidsFriendly = 
        fullText.toLowerCase().includes('kids') ||
        fullText.toLowerCase().includes('children') ||
        fullText.toLowerCase().includes('family') ||
        fullText.toLowerCase().includes('animated') ||
        fullText.toLowerCase().includes('disney') ||
        fullText.toLowerCase().includes('pixar') ||
        fullText.toLowerCase().includes('pg') ||
        !fullText.toLowerCase().includes('rated r') ||
        !fullText.toLowerCase().includes('rated pg-13');
      
      // For younger kids, be more strict with filtering
      const shouldInclude = age >= 12 || isKidsFriendly;
      
      if (shouldInclude) {
        if (isReleased) {
          currentMovies.push({
            title: movieTitle,
            releaseDate: releaseDate || 'Now playing',
            description: result.description.substring(0, 100) + '...',
            isKidsFriendly
          });
        } else {
          upcomingMovies.push({
            title: movieTitle,
            releaseDate: releaseDate || 'Coming soon',
            description: result.description.substring(0, 100) + '...',
            isKidsFriendly
          });
        }
      }
    }
  });
  
  // Format results based on the query type
  if (isAvailabilityNowQuery) {
    // For "what's in cinemas" type queries, focus on current releases
    if (currentMovies.length > 0) {
      facts += "MOVIES CURRENTLY IN THEATERS:\n";
      currentMovies.slice(0, 5).forEach(movie => {
        facts += `- ${movie.title} (${movie.releaseDate})\n`;
      });
    } else {
      facts += "Couldn't find specific information about movies currently in theaters.\n";
    }
  } else {
    // Format results for both current and upcoming movies
    if (currentMovies.length > 0) {
      facts += "MOVIES CURRENTLY IN THEATERS:\n";
      currentMovies.slice(0, 3).forEach(movie => {
        facts += `- ${movie.title} (${movie.releaseDate})\n`;
      });
      facts += "\n";
    }
    
    // Add upcoming movies
    if (upcomingMovies.length > 0) {
      facts += "UPCOMING MOVIE RELEASES:\n";
      upcomingMovies.slice(0, 3).forEach(movie => {
        facts += `- ${movie.title} (${movie.releaseDate})\n`;
      });
    }
    
    if (currentMovies.length === 0 && upcomingMovies.length === 0) {
      facts += "Couldn't extract specific movie release information from search results.\n";
    }
  }
  
  return facts;
}