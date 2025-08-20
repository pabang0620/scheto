const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const shiftPatternController = require('../controllers/shiftPatternController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply auth middleware to all routes
// TEMPORARILY DISABLED FOR DEVELOPMENT - ENABLE IN PRODUCTION!
// router.use(authMiddleware);

// @route   GET /api/shift-patterns
// @desc    Get all shift patterns
// @access  Private
router.get('/', shiftPatternController.getShiftPatterns);

// @route   GET /api/shift-patterns/:id
// @desc    Get single shift pattern
// @access  Private
router.get('/:id', shiftPatternController.getShiftPattern);

// @route   POST /api/shift-patterns
// @desc    Create new shift pattern
// @access  Private
router.post('/', [
  body('name').notEmpty().withMessage('Pattern name is required'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start time format'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end time format'),
], shiftPatternController.createShiftPattern);

// @route   PUT /api/shift-patterns/:id
// @desc    Update shift pattern
// @access  Private
router.put('/:id', [
  body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start time format'),
  body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end time format'),
], shiftPatternController.updateShiftPattern);

// @route   DELETE /api/shift-patterns/:id
// @desc    Delete shift pattern
// @access  Private
router.delete('/:id', shiftPatternController.deleteShiftPattern);

// @route   PUT /api/shift-patterns/bulk
// @desc    Bulk update patterns
// @access  Private
router.put('/bulk/update', shiftPatternController.bulkUpdatePatterns);

module.exports = router;