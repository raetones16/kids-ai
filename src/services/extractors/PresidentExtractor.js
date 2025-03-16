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