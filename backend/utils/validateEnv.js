const Joi = require('joi');

// Environment variable validation schema
const envSchema = Joi.object({
  // Required variables
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
    
  PORT: Joi.number()
    .port()
    .default(5000),
    
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['mysql', 'postgresql', 'sqlite', 'mongodb'] })
    .required()
    .messages({
      'any.required': 'DATABASE_URL is required',
      'string.uri': 'DATABASE_URL must be a valid database URI'
    }),
    
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .messages({
      'any.required': 'JWT_SECRET is required',
      'string.min': 'JWT_SECRET must be at least 32 characters long for security'
    }),

  // Optional security variables
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^(\d+[smhd]|\d+)$/)
    .default('7d')
    .messages({
      'string.pattern.base': 'JWT_EXPIRES_IN must be a valid time format (e.g., "7d", "24h", "60m")'
    }),
    
  BCRYPT_ROUNDS: Joi.number()
    .integer()
    .min(10)
    .max(15)
    .default(12),
    
  // CORS and domain settings
  FRONTEND_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    
  DOMAIN_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: Joi.number()
    .integer()
    .min(60000) // Minimum 1 minute
    .default(900000), // Default 15 minutes
    
  RATE_LIMIT_MAX_REQUESTS: Joi.number()
    .integer()
    .min(1)
    .default(100),
    
  AUTH_RATE_LIMIT_MAX: Joi.number()
    .integer()
    .min(1)
    .default(5),
    
  // Logging configuration
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
    
  LOG_DB_QUERIES: Joi.string()
    .valid('true', 'false')
    .default('false'),
    
  // File upload settings
  MAX_FILE_SIZE: Joi.number()
    .integer()
    .min(1024) // Minimum 1KB
    .default(10485760), // Default 10MB
    
  UPLOAD_PATH: Joi.string()
    .default('./uploads'),
    
  // Database connection pool settings
  DB_POOL_MIN: Joi.number()
    .integer()
    .min(0)
    .default(2),
    
  DB_POOL_MAX: Joi.number()
    .integer()
    .min(1)
    .default(10),
    
  DB_POOL_ACQUIRE_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .default(30000), // 30 seconds
    
  DB_POOL_IDLE_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .default(10000), // 10 seconds
    
  // Session and cookie settings
  SESSION_SECRET: Joi.string()
    .min(32)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    
  COOKIE_SECURE: Joi.string()
    .valid('true', 'false')
    .default('false'),
    
  COOKIE_SAME_SITE: Joi.string()
    .valid('strict', 'lax', 'none')
    .default('lax'),
    
  // Email configuration (optional)
  SMTP_HOST: Joi.string()
    .hostname()
    .optional(),
    
  SMTP_PORT: Joi.number()
    .port()
    .optional(),
    
  SMTP_USER: Joi.string()
    .email()
    .optional(),
    
  SMTP_PASS: Joi.string()
    .optional(),
    
  // Redis configuration (optional)
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .optional(),
    
  // Health check settings
  HEALTH_CHECK_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('true'),
    
  // Monitoring
  ENABLE_METRICS: Joi.string()
    .valid('true', 'false')
    .default('false'),
    
  // Security headers
  TRUST_PROXY: Joi.string()
    .valid('true', 'false')
    .default('false'),
    
  // API versioning
  API_VERSION: Joi.string()
    .pattern(/^v\d+$/)
    .default('v1'),
    
  // Timezone
  TZ: Joi.string()
    .default('UTC')

}).unknown(); // Allow unknown environment variables

/**
 * Validate environment variables
 * @param {Object} env - Environment variables object (process.env)
 * @returns {Object} - Validated and cleaned environment variables
 * @throws {Error} - If validation fails
 */
const validateEnv = (env) => {
  const { error, value } = envSchema.validate(env, {
    allowUnknown: true,
    stripUnknown: true,
    abortEarly: false
  });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    const errorMessage = `Environment validation failed:\n${errorMessages.join('\n')}`;
    
    console.error('\n🚨 ENVIRONMENT VALIDATION ERRORS 🚨');
    console.error('=====================================');
    errorMessages.forEach(msg => console.error(`❌ ${msg}`));
    console.error('=====================================\n');
    
    throw new Error(errorMessage);
  }

  return value;
};

/**
 * Check for security warnings in environment configuration
 * @param {Object} env - Validated environment variables
 */
