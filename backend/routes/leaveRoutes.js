const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const leaveController = require('../controllers/leaveController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// @route   GET /api/leaves
// @desc    Get all leave requests
// @access  Private
router.get('/', leaveController.getAllLeaves);

// @route   GET /api/leaves/pending
// @desc    Get all pending leave requests
// @access  Private (Admin/Manager only)
router.get('/pending', leaveController.getPendingLeaves);

// @route   GET /api/leaves/employee/:employeeId
// @desc    Get leave requests by employee ID
// @access  Private
router.get('/employee/:employeeId', leaveController.getLeavesByEmployee);

// @route   GET /api/leaves/:id
// @desc    Get leave request by ID
// @access  Private
router.get('/:id', leaveController.getLeaveById);

// @route   POST /api/leaves
// @desc    Create new leave request
// @access  Private
router.post('/', [
  body('employeeId').isInt().withMessage('Employee ID must be an integer'),
  body('startDate').isISO8601().withMessage('Please enter a valid start date'),
  body('endDate').isISO8601().withMessage('Please enter a valid end date'),
  body('type').notEmpty().withMessage('Leave type is required'),
  body('reason').notEmpty().withMessage('Reason is required'),
], leaveController.createLeave);

// @route   PUT /api/leaves/:id
// @desc    Update leave request
// @access  Private
router.put('/:id', [
  body('employeeId').optional().isInt().withMessage('Employee ID must be an integer'),
  body('startDate').optional().isISO8601().withMessage('Please enter a valid start date'),
  body('endDate').optional().isISO8601().withMessage('Please enter a valid end date'),
  body('type').optional().notEmpty().withMessage('Leave type cannot be empty'),
  body('reason').optional().notEmpty().withMessage('Reason cannot be empty'),
  body('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Status must be pending, approved, or rejected'),
], leaveController.updateLeave);

// @route   DELETE /api/leaves/:id
// @desc    Delete leave request
// @access  Private
router.delete('/:id', leaveController.deleteLeave);

// @route   PUT /api/leaves/:id/approve
// @desc    Approve leave request
// @access  Private (Admin/Manager only)
router.put('/:id/approve', leaveController.approveLeave);

// @route   PUT /api/leaves/:id/reject
// @desc    Reject leave request
// @access  Private (Admin/Manager only)
router.put('/:id/reject', leaveController.rejectLeave);

module.exports = router;