/**
 * Helper functions for advanced scheduling operations
 */

// Calculate various scheduling metrics
const calculateSchedulingMetrics = (schedules, employees, period) => {
  const metrics = {
    totalSchedules: schedules.length,
    totalEmployees: employees.length,
    employeesScheduled: 0,
    totalHours: 0,
    averageHoursPerEmployee: 0,
    utilizationRate: 0,
    coverageDistribution: {},
    shiftTypeDistribution: {},
    departmentDistribution: {},
    timeSlotCoverage: Array.from({length: 24}, () => 0),
    weeklyDistribution: [0, 0, 0, 0, 0, 0, 0] // Sunday to Saturday
  };

  const employeeStats = new Map();
  
  // Initialize employee stats
  employees.forEach(emp => {
    employeeStats.set(emp.id, {
      scheduledDays: 0,
      totalHours: 0,
      shiftTypes: {},
      weeklyHours: new Map()
    });
  });

  // Process schedules
  schedules.forEach(schedule => {
    const employeeId = schedule.employeeId;
    const employeeStat = employeeStats.get(employeeId);
    
    if (employeeStat) {
      employeeStat.scheduledDays++;
      
      const shiftHours = calculateShiftHours(schedule.startTime, schedule.endTime);
      employeeStat.totalHours += shiftHours;
      metrics.totalHours += shiftHours;
      
      // Track shift types
      const shiftType = schedule.shiftType || 'regular';
      employeeStat.shiftTypes[shiftType] = (employeeStat.shiftTypes[shiftType] || 0) + 1;
      metrics.shiftTypeDistribution[shiftType] = (metrics.shiftTypeDistribution[shiftType] || 0) + 1;
      
      // Track time slot coverage
      const startHour = parseInt(schedule.startTime.split(':')[0]);
      const endHour = parseInt(schedule.endTime.split(':')[0]);
      
      for (let hour = startHour; hour < (endHour > startHour ? endHour : endHour + 24); hour++) {
        metrics.timeSlotCoverage[hour % 24]++;
      }
      
      // Track weekly distribution
      const dayOfWeek = new Date(schedule.date).getDay();
      metrics.weeklyDistribution[dayOfWeek]++;
      
      // Track department distribution
      if (schedule.employee) {
        const dept = schedule.employee.department || 'Unknown';
        metrics.departmentDistribution[dept] = (metrics.departmentDistribution[dept] || 0) + 1;
      }
    }
  });

  // Calculate derived metrics
  metrics.employeesScheduled = Array.from(employeeStats.values())
    .filter(stat => stat.scheduledDays > 0).length;
  
  metrics.averageHoursPerEmployee = metrics.employeesScheduled > 0 ? 
    metrics.totalHours / metrics.employeesScheduled : 0;
  
  // Calculate utilization rate (assuming 40 hours per week target)
  const periodDays = Math.ceil((new Date(period.endDate) - new Date(period.startDate)) / (1000 * 60 * 60 * 24));
  const expectedWeeklyHours = 40;
  const totalPossibleHours = metrics.totalEmployees * (expectedWeeklyHours * (periodDays / 7));
  metrics.utilizationRate = totalPossibleHours > 0 ? metrics.totalHours / totalPossibleHours : 0;

  // Coverage distribution by number of employees per shift
  const coverageByShift = {};
  const shiftGroups = schedules.reduce((groups, schedule) => {
    const key = `${schedule.date.toISOString().split('T')[0]}_${schedule.startTime}_${schedule.endTime}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(schedule);
    return groups;
  }, {});

  Object.values(shiftGroups).forEach(group => {
    const staffCount = group.length;
    metrics.coverageDistribution[staffCount] = (metrics.coverageDistribution[staffCount] || 0) + 1;
  });

  return {
    metrics,
    employeeStats: Array.from(employeeStats.entries()).map(([empId, stats]) => ({
      employeeId: empId,
      ...stats,
      averageHoursPerWeek: stats.totalHours / (periodDays / 7),
      utilizationRate: stats.totalHours / (expectedWeeklyHours * (periodDays / 7))
    }))
  };
};

// Calculate shift hours with overnight support
const calculateShiftHours = (startTime, endTime) => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;
  
  // Handle overnight shifts
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return (endMinutes - startMinutes) / 60;
};

// Detect scheduling conflicts
const detectSchedulingConflicts = (schedules, employees, constraints = {}) => {
  const conflicts = [];
  const employeeSchedules = new Map();
  
  // Group schedules by employee
  schedules.forEach(schedule => {
    const empId = schedule.employeeId;
    if (!employeeSchedules.has(empId)) {
      employeeSchedules.set(empId, []);
    }
    employeeSchedules.get(empId).push(schedule);
  });
  
  // Check each employee's schedules
  employeeSchedules.forEach((empSchedules, empId) => {
    const employee = employees.find(e => e.id === empId);
    if (!employee) return;
    
    // Sort schedules by date
    empSchedules.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Check for various conflicts
    for (let i = 0; i < empSchedules.length; i++) {
      const current = empSchedules[i];
      const next = empSchedules[i + 1];
      
      // Same day conflicts
      const sameDay = empSchedules.filter(s => 
        s !== current && 
        new Date(s.date).toDateString() === new Date(current.date).toDateString()
      );
      
      if (sameDay.length > 0) {
        sameDay.forEach(conflicting => {
          if (isTimeOverlap(current.startTime, current.endTime, conflicting.startTime, conflicting.endTime)) {
            conflicts.push({
              type: 'time_overlap',
              severity: 'high',
              employee: {
                id: empId,
                name: employee.name
              },
              schedules: [current, conflicting],
              message: `Time overlap on ${new Date(current.date).toDateString()}`
            });
          }
        });
      }
      
      // Rest period violations
      if (next && constraints.minRestHours) {
        const currentEnd = new Date(`${current.date.toISOString().split('T')[0]}T${current.endTime}:00`);
        const nextStart = new Date(`${next.date.toISOString().split('T')[0]}T${next.startTime}:00`);
        
        // Handle overnight shifts
        if (parseInt(current.endTime.split(':')[0]) < parseInt(current.startTime.split(':')[0])) {
          currentEnd.setDate(currentEnd.getDate() + 1);
        }
        
        const restHours = (nextStart - currentEnd) / (1000 * 60 * 60);
        
        if (restHours < constraints.minRestHours) {
          conflicts.push({
            type: 'insufficient_rest',
            severity: 'medium',
            employee: {
              id: empId,
              name: employee.name
            },
            schedules: [current, next],
            actualRest: restHours,
            requiredRest: constraints.minRestHours,
            message: `Only ${restHours.toFixed(1)} hours rest between shifts (minimum: ${constraints.minRestHours})`
          });
        }
      }
    }
    
    // Check weekly hour limits
    if (constraints.maxWeeklyHours) {
      const weeklyHours = calculateWeeklyHours(empSchedules);
      
      Object.entries(weeklyHours).forEach(([week, hours]) => {
        if (hours > constraints.maxWeeklyHours) {
          const weekSchedules = empSchedules.filter(s => {
            const date = new Date(s.date);
            const weekKey = getWeekKey(date);
            return weekKey === week;
          });
          
          conflicts.push({
            type: 'weekly_hours_exceeded',
            severity: 'high',
            employee: {
              id: empId,
              name: employee.name
            },
            week,
            actualHours: hours,
            maxHours: constraints.maxWeeklyHours,
            schedules: weekSchedules,
            message: `Weekly hours (${hours.toFixed(1)}) exceed limit (${constraints.maxWeeklyHours})`
          });
        }
      });
    }
    
    // Check consecutive days
    if (constraints.maxConsecutiveDays) {
      let consecutiveDays = 1;
      let consecutiveStart = 0;
      
      for (let i = 1; i < empSchedules.length; i++) {
        const prevDate = new Date(empSchedules[i - 1].date);
        const currDate = new Date(empSchedules[i].date);
        const dayDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
        
        if (dayDiff === 1) {
          consecutiveDays++;
          
          if (consecutiveDays > constraints.maxConsecutiveDays) {
            conflicts.push({
              type: 'consecutive_days_exceeded',
              severity: 'medium',
              employee: {
                id: empId,
                name: employee.name
              },
              consecutiveDays,
              maxConsecutiveDays: constraints.maxConsecutiveDays,
              schedules: empSchedules.slice(consecutiveStart, i + 1),
              message: `${consecutiveDays} consecutive days exceed limit (${constraints.maxConsecutiveDays})`
            });
          }
        } else {
          consecutiveDays = 1;
          consecutiveStart = i;
        }
      }
    }
  });
  
  return conflicts;
};

// Check if two time ranges overlap
const isTimeOverlap = (start1, end1, start2, end2) => {
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const s1 = timeToMinutes(start1);
  let e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  let e2 = timeToMinutes(end2);

  // Handle overnight shifts
  if (e1 <= s1) e1 += 1440; // Add 24 hours
  if (e2 <= s2) e2 += 1440; // Add 24 hours

  return (s1 < e2 && e1 > s2);
};

// Calculate weekly hours for an employee
const calculateWeeklyHours = (empSchedules) => {
  const weeklyHours = {};
  
  empSchedules.forEach(schedule => {
    const week = getWeekKey(new Date(schedule.date));
    const hours = calculateShiftHours(schedule.startTime, schedule.endTime);
    
    weeklyHours[week] = (weeklyHours[week] || 0) + hours;
  });
  
  return weeklyHours;
};

// Get week key for grouping (year-week format)
const getWeekKey = (date) => {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const dayOfYear = Math.floor((date - startOfYear) / (1000 * 60 * 60 * 24));
  const weekNum = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
  
  return `${year}-W${weekNum.toString().padStart(2, '0')}`;
};

// Optimize schedule distribution
const optimizeScheduleDistribution = (schedules, template, optimizationGoals = {}) => {
  const defaultGoals = {
    balanceWorkload: 0.3,
    minimizeGaps: 0.3,
    maximizeCoverage: 0.4
  };
  
  const goals = { ...defaultGoals, ...optimizationGoals };
  const optimizations = [];
  
  // Group schedules by date
  const schedulesByDate = schedules.reduce((groups, schedule) => {
    const dateKey = schedule.date.toISOString().split('T')[0];
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(schedule);
    return groups;
  }, {});
  
  // Analyze each day
  Object.entries(schedulesByDate).forEach(([dateStr, daySchedules]) => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    
    // Get template requirements for this day
    const dayTemplate = template?.dailyHours?.find(dh => dh.dayOfWeek === dayOfWeek);
    
    if (!dayTemplate || !dayTemplate.isOpen) return;
    
    // Analyze coverage gaps
    const coverage = analyzeCoverageGaps(daySchedules, dayTemplate);
    
    if (coverage.gaps.length > 0) {
      optimizations.push({
        type: 'coverage_gap',
        date: dateStr,
        priority: goals.maximizeCoverage * coverage.gapSeverity,
        gaps: coverage.gaps,
        suggestion: 'Add shifts to cover gaps in operating hours',
        impact: 'high'
      });
    }
    
    // Check for overstaffing
    if (coverage.overstaffed.length > 0) {
      optimizations.push({
        type: 'overstaffing',
        date: dateStr,
        priority: goals.balanceWorkload * 0.7,
        overstaffed: coverage.overstaffed,
        suggestion: 'Reduce staff during overstaffed periods',
        impact: 'medium'
      });
    }
  });
  
  // Analyze workload distribution across employees
  const workloadDistribution = analyzeWorkloadDistribution(schedules);
  
  if (workloadDistribution.imbalance > 0.3) {
    optimizations.push({
      type: 'workload_imbalance',
      priority: goals.balanceWorkload,
      imbalance: workloadDistribution.imbalance,
      overworked: workloadDistribution.overworked,
      underutilized: workloadDistribution.underutilized,
      suggestion: 'Redistribute schedules to balance workload',
      impact: 'high'
    });
  }
  
  // Sort optimizations by priority
  optimizations.sort((a, b) => b.priority - a.priority);
  
  return optimizations;
};

// Analyze coverage gaps for a day
const analyzeCoverageGaps = (daySchedules, dayTemplate) => {
  const openHour = parseInt(dayTemplate.openTime?.split(':')[0] || '9');
  const closeHour = parseInt(dayTemplate.closeTime?.split(':')[0] || '18');
  
  const hourlyStaff = Array.from({length: 24}, () => 0);
  
  // Count staff for each hour
  daySchedules.forEach(schedule => {
    const startHour = parseInt(schedule.startTime.split(':')[0]);
    const endHour = parseInt(schedule.endTime.split(':')[0]);
    
    for (let hour = startHour; hour < (endHour > startHour ? endHour : endHour + 24); hour++) {
      hourlyStaff[hour % 24]++;
    }
  });
  
  const gaps = [];
  const overstaffed = [];
  let totalGapHours = 0;
  
  for (let hour = openHour; hour < closeHour; hour++) {
    const timeSlot = dayTemplate.timeSlots?.find(ts => ts.hourSlot === hour);
    const requiredStaff = timeSlot?.requiredStaff || dayTemplate.minStaff || 1;
    const actualStaff = hourlyStaff[hour];
    
    if (actualStaff < requiredStaff) {
      gaps.push({
        hour,
        required: requiredStaff,
        actual: actualStaff,
        shortfall: requiredStaff - actualStaff
      });
      totalGapHours += requiredStaff - actualStaff;
    } else if (actualStaff > requiredStaff * 1.5) {
      overstaffed.push({
        hour,
        required: requiredStaff,
        actual: actualStaff,
        excess: actualStaff - requiredStaff
      });
    }
  }
  
  const operatingHours = closeHour - openHour;
  const gapSeverity = operatingHours > 0 ? totalGapHours / operatingHours : 0;
  
  return {
    gaps,
    overstaffed,
    gapSeverity,
    coverageRate: operatingHours > 0 ? 1 - (totalGapHours / operatingHours) : 1
  };
};

// Analyze workload distribution across employees
const analyzeWorkloadDistribution = (schedules) => {
  const employeeHours = {};
  
  schedules.forEach(schedule => {
    const empId = schedule.employeeId;
    const hours = calculateShiftHours(schedule.startTime, schedule.endTime);
    
    employeeHours[empId] = (employeeHours[empId] || 0) + hours;
  });
  
  const hourValues = Object.values(employeeHours);
  if (hourValues.length === 0) {
    return { imbalance: 0, overworked: [], underutilized: [] };
  }
  
  const avgHours = hourValues.reduce((sum, hours) => sum + hours, 0) / hourValues.length;
  const maxHours = Math.max(...hourValues);
  const minHours = Math.min(...hourValues);
  
  const imbalance = avgHours > 0 ? (maxHours - minHours) / avgHours : 0;
  
  const overworked = Object.entries(employeeHours)
    .filter(([empId, hours]) => hours > avgHours * 1.2)
    .map(([empId, hours]) => ({ employeeId: parseInt(empId), hours }));
  
  const underutilized = Object.entries(employeeHours)
    .filter(([empId, hours]) => hours < avgHours * 0.8)
    .map(([empId, hours]) => ({ employeeId: parseInt(empId), hours }));
  
  return {
    imbalance,
    avgHours,
    maxHours,
    minHours,
    overworked,
    underutilized
  };
};

// Generate schedule recommendations
const generateScheduleRecommendations = (schedules, conflicts, template, constraints) => {
  const recommendations = [];
  
  // Analyze conflicts
  const conflictTypes = conflicts.reduce((counts, conflict) => {
    counts[conflict.type] = (counts[conflict.type] || 0) + 1;
    return counts;
  }, {});
  
  // High-severity conflicts
  if (conflictTypes.time_overlap > 0) {
    recommendations.push({
      type: 'resolve_conflicts',
      priority: 'high',
      title: '시간 중복 스케줄 해결',
      message: `${conflictTypes.time_overlap}건의 시간 중복이 발생했습니다. 스케줄을 재조정하세요.`,
      action: 'reschedule_overlapping',
      impact: 'critical'
    });
  }
  
  if (conflictTypes.weekly_hours_exceeded > 0) {
    recommendations.push({
      type: 'reduce_hours',
      priority: 'high',
      title: '주간 근무시간 초과 해결',
      message: `${conflictTypes.weekly_hours_exceeded}명이 주간 최대 근무시간을 초과했습니다.`,
      action: 'redistribute_hours',
      impact: 'high'
    });
  }
  
  // Medium-severity conflicts
  if (conflictTypes.insufficient_rest > 0) {
    recommendations.push({
      type: 'improve_rest',
      priority: 'medium',
      title: '휴식시간 부족 개선',
      message: `${conflictTypes.insufficient_rest}건의 휴식시간 부족이 발생했습니다.`,
      action: 'adjust_shift_timing',
      impact: 'medium'
    });
  }
  
  // Schedule optimization recommendations
  const metrics = calculateSchedulingMetrics(schedules, [], { startDate: new Date(), endDate: new Date() });
  
  if (metrics.metrics.utilizationRate < 0.7) {
    recommendations.push({
      type: 'increase_utilization',
      priority: 'medium',
      title: '직원 활용도 개선',
      message: `직원 활용도가 ${(metrics.metrics.utilizationRate * 100).toFixed(1)}%입니다. 근무시간을 늘리거나 인력을 재배치하세요.`,
      currentRate: metrics.metrics.utilizationRate,
      targetRate: 0.8,
      impact: 'medium'
    });
  }
  
  if (metrics.metrics.utilizationRate > 0.9) {
    recommendations.push({
      type: 'prevent_burnout',
      priority: 'high',
      title: '과로 방지',
      message: `직원 활용도가 ${(metrics.metrics.utilizationRate * 100).toFixed(1)}%로 매우 높습니다. 추가 인력 채용을 고려하세요.`,
      currentRate: metrics.metrics.utilizationRate,
      targetRate: 0.85,
      impact: 'high'
    });
  }
  
  // Template-based recommendations
  if (template) {
    const templateAnalysis = analyzeTemplateUsage(schedules, template);
    
    if (templateAnalysis.complianceRate < 0.8) {
      recommendations.push({
        type: 'improve_template_compliance',
        priority: 'medium',
        title: '템플릿 준수율 개선',
        message: `영업시간 템플릿 준수율이 ${(templateAnalysis.complianceRate * 100).toFixed(1)}%입니다. 템플릿을 조정하거나 스케줄을 수정하세요.`,
        complianceRate: templateAnalysis.complianceRate,
        issues: templateAnalysis.issues,
        impact: 'medium'
      });
    }
  }
  
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
};

// Analyze template usage
const analyzeTemplateUsage = (schedules, template) => {
  const schedulesByDate = schedules.reduce((groups, schedule) => {
    const dateKey = schedule.date.toISOString().split('T')[0];
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(schedule);
    return groups;
  }, {});
  
  let totalDays = 0;
  let compliantDays = 0;
  const issues = [];
  
  Object.entries(schedulesByDate).forEach(([dateStr, daySchedules]) => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const dayTemplate = template.dailyHours?.find(dh => dh.dayOfWeek === dayOfWeek);
    
    if (!dayTemplate || !dayTemplate.isOpen) return;
    
    totalDays++;
    
    const coverage = analyzeCoverageGaps(daySchedules, dayTemplate);
    
    if (coverage.coverageRate >= 0.8) {
      compliantDays++;
    } else {
      issues.push({
        date: dateStr,
        coverageRate: coverage.coverageRate,
        gaps: coverage.gaps.length,
        reason: 'Insufficient coverage'
      });
    }
  });
  
  return {
    complianceRate: totalDays > 0 ? compliantDays / totalDays : 0,
    compliantDays,
    totalDays,
    issues
  };
};

module.exports = {
  calculateSchedulingMetrics,
  calculateShiftHours,
  detectSchedulingConflicts,
  isTimeOverlap,
  calculateWeeklyHours,
  getWeekKey,
  optimizeScheduleDistribution,
  analyzeCoverageGaps,
  analyzeWorkloadDistribution,
  generateScheduleRecommendations,
  analyzeTemplateUsage
};