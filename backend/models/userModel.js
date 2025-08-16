const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class UserModel {
  // Create a new user
  static async create(userData) {
    try {
      const user = await prisma.user.create({
        data: userData,
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          updatedAt: true
        }
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          updatedAt: true
        }
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Find user by username
  static async findByUsername(username) {
    try {
      const user = await prisma.user.findUnique({
        where: { username }
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Update user
  static async update(id, updateData) {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          updatedAt: true
        }
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Delete user
  static async delete(id) {
    try {
      await prisma.user.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Get all users
  static async findAll() {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
      return users;
    } catch (error) {
      throw error;
    }
  }

  // Check if user exists by email or username
  static async exists(email, username) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      });
      return !!user;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = UserModel;