/**
 * Utility functions for working with CSS colors in the app
 */

/**
 * Gets the actual color value from a CSS variable, handling nested variables
 * @param {string} varName - CSS variable name (without the -- prefix)
 * @returns {string} - The computed HSL color value
 */
export const getCssColorValue = (varName) => {
  // Get the CSS variable value
  const cssVar = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${varName}`).trim();
  
  // Check if it's referencing another variable (starts with "var")
  if (cssVar.startsWith('var(--')) {
    // Extract the referenced variable name
    const referencedVar = cssVar.match(/var\\(--([^)]+)\\)/)[1];
    // Get the actual value from the referenced variable
    const actualValue = getComputedStyle(document.documentElement)
      .getPropertyValue(`--${referencedVar}`).trim();
    return actualValue;
  }
  
  return cssVar;
};

/**
 * Convert a CSS HSL color to RGB values
 * @param {string} hslValue - HSL value in format "210 26% 16%"
 * @returns {object} - Object with r, g, b values (0-255)
 */
export const hslToRgb = (hslValue) => {
  // Create a temporary element to compute the color
  const tempEl = document.createElement('div');
  tempEl.style.color = `hsl(${hslValue})`;
  document.body.appendChild(tempEl);
  
  // Get computed RGB
  const computedColor = getComputedStyle(tempEl).color;
  document.body.removeChild(tempEl);
  
  // Parse RGB values
  const matches = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (matches) {
    return {
      r: parseInt(matches[1], 10),
      g: parseInt(matches[2], 10),
      b: parseInt(matches[3], 10)
    };
  }
  
  // Default fallback
  return { r: 255, g: 255, b: 255 };
};

/**
 * Generate a brighter version of a color (useful for highlights)
 * @param {string} varName - CSS variable name
 * @param {number} factor - Amount to brighten (0-1)
 * @returns {string} - HSL color string
 */
export const getBrighterColor = (varName, factor = 0.2) => {
  const hslValue = getCssColorValue(varName);
  const [h, s, l] = hslValue.split(' ').map(v => 
    parseFloat(v.replace('%', ''))
  );
  
  // Increase lightness, but cap at 100%
  const newL = Math.min(100, l + factor * 100);
  
  return `${h} ${s}% ${newL}%`;
};
