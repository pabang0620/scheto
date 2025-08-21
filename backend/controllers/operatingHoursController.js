const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// @desc    Get all operating hours templates for a company
// @route   GET /api/operating-hours/templates
// @access  Private
const getTemplates = async (req, res) => {
  try {
    // Get company ID from user
    const company = await prisma.company.findFirst({
      where: { userId: req.user.id }
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const templates = await prisma.operatingHoursTemplate.findMany({
      where: { 
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
            overrideDate: { gte: new Date() }
          },
          orderBy: { overrideDate: 'asc' }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { templateName: 'asc' }
      ]
    });

    res.json({ 
      templates,
      total: templates.length
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ message: 'Server error getting templates' });
  }
};

// @desc    Get a specific operating hours template
// @route   GET /api/operating-hours/templates/:id
// @access  Private
const getTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.operatingHoursTemplate.findUnique({
      where: { id: parseInt(id) },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
            userId: true
          }
        },
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
            overrideDate: { gte: new Date() }
          },
          orderBy: { overrideDate: 'asc' }
        }
      }
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Check if user has access to this template
    if (template.company.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ template });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ message: 'Server error getting template' });
  }
};

// @desc    Create a new operating hours template
// @route   POST /api/operating-hours/templates
// @access  Private (Admin only)
const createTemplate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      templateName,
      description,
      isDefault = false,
      timezone = 'UTC',
      dailyHours = [],
      staffingRules = []
    } = req.body;

    // Get company
    const company = await prisma.company.findFirst({
      where: { userId: req.user.id }
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.operatingHoursTemplate.updateMany({
        where: { 
          companyId: company.id,
          isDefault: true 
        },
        data: { isDefault: false }
      });
    }

    // Create template with related data
    const template = await prisma.operatingHoursTemplate.create({
      data: {
        companyId: company.id,
        templateName,
        description,
        isDefault,
        timezone,
        createdBy: req.user.id,
        dailyHours: {
          create: dailyHours.map(day => ({
            dayOfWeek: day.dayOfWeek,
            isOpen: day.isOpen ?? true,
            openTime: day.openTime,
            closeTime: day.closeTime,
            breakStart: day.breakStart,
            breakEnd: day.breakEnd,
            minStaff: day.minStaff ?? 1,
            maxStaff: day.maxStaff,
            notes: day.notes,
            timeSlots: {
              create: (day.timeSlots || []).map(slot => ({
                hourSlot: slot.hourSlot,
                requiredStaff: slot.requiredStaff ?? 1,
                preferredStaff: slot.preferredStaff,
                maxStaff: slot.maxStaff,
                priority: slot.priority ?? 'normal',
                skillRequirement: slot.skillRequirement,
                notes: slot.notes
              }))
            }
          }))
        },
        staffingRules: {
          create: staffingRules.map(rule => ({
            ruleName: rule.ruleName,
            ruleType: rule.ruleType,
            conditions: rule.conditions,
            staffingRequirements: rule.staffingRequirements,
            priority: rule.priority ?? 1,
            effectiveFrom: rule.effectiveFrom ? new Date(rule.effectiveFrom) : null,
            effectiveTo: rule.effectiveTo ? new Date(rule.effectiveTo) : null
          }))
        }
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
          orderBy: { priority: 'desc' }
        }
      }
    });

    res.status(201).json({
      message: 'Operating hours template created successfully',
      template
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ message: 'Server error creating template' });
  }
};

// @desc    Update an operating hours template
// @route   PUT /api/operating-hours/templates/:id
// @access  Private (Admin only)
const updateTemplate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      templateName,
      description,
      isDefault,
      timezone,
      dailyHours,
      staffingRules
    } = req.body;

    // Check if template exists and user has access
    const existingTemplate = await prisma.operatingHoursTemplate.findUnique({
      where: { id: parseInt(id) },
      include: {
        company: {
          select: { userId: true }
        }
      }
    });

    if (!existingTemplate) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (existingTemplate.company.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // If setting as default, unset other defaults
    if (isDefault && !existingTemplate.isDefault) {
      await prisma.operatingHoursTemplate.updateMany({
        where: { 
          companyId: existingTemplate.companyId,
          isDefault: true,
          id: { not: parseInt(id) }
        },
        data: { isDefault: false }
      });
    }

    // Update template
    const updateData = {};
    if (templateName !== undefined) updateData.templateName = templateName;
    if (description !== undefined) updateData.description = description;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (timezone !== undefined) updateData.timezone = timezone;

    const updatedTemplate = await prisma.operatingHoursTemplate.update({
      where: { id: parseInt(id) },
      data: updateData,
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
        }
      }
    });

    res.json({
      message: 'Template updated successfully',
      template: updatedTemplate
    });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ message: 'Server error updating template' });
  }
};

