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

// @desc    Check for schedule conflicts and leaves in a period
// @route   GET /api/schedules/check-period
// @access  Private
const checkPeriod = async (req, res) => {
  try {
    const { startDate, endDate, employeeId, department } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Build where clause for schedules
    let scheduleWhere = {
      date: {
        gte: start,
        lte: end
      }
    };

    if (employeeId) {
      scheduleWhere.employeeId = parseInt(employeeId);
    }

    if (department) {
      scheduleWhere.employee = {
        department: department
      };
    }

    // Get existing schedules in the period
    const existingSchedules = await prisma.schedule.findMany({
      where: scheduleWhere,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            department: true,
            position: true
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    });

    // Build where clause for leaves
    let leaveWhere = {
      status: 'approved',
      OR: [
        {
          startDate: {
            lte: end
          },
          endDate: {
            gte: start
          }
        }
      ]
    };

    if (employeeId) {
      leaveWhere.employeeId = parseInt(employeeId);
    }

    if (department) {
      leaveWhere.employee = {
        department: department
      };
    }

    // Get approved leaves in the period
    const leavesInPeriod = await prisma.leave.findMany({
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
      },
      orderBy: { startDate: 'asc' }
    });

    // Get employee chemistry data if needed for conflict checking
    const chemistry = await prisma.employeeChemistry.findMany({
      where: {
        score: {
          lte: 2 // Poor chemistry (1-2 score)
        }
      },
      include: {
        employee1: {
          select: {
            id: true,
            name: true,
            department: true
          }
        },
        employee2: {
          select: {
            id: true,
            name: true,
            department: true
          }
        }
      }
    });

    // Process daily conflicts
    const conflicts = [];
    const dateMap = {};

    // Group schedules by date
    existingSchedules.forEach(schedule => {
      const dateKey = schedule.date.toISOString().split('T')[0];
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = [];
      }
      dateMap[dateKey].push(schedule);
    });

    // Check for conflicts on each date
    Object.keys(dateMap).forEach(date => {
      const daySchedules = dateMap[date];
      
      // Check for time overlaps
      for (let i = 0; i < daySchedules.length; i++) {
        for (let j = i + 1; j < daySchedules.length; j++) {
          const schedule1 = daySchedules[i];
          const schedule2 = daySchedules[j];
          
          if (isTimeOverlap(schedule1.startTime, schedule1.endTime, schedule2.startTime, schedule2.endTime)) {
            conflicts.push({
              type: 'time_overlap',
              date: date,
              employees: [
                { id: schedule1.employeeId, name: schedule1.employee.name },
                { id: schedule2.employeeId, name: schedule2.employee.name }
              ],
              schedules: [
                { id: schedule1.id, startTime: schedule1.startTime, endTime: schedule1.endTime },
                { id: schedule2.id, startTime: schedule2.startTime, endTime: schedule2.endTime }
              ]
            });
          }
        }
      }

      // Check for chemistry conflicts (employees with poor chemistry working same shift)
      for (let i = 0; i < daySchedules.length; i++) {
        for (let j = i + 1; j < daySchedules.length; j++) {
          const schedule1 = daySchedules[i];
          const schedule2 = daySchedules[j];
          
          const poorChemistry = chemistry.find(chem => 
            (chem.employee1Id === schedule1.employeeId && chem.employee2Id === schedule2.employeeId) ||
            (chem.employee1Id === schedule2.employeeId && chem.employee2Id === schedule1.employeeId)
          );

          if (poorChemistry && isTimeOverlap(schedule1.startTime, schedule1.endTime, schedule2.startTime, schedule2.endTime)) {
            conflicts.push({
              type: 'chemistry_conflict',
              date: date,
              employees: [
                { id: schedule1.employeeId, name: schedule1.employee.name },
                { id: schedule2.employeeId, name: schedule2.employee.name }
              ],
              chemistryScore: poorChemistry.score,
              schedules: [
                { id: schedule1.id, startTime: schedule1.startTime, endTime: schedule1.endTime },
                { id: schedule2.id, startTime: schedule2.startTime, endTime: schedule2.endTime }
              ]
            });
          }
        }
      }
    });

    // Check for employees on leave who have schedules
    const employeesOnLeave = [];
    leavesInPeriod.forEach(leave => {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      
      existingSchedules.forEach(schedule => {
        const scheduleDate = new Date(schedule.date);
        if (schedule.employeeId === leave.employeeId && 
            scheduleDate >= leaveStart && scheduleDate <= leaveEnd) {
          employeesOnLeave.push({
            type: 'employee_on_leave',
            employeeId: schedule.employeeId,
            employeeName: schedule.employee.name,
            scheduleId: schedule.id,
            scheduleDate: schedule.date,
            leaveType: leave.type,
            leaveStart: leave.startDate,
            leaveEnd: leave.endDate
          });
        }
      });
    });

    res.json({
      period: { startDate, endDate },
      summary: {
        totalSchedules: existingSchedules.length,
        totalLeaves: leavesInPeriod.length,
        totalConflicts: conflicts.length,
        employeesOnLeaveWithSchedules: employeesOnLeave.length
      },
      existingSchedules,
      leavesInPeriod,
      conflicts,
      employeesOnLeave
    });

  } catch (error) {
    console.error('Check period error:', error);
    res.status(500).json({ message: 'Server error checking period' });
  }
};

// Helper function to check time overlap
const isTimeOverlap = (start1, end1, start2, end2) => {
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);

  // Handle overnight shifts
  const adj_e1 = e1 < s1 ? e1 + 1440 : e1;
  const adj_e2 = e2 < s2 ? e2 + 1440 : e2;

  return (s1 < adj_e2 && adj_e1 > s2);
};

