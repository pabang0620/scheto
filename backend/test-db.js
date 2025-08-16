const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test query
    const userCount = await prisma.user.count();
    console.log(`✅ Found ${userCount} users in database`);
    
    // Test admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@schedule.com' }
    });
    
    if (adminUser) {
      console.log('✅ Admin user found:', adminUser.email);
    } else {
      console.log('❌ Admin user not found - run seed script');
    }
    
    // Test employee data
    const employees = await prisma.employee.findMany({
      include: {
        user: true,
        abilities: true,
        preferences: true
      }
    });
    
    console.log(`✅ Found ${employees.length} employees with complete data`);
    
    employees.forEach(emp => {
      console.log(`  - ${emp.name} (${emp.department})`);
    });
    
    console.log('\n🎉 Database setup is working correctly!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    
    if (error.code === 'P1001') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Make sure MySQL server is running: sudo service mysql start');
      console.log('2. Check if database exists: mysql -u root -p -e "SHOW DATABASES;"');
      console.log('3. Verify credentials in DATABASE_URL');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();