const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const chemistryController = require('../controllers/chemistryController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// @route   GET /api/chemistry
// @desc    Get all chemistry scores
// @access  Private
router.get('/', chemistryController.getAllChemistry);

// @route   PUT /api/chemistry
// @desc    Update chemistry between two employees
// @access  Private
router.put('/', [
  body('employee1Id')
    .isInt({ min: 1 })
    .withMessage('Employee 1 ID must be a positive integer'),
  body('employee2Id')
    .isInt({ min: 1 })
    .withMessage('Employee 2 ID must be a positive integer'),
  body('score')
    .isInt({ min: 1, max: 5 })
    .withMessage('Chemistry score must be an integer between 1 and 5')
], chemistryController.updateChemistry);

// @route   GET /api/chemistry/employee/:employeeId
// @desc    Get chemistry scores for specific employee
// @access  Private
router.get('/employee/:employeeId', chemistryController.getEmployeeChemistry);

module.exports = router;