// @desc    Auto-generate schedules with advanced conflict handling
// @route   POST /api/schedules/auto-generate
// @access  Private
const autoGenerateSchedules = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      startDate, 
      endDate, 
      shiftType, 
      startTime = '09:00', 
      endTime = '18:00', 
      department, 
      employeeIds = [], 
      priorityHours = [], // [{start: '09:00', end: '12:00', weight: 5}]
      minStaffPerDay = 1,
      maxStaffPerDay = 10,
      avoidWeekends = false 
    } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get available employees
    let employeeWhere = {};
    if (department) {
      employeeWhere.department = department;
    }
    if (employeeIds.length > 0) {
      employeeWhere.id = { in: employeeIds.map(id => parseInt(id)) };
    }

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        abilities: true,
        preferences: true,
        schedules: {
          where: {
            date: {
              gte: start,
              lte: end
            }
          }
        },
        leaves: {
          where: {
            status: 'approved',
            OR: [
              {
                startDate: { lte: end },
                endDate: { gte: start }
              }
            ]
          }
        }
      }
    });

    // Get chemistry data for conflict avoidance
    const chemistry = await prisma.employeeChemistry.findMany({
      include: {
        employee1: true,
        employee2: true
      }
    });

    // Generate schedule dates
    const scheduleDates = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
      if (!avoidWeekends || (currentDate.getDay() !== 0 && currentDate.getDay() !== 6)) {
        scheduleDates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const generatedSchedules = [];
    const conflicts = [];

    for (const scheduleDate of scheduleDates) {
      const dateStr = scheduleDate.toISOString().split('T')[0];
      
      // Filter available employees for this date
      const availableEmployees = employees.filter(employee => {
        // Check if employee is on leave
        const isOnLeave = employee.leaves.some(leave => {
          const leaveStart = new Date(leave.startDate);
          const leaveEnd = new Date(leave.endDate);
          return scheduleDate >= leaveStart && scheduleDate <= leaveEnd;
        });

        // Check if employee already has a schedule for this date
        const hasSchedule = employee.schedules.some(schedule => {
          const scheduleDate_str = schedule.date.toISOString().split('T')[0];
          return scheduleDate_str === dateStr;
        });

        return !isOnLeave && !hasSchedule;
      });

      if (availableEmployees.length === 0) {
        conflicts.push({
          type: 'no_available_employees',
          date: dateStr,
          message: 'No available employees for this date'
        });
        continue;
      }

      // Calculate employee scores for this date
      const employeeScores = availableEmployees.map(employee => {
        let score = 0;
        const ability = employee.abilities[0];
        
        if (ability) {
          // Base score from abilities
          score += (ability.workSkill || 1) * 3;
          score += (ability.experience || 1) * 2;
          score += (ability.customerService || 1) * 2;
          score += (ability.flexibility || 1) * 1;
          score += (ability.teamChemistry || 1) * 1;
        } else {
          score = 5; // Default score
        }

        // Check preferences
        if (employee.preferences && employee.preferences.length > 0) {
          const preference = employee.preferences[0];
          const dayOfWeek = scheduleDate.getDay();
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayName = dayNames[dayOfWeek];

          if (preference.preferDays && preference.preferDays.includes(dayName)) {
            score += 5; // Bonus for preferred days
          }
          if (preference.avoidDays && preference.avoidDays.includes(dayName)) {
            score -= 3; // Penalty for avoided days
          }
        }

        // Priority hours bonus
        if (priorityHours.length > 0) {
          const isPriorityTime = priorityHours.some(ph => {
            const phStart = timeToMinutes(ph.start);
            const phEnd = timeToMinutes(ph.end);
            const shiftStart = timeToMinutes(startTime);
            const shiftEnd = timeToMinutes(endTime);
            
            return (shiftStart >= phStart && shiftStart < phEnd) || 
                   (shiftEnd > phStart && shiftEnd <= phEnd) ||
                   (shiftStart <= phStart && shiftEnd >= phEnd);
          });
          
          if (isPriorityTime) {
            const priorityWeight = priorityHours.reduce((max, ph) => Math.max(max, ph.weight || 1), 1);
            score += priorityWeight * 3;
          }
        }

        return {
          employee,
          score,
          ability: ability || null
        };
      });

      // Sort by score (highest first)
      employeeScores.sort((a, b) => b.score - a.score);

      // Select employees for this day (avoiding chemistry conflicts)
      const selectedForDay = [];
      const maxStaff = Math.min(maxStaffPerDay, employeeScores.length);
      const minStaff = Math.min(minStaffPerDay, employeeScores.length);

      for (const empScore of employeeScores) {
        if (selectedForDay.length >= maxStaff) break;

        const employee = empScore.employee;
        
        // Check chemistry conflicts with already selected employees
        const hasChemistryConflict = selectedForDay.some(selected => {
          const conflict = chemistry.find(chem => 
            ((chem.employee1Id === employee.id && chem.employee2Id === selected.employee.id) ||
             (chem.employee1Id === selected.employee.id && chem.employee2Id === employee.id)) &&
            chem.score <= 2 // Poor chemistry
          );
          return !!conflict;
        });

        if (!hasChemistryConflict) {
          selectedForDay.push(empScore);
        }
      }

      // Ensure minimum staffing
      if (selectedForDay.length < minStaff) {
        // Force add employees even with chemistry conflicts if needed
        const remaining = employeeScores.filter(emp => 
          !selectedForDay.some(sel => sel.employee.id === emp.employee.id)
        );
        
        for (const emp of remaining) {
          if (selectedForDay.length >= minStaff) break;
          selectedForDay.push(emp);
        }

        if (selectedForDay.length < minStaff) {
          conflicts.push({
            type: 'insufficient_staff',
            date: dateStr,
            required: minStaff,
            available: selectedForDay.length,
            message: `Could not meet minimum staff requirement of ${minStaff}`
          });
        }
      }

      // Create schedules for selected employees
      for (const empScore of selectedForDay) {
        try {
          const schedule = await prisma.schedule.create({
            data: {
              employeeId: empScore.employee.id,
              date: scheduleDate,
              startTime,
              endTime,
              shiftType,
              notes: `Auto-generated (Score: ${empScore.score})`,
              status: 'scheduled',
              createdBy: req.user?.id || null
            },
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

          generatedSchedules.push(schedule);
        } catch (error) {
          conflicts.push({
            type: 'creation_error',
            date: dateStr,
            employeeId: empScore.employee.id,
            employeeName: empScore.employee.name,
            error: error.message
          });
        }
      }
    }

    res.status(201).json({
      message: `Auto-generation completed. Created ${generatedSchedules.length} schedules.`,
      summary: {
        totalDates: scheduleDates.length,
        schedulesCreated: generatedSchedules.length,
        conflictsFound: conflicts.length,
        period: { startDate, endDate }
      },
      schedules: generatedSchedules,
      conflicts
    });

  } catch (error) {
    console.error('Auto generate schedules error:', error);
    res.status(500).json({ message: 'Server error auto-generating schedules' });
  }
};

// Helper function to convert time to minutes
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// @desc    Quick update schedule (immediate modification)
// @route   PATCH /api/schedules/:id/quick-update
// @access  Private
const quickUpdateSchedule = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { employeeId, date, startTime, endTime, shiftType, notes, status } = req.body;

    // Check if schedule exists
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id: parseInt(id) },
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

    if (!existingSchedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    // Prepare update data
    const updateData = {};
    const fieldsToUpdate = [];

    if (employeeId && employeeId !== existingSchedule.employeeId) {
      // Check if new employee exists
      const newEmployee = await prisma.employee.findUnique({
        where: { id: parseInt(employeeId) }
      });
      
      if (!newEmployee) {
        return res.status(404).json({ message: 'New employee not found' });
      }

      // Check if new employee is on leave for this date
      const targetDate = date ? new Date(date) : existingSchedule.date;
      const onLeave = await prisma.leave.findFirst({
        where: {
          employeeId: parseInt(employeeId),
          status: 'approved',
          startDate: { lte: targetDate },
          endDate: { gte: targetDate }
        }
      });

      if (onLeave) {
        return res.status(400).json({ 
          message: 'Employee is on leave during this period',
          leaveDetails: {
            type: onLeave.type,
            startDate: onLeave.startDate,
            endDate: onLeave.endDate
          }
        });
      }

      updateData.employeeId = parseInt(employeeId);
      fieldsToUpdate.push('employee');
    }

    if (date && new Date(date).getTime() !== existingSchedule.date.getTime()) {
      updateData.date = new Date(date);
      fieldsToUpdate.push('date');
    }

    if (startTime && startTime !== existingSchedule.startTime) {
      updateData.startTime = startTime;
      fieldsToUpdate.push('start time');
    }

    if (endTime && endTime !== existingSchedule.endTime) {
      updateData.endTime = endTime;
      fieldsToUpdate.push('end time');
    }

    if (shiftType && shiftType !== existingSchedule.shiftType) {
      updateData.shiftType = shiftType;
      fieldsToUpdate.push('shift type');
    }

    if (status && status !== existingSchedule.status) {
      updateData.status = status;
      fieldsToUpdate.push('status');
    }

    if (notes !== undefined && notes !== existingSchedule.notes) {
      updateData.notes = notes;
      fieldsToUpdate.push('notes');
    }

    // If no changes, return current schedule
    if (Object.keys(updateData).length === 0) {
      return res.json({
        message: 'No changes detected',
        schedule: existingSchedule
      });
    }

    // Quick conflict check for critical changes (employee, date, time)
    if (updateData.employeeId || updateData.date || updateData.startTime || updateData.endTime) {
      const conflictCheckData = {
        employeeId: updateData.employeeId || existingSchedule.employeeId,
        date: updateData.date || existingSchedule.date,
        startTime: updateData.startTime || existingSchedule.startTime,
        endTime: updateData.endTime || existingSchedule.endTime
      };

      // Check for schedule conflicts (excluding current schedule)
      const conflictSchedule = await prisma.schedule.findFirst({
        where: {
          employeeId: conflictCheckData.employeeId,
          date: conflictCheckData.date,
          id: { not: parseInt(id) },
          OR: [
            {
              // Time overlap check
              AND: [
                { startTime: { lt: conflictCheckData.endTime } },
                { endTime: { gt: conflictCheckData.startTime } }
              ]
            }
          ]
        },
        include: {
          employee: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (conflictSchedule) {
        return res.status(400).json({
          message: 'Schedule conflict detected',
          conflict: {
            conflictingSchedule: {
              id: conflictSchedule.id,
              employee: conflictSchedule.employee.name,
              date: conflictSchedule.date,
              startTime: conflictSchedule.startTime,
              endTime: conflictSchedule.endTime
            }
          }
        });
      }

      // Check chemistry conflicts if employee is being changed
      if (updateData.employeeId) {
        const targetDate = updateData.date || existingSchedule.date;
        const sameDaySchedules = await prisma.schedule.findMany({
          where: {
            date: targetDate,
            id: { not: parseInt(id) },
            employeeId: { not: updateData.employeeId }
          },
          include: {
            employee: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });

        // Check for poor chemistry with other employees working the same day
        const chemistryConflicts = [];
        for (const daySchedule of sameDaySchedules) {
          const chemistry = await prisma.employeeChemistry.findFirst({
            where: {
              OR: [
                {
                  employee1Id: updateData.employeeId,
                  employee2Id: daySchedule.employeeId
                },
                {
                  employee1Id: daySchedule.employeeId,
                  employee2Id: updateData.employeeId
                }
              ],
              score: { lte: 2 } // Poor chemistry
            }
          });

          if (chemistry && isTimeOverlap(
            updateData.startTime || existingSchedule.startTime,
            updateData.endTime || existingSchedule.endTime,
            daySchedule.startTime,
            daySchedule.endTime
          )) {
            chemistryConflicts.push({
              employee: daySchedule.employee.name,
              schedule: daySchedule,
              chemistryScore: chemistry.score
            });
          }
        }

        if (chemistryConflicts.length > 0) {
          return res.status(400).json({
            message: 'Chemistry conflicts detected',
            conflicts: chemistryConflicts,
            warning: 'Employees with poor chemistry will be working the same shift'
          });
        }
      }
    }

    // Add metadata
    updateData.updatedBy = req.user?.id || null;
    updateData.updatedAt = new Date();

    // Perform the update
    const updatedSchedule = await prisma.schedule.update({
      where: { id: parseInt(id) },
      data: updateData,
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
      message: `Schedule updated successfully. Changed: ${fieldsToUpdate.join(', ')}`,
      fieldsUpdated: fieldsToUpdate,
      schedule: updatedSchedule,
      previousValues: {
        employeeId: existingSchedule.employeeId,
        employeeName: existingSchedule.employee.name,
        date: existingSchedule.date,
        startTime: existingSchedule.startTime,
        endTime: existingSchedule.endTime,
        shiftType: existingSchedule.shiftType,
        status: existingSchedule.status,
        notes: existingSchedule.notes
      }
    });

  } catch (error) {
    console.error('Quick update schedule error:', error);
    res.status(500).json({ message: 'Server error updating schedule' });
  }
};

// @desc    Calculate staffing requirements for a given period
// @route   POST /api/schedules/calculate-requirements
// @access  Private
const calculateRequirements = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      startDate,
      endDate,
      department,
      shiftPatterns = [], // [{ name: 'morning', startTime: '09:00', endTime: '17:00', daysOfWeek: [1,2,3,4,5], staffRequired: 3 }]
      peakHours = [], // [{ start: '12:00', end: '14:00', additionalStaff: 2 }]
      holidayMultiplier = 1.5,
      weekendMultiplier = 1.2
    } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Get company settings for default requirements
    const company = await prisma.company.findFirst();
    const baseStaffRequired = company?.minStaffRequired || 2;
    
    // Get employees in department
    const employees = await prisma.employee.findMany({
      where: department ? { department } : {},
      include: {
        abilities: true,
        preferences: true,
        leaves: {
          where: {
            status: 'approved',
            OR: [
              {
                startDate: { lte: end },
                endDate: { gte: start }
              }
            ]
          }
        }
      }
    });

    const requirements = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday
      const dateStr = currentDate.toISOString().split('T')[0];
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Check if it's a holiday (simplified - could be enhanced with holiday API)
      const isHoliday = false; // Add holiday detection logic here
      
      // Calculate available employees for this day
      const availableEmployees = employees.filter(emp => {
        return !emp.leaves.some(leave => {
          const leaveStart = new Date(leave.startDate);
          const leaveEnd = new Date(leave.endDate);
          return currentDate >= leaveStart && currentDate <= leaveEnd;
        });
      });
      
      // Apply shift patterns or use base requirements
      const dayRequirements = [];
      
      if (shiftPatterns.length > 0) {
        shiftPatterns.forEach(pattern => {
          if (pattern.daysOfWeek.includes(dayOfWeek)) {
            let staffNeeded = pattern.staffRequired || baseStaffRequired;
            
            // Apply multipliers
            if (isHoliday) staffNeeded = Math.ceil(staffNeeded * holidayMultiplier);
            else if (isWeekend) staffNeeded = Math.ceil(staffNeeded * weekendMultiplier);
            
            // Apply peak hour adjustments
            const peakAdjustment = peakHours.reduce((acc, peak) => {
              const patternStart = timeToMinutes(pattern.startTime);
              const patternEnd = timeToMinutes(pattern.endTime);
              const peakStart = timeToMinutes(peak.start);
              const peakEnd = timeToMinutes(peak.end);
              
              // Check if shift overlaps with peak hours
              if (patternStart < peakEnd && patternEnd > peakStart) {
                return acc + (peak.additionalStaff || 0);
              }
              return acc;
            }, 0);
            
            staffNeeded += peakAdjustment;
            
            dayRequirements.push({
              shift: pattern.name,
              startTime: pattern.startTime,
              endTime: pattern.endTime,
              staffRequired: staffNeeded,
              staffAvailable: availableEmployees.length,
              shortfall: Math.max(0, staffNeeded - availableEmployees.length),
              utilizationRate: availableEmployees.length > 0 ? (staffNeeded / availableEmployees.length) : 0
            });
          }
        });
      } else {
        // Default single shift requirement
        let staffNeeded = baseStaffRequired;
        if (isHoliday) staffNeeded = Math.ceil(staffNeeded * holidayMultiplier);
        else if (isWeekend) staffNeeded = Math.ceil(staffNeeded * weekendMultiplier);
        
        dayRequirements.push({
          shift: 'default',
          startTime: company?.defaultStartTime || '09:00',
          endTime: company?.defaultEndTime || '18:00',
          staffRequired: staffNeeded,
          staffAvailable: availableEmployees.length,
          shortfall: Math.max(0, staffNeeded - availableEmployees.length),
          utilizationRate: availableEmployees.length > 0 ? (staffNeeded / availableEmployees.length) : 0
        });
      }
      
      requirements.push({
        date: dateStr,
        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
        isWeekend,
        isHoliday,
        shifts: dayRequirements,
        totalStaffRequired: dayRequirements.reduce((sum, shift) => sum + shift.staffRequired, 0),
        totalStaffAvailable: availableEmployees.length,
        criticalShortfall: dayRequirements.some(shift => shift.shortfall > 0)
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Calculate summary statistics
    const summary = {
      totalDays: requirements.length,
      totalStaffHoursRequired: requirements.reduce((sum, day) => {
        return sum + day.shifts.reduce((shiftSum, shift) => {
          const shiftHours = (timeToMinutes(shift.endTime) - timeToMinutes(shift.startTime)) / 60;
          return shiftSum + (shift.staffRequired * shiftHours);
        }, 0);
      }, 0),
      averageUtilization: requirements.length > 0 ? 
        requirements.reduce((sum, day) => sum + day.shifts.reduce((s, shift) => s + shift.utilizationRate, 0), 0) / requirements.length : 0,
      daysWithShortfall: requirements.filter(day => day.criticalShortfall).length,
      peakRequirementDay: requirements.reduce((peak, day) => 
        day.totalStaffRequired > (peak?.totalStaffRequired || 0) ? day : peak, null
      )
    };
    
    res.json({
      message: 'Staffing requirements calculated successfully',
      period: { startDate, endDate, department },
      summary,
      dailyRequirements: requirements
    });
    
  } catch (error) {
    console.error('Calculate requirements error:', error);
    res.status(500).json({ message: 'Server error calculating requirements' });
  }
};

// @desc    Validate shift patterns for consistency and conflicts
// @route   POST /api/schedules/validate-patterns
// @access  Private
const validatePatterns = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      patterns = [], // Array of shift patterns to validate
      checkConflicts = true,
      checkCoverage = true,
      department
    } = req.body;

    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Validate individual patterns
    patterns.forEach((pattern, index) => {
      const patternName = pattern.name || `Pattern ${index + 1}`;
      
      // Required fields validation
      if (!pattern.startTime || !pattern.endTime) {
        validationResults.errors.push({
          pattern: patternName,
          field: 'time',
          message: 'Start time and end time are required'
        });
        validationResults.isValid = false;
      }
      
      if (!pattern.daysOfWeek || !Array.isArray(pattern.daysOfWeek) || pattern.daysOfWeek.length === 0) {
        validationResults.errors.push({
          pattern: patternName,
          field: 'daysOfWeek',
          message: 'Days of week must be a non-empty array'
        });
        validationResults.isValid = false;
      }
      
      if (pattern.staffRequired && (pattern.staffRequired < 1 || pattern.staffRequired > 50)) {
        validationResults.warnings.push({
          pattern: patternName,
          field: 'staffRequired',
          message: 'Staff required should be between 1 and 50'
        });
      }
      
      // Time validation
      if (pattern.startTime && pattern.endTime) {
        const startMinutes = timeToMinutes(pattern.startTime);
        const endMinutes = timeToMinutes(pattern.endTime);
        
        if (startMinutes >= endMinutes && endMinutes !== 0) { // Allow overnight shifts ending at 00:00
          validationResults.warnings.push({
            pattern: patternName,
            field: 'time',
            message: 'End time should be after start time (or this might be an overnight shift)'
          });
        }
        
        const shiftDuration = endMinutes > startMinutes ? 
          endMinutes - startMinutes : 
          (1440 - startMinutes) + endMinutes; // Handle overnight shifts
          
        if (shiftDuration < 120) { // Less than 2 hours
          validationResults.warnings.push({
            pattern: patternName,
            field: 'time',
            message: 'Shift duration is very short (less than 2 hours)'
          });
        } else if (shiftDuration > 720) { // More than 12 hours
          validationResults.warnings.push({
            pattern: patternName,
            field: 'time',
            message: 'Shift duration is very long (more than 12 hours)'
          });
        }
      }
      
      // Days of week validation
      if (pattern.daysOfWeek) {
        const invalidDays = pattern.daysOfWeek.filter(day => day < 0 || day > 6);
        if (invalidDays.length > 0) {
          validationResults.errors.push({
            pattern: patternName,
            field: 'daysOfWeek',
            message: 'Days of week must be numbers 0-6 (0=Sunday, 6=Saturday)'
          });
          validationResults.isValid = false;
        }
        
        if (pattern.daysOfWeek.length === 7) {
          validationResults.suggestions.push({
            pattern: patternName,
            message: 'Pattern covers all 7 days - consider if rest days are needed'
          });
        }
      }
    });

    if (checkConflicts && patterns.length > 1) {
      // Check for time overlaps between patterns on same days
      for (let i = 0; i < patterns.length; i++) {
        for (let j = i + 1; j < patterns.length; j++) {
          const pattern1 = patterns[i];
          const pattern2 = patterns[j];
          
          // Find common days
          const commonDays = pattern1.daysOfWeek?.filter(day => 
            pattern2.daysOfWeek?.includes(day)
          ) || [];
          
          if (commonDays.length > 0) {
            // Check time overlap
            const overlap = isTimeOverlap(
              pattern1.startTime, pattern1.endTime,
              pattern2.startTime, pattern2.endTime
            );
            
            if (overlap) {
              validationResults.warnings.push({
                patterns: [pattern1.name || `Pattern ${i + 1}`, pattern2.name || `Pattern ${j + 1}`],
                field: 'conflict',
                message: `Time overlap detected on days: ${commonDays.join(', ')}`,
                commonDays
              });
            }
          }
        }
      }
    }

    if (checkCoverage) {
      // Check coverage gaps
      const coverageByDay = [0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => {
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
        const dayPatterns = patterns.filter(p => p.daysOfWeek?.includes(dayOfWeek));
        
        if (dayPatterns.length === 0) {
          validationResults.warnings.push({
            field: 'coverage',
            message: `No coverage for ${dayName}`,
            dayOfWeek,
            dayName
          });
        }
        
        return {
          dayOfWeek,
          dayName,
          patternCount: dayPatterns.length,
          totalStaffRequired: dayPatterns.reduce((sum, p) => sum + (p.staffRequired || 0), 0)
        };
      });
      
      // Check if weekends have appropriate coverage
      const weekendCoverage = coverageByDay.filter(day => day.dayOfWeek === 0 || day.dayOfWeek === 6);
      const weekdayCoverage = coverageByDay.filter(day => day.dayOfWeek > 0 && day.dayOfWeek < 6);
      
      const avgWeekendStaff = weekendCoverage.reduce((sum, day) => sum + day.totalStaffRequired, 0) / 2;
      const avgWeekdayStaff = weekdayCoverage.reduce((sum, day) => sum + day.totalStaffRequired, 0) / 5;
      
      if (avgWeekendStaff > avgWeekdayStaff * 1.5) {
        validationResults.suggestions.push({
          field: 'coverage',
          message: 'Weekend staffing is significantly higher than weekday - consider if this is intentional'
        });
      }
      
      validationResults.coverageAnalysis = coverageByDay;
    }

    // Get available employees if department specified
    if (department) {
      const availableEmployees = await prisma.employee.count({
        where: { department }
      });
      
      const maxStaffRequired = Math.max(...patterns.map(p => p.staffRequired || 0));
      
      if (maxStaffRequired > availableEmployees) {
        validationResults.errors.push({
          field: 'staffing',
          message: `Maximum staff required (${maxStaffRequired}) exceeds available employees (${availableEmployees}) in ${department} department`,
          maxRequired: maxStaffRequired,
          available: availableEmployees
        });
        validationResults.isValid = false;
      }
    }

    res.json({
      message: 'Pattern validation completed',
      validation: validationResults,
      patternCount: patterns.length
    });
    
  } catch (error) {
    console.error('Validate patterns error:', error);
    res.status(500).json({ message: 'Server error validating patterns' });
  }
};

