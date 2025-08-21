const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  updateDailyHours,
  createOverride,
  getEffectiveHours,
  generateDefaultTemplate
} = require('../controllers/operatingHoursController');

const { authenticate, authorize } = require('../middlewares/authMiddleware');

// @route   GET /api/operating-hours/templates
// @desc    Get all operating hours templates for a company
// @access  Private
router.get('/templates', authenticate, getTemplates);

// @route   GET /api/operating-hours/templates/:id
// @desc    Get a specific operating hours template
// @access  Private
router.get('/templates/:id', authenticate, getTemplate);

// @route   POST /api/operating-hours/templates
// @desc    Create a new operating hours template
// @access  Private (Admin only)
router.post('/templates', [
  authenticate,
  authorize(['admin']),
  body('templateName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Template name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a valid string'),
  body('dailyHours')
    .optional()
    .isArray()
    .withMessage('Daily hours must be an array'),
  body('dailyHours.*.dayOfWeek')
    .if(body('dailyHours').isArray())
    .isInt({ min: 0, max: 6 })
    .withMessage('Day of week must be between 0 (Sunday) and 6 (Saturday)'),
  body('dailyHours.*.openTime')
    .if(body('dailyHours').isArray())
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Open time must be in HH:MM format'),
  body('dailyHours.*.closeTime')
    .if(body('dailyHours').isArray())
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Close time must be in HH:MM format'),
  body('dailyHours.*.minStaff')
    .if(body('dailyHours').isArray())
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Minimum staff must be between 0 and 100'),
  body('dailyHours.*.maxStaff')
    .if(body('dailyHours').isArray())
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Maximum staff must be between 1 and 100')
], createTemplate);

// @route   PUT /api/operating-hours/templates/:id
// @desc    Update an operating hours template
// @access  Private (Admin only)
router.put('/templates/:id', [
  authenticate,
  authorize(['admin']),
  body('templateName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Template name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a valid string')
], updateTemplate);

// @route   DELETE /api/operating-hours/templates/:id
// @desc    Delete an operating hours template
// @access  Private (Admin only)
router.delete('/templates/:id', authenticate, authorize(['admin']), deleteTemplate);

// @route   PUT /api/operating-hours/templates/:id/daily-hours/:dayOfWeek
// @desc    Update daily hours for a template
// @access  Private (Admin only)
router.put('/templates/:id/daily-hours/:dayOfWeek', [
  authenticate,
  authorize(['admin']),
  body('openTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Open time must be in HH:MM format'),
  body('closeTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Close time must be in HH:MM format'),
  body('breakStart')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Break start time must be in HH:MM format'),
  body('breakEnd')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Break end time must be in HH:MM format'),
  body('minStaff')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Minimum staff must be between 0 and 100'),
  body('maxStaff')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Maximum staff must be between 1 and 100'),
  body('timeSlots')
    .optional()
    .isArray()
    .withMessage('Time slots must be an array'),
  body('timeSlots.*.hourSlot')
    .if(body('timeSlots').isArray())
    .isInt({ min: 0, max: 23 })
    .withMessage('Hour slot must be between 0 and 23'),
  body('timeSlots.*.requiredStaff')
    .if(body('timeSlots').isArray())
    .isInt({ min: 1, max: 50 })
    .withMessage('Required staff must be between 1 and 50'),
  body('timeSlots.*.priority')
    .if(body('timeSlots').isArray())
    .optional()
    .isIn(['low', 'normal', 'high', 'critical'])
    .withMessage('Priority must be low, normal, high, or critical')
], updateDailyHours);

// @route   POST /api/operating-hours/templates/:id/overrides
// @desc    Create a schedule override for specific dates
// @access  Private (Admin only)
router.post('/templates/:id/overrides', [
  authenticate,
  authorize(['admin']),
  body('overrideDate')
    .isISO8601()
    .withMessage('Override date must be a valid date'),
  body('overrideType')
    .isIn(['closed', 'special_hours', 'special_staffing'])
    .withMessage('Override type must be closed, special_hours, or special_staffing'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
], createOverride);

// @route   GET /api/operating-hours/effective/:templateId/:date
// @desc    Get effective operating hours for a specific date
// @access  Private
router.get('/effective/:templateId/:date', authenticate, getEffectiveHours);

// @route   POST /api/operating-hours/generate-default
// @desc    Generate default template for common business types
// @access  Private (Admin only)
router.post('/generate-default', [
  authenticate,
  authorize(['admin']),
  body('businessType')
    .optional()
    .isIn(['office', 'restaurant', 'retail', 'hospital', 'factory'])
    .withMessage('Business type must be office, restaurant, retail, hospital, or factory'),
  body('customization.templateName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Template name must be between 1 and 100 characters'),
  body('customization.openTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Open time must be in HH:MM format'),
  body('customization.closeTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Close time must be in HH:MM format'),
  body('customization.minStaff')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Minimum staff must be between 1 and 50')
], generateDefaultTemplate);

module.exports = router;