# 구현 가이드 - 핵심 기능 코드

## 1. 스케줄 자동 생성 알고리즘

### 핵심 로직
```javascript
// backend/controllers/scheduleController.js

const autoGenerateSchedules = async (req, res) => {
  // 1. 입력 파라미터
  const { 
    startDate,      // 시작일
    endDate,        // 종료일
    shiftType,      // 근무 유형
    startTime,      // 시작 시간
    endTime,        // 종료 시간
    employeeIds,    // 선택된 직원들
    minStaffPerDay, // 일일 최소 인원
    maxStaffPerDay, // 일일 최대 인원
    avoidWeekends   // 주말 제외 여부
  } = req.body;

  // 2. 직원 데이터 조회 (휴가, 선호도 포함)
  const employees = await prisma.employee.findMany({
    include: {
      abilities: true,      // 능력치
      preferences: true,    // 선호도
      leaves: {            // 휴가
        where: {
          status: 'approved',
          startDate: { lte: end },
          endDate: { gte: start }
        }
      }
    }
  });

  // 3. 날짜별 스케줄 생성
  for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
    // 주말 체크
    if (avoidWeekends && (date.getDay() === 0 || date.getDay() === 6)) {
      continue;
    }

    // 4. 직원 스코어링
    const scoredEmployees = employees.map(emp => ({
      ...emp,
      score: calculateEmployeeScore(emp, date, {
        hasLeave: checkLeaveConflict(emp.leaves, date),
        consecutiveDays: getConsecutiveDays(emp.id, date),
        preferences: emp.preferences,
        abilities: emp.abilities
      })
    }));

    // 5. 스코어 기준 정렬 및 선택
    const selectedEmployees = scoredEmployees
      .filter(emp => emp.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxStaffPerDay);

    // 6. 스케줄 생성
    for (const employee of selectedEmployees) {
      await prisma.schedule.create({
        data: {
          employeeId: employee.id,
          date: date,
          startTime,
          endTime,
          shiftType,
          status: 'scheduled',
          notes: `Auto-generated (Score: ${employee.score})`,
          createdBy: req.userId
        }
      });
    }
  }
};

// 직원 스코어 계산 함수
const calculateEmployeeScore = (employee, date, factors) => {
  let score = 10; // 기본 점수

  // 휴가 체크 (-100점)
  if (factors.hasLeave) return 0;

  // 연속 근무일 체크
  if (factors.consecutiveDays >= 5) return 0;
  score -= factors.consecutiveDays * 2;

  // 선호도 반영
  const dayOfWeek = date.getDay();
  if (factors.preferences?.preferDays?.includes(dayOfWeek)) {
    score += 20;
  }
  if (factors.preferences?.avoidDays?.includes(dayOfWeek)) {
    score -= 15;
  }

  // 능력치 반영
  score += (factors.abilities?.overall || 5) * 2;

  return Math.max(0, score);
};
```

---

## 2. 휴가 관리 시스템

### 휴가 신청 및 중복 검증
```javascript
// backend/controllers/leaveController.js

const createLeave = async (req, res) => {
  const { employeeId, startDate, endDate, type, reason } = req.body;

  // 1. 날짜 유효성 검사
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) {
    return res.status(400).json({ 
      message: 'Start date cannot be after end date' 
    });
  }

  // 2. 중복 휴가 검사
  const overlappingLeave = await prisma.leave.findFirst({
    where: {
      employeeId: parseInt(employeeId),
      status: { not: 'rejected' },
      OR: [
        {
          startDate: { lte: end },
          endDate: { gte: start }
        }
      ]
    }
  });

  if (overlappingLeave) {
    return res.status(400).json({ 
      message: 'Employee has an overlapping leave request' 
    });
  }

  // 3. 스케줄 충돌 검사
  const conflictingSchedules = await prisma.schedule.findMany({
    where: {
      employeeId: parseInt(employeeId),
      date: {
        gte: start,
        lte: end
      }
    }
  });

  // 4. 휴가 생성
  const leave = await prisma.leave.create({
    data: {
      employeeId: parseInt(employeeId),
      startDate: start,
      endDate: end,
      type,
      reason,
      status: 'pending'
    }
  });

  // 5. 충돌하는 스케줄 자동 제거 (옵션)
  if (conflictingSchedules.length > 0) {
    await prisma.schedule.deleteMany({
      where: {
        id: { in: conflictingSchedules.map(s => s.id) }
      }
    });
  }

  res.json({ leave, removedSchedules: conflictingSchedules.length });
};
```

---

## 3. 실시간 알림 시스템

