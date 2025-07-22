import {Logging} from '@google-cloud/logging';

class ThrottledLogger {
  constructor() {
    // Singleton pattern - return existing instance if it exists
    if (ThrottledLogger.instance !== null && ThrottledLogger.instance !== undefined) {
      return ThrottledLogger.instance;
    }
    
    this.logging = new Logging();
    this.log = this.logging.log('lorebot-graphql-api');
    
    // Token bucket for rate limiting
    this.tokens = 100; // Max tokens
    this.maxTokens = 100;
    this.refillRate = 10; // tokens per second
    this.lastRefill = Date.now();
    
    // Per-message type limits
    this.messageCounts = new Map();
    this.messageLimits = {
      'sql_query': 15,    // Max 15 SQL queries per minute
      'error': 15,       // Max 115 errors per minute
      'debug': 15,        // Max 15 debug messages per minute
      'graphql_request': 15, // Max 15 GraphQL requests per minute
      'info': 15,        // Max 215 info messages per minute
      'warn': 15          // Max 15 warning messages per minute
    };
    
    // Throttle tracking
    this.throttleEvents = new Map();
    
    // Store the instance
    ThrottledLogger.instance = this;
  }
  
  refillTokens() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
  
  canLog(messageType) {
    this.refillTokens();
    
    // Check global rate limit
    if (this.tokens < 1) {
      return false;
    }
    
    // Check per-message type limits
    const now = Date.now();
    const minuteAgo = now - 60000;
    
    if (!this.messageCounts.has(messageType)) {
      this.messageCounts.set(messageType, []);
    }
    
    const counts = this.messageCounts.get(messageType);
    const recentCounts = counts.filter(timestamp => timestamp > minuteAgo);
    
    if (recentCounts.length >= this.messageLimits[messageType]) {
      return false;
    }
    
    return true;
  }
  
  log(messageType, message, metadata = {}) {
    if (!this.canLog(messageType)) {
      // Log throttling event once per minute
      const throttleKey = `throttle_${messageType}`;
      const now = Date.now();
      const lastThrottle = this.throttleEvents.get(throttleKey) || 0;
      
      if (now - lastThrottle > 60000) { // Only log throttle event once per minute
        this.log.warn(`Log throttled for message type: ${messageType}`, {
          timestamp: new Date().toISOString(),
          service: 'lorebot-graphql-api',
          messageType: messageType,
          reason: 'rate_limit_exceeded',
          limit: this.messageLimits[messageType],
          tokens: this.tokens
        });
        this.throttleEvents.set(throttleKey, now);
      }
      return;
    }
    
    // Update counters
    this.tokens--;
    const counts = this.messageCounts.get(messageType);
    counts.push(Date.now());
    
    // Send to Cloud Logging
    this.log.info(message, {
      timestamp: new Date().toISOString(),
      service: 'lorebot-graphql-api',
      messageType: messageType,
      tokensRemaining: this.tokens,
      ...metadata
    });
  }
  
  
  /** 
   * wrapper of native cloud logging method but to leverage throttling and rate limiting
   * @param {*} message 
   * @param {*} metadata 
  */
  info(message, metadata = {}) {
    this.log('info', message, metadata);
  }
  
  /**
   * wrapper of native cloud logging method but to leverage throttling and rate limiting
   * @param {*} message 
   * @param {*} error 
   * @param {*} metadata 
   */
  error(message, error = null, metadata = {}) {
    this.log('error', message, {
      error: error?.message || error,
      stack: error?.stack,
      ...metadata
    });
  }
  
  /** 
   * wrapper of native cloud logging method but to leverage throttling and rate limiting
   * @param {*} message 
   * @param {*} metadata 
  */
  warn(message, metadata = {}) {
    this.log('warn', message, metadata);
  }
  

  /** 
   * wrapper of native cloud logging method but to leverage throttling and rate limiting
   * @param {*} message 
   * @param {*} metadata 
  */  
  debug(message, metadata = {}) {
    this.log('debug', message, metadata);
  }
  
  sqlQuery(query, params, context = {}) {
    this.log('sql_query', 'SQL Query Executed', {
      query: query,
      params: params,
      context: context
    });
  }
  
  graphqlRequest(operation, variables, userAgent, ip) {
    this.log('graphql_request', 'GraphQL Request', {
      operation: operation,
      variables: variables,
      userAgent: userAgent,
      ip: ip
    });
  }
}

// Export a single instance (singleton)
export default new ThrottledLogger(); 