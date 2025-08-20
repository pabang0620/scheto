const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const companyController = require('../controllers/companyController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// @route   GET /api/company/work-types
// @desc    Get work type options
// @access  Public
router.get('/work-types', companyController.getWorkTypes);

// Apply auth middleware to all routes below
router.use(authMiddleware);

// @route   GET /api/company/settings
// @desc    Get company settings
// @access  Private (All authenticated users)
router.get('/settings', companyController.getCompanySettings);

// @route   PUT /api/company/settings
// @desc    Update company settings
// @access  Private (Admin only)
router.put('/settings', [
  roleMiddleware(['admin']),
  body('companyName').optional().notEmpty().withMessage('Company name cannot be empty'),
  body('industry').optional().notEmpty().withMessage('Industry cannot be empty'),
  body('companySize').optional().isIn(['small', 'medium', 'large', 'enterprise']).withMessage('Invalid company size'),
  body('workType').optional().isIn(['fixed', 'shift', 'flexible']).withMessage('Invalid work type'),
  body('workDays').optional().isArray().withMessage('Work days must be an array'),
  body('defaultStartTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start time format'),
  body('defaultEndTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end time format'),
  body('showLeaveInSchedule').optional().isBoolean().withMessage('Show leave in schedule must be boolean'),
  body('minStaffRequired').optional().isInt({ min: 1 }).withMessage('Minimum staff must be a positive integer')
], companyController.updateCompanySettings);

module.exports = router;