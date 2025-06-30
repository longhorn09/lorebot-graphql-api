// Date/Time formats
export const MYSQL_DATETIME_FORMAT = "YYYY-MM-DD HH:mm:ss";
export const MYSQL_DATE_FORMAT = "YYYY-MM-DD";
export const MYSQL_TIME_FORMAT = "HH:mm:ss";

// GraphQL pagination defaults
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// Database constants
export const DEFAULT_SUBMITTER = "system";
export const DEFAULT_CREATE_DATE = () => new Date().toISOString().split('T')[0];

// Logging constants
export const LOG_PADDING_LENGTH = 30;

// Utility functions
export const proper = (str) => {
  if (!str) return 'Unknown';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}; 