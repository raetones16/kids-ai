/**
 * Extract game release information
 * @param {Array} results - Search results
 * @param {number} currentYear - Current year for recency checks
 * @param {boolean} isAvailabilityNowQuery - Whether the query is about current availability
 * @returns {string} Formatted game release information
 */
export function extractGameReleaseInfo(results, currentYear, isAvailabilityNowQuery = false, age = 8) {
  let facts = "";
  const currentGames = [];
  const upcomingGames = [];
  const today = new Date();
  
  // Patterns for game release information
  const releasePatterns = [
    /(?:released|launch(?:ed)?|available|came out)(?:\s+on)?\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+)?\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:,\s+)?\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/i,
    /release date[:\s]+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+)?\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:,\s+)?\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/i
  ];
  
  // Patterns for upcoming games
  const upcomingPatterns = [
    /(?:coming|releases|launches|arrives)(?:\s+on|\s+in)?\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+)?\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:,\s+)?\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/i,
    /to be released\s+(?:on|in)?\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+)?\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:,\s+)?\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/i
  ];
  
  results.forEach((result) => {
    const fullText = `${result.title} ${result.description}`;
    
    // Try to extract game title and release date
    let gameTitle = null;
    let releaseDate = null;
    let isReleased = true; // Default to released unless we find evidence otherwise
    let releaseDateObj = null;
    
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
    
    // Check for release information
    let foundReleaseDate = false;
    
    // Check for already released games
    for (const pattern of releasePatterns) {
      const match = fullText.match(pattern);
      if (match && match[1]) {
        releaseDate = match[1];
        foundReleaseDate = true;
        break;
      }
    }
    
    // Check for upcoming games if no release date found
    if (!foundReleaseDate) {
      for (const pattern of upcomingPatterns) {
        const match = fullText.match(pattern);
        if (match && match[1]) {
          releaseDate = match[1];
          isReleased = false; // This is an upcoming game
          break;
        }
      }
    }
    
    // Check for explicit "coming soon" or other future indicators
    if (
      fullText.toLowerCase().includes('coming soon') ||
      fullText.toLowerCase().includes('announced') ||
      fullText.toLowerCase().includes('upcoming') ||
      fullText.toLowerCase().includes('reveal')
    ) {
      isReleased = false;
    }
    
    // Check if text explicitly mentions "now available" or "out now"
    if (
      fullText.toLowerCase().includes('now available') ||
      fullText.toLowerCase().includes('out now') ||
      fullText.toLowerCase().includes('available now') ||
      fullText.toLowerCase().includes('just released')
    ) {
      isReleased = true;
    }
    
    // Try to parse the release date if found
    if (releaseDate) {
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
          // Override our isReleased flag based on the actual date
          isReleased = releaseDateObj <= today;
        }
      } catch (e) {
        console.log(`Error parsing game release date: ${releaseDate}`, e);
      }
    }
    
    // Check if it contains year reference, especially current year
    const hasCurrentYear = fullText.includes(currentYear.toString());
    
    // Store the game info if we have a title
    if (gameTitle) {
      // Check for age-appropriateness
      const isKidsFriendly = 
        fullText.toLowerCase().includes('kids') ||
        fullText.toLowerCase().includes('children') ||
        fullText.toLowerCase().includes('family') ||
        fullText.toLowerCase().includes('everyone') ||
        fullText.toLowerCase().includes('rated e') ||
        fullText.toLowerCase().includes('rated e10+') ||
        !fullText.toLowerCase().includes('rated m') ||
        !fullText.toLowerCase().includes('mature') ||
        !fullText.toLowerCase().includes('rated t');
      
      // For ESRB ratings: E (Everyone), E10+ (Everyone 10+), T (Teen), M (Mature 17+)
      // Infer age-appropriate content based on age
      const shouldInclude = 
        (age >= 13 && !fullText.toLowerCase().includes('rated m')) || // Teen+ can see T-rated games
        (age < 13 && (isKidsFriendly || !fullText.toLowerCase().includes('rated t'))); // Under 13 can see E and E10+
      
      if (shouldInclude) {
        const gameInfo = {
          title: gameTitle,
          releaseDate: releaseDate || (isReleased ? 'Available now' : 'Coming soon'),
          isCurrentYear: hasCurrentYear,
          isKidsFriendly
        };
        
        if (isReleased) {
          currentGames.push(gameInfo);
        } else {
          upcomingGames.push(gameInfo);
        }
      }
    }
  });
  
  // Format the extracted information based on whether this is an availability query
  if (isAvailabilityNowQuery) {
    // For "what can I play" queries, focus only on released games
    if (currentGames.length > 0) {
      facts += "GAMES AVAILABLE NOW:\n";
      currentGames.slice(0, 5).forEach(game => {
        facts += `- ${game.title} (${game.releaseDate})\n`;
      });
    } else {
      facts += "Couldn't find information about games currently available.\n";
    }
  } else {
    // For general game queries, show both current and upcoming
    if (currentGames.length > 0) {
      facts += "RECENT GAME RELEASES:\n";
      currentGames.slice(0, 3).forEach(game => {
        facts += `- ${game.title} (${game.releaseDate})\n`;
      });
      if (upcomingGames.length > 0) {
        facts += "\nUPCOMING GAME RELEASES:\n";
        upcomingGames.slice(0, 2).forEach(game => {
          facts += `- ${game.title} (${game.releaseDate})\n`;
        });
      }
    } else if (upcomingGames.length > 0) {
      facts += "UPCOMING GAME RELEASES:\n";
      upcomingGames.slice(0, 5).forEach(game => {
        facts += `- ${game.title} (${game.releaseDate})\n`;
      });
    } else {
      facts += "Couldn't extract specific game release information from search results.\n";
    }
  }
  
  return facts;
}