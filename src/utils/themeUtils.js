/**
 * Theme utility functions for Kids AI application
 * Provides functions to get CSS variable colors and manage themes
 */

/**
 * Get a CSS variable color value by name
 * @param {string} varName - CSS variable name (without the -- prefix)
 * @param {number} opacity - Optional opacity value (0-1)
 * @returns {string} - CSS color string in appropriate format (hsl or hsla)
 */
export const getCssVar = (varName, opacity = null) => {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${varName}`).trim();
  
  if (opacity !== null) {
    return `hsla(${value}, ${opacity})`;
  }
  return `hsl(${value})`;
};

/**
 * Get a state color by name
 * @param {string} stateName - State name (listening, thinking, speaking, searching, idle)
 * @param {number} opacity - Optional opacity value (0-1)
 * @returns {string} - CSS color string
 */
export const getStateColor = (stateName, opacity = null) => {
  return getCssVar(`state-${stateName}`, opacity);
};

/**
 * Get a grey scale color by intensity (10-100)
 * @param {number} intensity - Grey intensity (10, 20, 30, 40, 50, 60, 70, 80, 90, 100)
 * @param {number} opacity - Optional opacity value (0-1)
 * @returns {string} - CSS color string
 */
export const getGreyColor = (intensity, opacity = null) => {
  return getCssVar(`grey-${intensity}`, opacity);
};

/**
 * Get an orange scale color by intensity (10-100)
 * @param {number} intensity - Orange intensity (10, 20, 30, 40, 50, 60, 70, 80, 90, 100)
 * @param {number} opacity - Optional opacity value (0-1)
 * @returns {string} - CSS color string
 */
export const getOrangeColor = (intensity, opacity = null) => {
  return getCssVar(`orange-${intensity}`, opacity);
};

/**
 * Convert a CSS hsl/hsla variable to RGB values
 * Useful for canvas operations and color manipulations
 * 
 * @param {string} varName - CSS variable name (without the -- prefix)
 * @returns {Object} - Object with r, g, b, a values (0-255 for RGB, 0-1 for alpha)
 */
export const cssVarToRgb = (varName) => {
  const color = getCssVar(varName);
  
  // Create a temporary element to compute the color
  const tempEl = document.createElement('div');
  tempEl.style.color = color;
  tempEl.style.display = 'none';
  document.body.appendChild(tempEl);
  
  // Get computed style
  const computedColor = getComputedStyle(tempEl).color;
  document.body.removeChild(tempEl);
  
  // Parse the computed RGB values
  const rgbMatch = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)/);
  
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1
    };
  }
  
  // Default fallback if parsing fails
  return { r: 0, g: 0, b: 0, a: 1 };
};

/**
 * Toggle between light and dark themes
 */
export const toggleTheme = () => {
  const root = document.documentElement;
  
  if (root.classList.contains('dark')) {
    root.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  } else {
    root.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }
};

/**
 * Initialize theme based on user preference or system settings
 * Default to dark theme
 */
export const initializeTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  
  if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    // Default to dark mode
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }
};
