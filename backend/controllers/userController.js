const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const employee = await prisma.employee.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        }
      }
    });
    
    if (!employee) {
      // Return user data even if no employee record exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      return res.json({
        name: user.name,
        email: user.email,
        phone: '',
        department: '',
        position: '',
        hireDate: null
      });
    }
    
    res.json({
      name: employee.name,
      email: employee.email,
      phone: employee.phone || '',
      department: employee.department || '',
      position: employee.position || '',
      hireDate: employee.hireDate
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to get profile' });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone, department, position, hireDate } = req.body;
    
    // Update user table
    await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email
      }
    });
    
    // Update or create employee record
    const employee = await prisma.employee.upsert({
      where: { userId },
      update: {
        name,
        email,
        phone,
        department,
        position,
        hireDate: hireDate ? new Date(hireDate) : undefined
      },
      create: {
        userId,
        name,
        email,
        phone,
        department,
        position,
        hireDate: hireDate ? new Date(hireDate) : new Date()
      }
    });
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        name,
        email
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

// Get user preferences
const getUserPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get employee ID
    const employee = await prisma.employee.findUnique({
      where: { userId }
    });
    
    if (!employee) {
      return res.json({
        preferDays: [],
        avoidDays: [],
        fixedOffDays: [],
        preferredStartTime: '09:00',
        preferredEndTime: '18:00'
      });
    }
    
    const preferences = await prisma.preference.findUnique({
      where: { employeeId: employee.id }
    });
    
    if (!preferences) {
      return res.json({
        preferDays: [],
        avoidDays: [],
        fixedOffDays: [],
        preferredStartTime: '09:00',
        preferredEndTime: '18:00'
      });
    }
    
    res.json({
      preferDays: preferences.preferDays || [],
      avoidDays: preferences.avoidDays || [],
      fixedOffDays: preferences.fixedOffDays || [],
      preferredStartTime: preferences.preferredStartTime || '09:00',
      preferredEndTime: preferences.preferredEndTime || '18:00'
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ message: 'Failed to get preferences' });
  }
};

// Update user preferences
const updateUserPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferDays, avoidDays, fixedOffDays, preferredStartTime, preferredEndTime } = req.body;
    
    // Get or create employee
    let employee = await prisma.employee.findUnique({
      where: { userId }
    });
    
    if (!employee) {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      employee = await prisma.employee.create({
        data: {
          userId,
          name: user.name,
          email: user.email,
          department: '',
          position: ''
        }
      });
    }
    
    // Update or create preferences
    const preferences = await prisma.preference.upsert({
      where: { employeeId: employee.id },
      update: {
        preferDays: preferDays || [],
        avoidDays: avoidDays || [],
        fixedOffDays: fixedOffDays || []
      },
      create: {
        employeeId: employee.id,
        preferDays: preferDays || [],
        avoidDays: avoidDays || [],
        fixedOffDays: fixedOffDays || []
      }
    });
    
    res.json({
      message: 'Preferences updated successfully',
      preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Failed to update preferences' });
  }
};

// Get user abilities
const getUserAbilities = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const employee = await prisma.employee.findUnique({
      where: { userId }
    });
    
    if (!employee) {
      return res.json({
        experience: 0,
        workSkill: 0,
        teamChemistry: 0,
        customerService: 0,
        flexibility: 0,
        totalScore: 0,
        rank: 'C'
      });
    }
    
    const abilities = await prisma.ability.findUnique({
      where: { employeeId: employee.id }
    });
    
    if (!abilities) {
      return res.json({
        experience: 0,
        workSkill: 0,
        teamChemistry: 0,
        customerService: 0,
        flexibility: 0,
        totalScore: 0,
        rank: 'C'
      });
    }
    
    res.json(abilities);
  } catch (error) {
    console.error('Get abilities error:', error);
    res.status(500).json({ message: 'Failed to get abilities' });
  }
};

// Get user statistics
const getUserStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const employee = await prisma.employee.findUnique({
      where: { userId }
    });
    
    if (!employee) {
      return res.json({
        thisMonthHours: 0,
        thisMonthDays: 0,
        upcomingSchedules: [],
        recentLeaves: []
      });
    }
    
    // Get current month start and end
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Get this month's schedules
    const monthSchedules = await prisma.schedule.findMany({
      where: {
        employeeId: employee.id,
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });
    
    // Calculate total hours and days
    let totalHours = 0;
    let totalDays = monthSchedules.length;
    
    monthSchedules.forEach(schedule => {
      const start = new Date(`2000-01-01 ${schedule.startTime}`);
      const end = new Date(`2000-01-01 ${schedule.endTime}`);
      const hours = (end - start) / (1000 * 60 * 60);
      totalHours += hours;
    });
    
    // Get upcoming schedules (next 7 days)
    const upcoming = await prisma.schedule.findMany({
      where: {
        employeeId: employee.id,
        date: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: {
        date: 'asc'
      },
      take: 5
    });
    
    // Get recent leaves
    const leaves = await prisma.leave.findMany({
      where: {
        employeeId: employee.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    res.json({
      thisMonthHours: Math.round(totalHours),
      thisMonthDays: totalDays,
      upcomingSchedules: upcoming,
      recentLeaves: leaves
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ message: 'Failed to get statistics' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    // Get user with current password
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    // Check current password (in production, use bcrypt)
    if (user.password !== currentPassword) {
      return res.status(400).json({ message: '현재 비밀번호가 일치하지 않습니다' });
    }
    
    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: newPassword
      }
    });
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  getUserPreferences,
  updateUserPreferences,
  getUserAbilities,
  getUserStatistics,
  changePassword
};