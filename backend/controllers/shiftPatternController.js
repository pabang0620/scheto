const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all shift patterns for a company
const getShiftPatterns = async (req, res) => {
  try {
    // For now, get patterns without auth (development mode)
    // TODO: Get companyId from authenticated user
    const companyId = req.query.companyId || 1; // Default to company 1 for testing
    
    const patterns = await prisma.shiftPattern.findMany({
      where: { 
        OR: [
          { companyId: parseInt(companyId) },
          { companyId: null } // Include patterns without company (for migration)
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ patterns });
  } catch (error) {
    console.error('Get shift patterns error:', error);
    res.status(500).json({ message: 'Failed to get shift patterns' });
  }
};

// Get single shift pattern
const getShiftPattern = async (req, res) => {
  try {
    const { id } = req.params;
    
    const pattern = await prisma.shiftPattern.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!pattern) {
      return res.status(404).json({ message: 'Pattern not found' });
    }
    
    res.json({ pattern });
  } catch (error) {
    console.error('Get shift pattern error:', error);
    res.status(500).json({ message: 'Failed to get shift pattern' });
  }
};

// Create shift pattern
const createShiftPattern = async (req, res) => {
  try {
    const {
      name,
      startTime,
      endTime,
      requiredStaff,
      color,
      days,
      requirements,
      enabled
    } = req.body;
    
    // Calculate duration in minutes
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    let duration = (end - start) / (1000 * 60);
    if (duration < 0) duration += 24 * 60; // Handle overnight shifts
    
    // TODO: Get companyId from authenticated user
    const companyId = req.body.companyId || 1; // Default to company 1 for testing
    const createdBy = req.body.createdBy || 1; // Default to user 1 for testing
    
    const pattern = await prisma.shiftPattern.create({
      data: {
        companyId: parseInt(companyId),
        name,
        startTime,
        endTime,
        duration: Math.round(duration),
        requiredStaff: parseInt(requiredStaff),
        color: color || '#3B82F6',
        days: days || [1, 2, 3, 4, 5],
        requirements: requirements || {
          minRankS: 0,
          minRankA: 0,
          minRankB: 0,
          minExperience3Years: 0,
          minExperience5Years: 0
        },
        enabled: enabled !== false,
        shiftType: 'custom',
        createdBy: parseInt(createdBy)
      }
    });
    
    res.status(201).json({ pattern });
  } catch (error) {
    console.error('Create shift pattern error:', error);
    res.status(500).json({ message: 'Failed to create shift pattern' });
  }
};

// Update shift pattern
const updateShiftPattern = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      startTime,
      endTime,
      requiredStaff,
      color,
      days,
      requirements,
      enabled
    } = req.body;
    
    // Check if pattern exists
    const existing = await prisma.shiftPattern.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existing) {
      return res.status(404).json({ message: 'Pattern not found' });
    }
    
    // Calculate duration if times are provided
    let duration = existing.duration;
    if (startTime && endTime) {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      duration = (end - start) / (1000 * 60);
      if (duration < 0) duration += 24 * 60; // Handle overnight shifts
    }
    
    const pattern = await prisma.shiftPattern.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(startTime && endTime && { duration: Math.round(duration) }),
        ...(requiredStaff !== undefined && { requiredStaff: parseInt(requiredStaff) }),
        ...(color && { color }),
        ...(days && { days }),
        ...(requirements && { requirements }),
        ...(enabled !== undefined && { enabled })
      }
    });
    
    res.json({ pattern });
  } catch (error) {
    console.error('Update shift pattern error:', error);
    res.status(500).json({ message: 'Failed to update shift pattern' });
  }
};

// Delete shift pattern
const deleteShiftPattern = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if pattern exists
    const existing = await prisma.shiftPattern.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existing) {
      return res.status(404).json({ message: 'Pattern not found' });
    }
    
    // Check if pattern is used in any schedules
    const schedulesCount = await prisma.schedule.count({
      where: { shiftPatternId: parseInt(id) }
    });
    
    if (schedulesCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete pattern that is used in schedules' 
      });
    }
    
    await prisma.shiftPattern.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Pattern deleted successfully' });
  } catch (error) {
    console.error('Delete shift pattern error:', error);
    res.status(500).json({ message: 'Failed to delete shift pattern' });
  }
};

// Bulk update patterns (for saving all at once)
const bulkUpdatePatterns = async (req, res) => {
  try {
    const { patterns } = req.body;
    const companyId = req.body.companyId || 1; // Default to company 1 for testing
    const createdBy = req.body.createdBy || 1; // Default to user 1 for testing
    
    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete patterns not in the list (optional)
      if (req.body.deleteOthers) {
        const patternIds = patterns.filter(p => p.id).map(p => p.id);
        await tx.shiftPattern.deleteMany({
          where: {
            companyId: parseInt(companyId),
            NOT: { id: { in: patternIds } }
          }
        });
      }
      
      const updatedPatterns = [];
      
      for (const pattern of patterns) {
        // Calculate duration
        const start = new Date(`2000-01-01T${pattern.start}`);
        const end = new Date(`2000-01-01T${pattern.end}`);
        let duration = (end - start) / (1000 * 60);
        if (duration < 0) duration += 24 * 60;
        
        if (pattern.id) {
          // Update existing pattern
          const updated = await tx.shiftPattern.update({
            where: { id: pattern.id },
            data: {
              name: pattern.name,
              startTime: pattern.start,
              endTime: pattern.end,
              duration: Math.round(duration),
              requiredStaff: parseInt(pattern.requiredStaff),
              color: pattern.color || '#3B82F6',
              days: pattern.days || [1, 2, 3, 4, 5],
              requirements: pattern.requirements || {},
              enabled: pattern.enabled !== false
            }
          });
          updatedPatterns.push(updated);
        } else {
          // Create new pattern
          const created = await tx.shiftPattern.create({
            data: {
              companyId: parseInt(companyId),
              name: pattern.name,
              startTime: pattern.start,
              endTime: pattern.end,
              duration: Math.round(duration),
              requiredStaff: parseInt(pattern.requiredStaff),
              color: pattern.color || '#3B82F6',
              days: pattern.days || [1, 2, 3, 4, 5],
              requirements: pattern.requirements || {},
              enabled: pattern.enabled !== false,
              shiftType: 'custom',
              createdBy: parseInt(createdBy)
            }
          });
          updatedPatterns.push(created);
        }
      }
      
      return updatedPatterns;
    });
    
    res.json({ patterns: result });
  } catch (error) {
    console.error('Bulk update patterns error:', error);
    res.status(500).json({ message: 'Failed to update patterns' });
  }
};

module.exports = {
  getShiftPatterns,
  getShiftPattern,
  createShiftPattern,
  updateShiftPattern,
  deleteShiftPattern,
  bulkUpdatePatterns
};