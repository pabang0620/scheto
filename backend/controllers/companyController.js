const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// @desc    Get company settings
// @route   GET /api/company/settings
// @access  Private (Admin only)
const getCompanySettings = async (req, res) => {
  try {
    // Get company associated with the logged-in user
    const company = await prisma.company.findUnique({
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

    if (!company) {
      return res.status(404).json({ message: 'Company settings not found' });
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