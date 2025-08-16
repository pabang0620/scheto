const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getStats = async (req, res) => {
  try {
    console.log('Dashboard stats 요청:', req.userId);

    // Get user information
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { employee: true }
    });

    // Get total employees count
    const totalEmployees = await prisma.employee.count();

    // Get schedules for this week
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    let schedulesThisWeek = 0;
    let mySchedulesThisWeek = 0;

    if (user?.employee) {
      // For employees: count their work days this week
      const mySchedules = await prisma.schedule.findMany({
        where: {
          employeeId: user.employee.id,
          date: {
            gte: startOfWeek,
            lte: endOfWeek
          },
          status: {
            not: 'cancelled'
          }
        },
        select: {
          date: true
        }
      });

      // Count unique days (not total shifts)
      const uniqueDays = new Set(mySchedules.map(s => 
        new Date(s.date).toDateString()
      ));
      mySchedulesThisWeek = uniqueDays.size;
      schedulesThisWeek = mySchedulesThisWeek; // For employee, show their own count
    } else {
      // For admin/manager: count total unique schedule entries
      const allSchedules = await prisma.schedule.findMany({
        where: {
          date: {
            gte: startOfWeek,
            lte: endOfWeek
          },
          status: {
            not: 'cancelled'
          }
        },
        select: {
          date: true,
          employeeId: true
        }
      });

      // Count unique days with schedules
      const uniqueDays = new Set(allSchedules.map(s => 
        new Date(s.date).toDateString()
      ));
      schedulesThisWeek = uniqueDays.size; // Number of days with schedules
    }

    // Get pending leave requests
    const pendingLeaveRequests = await prisma.leave.count({
      where: {
        status: 'pending'
      }
    });

    // Get pending leaves (for the badge)
    const pendingLeaves = user?.role === 'admin' || user?.role === 'manager' 
      ? pendingLeaveRequests
      : 0;

    // Get upcoming shifts for current user (if employee)
    let upcomingShifts = 0;
    if (user?.employee) {
      upcomingShifts = await prisma.schedule.count({
        where: {
          employeeId: user.employee.id,
          date: {
            gte: new Date()
          },
          status: {
            not: 'cancelled'
          }
        }
      });
    } else {
      // For admin/manager, show total upcoming shifts
      upcomingShifts = await prisma.schedule.count({
        where: {
          date: {
            gte: new Date()
          },
          status: {
            not: 'cancelled'
          }
        }
      });
    }

    res.json({
      totalEmployees,
      schedulesThisWeek,
      mySchedulesThisWeek, // Add personal schedule count for employees
      pendingLeaveRequests,
      pendingLeaves,
      upcomingShifts
    });
  } catch (error) {
    console.error('Dashboard stats 에러:', error);
    res.status(500).json({ message: 'Failed to get dashboard stats' });
  }
};

// @desc    Get recent activity
// @route   GET /api/dashboard/recent-activity
// @access  Private
const getRecentActivity = async (req, res) => {
  try {
    const activities = await prisma.schedule.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        employee: true
      }
    });

    res.json(activities);
  } catch (error) {
    console.error('Recent activity 에러:', error);
    res.status(500).json({ message: 'Failed to get recent activity' });
  }
};

// @desc    Get upcoming schedules
// @route   GET /api/dashboard/upcoming-schedules
// @access  Private
const getUpcomingSchedules = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const schedules = await prisma.schedule.findMany({
      where: {
        date: {
          gte: new Date()
        },
        status: {
          not: 'cancelled'
        }
      },
      take: limit,
      orderBy: {
        date: 'asc'
      },
      include: {
        employee: true
      }
    });

    res.json(schedules);
  } catch (error) {
    console.error('Upcoming schedules 에러:', error);
    res.status(500).json({ message: 'Failed to get upcoming schedules' });
  }
};

// @desc    Get schedule summary
// @route   GET /api/dashboard/schedule-summary
// @access  Private
const getScheduleSummary = async (req, res) => {
  try {
    const period = req.query.period || 'week';
    
    let startDate = new Date();
    let endDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - startDate.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + 1);
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);
        break;
    }
    
    const summary = await prisma.schedule.groupBy({
      by: ['shift'],
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        id: true
      }
    });

    res.json(summary);
  } catch (error) {
    console.error('Schedule summary 에러:', error);
    res.status(500).json({ message: 'Failed to get schedule summary' });
  }
};

module.exports = {
  getStats,
  getRecentActivity,
  getUpcomingSchedules,
  getScheduleSummary
};