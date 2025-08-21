const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const {
  analyzeStaffing,
  getAnalyticsHistory,
  getRecommendations,
  optimizeStaffing
} = require('../controllers/staffingController');

const { authenticate, authorize } = require('../middlewares/authMiddleware');

// @route   POST /api/staffing/analyze
// @desc    Analyze current staffing patterns and generate recommendations
// @access  Private (Admin only)
router.post('/analyze', [
  authenticate,
  authorize(['admin']),
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((endDate, { req }) => {
      const start = new Date(req.body.startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 90) {
        throw new Error('Analysis period cannot exceed 90 days');
      }
      
      if (end <= start) {
        throw new Error('End date must be after start date');
      }
      
      return true;
    }),
  body('templateId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Template ID must be a positive integer'),
  body('includeWeekends')
    .optional()
    .isBoolean()
    .withMessage('Include weekends must be a boolean'),
  body('analyzeByDepartment')
    .optional()
    .isBoolean()
    .withMessage('Analyze by department must be a boolean')
], analyzeStaffing);

// @route   GET /api/staffing/analytics/history
// @desc    Get historical staffing analytics
// @access  Private
router.get('/analytics/history', [
  authenticate,
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative'),
  query('groupBy')
    .optional()
    .isIn(['day', 'week', 'month'])
    .withMessage('Group by must be day, week, or month')
], getAnalyticsHistory);

// @route   GET /api/staffing/recommendations
// @desc    Generate staffing recommendations based on historical data
// @access  Private
router.get('/recommendations', [
  authenticate,
  query('lookbackDays')
    .optional()
    .isInt({ min: 7, max: 365 })
    .withMessage('Lookback days must be between 7 and 365'),
  query('confidence')
    .optional()
    .isFloat({ min: 0.1, max: 1.0 })
    .withMessage('Confidence must be between 0.1 and 1.0')
], getRecommendations);

// @route   POST /api/staffing/optimize
// @desc    Optimize staffing for a specific period using AI-like algorithms
// @access  Private (Admin only)  
router.post('/optimize', [
  authenticate,
  authorize(['admin']),
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((endDate, { req }) => {
      const start = new Date(req.body.startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 31) {
        throw new Error('Optimization period cannot exceed 31 days');
      }
      
      if (end <= start) {
        throw new Error('End date must be after start date');
      }
      
      return true;
    }),
  body('templateId')
    .isInt({ min: 1 })
    .withMessage('Template ID must be a positive integer'),
  body('optimizationGoals.minimizeShortfall')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Minimize shortfall weight must be between 0 and 1'),
  body('optimizationGoals.minimizeOverstaffing')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Minimize overstaffing weight must be between 0 and 1'),
  body('optimizationGoals.maximizeEfficiency')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Maximize efficiency weight must be between 0 and 1'),
  body('optimizationGoals.respectPreferences')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Respect preferences weight must be between 0 and 1'),
  body('constraints.maxConsecutiveDays')
    .optional()
    .isInt({ min: 1, max: 14 })
    .withMessage('Max consecutive days must be between 1 and 14'),
  body('constraints.minRestHours')
    .optional()
    .isInt({ min: 1, max: 48 })
    .withMessage('Min rest hours must be between 1 and 48'),
  body('constraints.maxWeeklyHours')
    .optional()
    .isInt({ min: 20, max: 80 })
    .withMessage('Max weekly hours must be between 20 and 80')
], optimizeStaffing);

module.exports = router;