// @desc    Generate advanced schedules with multiple patterns and constraints
// @route   POST /api/schedules/generate-advanced
// @access  Private
const generateAdvanced = async (req, res) => {
  try {
    console.log('=== Advanced Schedule Generation Started ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      startDate,
      endDate,
      department,
      employeeIds = [],
      shiftPatterns = [],
      constraints = {
        maxConsecutiveDays: 6,
        minRestHours: 10,
        maxWeeklyHours: 45,
        respectPreferences: true,
        avoidPoorChemistry: true,
        fairDistribution: true
      },
      priorities = {
        seniorityWeight: 0.2,
        abilityWeight: 0.4,
        preferenceWeight: 0.3,
        availabilityWeight: 0.1
      }
    } = req.body;

    console.log('Input parameters:');
    console.log('- Date range:', startDate, 'to', endDate);
    console.log('- Department:', department);
    console.log('- Employee IDs:', employeeIds);
    console.log('- Shift patterns count:', shiftPatterns.length);
    console.log('- Constraints:', constraints);
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // 입력 파라미터 검증
    if (shiftPatterns.length === 0) {
      console.log('ERROR: No shift patterns provided');
      return res.status(400).json({ 
        message: 'At least one shift pattern is required',
        details: 'shiftPatterns 배열이 비어있습니다. 최소 하나의 근무 패턴이 필요합니다.'
      });
    }
    
    // shiftPatterns 검증
    for (let i = 0; i < shiftPatterns.length; i++) {
      const pattern = shiftPatterns[i];
      console.log(`Validating shift pattern ${i}:`, pattern);
      
      if (!pattern.daysOfWeek || !Array.isArray(pattern.daysOfWeek) || pattern.daysOfWeek.length === 0) {
        console.log(`ERROR: Pattern ${i} has invalid daysOfWeek:`, pattern.daysOfWeek);
        return res.status(400).json({ 
          message: `Shift pattern ${i} has invalid daysOfWeek`,
          details: 'daysOfWeek는 0-6 사이의 숫자 배열이어야 합니다 (0=일요일, 6=토요일)'
        });
      }
      
      // daysOfWeek 범위 검증 (0-6)
      const invalidDays = pattern.daysOfWeek.filter(day => typeof day !== 'number' || day < 0 || day > 6);
      if (invalidDays.length > 0) {
        console.log(`ERROR: Pattern ${i} has invalid day values:`, invalidDays);
        return res.status(400).json({ 
          message: `Shift pattern ${i} has invalid day values: ${invalidDays.join(', ')}`,
          details: 'daysOfWeek 배열의 각 요소는 0-6 사이의 숫자여야 합니다 (0=일요일, 6=토요일)'
        });
      }
      
      if (!pattern.startTime || !pattern.endTime) {
        console.log(`ERROR: Pattern ${i} missing time information`);
        return res.status(400).json({ 
          message: `Shift pattern ${i} is missing startTime or endTime`,
          details: 'startTime과 endTime은 필수입니다 (예: "09:00", "18:00")'
        });
      }
    }
    
    console.log('All shift patterns validated successfully');

    // Get employees with full data
    let employeeWhere = {};
    if (department) {
      employeeWhere.department = department;
      console.log('Filtering by department:', department);
    }
    if (employeeIds.length > 0) {
      const parsedIds = employeeIds.map(id => parseInt(id)).filter(id => !isNaN(id));
      if (parsedIds.length !== employeeIds.length) {
        console.log('WARNING: Some employee IDs could not be parsed:', employeeIds);
      }
      employeeWhere.id = { in: parsedIds };
      console.log('Filtering by employee IDs:', parsedIds);
    }
    
    console.log('Employee query where clause:', employeeWhere);

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        abilities: true,
        preferences: true,
        schedules: {
          where: {
            date: {
              gte: new Date(start.getTime() - 14 * 24 * 60 * 60 * 1000), // Include 2 weeks before for consecutive days check
              lte: end
            }
          },
          orderBy: { date: 'desc' }
        },
        leaves: {
          where: {
            status: 'approved',
            OR: [{
              startDate: { lte: end },
              endDate: { gte: start }
            }]
          }
        }
      }
    });
    
    console.log(`Found ${employees.length} employees matching criteria`);
    if (employees.length === 0) {
      console.log('ERROR: No employees found with the given criteria');
      return res.status(400).json({ 
        message: 'No employees found with the given criteria',
        details: '지정된 조건에 맞는 직원이 없습니다. 부서나 직원 ID를 확인하세요.',
        criteria: { department, employeeIds }
      });
    }
    
    employees.forEach(emp => {
      console.log(`Employee ${emp.id} (${emp.name}):`);
      console.log(`  - Department: ${emp.department}`);
      console.log(`  - Abilities: ${emp.abilities.length}`);
      console.log(`  - Preferences: ${emp.preferences.length}`);
      console.log(`  - Existing schedules in period: ${emp.schedules.length}`);
      console.log(`  - Approved leaves in period: ${emp.leaves.length}`);
      if (emp.leaves.length > 0) {
        emp.leaves.forEach(leave => {
          console.log(`    - Leave: ${leave.type} from ${leave.startDate.toISOString().split('T')[0]} to ${leave.endDate.toISOString().split('T')[0]}`);
        });
      }
    });

    // Get chemistry data
    const chemistry = await prisma.employeeChemistry.findMany({
      where: {
        OR: [
          { employee1Id: { in: employees.map(e => e.id) } },
          { employee2Id: { in: employees.map(e => e.id) } }
        ]
      }
    });

    const generatedSchedules = [];
    const conflicts = [];
    const employeeStats = new Map();

    // Initialize employee statistics
    employees.forEach(emp => {
      employeeStats.set(emp.id, {
        scheduledDays: 0,
        totalHours: 0,
        consecutiveDays: 0,
        lastScheduledDate: null,
        weeklyHours: new Map() // week -> hours
      });
    });

    // Calculate existing workload from previous schedules
    employees.forEach(emp => {
      const stats = employeeStats.get(emp.id);
      emp.schedules.forEach(schedule => {
        const scheduleDate = new Date(schedule.date);
        const shiftHours = (timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime)) / 60;
        
        // Calculate week key (year-week)
        const weekKey = `${scheduleDate.getFullYear()}-${Math.floor(scheduleDate.getTime() / (7 * 24 * 60 * 60 * 1000))}`;
        const currentWeekHours = stats.weeklyHours.get(weekKey) || 0;
        stats.weeklyHours.set(weekKey, currentWeekHours + shiftHours);
      });
    });

    // Generate schedules day by day
    const currentDate = new Date(start);
    let totalDaysProcessed = 0;
    let totalSchedulesCreated = 0;
    
    console.log('\n=== Starting day-by-day schedule generation ===');
    
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const dateStr = currentDate.toISOString().split('T')[0];
      const weekKey = `${currentDate.getFullYear()}-${Math.floor(currentDate.getTime() / (7 * 24 * 60 * 60 * 1000))}`;
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      console.log(`\n--- Processing ${dateStr} (${dayNames[dayOfWeek]}, dayOfWeek=${dayOfWeek}) ---`);
      totalDaysProcessed++;

      // Find applicable shift patterns for this day
      const applicablePatterns = shiftPatterns.filter(pattern => {
        const hasDay = pattern.daysOfWeek && pattern.daysOfWeek.includes(dayOfWeek);
        console.log(`Pattern "${pattern.name || 'unnamed'}" (days: ${pattern.daysOfWeek}) applies to ${dayNames[dayOfWeek]}: ${hasDay}`);
        return hasDay;
      });
      
      console.log(`Found ${applicablePatterns.length} applicable patterns for ${dayNames[dayOfWeek]}`);

      if (applicablePatterns.length === 0) {
        console.log(`No applicable patterns for ${dateStr}, skipping day`);
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      for (const pattern of applicablePatterns) {
        const shiftHours = (timeToMinutes(pattern.endTime) - timeToMinutes(pattern.startTime)) / 60;
        const staffRequired = pattern.staffRequired || 1;

        // Calculate employee scores for this shift
        console.log(`\n  Evaluating employees for pattern "${pattern.name || 'unnamed'}" (${pattern.startTime}-${pattern.endTime})`);
        
        const eligibleEmployees = employees.filter(emp => {
          const stats = employeeStats.get(emp.id);
          
          // Check if employee is on leave
          const isOnLeave = emp.leaves.some(leave => {
            const leaveStart = new Date(leave.startDate);
            const leaveEnd = new Date(leave.endDate);
            const onLeave = currentDate >= leaveStart && currentDate <= leaveEnd;
            if (onLeave) {
              console.log(`    ${emp.name} is on leave (${leave.type}: ${leave.startDate.toISOString().split('T')[0]} - ${leave.endDate.toISOString().split('T')[0]})`);
            }
            return onLeave;
          });
          
          if (isOnLeave) return false;

          // Check if already scheduled for this date
          const hasSchedule = emp.schedules.some(schedule => {
            const schedDate = new Date(schedule.date);
            const sameDate = schedDate.toDateString() === currentDate.toDateString();
            if (sameDate) {
              console.log(`    ${emp.name} already has a schedule on ${dateStr}`);
            }
            return sameDate;
          });
          
          if (hasSchedule) return false;
          
          // Check consecutive days constraint
          if (constraints.maxConsecutiveDays && stats.consecutiveDays >= constraints.maxConsecutiveDays) {
            console.log(`    ${emp.name} exceeds max consecutive days (${stats.consecutiveDays}/${constraints.maxConsecutiveDays})`);
            return false;
          }
          
          // Check weekly hours constraint
          const currentWeekHours = stats.weeklyHours.get(weekKey) || 0;
          if (constraints.maxWeeklyHours && (currentWeekHours + shiftHours) > constraints.maxWeeklyHours) {
            console.log(`    ${emp.name} would exceed weekly hours limit (${currentWeekHours + shiftHours}/${constraints.maxWeeklyHours})`);
            return false;
          }
          
          // Check rest hours (simplified - between last shift end and this shift start)
          if (constraints.minRestHours && stats.lastScheduledDate) {
            const timeSinceLastShift = (currentDate.getTime() - stats.lastScheduledDate.getTime()) / (1000 * 60 * 60);
            if (timeSinceLastShift < constraints.minRestHours) {
              console.log(`    ${emp.name} doesn't have enough rest hours (${timeSinceLastShift.toFixed(1)}/${constraints.minRestHours})`);
              return false;
            }
          }
          
          console.log(`    ${emp.name} is eligible for this shift`);
          return true;
        });
        
        console.log(`  Found ${eligibleEmployees.length} eligible employees out of ${employees.length} total`);

        // Score eligible employees
        console.log(`\n  Scoring ${eligibleEmployees.length} eligible employees:`);
        const scoredEmployees = eligibleEmployees.map(emp => {
          let score = 0;
          const ability = emp.abilities && emp.abilities.length > 0 ? emp.abilities[0] : null;
          const stats = employeeStats.get(emp.id);
          const scoreBreakdown = {};
          
          // Ability-based scoring
          if (ability) {
            const abilityScore = (
              (ability.workSkill || 1) * 3 +
              (ability.experience || 1) * 2 +
              (ability.customerService || 1) * 2 +
              (ability.flexibility || 1) * 1 +
              (ability.teamChemistry || 1) * 1
            ) / 9;
            const abilityPoints = abilityScore * priorities.abilityWeight * 10;
            score += abilityPoints;
            scoreBreakdown.ability = abilityPoints;
          } else {
            scoreBreakdown.ability = 0;
          }
          
          // Preference-based scoring
          let preferencePoints = 0;
          if (constraints.respectPreferences && emp.preferences && emp.preferences.length > 0) {
            const preference = emp.preferences[0];
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayName = dayNames[dayOfWeek];
            
            if (preference.preferDays && preference.preferDays.includes(dayName)) {
              preferencePoints += priorities.preferenceWeight * 10;
            }
            if (preference.avoidDays && preference.avoidDays.includes(dayName)) {
              preferencePoints -= priorities.preferenceWeight * 5;
            }
          }
          score += preferencePoints;
          scoreBreakdown.preference = preferencePoints;
          
          // Fair distribution (favor employees with fewer scheduled days)
          let fairnessPoints = 0;
          if (constraints.fairDistribution) {
            const avgScheduledDays = Array.from(employeeStats.values())
              .reduce((sum, s) => sum + s.scheduledDays, 0) / employeeStats.size;
            fairnessPoints = (avgScheduledDays - stats.scheduledDays) * 2;
            score += fairnessPoints;
          }
          scoreBreakdown.fairness = fairnessPoints;
          
          // Seniority bonus (based on hire date)
          let seniorityPoints = 0;
          if (emp.hireDate) {
            const yearsOfService = (new Date() - new Date(emp.hireDate)) / (365.25 * 24 * 60 * 60 * 1000);
            seniorityPoints = yearsOfService * priorities.seniorityWeight;
            score += seniorityPoints;
          }
          scoreBreakdown.seniority = seniorityPoints;
          
          // Availability bonus (favor less scheduled employees)
          const availabilityPoints = (50 - stats.totalHours) * priorities.availabilityWeight;
          score += availabilityPoints;
          scoreBreakdown.availability = availabilityPoints;
          
          const finalScore = Math.max(0, score);
          
          console.log(`    ${emp.name}: ${finalScore.toFixed(2)} (ability:${scoreBreakdown.ability.toFixed(1)}, pref:${scoreBreakdown.preference.toFixed(1)}, fair:${scoreBreakdown.fairness.toFixed(1)}, senior:${scoreBreakdown.seniority.toFixed(1)}, avail:${scoreBreakdown.availability.toFixed(1)})`);
          
          return {
            employee: emp,
            score: finalScore,
            stats,
            scoreBreakdown
          };
        });

        // Sort by score (highest first)
        scoredEmployees.sort((a, b) => b.score - a.score);

        // Select employees avoiding chemistry conflicts
        console.log(`\n  Selecting ${staffRequired} employees from ${scoredEmployees.length} candidates:`);
        
        const selectedEmployees = [];
        for (const candidate of scoredEmployees) {
          if (selectedEmployees.length >= staffRequired) break;
          
          const emp = candidate.employee;
          
          // Check chemistry conflicts with already selected employees
          let hasChemistryConflict = false;
          let conflictDetails = null;
          
          if (constraints.avoidPoorChemistry) {
            for (const selected of selectedEmployees) {
              const conflict = chemistry.find(chem => 
                ((chem.employee1Id === emp.id && chem.employee2Id === selected.employee.id) ||
                 (chem.employee1Id === selected.employee.id && chem.employee2Id === emp.id)) &&
                chem.score <= 2
              );
              
              if (conflict) {
                hasChemistryConflict = true;
                conflictDetails = { with: selected.employee.name, score: conflict.score };
                console.log(`    ${emp.name} has poor chemistry with ${selected.employee.name} (score: ${conflict.score})`);
                break;
              }
            }
          }
          
          if (!hasChemistryConflict) {
            selectedEmployees.push(candidate);
            console.log(`    ✓ Selected ${emp.name} (score: ${candidate.score.toFixed(2)})`);
          } else {
            console.log(`    ✗ Skipped ${emp.name} due to chemistry conflict`);
          }
        }
        
        console.log(`  Selected ${selectedEmployees.length}/${staffRequired} employees`);
        
        // If not enough staff and chemistry conflicts prevented selection, force add
        if (selectedEmployees.length < staffRequired) {
          console.log(`  Need ${staffRequired - selectedEmployees.length} more employees, forcing selection despite chemistry conflicts...`);
          const remaining = scoredEmployees.filter(candidate => 
            !selectedEmployees.some(selected => selected.employee.id === candidate.employee.id)
          );
          
          while (selectedEmployees.length < staffRequired && remaining.length > 0) {
            const forced = remaining.shift();
            selectedEmployees.push(forced);
            console.log(`    ✓ Force-selected ${forced.employee.name} (score: ${forced.score.toFixed(2)})`);
          }
        }
        
        if (selectedEmployees.length < staffRequired) {
          console.log(`  ⚠️  Still insufficient staff: ${selectedEmployees.length}/${staffRequired}`);
          conflicts.push({
            type: 'insufficient_staff',
            date: dateStr,
            pattern: pattern.name || 'unnamed',
            required: staffRequired,
            available: selectedEmployees.length,
            message: `${dateStr}에 "${pattern.name || 'unnamed'}" 패턴에 필요한 ${staffRequired}명 중 ${selectedEmployees.length}명만 배치 가능`
          });
        }

        // Create schedules
        console.log(`\n  Creating schedules for ${selectedEmployees.length} selected employees:`);
        for (const selected of selectedEmployees) {
          try {
            console.log(`    Creating schedule for ${selected.employee.name}...`);
            
            const schedule = await prisma.schedule.create({
              data: {
                employeeId: selected.employee.id,
                date: new Date(currentDate), // 새로운 Date 객체 생성
                startTime: pattern.startTime,
                endTime: pattern.endTime,
                shiftType: pattern.name || 'custom',
                notes: `Advanced auto-generated (Score: ${selected.score.toFixed(2)})`,
                status: 'scheduled',
                createdBy: req.user?.id || null
              },
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

            generatedSchedules.push(schedule);
            totalSchedulesCreated++;
            
            console.log(`    ✓ Created schedule ID ${schedule.id} for ${selected.employee.name}`);
            
            // Update employee statistics
            const stats = selected.stats;
            stats.scheduledDays++;
            stats.totalHours += shiftHours;
            stats.lastScheduledDate = new Date(currentDate);
            
            // Update consecutive days counter
            const yesterday = new Date(currentDate);
            yesterday.setDate(yesterday.getDate() - 1);
            const wasScheduledYesterday = selected.employee.schedules.some(s => 
              new Date(s.date).toDateString() === yesterday.toDateString()
            );
            
            if (wasScheduledYesterday) {
              stats.consecutiveDays++;
            } else {
              stats.consecutiveDays = 1;
            }
            
            // Update weekly hours
            const currentWeekHours = stats.weeklyHours.get(weekKey) || 0;
            stats.weeklyHours.set(weekKey, currentWeekHours + shiftHours);
            
          } catch (error) {
            console.log(`    ✗ Failed to create schedule for ${selected.employee.name}: ${error.message}`);
            conflicts.push({
              type: 'creation_error',
              date: dateStr,
              employeeId: selected.employee.id,
              employeeName: selected.employee.name,
              error: error.message,
              errorCode: error.code
            });
          }
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('\n=== Schedule Generation Completed ===');
    console.log(`Processed ${totalDaysProcessed} days`);
    console.log(`Created ${totalSchedulesCreated} schedules`);
    console.log(`Found ${conflicts.length} conflicts`);
    
    // Generate summary statistics
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const employeeSummary = Array.from(employeeStats.entries()).map(([empId, stats]) => {
      const employee = employees.find(e => e.id === empId);
      return {
        employeeId: empId,
        name: employee?.name,
        department: employee?.department,
        scheduledDays: stats.scheduledDays,
        totalHours: stats.totalHours,
        averageHoursPerWeek: stats.totalHours / (totalDays / 7),
        utilizationRate: stats.scheduledDays / totalDays
      };
    });
    
    console.log('\nEmployee Summary:');
    employeeSummary.forEach(emp => {
      console.log(`  ${emp.name}: ${emp.scheduledDays} days, ${emp.totalHours.toFixed(1)} hours, ${(emp.utilizationRate * 100).toFixed(1)}% utilization`);
    });
    
    if (conflicts.length > 0) {
      console.log('\nConflicts found:');
      conflicts.forEach((conflict, i) => {
        console.log(`  ${i + 1}. ${conflict.type} on ${conflict.date}: ${conflict.message || conflict.error}`);
      });
    }

    const avgUtilization = employeeSummary.length > 0 ? 
      employeeSummary.reduce((sum, emp) => sum + emp.utilizationRate, 0) / employeeSummary.length : 0;
    
    const successMessage = generatedSchedules.length > 0 ? 
      `일정 생성이 완료되었습니다. ${generatedSchedules.length}개의 스케줄이 생성되었습니다.` :
      '일정이 생성되지 않았습니다. 조건을 확인하고 다시 시도해주세요.';
    
    console.log(`\nFinal result: ${successMessage}`);
    
    res.status(201).json({
      message: successMessage,
      success: generatedSchedules.length > 0,
      summary: {
        totalDays,
        daysProcessed: totalDaysProcessed,
        schedulesCreated: generatedSchedules.length,
        conflictsFound: conflicts.length,
        patternsUsed: shiftPatterns.length,
        employeesInvolved: employees.length,
        averageUtilization: avgUtilization,
        utilizationPercentage: `${(avgUtilization * 100).toFixed(1)}%`
      },
      schedules: generatedSchedules,
      conflicts,
      employeeSummary,
      constraints,
      priorities,
      debugInfo: {
        inputEmployeeIds: employeeIds,
        foundEmployees: employees.map(e => ({ id: e.id, name: e.name, department: e.department })),
        shiftPatternsValidated: shiftPatterns.map(p => ({
          name: p.name,
          daysOfWeek: p.daysOfWeek,
          startTime: p.startTime,
          endTime: p.endTime,
          staffRequired: p.staffRequired
        }))
      }
    });
    
  } catch (error) {
    console.error('Generate advanced schedules error:', error);
    
    // Provide detailed error messages based on the error type
    let statusCode = 500;
    let errorMessage = 'Server error generating advanced schedules';
    let errorDetails = null;
    
    if (error.code === 'P2002') {
      statusCode = 409;
      errorMessage = '일정 생성 중 중복된 데이터가 발견되었습니다. 동일한 날짜에 이미 일정이 존재할 수 있습니다.';
      errorDetails = '같은 직원이 동일한 날짜에 이미 스케줄이 있는지 확인하세요.';
    } else if (error.code === 'P2003') {
      statusCode = 400;
      errorMessage = '참조 데이터를 찾을 수 없습니다. 선택한 직원이나 부서가 존재하지 않을 수 있습니다.';
      errorDetails = '직원 정보와 부서 정보가 올바른지 확인하세요.';
    } else if (error.code === 'P2025') {
      statusCode = 404;
      errorMessage = '요청한 데이터를 찾을 수 없습니다.';
      errorDetails = '선택한 직원이나 설정이 삭제되었을 수 있습니다.';
    } else if (error.message && error.message.includes('validation')) {
      statusCode = 400;
      errorMessage = '입력 데이터 검증에 실패했습니다.';
      errorDetails = error.message;
    } else if (error.message && error.message.includes('permission')) {
      statusCode = 403;
      errorMessage = '권한이 없습니다.';
      errorDetails = '이 작업을 수행할 권한이 없습니다.';
    } else if (error.message && error.message.includes('timeout')) {
      statusCode = 408;
      errorMessage = '요청 시간이 초과되었습니다.';
      errorDetails = '일정 생성 범위가 너무 크거나 직원이 너무 많습니다. 범위를 줄여서 다시 시도하세요.';
    } else if (error.name === 'PrismaClientKnownRequestError') {
      statusCode = 400;
      errorMessage = '데이터베이스 요청 오류가 발생했습니다.';
      errorDetails = `오류 코드: ${error.code}`;
    } else if (error.name === 'PrismaClientValidationError') {
      statusCode = 400;
      errorMessage = '데이터 형식이 올바르지 않습니다.';
      errorDetails = '날짜, 시간 형식이나 필수 필드를 확인하세요.';
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      details: errorDetails,
      errorCode: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

// @desc    Bulk update multiple schedules
// @route   PUT /api/schedules/bulk-update
// @access  Private
const bulkUpdate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      updates = [], // [{ scheduleId: 1, employeeId?: 2, startTime?: '10:00', endTime?: '18:00', status?: 'confirmed' }]
      validationLevel = 'standard', // 'none', 'basic', 'standard', 'strict'
      rollbackOnError = true
    } = req.body;

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No updates provided' });
    }

    if (updates.length > 100) {
      return res.status(400).json({ message: 'Maximum 100 updates per request' });
    }

    const results = {
      successful: [],
      failed: [],
      warnings: []
    };

    // Validate all updates first if rollbackOnError is true
    if (rollbackOnError && validationLevel !== 'none') {
      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        const scheduleId = parseInt(update.scheduleId);
        
        // Check if schedule exists
        const existingSchedule = await prisma.schedule.findUnique({
          where: { id: scheduleId },
          include: {
            employee: {
              select: { id: true, name: true, department: true }
            }
          }
        });
        
        if (!existingSchedule) {
          results.failed.push({
            scheduleId,
            updateIndex: i,
            error: 'Schedule not found'
          });
          continue;
        }
        
        // Validate employee change
        if (update.employeeId && parseInt(update.employeeId) !== existingSchedule.employeeId) {
          const newEmployee = await prisma.employee.findUnique({
            where: { id: parseInt(update.employeeId) }
          });
          
          if (!newEmployee) {
            results.failed.push({
              scheduleId,
              updateIndex: i,
              error: 'New employee not found'
            });
            continue;
          }
          
          // Check for conflicts with new employee
          if (validationLevel === 'standard' || validationLevel === 'strict') {
            const conflictSchedule = await prisma.schedule.findFirst({
              where: {
                employeeId: parseInt(update.employeeId),
                date: existingSchedule.date,
                id: { not: scheduleId }
              }
            });
            
            if (conflictSchedule) {
              results.failed.push({
                scheduleId,
                updateIndex: i,
                error: 'Employee already scheduled for this date',
                conflictingScheduleId: conflictSchedule.id
              });
              continue;
            }
          }
          
          // Check if new employee is on leave
          if (validationLevel === 'strict') {
            const onLeave = await prisma.leave.findFirst({
              where: {
                employeeId: parseInt(update.employeeId),
                status: 'approved',
                startDate: { lte: existingSchedule.date },
                endDate: { gte: existingSchedule.date }
              }
            });
            
            if (onLeave) {
              results.failed.push({
                scheduleId,
                updateIndex: i,
                error: 'New employee is on leave during this period',
                leaveDetails: {
                  type: onLeave.type,
                  startDate: onLeave.startDate,
                  endDate: onLeave.endDate
                }
              });
              continue;
            }
          }
        }
        
        // Time validation
        if ((update.startTime || update.endTime) && validationLevel !== 'basic') {
          const newStartTime = update.startTime || existingSchedule.startTime;
          const newEndTime = update.endTime || existingSchedule.endTime;
          
          const startMinutes = timeToMinutes(newStartTime);
          const endMinutes = timeToMinutes(newEndTime);
          
          if (startMinutes >= endMinutes && endMinutes !== 0) {
            results.warnings.push({
              scheduleId,
              updateIndex: i,
              warning: 'End time is not after start time (might be overnight shift)'
            });
          }
        }
      }
      
      // If there are validation failures and rollback is enabled, return without making changes
      if (results.failed.length > 0) {
        return res.status(400).json({
          message: 'Validation failed for some updates. No changes were made.',
          results,
          totalUpdates: updates.length,
          validationLevel,
          rollbackOnError
        });
      }
    }

    // Perform updates
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      const scheduleId = parseInt(update.scheduleId);
      
      try {
        // Build update data
        const updateData = {};
        
        if (update.employeeId) {
          updateData.employeeId = parseInt(update.employeeId);
        }
        if (update.date) {
          updateData.date = new Date(update.date);
        }
        if (update.startTime) {
          updateData.startTime = update.startTime;
        }
        if (update.endTime) {
          updateData.endTime = update.endTime;
        }
        if (update.shiftType) {
          updateData.shiftType = update.shiftType;
        }
        if (update.status) {
          updateData.status = update.status;
        }
        if (update.notes !== undefined) {
          updateData.notes = update.notes;
        }
        
        // Add metadata
        updateData.updatedBy = req.user?.id || null;
        updateData.updatedAt = new Date();
        
        // Perform individual validation if not done globally
        if (!rollbackOnError && validationLevel !== 'none') {
          const existingSchedule = await prisma.schedule.findUnique({
            where: { id: scheduleId }
          });
          
          if (!existingSchedule) {
            results.failed.push({
              scheduleId,
              updateIndex: i,
              error: 'Schedule not found'
            });
            continue;
          }
        }
        
        // Perform the update
        const updatedSchedule = await prisma.schedule.update({
          where: { id: scheduleId },
          data: updateData,
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
        
        results.successful.push({
          scheduleId,
          updateIndex: i,
          schedule: updatedSchedule,
          fieldsUpdated: Object.keys(updateData).filter(key => !['updatedBy', 'updatedAt'].includes(key))
        });
        
      } catch (error) {
        results.failed.push({
          scheduleId,
          updateIndex: i,
          error: error.message
        });
      }
    }
    
    const statusCode = results.failed.length === 0 ? 200 : 207; // 207 Multi-Status
    
    res.status(statusCode).json({
      message: `Bulk update completed. ${results.successful.length} successful, ${results.failed.length} failed.`,
      results,
      summary: {
        totalUpdates: updates.length,
        successful: results.successful.length,
        failed: results.failed.length,
        warnings: results.warnings.length
      },
      validationLevel,
      rollbackOnError
    });
    
  } catch (error) {
    console.error('Bulk update schedules error:', error);
    res.status(500).json({ message: 'Server error performing bulk update' });
  }
};

// @desc    Analyze schedule coverage and identify gaps
// @route   GET /api/schedules/coverage-analysis
// @access  Private
const coverageAnalysis = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      department,
      minStaffRequired = 1,
      businessHours = { start: '09:00', end: '18:00' },
      includeWeekends = false
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const requiredStaff = parseInt(minStaffRequired);
    
    // Get all schedules in the period
    let scheduleWhere = {
      date: { gte: start, lte: end }
    };
    
    if (department) {
      scheduleWhere.employee = { department };
    }
    
    const schedules = await prisma.schedule.findMany({
      where: scheduleWhere,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            department: true,
            position: true
          }
        }
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
    });
    
    // Get approved leaves in the period
    let leaveWhere = {
      status: 'approved',
      OR: [{
        startDate: { lte: end },
        endDate: { gte: start }
      }]
    };
    
    if (department) {
      leaveWhere.employee = { department };
    }
    
    const leaves = await prisma.leave.findMany({
      where: leaveWhere,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            department: true
          }
        }
      }
    });
    
    // Get total employee count
    const totalEmployees = await prisma.employee.count({
      where: department ? { department } : {}
    });
    
    // Analyze coverage day by day
    const coverageAnalysis = [];
    const overallStats = {
      totalDays: 0,
      daysWithGaps: 0,
      daysOverstaffed: 0,
      daysOptimal: 0,
      averageStaffPerDay: 0,
      peakStaffingDay: null,
      lowestStaffingDay: null
    };
    
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Skip weekends if not included
      if (isWeekend && !includeWeekends) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
      
      overallStats.totalDays++;
      
      // Get schedules for this day
      const daySchedules = schedules.filter(s => {
        const schedDate = s.date.toISOString().split('T')[0];
        return schedDate === dateStr;
      });
      
      // Get employees on leave for this day
      const employeesOnLeave = leaves.filter(leave => {
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);
        return currentDate >= leaveStart && currentDate <= leaveEnd;
      });
      
      // Calculate coverage throughout the day (in 30-minute intervals)
      const timeSlots = [];
      const businessStartMinutes = timeToMinutes(businessHours.start);
      const businessEndMinutes = timeToMinutes(businessHours.end);
      
      // Create 30-minute time slots for the business day
      for (let minutes = businessStartMinutes; minutes < businessEndMinutes; minutes += 30) {
        const timeStr = `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;
        
        // Count staff coverage at this time
        const staffCount = daySchedules.filter(schedule => {
          const schedStart = timeToMinutes(schedule.startTime);
          const schedEnd = timeToMinutes(schedule.endTime);
          
          // Handle overnight shifts
          if (schedEnd < schedStart) {
            return minutes >= schedStart || minutes < schedEnd;
          } else {
            return minutes >= schedStart && minutes < schedEnd;
          }
        }).length;
        
        const hasGap = staffCount < requiredStaff;
        const isOverstaffed = staffCount > (requiredStaff * 1.5);
        
        timeSlots.push({
          time: timeStr,
          staffCount,
          requiredStaff,
          hasGap,
          isOverstaffed,
          surplus: staffCount - requiredStaff
        });
      }
      
      // Calculate day-level statistics
      const totalStaff = daySchedules.length;
      const availableEmployees = totalEmployees - employeesOnLeave.length;
      const gapsCount = timeSlots.filter(slot => slot.hasGap).length;
      const overstaffedCount = timeSlots.filter(slot => slot.isOverstaffed).length;
      
      const dayAnalysis = {
        date: dateStr,
        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
        isWeekend,
        totalStaff,
        availableEmployees,
        employeesOnLeave: employeesOnLeave.length,
        requiredStaff,
        utilizationRate: availableEmployees > 0 ? totalStaff / availableEmployees : 0,
        coverageRate: requiredStaff > 0 ? Math.min(1, totalStaff / requiredStaff) : 1,
        timeSlots,
        gapsCount,
        overstaffedCount,
        schedules: daySchedules,
        employeesOnLeaveList: employeesOnLeave,
        status: totalStaff < requiredStaff ? 'understaffed' : 
                totalStaff > requiredStaff * 1.5 ? 'overstaffed' : 'optimal'
      };
      
      coverageAnalysis.push(dayAnalysis);
      
      // Update overall statistics
      if (gapsCount > 0) overallStats.daysWithGaps++;
      if (overstaffedCount > 0) overallStats.daysOverstaffed++;
      if (dayAnalysis.status === 'optimal') overallStats.daysOptimal++;
      
      overallStats.averageStaffPerDay += totalStaff;
      
      if (!overallStats.peakStaffingDay || totalStaff > overallStats.peakStaffingDay.totalStaff) {
        overallStats.peakStaffingDay = dayAnalysis;
      }
      
      if (!overallStats.lowestStaffingDay || totalStaff < overallStats.lowestStaffingDay.totalStaff) {
        overallStats.lowestStaffingDay = dayAnalysis;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    overallStats.averageStaffPerDay = overallStats.totalDays > 0 ? 
      overallStats.averageStaffPerDay / overallStats.totalDays : 0;
    
    // Identify critical gaps and recommendations
    const recommendations = [];
    
    // Check for recurring gaps
    const dayOfWeekGaps = [0, 1, 2, 3, 4, 5, 6].map(dow => {
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dow];
      const dayData = coverageAnalysis.filter(day => 
        new Date(day.date).getDay() === dow
      );
      const gapDays = dayData.filter(day => day.gapsCount > 0).length;
      
      return {
        dayOfWeek: dow,
        dayName,
        totalDays: dayData.length,
        gapDays,
        gapRate: dayData.length > 0 ? gapDays / dayData.length : 0
      };
    }).filter(day => day.gapRate > 0.3); // Days with gaps in more than 30% of occurrences
    
    if (dayOfWeekGaps.length > 0) {
      recommendations.push({
        type: 'recurring_gaps',
        priority: 'high',
        message: `Recurring coverage gaps detected on: ${dayOfWeekGaps.map(d => d.dayName).join(', ')}`,
        data: dayOfWeekGaps
      });
    }
    
    // Check for overall understaffing
    if (overallStats.daysWithGaps > overallStats.totalDays * 0.2) {
      recommendations.push({
        type: 'general_understaffing',
        priority: 'high',
        message: `${((overallStats.daysWithGaps / overallStats.totalDays) * 100).toFixed(1)}% of days have coverage gaps. Consider hiring more staff or adjusting requirements.`
      });
    }
    
    // Check for inefficient overstaffing
    if (overallStats.daysOverstaffed > overallStats.totalDays * 0.3) {
      recommendations.push({
        type: 'overstaffing',
        priority: 'medium',
        message: `${((overallStats.daysOverstaffed / overallStats.totalDays) * 100).toFixed(1)}% of days are overstaffed. Consider redistributing staff or reducing requirements.`
      });
    }
    
    // Check for leave-related gaps
    const highLeaveImpactDays = coverageAnalysis.filter(day => 
      day.employeesOnLeave >= totalEmployees * 0.25 // More than 25% on leave
    );
    
    if (highLeaveImpactDays.length > 0) {
      recommendations.push({
        type: 'leave_impact',
        priority: 'medium',
        message: `${highLeaveImpactDays.length} days with high leave impact (>25% of staff on leave). Consider leave approval policies.`,
        affectedDates: highLeaveImpactDays.map(d => d.date)
      });
    }
    
    res.json({
      message: 'Coverage analysis completed',
      period: { startDate, endDate, department },
      overallStats,
      dailyCoverage: coverageAnalysis,
      recommendations,
      parameters: {
        minStaffRequired: requiredStaff,
        businessHours,
        includeWeekends,
        totalEmployees
      }
    });
    
  } catch (error) {
    console.error('Coverage analysis error:', error);
    res.status(500).json({ message: 'Server error performing coverage analysis' });
  }
};

module.exports = {
  getAllSchedules,
  getScheduleById,
  getSchedulesByEmployee,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  checkPeriod,
  autoGenerateSchedules,
  quickUpdateSchedule,
  calculateRequirements,
  validatePatterns,
  generateAdvanced,
  bulkUpdate,
  coverageAnalysis
};