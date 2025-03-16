/**
 * Extract streaming service content information
 * @param {Array} results - Search results
 * @param {string} query - The search query
 * @returns {string} Formatted streaming information
 */
export function extractStreamingInfo(results, query, age = 8) {
  let facts = "";
  const streamingContent = [];
  const currentYear = new Date().getFullYear();
  
  // Determine which streaming service is being asked about
  let serviceName = "streaming services";
  if (query.toLowerCase().includes('netflix')) serviceName = "Netflix";
  else if (query.toLowerCase().includes('disney+')) serviceName = "Disney+";
  else if (query.toLowerCase().includes('hulu')) serviceName = "Hulu";
  else if (query.toLowerCase().includes('prime')) serviceName = "Amazon Prime";
  
  // Parse results to find recent content
  results.forEach((result) => {
    const fullText = `${result.title} ${result.description}`;
    
    // Extract title 
    let contentTitle = null;
    // Try to extract title patterns
    const titleMatch = result.title.match(/^(.+?)(?:\s+Season|\s+-\s+|\s+\|\s+|:\s+)/);
    if (titleMatch && titleMatch[1]) {
      contentTitle = titleMatch[1].trim();
    } else {
      contentTitle = result.title;
    }
    
    // Look for release date or newness indicator
    const isNew = 
      fullText.toLowerCase().includes('new on') ||
      fullText.toLowerCase().includes('just added') ||
      fullText.toLowerCase().includes('now streaming') ||
      fullText.toLowerCase().includes(`${currentYear}`) ||
      fullText.toLowerCase().includes('this month') ||
      fullText.toLowerCase().includes('this week') ||
      fullText.toLowerCase().includes('recent');
    
    // Get release date if available
    let releaseDate = null;
    const dateMatch = fullText.match(/(?:added|released|streaming)(?:\s+on)?\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+)?\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:,\s+)?\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/i);
    
    if (dateMatch) {
      releaseDate = dateMatch[1];
    }
    
    // Add to list if we have a title and some indication of recency
    if (contentTitle && (isNew || releaseDate)) {
    // Check for age-appropriateness
    const isKidsFriendly = 
    fullText.toLowerCase().includes('kids') ||
    fullText.toLowerCase().includes('children') ||
    fullText.toLowerCase().includes('family') ||
      fullText.toLowerCase().includes('animated') ||
        fullText.toLowerCase().includes('pg') ||
      fullText.toLowerCase().includes('disney') ||
      fullText.toLowerCase().includes('pixar');
      
    // For younger kids, be more strict with filtering
    const shouldInclude = age >= 12 || isKidsFriendly;
    
    if (shouldInclude) {
      streamingContent.push({
        title: contentTitle,
        releaseDate: releaseDate || 'Recently added',
        // Filter for low-information results
        isShortDesc: fullText.length < 200,
        isKidsFriendly
      });
    }
  }
  });
  
  // Format results
  if (streamingContent.length > 0) {
    facts += `NEW ON ${serviceName.toUpperCase()}:\n`;
    
    // Filter out items that are just short descriptions with no real content
    const validContent = streamingContent.filter(item => !item.isShortDesc);
    
    // Use filtered list if we have enough items, otherwise use the full list
    (validContent.length >= 3 ? validContent : streamingContent)
      .slice(0, 5)
      .forEach(content => {
        facts += `- ${content.title}\n`;
      });
  } else {
    facts += `Couldn't extract specific new content information for ${serviceName} from search results.\n`;
  }
  
  return facts;
}