// @desc    Delete an operating hours template
// @route   DELETE /api/operating-hours/templates/:id
// @access  Private (Admin only)
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if template exists and user has access
    const template = await prisma.operatingHoursTemplate.findUnique({
      where: { id: parseInt(id) },
      include: {
        company: {
          select: { userId: true }
        }
      }
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.company.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if this is the default template
    if (template.isDefault) {
      return res.status(400).json({ 
        message: 'Cannot delete the default template. Please set another template as default first.' 
      });
    }

    // Soft delete by setting isActive to false
    await prisma.operatingHoursTemplate.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ message: 'Server error deleting template' });
  }
};

// @desc    Update daily hours for a template
// @route   PUT /api/operating-hours/templates/:id/daily-hours/:dayOfWeek
// @access  Private (Admin only)
const updateDailyHours = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id, dayOfWeek } = req.params;
    const {
      isOpen,
      openTime,
      closeTime,
      breakStart,
      breakEnd,
      minStaff,
      maxStaff,
      notes,
      timeSlots = []
    } = req.body;

    // Validate day of week
    const dayNum = parseInt(dayOfWeek);
    if (dayNum < 0 || dayNum > 6) {
      return res.status(400).json({ message: 'Day of week must be between 0 (Sunday) and 6 (Saturday)' });
    }

    // Check if template exists and user has access
    const template = await prisma.operatingHoursTemplate.findUnique({
      where: { id: parseInt(id) },
      include: {
        company: {
          select: { userId: true }
        }
      }
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.company.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find existing daily hours or create new
    const existingDailyHours = await prisma.dailyOperatingHours.findUnique({
      where: {
        templateId_dayOfWeek: {
          templateId: parseInt(id),
          dayOfWeek: dayNum
        }
      }
    });

    let dailyHours;
    if (existingDailyHours) {
      // Update existing
      dailyHours = await prisma.dailyOperatingHours.update({
        where: { id: existingDailyHours.id },
        data: {
          isOpen: isOpen ?? existingDailyHours.isOpen,
          openTime: openTime !== undefined ? openTime : existingDailyHours.openTime,
          closeTime: closeTime !== undefined ? closeTime : existingDailyHours.closeTime,
          breakStart: breakStart !== undefined ? breakStart : existingDailyHours.breakStart,
          breakEnd: breakEnd !== undefined ? breakEnd : existingDailyHours.breakEnd,
          minStaff: minStaff ?? existingDailyHours.minStaff,
          maxStaff: maxStaff !== undefined ? maxStaff : existingDailyHours.maxStaff,
          notes: notes !== undefined ? notes : existingDailyHours.notes
        },
        include: {
          timeSlots: {
            orderBy: { hourSlot: 'asc' }
          }
        }
      });
    } else {
      // Create new
      dailyHours = await prisma.dailyOperatingHours.create({
        data: {
          templateId: parseInt(id),
          dayOfWeek: dayNum,
          isOpen: isOpen ?? true,
          openTime,
          closeTime,
          breakStart,
          breakEnd,
          minStaff: minStaff ?? 1,
          maxStaff,
          notes
        },
        include: {
          timeSlots: {
            orderBy: { hourSlot: 'asc' }
          }
        }
      });
    }

    // Update time slots if provided
    if (timeSlots && timeSlots.length > 0) {
      // Delete existing time slots
      await prisma.hourlyStaffingRule.deleteMany({
        where: { dailyHoursId: dailyHours.id }
      });

      // Create new time slots
      await prisma.hourlyStaffingRule.createMany({
        data: timeSlots.map(slot => ({
          dailyHoursId: dailyHours.id,
          hourSlot: slot.hourSlot,
          requiredStaff: slot.requiredStaff ?? 1,
          preferredStaff: slot.preferredStaff,
          maxStaff: slot.maxStaff,
          priority: slot.priority ?? 'normal',
          skillRequirement: slot.skillRequirement,
          notes: slot.notes
        }))
      });

      // Refresh data with new time slots
      dailyHours = await prisma.dailyOperatingHours.findUnique({
        where: { id: dailyHours.id },
        include: {
          timeSlots: {
            orderBy: { hourSlot: 'asc' }
          }
        }
      });
    }

    res.json({
      message: 'Daily hours updated successfully',
      dailyHours
    });
  } catch (error) {
    console.error('Update daily hours error:', error);
    res.status(500).json({ message: 'Server error updating daily hours' });
  }
};

