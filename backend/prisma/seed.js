const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@schedule.com',
      name: 'Admin User',
      password: 'admin123',
      role: 'admin',
    },
  });

  console.log('Created admin user:', adminUser);

  // Create sample employee users
  const employeeUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'john.doe@schedule.com',
        name: 'John Doe',
        password: 'password123',
        role: 'employee',
      },
    }),
    prisma.user.create({
      data: {
        email: 'jane.smith@schedule.com',
        name: 'Jane Smith',
        password: 'password123',
        role: 'employee',
      },
    }),
    prisma.user.create({
      data: {
        email: 'mike.johnson@schedule.com',
        name: 'Mike Johnson',
        password: 'password123',
        role: 'manager',
      },
    }),
    prisma.user.create({
      data: {
        email: 'sarah.wilson@schedule.com',
        name: 'Sarah Wilson',
        password: 'password123',
        role: 'employee',
      },
    }),
  ]);

  console.log('Created employee users');

  // Create employee profiles
  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        userId: employeeUsers[0].id,
        name: 'John Doe',
        email: 'john.doe@schedule.com',
        department: 'IT',
        position: 'Software Developer',
        hireDate: new Date('2023-01-15'),
      },
    }),
    prisma.employee.create({
      data: {
        userId: employeeUsers[1].id,
        name: 'Jane Smith',
        email: 'jane.smith@schedule.com',
        department: 'HR',
        position: 'HR Specialist',
        hireDate: new Date('2023-02-20'),
      },
    }),
    prisma.employee.create({
      data: {
        userId: employeeUsers[2].id,
        name: 'Mike Johnson',
        email: 'mike.johnson@schedule.com',
        department: 'IT',
        position: 'Team Lead',
        hireDate: new Date('2022-06-10'),
      },
    }),
    prisma.employee.create({
      data: {
        userId: employeeUsers[3].id,
        name: 'Sarah Wilson',
        email: 'sarah.wilson@schedule.com',
        department: 'Marketing',
        position: 'Marketing Coordinator',
        hireDate: new Date('2023-03-01'),
      },
    }),
  ]);

  console.log('Created employee profiles');

  // Create abilities for each employee
  await Promise.all([
    prisma.ability.create({
      data: {
        employeeId: employees[0].id,
        skill: 8,
        leadership: 6,
        speed: 7,
        teamwork: 9,
      },
    }),
    prisma.ability.create({
      data: {
        employeeId: employees[1].id,
        skill: 7,
        leadership: 8,
        speed: 6,
        teamwork: 9,
      },
    }),
    prisma.ability.create({
      data: {
        employeeId: employees[2].id,
        skill: 9,
        leadership: 10,
        speed: 8,
        teamwork: 8,
      },
    }),
    prisma.ability.create({
      data: {
        employeeId: employees[3].id,
        skill: 7,
        leadership: 7,
        speed: 8,
        teamwork: 8,
      },
    }),
  ]);

  console.log('Created employee abilities');

  // Create preferences for each employee
  await Promise.all([
    prisma.preference.create({
      data: {
        employeeId: employees[0].id,
        preferDays: ['monday', 'tuesday', 'wednesday'],
        avoidDays: ['friday'],
        fixedOffDays: ['saturday', 'sunday'],
      },
    }),
    prisma.preference.create({
      data: {
        employeeId: employees[1].id,
        preferDays: ['tuesday', 'wednesday', 'thursday'],
        avoidDays: ['monday'],
        fixedOffDays: ['saturday', 'sunday'],
      },
    }),
    prisma.preference.create({
      data: {
        employeeId: employees[2].id,
        preferDays: ['monday', 'wednesday', 'friday'],
        avoidDays: [],
        fixedOffDays: ['sunday'],
      },
    }),
    prisma.preference.create({
      data: {
        employeeId: employees[3].id,
        preferDays: ['thursday', 'friday'],
        avoidDays: ['tuesday'],
        fixedOffDays: ['saturday', 'sunday'],
      },
    }),
  ]);

  console.log('Created employee preferences');

  // Create some sample schedules for the current week
  const today = new Date();
  const scheduleData = [];
  
  // Generate schedules for next 7 days for each employee
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    employees.forEach((employee, empIndex) => {
      // Don't schedule on weekends for most employees
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return; // Skip weekends
      }
      
      const shifts = ['morning', 'afternoon', 'evening'];
      const shift = shifts[empIndex % shifts.length];
      
      const startTimes = { morning: '09:00', afternoon: '14:00', evening: '18:00' };
      const endTimes = { morning: '14:00', afternoon: '18:00', evening: '23:00' };
      
      scheduleData.push({
        employeeId: employee.id,
        date: date,
        startTime: startTimes[shift],
        endTime: endTimes[shift],
        shiftType: shift,
        status: 'scheduled',
      });
    });
  }

  await prisma.schedule.createMany({
    data: scheduleData,
  });

  console.log('Created sample schedules');

  console.log('Seeding finished.');
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