/**
 * Extract TV show information
 * @param {Array} results - Search results
 * @param {number} currentYear - Current year for recency checks
 * @returns {string} Formatted TV show information
 */
export function extractTVShowInfo(results, currentYear, age = 8) {
  let facts = "";
  const currentShows = [];
  const upcomingShows = [];
  const today = new Date();
  
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
    
    // Look for release date and determine if it's current or upcoming
    let releaseDate = null;
    let isReleased = true; // Default to released
    
    // Check for released shows
    const releasedMatch = fullText.match(/(?:premiered|released|streaming|debuted)(?:\s+on)?\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+)?\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:,\s+)?\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/i);
    
    if (releasedMatch) {
      releaseDate = releasedMatch[1];
      
      // Try to parse the date
      try {
        if (/[A-Za-z]+\s+\d{1,2}/.test(releaseDate)) {
          const parts = releaseDate.match(/([A-Za-z]+)\s+(\d{1,2})(?:,\s+)?(\d{4})?/);
          if (parts) {
            const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                              'july', 'august', 'september', 'october', 'november', 'december'];
            const monthIndex = monthNames.indexOf(parts[1].toLowerCase());
            const year = parts[3] ? parseInt(parts[3]) : currentYear;
            if (monthIndex !== -1) {
              const dateObj = new Date(year, monthIndex, parseInt(parts[2]));
              isReleased = dateObj <= today;
            }
          }
        }
      } catch (e) {
        console.log(`Error parsing TV show release date: ${releaseDate}`, e);
      }
    }
    
    // Check for upcoming shows
    const upcomingMatch = fullText.match(/(?:coming|premieres|returns|upcoming)(?:\s+on|\s+in)?\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+)?\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:,\s+)?\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/i);
    
    if (!releaseDate && upcomingMatch) {
      releaseDate = upcomingMatch[1];
      isReleased = false;
    }
    
    // Check for explicit indicators
    if (
      fullText.toLowerCase().includes('coming soon') || 
      fullText.toLowerCase().includes('announced') ||
      fullText.toLowerCase().includes('in production')
    ) {
      isReleased = false;
    }
    
    if (
      fullText.toLowerCase().includes('now streaming') || 
      fullText.toLowerCase().includes('currently airing') ||
      fullText.toLowerCase().includes('watch now')
    ) {
      isReleased = true;
    }
    
    // Check if it contains current year
    const hasCurrentYear = fullText.includes(currentYear.toString());
    
    // Add to appropriate list
    if (showTitle) {
      // Check for age-appropriateness
      const isKidsFriendly = 
        fullText.toLowerCase().includes('kids') ||
        fullText.toLowerCase().includes('children') ||
        fullText.toLowerCase().includes('family') ||
        fullText.toLowerCase().includes('animated') ||
        fullText.toLowerCase().includes('cartoon') ||
        fullText.toLowerCase().includes('disney') ||
        fullText.toLowerCase().includes('nickelodeon') ||
        fullText.toLowerCase().includes('pbs kids');
      
      // For younger kids, be more strict with filtering
      const shouldInclude = age >= 12 || isKidsFriendly;
      
      if (shouldInclude) {
        const showInfo = {
          title: showTitle,
          season: seasonInfo,
          releaseDate: releaseDate || (isReleased ? 'Now streaming' : 'Coming soon'),
          isCurrentYear: hasCurrentYear,
          isKidsFriendly
        };
        
        if (isReleased) {
          currentShows.push(showInfo);
        } else {
          upcomingShows.push(showInfo);
        }
      }
    }
  });
  
  // Format for current shows
  if (currentShows.length > 0) {
    facts += "RECENTLY RELEASED TV SHOWS:\n";
    currentShows.slice(0, 3).forEach(show => {
      let info = `- ${show.title}`;
      if (show.season) {
        info += ` (${show.season})`;
      }
      if (show.releaseDate) {
        info += ` - ${show.releaseDate}`;
      }
      facts += `${info}\n`;
    });
    facts += "\n";
  }
  
  // Add upcoming shows
  if (upcomingShows.length > 0) {
    facts += "UPCOMING TV SHOWS:\n";
    upcomingShows.slice(0, 2).forEach(show => {
      let info = `- ${show.title}`;
      if (show.season) {
        info += ` (${show.season})`;
      }
      if (show.releaseDate) {
        info += ` - ${show.releaseDate}`;
      }
      facts += `${info}\n`;
    });
  }
  
  if (currentShows.length === 0 && upcomingShows.length === 0) {
    facts += "Couldn't extract specific TV show information from search results.\n";
  }
  
  return facts;
}