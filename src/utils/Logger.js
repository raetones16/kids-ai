/**
 * Simple logging utility to help with debugging
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Set this to control which levels are logged
// In production, could be set to WARN to only show warnings and errors
let currentLogLevel = LOG_LEVELS.WARN;

// Log history for in-app debugging
const logHistory = [];

// Maximum log history size
const MAX_LOG_HISTORY = 100;

/**
 * Log a message at a specific level
 * @param {string} level - The log level (DEBUG, INFO, WARN, ERROR)
 * @param {string} component - Component or module name
 * @param {string} message - Log message
 * @param {any} data - Optional data to include
 */
const log = (level, component, message, data = null) => {
  const levelValue = LOG_LEVELS[level] || 0;
  
  if (levelValue >= currentLogLevel) {
    const timestamp = new Date().toISOString();
    const logObj = { timestamp, level, component, message };
    
    if (data) {
      logObj.data = data;
    }
    
    // Add to log history
    logHistory.push(logObj);
    
    // Trim history if it gets too large
    if (logHistory.length > MAX_LOG_HISTORY) {
      logHistory.shift();
    }
    
    // Format for console
    const formattedMessage = `[${timestamp}] [${level}] [${component}] ${message}`;
    
    switch (level) {
      case 'ERROR':
        console.error(formattedMessage, data || '');
        break;
      case 'WARN':
        console.warn(formattedMessage, data || '');
        break;
      case 'INFO':
        console.info(formattedMessage, data || '');
        break;
      default:
        console.log(formattedMessage, data || '');
    }
  }
};

// Convenience methods
const debug = (component, message, data) => log('DEBUG', component, message, data);
const info = (component, message, data) => log('INFO', component, message, data);
const warn = (component, message, data) => log('WARN', component, message, data);
const error = (component, message, data) => log('ERROR', component, message, data);

/**
 * Get the current log history
 */
const getLogHistory = () => [...logHistory];

/**
 * Set the current log level
 * @param {string} level - New log level (DEBUG, INFO, WARN, ERROR)
 */
const setLogLevel = (level) => {
  if (LOG_LEVELS[level] !== undefined) {
    currentLogLevel = LOG_LEVELS[level];
    info('Logger', `Log level set to ${level}`);
  } else {
    warn('Logger', `Invalid log level: ${level}`);
  }
};

/**
 * Clear the log history
 */
const clearLogHistory = () => {
  logHistory.length = 0;
  info('Logger', 'Log history cleared');
};

/**
 * Export the log history to a string
 */
const exportLogs = () => {
  return JSON.stringify(logHistory, null, 2);
};

// Export as a named object
const Logger = {
  debug,
  info,
  warn,
  error,
  getLogHistory,
  setLogLevel,
  clearLogHistory,
  exportLogs,
  LOG_LEVELS
};

export default Logger;
