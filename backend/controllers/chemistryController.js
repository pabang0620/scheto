const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// @desc    Get all chemistry scores
// @route   GET /api/employees/chemistry
// @access  Private
const getAllChemistry = async (req, res) => {
  try {
    const chemistry = await prisma.employeeChemistry.findMany({
      include: {
        employee1: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
            department: true
          }
        },
        employee2: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
            department: true
          }
        }
      },
      orderBy: [
        { employee1Id: 'asc' },
        { employee2Id: 'asc' }
      ]
    });

    res.json({ chemistry });
  } catch (error) {
    console.error('Get all chemistry error:', error);
    res.status(500).json({ message: 'Server error getting chemistry scores' });
  }
};

// @desc    Update chemistry between two employees
// @route   PUT /api/employees/chemistry
// @access  Private
const updateChemistry = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { employee1Id, employee2Id, score } = req.body;

    // Validate that employees are different
    if (employee1Id === employee2Id) {
      return res.status(400).json({ message: 'Cannot set chemistry score for the same employee' });
    }

    // Check if both employees exist
    const employee1 = await prisma.employee.findUnique({
      where: { id: employee1Id }
    });

    const employee2 = await prisma.employee.findUnique({
      where: { id: employee2Id }
    });

    if (!employee1) {
      return res.status(404).json({ message: 'Employee 1 not found' });
    }

    if (!employee2) {
      return res.status(404).json({ message: 'Employee 2 not found' });
    }

    // Validate score range
    if (score < 1 || score > 5) {
      return res.status(400).json({ message: 'Chemistry score must be between 1 and 5' });
    }

    // Ensure consistent ordering (smaller id first)
    const [emp1Id, emp2Id] = employee1Id < employee2Id ? [employee1Id, employee2Id] : [employee2Id, employee1Id];

    // Update or create chemistry record
    const chemistry = await prisma.employeeChemistry.upsert({
      where: {
        employee1Id_employee2Id: {
          employee1Id: emp1Id,
          employee2Id: emp2Id
        }
      },
      update: {
        score
      },
      create: {
        employee1Id: emp1Id,
        employee2Id: emp2Id,
        score
      },
      include: {
        employee1: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
            department: true
          }
        },
        employee2: {
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
      message: 'Chemistry score updated successfully',
      chemistry
    });
  } catch (error) {
    console.error('Update chemistry error:', error);
    res.status(500).json({ message: 'Server error updating chemistry score' });
  }
};

// @desc    Get chemistry scores for specific employee
// @route   GET /api/employees/:id/chemistry
// @access  Private
const getEmployeeChemistry = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Get chemistry scores where this employee is involved
    const chemistry = await prisma.employeeChemistry.findMany({
      where: {
        OR: [
          { employee1Id: parseInt(id) },
          { employee2Id: parseInt(id) }
        ]
      },
      include: {
        employee1: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
            department: true
          }
        },
        employee2: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
            department: true
          }
        }
      },
      orderBy: [
        { employee1Id: 'asc' },
        { employee2Id: 'asc' }
      ]
    });

    // Transform the data to show the other employee and their chemistry score
    const chemistryScores = chemistry.map(item => {
      const isEmployee1 = item.employee1Id === parseInt(id);
      const otherEmployee = isEmployee1 ? item.employee2 : item.employee1;
      
      return {
        id: item.id,
        employee: otherEmployee,
        score: item.score
      };
    });

    res.json({ 
      employeeId: parseInt(id),
      employee,
      chemistry: chemistryScores 
    });
  } catch (error) {
    console.error('Get employee chemistry error:', error);
    res.status(500).json({ message: 'Server error getting employee chemistry' });
  }
};

module.exports = {
  getAllChemistry,
  updateChemistry,
  getEmployeeChemistry
};