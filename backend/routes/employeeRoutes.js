const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const employeeController = require('../controllers/employeeController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// @route   GET /api/employees
// @desc    Get all employees
// @access  Private
router.get('/', employeeController.getAllEmployees);

// @route   GET /api/employees/:id
// @desc    Get employee by ID
// @access  Private
router.get('/:id', employeeController.getEmployeeById);

// @route   POST /api/employees
// @desc    Create new employee
// @access  Private
router.post('/', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('position').notEmpty().withMessage('Position is required'),
  body('department').notEmpty().withMessage('Department is required'),
], employeeController.createEmployee);

// @route   PUT /api/employees/:id
// @desc    Update employee
// @access  Private
router.put('/:id', [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please enter a valid email'),
  body('position').optional().notEmpty().withMessage('Position cannot be empty'),
  body('department').optional().notEmpty().withMessage('Department cannot be empty'),
], employeeController.updateEmployee);

// @route   DELETE /api/employees/:id
// @desc    Delete employee
// @access  Private
router.delete('/:id', employeeController.deleteEmployee);

// @route   GET /api/employees/:id/schedules
// @desc    Get employee schedules
// @access  Private
router.get('/:id/schedules', employeeController.getEmployeeSchedules);

module.exports = router;