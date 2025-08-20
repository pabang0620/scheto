const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedEnhancedFeatures(employees, adminUser) {
  console.log('Seeding enhanced features...');

  // Check if shift patterns already exist
  const existingPatterns = await prisma.shiftPattern.findMany();
  if (existingPatterns.length === 0) {
    // Create sample shift patterns
    const shiftPatterns = await Promise.all([
      prisma.shiftPattern.create({
        data: {
          name: 'Morning Shift',
          description: 'Standard morning shift',
          startTime: '09:00',
          endTime: '17:00',
          duration: 480, // 8 hours in minutes
          breakDuration: 60, // 1 hour break
          shiftType: 'morning',
          industryType: 'office',
          isTemplate: true,
          color: '#007bff',
          minStaffRequired: 2,
          maxStaffRequired: 5,
          requiredSkillLevel: 'junior',
          allowedDepartments: ['IT', 'HR', 'Marketing'],
          createdBy: adminUser.id,
        },
      }),
      prisma.shiftPattern.create({
        data: {
          name: 'Evening Shift',
          description: 'Evening shift for extended hours',
          startTime: '17:00',
          endTime: '23:00',
          duration: 360, // 6 hours in minutes
          breakDuration: 30, // 30 minute break
          shiftType: 'evening',
          industryType: 'office',
          isTemplate: true,
          color: '#28a745',
          minStaffRequired: 1,
          maxStaffRequired: 3,
          requiredSkillLevel: 'intermediate',
          allowedDepartments: ['IT'],
          createdBy: adminUser.id,
        },
      }),
    ]);
    console.log('Created shift patterns');
  }

  // Check if schedule template already exists
  const existingTemplates = await prisma.scheduleTemplate.findMany();
  if (existingTemplates.length === 0) {
    const scheduleTemplate = await prisma.scheduleTemplate.create({
      data: {
        name: 'Standard Office Schedule',
        description: 'Standard 5-day office schedule with morning and evening coverage',
        industryType: 'office',
        templateType: 'weekly',
        workDaysPattern: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        rotationPeriod: 7,
        minStaffPerShift: 2,
        maxStaffPerShift: 5,
        coverageRequirements: {
          'morning': { minStaff: 3, maxStaff: 5 },
          'evening': { minStaff: 1, maxStaff: 2 }
        },
        createdBy: adminUser.id,
      },
    });
    console.log('Created schedule template');
  }

  // Create employee constraints for employees that don't have them
  const employeesWithoutConstraints = [];
  for (const employee of employees) {
    const existingConstraints = await prisma.employeeConstraints.findUnique({
      where: { employeeId: employee.id }
    });
    if (!existingConstraints) {
      employeesWithoutConstraints.push(employee);
    }
  }

  if (employeesWithoutConstraints.length > 0) {
    const constraintsData = employeesWithoutConstraints.map((employee, index) => {
      const constraints = [
        {
          employeeId: employee.id,
          unavailableTimeSlots: [{ day: 'friday', startTime: '18:00', endTime: '23:59' }],
          preferredTimeSlots: [{ day: 'monday', startTime: '09:00', endTime: '17:00' }],
          preferredShiftTypes: ['morning'],
          canWorkWeekends: false,
          canWorkNightShifts: false,
          maxShiftsPerWeek: 5,
          maxOvertimeHours: 5,
          hasReliableTransport: true,
        },
        {
          employeeId: employee.id,
          preferredShiftTypes: ['morning', 'afternoon'],
          canWorkWeekends: true,
          canWorkNightShifts: false,
          maxShiftsPerWeek: 5,
          maxOvertimeHours: 8,
          hasReliableTransport: true,
        },
        {
          employeeId: employee.id,
          preferredShiftTypes: ['morning', 'evening'],
          canWorkWeekends: true,
          canWorkNightShifts: true,
          maxShiftsPerWeek: 6,
          maxOvertimeHours: 12,
          hasReliableTransport: true,
        },
        {
          employeeId: employee.id,
          preferredShiftTypes: ['afternoon', 'evening'],
          avoidShiftTypes: ['morning'],
          canWorkWeekends: false,
          canWorkNightShifts: false,
          maxShiftsPerWeek: 4,
          maxOvertimeHours: 4,
          hasReliableTransport: true,
        }
      ];
      return constraints[index % constraints.length];
    });

    await Promise.all(
      constraintsData.map(data => prisma.employeeConstraints.create({ data }))
    );
    console.log('Created employee constraints for', employeesWithoutConstraints.length, 'employees');
  }

  // Create sample certifications for employees that don't have them
  const employeesWithoutCertifications = [];
  for (const employee of employees) {
    const existingCertifications = await prisma.employeeCertification.findMany({
      where: { employeeId: employee.id }
    });
    if (existingCertifications.length === 0) {
      employeesWithoutCertifications.push(employee);
    }
  }

  if (employeesWithoutCertifications.length > 0) {
    const certifications = [
      {
        certificationName: 'AWS Certified Developer',
        certificationBody: 'Amazon Web Services',
        issueDate: new Date('2023-06-15'),
        expiryDate: new Date('2026-06-15'),
        certificateNumber: 'AWS-DEV-001',
      },
      {
        certificationName: 'SHRM-CP',
        certificationBody: 'Society for Human Resource Management',
        issueDate: new Date('2023-03-20'),
        expiryDate: new Date('2026-03-20'),
        certificateNumber: 'SHRM-001',
      },
      {
        certificationName: 'PMP',
        certificationBody: 'Project Management Institute',
        issueDate: new Date('2022-08-10'),
        expiryDate: new Date('2025-08-10'),
        certificateNumber: 'PMP-001',
      },
      {
        certificationName: 'Google Analytics',
        certificationBody: 'Google',
        issueDate: new Date('2023-01-15'),
        expiryDate: new Date('2024-01-15'),
        certificateNumber: 'GA-001',
      }
    ];

    for (let i = 0; i < Math.min(employeesWithoutCertifications.length, certifications.length); i++) {
      await prisma.employeeCertification.create({
        data: {
          employeeId: employeesWithoutCertifications[i].id,
          ...certifications[i],
          isActive: true,
          verificationStatus: 'verified',
        }
      });
    }
    console.log('Created certifications for', Math.min(employeesWithoutCertifications.length, certifications.length), 'employees');
  }

  console.log('Enhanced features seeding completed!');
}

