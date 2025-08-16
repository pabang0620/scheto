const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// @desc    Get employee notes
// @route   GET /api/employees/:id/notes
// @access  Private
const getEmployeeNotes = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Get employee notes
    const notes = await prisma.employeeNote.findMany({
      where: { employeeId: parseInt(id) },
      orderBy: { createdAt: 'desc' },
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

    res.json({ notes });
  } catch (error) {
    console.error('Get employee notes error:', error);
    res.status(500).json({ message: 'Server error getting employee notes' });
  }
};

// @desc    Add new note
// @route   POST /api/employees/:id/notes
// @access  Private
const addEmployeeNote = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { type, content, priority } = req.body;
    const createdBy = req.userId; // From auth middleware

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Validate type
    const validTypes = ['praise', 'caution', 'general'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid note type. Must be one of: praise, caution, general' });
    }

    // Validate priority
    const validPriorities = ['high', 'medium', 'low'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority. Must be one of: high, medium, low' });
    }

    // Create note
    const note = await prisma.employeeNote.create({
      data: {
        employeeId: parseInt(id),
        type,
        content,
        priority,
        createdBy
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
      message: 'Employee note added successfully',
      note
    });
  } catch (error) {
    console.error('Add employee note error:', error);
    res.status(500).json({ message: 'Server error adding employee note' });
  }
};

// @desc    Delete a note
// @route   DELETE /api/notes/:id
// @access  Private
const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if note exists
    const note = await prisma.employeeNote.findUnique({
      where: { id: parseInt(id) }
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Only allow deletion if user created the note or is admin/manager
    if (note.createdBy !== req.userId && !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. You can only delete your own notes' });
    }

    // Delete note
    await prisma.employeeNote.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ message: 'Server error deleting note' });
  }
};

module.exports = {
  getEmployeeNotes,
  addEmployeeNote,
  deleteNote
};