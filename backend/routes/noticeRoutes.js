const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const {
  getAllNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice,
  markAsRead,
  getUnreadCount
} = require('../controllers/noticeController');

// All routes require authentication
router.use(authMiddleware);

// @route   GET /api/notices/unread/count
// @desc    Get unread notices count for current user
// @access  Private
router.get('/unread/count', getUnreadCount);

// @route   GET /api/notices
// @desc    Get all notices with pagination and filtering
// @access  Private
router.get('/', getAllNotices);

// @route   GET /api/notices/:id
// @desc    Get notice by ID
// @access  Private
router.get('/:id', getNoticeById);

// @route   POST /api/notices
// @desc    Create new notice
// @access  Private (Admin only)
router.post('/', roleMiddleware(['admin']), createNotice);

// @route   PUT /api/notices/:id
// @desc    Update notice
// @access  Private (Admin only)
router.put('/:id', roleMiddleware(['admin']), updateNotice);

// @route   DELETE /api/notices/:id
// @desc    Delete notice
// @access  Private (Admin only)
router.delete('/:id', roleMiddleware(['admin']), deleteNotice);

// @route   POST /api/notices/:id/read
// @desc    Mark notice as read
// @access  Private
router.post('/:id/read', markAsRead);

module.exports = router;