### NotificationContext 구현
```javascript
// frontend/src/contexts/NotificationContext.jsx

export const NotificationProvider = ({ children, user }) => {
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [unreadNoticeCount, setUnreadNoticeCount] = useState(0);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchPendingLeaveCount = async () => {
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      setPendingLeaveCount(0);
      return;
    }

    try {
      const response = await leaveRequests.getPendingApprovals();
      setPendingLeaveCount(response.data?.length || 0);
    } catch (error) {
      console.error('Failed to fetch pending leave count:', error);
      setPendingLeaveCount(0);
    }
  };

  const refreshCounts = async () => {
    // 최소 5초 간격 제한
    const now = Date.now();
    if (lastFetch && now - lastFetch < 5000) {
      return;
    }
    
    setLastFetch(now);
    await Promise.all([
      fetchPendingLeaveCount(),
      fetchUnreadNoticeCount()
    ]);
  };

  useEffect(() => {
    if (user) {
      refreshCounts();
      // 60초마다 자동 새로고침
      const interval = setInterval(refreshCounts, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <NotificationContext.Provider value={{
      pendingLeaveCount,
      unreadNoticeCount,
      refreshCounts
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
```

---

## 4. 드래그 앤 드롭 캘린더

### FullCalendar 설정
```javascript
// frontend/src/components/Schedule/ScheduleCalendarDnD.jsx

const ScheduleCalendarDnD = () => {
  const calendarOptions = {
    plugins: [
      dayGridPlugin,
      timeGridPlugin,
      interactionPlugin
    ],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    locale: 'ko',
    
    // 드래그 앤 드롭 설정
    editable: true,
    droppable: true,
    eventDrop: handleEventDrop,
    eventResize: handleEventResize,
    
    // 이벤트 표시
    events: schedules.map(schedule => ({
      id: schedule.id,
      title: `${schedule.employee.name} (${schedule.shiftType})`,
      start: `${schedule.date}T${schedule.startTime}`,
      end: `${schedule.date}T${schedule.endTime}`,
      backgroundColor: getShiftColor(schedule.shiftType),
      extendedProps: {
        employeeId: schedule.employeeId,
        shiftType: schedule.shiftType
      }
    })),
    
    // 이벤트 클릭
    eventClick: handleEventClick
  };

  // 일정 이동 처리
  const handleEventDrop = async (info) => {
    const { event } = info;
    
    try {
      await updateSchedule(event.id, {
        date: event.start,
        startTime: formatTime(event.start),
        endTime: formatTime(event.end)
      });
      
      toast.success('일정이 이동되었습니다');
    } catch (error) {
      info.revert();
      toast.error('일정 이동 실패');
    }
  };

  return <FullCalendar {...calendarOptions} />;
};
```

---

## 5. 대시보드 통계

### 실시간 통계 계산
```javascript
// backend/controllers/dashboardController.js

const getDashboardStats = async (req, res) => {
  const userId = req.userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { employee: true }
  });

  // 이번 주 날짜 계산
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  // 통계 집계
  const [
    totalEmployees,
    schedulesThisWeek,
    pendingLeaves,
    todaySchedules
  ] = await Promise.all([
    // 전체 직원 수
    prisma.employee.count(),
    
    // 이번 주 스케줄
    prisma.schedule.count({
      where: {
        date: {
          gte: startOfWeek,
          lte: endOfWeek
        }
      }
    }),
    
    // 대기 중인 휴가
    prisma.leave.count({
      where: { status: 'pending' }
    }),
    
    // 오늘의 스케줄
    prisma.schedule.count({
      where: {
        date: {
          gte: new Date(today.setHours(0,0,0,0)),
          lt: new Date(today.setHours(23,59,59,999))
        }
      }
    })
  ]);

  // 알림 생성
  const alerts = [];
  
  // 인력 부족 경고
  if (todaySchedules < totalEmployees * 0.3) {
    alerts.push({
      type: 'warning',
      category: 'staffing',
      title: 'Low Staffing Today',
      message: `Only ${todaySchedules} out of ${totalEmployees} employees scheduled`,
      timestamp: new Date(),
      action: {
        type: 'link',
        url: '/schedules',
        label: 'View Schedules'
      }
    });
  }

  // 휴가 승인 대기
  if (pendingLeaves > 0) {
    alerts.push({
      type: 'warning',
      category: 'management',
      title: 'Pending Leave Requests',
      message: `${pendingLeaves} leave request${pendingLeaves > 1 ? 's' : ''} awaiting review`,
      timestamp: new Date(),
      action: {
        type: 'link',
        url: '/leaves',
        label: 'Review Requests'
      }
    });
  }

  res.json({
    totalEmployees,
    schedulesThisWeek,
    pendingLeaves,
    upcomingShifts: todaySchedules,
    alerts
  });
};
```

