import {Logging} from '@google-cloud/logging';

class SamplingLogger {
  constructor() {
    this.logging = new Logging();
    this.log = this.logging.log('lorebot-graphql-api');
    
    // Sampling rates (percentage)
    this.samplingRates = {
      'sql_query': 10,      // Log 10% of SQL queries
      'graphql_request': 20, // Log 20% of GraphQL requests
      'error': 100,         // Log 100% of errors
      'debug': 5,           // Log 5% of debug messages
      'info': 50,           // Log 50% of info messages
      'warn': 75,           // Log 75% of warning messages
      'critical': 100       // Log 100% of critical messages
    };
    
    // Consistent sampling (same request = same decision)
    this.requestSamples = new Map();
    
    // Sampling statistics
    this.samplingStats = new Map();
    
    // Cleanup old samples periodically
    this.lastCleanup = Date.now();
    this.cleanupInterval = 300000; // 5 minutes
  }
  
  cleanupOldSamples() {
    const now = Date.now();
    if (now - this.lastCleanup > this.cleanupInterval) {
      // Remove samples older than 1 hour
      const oneHourAgo = now - 3600000;
      for (const [key, timestamp] of this.requestSamples.entries()) {
        if (timestamp < oneHourAgo) {
          this.requestSamples.delete(key);
        }
      }
      this.lastCleanup = now;
    }
  }
  
  shouldSample(messageType, requestId = null) {
    this.cleanupOldSamples();
    
    const rate = this.samplingRates[messageType] || 10;
    
    // Use request ID for consistent sampling within the same request
    const key = requestId ? `${requestId}_${messageType}` : `${Date.now()}_${messageType}`;
    
    if (!this.requestSamples.has(key)) {
      this.requestSamples.set(key, Math.random() * 100 < rate);
    }
    
    const shouldSample = this.requestSamples.get(key);
    
    // Update statistics
    if (!this.samplingStats.has(messageType)) {
      this.samplingStats.set(messageType, { sampled: 0, total: 0 });
    }
    const stats = this.samplingStats.get(messageType);
    stats.total++;
    if (shouldSample) {
      stats.sampled++;
    }
    
    return shouldSample;
  }
  
  log(messageType, message, metadata = {}, requestId = null) {
    if (!this.shouldSample(messageType, requestId)) {
      return;
    }
    
    this.log.info(message, {
      timestamp: new Date().toISOString(),
      service: 'lorebot-graphql-api',
      messageType: messageType,
      sampleRate: this.samplingRates[messageType],
      requestId: requestId,
      samplingStats: this.samplingStats.get(messageType),
      ...metadata
    });
  }
  
  // Convenience methods
  info(message, metadata = {}, requestId = null) {
    this.log('info', message, metadata, requestId);
  }
  
  error(message, error = null, metadata = {}, requestId = null) {
    this.log('error', message, {
      error: error?.message || error,
      stack: error?.stack,
      ...metadata
    }, requestId);
  }
  
  warn(message, metadata = {}, requestId = null) {
    this.log('warn', message, metadata, requestId);
  }
  
  debug(message, metadata = {}, requestId = null) {
    this.log('debug', message, metadata, requestId);
  }
  
  critical(message, metadata = {}, requestId = null) {
    this.log('critical', message, metadata, requestId);
  }
  
  sqlQuery(query, params, context = {}, requestId = null) {
    this.log('sql_query', 'SQL Query Executed', {
      query: query,
      params: params,
      context: context
    }, requestId);
  }
  
  graphqlRequest(operation, variables, userAgent, ip, requestId = null) {
    this.log('graphql_request', 'GraphQL Request', {
      operation: operation,
      variables: variables,
      userAgent: userAgent,
      ip: ip
    }, requestId);
  }
  
  // Get sampling statistics
  getSamplingStats() {
    const stats = {};
    for (const [messageType, data] of this.samplingStats.entries()) {
      stats[messageType] = {
        ...data,
        rate: this.samplingRates[messageType],
        actualRate: data.total > 0 ? (data.sampled / data.total) * 100 : 0
      };
    }
    return stats;
  }
  
  // Update sampling rates
  updateSamplingRate(messageType, newRate) {
    if (newRate >= 0 && newRate <= 100) {
      this.samplingRates[messageType] = newRate;
    }
  }
  
  // Get current sampling rates
  getSamplingRates() {
    return { ...this.samplingRates };
  }
}

export default SamplingLogger; 