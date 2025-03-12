/**
 * ContentSafetyService - Provides age-appropriate content filtering for children
 * 
 * This service helps filter search queries and AI responses based on the child's age,
 * preventing exposure to inappropriate or sensitive content.
 */

// Topics that should be completely blocked regardless of age
const BLOCKED_TOPICS = [
  // Adult content
  'porn', 'pornography', 'xxx', 'sexual intercourse', 'naked pictures', 
  
  // Extreme violence
  'gore', 'beheading', 'torture', 'terrorist attacks',
  
  // Self-harm
  'suicide methods', 'how to kill', 'how to hurt',
  
  // Dangerous activities
  'how to make bombs', 'how to make weapons'
];

// Topics that should be handled with age-appropriate responses
const AGE_SENSITIVE_TOPICS = {
  YOUNG_CHILD: [ // Ages 5-7
    'suicide', 'murder', 'explicit violence'
  ],
  CHILD: [ // Ages 8-10
    'suicide', 'graphic violence'
  ],
  PRE_TEEN: [ // Ages 11-12
    'suicide'
  ]
};

// Age-appropriate alternative responses for sensitive topics
const ALTERNATIVE_RESPONSES = {
  YOUNG_CHILD: {
    suicide: "This is a very serious topic about people who are very sad. It's important to talk to grown-ups if you or anyone you know feels very sad. Would you like to talk about something else?",
    DEFAULT: "That's a serious topic. If you're curious about it, you might want to ask a parent or teacher. Would you like to talk about something else instead?"
  },
  CHILD: {
    suicide: "Suicide is when someone is so sad or troubled that they end their own life. It's very serious and if you or someone you know feels very sad, it's important to talk to a trusted adult right away.",
    DEFAULT: "That's a complicated topic. I can give you some basic information, but your parents or teachers might be able to explain better if you have more questions."
  },
  PRE_TEEN: {
    suicide: "Suicide is when someone chooses to end their own life because they're experiencing extreme sadness or mental health issues. It's very important to know that help is always available, and these feelings can get better with support. If you or someone you know has these thoughts, please talk to a trusted adult right away.",
    DEFAULT: "I can provide some information on this topic in a way that's appropriate for your age. If you want to know more afterward, talking to your parents or teachers might be helpful."
  }
};

/**
 * Get the age category based on numerical age
 * @param {number} age - The child's age
 * @returns {string} Age category (YOUNG_CHILD, CHILD, PRE_TEEN, or TEEN)
 */
function getAgeCategory(age) {
  if (age <= 7) return 'YOUNG_CHILD';
  if (age <= 10) return 'CHILD';
  if (age <= 12) return 'PRE_TEEN';
  return 'TEEN'; // 13+ (fewer restrictions)
}

/**
 * Check if a query contains any blocked topics
 * @param {string} query - The search query or message
 * @returns {boolean} True if the query contains blocked topics
 */
function containsBlockedTopic(query) {
  if (!query) return false;
  
  const lowerQuery = query.toLowerCase();
  
  return BLOCKED_TOPICS.some(topic => {
    // Check for exact word match using word boundaries
    const regex = new RegExp(`\\b${topic}\\b`, 'i');
    return regex.test(lowerQuery);
  });
}

/**
 * Check if a query contains age-sensitive topics for the given age
 * @param {string} query - The search query or message
 * @param {number} age - The child's age
 * @returns {string|null} The matched sensitive topic or null if none found
 */
function containsSensitiveTopic(query, age) {
  if (!query) return null;
  
  const lowerQuery = query.toLowerCase();
  const ageCategory = getAgeCategory(age);
  
  // If we don't have sensitive topics defined for this age, return null
  if (!AGE_SENSITIVE_TOPICS[ageCategory]) return null;
  
  const matchedTopic = AGE_SENSITIVE_TOPICS[ageCategory].find(topic => {
    // Check for word match with word boundaries
    const regex = new RegExp(`\\b${topic}\\b`, 'i');
    return regex.test(lowerQuery);
  });
  
  return matchedTopic || null;
}

/**
 * Get an age-appropriate alternative response for a sensitive topic
 * @param {string} topic - The sensitive topic
 * @param {number} age - The child's age
 * @returns {string} Alternative response
 */
function getAlternativeResponse(topic, age) {
  const ageCategory = getAgeCategory(age);
  const responses = ALTERNATIVE_RESPONSES[ageCategory] || ALTERNATIVE_RESPONSES.CHILD;
  
  // Return specific response for the topic or default response
  return responses[topic] || responses.DEFAULT;
}

