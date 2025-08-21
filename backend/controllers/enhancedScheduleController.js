const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// @desc    Enhanced auto-generate schedules with operating hours template integration
// @route   POST /api/schedules/auto-generate-enhanced
// @access  Private
const autoGenerateSchedulesEnhanced = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      startDate, 
      endDate, 
      templateId, // Operating hours template ID
      department, 
      employeeIds = [],
      overrideSettings = {}, // Override specific template settings
      optimizationLevel = 'standard', // 'basic', 'standard', 'advanced'
      constraints = {
        maxConsecutiveDays: 6,
        minRestHours: 10,
        maxWeeklyHours: 45,
        respectPreferences: true,
        avoidPoorChemistry: true,
        fairDistribution: true,
        enforceBreaks: true
      },
      priorities = {
        seniorityWeight: 0.2,
        abilityWeight: 0.4,
        preferenceWeight: 0.3,
        availabilityWeight: 0.1
      },
      generateMode = 'replace' // 'replace', 'append', 'fill_gaps'
    } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get company
    const company = await prisma.company.findFirst({
      where: { userId: req.user.id }
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Get operating hours template
    let template = null;
    if (templateId) {
      template = await prisma.operatingHoursTemplate.findUnique({
        where: { 
          id: parseInt(templateId),
          companyId: company.id,
          isActive: true
        },
        include: {
          dailyHours: {
            include: {
              timeSlots: {
                orderBy: { hourSlot: 'asc' }
              }
            },
            orderBy: { dayOfWeek: 'asc' }
          },
          staffingRules: {
            where: { isActive: true },
            orderBy: { priority: 'desc' }
          },
          scheduleOverrides: {
            where: { 
              isActive: true,
              overrideDate: {
                gte: start,
                lte: end
              }
            }
          }
        }
      });
    } else {
      // Get default template
      template = await prisma.operatingHoursTemplate.findFirst({
        where: { 
          companyId: company.id,
          isDefault: true,
          isActive: true
        },
        include: {
          dailyHours: {
            include: {
              timeSlots: {
                orderBy: { hourSlot: 'asc' }
              }
            },
            orderBy: { dayOfWeek: 'asc' }
          },
          staffingRules: {
            where: { isActive: true },
            orderBy: { priority: 'desc' }
          },
          scheduleOverrides: {
            where: { 
              isActive: true,
              overrideDate: {
                gte: start,
                lte: end
              }
            }
          }
        }
      });
    }

    if (!template) {
      return res.status(400).json({ 
        message: 'No operating hours template found. Please create a template first or use the basic auto-generate function.' 
      });
    }

    // Get available employees
    let employeeWhere = {
      user: {
        company: { id: company.id }
      },
      isActive: true
    };
    
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
        constraints: true,
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

    if (employees.length === 0) {
      return res.status(400).json({ message: 'No employees found matching the criteria' });
    }

    // Get chemistry data for conflict avoidance
    const chemistry = await prisma.employeeChemistry.findMany({
      where: {
        OR: [
          { employee1Id: { in: employees.map(e => e.id) } },
          { employee2Id: { in: employees.map(e => e.id) } }
        ]
      }
    });

    // Clear existing schedules if replace mode
    if (generateMode === 'replace') {
      await prisma.schedule.deleteMany({
        where: {
          date: { gte: start, lte: end },
          employee: {
            user: {
              company: { id: company.id }
            }
          },
          ...(department && {
            employee: {
              department: department,
              user: { company: { id: company.id } }
            }
          })
        }
      });
    }

    // Get existing schedules for other modes
    const existingSchedules = generateMode !== 'replace' ? 
      await prisma.schedule.findMany({
        where: {
          date: { gte: start, lte: end },
          employee: {
            user: {
              company: { id: company.id }
            }
          }
        }
      }) : [];

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
        weeklyHours: new Map(), // week -> hours
        restHoursSinceLastShift: 24,
        preferredHoursUsed: 0,
        shiftTypeDistribution: {}
      });
    });

    // Calculate existing workload from previous schedules
    employees.forEach(emp => {
      const stats = employeeStats.get(emp.id);
      emp.schedules.forEach(schedule => {
        const scheduleDate = new Date(schedule.date);
        const shiftHours = calculateShiftHours(schedule.startTime, schedule.endTime);
        
        // Calculate week key (year-week)
        const weekKey = `${scheduleDate.getFullYear()}-${Math.floor(scheduleDate.getTime() / (7 * 24 * 60 * 60 * 1000))}`;
        const currentWeekHours = stats.weeklyHours.get(weekKey) || 0;
        stats.weeklyHours.set(weekKey, currentWeekHours + shiftHours);
        
        // Update shift type distribution
        const shiftType = schedule.shiftType || 'regular';
        stats.shiftTypeDistribution[shiftType] = (stats.shiftTypeDistribution[shiftType] || 0) + 1;
      });
    });

    // Generate schedules day by day
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const dateStr = currentDate.toISOString().split('T')[0];
      const weekKey = `${currentDate.getFullYear()}-${Math.floor(currentDate.getTime() / (7 * 24 * 60 * 60 * 1000))}`;

      // Get effective operating hours for this day
      const effectiveHours = getEffectiveOperatingHours(template, currentDate, overrideSettings);
      
      if (!effectiveHours.isOpen) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Skip if fill_gaps mode and day already has sufficient coverage
      if (generateMode === 'fill_gaps') {
        const daySchedules = existingSchedules.filter(s => 
          new Date(s.date).toDateString() === currentDate.toDateString()
        );
        
        if (daySchedules.length >= (effectiveHours.minStaff || 1)) {
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }
      }

      // Generate shifts based on effective hours and time slots
      const shifts = generateOptimalShifts(effectiveHours, optimizationLevel);
      
      for (const shift of shifts) {
        const { startTime, endTime, requiredStaff, priority, skillRequirement } = shift;
        const shiftHours = calculateShiftHours(startTime, endTime);

        // Filter available employees for this shift
        const eligibleEmployees = employees.filter(emp => {
          return isEmployeeEligibleForShift(
            emp, 
            currentDate, 
            startTime, 
            endTime, 
            shiftHours,
            constraints,
            employeeStats.get(emp.id),
            weekKey,
            existingSchedules,
            skillRequirement
          );
        });

        if (eligibleEmployees.length === 0) {
          conflicts.push({
            type: 'no_eligible_employees',
            date: dateStr,
            shift: { startTime, endTime, requiredStaff },
            message: `No eligible employees found for ${startTime}-${endTime} shift`
          });
          continue;
        }

        // Score eligible employees using advanced algorithm
        const employeeScores = eligibleEmployees.map(emp => {
          const score = calculateEmployeeScore(
            emp,
            currentDate,
            shift,
            priorities,
            employeeStats.get(emp.id),
            constraints
          );
          
          return {
            employee: emp,
            score,
            stats: employeeStats.get(emp.id)
          };
        });

        // Sort by score (highest first)
        employeeScores.sort((a, b) => b.score - a.score);

        // Select employees avoiding chemistry conflicts
        const selectedEmployees = [];
        for (const candidate of employeeScores) {
          if (selectedEmployees.length >= requiredStaff) break;
          
          const emp = candidate.employee;
          
          // Check chemistry conflicts with already selected employees for this shift
          const hasChemistryConflict = constraints.avoidPoorChemistry && selectedEmployees.some(selected => {
            const conflict = chemistry.find(chem => 
              ((chem.employee1Id === emp.id && chem.employee2Id === selected.employee.id) ||
               (chem.employee1Id === selected.employee.id && chem.employee2Id === emp.id)) &&
              chem.score <= 2
            );
            return !!conflict;
          });
          
          if (!hasChemistryConflict) {
            selectedEmployees.push(candidate);
          }
        }
        
        // Force add employees if not enough staff and no alternatives
        if (selectedEmployees.length < requiredStaff) {
          const remaining = employeeScores.filter(candidate => 
            !selectedEmployees.some(selected => selected.employee.id === candidate.employee.id)
          );
          
          while (selectedEmployees.length < requiredStaff && remaining.length > 0) {
            const candidate = remaining.shift();
            selectedEmployees.push(candidate);
            
            // Log chemistry conflict as warning
            const hasConflict = selectedEmployees.some((selected, index) => {
              if (index === selectedEmployees.length - 1) return false; // Skip self
              const conflict = chemistry.find(chem => 
                ((chem.employee1Id === candidate.employee.id && chem.employee2Id === selected.employee.id) ||
                 (chem.employee1Id === selected.employee.id && chem.employee2Id === candidate.employee.id)) &&
                chem.score <= 2
              );
              return !!conflict;
            });
            
            if (hasConflict) {
              conflicts.push({
                type: 'chemistry_conflict_forced',
                date: dateStr,
                shift: { startTime, endTime },
                employeeId: candidate.employee.id,
                employeeName: candidate.employee.name,
                message: 'Employee assigned despite chemistry conflict due to staffing requirements'
              });
            }
          }
        }
        
        if (selectedEmployees.length < requiredStaff) {
          conflicts.push({
            type: 'insufficient_staff',
            date: dateStr,
            shift: { startTime, endTime, requiredStaff },
            available: selectedEmployees.length,
            message: `Could not meet staffing requirement of ${requiredStaff} for ${startTime}-${endTime} shift`
          });
        }

        // Create schedules for selected employees
        for (const selected of selectedEmployees) {
          try {
            // Skip if employee already has a schedule for this date in append/fill_gaps mode
            if (generateMode !== 'replace') {
              const hasExistingSchedule = existingSchedules.some(schedule => {
                const schedDate = new Date(schedule.date);
                return schedDate.toDateString() === currentDate.toDateString() && 
                       schedule.employeeId === selected.employee.id;
              });
              
              if (hasExistingSchedule) continue;
            }

            const schedule = await prisma.schedule.create({
              data: {
                employeeId: selected.employee.id,
                date: currentDate,
                startTime: startTime,
                endTime: endTime,
                shiftType: determineShiftType(startTime, endTime, priority),
                notes: `Enhanced auto-generated (Score: ${selected.score.toFixed(2)}, Template: ${template.templateName})`,
                status: 'scheduled',
                isAutoGenerated: true,
                priority: priority,
                createdBy: req.user?.id || null,
                breakTime: constraints.enforceBreaks && effectiveHours.breakStart && effectiveHours.breakEnd ? 
                  `${effectiveHours.breakStart}-${effectiveHours.breakEnd}` : null
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
            ) || generatedSchedules.some(s => 
              new Date(s.date).toDateString() === yesterday.toDateString() && 
              s.employeeId === selected.employee.id
            );
            
            if (wasScheduledYesterday) {
              stats.consecutiveDays++;
            } else {
              stats.consecutiveDays = 1;
            }
            
            // Update weekly hours
            const currentWeekHours = stats.weeklyHours.get(weekKey) || 0;
            stats.weeklyHours.set(weekKey, currentWeekHours + shiftHours);
            
            // Update shift type distribution
            const shiftType = schedule.shiftType;
            stats.shiftTypeDistribution[shiftType] = (stats.shiftTypeDistribution[shiftType] || 0) + 1;
            
          } catch (error) {
            conflicts.push({
              type: 'creation_error',
              date: dateStr,
              shift: { startTime, endTime },
              employeeId: selected.employee.id,
              employeeName: selected.employee.name,
              error: error.message
            });
          }
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Generate comprehensive summary and analytics
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const employeeSummary = Array.from(employeeStats.entries()).map(([empId, stats]) => {
      const employee = employees.find(e => e.id === empId);
      return {
        employeeId: empId,
        name: employee?.name,
        department: employee?.department,
        position: employee?.position,
        scheduledDays: stats.scheduledDays,
        totalHours: stats.totalHours,
        averageHoursPerWeek: stats.totalHours / (totalDays / 7),
        utilizationRate: stats.scheduledDays / totalDays,
        consecutiveDaysMax: stats.consecutiveDays,
        shiftTypeDistribution: stats.shiftTypeDistribution
      };
    });

    // Calculate template compliance
    const templateCompliance = calculateTemplateCompliance(generatedSchedules, template, start, end);

    // Generate recommendations for improvements
    const recommendations = generateImprovementRecommendations(
      generatedSchedules,
      conflicts,
      employeeSummary,
      template,
      constraints
    );

    // Create generation log for tracking
    const generationLog = await prisma.generationLog.create({
      data: {
        templateId: template.id,
        generatedBy: req.user?.id || 1,
        generationType: 'enhanced_auto_generate',
        periodStart: start,
        periodEnd: end,
        totalSchedulesCreated: generatedSchedules.length,
        totalEmployeesAffected: employeeSummary.filter(emp => emp.scheduledDays > 0).length,
        parameters: {
          templateId,
          department,
          employeeIds,
          overrideSettings,
          optimizationLevel,
          constraints,
          priorities,
          generateMode
        },
        coverageAchieved: templateCompliance.overallCoverageRate,
        employeeSatisfaction: calculateEmployeeSatisfaction(employeeSummary, constraints),
        constraintViolations: conflicts.filter(c => c.type.includes('constraint')),
        warnings: conflicts.filter(c => c.type.includes('warning')),
        errors: conflicts.filter(c => c.type.includes('error')),
        algorithmVersion: 'v2.0-enhanced',
        status: conflicts.filter(c => c.type.includes('error')).length > 0 ? 'completed_with_errors' : 'completed',
        notes: `Generated using template: ${template.templateName}. Optimization level: ${optimizationLevel}.`
      }
    });

    res.status(201).json({
      message: `Enhanced auto-generation completed. Created ${generatedSchedules.length} schedules using template "${template.templateName}".`,
      generationLogId: generationLog.id,
      template: {
        id: template.id,
        templateName: template.templateName,
        description: template.description
      },
      summary: {
        totalDays,
        schedulesCreated: generatedSchedules.length,
        employeesInvolved: employees.length,
        employeesScheduled: employeeSummary.filter(emp => emp.scheduledDays > 0).length,
        conflictsFound: conflicts.length,
        averageUtilization: employeeSummary.reduce((sum, emp) => sum + emp.utilizationRate, 0) / employeeSummary.length,
        period: { startDate, endDate },
        generateMode
      },
      templateCompliance,
      schedules: generatedSchedules,
      conflicts,
      employeeSummary,
      recommendations,
      optimizationLevel,
      constraints,
      priorities
    });
    
  } catch (error) {
    console.error('Enhanced auto generate schedules error:', error);
    res.status(500).json({ message: 'Server error generating enhanced schedules' });
  }
};

// Helper function to get effective operating hours for a specific date
function getEffectiveOperatingHours(template, date, overrideSettings = {}) {
  const dayOfWeek = date.getDay();
  
  // Check for schedule overrides first
  const dateStr = date.toISOString().split('T')[0];
  const override = template.scheduleOverrides?.find(o => 
    new Date(o.overrideDate).toISOString().split('T')[0] === dateStr
  );
  
  if (override) {
    if (override.overrideType === 'closed') {
      return { isOpen: false, reason: override.reason };
    }
    
    if (override.customHours) {
      return {
        isOpen: true,
        ...override.customHours,
        isOverride: true,
        reason: override.reason
      };
    }
  }
  
  // Get regular daily hours
  const dailyHours = template.dailyHours?.find(dh => dh.dayOfWeek === dayOfWeek);
  
  if (!dailyHours || !dailyHours.isOpen) {
    return { isOpen: false };
  }
  
  // Apply override settings
  const effectiveHours = {
    isOpen: true,
    openTime: overrideSettings.openTime || dailyHours.openTime,
    closeTime: overrideSettings.closeTime || dailyHours.closeTime,
    breakStart: overrideSettings.breakStart || dailyHours.breakStart,
    breakEnd: overrideSettings.breakEnd || dailyHours.breakEnd,
    minStaff: overrideSettings.minStaff || dailyHours.minStaff,
    maxStaff: overrideSettings.maxStaff || dailyHours.maxStaff,
    timeSlots: dailyHours.timeSlots || [],
    notes: dailyHours.notes
  };
  
  return effectiveHours;
}

// Helper function to generate optimal shifts based on effective hours
function generateOptimalShifts(effectiveHours, optimizationLevel) {
  const shifts = [];
  
  if (!effectiveHours.isOpen) {
    return shifts;
  }
  
  const openHour = parseInt(effectiveHours.openTime?.split(':')[0] || '9');
  const closeHour = parseInt(effectiveHours.closeTime?.split(':')[0] || '18');
  
  if (optimizationLevel === 'basic') {
    // Simple single shift
    shifts.push({
      startTime: effectiveHours.openTime,
      endTime: effectiveHours.closeTime,
      requiredStaff: effectiveHours.minStaff || 1,
      priority: 'normal',
      skillRequirement: null
    });
  } else if (optimizationLevel === 'standard') {
    // Use time slots if available, otherwise create reasonable shifts
    if (effectiveHours.timeSlots && effectiveHours.timeSlots.length > 0) {
      // Group consecutive time slots with same staffing
      let currentShift = null;
      
      for (const timeSlot of effectiveHours.timeSlots) {
        if (!currentShift || 
            currentShift.requiredStaff !== timeSlot.requiredStaff ||
            currentShift.priority !== timeSlot.priority ||
            timeSlot.hourSlot !== currentShift.endHour) {
          
          // Save previous shift
          if (currentShift) {
            shifts.push({
              startTime: `${currentShift.startHour.toString().padStart(2, '0')}:00`,
              endTime: `${currentShift.endHour.toString().padStart(2, '0')}:00`,
              requiredStaff: currentShift.requiredStaff,
              priority: currentShift.priority,
              skillRequirement: currentShift.skillRequirement
            });
          }
          
          // Start new shift
          currentShift = {
            startHour: timeSlot.hourSlot,
            endHour: timeSlot.hourSlot + 1,
            requiredStaff: timeSlot.requiredStaff,
            priority: timeSlot.priority,
            skillRequirement: timeSlot.skillRequirement
          };
        } else {
          // Extend current shift
          currentShift.endHour = timeSlot.hourSlot + 1;
        }
      }
      
      // Add final shift
      if (currentShift) {
        shifts.push({
          startTime: `${currentShift.startHour.toString().padStart(2, '0')}:00`,
          endTime: `${currentShift.endHour.toString().padStart(2, '0')}:00`,
          requiredStaff: currentShift.requiredStaff,
          priority: currentShift.priority,
          skillRequirement: currentShift.skillRequirement
        });
      }
    } else {
      // Create morning and afternoon shifts
      const midDay = Math.floor((openHour + closeHour) / 2);
      
      shifts.push({
        startTime: effectiveHours.openTime,
        endTime: `${midDay.toString().padStart(2, '0')}:00`,
        requiredStaff: Math.ceil((effectiveHours.minStaff || 1) * 0.6),
        priority: 'normal',
        skillRequirement: null
      });
      
      shifts.push({
        startTime: `${midDay.toString().padStart(2, '0')}:00`,
        endTime: effectiveHours.closeTime,
        requiredStaff: effectiveHours.minStaff || 1,
        priority: 'normal',
        skillRequirement: null
      });
    }
  } else { // advanced
    // Create overlapping shifts for maximum coverage optimization
    if (effectiveHours.timeSlots && effectiveHours.timeSlots.length > 0) {
      const sortedSlots = effectiveHours.timeSlots.sort((a, b) => a.hourSlot - b.hourSlot);
      let shiftId = 1;
      
      // Create shifts based on staffing requirements and priority
      for (let i = 0; i < sortedSlots.length; i++) {
        const slot = sortedSlots[i];
        const nextSlot = sortedSlots[i + 1];
        
        // Determine shift length based on priority and staffing needs
        let shiftLength = 4; // Default 4 hours
        if (slot.priority === 'critical') shiftLength = 6;
        else if (slot.priority === 'high') shiftLength = 5;
        else if (slot.priority === 'low') shiftLength = 3;
        
        const endHour = Math.min(slot.hourSlot + shiftLength, closeHour);
        
        shifts.push({
          startTime: `${slot.hourSlot.toString().padStart(2, '0')}:00`,
          endTime: `${endHour.toString().padStart(2, '0')}:00`,
          requiredStaff: slot.requiredStaff,
          priority: slot.priority,
          skillRequirement: slot.skillRequirement,
          shiftId: `shift_${shiftId++}`
        });
        
        // Skip overlapping slots
        while (i + 1 < sortedSlots.length && sortedSlots[i + 1].hourSlot < endHour) {
          i++;
        }
      }
    } else {
      // Create multiple overlapping shifts
      const totalHours = closeHour - openHour;
      const shiftLength = Math.max(4, Math.min(8, totalHours / 2));
      
      for (let hour = openHour; hour < closeHour; hour += Math.floor(shiftLength / 2)) {
        const endHour = Math.min(hour + shiftLength, closeHour);
        
        if (endHour - hour >= 3) { // Minimum 3-hour shift
          shifts.push({
            startTime: `${hour.toString().padStart(2, '0')}:00`,
            endTime: `${endHour.toString().padStart(2, '0')}:00`,
            requiredStaff: effectiveHours.minStaff || 1,
            priority: 'normal',
            skillRequirement: null
          });
        }
      }
    }
  }
  
  return shifts;
}

// Helper function to check if employee is eligible for a shift
function isEmployeeEligibleForShift(employee, date, startTime, endTime, shiftHours, constraints, stats, weekKey, existingSchedules, skillRequirement) {
  // Check if employee is on leave
  const isOnLeave = employee.leaves.some(leave => {
    const leaveStart = new Date(leave.startDate);
    const leaveEnd = new Date(leave.endDate);
    return date >= leaveStart && date <= leaveEnd;
  });
  
  if (isOnLeave) return false;
  
  // Check existing schedules for this date
  const hasExistingSchedule = existingSchedules.some(schedule => {
    const schedDate = new Date(schedule.date);
    return schedDate.toDateString() === date.toDateString() && 
           schedule.employeeId === employee.id;
  });
  
  if (hasExistingSchedule) return false;
  
  // Check consecutive days constraint
  if (constraints.maxConsecutiveDays && stats.consecutiveDays >= constraints.maxConsecutiveDays) {
    return false;
  }
  
  // Check weekly hours constraint
  const currentWeekHours = stats.weeklyHours.get(weekKey) || 0;
  if (constraints.maxWeeklyHours && (currentWeekHours + shiftHours) > constraints.maxWeeklyHours) {
    return false;
  }
  
  // Check minimum rest hours
  if (constraints.minRestHours && stats.lastScheduledDate) {
    const timeSinceLastShift = (date.getTime() - stats.lastScheduledDate.getTime()) / (1000 * 60 * 60);
    if (timeSinceLastShift < constraints.minRestHours) {
      return false;
    }
  }
  
  // Check employee constraints
  if (employee.constraints) {
    const empConstraints = employee.constraints;
    
    // Check max consecutive days
    if (empConstraints.maxConsecutiveDays && stats.consecutiveDays >= empConstraints.maxConsecutiveDays) {
      return false;
    }
    
    // Check unavailable time slots
    if (empConstraints.unavailableTimeSlots) {
      const startHour = parseInt(startTime.split(':')[0]);
      const endHour = parseInt(endTime.split(':')[0]);
      
      for (let hour = startHour; hour < endHour; hour++) {
        if (empConstraints.unavailableTimeSlots.includes(hour)) {
          return false;
        }
      }
    }
    
    // Check weekend work capability
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    if (isWeekend && empConstraints.canWorkWeekends === false) {
      return false;
    }
    
    // Check night shift capability (simplified: after 10 PM or before 6 AM)
    const startHour = parseInt(startTime.split(':')[0]);
    const isNightShift = startHour >= 22 || startHour < 6;
    if (isNightShift && empConstraints.canWorkNightShifts === false) {
      return false;
    }
  }
  
  // Check skill requirements
  if (skillRequirement && employee.abilities) {
    const ability = employee.abilities[0];
    if (ability) {
      // Simple skill check - can be expanded based on requirements
      const totalSkillScore = (ability.workSkill + ability.experience + ability.customerService) / 3;
      const requiredScore = skillRequirement.minSkillLevel || 3;
      
      if (totalSkillScore < requiredScore) {
        return false;
      }
    }
  }
  
  return true;
}

// Helper function to calculate employee score for shift assignment
function calculateEmployeeScore(employee, date, shift, priorities, stats, constraints) {
  let score = 0;
  const ability = employee.abilities?.[0];
  
  // Base ability score
  if (ability) {
    const abilityScore = (
      (ability.workSkill || 1) * 3 +
      (ability.experience || 1) * 2 +
      (ability.customerService || 1) * 2 +
      (ability.flexibility || 1) * 1 +
      (ability.teamChemistry || 1) * 1
    ) / 9;
    score += abilityScore * priorities.abilityWeight * 10;
  }
  
  // Preference-based scoring
  if (constraints.respectPreferences && employee.preferences?.[0]) {
    const preference = employee.preferences[0];
    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    if (preference.preferDays?.includes(dayName)) {
      score += priorities.preferenceWeight * 10;
    }
    if (preference.avoidDays?.includes(dayName)) {
      score -= priorities.preferenceWeight * 5;
    }
    
    // Check preferred time slots
    if (preference.preferredTimeSlots) {
      const shiftStartHour = parseInt(shift.startTime.split(':')[0]);
      const shiftEndHour = parseInt(shift.endTime.split(':')[0]);
      
      for (let hour = shiftStartHour; hour < shiftEndHour; hour++) {
        if (preference.preferredTimeSlots.includes(hour)) {
          score += priorities.preferenceWeight * 2;
        }
      }
    }
  }
  
  // Fair distribution (favor employees with fewer scheduled days)
  if (constraints.fairDistribution) {
    const avgScheduledDays = 5; // Approximate average
    const fairnessBonus = (avgScheduledDays - stats.scheduledDays) * 2;
    score += Math.max(-5, Math.min(10, fairnessBonus));
  }
  
  // Seniority bonus
  const yearsOfService = (new Date() - new Date(employee.hireDate)) / (365.25 * 24 * 60 * 60 * 1000);
  score += Math.min(yearsOfService * priorities.seniorityWeight, 5);
  
  // Availability bonus (prefer less utilized employees)
  const utilizationRate = stats.totalHours / 160; // Assuming 160 hours per month target
  const availabilityBonus = (1 - Math.min(utilizationRate, 1)) * priorities.availabilityWeight * 10;
  score += availabilityBonus;
  
  // Priority-based bonus for critical shifts
  if (shift.priority === 'critical') {
    score += 5;
  } else if (shift.priority === 'high') {
    score += 3;
  }
  
  // Skill match bonus
  if (shift.skillRequirement && ability) {
    const skillMatch = calculateSkillMatch(ability, shift.skillRequirement);
    score += skillMatch * 3;
  }
  
  // Penalize if approaching constraints
  if (constraints.maxWeeklyHours) {
    const weekKey = `${date.getFullYear()}-${Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000))}`;
    const currentWeekHours = stats.weeklyHours.get(weekKey) || 0;
    const utilizationPenalty = (currentWeekHours / constraints.maxWeeklyHours) * 3;
    score -= utilizationPenalty;
  }
  
  if (constraints.maxConsecutiveDays) {
    const consecutivePenalty = (stats.consecutiveDays / constraints.maxConsecutiveDays) * 2;
    score -= consecutivePenalty;
  }
  
  return Math.max(0, score);
}

// Helper function to calculate shift hours
function calculateShiftHours(startTime, endTime) {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;
  
  // Handle overnight shifts
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return (endMinutes - startMinutes) / 60;
}

// Helper function to determine shift type based on time and priority
function determineShiftType(startTime, endTime, priority) {
  const startHour = parseInt(startTime.split(':')[0]);
  const endHour = parseInt(endTime.split(':')[0]);
  
  if (startHour >= 22 || endHour <= 6) return 'night';
  if (startHour <= 7) return 'early';
  if (endHour >= 20) return 'late';
  if (priority === 'critical') return 'peak';
  
  return 'regular';
}

// Helper function to calculate skill match
function calculateSkillMatch(ability, skillRequirement) {
  if (!skillRequirement || !ability) return 0;
  
  let matchScore = 0;
  
  if (skillRequirement.workSkill && ability.workSkill >= skillRequirement.workSkill) {
    matchScore += 0.4;
  }
  
  if (skillRequirement.experience && ability.experience >= skillRequirement.experience) {
    matchScore += 0.3;
  }
  
  if (skillRequirement.customerService && ability.customerService >= skillRequirement.customerService) {
    matchScore += 0.3;
  }
  
  return matchScore;
}

// Helper function to calculate template compliance
function calculateTemplateCompliance(schedules, template, startDate, endDate) {
  const compliance = {
    overallCoverageRate: 0,
    dailyCompliance: [],
    issuesFound: []
  };
  
  const currentDate = new Date(startDate);
  let totalCoverage = 0;
  let totalDays = 0;
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const dateStr = currentDate.toISOString().split('T')[0];
    
    const dayTemplate = template.dailyHours?.find(dh => dh.dayOfWeek === dayOfWeek);
    if (!dayTemplate || !dayTemplate.isOpen) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }
    
    const daySchedules = schedules.filter(s => 
      s.date.toISOString().split('T')[0] === dateStr
    );
    
    const requiredStaff = dayTemplate.minStaff || 1;
    const actualStaff = daySchedules.length;
    const coverageRate = actualStaff >= requiredStaff ? 1 : actualStaff / requiredStaff;
    
    totalCoverage += coverageRate;
    totalDays++;
    
    compliance.dailyCompliance.push({
      date: dateStr,
      dayOfWeek,
      required: requiredStaff,
      actual: actualStaff,
      coverageRate,
      status: actualStaff >= requiredStaff ? 'compliant' : 'understaffed'
    });
    
    if (actualStaff < requiredStaff) {
      compliance.issuesFound.push({
        date: dateStr,
        type: 'understaffed',
        required: requiredStaff,
        actual: actualStaff,
        shortfall: requiredStaff - actualStaff
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  compliance.overallCoverageRate = totalDays > 0 ? totalCoverage / totalDays : 0;
  
  return compliance;
}

// Helper function to calculate employee satisfaction
function calculateEmployeeSatisfaction(employeeSummary, constraints) {
  if (employeeSummary.length === 0) return 0;
  
  let totalSatisfaction = 0;
  
  employeeSummary.forEach(emp => {
    let satisfaction = 0.8; // Base satisfaction
    
    // Fair distribution bonus
    if (emp.utilizationRate > 0.3 && emp.utilizationRate < 0.8) {
      satisfaction += 0.1;
    } else if (emp.utilizationRate > 0.8) {
      satisfaction -= 0.2; // Overworked penalty
    }
    
    // Consecutive days penalty
    if (emp.consecutiveDaysMax > constraints.maxConsecutiveDays * 0.8) {
      satisfaction -= 0.1;
    }
    
    totalSatisfaction += Math.max(0, Math.min(1, satisfaction));
  });
  
  return totalSatisfaction / employeeSummary.length;
}

// Helper function to generate improvement recommendations
function generateImprovementRecommendations(schedules, conflicts, employeeSummary, template, constraints) {
  const recommendations = [];
  
  // Check for chronic understaffing
  const understaffedConflicts = conflicts.filter(c => c.type === 'insufficient_staff');
  if (understaffedConflicts.length > 0) {
    recommendations.push({
      type: 'staffing',
      priority: 'high',
      title: '인력 부족 문제 해결',
      message: `${understaffedConflicts.length}건의 인력 부족이 발생했습니다. 추가 채용이나 근무시간 조정을 고려하세요.`,
      impact: 'high',
      effort: 'high'
    });
  }
  
  // Check for overworked employees
  const overworkedEmployees = employeeSummary.filter(emp => emp.utilizationRate > 0.8);
  if (overworkedEmployees.length > 0) {
    recommendations.push({
      type: 'workload_balance',
      priority: 'medium',
      title: '업무량 균형 조정',
      message: `${overworkedEmployees.length}명의 직원이 과도한 업무량을 가지고 있습니다. 업무 재분배를 고려하세요.`,
      affectedEmployees: overworkedEmployees.map(emp => emp.name),
      impact: 'medium',
      effort: 'medium'
    });
  }
  
  // Check for template optimization opportunities
  const lowUtilization = employeeSummary.filter(emp => emp.utilizationRate < 0.3);
  if (lowUtilization.length > employeeSummary.length * 0.3) {
    recommendations.push({
      type: 'template_optimization',
      priority: 'medium',
      title: '템플릿 최적화',
      message: '많은 직원들의 활용도가 낮습니다. 영업시간 템플릿의 인력 요구사항을 재검토하세요.',
      impact: 'medium',
      effort: 'low'
    });
  }
  
  return recommendations;
}

module.exports = {
  autoGenerateSchedulesEnhanced
};