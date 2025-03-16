/**
 * Utilities for extracting structured information from search results
 */

/**
 * Extract Fortnite-specific information from search results
 * @param {Array} results - Search result items
 * @returns {string} Extracted Fortnite information
 */
export function extractFortniteInfo(results) {
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
export function extractPresidentInfo(results) {
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
 * Extract game release information
 * @param {Array} results - Search results
 * @param {number} currentYear - Current year for recency checks
 * @returns {string} Formatted game release information
 */
export function extractGameReleaseInfo(results, currentYear) {
  let facts = "";
  const gameReleases = [];
  
  // Patterns for game release information
  const releasePatterns = [
    /(?:released|launch(?:ed)?|available|came out)(?:\s+on)?\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+)?\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:,\s+)?\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/i,
    /release date[:\s]+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+)?\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:,\s+)?\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/i
  ];
  
  results.forEach((result) => {
    const fullText = `${result.title} ${result.description}`;
    
    // Try to extract game title and release date
    let gameTitle = null;
    let releaseDate = null;
    
    // Check for title patterns like "Game Title - Release Date" or "Game Title | Official Site"
    const titlePatterns = [
      /^(.+?)(?:\s+-\s+|\s+\|\s+)/,
      /^(.+?)(?::\s+)/
    ];
    
    for (const pattern of titlePatterns) {
      const match = result.title.match(pattern);
      if (match && match[1] && match[1].length > 3 && match[1].length < 50) {
        gameTitle = match[1].trim();
        break;
      }
    }
    
    // If no title found from patterns, use the first part of the title
    if (!gameTitle) {
      const titleWords = result.title.split(/\s+/);
      if (titleWords.length > 1) {
        // Use first 3-5 words as title, avoiding very short titles
        const wordCount = Math.min(Math.max(3, Math.floor(titleWords.length / 2)), 5);
        gameTitle = titleWords.slice(0, wordCount).join(' ');
      } else {
        gameTitle = result.title;
      }
    }
    
    // Try to find release date in text
    for (const pattern of releasePatterns) {
      const match = fullText.match(pattern);
      if (match && match[1]) {
        releaseDate = match[1];
        break;
      }
    }
    
    // Check if it contains year reference, especially current year
    const hasCurrentYear = fullText.includes(currentYear.toString());
    const has2025InTitle = result.title.includes('2025');
    
    // Store the game info if we have both title and some indication of recency
    if (gameTitle && (releaseDate || hasCurrentYear || has2025InTitle)) {
      gameReleases.push({
        title: gameTitle,
        releaseDate: releaseDate || (hasCurrentYear ? `${currentYear}` : 'Recently'),
        isCurrentYear: hasCurrentYear || has2025InTitle,
        fullText: fullText.substring(0, 200) // Store a snippet for debugging
      });
    }
  });
  
  // Sort by recency (current year first)
  gameReleases.sort((a, b) => {
    if (a.isCurrentYear && !b.isCurrentYear) return -1;
    if (!a.isCurrentYear && b.isCurrentYear) return 1;
    return 0;
  });
  
  // Format the extracted information
  if (gameReleases.length > 0) {
    facts += "RECENT GAME RELEASES:\n";
    gameReleases.slice(0, 5).forEach(game => {
      facts += `- ${game.title} (Released: ${game.releaseDate})\n`;
    });
  } else {
    facts += "Couldn't extract specific game release information from search results.\n";
  }
  
  return facts;
}

/**
 * Extract movie release information
 * @param {Array} results - Search results
 * @param {number} currentYear - Current year for recency checks
 * @returns {string} Formatted movie release information
 */
export function extractMovieReleaseInfo(results, currentYear) {
  let facts = "";
  const movieReleases = [];
  
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
    const releaseMatch = fullText.match(/(?:released|in theaters|premiered|coming out|release date)(?:\s+on)?\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+)?\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:,\s+)?\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/i);
    
    const releaseDate = releaseMatch ? releaseMatch[1] : null;
    
    // Check if it contains current year
    const hasCurrentYear = fullText.includes(currentYear.toString());
    
    // Add to list if we have a title and some indication of recency
    if (movieTitle && (releaseDate || hasCurrentYear)) {
      movieReleases.push({
        title: movieTitle,
        releaseDate: releaseDate || `${currentYear}`,
        isCurrentYear: hasCurrentYear
      });
    }
  });
  
  // Sort by recency
  movieReleases.sort((a, b) => {
    if (a.isCurrentYear && !b.isCurrentYear) return -1;
    if (!a.isCurrentYear && b.isCurrentYear) return 1;
    return 0;
  });
  
  // Format results
  if (movieReleases.length > 0) {
    facts += "RECENT MOVIE RELEASES:\n";
    movieReleases.slice(0, 5).forEach(movie => {
      facts += `- ${movie.title} (Released: ${movie.releaseDate})\n`;
    });
  } else {
    facts += "Couldn't extract specific movie release information from search results.\n";
  }
  
  return facts;
}

/**
 * Extract TV show information
 * @param {Array} results - Search results
 * @param {number} currentYear - Current year for recency checks
 * @returns {string} Formatted TV show information
 */
export function extractTVShowInfo(results, currentYear) {
  let facts = "";
  const tvShows = [];
  
  // Parse results to find TV show info
  results.forEach((result) => {
    const fullText = `${result.title} ${result.description}`;
    
    // Extract show title
    let showTitle = null;
    const titleMatch = result.title.match(/^(.+?)(?:\s+Season|\s+-\s+|\s+\|\s+|:\s+)/);
    if (titleMatch && titleMatch[1]) {
      showTitle = titleMatch[1].trim();
    } else {
      showTitle = result.title;
    }
    
    // Look for season information
    let seasonInfo = null;
    const seasonMatch = fullText.match(/Season\s+(\d+)/i);
    if (seasonMatch) {
      seasonInfo = `Season ${seasonMatch[1]}`;
    }
    
    // Look for release date
    let releaseDate = null;
    const releaseMatch = fullText.match(/(?:premiered|released|streaming|debuts|returns)(?:\s+on)?\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+)?\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:,\s+)?\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/i);
    if (releaseMatch) {
      releaseDate = releaseMatch[1];
    }
    
    // Check if it contains current year
    const hasCurrentYear = fullText.includes(currentYear.toString());
    
    // Add to list if we have a title and some indication of recency
    if (showTitle && (releaseDate || seasonInfo || hasCurrentYear)) {
      tvShows.push({
        title: showTitle,
        season: seasonInfo,
        releaseDate: releaseDate || (hasCurrentYear ? `${currentYear}` : null),
        isCurrentYear: hasCurrentYear
      });
    }
  });
  
  // Sort by recency
  tvShows.sort((a, b) => {
    if (a.isCurrentYear && !b.isCurrentYear) return -1;
    if (!a.isCurrentYear && b.isCurrentYear) return 1;
    return 0;
  });
  
  // Format results
  if (tvShows.length > 0) {
    facts += "RECENT TV SHOWS:\n";
    tvShows.slice(0, 5).forEach(show => {
      let info = `- ${show.title}`;
      if (show.season) {
        info += ` (${show.season})`;
      }
      if (show.releaseDate) {
        info += ` - Released: ${show.releaseDate}`;
      }
      facts += `${info}\n`;
    });
  } else {
    facts += "Couldn't extract specific TV show information from search results.\n";
  }
  
  return facts;
}
