const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');

// All dashboard routes require authentication
router.use(authMiddleware);

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats', dashboardController.getStats);

// @route   GET /api/dashboard/recent-activity
// @desc    Get recent activity
// @access  Private
router.get('/recent-activity', dashboardController.getRecentActivity);

// @route   GET /api/dashboard/upcoming-schedules
// @desc    Get upcoming schedules
// @access  Private
router.get('/upcoming-schedules', dashboardController.getUpcomingSchedules);

// @route   GET /api/dashboard/schedule-summary
// @desc    Get schedule summary
// @access  Private
router.get('/schedule-summary', dashboardController.getScheduleSummary);

module.exports = router;