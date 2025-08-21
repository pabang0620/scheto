const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// @desc    Analyze current staffing patterns and generate recommendations
// @route   POST /api/staffing/analyze
// @access  Private (Admin only)
const analyzeStaffing = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      startDate,
      endDate,
      templateId,
      includeWeekends = true,
      analyzeByDepartment = false
    } = req.body;

    // Get company
    const company = await prisma.company.findFirst({
      where: { userId: req.user.id }
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Get template if provided
    let template = null;
    if (templateId) {
      template = await prisma.operatingHoursTemplate.findUnique({
        where: { 
          id: parseInt(templateId),
          companyId: company.id
        },
        include: {
          dailyHours: {
            include: {
              timeSlots: {
                orderBy: { hourSlot: 'asc' }
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
            }
          }
        }
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Get actual schedules in the period
    const schedules = await prisma.schedule.findMany({
      where: {
        date: { gte: start, lte: end },
        employee: {
          user: {
            company: {
              id: company.id
            }
          }
        }
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
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
    });

    // Get leaves in the period
    const leaves = await prisma.leave.findMany({
      where: {
        status: 'approved',
        OR: [{
          startDate: { lte: end },
          endDate: { gte: start }
        }],
        employee: {
          user: {
            company: {
              id: company.id
            }
          }
        }
      },
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

    // Analyze day by day
    const analysis = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      if (!includeWeekends && isWeekend) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Get schedules for this day
      const daySchedules = schedules.filter(s => 
        s.date.toISOString().split('T')[0] === dateStr
      );

      // Get employees on leave for this day
      const employeesOnLeave = leaves.filter(leave => {
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);
        return currentDate >= leaveStart && currentDate <= leaveEnd;
      });

      // Get template requirements for this day
      const dayTemplate = template?.dailyHours.find(dh => dh.dayOfWeek === dayOfWeek);
      let hourlyAnalysis = [];

      if (dayTemplate && dayTemplate.isOpen) {
        // Analyze hour by hour
        const openHour = parseInt(dayTemplate.openTime?.split(':')[0] || '9');
        const closeHour = parseInt(dayTemplate.closeTime?.split(':')[0] || '18');

        for (let hour = openHour; hour < closeHour; hour++) {
          // Count actual staff at this hour
          const actualStaff = daySchedules.filter(schedule => {
            const schedStart = parseInt(schedule.startTime.split(':')[0]);
            const schedEnd = parseInt(schedule.endTime.split(':')[0]);
            
            // Handle overnight shifts
            if (schedEnd < schedStart) {
              return hour >= schedStart || hour < schedEnd;
            } else {
              return hour >= schedStart && hour < schedEnd;
            }
          }).length;

          // Get required staff from template
          const timeSlot = dayTemplate.timeSlots?.find(ts => ts.hourSlot === hour);
          const requiredStaff = timeSlot?.requiredStaff || dayTemplate.minStaff;
          const preferredStaff = timeSlot?.preferredStaff || requiredStaff;
          const priority = timeSlot?.priority || 'normal';

          const shortfall = Math.max(0, requiredStaff - actualStaff);
          const overstaffing = Math.max(0, actualStaff - preferredStaff);
          const coverageRate = requiredStaff > 0 ? actualStaff / requiredStaff : 1;

          hourlyAnalysis.push({
            hour,
            timeSlot: `${hour}:00-${hour + 1}:00`,
            actualStaff,
            requiredStaff,
            preferredStaff,
            shortfall,
            overstaffing,
            coverageRate,
            priority,
            status: shortfall > 0 ? 'understaffed' : 
                   overstaffing > 0 ? 'overstaffed' : 'optimal'
          });
        }
      }

      // Department-specific analysis if requested
      let departmentAnalysis = null;
      if (analyzeByDepartment) {
        const departments = [...new Set(daySchedules.map(s => s.employee.department))];
        departmentAnalysis = departments.map(dept => {
          const deptSchedules = daySchedules.filter(s => s.employee.department === dept);
          const deptLeaves = employeesOnLeave.filter(l => l.employee.department === dept);
          
          return {
            department: dept,
            scheduledStaff: deptSchedules.length,
            staffOnLeave: deptLeaves.length,
            utilizationRate: deptSchedules.length > 0 ? 
              deptSchedules.length / (deptSchedules.length + deptLeaves.length) : 0,
            schedules: deptSchedules.length
          };
        });
      }

      // Calculate day-level metrics
      const totalScheduled = daySchedules.length;
      const totalOnLeave = employeesOnLeave.length;
      const avgCoverageRate = hourlyAnalysis.length > 0 ? 
        hourlyAnalysis.reduce((sum, h) => sum + h.coverageRate, 0) / hourlyAnalysis.length : 0;
      const totalShortfall = hourlyAnalysis.reduce((sum, h) => sum + h.shortfall, 0);
      const totalOverstaffing = hourlyAnalysis.reduce((sum, h) => sum + h.overstaffing, 0);

      analysis.push({
        date: dateStr,
        dayOfWeek,
        dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
        isWeekend,
        totalScheduled,
        totalOnLeave,
        availableStaff: totalScheduled,
        templateUsed: dayTemplate ? {
          isOpen: dayTemplate.isOpen,
          openTime: dayTemplate.openTime,
          closeTime: dayTemplate.closeTime,
          minStaff: dayTemplate.minStaff,
          maxStaff: dayTemplate.maxStaff
        } : null,
        metrics: {
          avgCoverageRate,
          totalShortfall,
          totalOverstaffing,
          efficiency: totalOverstaffing === 0 ? 1 : Math.max(0, 1 - (totalOverstaffing / totalScheduled))
        },
        hourlyAnalysis,
        departmentAnalysis,
        status: totalShortfall > 0 ? 'critical' :
               totalOverstaffing > 3 ? 'inefficient' : 'good'
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Generate overall statistics and recommendations
    const overallStats = {
      totalDaysAnalyzed: analysis.length,
      avgCoverageRate: analysis.reduce((sum, day) => sum + day.metrics.avgCoverageRate, 0) / analysis.length,
      avgEfficiency: analysis.reduce((sum, day) => sum + day.metrics.efficiency, 0) / analysis.length,
      daysWithShortfall: analysis.filter(day => day.metrics.totalShortfall > 0).length,
      daysOverstaffed: analysis.filter(day => day.metrics.totalOverstaffing > 3).length,
      totalScheduledHours: analysis.reduce((sum, day) => sum + day.totalScheduled * 8, 0), // Assuming 8-hour shifts
      totalShortfallHours: analysis.reduce((sum, day) => sum + day.metrics.totalShortfall, 0),
      totalOverstaffingHours: analysis.reduce((sum, day) => sum + day.metrics.totalOverstaffing, 0)
    };

    // Generate recommendations
    const recommendations = [];

    // Chronic understaffing
    if (overallStats.daysWithShortfall > analysis.length * 0.3) {
      recommendations.push({
        type: 'staffing_increase',
        priority: 'high',
        title: '인력 보강 필요',
        message: `분석 기간의 ${((overallStats.daysWithShortfall / analysis.length) * 100).toFixed(1)}%에서 인력 부족이 발생했습니다. 추가 채용을 고려하세요.`,
        impact: 'high',
        effort: 'high'
      });
    }

    // Identify peak hours needing attention
    const allHours = analysis.flatMap(day => day.hourlyAnalysis || []);
    const hourlyStats = {};
    
    for (let hour = 0; hour < 24; hour++) {
      const hourData = allHours.filter(h => h.hour === hour);
      if (hourData.length > 0) {
        hourlyStats[hour] = {
          avgShortfall: hourData.reduce((sum, h) => sum + h.shortfall, 0) / hourData.length,
          avgOverstaffing: hourData.reduce((sum, h) => sum + h.overstaffing, 0) / hourData.length,
          avgCoverage: hourData.reduce((sum, h) => sum + h.coverageRate, 0) / hourData.length,
          occurrences: hourData.length
        };
      }
    }

    // Find problematic hours
    const problematicHours = Object.entries(hourlyStats)
      .filter(([hour, stats]) => stats.avgShortfall > 0.5)
      .sort(([,a], [,b]) => b.avgShortfall - a.avgShortfall)
      .slice(0, 3);

    if (problematicHours.length > 0) {
      recommendations.push({
        type: 'time_slot_adjustment',
        priority: 'medium',
        title: '특정 시간대 인력 부족',
        message: `${problematicHours.map(([hour]) => `${hour}시`).join(', ')} 시간대에 지속적인 인력 부족이 발생합니다. 해당 시간대 근무자 증원을 고려하세요.`,
        details: problematicHours.map(([hour, stats]) => ({
          hour: parseInt(hour),
          avgShortfall: stats.avgShortfall,
          avgCoverage: stats.avgCoverage
        })),
        impact: 'medium',
        effort: 'medium'
      });
    }

    // Efficiency recommendations
    if (overallStats.avgEfficiency < 0.8) {
      recommendations.push({
        type: 'efficiency_improvement',
        priority: 'medium',
        title: '운영 효율성 개선',
        message: `전체 효율성이 ${(overallStats.avgEfficiency * 100).toFixed(1)}%입니다. 불필요한 중복 배치를 줄이고 스케줄을 최적화하세요.`,
        impact: 'medium',
        effort: 'low'
      });
    }

    // Weekend vs weekday analysis
    const weekdayAnalysis = analysis.filter(day => !day.isWeekend);
    const weekendAnalysis = analysis.filter(day => day.isWeekend);

    if (weekendAnalysis.length > 0 && weekdayAnalysis.length > 0) {
      const weekdayAvgStaff = weekdayAnalysis.reduce((sum, day) => sum + day.totalScheduled, 0) / weekdayAnalysis.length;
      const weekendAvgStaff = weekendAnalysis.reduce((sum, day) => sum + day.totalScheduled, 0) / weekendAnalysis.length;

      if (weekendAvgStaff > weekdayAvgStaff * 1.3) {
        recommendations.push({
          type: 'weekend_optimization',
          priority: 'low',
          title: '주말 인력 배치 검토',
          message: `주말 평균 인력(${weekendAvgStaff.toFixed(1)}명)이 평일(${weekdayAvgStaff.toFixed(1)}명)보다 많습니다. 실제 업무량에 맞는지 검토하세요.`,
          impact: 'low',
          effort: 'low'
        });
      }
    }

    // Save analytics for future reference
    try {
      for (const dayAnalysis of analysis) {
        await prisma.staffingAnalytics.upsert({
          where: {
            companyId_analysisDate: {
              companyId: company.id,
              analysisDate: new Date(dayAnalysis.date)
            }
          },
          update: {
            dayOfWeek: dayAnalysis.dayOfWeek,
            totalScheduledHours: dayAnalysis.totalScheduled * 8,
            totalRequiredHours: dayAnalysis.hourlyAnalysis?.reduce((sum, h) => sum + h.requiredStaff, 0) || 0,
            coverageRate: dayAnalysis.metrics.avgCoverageRate,
            utilizationRate: dayAnalysis.totalScheduled > 0 ? dayAnalysis.totalScheduled / (dayAnalysis.totalScheduled + dayAnalysis.totalOnLeave) : 0,
            shortfallHours: dayAnalysis.metrics.totalShortfall,
            overstaffingHours: dayAnalysis.metrics.totalOverstaffing,
            averageStaffPerHour: dayAnalysis.totalScheduled,
            peakStaffingHour: dayAnalysis.hourlyAnalysis?.reduce((max, h) => h.actualStaff > max.actualStaff ? h : max, {actualStaff: 0, hour: 0})?.hour,
            lowStaffingHour: dayAnalysis.hourlyAnalysis?.reduce((min, h) => h.actualStaff < min.actualStaff ? h : min, {actualStaff: 999, hour: 0})?.hour,
            hourlyBreakdown: dayAnalysis.hourlyAnalysis || [],
            departmentBreakdown: dayAnalysis.departmentAnalysis,
            recommendations: recommendations.filter(r => r.type !== 'general')
          },
          create: {
            companyId: company.id,
            analysisDate: new Date(dayAnalysis.date),
            dayOfWeek: dayAnalysis.dayOfWeek,
            totalScheduledHours: dayAnalysis.totalScheduled * 8,
            totalRequiredHours: dayAnalysis.hourlyAnalysis?.reduce((sum, h) => sum + h.requiredStaff, 0) || 0,
            coverageRate: dayAnalysis.metrics.avgCoverageRate,
            utilizationRate: dayAnalysis.totalScheduled > 0 ? dayAnalysis.totalScheduled / (dayAnalysis.totalScheduled + dayAnalysis.totalOnLeave) : 0,
            shortfallHours: dayAnalysis.metrics.totalShortfall,
            overstaffingHours: dayAnalysis.metrics.totalOverstaffing,
            averageStaffPerHour: dayAnalysis.totalScheduled,
            peakStaffingHour: dayAnalysis.hourlyAnalysis?.reduce((max, h) => h.actualStaff > max.actualStaff ? h : max, {actualStaff: 0, hour: 0})?.hour || null,
            lowStaffingHour: dayAnalysis.hourlyAnalysis?.reduce((min, h) => h.actualStaff < min.actualStaff ? h : min, {actualStaff: 999, hour: 0})?.hour || null,
            hourlyBreakdown: dayAnalysis.hourlyAnalysis || [],
            departmentBreakdown: dayAnalysis.departmentAnalysis,
            recommendations: recommendations.filter(r => r.type !== 'general')
          }
        });
      }
    } catch (saveError) {
      console.error('Error saving analytics:', saveError);
      // Don't fail the request if saving analytics fails
    }

    res.json({
      message: 'Staffing analysis completed',
      period: { startDate, endDate },
      template: template ? {
        id: template.id,
        templateName: template.templateName
      } : null,
      overallStats,
      recommendations,
      dailyAnalysis: analysis,
      parameters: {
        includeWeekends,
        analyzeByDepartment,
        templateId
      }
    });

  } catch (error) {
    console.error('Analyze staffing error:', error);
    res.status(500).json({ message: 'Server error analyzing staffing' });
  }
};

// @desc    Get historical staffing analytics
// @route   GET /api/staffing/analytics/history
// @access  Private
const getAnalyticsHistory = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      limit = 100,
      offset = 0,
      groupBy = 'day' // day, week, month
    } = req.query;

    // Get company
    const company = await prisma.company.findFirst({
      where: { userId: req.user.id }
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    let whereClause = { companyId: company.id };
    
    if (startDate && endDate) {
      whereClause.analysisDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const analytics = await prisma.staffingAnalytics.findMany({
      where: whereClause,
      orderBy: { analysisDate: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    // Group data if requested
    let groupedData = analytics;
    
    if (groupBy === 'week') {
      const weekGroups = {};
      analytics.forEach(record => {
        const date = new Date(record.analysisDate);
        const weekKey = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
        
        if (!weekGroups[weekKey]) {
          weekGroups[weekKey] = {
            period: weekKey,
            records: [],
            avgCoverageRate: 0,
            avgUtilizationRate: 0,
            totalShortfallHours: 0,
            totalOverstaffingHours: 0
          };
        }
        
        weekGroups[weekKey].records.push(record);
      });

      // Calculate averages for each week
      groupedData = Object.values(weekGroups).map(week => {
        const recordCount = week.records.length;
        return {
          ...week,
          avgCoverageRate: week.records.reduce((sum, r) => sum + r.coverageRate, 0) / recordCount,
          avgUtilizationRate: week.records.reduce((sum, r) => sum + r.utilizationRate, 0) / recordCount,
          totalShortfallHours: week.records.reduce((sum, r) => sum + r.shortfallHours, 0),
          totalOverstaffingHours: week.records.reduce((sum, r) => sum + r.overstaffingHours, 0),
          recordCount
        };
      });
    }

    // Calculate trends
    const trends = {
      coverageRate: {
        current: analytics.slice(0, 7).reduce((sum, r) => sum + r.coverageRate, 0) / Math.min(7, analytics.length),
        previous: analytics.slice(7, 14).reduce((sum, r) => sum + r.coverageRate, 0) / Math.min(7, analytics.slice(7).length),
        trend: 'stable'
      },
      utilizationRate: {
        current: analytics.slice(0, 7).reduce((sum, r) => sum + r.utilizationRate, 0) / Math.min(7, analytics.length),
        previous: analytics.slice(7, 14).reduce((sum, r) => sum + r.utilizationRate, 0) / Math.min(7, analytics.slice(7).length),
        trend: 'stable'
      }
    };

    // Calculate trend direction
    if (trends.coverageRate.current > trends.coverageRate.previous * 1.05) {
      trends.coverageRate.trend = 'improving';
    } else if (trends.coverageRate.current < trends.coverageRate.previous * 0.95) {
      trends.coverageRate.trend = 'declining';
    }

    if (trends.utilizationRate.current > trends.utilizationRate.previous * 1.05) {
      trends.utilizationRate.trend = 'improving';
    } else if (trends.utilizationRate.current < trends.utilizationRate.previous * 0.95) {
      trends.utilizationRate.trend = 'declining';
    }

    res.json({
      message: 'Analytics history retrieved successfully',
      period: { startDate, endDate },
      analytics: groupedData,
      trends,
      metadata: {
        total: analytics.length,
        groupBy,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Get analytics history error:', error);
    res.status(500).json({ message: 'Server error getting analytics history' });
  }
};

// @desc    Generate staffing recommendations based on historical data
// @route   GET /api/staffing/recommendations
// @access  Private
const getRecommendations = async (req, res) => {
  try {
    const { 
      lookbackDays = 30,
      confidence = 0.8 
    } = req.query;

    // Get company
    const company = await prisma.company.findFirst({
      where: { userId: req.user.id }
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Get recent analytics
    const recentAnalytics = await prisma.staffingAnalytics.findMany({
      where: {
        companyId: company.id,
        analysisDate: {
          gte: new Date(Date.now() - parseInt(lookbackDays) * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { analysisDate: 'desc' }
    });

    if (recentAnalytics.length === 0) {
      return res.json({
        message: 'No recent analytics data available',
        recommendations: [],
        note: 'Run staffing analysis first to generate recommendations'
      });
    }

    const recommendations = [];

    // Analyze patterns by day of week
    const dayOfWeekStats = {};
    for (let dow = 0; dow < 7; dow++) {
      const dayData = recentAnalytics.filter(a => a.dayOfWeek === dow);
      if (dayData.length > 0) {
        dayOfWeekStats[dow] = {
          dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dow],
          avgCoverage: dayData.reduce((sum, d) => sum + d.coverageRate, 0) / dayData.length,
          avgShortfall: dayData.reduce((sum, d) => sum + d.shortfallHours, 0) / dayData.length,
          avgOverstaffing: dayData.reduce((sum, d) => sum + d.overstaffingHours, 0) / dayData.length,
          occurrences: dayData.length
        };
      }
    }

    // Identify problematic days
    Object.entries(dayOfWeekStats).forEach(([dow, stats]) => {
      if (stats.avgCoverage < confidence && stats.occurrences >= 3) {
        recommendations.push({
          type: 'day_of_week_staffing',
          priority: stats.avgCoverage < 0.7 ? 'high' : 'medium',
          dayOfWeek: parseInt(dow),
          dayName: stats.dayName,
          title: `${stats.dayName} 인력 부족`,
          message: `${stats.dayName}요일 평균 커버리지가 ${(stats.avgCoverage * 100).toFixed(1)}%입니다. 해당 요일 근무자 증원이 필요합니다.`,
          currentCoverage: stats.avgCoverage,
          avgShortfall: stats.avgShortfall,
          confidence: stats.occurrences / parseInt(lookbackDays) * 7,
          action: 'increase_staffing',
          impact: 'high',
          effort: 'medium'
        });
      }

      if (stats.avgOverstaffing > 2 && stats.occurrences >= 3) {
        recommendations.push({
          type: 'day_of_week_overstaffing',
          priority: 'low',
          dayOfWeek: parseInt(dow),
          dayName: stats.dayName,
          title: `${stats.dayName} 과잉 배치`,
          message: `${stats.dayName}요일 평균 ${stats.avgOverstaffing.toFixed(1)}시간의 과잉 배치가 발생합니다. 인력 재배치를 고려하세요.`,
          avgOverstaffing: stats.avgOverstaffing,
          confidence: stats.occurrences / parseInt(lookbackDays) * 7,
          action: 'redistribute_staff',
          impact: 'medium',
          effort: 'low'
        });
      }
    });

    // Analyze hourly patterns
    const hourlyPatterns = {};
    recentAnalytics.forEach(record => {
      if (record.hourlyBreakdown && Array.isArray(record.hourlyBreakdown)) {
        record.hourlyBreakdown.forEach(hourData => {
          if (!hourlyPatterns[hourData.hour]) {
            hourlyPatterns[hourData.hour] = {
              totalOccurrences: 0,
              totalShortfall: 0,
              totalOverstaffing: 0,
              avgCoverage: 0
            };
          }
          
          hourlyPatterns[hourData.hour].totalOccurrences++;
          hourlyPatterns[hourData.hour].totalShortfall += hourData.shortfall || 0;
          hourlyPatterns[hourData.hour].totalOverstaffing += hourData.overstaffing || 0;
          hourlyPatterns[hourData.hour].avgCoverage += hourData.coverageRate || 0;
        });
      }
    });

    // Process hourly patterns
    Object.entries(hourlyPatterns).forEach(([hour, pattern]) => {
      const avgCoverage = pattern.avgCoverage / pattern.totalOccurrences;
      const avgShortfall = pattern.totalShortfall / pattern.totalOccurrences;
      const avgOverstaffing = pattern.totalOverstaffing / pattern.totalOccurrences;

      if (avgShortfall > 0.5 && pattern.totalOccurrences >= 5) {
        recommendations.push({
          type: 'hourly_staffing',
          priority: avgShortfall > 1.5 ? 'high' : 'medium',
          hour: parseInt(hour),
          title: `${hour}시 시간대 인력 부족`,
          message: `${hour}시 시간대에 평균 ${avgShortfall.toFixed(1)}명의 인력 부족이 발생합니다.`,
          avgShortfall,
          avgCoverage,
          occurrences: pattern.totalOccurrences,
          confidence: pattern.totalOccurrences / recentAnalytics.length,
          action: 'adjust_shift_times',
          impact: 'high',
          effort: 'medium'
        });
      }
    });

    // Overall efficiency recommendations
    const avgEfficiency = recentAnalytics.reduce((sum, r) => {
      const efficiency = r.totalScheduledHours > 0 ? 
        1 - (r.overstaffingHours / r.totalScheduledHours) : 1;
      return sum + efficiency;
    }, 0) / recentAnalytics.length;

    if (avgEfficiency < 0.8) {
      recommendations.push({
        type: 'overall_efficiency',
        priority: 'medium',
        title: '전체 효율성 개선',
        message: `전체 운영 효율성이 ${(avgEfficiency * 100).toFixed(1)}%입니다. 스케줄 최적화가 필요합니다.`,
        currentEfficiency: avgEfficiency,
        targetEfficiency: 0.85,
        action: 'optimize_schedules',
        impact: 'medium',
        effort: 'medium'
      });
    }

    // Seasonal recommendations (if data spans multiple months)
    const monthlyStats = {};
    recentAnalytics.forEach(record => {
      const month = new Date(record.analysisDate).getMonth();
      if (!monthlyStats[month]) {
        monthlyStats[month] = {
          records: [],
          avgCoverage: 0,
          avgUtilization: 0
        };
      }
      monthlyStats[month].records.push(record);
    });

    if (Object.keys(monthlyStats).length > 1) {
      Object.entries(monthlyStats).forEach(([month, stats]) => {
        const monthName = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ][parseInt(month)];

        stats.avgCoverage = stats.records.reduce((sum, r) => sum + r.coverageRate, 0) / stats.records.length;
        stats.avgUtilization = stats.records.reduce((sum, r) => sum + r.utilizationRate, 0) / stats.records.length;

        if (stats.avgCoverage < 0.8 && stats.records.length >= 5) {
          recommendations.push({
            type: 'seasonal_adjustment',
            priority: 'medium',
            month: parseInt(month),
            monthName,
            title: `${monthName} 계절적 조정`,
            message: `${monthName}월 평균 커버리지가 ${(stats.avgCoverage * 100).toFixed(1)}%로 낮습니다. 계절적 수요 변화를 고려한 스케줄 조정이 필요합니다.`,
            avgCoverage: stats.avgCoverage,
            occurrences: stats.records.length,
            action: 'seasonal_planning',
            impact: 'medium',
            effort: 'high'
          });
        }
      });
    }

    // Sort recommendations by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    res.json({
      message: 'Recommendations generated successfully',
      period: {
        lookbackDays: parseInt(lookbackDays),
        dataPoints: recentAnalytics.length
      },
      recommendations,
      summary: {
        totalRecommendations: recommendations.length,
        highPriority: recommendations.filter(r => r.priority === 'high').length,
        mediumPriority: recommendations.filter(r => r.priority === 'medium').length,
        lowPriority: recommendations.filter(r => r.priority === 'low').length,
        avgConfidence: recommendations.reduce((sum, r) => sum + (r.confidence || 0), 0) / recommendations.length
      }
    });

  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ message: 'Server error generating recommendations' });
  }
};

// @desc    Optimize staffing for a specific period using AI-like algorithms
// @route   POST /api/staffing/optimize
// @access  Private (Admin only)  
const optimizeStaffing = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      startDate,
      endDate,
      templateId,
      optimizationGoals = {
        minimizeShortfall: 0.4,
        minimizeOverstaffing: 0.3,
        maximizeEfficiency: 0.2,
        respectPreferences: 0.1
      },
      constraints = {
        maxConsecutiveDays: 6,
        minRestHours: 10,
        maxWeeklyHours: 45,
        respectExistingSchedules: true
      }
    } = req.body;

    // Get company and employees
    const company = await prisma.company.findFirst({
      where: { userId: req.user.id }
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Get template
    const template = await prisma.operatingHoursTemplate.findUnique({
      where: { 
        id: parseInt(templateId),
        companyId: company.id
      },
      include: {
        dailyHours: {
          include: {
            timeSlots: {
              orderBy: { hourSlot: 'asc' }
            }
          }
        }
      }
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Get employees
    const employees = await prisma.employee.findMany({
      where: {
        user: {
          company: { id: company.id }
        }
      },
      include: {
        abilities: true,
        preferences: true,
        schedules: {
          where: {
            date: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          }
        },
        leaves: {
          where: {
            status: 'approved',
            OR: [{
              startDate: { lte: new Date(endDate) },
              endDate: { gte: new Date(startDate) }
            }]
          }
        }
      }
    });

    // Get existing schedules if we need to respect them
    const existingSchedules = constraints.respectExistingSchedules ? 
      await prisma.schedule.findMany({
        where: {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          },
          employee: {
            user: {
              company: { id: company.id }
            }
          }
        },
        include: {
          employee: {
            select: { id: true, name: true }
          }
        }
      }) : [];

    // Optimization algorithm
    const optimizationResults = [];
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    while (currentDate <= endDateObj) {
      const dayOfWeek = currentDate.getDay();
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Get template for this day
      const dayTemplate = template.dailyHours.find(dh => dh.dayOfWeek === dayOfWeek);
      
      if (!dayTemplate || !dayTemplate.isOpen) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Get available employees for this day
      const availableEmployees = employees.filter(emp => {
        // Check if employee is on leave
        const isOnLeave = emp.leaves.some(leave => {
          const leaveStart = new Date(leave.startDate);
          const leaveEnd = new Date(leave.endDate);
          return currentDate >= leaveStart && currentDate <= leaveEnd;
        });

        // Check existing schedules if we need to respect them
        const hasExistingSchedule = existingSchedules.some(schedule => {
          const schedDate = new Date(schedule.date);
          return schedDate.toDateString() === currentDate.toDateString() && 
                 schedule.employeeId === emp.id;
        });

        return !isOnLeave && (!constraints.respectExistingSchedules || !hasExistingSchedule);
      });

      // Optimize hour by hour
      const hourlyOptimization = [];
      const openHour = parseInt(dayTemplate.openTime?.split(':')[0] || '9');
      const closeHour = parseInt(dayTemplate.closeTime?.split(':')[0] || '18');

      for (let hour = openHour; hour < closeHour; hour++) {
        const timeSlot = dayTemplate.timeSlots?.find(ts => ts.hourSlot === hour);
        const requiredStaff = timeSlot?.requiredStaff || dayTemplate.minStaff;
        const preferredStaff = timeSlot?.preferredStaff || requiredStaff;
        const priority = timeSlot?.priority || 'normal';

        // Score employees for this time slot
        const employeeScores = availableEmployees.map(emp => {
          let score = 0;
          const ability = emp.abilities[0];
          
          // Ability-based scoring
          if (ability) {
            score += (ability.workSkill || 1) * 3;
            score += (ability.experience || 1) * 2;
            score += (ability.customerService || 1) * 2;
            score += (ability.flexibility || 1) * 1;
          }

          // Preference-based scoring
          if (emp.preferences && emp.preferences.length > 0) {
            const preference = emp.preferences[0];
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayName = dayNames[dayOfWeek];
            
            if (preference.preferDays && preference.preferDays.includes(dayName)) {
              score += 5;
            }
            if (preference.avoidDays && preference.avoidDays.includes(dayName)) {
              score -= 3;
            }
          }

          // Priority-based scoring
          const priorityMultiplier = {
            low: 1,
            normal: 1.2,
            high: 1.5,
            critical: 2
          }[priority] || 1;

          return {
            employeeId: emp.id,
            employeeName: emp.name,
            score: score * priorityMultiplier,
            ability: ability || null
          };
        });

        // Select optimal employees
        employeeScores.sort((a, b) => b.score - a.score);
        const selectedEmployees = employeeScores.slice(0, Math.min(preferredStaff, employeeScores.length));

        hourlyOptimization.push({
          hour,
          timeSlot: `${hour}:00-${hour + 1}:00`,
          requiredStaff,
          preferredStaff,
          selectedStaff: selectedEmployees.length,
          priority,
          selectedEmployees,
          shortfall: Math.max(0, requiredStaff - selectedEmployees.length),
          efficiency: selectedEmployees.length > 0 ? 
            Math.min(1, requiredStaff / selectedEmployees.length) : 0
        });
      }

      // Calculate day-level metrics
      const totalRequiredStaff = hourlyOptimization.reduce((sum, h) => sum + h.requiredStaff, 0);
      const totalSelectedStaff = hourlyOptimization.reduce((sum, h) => sum + h.selectedStaff, 0);
      const totalShortfall = hourlyOptimization.reduce((sum, h) => sum + h.shortfall, 0);
      const avgEfficiency = hourlyOptimization.reduce((sum, h) => sum + h.efficiency, 0) / hourlyOptimization.length;

      // Calculate optimization score
      const shortfallScore = (totalRequiredStaff - totalShortfall) / totalRequiredStaff * optimizationGoals.minimizeShortfall;
      const overstaffingPenalty = 0; // Calculate based on overstaffing if any
      const efficiencyScore = avgEfficiency * optimizationGoals.maximizeEfficiency;
      const preferenceScore = 0.8 * optimizationGoals.respectPreferences; // Simplified

      const optimizationScore = shortfallScore + efficiencyScore + preferenceScore - overstaffingPenalty;

      optimizationResults.push({
        date: dateStr,
        dayOfWeek,
        dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
        template: {
          openTime: dayTemplate.openTime,
          closeTime: dayTemplate.closeTime,
          minStaff: dayTemplate.minStaff,
          maxStaff: dayTemplate.maxStaff
        },
        hourlyOptimization,
        metrics: {
          totalRequiredStaff,
          totalSelectedStaff,
          totalShortfall,
          avgEfficiency,
          coverageRate: totalRequiredStaff > 0 ? (totalRequiredStaff - totalShortfall) / totalRequiredStaff : 1,
          optimizationScore
        },
        status: totalShortfall === 0 ? 'optimal' : totalShortfall > totalRequiredStaff * 0.2 ? 'critical' : 'acceptable'
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Generate overall optimization summary
    const overallMetrics = {
      totalDaysOptimized: optimizationResults.length,
      avgOptimizationScore: optimizationResults.reduce((sum, day) => sum + day.metrics.optimizationScore, 0) / optimizationResults.length,
      avgCoverageRate: optimizationResults.reduce((sum, day) => sum + day.metrics.coverageRate, 0) / optimizationResults.length,
      avgEfficiency: optimizationResults.reduce((sum, day) => sum + day.metrics.avgEfficiency, 0) / optimizationResults.length,
      totalShortfallHours: optimizationResults.reduce((sum, day) => sum + day.metrics.totalShortfall, 0),
      daysOptimal: optimizationResults.filter(day => day.status === 'optimal').length,
      daysCritical: optimizationResults.filter(day => day.status === 'critical').length
    };

    res.json({
      message: 'Staffing optimization completed',
      period: { startDate, endDate },
      template: {
        id: template.id,
        templateName: template.templateName
      },
      optimizationGoals,
      constraints,
      overallMetrics,
      dailyOptimization: optimizationResults,
      recommendations: optimizationResults
        .filter(day => day.status !== 'optimal')
        .map(day => ({
          date: day.date,
          dayName: day.dayName,
          status: day.status,
          shortfall: day.metrics.totalShortfall,
          suggestion: day.status === 'critical' ? 
            '긴급 인력 보강 필요' : 
            '추가 인력 배치 권장'
        }))
    });

  } catch (error) {
    console.error('Optimize staffing error:', error);
    res.status(500).json({ message: 'Server error optimizing staffing' });
  }
};

module.exports = {
  analyzeStaffing,
  getAnalyticsHistory,
  getRecommendations,
  optimizeStaffing
};