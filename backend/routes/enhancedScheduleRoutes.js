const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  autoGenerateSchedulesEnhanced
} = require('../controllers/enhancedScheduleController');

const { authenticate, authorize } = require('../middlewares/authMiddleware');

// @route   POST /api/schedules/auto-generate-enhanced
// @desc    Enhanced auto-generate schedules with operating hours template integration
// @access  Private (Admin only)
router.post('/auto-generate-enhanced', [
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
        throw new Error('Generation period cannot exceed 31 days');
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
  body('department')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Department must be between 1 and 100 characters'),
  body('employeeIds')
    .optional()
    .isArray()
    .withMessage('Employee IDs must be an array'),
  body('employeeIds.*')
    .if(body('employeeIds').isArray())
    .isInt({ min: 1 })
    .withMessage('Each employee ID must be a positive integer'),
  body('optimizationLevel')
    .optional()
    .isIn(['basic', 'standard', 'advanced'])
    .withMessage('Optimization level must be basic, standard, or advanced'),
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
    .withMessage('Max weekly hours must be between 20 and 80'),
  body('constraints.respectPreferences')
    .optional()
    .isBoolean()
    .withMessage('Respect preferences must be a boolean'),
  body('constraints.avoidPoorChemistry')
    .optional()
    .isBoolean()
    .withMessage('Avoid poor chemistry must be a boolean'),
  body('constraints.fairDistribution')
    .optional()
    .isBoolean()
    .withMessage('Fair distribution must be a boolean'),
  body('constraints.enforceBreaks')
    .optional()
    .isBoolean()
    .withMessage('Enforce breaks must be a boolean'),
  body('priorities.seniorityWeight')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Seniority weight must be between 0 and 1'),
  body('priorities.abilityWeight')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Ability weight must be between 0 and 1'),
  body('priorities.preferenceWeight')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Preference weight must be between 0 and 1'),
  body('priorities.availabilityWeight')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Availability weight must be between 0 and 1'),
  body('generateMode')
    .optional()
    .isIn(['replace', 'append', 'fill_gaps'])
    .withMessage('Generate mode must be replace, append, or fill_gaps'),
  body('overrideSettings.openTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Override open time must be in HH:MM format'),
  body('overrideSettings.closeTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Override close time must be in HH:MM format'),
  body('overrideSettings.minStaff')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Override minimum staff must be between 1 and 100')
], autoGenerateSchedulesEnhanced);

module.exports = router;