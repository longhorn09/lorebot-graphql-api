import {Logging} from '@google-cloud/logging';

class PriorityLogger {
  constructor() {
    this.logging = new Logging();
    this.log = this.logging.log('lorebot-graphql-api');
    
    // Priority levels and quotas
    this.priorities = {
      'CRITICAL': { quota: 100, weight: 1.0, resetInterval: 60000 }, // 1 minute
      'ERROR': { quota: 200, weight: 0.8, resetInterval: 60000 },     // 1 minute
      'WARN': { quota: 300, weight: 0.6, resetInterval: 300000 },     // 5 minutes
      'INFO': { quota: 500, weight: 0.4, resetInterval: 600000 },     // 10 minutes
      'DEBUG': { quota: 1000, weight: 0.2, resetInterval: 900000 }    // 15 minutes
    };
    
    // Usage tracking
    this.usage = new Map();
    this.lastReset = new Map();
    
    // Priority-based message type mapping
    this.messageTypePriority = {
      'sql_query': 'INFO',
      'graphql_request': 'INFO',
      'error': 'ERROR',
      'debug': 'DEBUG',
      'info': 'INFO',
      'warn': 'WARN',
      'critical': 'CRITICAL'
    };
    
    // Performance tracking
    this.performanceMetrics = {
      totalLogged: 0,
      totalThrottled: 0,
      priorityUsage: {}
    };
  }
  
  resetQuotas() {
    const now = Date.now();
    
    for (const [priority, config] of Object.entries(this.priorities)) {
      const lastReset = this.lastReset.get(priority) || 0;
      
      if (now - lastReset > config.resetInterval) {
        this.usage.set(priority, 0);
        this.lastReset.set(priority, now);
        
        // Update performance metrics
        if (!this.performanceMetrics.priorityUsage[priority]) {
          this.performanceMetrics.priorityUsage[priority] = {
            logged: 0,
            throttled: 0
          };
        }
      }
    }
  }
  
  canLog(priority) {
    this.resetQuotas();
    
    const currentUsage = this.usage.get(priority) || 0;
    const quota = this.priorities[priority]?.quota || 100;
    
    return currentUsage < quota;
  }
  
  log(priority, message, metadata = {}) {
    if (!this.canLog(priority)) {
      this.performanceMetrics.totalThrottled++;
      
      // Log throttling event (but only once per priority per reset interval)
      const throttleKey = `throttle_${priority}`;
      const now = Date.now();
      const lastThrottle = this.lastReset.get(throttleKey) || 0;
      const resetInterval = this.priorities[priority]?.resetInterval || 60000;
      
      if (now - lastThrottle > resetInterval) {
        this.log.warn(`Log throttled for priority: ${priority}`, {
          timestamp: new Date().toISOString(),
          service: 'lorebot-graphql-api',
          priority: priority,
          reason: 'quota_exceeded',
          quota: this.priorities[priority]?.quota,
          usage: this.usage.get(priority)
        });
        this.lastReset.set(throttleKey, now);
      }
      
      return;
    }
    
    // Update usage
    const currentUsage = this.usage.get(priority) || 0;
    this.usage.set(priority, currentUsage + 1);
    
    // Update performance metrics
    this.performanceMetrics.totalLogged++;
    if (!this.performanceMetrics.priorityUsage[priority]) {
      this.performanceMetrics.priorityUsage[priority] = {
        logged: 0,
        throttled: 0
      };
    }
    this.performanceMetrics.priorityUsage[priority].logged++;
    
    // Send to Cloud Logging
    this.log.info(message, {
      timestamp: new Date().toISOString(),
      service: 'lorebot-graphql-api',
      priority: priority,
      usage: currentUsage + 1,
      quota: this.priorities[priority]?.quota,
      weight: this.priorities[priority]?.weight,
      ...metadata
    });
  }
  
  // Convenience methods with automatic priority detection
  info(message, metadata = {}) {
    this.log('INFO', message, metadata);
  }
  
  error(message, error = null, metadata = {}) {
    this.log('ERROR', message, {
      error: error?.message || error,
      stack: error?.stack,
      ...metadata
    });
  }
  
  warn(message, metadata = {}) {
    this.log('WARN', message, metadata);
  }
  
  debug(message, metadata = {}) {
    this.log('DEBUG', message, metadata);
  }
  
  critical(message, metadata = {}) {
    this.log('CRITICAL', message, metadata);
  }
  
  // Message type specific methods
  sqlQuery(query, params, context = {}) {
    this.log('INFO', 'SQL Query Executed', {
      query: query,
      params: params,
      context: context
    });
  }
  
  graphqlRequest(operation, variables, userAgent, ip) {
    this.log('INFO', 'GraphQL Request', {
      operation: operation,
      variables: variables,
      userAgent: userAgent,
      ip: ip
    });
  }
  
  // Log with explicit priority
  logWithPriority(priority, message, metadata = {}) {
    this.log(priority, message, metadata);
  }
  
  // Get current status and metrics
  getStatus() {
    const status = {
      usage: {},
      quotas: {},
      performance: this.performanceMetrics,
      lastReset: {}
    };
    
    for (const [priority, config] of Object.entries(this.priorities)) {
      status.usage[priority] = this.usage.get(priority) || 0;
      status.quotas[priority] = config.quota;
      status.lastReset[priority] = this.lastReset.get(priority) || 0;
    }
    
    return status;
  }
  
  // Update quotas dynamically
  updateQuota(priority, newQuota) {
    if (this.priorities[priority] && newQuota > 0) {
      this.priorities[priority].quota = newQuota;
    }
  }
  
  // Update reset intervals
  updateResetInterval(priority, newInterval) {
    if (this.priorities[priority] && newInterval > 0) {
      this.priorities[priority].resetInterval = newInterval;
    }
  }
  
  // Get current quotas and intervals
  getQuotas() {
    const quotas = {};
    for (const [priority, config] of Object.entries(this.priorities)) {
      quotas[priority] = {
        quota: config.quota,
        resetInterval: config.resetInterval,
        weight: config.weight
      };
    }
    return quotas;
  }
}

export default PriorityLogger; 