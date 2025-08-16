const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Function to calculate rank based on total score
const calculateRank = (totalScore) => {
  if (totalScore >= 23) return 'S'; // Top 10%: 23-25 points
  if (totalScore >= 20) return 'A'; // Top 25%: 20-22 points
  if (totalScore >= 16) return 'B'; // Mid-high 40%: 16-19 points
  if (totalScore >= 11) return 'C'; // Mid 20%: 11-15 points
  return 'D'; // Low 5%: 5-10 points
};

// @desc    Get employee ability and rank
// @route   GET /api/abilities/:employeeId
// @access  Private
const getEmployeeAbility = async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employeeId) }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Get employee ability
    const ability = await prisma.ability.findUnique({
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
      }
    });

    if (!ability) {
      // Return default abilities array if none exists
      return res.json({
        employeeId: parseInt(employeeId),
        abilities: [
          { skill: '청소', rank: 'C' },
          { skill: '요리', rank: 'C' },
          { skill: '서빙', rank: 'C' },
          { skill: '계산', rank: 'C' },
          { skill: '재고관리', rank: 'C' }
        ],
        employee
      });
    }

    // Convert fixed fields to abilities array format
    const abilities = [];
    
    // Map fields to skills (you can customize these mappings)
    if (ability.workSkill) {
      const rankMap = { 5: 'S', 4: 'A', 3: 'B', 2: 'C', 1: 'D' };
      abilities.push(
        { skill: '청소', rank: rankMap[ability.workSkill] || 'C' },
        { skill: '요리', rank: rankMap[ability.workSkill] || 'C' },
        { skill: '서빙', rank: rankMap[ability.workSkill] || 'C' }
      );
    }
    
    if (ability.customerService) {
      const rankMap = { 5: 'S', 4: 'A', 3: 'B', 2: 'C', 1: 'D' };
      abilities.push({ skill: '고객응대', rank: rankMap[ability.customerService] || 'C' });
    }
    
    if (ability.flexibility) {
      const rankMap = { 5: 'S', 4: 'A', 3: 'B', 2: 'C', 1: 'D' };
      abilities.push({ skill: '유연성', rank: rankMap[ability.flexibility] || 'C' });
    }

    // If no abilities were created from fields, return defaults
    if (abilities.length === 0) {
      abilities.push(
        { skill: '청소', rank: 'C' },
        { skill: '요리', rank: 'C' },
        { skill: '서빙', rank: 'C' },
        { skill: '계산', rank: 'C' },
        { skill: '재고관리', rank: 'C' }
      );
    }

    res.json({ 
      ...ability,
      abilities 
    });
  } catch (error) {
    console.error('Get employee ability error:', error);
    res.status(500).json({ message: 'Server error getting employee ability' });
  }
};

// @desc    Update employee ability (and auto-calculate rank)
// @route   PUT /api/abilities/:employeeId
// @access  Private
const updateEmployeeAbility = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { abilities, experience, workSkill, teamChemistry, customerService, flexibility } = req.body;

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employeeId) }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Handle dynamic abilities array (frontend sends this format)
    if (abilities && Array.isArray(abilities)) {
      // Map abilities to fixed fields based on skill names
      const mappedFields = {
        experience: 3,
        workSkill: 3,
        teamChemistry: 3,
        customerService: 3,
        flexibility: 3
      };

      // Process abilities array to calculate average rank for each category
      abilities.forEach(ability => {
        const rankValue = { 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1 }[ability.rank] || 1;
        
        // Map skill names to fields (simplified mapping)
        if (ability.skill && ability.skill.includes('경험')) mappedFields.experience = rankValue;
        else if (ability.skill && (ability.skill.includes('요리') || ability.skill.includes('서빙') || ability.skill.includes('청소'))) mappedFields.workSkill = rankValue;
        else if (ability.skill && ability.skill.includes('팀')) mappedFields.teamChemistry = rankValue;
        else if (ability.skill && ability.skill.includes('고객')) mappedFields.customerService = rankValue;
        else if (ability.skill && ability.skill.includes('유연')) mappedFields.flexibility = rankValue;
      });

      // Calculate total score and rank
      const totalScore = Object.values(mappedFields).reduce((sum, val) => sum + val, 0);
      const rank = calculateRank(totalScore);

      // Store abilities array as JSON in a temporary field or use mapped values
      const abilityData = await prisma.ability.upsert({
        where: { employeeId: parseInt(employeeId) },
        update: {
          experience: mappedFields.experience,
          workSkill: mappedFields.workSkill,
          teamChemistry: mappedFields.teamChemistry,
          customerService: mappedFields.customerService,
          flexibility: mappedFields.flexibility,
          totalScore,
          rank
        },
        create: {
          employeeId: parseInt(employeeId),
          experience: mappedFields.experience,
          workSkill: mappedFields.workSkill,
          teamChemistry: mappedFields.teamChemistry,
          customerService: mappedFields.customerService,
          flexibility: mappedFields.flexibility,
          totalScore,
          rank
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

      // Return abilities in the same format as sent
      return res.json({
        message: 'Employee ability updated successfully',
        abilities,
        ability: abilityData
      });
    }

    // Handle traditional fixed fields format (backward compatibility)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Calculate total score and rank
    const totalScore = experience + workSkill + teamChemistry + customerService + flexibility;
    const rank = calculateRank(totalScore);

    // Update or create ability record
    const ability = await prisma.ability.upsert({
      where: { employeeId: parseInt(employeeId) },
      update: {
        experience,
        workSkill,
        teamChemistry,
        customerService,
        flexibility,
        totalScore,
        rank
      },
      create: {
        employeeId: parseInt(employeeId),
        experience,
        workSkill,
        teamChemistry,
        customerService,
        flexibility,
        totalScore,
        rank
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
      message: 'Employee ability updated successfully',
      ability
    });
  } catch (error) {
    console.error('Update employee ability error:', error);
    res.status(500).json({ message: 'Server error updating employee ability' });
  }
};

module.exports = {
  getEmployeeAbility,
  updateEmployeeAbility
};