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