---

## 6. 인증 미들웨어

### JWT 검증
```javascript
// backend/middlewares/authMiddleware.js

const authMiddleware = async (req, res, next) => {
  try {
    // 토큰 추출
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        message: 'No token provided' 
      });
    }

    // 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 사용자 확인
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { employee: true }
    });

    if (!user) {
      return res.status(401).json({ 
        message: 'User not found' 
      });
    }

    // 요청에 사용자 정보 추가
    req.userId = user.id;
    req.user = user;
    req.userRole = user.role;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired' 
      });
    }
    
    return res.status(401).json({ 
      message: 'Invalid token' 
    });
  }
};

// 역할 기반 접근 제어
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ 
        message: 'Access denied' 
      });
    }
    next();
  };
};
```

---

## 7. 프로필 관리

### 근무 선호도 설정
```javascript
// frontend/src/components/Profile/Profile.jsx

const Profile = () => {
  const [preferences, setPreferences] = useState({
    preferDays: [],      // 선호 근무일
    avoidDays: [],       // 피하고 싶은 요일
    fixedOffDays: [],    // 고정 휴무일
    preferredStartTime: '09:00',
    preferredEndTime: '18:00'
  });

  const handlePreferencesUpdate = async () => {
    try {
      const response = await fetch('/api/users/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(preferences)
      });
      
      if (response.ok) {
        showMessage('success', '근무 선호도가 저장되었습니다');
      }
    } catch (error) {
      showMessage('error', '저장 실패');
    }
  };

  return (
    <div className="preferences-section">
      <h3>선호하는 근무 요일</h3>
      <div className="day-selector">
        {weekDays.map(day => (
          <label key={day.value} className="day-checkbox">
            <input
              type="checkbox"
              checked={preferences.preferDays.includes(day.value)}
              onChange={() => togglePreference('preferDays', day.value)}
            />
            <span>{day.label}</span>
          </label>
        ))}
      </div>
      
      <button onClick={handlePreferencesUpdate}>
        선호도 저장
      </button>
    </div>
  );
};
```

---

## 8. 에러 처리

### 전역 에러 핸들러
```javascript
// backend/server.js

// 404 처리
app.use((req, res, next) => {
  res.status(404).json({ 
    message: 'Endpoint not found' 
  });
});

// 전역 에러 처리
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Prisma 에러 처리
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(400).json({ 
        message: 'Duplicate entry' 
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ 
        message: 'Record not found' 
      });
    }
  }
  
  // 기본 에러 응답
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack 
    })
  });
});
```

---

## 9. 데이터 시드

### 초기 데이터 생성
```javascript
// backend/prisma/seed.js

const seed = async () => {
  // 관리자 계정
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: await bcrypt.hash('password123', 10),
      role: 'admin',
      employee: {
        create: {
          name: 'System Admin',
          email: 'admin@example.com',
          department: 'IT',
          position: 'Administrator',
          hireDate: new Date()
        }
      }
    }
  });

  // 샘플 직원들
  const employees = [
    { name: '김영희', department: '운영팀', position: '팀장' },
    { name: '박철수', department: '개발팀', position: '사원' },
    { name: '이지은', department: '마케팅팀', position: '대리' },
    { name: '최민수', department: '개발팀', position: '과장' },
    { name: '정수진', department: '운영팀', position: '사원' }
  ];

  for (const emp of employees) {
    await prisma.user.create({
      data: {
        email: `${emp.name.toLowerCase().replace(' ', '.')}@company.com`,
        password: await bcrypt.hash('password123', 10),
        role: emp.position === '팀장' ? 'manager' : 'employee',
        employee: {
          create: {
            ...emp,
            email: `${emp.name.toLowerCase().replace(' ', '.')}@company.com`,
            phone: `010-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
            hireDate: new Date()
          }
        }
      }
    });
  }

  console.log('Seed data created successfully');
};
```

---

## 문제 해결 가이드

### 자주 발생하는 문제들

1. **CORS 에러**
```javascript
// backend/server.js
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

2. **Prisma 연결 에러**
```bash
# 데이터베이스 재연결
npx prisma migrate reset
npx prisma migrate dev
```

3. **토큰 만료**
```javascript
// frontend에서 자동 리프레시
if (error.response?.status === 401) {
  localStorage.removeItem('token');
  window.location.href = '/login';
}
```

4. **빌드 에러**
```bash
# 캐시 클리어
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

*이 문서는 시스템의 핵심 구현 코드를 담고 있습니다. 추가 구현이 필요한 경우 이 코드를 참고하여 개발하세요.*