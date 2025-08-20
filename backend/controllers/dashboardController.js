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

// @desc    Get dashboard alerts (critical alerts, warnings, and info)
// @route   GET /api/dashboard/alerts
// @access  Private
const getDashboardAlerts = async (req, res) => {
  try {
    const alerts = [];
    const now = new Date();
    const user = req.user;

    // Critical Alerts
    
    // 1. Check for critical notices
    const criticalNotices = await prisma.notice.findMany({
      where: {
        priority: 'critical',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ],
        readByUsers: {
          none: {
            userId: req.userId
          }
        }
      },
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true
      }
    });

    criticalNotices.forEach(notice => {
      alerts.push({
        type: 'critical',
        category: 'notice',
        title: 'Critical Notice',
        message: notice.title,
        timestamp: notice.createdAt,
        action: {
          type: 'link',
          url: `/notices/${notice.id}`,
          label: 'View Notice'
        }
      });
    });

    // 2. Check for expiring notices (within 24 hours)
    const expiringNotices = await prisma.notice.findMany({
      where: {
        expiresAt: {
          gte: now,
          lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) // Next 24 hours
        },
        priority: { in: ['high', 'critical'] }
      },
      take: 2,
      orderBy: { expiresAt: 'asc' },
      select: {
        id: true,
        title: true,
        expiresAt: true
      }
    });

    expiringNotices.forEach(notice => {
      alerts.push({
        type: 'critical',
        category: 'system',
        title: 'Notice Expiring Soon',
        message: `"${notice.title}" expires soon`,
        timestamp: notice.expiresAt,
        action: {
          type: 'link',
          url: `/notices/${notice.id}`,
          label: 'View Notice'
        }
      });
    });

    // Warnings

    // 1. Check for high priority unread notices
    const highPriorityNotices = await prisma.notice.findMany({
      where: {
        priority: 'high',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ],
        readByUsers: {
          none: {
            userId: req.userId
          }
        }
      },
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true
      }
    });

    highPriorityNotices.forEach(notice => {
      alerts.push({
        type: 'warning',
        category: 'notice',
        title: 'High Priority Notice',
        message: notice.title,
        timestamp: notice.createdAt,
        action: {
          type: 'link',
          url: `/notices/${notice.id}`,
          label: 'View Notice'
        }
      });
    });

    // 2. Check for pending leave requests (for admins/managers)
    if (user.role === 'admin' || user.role === 'manager') {
      const pendingLeaves = await prisma.leave.count({
        where: {
          status: 'pending'
        }
      });

      if (pendingLeaves > 0) {
        alerts.push({
          type: 'warning',
          category: 'management',
          title: 'Pending Leave Requests',
          message: `${pendingLeaves} leave request${pendingLeaves > 1 ? 's' : ''} awaiting review`,
          timestamp: new Date(),
          action: {
            type: 'link',
            url: '/leaves',
            label: 'Review Requests'
          }
        });
      }
    }

    // 3. Check for understaffing (for admins/managers)
    if (user.role === 'admin' || user.role === 'manager') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todaySchedules = await prisma.schedule.count({
        where: {
          date: today,
          status: { not: 'cancelled' }
        }
      });

      const totalEmployees = await prisma.employee.count();
      
      if (totalEmployees > 0 && todaySchedules < Math.ceil(totalEmployees * 0.5)) {
        alerts.push({
          type: 'warning',
          category: 'staffing',
          title: 'Low Staffing Today',
          message: `Only ${todaySchedules} out of ${totalEmployees} employees scheduled`,
          timestamp: new Date(),
          action: {
            type: 'link',
            url: '/schedules',
            label: 'View Schedules'
          }
        });
      }
    }

    // Info Alerts

    // 1. Check for general unread notices
    const unreadNoticesCount = await prisma.notice.count({
      where: {
        priority: { in: ['medium', 'low'] },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ],
        readByUsers: {
          none: {
            userId: req.userId
          }
        }
      }
    });

    if (unreadNoticesCount > 0) {
      alerts.push({
        type: 'info',
        category: 'notice',
        title: 'Unread Notices',
        message: `You have ${unreadNoticesCount} unread notice${unreadNoticesCount > 1 ? 's' : ''}`,
        timestamp: new Date(),
        action: {
          type: 'link',
          url: '/notices',
          label: 'View All Notices'
        }
      });
    }

    // 2. Check for upcoming shifts (for employees)
    if (user.employee) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59, 999);

      const tomorrowShifts = await prisma.schedule.findMany({
        where: {
          employeeId: user.employee.id,
          date: {
            gte: tomorrow,
            lte: tomorrowEnd
          },
          status: { not: 'cancelled' }
        },
        select: {
          startTime: true,
          endTime: true
        }
      });

      if (tomorrowShifts.length > 0) {
        const shift = tomorrowShifts[0];
        alerts.push({
          type: 'info',
          category: 'schedule',
          title: 'Upcoming Shift',
          message: `Tomorrow: ${shift.startTime} - ${shift.endTime}`,
          timestamp: tomorrow,
          action: {
            type: 'link',
            url: '/schedules',
            label: 'View Schedule'
          }
        });
      }
    }

    // Sort alerts by priority and timestamp
    const priorityOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => {
      if (priorityOrder[a.type] !== priorityOrder[b.type]) {
        return priorityOrder[a.type] - priorityOrder[b.type];
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // Limit total alerts to prevent overwhelming the user
    const limitedAlerts = alerts.slice(0, 10);

    res.json({
      alerts: limitedAlerts,
      counts: {
        critical: alerts.filter(a => a.type === 'critical').length,
        warning: alerts.filter(a => a.type === 'warning').length,
        info: alerts.filter(a => a.type === 'info').length,
        total: alerts.length
      }
    });
  } catch (error) {
    console.error('Dashboard alerts 에러:', error);
    res.status(500).json({ message: 'Failed to get dashboard alerts' });
  }
};

module.exports = {
  getStats,
  getRecentActivity,
  getUpcomingSchedules,
  getScheduleSummary,
  getDashboardAlerts
};