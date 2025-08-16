const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// @desc    Get all schedules with leave information
// @route   GET /api/schedules
// @access  Private
const getAllSchedules = async (req, res) => {
  try {
    const { startDate, endDate, employeeId, department } = req.query;
    
    let whereClause = {};
    
    // Add date filtering
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    
    // Add employee filtering
    if (employeeId) {
      whereClause.employeeId = parseInt(employeeId);
    }
    
    // Add department filtering
    if (department) {
      whereClause.employee = {
        department: department
      };
    }

    const schedules = await prisma.schedule.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
            department: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    // Get approved leaves for the same period
    const leaveWhere = {
      status: 'approved'
    };
    
    if (startDate && endDate) {
      leaveWhere.OR = [
        {
          startDate: {
            lte: new Date(endDate)
          },
          endDate: {
            gte: new Date(startDate)
          }
        }
      ];
    }
    
    const leaves = await prisma.leave.findMany({
      where: leaveWhere,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            department: true,
            position: true
          }
        }
      }
    });
    
    // Get company settings to check work type
    const company = await prisma.company.findFirst();
    
    // Process leaves to find which employees are on leave for each date
    const employeesOnLeave = [];
    
    if (startDate && endDate) {
      const currentDate = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      while (currentDate <= endDateObj) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Find employees on leave for this date
        const todayLeaves = leaves.filter(leave => {
          const leaveStart = new Date(leave.startDate);
          const leaveEnd = new Date(leave.endDate);
          const checkDate = new Date(dateStr);
          return checkDate >= leaveStart && checkDate <= leaveEnd;
        });
        
        todayLeaves.forEach(leave => {
          employeesOnLeave.push({
            date: dateStr,
            employeeId: leave.employeeId,
            employeeName: leave.employee.name,
            leaveType: leave.type,
            leaveId: leave.id
          });
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    // Mark schedules with leave status
    const processedSchedules = schedules.map(schedule => {
      const scheduleDate = schedule.date.toISOString().split('T')[0];
      const onLeave = employeesOnLeave.find(
        leave => leave.date === scheduleDate && leave.employeeId === schedule.employeeId
      );
      
      return {
        ...schedule,
        isOnLeave: !!onLeave,
        leaveType: onLeave?.leaveType,
        leaveId: onLeave?.leaveId
      };
    });

    res.json({ 
      schedules: processedSchedules,
      leaves: employeesOnLeave,
      workType: company?.workType || 'flexible',
      showLeaveInSchedule: company?.showLeaveInSchedule || false
    });
  } catch (error) {
    console.error('Get all schedules error:', error);
    res.status(500).json({ message: 'Server error getting schedules' });
  }
};

// @desc    Get schedule by ID
// @route   GET /api/schedules/:id
// @access  Private
const getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await prisma.schedule.findUnique({
      where: { id: parseInt(id) },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
            department: true
          }
        }
      }
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    res.json({ schedule });
  } catch (error) {
    console.error('Get schedule by ID error:', error);
    res.status(500).json({ message: 'Server error getting schedule' });
  }
};

// @desc    Get schedules by employee ID
// @route   GET /api/schedules/employee/:employeeId
// @access  Private
const getSchedulesByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const schedules = await prisma.schedule.findMany({
      where: { employeeId: parseInt(employeeId) },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
            department: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    res.json({ schedules });
  } catch (error) {
    console.error('Get schedules by employee error:', error);
    res.status(500).json({ message: 'Server error getting employee schedules' });
  }
};

// @desc    Create new schedule
// @route   POST /api/schedules
// @access  Private
const createSchedule = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { employeeId, date, startTime, endTime, shiftType, notes } = req.body;

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employeeId) }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check for schedule conflict
    const existingSchedule = await prisma.schedule.findFirst({
      where: {
        employeeId: parseInt(employeeId),
        date: new Date(date)
      }
    });

    if (existingSchedule) {
      return res.status(400).json({ message: 'Employee already has a schedule for this date' });
    }

    const schedule = await prisma.schedule.create({
      data: {
        employeeId: parseInt(employeeId),
        date: new Date(date),
        startTime,
        endTime,
        shiftType: shiftType || 'regular',
        notes: notes || null
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
            department: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Schedule created successfully',
      schedule
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ message: 'Server error creating schedule' });
  }
};

// @desc    Update schedule
// @route   PUT /api/schedules/:id
// @access  Private
const updateSchedule = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { employeeId, date, startTime, endTime, shiftType, notes } = req.body;

    // Check if schedule exists
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingSchedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    // Check if employee exists (if being updated)
    if (employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: parseInt(employeeId) }
      });

      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }
    }

    // Check for schedule conflict (if date or employee is being changed)
    if ((employeeId && employeeId !== existingSchedule.employeeId) || 
        (date && new Date(date).getTime() !== existingSchedule.date.getTime())) {
      const conflictSchedule = await prisma.schedule.findFirst({
        where: {
          employeeId: parseInt(employeeId || existingSchedule.employeeId),
          date: new Date(date || existingSchedule.date),
          id: { not: parseInt(id) }
        }
      });

      if (conflictSchedule) {
        return res.status(400).json({ message: 'Employee already has a schedule for this date' });
      }
    }

    const updatedSchedule = await prisma.schedule.update({
      where: { id: parseInt(id) },
      data: {
        ...(employeeId && { employeeId: parseInt(employeeId) }),
        ...(date && { date: new Date(date) }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(shiftType && { shiftType }),
        ...(notes !== undefined && { notes })
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
            department: true
          }
        }
      }
    });

    res.json({
      message: 'Schedule updated successfully',
      schedule: updatedSchedule
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ message: 'Server error updating schedule' });
  }
};

// @desc    Delete schedule
// @route   DELETE /api/schedules/:id
// @access  Private
const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await prisma.schedule.findUnique({
      where: { id: parseInt(id) }
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    await prisma.schedule.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ message: 'Server error deleting schedule' });
  }
};

module.exports = {
  getAllSchedules,
  getScheduleById,
  getSchedulesByEmployee,
  createSchedule,
  updateSchedule,
  deleteSchedule
};