const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedEmployees() {
  try {
    console.log('Creating sample employees...');
    
    // Create sample employees
    const employees = [
      {
        name: '김영희',
        email: 'kim.yh@company.com',
        password: '123456',
        role: 'manager',
        department: '운영팀',
        position: '팀장',
        phone: '010-1234-5678',
        address: '서울시 강남구'
      },
      {
        name: '박철수',
        email: 'park.cs@company.com',
        password: '123456',
        role: 'employee',
        department: '개발팀',
        position: '사원',
        phone: '010-2345-6789',
        address: '서울시 서초구'
      },
      {
        name: '이지은',
        email: 'lee.je@company.com',
        password: '123456',
        role: 'employee',
        department: '마케팅팀',
        position: '대리',
        phone: '010-3456-7890',
        address: '서울시 송파구'
      },
      {
        name: '최민수',
        email: 'choi.ms@company.com',
        password: '123456',
        role: 'employee',
        department: '개발팀',
        position: '과장',
        phone: '010-4567-8901',
        address: '서울시 강동구'
      },
      {
        name: '정수진',
        email: 'jung.sj@company.com',
        password: '123456',
        role: 'employee',
        department: '운영팀',
        position: '사원',
        phone: '010-5678-9012',
        address: '서울시 마포구'
      }
    ];

    for (const emp of employees) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: emp.email }
      });

      if (!existingUser) {
        // Create user first
        const user = await prisma.user.create({
          data: {
            name: emp.name,
            email: emp.email,
            password: emp.password,
            role: emp.role
          }
        });

        // Then create employee
        await prisma.employee.create({
          data: {
            userId: user.id,
            name: emp.name,
            email: emp.email,
            department: emp.department,
            position: emp.position,
            phone: emp.phone,
            address: emp.address
          }
        });

        console.log(`Created employee: ${emp.name}`);
      } else {
        console.log(`User already exists: ${emp.email}`);
      }
    }

    // Create sample leave requests
    const employeeRecords = await prisma.employee.findMany();
    
    if (employeeRecords.length > 0) {
      const leaveRequests = [
        {
          employeeId: employeeRecords[0].id,
          startDate: new Date('2025-08-20'),
          endDate: new Date('2025-08-22'),
          type: 'vacation',
          reason: '가족 여행',
          status: 'pending'
        },
        {
          employeeId: employeeRecords[1].id,
          startDate: new Date('2025-08-25'),
          endDate: new Date('2025-08-26'),
          type: 'sick',
          reason: '병원 진료',
          status: 'pending'
        },
        {
          employeeId: employeeRecords[2].id,
          startDate: new Date('2025-08-18'),
          endDate: new Date('2025-08-18'),
          type: 'personal',
          reason: '개인 사유',
          status: 'approved'
        }
      ];

      for (const leave of leaveRequests) {
        const existingLeave = await prisma.leave.findFirst({
          where: {
            employeeId: leave.employeeId,
            startDate: leave.startDate,
            endDate: leave.endDate
          }
        });

        if (!existingLeave) {
          await prisma.leave.create({
            data: leave
          });
          console.log(`Created leave request for employee ID: ${leave.employeeId}`);
        }
      }
    }

    console.log('Sample data created successfully!');
  } catch (error) {
    console.error('Error creating sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedEmployees();