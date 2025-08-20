const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private
const getAllEmployees = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        user: {
          select: {
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ employees });
  } catch (error) {
    console.error('Get all employees error:', error);
    res.status(500).json({ message: 'Server error getting employees' });
  }
};

// @desc    Get employee by ID
// @route   GET /api/employees/:id
// @access  Private
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: {
        schedules: true,
        leaves: true
      }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ employee });
  } catch (error) {
    console.error('Get employee by ID error:', error);
    res.status(500).json({ message: 'Server error getting employee' });
  }
};

// @desc    Create new employee
// @route   POST /api/employees
// @access  Private
const createEmployee = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, position, department, phone, address, role } = req.body;

    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Check if employee with email already exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { email }
    });

    if (existingEmployee) {
      return res.status(400).json({ message: 'Employee with this email already exists' });
    }

    // Create user first
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: password || '123456', // Default password
        role: role || 'employee'
      }
    });

    // Then create employee
    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        name,
        email,
        position,
        department,
        phone: phone || null,
        address: address || null
      },
      include: {
        user: {
          select: {
            email: true,
            role: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Employee created successfully',
      employee
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ message: 'Server error creating employee' });
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private
const updateEmployee = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, email, position, department, phone, address } = req.body;

    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if email is being changed and if new email already exists
    if (email && email !== existingEmployee.email) {
      const emailExists = await prisma.employee.findUnique({
        where: { email }
      });

      if (emailExists) {
        return res.status(400).json({ message: 'Employee with this email already exists' });
      }
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(position && { position }),
        ...(department && { department }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address })
      }
    });

    res.json({
      message: 'Employee updated successfully',
      employee: updatedEmployee
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ message: 'Server error updating employee' });
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    await prisma.employee.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Server error deleting employee' });
  }
};

// Get employee schedules
const getEmployeeSchedules = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    console.log('Getting schedules for employee:', id);
    console.log('Date range:', startDate, 'to', endDate);

    // Validate employee ID
    const employeeId = parseInt(id);
    if (isNaN(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Build where condition
    const whereCondition = {
      employeeId: employeeId
    };

    // Add date range if provided
    if (startDate && endDate) {
      whereCondition.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    console.log('Where condition:', whereCondition);

    const schedules = await prisma.schedule.findMany({
      where: whereCondition,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            position: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    console.log(`Found ${schedules.length} schedules for employee ${id}`);
    
    // Double-check that all schedules belong to the requested employee
    const validSchedules = schedules.filter(schedule => schedule.employeeId === employeeId);
    
    if (validSchedules.length !== schedules.length) {
      console.warn(`Warning: Found ${schedules.length - validSchedules.length} schedules that don't belong to employee ${id}`);
    }
    
    res.json(validSchedules);
  } catch (error) {
    console.error('Get employee schedules error:', error);
    res.status(500).json({ message: 'Server error fetching employee schedules' });
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeSchedules
};