/**
 * Add age-appropriate safeguards to the system prompt
 * @param {string} systemPrompt - The current system prompt
 * @param {number} age - The child's age
 * @returns {string} Enhanced system prompt with safety instructions
 */
function enhanceSystemPromptWithSafeguards(systemPrompt, age) {
  const ageCategory = getAgeCategory(age);
  
  // Define age-specific safety instructions - much lighter now
  let safetyInstructions = '';
  
  switch (ageCategory) {
    case 'YOUNG_CHILD': // Ages 5-7
      safetyInstructions = `
      CONTENT SAFETY GUIDELINES FOR A ${age}-YEAR-OLD CHILD:
      - Simplify explanations for young children.
      - Avoid graphic or explicit content.
      - For sensitive topics like death or violence, provide very basic, gentle explanations.
      - Focus on positive and age-appropriate content.
      `;
      break;
      
    case 'CHILD': // Ages 8-10
      safetyInstructions = `
      CONTENT GUIDELINES FOR A ${age}-YEAR-OLD CHILD:
      - Provide age-appropriate information.
      - Simplify complex topics without unnecessary details.
      - Answer questions honestly but without graphic or disturbing content.
      `;
      break;
      
    case 'PRE_TEEN': // Ages 11-12
      safetyInstructions = `
      CONTENT GUIDELINES FOR A ${age}-YEAR-OLD:
      - Provide factual, age-appropriate information.
      - Be honest but avoid unnecessarily detailed descriptions of violence or disturbing content.
      - For sensitive topics, focus on educational aspects rather than graphic details.
      `;
      break;
      
    default: // Teen (13+)
      safetyInstructions = `
      CONTENT GUIDELINES FOR A TEENAGER AGED ${age}:
      - Provide appropriate information that respects their maturity level.
      - Balance educational content with age-appropriate boundaries.
      - For sensitive topics, focus on factual information rather than graphic details.
      `;
      break;
  }
  
  // Insert safety instructions near the beginning of the system prompt
  return systemPrompt.replace(
    'IMPORTANT INSTRUCTIONS FOR SPEED AND PERFORMANCE:',
    `IMPORTANT INSTRUCTIONS FOR SPEED AND PERFORMANCE:
      ${safetyInstructions}`
  );
}

/**
 * Enhance search results format with additional safety instructions
 * @param {string} formattedResults - Original formatted search results 
 * @param {number} age - Child's age
 * @returns {string} Enhanced formatted results with safety instructions
 */
function enhanceSearchResultsWithSafeguards(formattedResults, age) {
  const ageCategory = getAgeCategory(age);
  
  let safetyAddendum = '';
  
  switch (ageCategory) {
    case 'YOUNG_CHILD': // Ages 5-7
      safetyAddendum = `
      SAFETY NOTE: Keep your response appropriate for a ${age}-year-old child. Simplify complex information and avoid disturbing content.
      `;
      break;
      
    case 'CHILD': // Ages 8-10
      safetyAddendum = `
      SAFETY NOTE: Provide information at a level appropriate for a ${age}-year-old. Simplify technical terms and complex ideas.
      `;
      break;
      
    case 'PRE_TEEN': // Ages 11-12
      safetyAddendum = `
      SAFETY NOTE: Frame your response appropriately for a ${age}-year-old. Avoid explicit or disturbing details while providing helpful information.
      `;
      break;
      
    default: // Teen (13+)
      safetyAddendum = `
      SAFETY NOTE: Provide age-appropriate information for a teenager.
      `;
      break;
  }
  
  // Add the safety instructions right before the final instruction paragraph
  const lastParagraphMatch = formattedResults.match(/Please use this information.+$/s);
  if (lastParagraphMatch) {
    return formattedResults.replace(
      lastParagraphMatch[0],
      `${safetyAddendum}\n\n${lastParagraphMatch[0]}`
    );
  }
  
  // If matching fails, just append to the end
  return `${formattedResults}\n\n${safetyAddendum}`;
}

export const ContentSafetyService = {
  containsBlockedTopic,
  containsSensitiveTopic,
  getAlternativeResponse,
  enhanceSystemPromptWithSafeguards,
  enhanceSearchResultsWithSafeguards,
  getAgeCategory
};

export default ContentSafetyService;
