import {Logging} from '@google-cloud/logging';

class ThrottledLogger {
  constructor() {
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
      'sql_query': 50,    // Max 50 SQL queries per minute
      'error': 100,       // Max 100 errors per minute
      'debug': 20,        // Max 20 debug messages per minute
      'graphql_request': 30, // Max 30 GraphQL requests per minute
      'info': 200,        // Max 200 info messages per minute
      'warn': 50          // Max 50 warning messages per minute
    };
    
    // Throttle tracking
    this.throttleEvents = new Map();
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
  
  // Convenience methods
  info(message, metadata = {}) {
    this.log('info', message, metadata);
  }
  
  error(message, error = null, metadata = {}) {
    this.log('error', message, {
      error: error?.message || error,
      stack: error?.stack,
      ...metadata
    });
  }
  
  warn(message, metadata = {}) {
    this.log('warn', message, metadata);
  }
  
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

export default ThrottledLogger; 