const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let logMessage = `${timestamp} [${level}]: ${message}`;
    
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'schedule-auto-backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Error logs - only errors and above
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),
    
    // Combined logs - all levels
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),
    
    // Security logs - for authentication, authorization, and security events
    new winston.transports.File({ 
      filename: path.join(logsDir, 'security.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Access logs - for API requests
    new winston.transports.File({ 
      filename: path.join(logsDir, 'access.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],
  
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 10485760,
      maxFiles: 3
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 10485760,
      maxFiles: 3
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: logFormat,
    level: 'debug'
  }));
}

// Security logger for authentication and authorization events
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'schedule-auto-security',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'security.log'),
      maxsize: 10485760,
      maxFiles: 5
    })
  ]
});

// Access logger for API requests
const accessLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'schedule-auto-access',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'access.log'),
      maxsize: 10485760,
      maxFiles: 5
    })
  ]
});

// Database logger for query logging and performance
const dbLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'schedule-auto-database',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'database.log'),
      maxsize: 10485760,
      maxFiles: 3
    })
  ]
});

// Logging utility functions
const loggers = {
  // General application logger
  info: (message, meta = {}) => logger.info(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  error: (message, meta = {}) => logger.error(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  
  // Security events
  security: {
    loginAttempt: (email, ip, success, reason = null) => {
      securityLogger.info('Login attempt', {
        event: 'login_attempt',
        email: email,
        ip: ip,
        success: success,
        reason: reason,
        timestamp: new Date().toISOString()
      });
    },
    
    loginSuccess: (userId, email, ip) => {
      securityLogger.info('Successful login', {
        event: 'login_success',
        userId: userId,
        email: email,
        ip: ip,
        timestamp: new Date().toISOString()
      });
    },
    
    loginFailure: (email, ip, reason) => {
      securityLogger.warn('Failed login', {
        event: 'login_failure',
        email: email,
        ip: ip,
        reason: reason,
        timestamp: new Date().toISOString()
      });
    },
    
    tokenExpired: (userId, ip) => {
      securityLogger.info('Token expired', {
        event: 'token_expired',
        userId: userId,
        ip: ip,
        timestamp: new Date().toISOString()
      });
    },
    
    invalidToken: (token, ip) => {
      securityLogger.warn('Invalid token used', {
        event: 'invalid_token',
        token: token?.substring(0, 10) + '...',
        ip: ip,
        timestamp: new Date().toISOString()
      });
    },
    
    rateLimitExceeded: (ip, endpoint, limit) => {
      securityLogger.warn('Rate limit exceeded', {
        event: 'rate_limit_exceeded',
        ip: ip,
        endpoint: endpoint,
        limit: limit,
        timestamp: new Date().toISOString()
      });
    },
    
    suspiciousActivity: (ip, activity, details) => {
      securityLogger.error('Suspicious activity detected', {
        event: 'suspicious_activity',
        ip: ip,
        activity: activity,
        details: details,
        timestamp: new Date().toISOString()
      });
    },
    
    accessDenied: (userId, resource, ip) => {
      securityLogger.warn('Access denied', {
        event: 'access_denied',
        userId: userId,
        resource: resource,
        ip: ip,
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // API access logs
  access: {
    request: (req, res, responseTime) => {
      const logData = {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        userId: req.userId || null,
        contentLength: res.get('Content-Length') || 0,
        timestamp: new Date().toISOString()
      };
      
      // Don't log sensitive auth endpoints unless there's an error
      if (req.originalUrl.includes('/auth/') && res.statusCode < 400) {
        return;
      }
      
      if (res.statusCode >= 400) {
        accessLogger.error('API request failed', logData);
      } else {
        accessLogger.info('API request', logData);
      }
    },
    
    slowQuery: (req, responseTime) => {
      accessLogger.warn('Slow API request', {
        method: req.method,
        url: req.originalUrl,
        responseTime: `${responseTime}ms`,
        userId: req.userId || null,
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // Database operations
  database: {
    query: (operation, model, duration, success = true) => {
      if (process.env.LOG_DB_QUERIES === 'true') {
        dbLogger.info('Database query', {
          operation: operation,
          model: model,
          duration: `${duration}ms`,
          success: success,
          timestamp: new Date().toISOString()
        });
      }
    },
    
    slowQuery: (operation, model, duration, query) => {
      dbLogger.warn('Slow database query', {
        operation: operation,
        model: model,
        duration: `${duration}ms`,
        query: query,
        timestamp: new Date().toISOString()
      });
    },
    
    error: (operation, model, error) => {
      dbLogger.error('Database error', {
        operation: operation,
        model: model,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    },
    
    connection: (status, details) => {
      if (status === 'connected') {
        dbLogger.info('Database connected', details);
      } else if (status === 'disconnected') {
        dbLogger.warn('Database disconnected', details);
      } else if (status === 'error') {
        dbLogger.error('Database connection error', details);
      }
    }
  },
  
  // Business logic events
  business: {
    scheduleCreated: (userId, scheduleId, employeeId) => {
      logger.info('Schedule created', {
        event: 'schedule_created',
        userId: userId,
        scheduleId: scheduleId,
        employeeId: employeeId,
        timestamp: new Date().toISOString()
      });
    },
    
    scheduleUpdated: (userId, scheduleId, changes) => {
      logger.info('Schedule updated', {
        event: 'schedule_updated',
        userId: userId,
        scheduleId: scheduleId,
        changes: changes,
        timestamp: new Date().toISOString()
      });
    },
    
    scheduleDeleted: (userId, scheduleId) => {
      logger.info('Schedule deleted', {
        event: 'schedule_deleted',
        userId: userId,
        scheduleId: scheduleId,
        timestamp: new Date().toISOString()
      });
    },
    
    employeeCreated: (userId, employeeId, employeeName) => {
      logger.info('Employee created', {
        event: 'employee_created',
        userId: userId,
        employeeId: employeeId,
        employeeName: employeeName,
        timestamp: new Date().toISOString()
      });
    },
    
    leaveRequested: (employeeId, leaveId, startDate, endDate) => {
      logger.info('Leave requested', {
        event: 'leave_requested',
        employeeId: employeeId,
        leaveId: leaveId,
        startDate: startDate,
        endDate: endDate,
        timestamp: new Date().toISOString()
      });
    },
    
    leaveApproved: (userId, leaveId, employeeId) => {
      logger.info('Leave approved', {
        event: 'leave_approved',
        approvedBy: userId,
        leaveId: leaveId,
        employeeId: employeeId,
        timestamp: new Date().toISOString()
      });
    }
  }
};

// Express middleware for request logging
const requestLoggingMiddleware = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const responseTime = Date.now() - start;
    
    // Log the request
    loggers.access.request(req, res, responseTime);
    
    // Log slow requests (over 2 seconds)
    if (responseTime > 2000) {
      loggers.access.slowQuery(req, responseTime);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Prisma logging middleware
const prismaLoggingMiddleware = (params, next) => {
  const start = Date.now();
  
  return next(params).then(result => {
    const duration = Date.now() - start;
    
    loggers.database.query(
      params.action,
      params.model,
      duration,
      true
    );
    
    // Log slow queries (over 1 second)
    if (duration > 1000) {
      loggers.database.slowQuery(
        params.action,
        params.model,
        duration,
        params.args
      );
    }
    
    return result;
  }).catch(error => {
    const duration = Date.now() - start;
    
    loggers.database.error(
      params.action,
      params.model,
      error
    );
    
    throw error;
  });
};

module.exports = {
  logger: loggers,
  requestLoggingMiddleware,
  prismaLoggingMiddleware
};