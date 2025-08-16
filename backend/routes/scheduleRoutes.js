const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const scheduleController = require('../controllers/scheduleController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

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

module.exports = router;