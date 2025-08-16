const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class LeaveModel {
  // Create a new leave request
  static async create(leaveData) {
    try {
      const leave = await prisma.leave.create({
        data: leaveData,
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
      return leave;
    } catch (error) {
      throw error;
    }
  }

  // Find leave request by ID
  static async findById(id) {
    try {
      const leave = await prisma.leave.findUnique({
        where: { id },
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
      return leave;
    } catch (error) {
      throw error;
    }
  }

  // Get all leave requests
  static async findAll() {
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
      return leaves;
    } catch (error) {
      throw error;
    }
  }

  // Find leave requests by employee ID
  static async findByEmployeeId(employeeId) {
    try {
      const leaves = await prisma.leave.findMany({
        where: { employeeId },
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
      return leaves;
    } catch (error) {
      throw error;
    }
  }

  // Find leave requests by status
  static async findByStatus(status) {
    try {
      const leaves = await prisma.leave.findMany({
        where: { status },
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
      return leaves;
    } catch (error) {
      throw error;
    }
  }

  // Find leave requests by type
  static async findByType(type) {
    try {
      const leaves = await prisma.leave.findMany({
        where: { type },
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
      return leaves;
    } catch (error) {
      throw error;
    }
  }

  // Find leave requests by date range
  static async findByDateRange(startDate, endDate) {
    try {
      const leaves = await prisma.leave.findMany({
        where: {
          OR: [
            {
              startDate: {
                gte: new Date(startDate),
                lte: new Date(endDate)
              }
            },
            {
              endDate: {
                gte: new Date(startDate),
                lte: new Date(endDate)
              }
            },
            {
              AND: [
                { startDate: { lte: new Date(startDate) } },
                { endDate: { gte: new Date(endDate) } }
              ]
            }
          ]
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
        },
        orderBy: { startDate: 'asc' }
      });
      return leaves;
    } catch (error) {
      throw error;
    }
  }

  // Update leave request
  static async update(id, updateData) {
    try {
      const leave = await prisma.leave.update({
        where: { id },
        data: updateData,
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
      return leave;
    } catch (error) {
      throw error;
    }
  }

  // Delete leave request
  static async delete(id) {
    try {
      await prisma.leave.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Check for overlapping leave requests
  static async checkOverlap(employeeId, startDate, endDate, excludeId = null) {
    try {
      const where = {
        employeeId,
        status: { not: 'rejected' },
        OR: [
          {
            startDate: { lte: new Date(endDate) },
            endDate: { gte: new Date(startDate) }
          }
        ]
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const overlappingLeave = await prisma.leave.findFirst({
        where
      });

      return !!overlappingLeave;
    } catch (error) {
      throw error;
    }
  }

  // Get pending leave requests
  static async findPending() {
    try {
      const leaves = await prisma.leave.findMany({
        where: { status: 'pending' },
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
        orderBy: { createdAt: 'asc' }
      });
      return leaves;
    } catch (error) {
      throw error;
    }
  }

  // Get upcoming approved leaves
  static async findUpcomingApproved() {
    try {
      const leaves = await prisma.leave.findMany({
        where: {
          status: 'approved',
          startDate: {
            gte: new Date()
          }
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
        },
        orderBy: { startDate: 'asc' }
      });
      return leaves;
    } catch (error) {
      throw error;
    }
  }

  // Get leave statistics for an employee
  static async getEmployeeLeaveStats(employeeId, year) {
    try {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);

      const stats = await prisma.leave.groupBy({
        by: ['type', 'status'],
        where: {
          employeeId,
          startDate: {
            gte: startOfYear,
            lte: endOfYear
          }
        },
        _count: {
          id: true
        }
      });

      return stats;
    } catch (error) {
      throw error;
    }
  }

  // Get current active leaves
  static async findCurrentActive() {
    try {
      const today = new Date();
      const leaves = await prisma.leave.findMany({
        where: {
          status: 'approved',
          startDate: { lte: today },
          endDate: { gte: today }
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
        },
        orderBy: { startDate: 'asc' }
      });
      return leaves;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = LeaveModel;