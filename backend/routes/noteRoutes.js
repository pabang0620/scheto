const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const noteController = require('../controllers/noteController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// @route   GET /api/notes/employee/:employeeId
// @desc    Get employee notes
// @access  Private
router.get('/employee/:employeeId', noteController.getEmployeeNotes);

// @route   POST /api/notes/employee/:employeeId
// @desc    Add new note
// @access  Private
router.post('/employee/:employeeId', [
  body('type')
    .isIn(['praise', 'caution', 'general'])
    .withMessage('Type must be one of: praise, caution, general'),
  body('content')
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ max: 2000 })
    .withMessage('Content cannot exceed 2000 characters'),
  body('priority')
    .isIn(['high', 'medium', 'low'])
    .withMessage('Priority must be one of: high, medium, low')
], noteController.addEmployeeNote);

// @route   DELETE /api/notes/:id
// @desc    Delete a note
// @access  Private
router.delete('/:id', noteController.deleteNote);

module.exports = router;