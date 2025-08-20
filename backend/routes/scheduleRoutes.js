const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const scheduleController = require('../controllers/scheduleController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply auth middleware to all routes
// TEMPORARILY DISABLED FOR DEVELOPMENT - ENABLE IN PRODUCTION!
// router.use(authMiddleware);

// @route   GET /api/schedules
// @desc    Get all schedules
// @access  Private
router.get('/', scheduleController.getAllSchedules);

// @route   GET /api/schedules/:id
// @desc    Get schedule by ID
// @access  Private
router.get('/:id', scheduleController.getScheduleById);

// @route   GET /api/schedules/employee/:employeeId
// @desc    Get schedules by employee ID
// @access  Private
router.get('/employee/:employeeId', scheduleController.getSchedulesByEmployee);

// @route   POST /api/schedules
// @desc    Create new schedule
// @access  Private
router.post('/', [
  body('employeeId').isInt().withMessage('Employee ID must be an integer'),
  body('date').isISO8601().withMessage('Please enter a valid date'),
  body('startTime').notEmpty().withMessage('Start time is required'),
  body('endTime').notEmpty().withMessage('End time is required'),
  body('shiftType').notEmpty().withMessage('Shift type is required'),
], scheduleController.createSchedule);

// @route   PUT /api/schedules/:id
// @desc    Update schedule
// @access  Private
router.put('/:id', [
  body('employeeId').optional().isInt().withMessage('Employee ID must be an integer'),
  body('date').optional().isISO8601().withMessage('Please enter a valid date'),
  body('startTime').optional().notEmpty().withMessage('Start time cannot be empty'),
  body('endTime').optional().notEmpty().withMessage('End time cannot be empty'),
  body('shiftType').optional().notEmpty().withMessage('Shift type cannot be empty'),
], scheduleController.updateSchedule);

// @route   DELETE /api/schedules/:id
// @desc    Delete schedule
// @access  Private
router.delete('/:id', scheduleController.deleteSchedule);

// @route   GET /api/schedules/check-period
// @desc    Check schedule conflicts and leaves for a period
// @access  Private
router.get('/check-period', scheduleController.checkPeriod);

// @route   POST /api/schedules/auto-generate
// @desc    Auto-generate schedules with conflict handling and ability-based placement
// @access  Private
router.post('/auto-generate', [
  body('startDate').isISO8601().withMessage('Please enter a valid start date'),
  body('endDate').isISO8601().withMessage('Please enter a valid end date'),
  body('shiftType').notEmpty().withMessage('Shift type is required'),
], scheduleController.autoGenerateSchedules);

// @route   PATCH /api/schedules/:id/quick-update
// @desc    Quick update schedule (immediate modification)
// @access  Private
router.patch('/:id/quick-update', [
  body('employeeId').optional().isInt().withMessage('Employee ID must be an integer'),
  body('date').optional().isISO8601().withMessage('Please enter a valid date'),
  body('startTime').optional().notEmpty().withMessage('Start time cannot be empty'),
  body('endTime').optional().notEmpty().withMessage('End time cannot be empty'),
  body('shiftType').optional().notEmpty().withMessage('Shift type cannot be empty'),
], scheduleController.quickUpdateSchedule);

// @route   POST /api/schedules/calculate-requirements
// @desc    Calculate staffing requirements for a given period
// @access  Private
router.post('/calculate-requirements', [
  body('startDate').isISO8601().withMessage('Please enter a valid start date'),
  body('endDate').isISO8601().withMessage('Please enter a valid end date'),
  body('shiftPatterns').optional().isArray().withMessage('Shift patterns must be an array'),
  body('peakHours').optional().isArray().withMessage('Peak hours must be an array'),
], scheduleController.calculateRequirements);

// @route   POST /api/schedules/validate-patterns
// @desc    Validate shift patterns for consistency and conflicts
// @access  Private
router.post('/validate-patterns', [
  body('patterns').isArray().withMessage('Patterns must be an array'),
  body('patterns.*.name').optional().isString().withMessage('Pattern name must be a string'),
  body('patterns.*.startTime').isString().notEmpty().withMessage('Start time is required'),
  body('patterns.*.endTime').isString().notEmpty().withMessage('End time is required'),
  body('patterns.*.daysOfWeek').isArray().withMessage('Days of week must be an array'),
  body('patterns.*.staffRequired').optional().isInt({ min: 1 }).withMessage('Staff required must be a positive integer'),
], scheduleController.validatePatterns);

// @route   POST /api/schedules/generate-advanced
// @desc    Generate advanced schedules with multiple patterns and constraints
// @access  Private
router.post('/generate-advanced', [
  body('startDate').isISO8601().withMessage('Please enter a valid start date'),
  body('endDate').isISO8601().withMessage('Please enter a valid end date'),
  body('shiftPatterns').isArray().withMessage('Shift patterns must be an array'),
  body('shiftPatterns.*.name').optional().isString().withMessage('Pattern name must be a string'),
  body('shiftPatterns.*.startTime').isString().notEmpty().withMessage('Start time is required'),
  body('shiftPatterns.*.endTime').isString().notEmpty().withMessage('End time is required'),
  body('shiftPatterns.*.daysOfWeek').isArray().withMessage('Days of week must be an array'),
  body('shiftPatterns.*.staffRequired').optional().isInt({ min: 1 }).withMessage('Staff required must be a positive integer'),
], scheduleController.generateAdvanced);

// @route   PUT /api/schedules/bulk-update
// @desc    Update multiple schedules at once
// @access  Private
router.put('/bulk-update', [
  body('updates').isArray().withMessage('Updates must be an array'),
  body('updates.*.scheduleId').isInt().withMessage('Schedule ID must be an integer'),
  body('updates.*.employeeId').optional().isInt().withMessage('Employee ID must be an integer'),
  body('updates.*.date').optional().isISO8601().withMessage('Date must be valid'),
  body('updates.*.startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
  body('updates.*.endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format'),
], scheduleController.bulkUpdate);

// @route   GET /api/schedules/coverage-analysis
// @desc    Analyze schedule coverage and identify gaps
// @access  Private
router.get('/coverage-analysis', scheduleController.coverageAnalysis);

module.exports = router;