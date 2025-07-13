/**
 * Logger utility for the app
 * 
 * This provides centralized control over logging throughout the application.
 * Set LOGGING_ENABLED to false to disable all console logs.
 */

// Global flag to enable/disable logging
export const LOGGING_ENABLED = true;

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2, 
  ERROR = 3
}

// Current minimum log level to display
// Only logs with this level or higher will be shown
export const CURRENT_LOG_LEVEL = LogLevel.DEBUG;

/**
 * Logger class that wraps console methods with conditional logic
 */
class Logger {
  debug(message: string, ...args: any[]) {
    if (LOGGING_ENABLED && CURRENT_LOG_LEVEL <= LogLevel.DEBUG) {
      console.log(message, ...args);
    }
  }

  log(message: string, ...args: any[]) {
    if (LOGGING_ENABLED && CURRENT_LOG_LEVEL <= LogLevel.INFO) {
      console.log(message, ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (LOGGING_ENABLED && CURRENT_LOG_LEVEL <= LogLevel.INFO) {
      console.info(message, ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (LOGGING_ENABLED && CURRENT_LOG_LEVEL <= LogLevel.WARN) {
      console.warn(message, ...args);
    }
  }

  error(message: string, ...args: any[]) {
    if (LOGGING_ENABLED && CURRENT_LOG_LEVEL <= LogLevel.ERROR) {
      console.error(message, ...args);
    }
  }
}

// Export a singleton instance
export const logger = new Logger();

// Export a simple helper function for quick logging
export const log = (message: string, ...args: any[]) => {
  logger.log(message, ...args);
}; 