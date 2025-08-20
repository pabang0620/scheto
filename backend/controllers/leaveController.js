const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// @desc    Get all leave requests
// @route   GET /api/leaves
// @access  Private
const getAllLeaves = async (req, res) => {
  try {
    const leaves = await prisma.leave.findMany({
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
      orderBy: { createdAt: 'desc' }
    });

    res.json({ leaves });
  } catch (error) {
    console.error('Get all leaves error:', error);
    res.status(500).json({ message: 'Server error getting leave requests' });
  }
};

// @desc    Get leave request by ID
// @route   GET /api/leaves/:id
// @access  Private
const getLeaveById = async (req, res) => {
  try {
    const { id } = req.params;

    const leave = await prisma.leave.findUnique({
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

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    res.json({ leave });
  } catch (error) {
    console.error('Get leave by ID error:', error);
    res.status(500).json({ message: 'Server error getting leave request' });
  }
};

// @desc    Get all pending leave requests
// @route   GET /api/leaves/pending
// @access  Private (Admin/Manager only)
const getPendingLeaves = async (req, res) => {
  try {
    // Check if user has appropriate role
    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    });

    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return res.status(403).json({ message: 'Access denied. Admin or Manager role required.' });
    }

    const leaves = await prisma.leave.findMany({
      where: { status: 'pending' },
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

    res.json(leaves);
  } catch (error) {
    console.error('Get pending leaves error:', error);
    res.status(500).json({ message: 'Server error getting pending leave requests' });
  }
};

// @desc    Get leave requests by employee ID
// @route   GET /api/leaves/employee/:employeeId
// @access  Private
const getLeavesByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const leaves = await prisma.leave.findMany({
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
      orderBy: { createdAt: 'desc' }
    });

    res.json({ leaves });
  } catch (error) {
    console.error('Get leaves by employee error:', error);
    res.status(500).json({ message: 'Server error getting employee leave requests' });
  }
};

// @desc    Get my leave requests
// @route   GET /api/leaves/my-requests
// @access  Private
const getMyLeaves = async (req, res) => {
  try {
    // Get employee data for the current user
    const employee = await prisma.employee.findFirst({
      where: { userId: req.userId }
    });

    if (!employee) {
      return res.json({ data: [] });
    }

    const leaves = await prisma.leave.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ data: leaves });
  } catch (error) {
    console.error('Get my leaves error:', error);
    res.status(500).json({ message: 'Server error getting leave requests' });
  }
};

// @desc    Create new leave request
// @route   POST /api/leaves
// @access  Private
const createLeave = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { employeeId, startDate, endDate, type, reason } = req.body;

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employeeId) }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return res.status(400).json({ message: 'Start date cannot be after end date' });
    }

    // Check for overlapping leave requests
    const overlappingLeave = await prisma.leave.findFirst({
      where: {
        employeeId: parseInt(employeeId),
        status: { not: 'rejected' },
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start }
          }
        ]
      }
    });

    if (overlappingLeave) {
      return res.status(400).json({ message: 'Employee has an overlapping leave request for this period' });
    }

    const leave = await prisma.leave.create({
      data: {
        employeeId: parseInt(employeeId),
        startDate: start,
        endDate: end,
        type,
        reason,
        status: 'pending'
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
      message: 'Leave request created successfully',
      leave
    });
  } catch (error) {
    console.error('Create leave error:', error);
    res.status(500).json({ message: 'Server error creating leave request' });
  }
};

// @desc    Update leave request
// @route   PUT /api/leaves/:id
// @access  Private
const updateLeave = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { employeeId, startDate, endDate, type, reason, status } = req.body;

    // Check if leave request exists
    const existingLeave = await prisma.leave.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingLeave) {
      return res.status(404).json({ message: 'Leave request not found' });
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

    // Validate date range (if dates are being updated)
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        return res.status(400).json({ message: 'Start date cannot be after end date' });
      }
    }

    // Check for overlapping leave requests (if dates or employee is being changed)
    if (employeeId || startDate || endDate) {
      const updatedEmployeeId = employeeId || existingLeave.employeeId;
      const updatedStartDate = startDate ? new Date(startDate) : existingLeave.startDate;
      const updatedEndDate = endDate ? new Date(endDate) : existingLeave.endDate;

      const overlappingLeave = await prisma.leave.findFirst({
        where: {
          employeeId: parseInt(updatedEmployeeId),
          status: { not: 'rejected' },
          id: { not: parseInt(id) },
          OR: [
            {
              startDate: { lte: updatedEndDate },
              endDate: { gte: updatedStartDate }
            }
          ]
        }
      });

      if (overlappingLeave) {
        return res.status(400).json({ message: 'Employee has an overlapping leave request for this period' });
      }
    }

    const updatedLeave = await prisma.leave.update({
      where: { id: parseInt(id) },
      data: {
        ...(employeeId && { employeeId: parseInt(employeeId) }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(type && { type }),
        ...(reason && { reason }),
        ...(status && { status })
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
      message: 'Leave request updated successfully',
      leave: updatedLeave
    });
  } catch (error) {
    console.error('Update leave error:', error);
    res.status(500).json({ message: 'Server error updating leave request' });
  }
};

// @desc    Delete leave request
// @route   DELETE /api/leaves/:id
// @access  Private
const deleteLeave = async (req, res) => {
  try {
    const { id } = req.params;

    const leave = await prisma.leave.findUnique({
      where: { id: parseInt(id) }
    });

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    await prisma.leave.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    console.error('Delete leave error:', error);
    res.status(500).json({ message: 'Server error deleting leave request' });
  }
};

// @desc    Approve leave request
// @route   PUT /api/leaves/:id/approve
// @access  Private (Admin/Manager only)
const approveLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    // Check if leave request exists
    const existingLeave = await prisma.leave.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingLeave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // Update leave status to approved
    const updatedLeave = await prisma.leave.update({
      where: { id: parseInt(id) },
      data: {
        status: 'approved',
        adminComment: comment || 'Approved',
        reviewedAt: new Date(),
        reviewedBy: req.user.id
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
      message: 'Leave request approved successfully',
      leave: updatedLeave
    });
  } catch (error) {
    console.error('Approve leave error:', error);
    res.status(500).json({ message: 'Server error approving leave request' });
  }
};

// @desc    Reject leave request
// @route   PUT /api/leaves/:id/reject
// @access  Private (Admin/Manager only)
const rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    // Check if leave request exists
    const existingLeave = await prisma.leave.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingLeave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // Update leave status to rejected
    const updatedLeave = await prisma.leave.update({
      where: { id: parseInt(id) },
      data: {
        status: 'rejected',
        adminComment: comment || 'Rejected',
        reviewedAt: new Date(),
        reviewedBy: req.user.id
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
      message: 'Leave request rejected successfully',
      leave: updatedLeave
    });
  } catch (error) {
    console.error('Reject leave error:', error);
    res.status(500).json({ message: 'Server error rejecting leave request' });
  }
};

module.exports = {
  getAllLeaves,
  getLeaveById,
  getPendingLeaves,
  getLeavesByEmployee,
  getMyLeaves,
  createLeave,
  updateLeave,
  deleteLeave,
  approveLeave,
  rejectLeave
};