// @desc    Create a schedule override for specific dates
// @route   POST /api/operating-hours/templates/:id/overrides
// @access  Private (Admin only)
const createOverride = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      overrideDate,
      overrideType, // "closed", "special_hours", "special_staffing"
      customHours,
      staffingOverride,
      reason
    } = req.body;

    // Check if template exists and user has access
    const template = await prisma.operatingHoursTemplate.findUnique({
      where: { id: parseInt(id) },
      include: {
        company: {
          select: { userId: true }
        }
      }
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.company.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Create override
    const override = await prisma.scheduleOverride.create({
      data: {
        templateId: parseInt(id),
        overrideDate: new Date(overrideDate),
        overrideType,
        customHours,
        staffingOverride,
        reason,
        createdBy: req.user.id
      }
    });

    res.status(201).json({
      message: 'Schedule override created successfully',
      override
    });
  } catch (error) {
    console.error('Create override error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Override already exists for this date' });
    }
    res.status(500).json({ message: 'Server error creating override' });
  }
};

// @desc    Get effective operating hours for a specific date
// @route   GET /api/operating-hours/effective/:templateId/:date
// @access  Private
const getEffectiveHours = async (req, res) => {
  try {
    const { templateId, date } = req.params;
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    // Get template with daily hours
    const template = await prisma.operatingHoursTemplate.findUnique({
      where: { id: parseInt(templateId) },
      include: {
        company: {
          select: { userId: true }
        },
        dailyHours: {
          where: { dayOfWeek },
          include: {
            timeSlots: {
              orderBy: { hourSlot: 'asc' }
            }
          }
        },
        scheduleOverrides: {
          where: {
            overrideDate: targetDate,
            isActive: true
          }
        },
        staffingRules: {
          where: {
            isActive: true,
            OR: [
              { effectiveFrom: null },
              { effectiveFrom: { lte: targetDate } }
            ],
            AND: [
              {
                OR: [
                  { effectiveTo: null },
                  { effectiveTo: { gte: targetDate } }
                ]
              }
            ]
          },
          orderBy: { priority: 'desc' }
        }
      }
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.company.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check for overrides
    const override = template.scheduleOverrides[0];
    let effectiveHours;

    if (override && override.overrideType === 'closed') {
      effectiveHours = {
        date: date,
        dayOfWeek,
        isClosed: true,
        override: {
          type: override.overrideType,
          reason: override.reason
        }
      };
    } else if (override && override.customHours) {
      effectiveHours = {
        date: date,
        dayOfWeek,
        isClosed: false,
        ...override.customHours,
        override: {
          type: override.overrideType,
          reason: override.reason
        }
      };
    } else {
      // Use regular daily hours
      const dailyHours = template.dailyHours[0];
      if (dailyHours) {
        effectiveHours = {
          date: date,
          dayOfWeek,
          isClosed: !dailyHours.isOpen,
          openTime: dailyHours.openTime,
          closeTime: dailyHours.closeTime,
          breakStart: dailyHours.breakStart,
          breakEnd: dailyHours.breakEnd,
          minStaff: dailyHours.minStaff,
          maxStaff: dailyHours.maxStaff,
          timeSlots: dailyHours.timeSlots,
          notes: dailyHours.notes
        };
      } else {
        effectiveHours = {
          date: date,
          dayOfWeek,
          isClosed: true,
          message: 'No operating hours defined for this day'
        };
      }
    }

    // Apply staffing rules if there's an override
    if (override && override.staffingOverride) {
      effectiveHours.staffingOverride = override.staffingOverride;
    }

    res.json({
      template: {
        id: template.id,
        templateName: template.templateName,
        timezone: template.timezone
      },
      effectiveHours,
      applicableRules: template.staffingRules
    });
  } catch (error) {
    console.error('Get effective hours error:', error);
    res.status(500).json({ message: 'Server error getting effective hours' });
  }
};

// @desc    Generate default template for common business types
// @route   POST /api/operating-hours/generate-default
// @access  Private (Admin only)
const generateDefaultTemplate = async (req, res) => {
  try {
    const { businessType = 'office', customization = {} } = req.body;

    // Get company
    const company = await prisma.company.findFirst({
      where: { userId: req.user.id }
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const templates = {
      office: {
        templateName: '일반 사무실',
        description: '월-금 9시-6시 표준 사무실 운영시간',
        dailyHours: [
          // Sunday
          { dayOfWeek: 0, isOpen: false },
          // Monday-Friday
          ...Array.from({length: 5}, (_, i) => ({
            dayOfWeek: i + 1,
            isOpen: true,
            openTime: '09:00',
            closeTime: '18:00',
            breakStart: '12:00',
            breakEnd: '13:00',
            minStaff: 2,
            maxStaff: 8,
            timeSlots: [
              { hourSlot: 9, requiredStaff: 1, priority: 'normal' },
              { hourSlot: 10, requiredStaff: 2, priority: 'normal' },
              { hourSlot: 11, requiredStaff: 2, priority: 'normal' },
              { hourSlot: 13, requiredStaff: 2, priority: 'normal' },
              { hourSlot: 14, requiredStaff: 3, priority: 'high' }, // Post-lunch peak
              { hourSlot: 15, requiredStaff: 3, priority: 'high' },
              { hourSlot: 16, requiredStaff: 2, priority: 'normal' },
              { hourSlot: 17, requiredStaff: 1, priority: 'normal' }
            ]
          })),
          // Saturday
          { dayOfWeek: 6, isOpen: false }
        ]
      },
      restaurant: {
        templateName: '일반 음식점',
        description: '점심/저녁 피크타임을 고려한 음식점 운영시간',
        dailyHours: [
          // Sunday
          { 
            dayOfWeek: 0, isOpen: true, openTime: '11:00', closeTime: '22:00',
            minStaff: 3, maxStaff: 12,
            timeSlots: [
              { hourSlot: 11, requiredStaff: 2, priority: 'normal' },
              { hourSlot: 12, requiredStaff: 4, priority: 'critical' }, // Lunch peak
              { hourSlot: 13, requiredStaff: 4, priority: 'critical' },
              { hourSlot: 14, requiredStaff: 2, priority: 'normal' },
              { hourSlot: 15, requiredStaff: 2, priority: 'low' },
              { hourSlot: 16, requiredStaff: 2, priority: 'low' },
              { hourSlot: 17, requiredStaff: 3, priority: 'normal' },
              { hourSlot: 18, requiredStaff: 5, priority: 'critical' }, // Dinner peak
              { hourSlot: 19, requiredStaff: 5, priority: 'critical' },
              { hourSlot: 20, requiredStaff: 3, priority: 'high' },
              { hourSlot: 21, requiredStaff: 2, priority: 'normal' }
            ]
          },
          // Monday-Saturday (same pattern)
          ...Array.from({length: 6}, (_, i) => ({
            dayOfWeek: i + 1,
            isOpen: true,
            openTime: '11:00',
            closeTime: '22:00',
            minStaff: 3,
            maxStaff: 12,
            timeSlots: [
              { hourSlot: 11, requiredStaff: 2, priority: 'normal' },
              { hourSlot: 12, requiredStaff: 4, priority: 'critical' },
              { hourSlot: 13, requiredStaff: 4, priority: 'critical' },
              { hourSlot: 14, requiredStaff: 2, priority: 'normal' },
              { hourSlot: 15, requiredStaff: 2, priority: 'low' },
              { hourSlot: 16, requiredStaff: 2, priority: 'low' },
              { hourSlot: 17, requiredStaff: 3, priority: 'normal' },
              { hourSlot: 18, requiredStaff: 5, priority: 'critical' },
              { hourSlot: 19, requiredStaff: 5, priority: 'critical' },
              { hourSlot: 20, requiredStaff: 3, priority: 'high' },
              { hourSlot: 21, requiredStaff: 2, priority: 'normal' }
            ]
          }))
        ]
      },
      retail: {
        templateName: '소매점포',
        description: '주말과 저녁시간 고객이 많은 소매점 운영시간',
        dailyHours: [
          // Sunday
          {
            dayOfWeek: 0, isOpen: true, openTime: '10:00', closeTime: '21:00',
            minStaff: 2, maxStaff: 6,
            timeSlots: Array.from({length: 11}, (_, i) => ({
              hourSlot: i + 10,
              requiredStaff: [2,2,3,3,3,2,2,3,3,2,2][i], // Weekend pattern
              priority: [14,15,19,20].includes(i + 10) ? 'high' : 'normal'
            }))
          },
          // Monday-Friday
          ...Array.from({length: 5}, (_, i) => ({
            dayOfWeek: i + 1,
            isOpen: true,
            openTime: '10:00',
            closeTime: '21:00',
            minStaff: 2,
            maxStaff: 5,
            timeSlots: Array.from({length: 11}, (_, j) => ({
              hourSlot: j + 10,
              requiredStaff: [1,2,2,2,2,2,2,3,3,2,1][j], // Weekday pattern
              priority: [18,19,20].includes(j + 10) ? 'high' : 'normal'
            }))
          })),
          // Saturday
          {
            dayOfWeek: 6, isOpen: true, openTime: '10:00', closeTime: '21:00',
            minStaff: 2, maxStaff: 6,
            timeSlots: Array.from({length: 11}, (_, i) => ({
              hourSlot: i + 10,
              requiredStaff: [2,3,3,3,3,2,2,3,4,3,2][i], // Saturday pattern
              priority: [14,15,16,19,20].includes(i + 10) ? 'high' : 'normal'
            }))
          }
        ]
      }
    };

    // Apply customization
    let templateData = templates[businessType] || templates.office;
    
    if (customization.openTime || customization.closeTime) {
      templateData.dailyHours = templateData.dailyHours.map(day => ({
        ...day,
        openTime: customization.openTime || day.openTime,
        closeTime: customization.closeTime || day.closeTime
      }));
    }

    if (customization.minStaff !== undefined) {
      templateData.dailyHours = templateData.dailyHours.map(day => ({
        ...day,
        minStaff: customization.minStaff
      }));
    }

    // Create the template
    const template = await prisma.operatingHoursTemplate.create({
      data: {
        companyId: company.id,
        templateName: customization.templateName || templateData.templateName,
        description: customization.description || templateData.description,
        isDefault: true, // Set as default
        createdBy: req.user.id,
        dailyHours: {
          create: templateData.dailyHours.map(day => ({
            dayOfWeek: day.dayOfWeek,
            isOpen: day.isOpen ?? true,
            openTime: day.openTime,
            closeTime: day.closeTime,
            breakStart: day.breakStart,
            breakEnd: day.breakEnd,
            minStaff: day.minStaff ?? 1,
            maxStaff: day.maxStaff,
            notes: day.notes,
            timeSlots: {
              create: (day.timeSlots || []).map(slot => ({
                hourSlot: slot.hourSlot,
                requiredStaff: slot.requiredStaff ?? 1,
                preferredStaff: slot.preferredStaff,
                maxStaff: slot.maxStaff,
                priority: slot.priority ?? 'normal',
                skillRequirement: slot.skillRequirement,
                notes: slot.notes
              }))
            }
          }))
        }
      },
      include: {
        dailyHours: {
          include: {
            timeSlots: {
              orderBy: { hourSlot: 'asc' }
            }
          },
          orderBy: { dayOfWeek: 'asc' }
        }
      }
    });

    res.status(201).json({
      message: 'Default template created successfully',
      template,
      businessType
    });
  } catch (error) {
    console.error('Generate default template error:', error);
    res.status(500).json({ message: 'Server error generating default template' });
  }
};

module.exports = {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  updateDailyHours,
  createOverride,
  getEffectiveHours,
  generateDefaultTemplate
};