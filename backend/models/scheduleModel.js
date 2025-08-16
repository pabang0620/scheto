const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class ScheduleModel {
  // Create a new schedule
  static async create(scheduleData) {
    try {
      const schedule = await prisma.schedule.create({
        data: scheduleData,
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
      return schedule;
    } catch (error) {
      throw error;
    }
  }

  // Find schedule by ID
  static async findById(id) {
    try {
      const schedule = await prisma.schedule.findUnique({
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
      return schedule;
    } catch (error) {
      throw error;
    }
  }

  // Get all schedules
  static async findAll() {
    try {
      const schedules = await prisma.schedule.findMany({
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
        orderBy: { date: 'desc' }
      });
      return schedules;
    } catch (error) {
      throw error;
    }
  }

  // Find schedules by employee ID
  static async findByEmployeeId(employeeId) {
    try {
      const schedules = await prisma.schedule.findMany({
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
        orderBy: { date: 'desc' }
      });
      return schedules;
    } catch (error) {
      throw error;
    }
  }

  // Find schedules by date range
  static async findByDateRange(startDate, endDate) {
    try {
      const schedules = await prisma.schedule.findMany({
        where: {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate)
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
        orderBy: { date: 'asc' }
      });
      return schedules;
    } catch (error) {
      throw error;
    }
  }

  // Find schedules by specific date
  static async findByDate(date) {
    try {
      const schedules = await prisma.schedule.findMany({
        where: {
          date: new Date(date)
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
        orderBy: { startTime: 'asc' }
      });
      return schedules;
    } catch (error) {
      throw error;
    }
  }

  // Find schedules by shift
  static async findByShift(shift) {
    try {
      const schedules = await prisma.schedule.findMany({
        where: { shift },
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
        orderBy: { date: 'desc' }
      });
      return schedules;
    } catch (error) {
      throw error;
    }
  }

  // Update schedule
  static async update(id, updateData) {
    try {
      const schedule = await prisma.schedule.update({
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
      return schedule;
    } catch (error) {
      throw error;
    }
  }

  // Delete schedule
  static async delete(id) {
    try {
      await prisma.schedule.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Check for schedule conflicts
  static async checkConflict(employeeId, date, excludeId = null) {
    try {
      const where = {
        employeeId,
        date: new Date(date)
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const existingSchedule = await prisma.schedule.findFirst({
        where
      });

      return !!existingSchedule;
    } catch (error) {
      throw error;
    }
  }

  // Get schedules for a specific week
  static async findByWeek(startOfWeek, endOfWeek) {
    try {
      const schedules = await prisma.schedule.findMany({
        where: {
          date: {
            gte: new Date(startOfWeek),
            lte: new Date(endOfWeek)
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
        orderBy: [
          { date: 'asc' },
          { startTime: 'asc' }
        ]
      });
      return schedules;
    } catch (error) {
      throw error;
    }
  }

  // Get upcoming schedules for an employee
  static async findUpcomingByEmployee(employeeId, limit = 10) {
    try {
      const schedules = await prisma.schedule.findMany({
        where: {
          employeeId,
          date: {
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
        orderBy: { date: 'asc' },
        take: limit
      });
      return schedules;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ScheduleModel;