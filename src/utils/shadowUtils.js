/**
 * Utility functions for working with shadows in the animation circles
 */

/**
 * Gets the appropriate shadow for the current animation state
 * @param {string} state - Animation state ('idle', 'listening', 'thinking', 'speaking', 'searching')
 * @returns {Object} - Shadow styling object
 */
export const getCircleShadow = (state) => {
  // Valid states
  const validStates = ['idle', 'listening', 'thinking', 'speaking', 'searching'];
  const shadowVar = validStates.includes(state) 
    ? `var(--circle-shadow-${state})` 
    : 'var(--circle-shadow)';
    
  // Return object with filter property
  return {
    // Use filter instead of box-shadow to ensure proper rendering with transparency
    filter: `drop-shadow(${shadowVar})`,
    // Ensure the circle's border-radius isn't affected by the filter
    borderRadius: '50%',
    overflow: 'visible'
  };
};

/**
 * Gets a CSS variable value, handling references to other variables
 * @param {string} varName - CSS variable name (without the -- prefix)
 * @returns {string} - The resolved CSS variable value
 */
export const getCssVarValue = (varName) => {
  // Get the CSS variable value
  const cssVar = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${varName}`).trim();
  
  // Check if it's referencing another variable (starts with "var")
  if (cssVar.startsWith('var(--')) {
    // Extract the referenced variable name
    const referencedVar = cssVar.match(/var\\(--([^)]+)\\)/)[1];
    // Get the actual value from the referenced variable
    return getComputedStyle(document.documentElement)
      .getPropertyValue(`--${referencedVar}`).trim();
  }
  
  return cssVar;
};

/**
 * Build a shadow string with customizable values
 * @param {Object} options - Shadow options
 * @param {number} options.topOffset - Vertical offset for top light (px)
 * @param {number} options.topBlurRadius - Blur radius for top light (px)
 * @param {number} options.topSpreadRadius - Spread radius for top light (px)
 * @param {string} options.topColor - Color for top light (rgba string)
 * @param {number} options.bottomOffset - Vertical offset for bottom shadow (px)
 * @param {number} options.bottomBlurRadius - Blur radius for bottom shadow (px)
 * @param {number} options.bottomSpreadRadius - Spread radius for bottom shadow (px)
 * @param {string} options.bottomColor - Color for bottom shadow (rgba string)
 * @returns {string} - CSS shadow string
 */
export const buildCustomShadow = ({
  topOffset = -44,
  topBlurRadius = 52,
  topSpreadRadius = -8,
  topColor = 'rgba(255, 255, 255, 0.20)',
  bottomOffset = 36,
  bottomBlurRadius = 68,
  bottomSpreadRadius = -8,
  bottomColor = 'rgba(44, 55, 58, 0.50)'
}) => {
  return `0px ${topOffset}px ${topBlurRadius}px ${topSpreadRadius}px ${topColor}, 0px ${bottomOffset}px ${bottomBlurRadius}px ${bottomSpreadRadius}px ${bottomColor}`;
};
