const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class EmployeeModel {
  // Create a new employee
  static async create(employeeData) {
    try {
      const employee = await prisma.employee.create({
        data: employeeData
      });
      return employee;
    } catch (error) {
      throw error;
    }
  }

  // Find employee by ID
  static async findById(id) {
    try {
      const employee = await prisma.employee.findUnique({
        where: { id },
        include: {
          schedules: {
            orderBy: { date: 'desc' }
          },
          leaves: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      return employee;
    } catch (error) {
      throw error;
    }
  }

  // Find employee by email
  static async findByEmail(email) {
    try {
      const employee = await prisma.employee.findUnique({
        where: { email }
      });
      return employee;
    } catch (error) {
      throw error;
    }
  }

  // Get all employees
  static async findAll() {
    try {
      const employees = await prisma.employee.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return employees;
    } catch (error) {
      throw error;
    }
  }

  // Update employee
  static async update(id, updateData) {
    try {
      const employee = await prisma.employee.update({
        where: { id },
        data: updateData
      });
      return employee;
    } catch (error) {
      throw error;
    }
  }

  // Delete employee
  static async delete(id) {
    try {
      await prisma.employee.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Find employees by department
  static async findByDepartment(department) {
    try {
      const employees = await prisma.employee.findMany({
        where: { department },
        orderBy: { name: 'asc' }
      });
      return employees;
    } catch (error) {
      throw error;
    }
  }

  // Find employees by position
  static async findByPosition(position) {
    try {
      const employees = await prisma.employee.findMany({
        where: { position },
        orderBy: { name: 'asc' }
      });
      return employees;
    } catch (error) {
      throw error;
    }
  }

  // Search employees by name
  static async searchByName(name) {
    try {
      const employees = await prisma.employee.findMany({
        where: {
          name: {
            contains: name,
            mode: 'insensitive'
          }
        },
        orderBy: { name: 'asc' }
      });
      return employees;
    } catch (error) {
      throw error;
    }
  }

  // Get employee count by department
  static async getCountByDepartment() {
    try {
      const result = await prisma.employee.groupBy({
        by: ['department'],
        _count: {
          id: true
        }
      });
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Check if employee exists by email
  static async existsByEmail(email) {
    try {
      const employee = await prisma.employee.findUnique({
        where: { email }
      });
      return !!employee;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = EmployeeModel;