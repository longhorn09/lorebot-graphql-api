import {Logging} from '@google-cloud/logging';

class AdaptiveLogger {
  constructor() {
    this.logging = new Logging();
    this.log = this.logging.log('lorebot-graphql-api');
    
    // Circuit breaker state
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.circuitState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.threshold = 5; // failures before opening circuit
    this.timeout = 60000; // 1 minute timeout
    
    // Adaptive limits
    this.baseLimit = 100;
    this.currentLimit = this.baseLimit;
    this.successCount = 0;
    this.adjustmentFactor = 0.1;
    
    // Message type tracking
    this.messageCounts = new Map();
    this.messageLimits = {
      'sql_query': 50,
      'error': 100,
      'debug': 20,
      'graphql_request': 30,
      'info': 200,
      'warn': 50
    };
    
    // Performance metrics
    this.responseTimes = [];
    this.maxResponseTime = 5000; // 5 seconds
  }
  
  shouldLog(messageType) {
    // Check circuit breaker
    if (this.circuitState === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.circuitState = 'HALF_OPEN';
      } else {
        return false;
      }
    }
    
    // Check adaptive rate limiting
    const currentUsage = this.messageCounts.get(messageType) || 0;
    const limit = this.messageLimits[messageType] || 100;
    
    return currentUsage < limit && this.successCount < this.currentLimit;
  }
  
  async log(messageType, message, metadata = {}) {
    if (!this.shouldLog(messageType)) {
      return;
    }
    
    const startTime = Date.now();
    
    try {
      await this.log.info(message, {
        timestamp: new Date().toISOString(),
        service: 'lorebot-graphql-api',
        messageType: messageType,
        circuitState: this.circuitState,
        currentLimit: this.currentLimit,
        ...metadata
      });
      
      // Success - adjust limits and metrics
      const responseTime = Date.now() - startTime;
      this.responseTimes.push(responseTime);
      
      // Keep only last 100 response times
      if (this.responseTimes.length > 100) {
        this.responseTimes.shift();
      }
      
      this.successCount++;
      this.failureCount = 0;
      this.circuitState = 'CLOSED';
      
      // Update message count
      const currentCount = this.messageCounts.get(messageType) || 0;
      this.messageCounts.set(messageType, currentCount + 1);
      
      // Gradually increase limit on success (if response times are good)
      const avgResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
      if (this.successCount % 10 === 0 && avgResponseTime < this.maxResponseTime) {
        this.currentLimit = Math.min(this.baseLimit * 2, this.currentLimit + this.adjustmentFactor * this.currentLimit);
      }
      
    } catch (error) {
      // Failure - adjust limits and circuit breaker
      this.failureCount++;
      this.lastFailureTime = Date.now();
      this.successCount = 0;
      
      // Reduce limit on failure
      this.currentLimit = Math.max(this.baseLimit * 0.5, this.currentLimit - this.adjustmentFactor * this.currentLimit);
      
      if (this.failureCount >= this.threshold) {
        this.circuitState = 'OPEN';
      }
      
      // Log the failure (but don't use the same logger to avoid infinite loops)
      console.error('AdaptiveLogger failed to log:', error.message);
    }
  }
  
  // Convenience methods
  async info(message, metadata = {}) {
    await this.log('info', message, metadata);
  }
  
  async error(message, error = null, metadata = {}) {
    await this.log('error', message, {
      error: error?.message || error,
      stack: error?.stack,
      ...metadata
    });
  }
  
  async warn(message, metadata = {}) {
    await this.log('warn', message, metadata);
  }
  
  async debug(message, metadata = {}) {
    await this.log('debug', message, metadata);
  }
  
  async sqlQuery(query, params, context = {}) {
    await this.log('sql_query', 'SQL Query Executed', {
      query: query,
      params: params,
      context: context
    });
  }
  
  async graphqlRequest(operation, variables, userAgent, ip) {
    await this.log('graphql_request', 'GraphQL Request', {
      operation: operation,
      variables: variables,
      userAgent: userAgent,
      ip: ip
    });
  }
  
  // Get current status
  getStatus() {
    return {
      circuitState: this.circuitState,
      currentLimit: this.currentLimit,
      successCount: this.successCount,
      failureCount: this.failureCount,
      avgResponseTime: this.responseTimes.length > 0 ? 
        this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length : 0,
      messageCounts: Object.fromEntries(this.messageCounts)
    };
  }
}

export default AdaptiveLogger; 