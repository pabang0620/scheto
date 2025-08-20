const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const userController = require('../controllers/userController');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @route   GET /api/users/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        employee: true,
        company: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Profile routes
router.get('/profile', authMiddleware, userController.getUserProfile);
router.put('/profile', authMiddleware, userController.updateUserProfile);

// Preferences routes
router.get('/preferences', authMiddleware, userController.getUserPreferences);
router.put('/preferences', authMiddleware, userController.updateUserPreferences);

// Abilities route
router.get('/abilities', authMiddleware, userController.getUserAbilities);

// Statistics route
router.get('/statistics', authMiddleware, userController.getUserStatistics);

// Change password route
router.put('/change-password', authMiddleware, userController.changePassword);

module.exports = router;