const checkSecurityWarnings = (env) => {
  const warnings = [];

  // Check JWT secret strength
  if (env.JWT_SECRET && env.JWT_SECRET.length < 64) {
    warnings.push('JWT_SECRET should be at least 64 characters long for better security');
  }

  // Check for default/weak JWT secret
  const weakSecrets = ['secret', 'jwt-secret', 'your-secret-key', 'mymoney'];
  if (env.JWT_SECRET && weakSecrets.includes(env.JWT_SECRET.toLowerCase())) {
    warnings.push('JWT_SECRET appears to be a default or weak value. Please use a strong, unique secret');
  }

  // Production-specific checks
  if (env.NODE_ENV === 'production') {
    if (!env.FRONTEND_URL) {
      warnings.push('FRONTEND_URL should be set in production for proper CORS configuration');
    }

    if (!env.DOMAIN_URL) {
      warnings.push('DOMAIN_URL should be set in production');
    }

    if (env.LOG_LEVEL === 'debug') {
      warnings.push('LOG_LEVEL should not be "debug" in production');
    }

    if (env.COOKIE_SECURE !== 'true') {
      warnings.push('COOKIE_SECURE should be "true" in production');
    }

    if (!env.SESSION_SECRET) {
      warnings.push('SESSION_SECRET should be set in production');
    }

    if (env.TRUST_PROXY !== 'true') {
      warnings.push('TRUST_PROXY should likely be "true" in production if behind a proxy');
    }
  }

  // Database URL security check
  if (env.DATABASE_URL && env.DATABASE_URL.includes('root:') && !env.DATABASE_URL.includes('localhost')) {
    warnings.push('Database URL contains root user for non-localhost connection - consider using a dedicated database user');
  }

  // Rate limiting checks
  if (env.RATE_LIMIT_MAX_REQUESTS > 1000) {
    warnings.push('RATE_LIMIT_MAX_REQUESTS is very high - consider lowering for better protection');
  }

  if (env.AUTH_RATE_LIMIT_MAX > 20) {
    warnings.push('AUTH_RATE_LIMIT_MAX is very high - consider lowering to prevent brute force attacks');
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('\n⚠️  SECURITY WARNINGS ⚠️');
    console.warn('=======================');
    warnings.forEach(warning => console.warn(`⚠️  ${warning}`));
    console.warn('=======================\n');
  }
};

/**
 * Display environment configuration summary
 * @param {Object} env - Validated environment variables
 */
const displayEnvSummary = (env) => {
  console.log('\n✅ ENVIRONMENT CONFIGURATION ✅');
  console.log('===============================');
  console.log(`🌍 Environment: ${env.NODE_ENV}`);
  console.log(`🚀 Port: ${env.PORT}`);
  console.log(`📊 Log Level: ${env.LOG_LEVEL}`);
  console.log(`🔒 BCRYPT Rounds: ${env.BCRYPT_ROUNDS}`);
  console.log(`⏱️  JWT Expires In: ${env.JWT_EXPIRES_IN}`);
  console.log(`🛡️  Rate Limit: ${env.RATE_LIMIT_MAX_REQUESTS} req/${env.RATE_LIMIT_WINDOW_MS}ms`);
  console.log(`🔐 Auth Rate Limit: ${env.AUTH_RATE_LIMIT_MAX} req/${env.RATE_LIMIT_WINDOW_MS}ms`);
  console.log(`📁 Max File Size: ${Math.round(env.MAX_FILE_SIZE / 1024 / 1024)}MB`);
  console.log(`🏥 Health Check: ${env.HEALTH_CHECK_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
  
  if (env.FRONTEND_URL) {
    console.log(`🌐 Frontend URL: ${env.FRONTEND_URL}`);
  }
  
  if (env.REDIS_URL) {
    console.log(`💾 Redis: Connected`);
  }
  
  console.log('===============================\n');
};

/**
 * Complete environment validation and setup
 * @param {Object} env - Environment variables object (process.env)
 * @returns {Object} - Validated environment variables
 */
const setupEnvironment = (env = process.env) => {
  try {
    const validatedEnv = validateEnv(env);
    
    // Check for security warnings
    checkSecurityWarnings(validatedEnv);
    
    // Display configuration summary
    if (validatedEnv.NODE_ENV !== 'test') {
      displayEnvSummary(validatedEnv);
    }
    
    return validatedEnv;
  } catch (error) {
    console.error('Failed to setup environment:', error.message);
    process.exit(1);
  }
};

module.exports = {
  validateEnv,
  checkSecurityWarnings,
  displayEnvSummary,
  setupEnvironment,
  envSchema
};