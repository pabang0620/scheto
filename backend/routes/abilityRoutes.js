const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const abilityController = require('../controllers/abilityController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// @route   GET /api/abilities/:employeeId
// @desc    Get employee ability and rank
// @access  Private
router.get('/:employeeId', abilityController.getEmployeeAbility);

// @route   PUT /api/abilities/:employeeId
// @desc    Update employee ability (and auto-calculate rank)
// @access  Private
router.put('/:employeeId', [
  body('experience')
    .isInt({ min: 1, max: 5 })
    .withMessage('Experience must be an integer between 1 and 5'),
  body('workSkill')
    .isInt({ min: 1, max: 5 })
    .withMessage('Work skill must be an integer between 1 and 5'),
  body('teamChemistry')
    .isInt({ min: 1, max: 5 })
    .withMessage('Team chemistry must be an integer between 1 and 5'),
  body('customerService')
    .isInt({ min: 1, max: 5 })
    .withMessage('Customer service must be an integer between 1 and 5'),
  body('flexibility')
    .isInt({ min: 1, max: 5 })
    .withMessage('Flexibility must be an integer between 1 and 5')
], abilityController.updateEmployeeAbility);

module.exports = router;