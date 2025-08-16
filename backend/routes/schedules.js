const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken } = require('../middleware/auth');
const { startOfWeek, endOfWeek, addDays, format, parseISO } = require('date-fns');

// Get schedules with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, employeeId, department } = req.query;
    
    const where = {};
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    
    if (employeeId) {
      where.employeeId = parseInt(employeeId);
    }
    
    if (department) {
      where.employee = {
        department
      };
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        employee: true
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    });

    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ message: 'Failed to fetch schedules' });
  }
});

// Get single schedule
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        employee: true
      }
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    res.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ message: 'Failed to fetch schedule' });
  }
});

// Create schedule(s)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { employeeId, date, startTime, endTime, shiftType, notes, repeat } = req.body;

    // Check for conflicts
    const conflicts = await checkScheduleConflicts({
      employeeId,
      date,
      startTime,
      endTime
    });

    if (conflicts.length > 0) {
      return res.status(400).json({ 
        message: 'Schedule conflicts detected',
        conflicts 
      });
    }

    const schedulesToCreate = [];

    if (repeat && repeat.enabled) {
      // Generate repeated schedules
      const dates = generateRepeatDates(date, repeat);
      
      for (const scheduleDate of dates) {
        // Check conflicts for each date
        const dateConflicts = await checkScheduleConflicts({
          employeeId,
          date: scheduleDate,
          startTime,
          endTime
        });

        if (dateConflicts.length === 0) {
          schedulesToCreate.push({
            employeeId: parseInt(employeeId),
            date: new Date(scheduleDate),
            startTime,
            endTime,
            shiftType: shiftType || 'regular',
            notes: notes || '',
            createdBy: req.user.id
          });
        }
      }
    } else {
      // Single schedule
      schedulesToCreate.push({
        employeeId: parseInt(employeeId),
        date: new Date(date),
        startTime,
        endTime,
        shiftType: shiftType || 'regular',
        notes: notes || '',
        createdBy: req.user.id
      });
    }

    // Create all schedules
    const createdSchedules = await prisma.schedule.createMany({
      data: schedulesToCreate
    });

    res.status(201).json({ 
      message: `Successfully created ${createdSchedules.count} schedule(s)`,
      count: createdSchedules.count
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ message: 'Failed to create schedule' });
  }
});

// Update schedule
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { employeeId, date, startTime, endTime, shiftType, notes } = req.body;
    const scheduleId = parseInt(req.params.id);

    // Check if schedule exists
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id: scheduleId }
    });

    if (!existingSchedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    // Check for conflicts (excluding current schedule)
    const conflicts = await checkScheduleConflicts({
      employeeId: employeeId || existingSchedule.employeeId,
      date: date || existingSchedule.date,
      startTime: startTime || existingSchedule.startTime,
      endTime: endTime || existingSchedule.endTime,
      excludeId: scheduleId
    });

    if (conflicts.length > 0) {
      return res.status(400).json({ 
        message: 'Schedule conflicts detected',
        conflicts 
      });
    }

    const updatedSchedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        employeeId: employeeId ? parseInt(employeeId) : undefined,
        date: date ? new Date(date) : undefined,
        startTime,
        endTime,
        shiftType,
        notes,
        updatedBy: req.user.id,
        updatedAt: new Date()
      },
      include: {
        employee: true
      }
    });

    res.json(updatedSchedule);
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ message: 'Failed to update schedule' });
  }
});

// Delete schedule
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.id);

    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId }
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    await prisma.schedule.delete({
      where: { id: scheduleId }
    });

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ message: 'Failed to delete schedule' });
  }
});

// Bulk update schedules (for drag and drop)
router.put('/bulk-update', authenticateToken, async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: 'No updates provided' });
    }

    // Check conflicts for all updates
    const allConflicts = [];
    for (const update of updates) {
      const conflicts = await checkScheduleConflicts({
        employeeId: update.employeeId,
        date: update.date,
        startTime: update.startTime,
        endTime: update.endTime,
        excludeId: update.id
      });

      if (conflicts.length > 0) {
        allConflicts.push({
          scheduleId: update.id,
          conflicts
        });
      }
    }

    if (allConflicts.length > 0) {
      return res.status(400).json({ 
        message: 'Conflicts detected in bulk update',
        conflicts: allConflicts 
      });
    }

    // Perform bulk update
    const updatePromises = updates.map(update => 
      prisma.schedule.update({
        where: { id: update.id },
        data: {
          employeeId: update.employeeId ? parseInt(update.employeeId) : undefined,
          date: update.date ? new Date(update.date) : undefined,
          startTime: update.startTime,
          endTime: update.endTime,
          shiftType: update.shiftType,
          notes: update.notes,
          updatedBy: req.user.id,
          updatedAt: new Date()
        }
      })
    );

    const updatedSchedules = await Promise.all(updatePromises);

    res.json({ 
      message: `Successfully updated ${updatedSchedules.length} schedules`,
      schedules: updatedSchedules 
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({ message: 'Failed to update schedules' });
  }
});

// Check for schedule conflicts
async function checkScheduleConflicts({ employeeId, date, startTime, endTime, excludeId }) {
  const where = {
    employeeId: parseInt(employeeId),
    date: new Date(date)
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const existingSchedules = await prisma.schedule.findMany({
    where,
    include: {
      employee: true
    }
  });

  const conflicts = [];

  for (const schedule of existingSchedules) {
    // Check time overlap
    if (isTimeOverlap(startTime, endTime, schedule.startTime, schedule.endTime)) {
      conflicts.push({
        id: schedule.id,
        employee: schedule.employee.name,
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        reason: 'Time overlap'
      });
    }
  }

  return conflicts;
}

// Check if two time ranges overlap
function isTimeOverlap(start1, end1, start2, end2) {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);

  // Handle overnight shifts
  if (e1 < s1) e1 += 1440; // Add 24 hours
  if (e2 < s2) e2 += 1440;

  return (s1 < e2 && e1 > s2);
}

// Convert time string to minutes
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Generate dates for repeated schedules
function generateRepeatDates(startDate, repeat) {
  const dates = [];
  const start = parseISO(startDate);
  const end = repeat.endDate ? parseISO(repeat.endDate) : addDays(start, 90); // Default 3 months

  let currentDate = start;

  while (currentDate <= end) {
    switch (repeat.type) {
      case 'daily':
        dates.push(format(currentDate, 'yyyy-MM-dd'));
        currentDate = addDays(currentDate, 1);
        break;

      case 'weekly':
        // Add dates for selected days of week
        if (repeat.daysOfWeek && repeat.daysOfWeek.length > 0) {
          const dayOfWeek = currentDate.getDay();
          if (repeat.daysOfWeek.includes(dayOfWeek)) {
            dates.push(format(currentDate, 'yyyy-MM-dd'));
          }
        }
        currentDate = addDays(currentDate, 1);
        break;

      case 'monthly':
        dates.push(format(currentDate, 'yyyy-MM-dd'));
        currentDate = addDays(currentDate, 30);
        break;

      default:
        break;
    }

    // Safety limit
    if (dates.length > 365) break;
  }

  return dates;
}

module.exports = router;