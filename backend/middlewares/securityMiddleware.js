const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const validator = require('validator');
const compression = require('compression');

// XSS sanitization middleware
const xssSanitizer = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    console.error('XSS sanitization error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid input detected',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Recursive function to sanitize object properties
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return xss(obj, {
      whiteList: {}, // No HTML tags allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    Object.keys(obj).forEach(key => {
      const sanitizedKey = xss(key, { whiteList: {} });
      sanitized[sanitizedKey] = sanitizeObject(obj[key]);
    });
    return sanitized;
  }
  
  return obj;
};

// Input validation middleware for common data types
const validateInput = (req, res, next) => {
  try {
    // Validate email fields
    if (req.body.email && !validator.isEmail(req.body.email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        field: 'email'
      });
    }
    
    // Validate numeric IDs
    const numericFields = ['id', 'employeeId', 'scheduleId', 'userId', 'companyId'];
    for (const field of numericFields) {
      if (req.body[field] !== undefined) {
        const value = req.body[field];
        if (!validator.isInt(String(value), { min: 1 })) {
          return res.status(400).json({
            success: false,
            message: `Invalid ${field} format`,
            field: field
          });
        }
      }
      if (req.params[field] !== undefined) {
        const value = req.params[field];
        if (!validator.isInt(String(value), { min: 1 })) {
          return res.status(400).json({
            success: false,
            message: `Invalid ${field} format`,
            field: field
          });
        }
      }
    }
    
    // Validate date fields
    const dateFields = ['date', 'startDate', 'endDate', 'createdAt', 'updatedAt'];
    for (const field of dateFields) {
      if (req.body[field] && !validator.isISO8601(req.body[field])) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${field} format. Use ISO 8601 format (YYYY-MM-DD)`,
          field: field
        });
      }
    }
    
    // Validate time fields
    const timeFields = ['startTime', 'endTime'];
    for (const field of timeFields) {
      if (req.body[field]) {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(req.body[field])) {
          return res.status(400).json({
            success: false,
            message: `Invalid ${field} format. Use HH:MM format`,
            field: field
          });
        }
      }
    }
    
    // Validate text length limits
    const textLimits = {
      name: 100,
      email: 254,
      password: 128,
      companyName: 100,
      address: 255,
      phone: 20,
      notes: 1000,
      title: 200,
      content: 5000,
      message: 1000
    };
    
    for (const [field, maxLength] of Object.entries(textLimits)) {
      if (req.body[field] && req.body[field].length > maxLength) {
        return res.status(400).json({
          success: false,
          message: `${field} is too long. Maximum ${maxLength} characters allowed`,
          field: field
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Input validation error:', error);
    res.status(400).json({
      success: false,
      message: 'Input validation failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Rate limiting configurations
const createRateLimit = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Different rate limits for different endpoints
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 requests per windowMs
  'Too many authentication attempts, please try again later',
  false
);

const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many API requests, please try again later',
  true
);

const strictRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // limit each IP to 10 requests per windowMs
  'Too many requests to sensitive endpoint, please try again later',
  false
);

// Slow down middleware for brute force protection
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 5, // allow 5 requests per 15 minutes at full speed
  delayMs: 500, // add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // max delay of 20 seconds
  skipSuccessfulRequests: false
});

// Content Security Policy configuration
const contentSecurityPolicy = {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https:"],
    fontSrc: ["'self'"],
    connectSrc: ["'self'"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
  }
};

// Helmet security middleware configuration
const helmetConfig = {
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? contentSecurityPolicy : false,
  crossOriginEmbedderPolicy: false, // Disabled for API compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' },
  hidePoweredBy: true
};

// CORS configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      process.env.FRONTEND_URL,
      process.env.DOMAIN_URL
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};

// Request size limiting
const requestSizeLimit = (req, res, next) => {
  const maxSizes = {
    'application/json': 10 * 1024 * 1024, // 10MB for JSON
    'multipart/form-data': 50 * 1024 * 1024, // 50MB for file uploads
    'application/x-www-form-urlencoded': 1024 * 1024 // 1MB for form data
  };
  
  const contentType = req.headers['content-type']?.split(';')[0];
  const contentLength = parseInt(req.headers['content-length']) || 0;
  const maxSize = maxSizes[contentType] || 1024 * 1024; // Default 1MB
  
  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      message: 'Request entity too large',
      maxSize: maxSize,
      receivedSize: contentLength
    });
  }
  
  next();
};

// IP whitelist middleware (for admin endpoints)
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0 || process.env.NODE_ENV !== 'production') {
      return next();
    }
    
    const clientIP = req.ip || 
      req.connection.remoteAddress || 
      req.socket.remoteAddress ||
      (req.connection.socket ? req.connection.socket.remoteAddress : null);
    
    if (!allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied from this IP address'
      });
    }
    
    next();
  };
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };
    
    // Only log non-sensitive requests
    if (!req.originalUrl.includes('/auth/') || res.statusCode >= 400) {
      console.log(`[${logData.timestamp}] ${logData.method} ${logData.url} - ${logData.statusCode} - ${logData.duration}`);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

module.exports = {
  // Individual middlewares
  xssSanitizer,
  validateInput,
  requestSizeLimit,
  requestLogger,
  
  // Rate limiting
  authRateLimit,
  apiRateLimit,
  strictRateLimit,
  speedLimiter,
  
  // Security configurations
  helmetConfig,
  corsOptions,
  
  // Third-party middlewares
  helmet: helmet(helmetConfig),
  hpp: hpp(),
  mongoSanitize: mongoSanitize(),
  compression: compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }),
  
  // Utility functions
  ipWhitelist,
  createRateLimit
};