async function main() {
  console.log('Start seeding...');

  // Create or find admin user
  let adminUser = await prisma.user.findUnique({
    where: { email: 'admin@schedule.com' }
  });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@schedule.com',
        name: 'Admin User',
        password: 'admin123',
        role: 'admin',
      },
    });
    console.log('Created admin user:', adminUser);
  } else {
    console.log('Admin user already exists');
  }

  // Check if seed data already exists
  const existingEmployees = await prisma.employee.findMany();
  if (existingEmployees.length > 0) {
    console.log('Seed data already exists, skipping basic data creation');
    console.log('Adding only new enhanced features data...');
    
    // Only add new features for existing employees
    await seedEnhancedFeatures(existingEmployees, adminUser);
    return;
  }

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

  // Create abilities for each employee using correct schema fields
  await Promise.all([
    prisma.ability.create({
      data: {
        employeeId: employees[0].id,
        experience: 3,
        workSkill: 4,
        teamChemistry: 4,
        customerService: 3,
        flexibility: 4,
        totalScore: 18,
        rank: 'B',
      },
    }),
    prisma.ability.create({
      data: {
        employeeId: employees[1].id,
        experience: 2,
        workSkill: 4,
        teamChemistry: 5,
        customerService: 4,
        flexibility: 3,
        totalScore: 18,
        rank: 'B',
      },
    }),
    prisma.ability.create({
      data: {
        employeeId: employees[2].id,
        experience: 5,
        workSkill: 5,
        teamChemistry: 4,
        customerService: 3,
        flexibility: 4,
        totalScore: 21,
        rank: 'A',
      },
    }),
    prisma.ability.create({
      data: {
        employeeId: employees[3].id,
        experience: 2,
        workSkill: 3,
        teamChemistry: 4,
        customerService: 5,
        flexibility: 4,
        totalScore: 18,
        rank: 'B',
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

  // Add enhanced features data
  await seedEnhancedFeatures(employees, adminUser);

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