const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// @desc    Get company settings
// @route   GET /api/company/settings
// @access  Private (All authenticated users)
const getCompanySettings = async (req, res) => {
  try {
    console.log('Getting company settings for user:', req.user);
    
    // First try to get company associated with the logged-in user
    let company = await prisma.company.findUnique({
      where: { userId: req.user.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    // If no company exists for this user, try to get any company (for employees)
    if (!company) {
      company = await prisma.company.findFirst({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      });
    }

    // If still no company exists, create default company settings for admin users
    if (!company && req.user.role === 'admin') {
      company = await prisma.company.create({
        data: {
          userId: req.user.id,
          companyName: 'My Company',
          industry: 'general',
          companySize: 'small',
          workType: 'flexible',
          defaultStartTime: '09:00',
          defaultEndTime: '18:00',
          showLeaveInSchedule: false,
          minStaffRequired: 1
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      });
    }

    // If no company exists at all, return empty settings
    if (!company) {
      return res.json({
        companyName: '',
        industry: 'general',
        companySize: 'small',
        workType: 'flexible',
        defaultStartTime: '09:00',
        defaultEndTime: '18:00',
        showLeaveInSchedule: false,
        minStaffRequired: 1,
        workDays: ['mon', 'tue', 'wed', 'thu', 'fri']
      });
    }

    res.json(company);
  } catch (error) {
    console.error('Get company settings error:', error);
    res.status(500).json({ message: 'Server error getting company settings' });
  }
};

// @desc    Update company settings
// @route   PUT /api/company/settings
// @access  Private (Admin only)
const updateCompanySettings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      companyName,
      industry,
      companySize,
      address,
      phone,
      workType,
      workDays,
      defaultStartTime,
      defaultEndTime,
      showLeaveInSchedule,
      minStaffRequired
    } = req.body;

    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { userId: req.user.id }
    });

    if (!existingCompany) {
      // Create new company settings if not exists
      const newCompany = await prisma.company.create({
        data: {
          userId: req.user.id,
          companyName: companyName || 'My Company',
          industry: industry || 'general',
          companySize: companySize || 'small',
          address,
          phone,
          workType: workType || 'flexible',
          workDays: workDays || null,
          defaultStartTime: defaultStartTime || '09:00',
          defaultEndTime: defaultEndTime || '18:00',
          showLeaveInSchedule: showLeaveInSchedule || false,
          minStaffRequired: minStaffRequired || null
        }
      });

      return res.json({
        message: 'Company settings created successfully',
        company: newCompany
      });
    }

    // Update existing company settings
    const updatedCompany = await prisma.company.update({
      where: { userId: req.user.id },
      data: {
        ...(companyName && { companyName }),
        ...(industry && { industry }),
        ...(companySize && { companySize }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(workType && { workType }),
        ...(workDays !== undefined && { workDays }),
        ...(defaultStartTime !== undefined && { defaultStartTime }),
        ...(defaultEndTime !== undefined && { defaultEndTime }),
        ...(showLeaveInSchedule !== undefined && { showLeaveInSchedule }),
        ...(minStaffRequired !== undefined && { minStaffRequired })
      }
    });

    res.json({
      message: 'Company settings updated successfully',
      company: updatedCompany
    });
  } catch (error) {
    console.error('Update company settings error:', error);
    res.status(500).json({ message: 'Server error updating company settings' });
  }
};

// @desc    Get work type options
// @route   GET /api/company/work-types
// @access  Public
const getWorkTypes = async (req, res) => {
  const workTypes = [
    {
      value: 'fixed',
      label: '고정 근무제',
      description: '모든 직원이 정해진 요일에 출근 (주5일제)',
      showLeaveInSchedule: true
    },
    {
      value: 'shift',
      label: '시프트제',
      description: '직원별로 근무 일정이 다름 (병원, 공장)',
      showLeaveInSchedule: false
    },
    {
      value: 'flexible',
      label: '유동 근무제',
      description: '필요에 따라 스케줄 배정 (식당, 카페, 알바)',
      showLeaveInSchedule: false
    }
  ];

  res.json(workTypes);
};

module.exports = {
  getCompanySettings,
  updateCompanySettings,
  getWorkTypes
};