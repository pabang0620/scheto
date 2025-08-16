const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Creating test accounts for development...');

  // Test accounts data
  const testAccounts = [
    {
      email: 'admin@example.com',
      name: 'Test Admin',
      password: 'password123',
      role: 'admin',
    },
    {
      email: 'manager@example.com',
      name: 'Test Manager',
      password: 'password123',
      role: 'manager',
    },
    {
      email: 'employee@example.com',
      name: 'Test Employee',
      password: 'password123',
      role: 'employee',
    }
  ];

  for (const account of testAccounts) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: account.email }
      });

      if (existingUser) {
        console.log(`User ${account.email} already exists, skipping...`);
        continue;
      }

      // Create new user
      const user = await prisma.user.create({
        data: account
      });

      console.log(`Created test user: ${user.email} with role: ${user.role}`);

      // Create employee profile if not admin
      if (account.role !== 'admin') {
        await prisma.employee.create({
          data: {
            userId: user.id,
            name: account.name,
            email: account.email,
            department: account.role === 'manager' ? 'Management' : 'General',
            position: account.role === 'manager' ? 'Team Manager' : 'Staff',
            hireDate: new Date()
          }
        });
        console.log(`Created employee profile for: ${user.email}`);
      }
    } catch (error) {
      console.error(`Error creating user ${account.email}:`, error.message);
    }
  }

  console.log('Test accounts setup complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });