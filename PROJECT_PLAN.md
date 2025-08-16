# 스케줄 자동화 인사관리 시스템 (ScheduleAuto)

## 📋 프로젝트 개요

### 프로젝트명
ScheduleAuto - 스마트 인사관리 및 자동 스케줄링 시스템

### 목적
대형병원, 치과, 군대, 식당 등에서 직원의 능력치와 선호도를 기반으로 자동 스케줄을 생성하는 인사관리 시스템

### 기술 스택
- **Frontend**: React (Vite) + 반응형 웹 (JSX + CSS 분리)
- **Backend**: Node.js + Express
- **Database**: MySQL + Prisma ORM
- **인증**: JWT Token (평문 비밀번호)
- **배포**: Express에서 React 빌드 파일 서빙

## 🎯 핵심 기능

### 1. 사용자 인증 시스템
- 회원가입 (관리자/직원 구분)
- 로그인/로그아웃 (평문 비밀번호)
- 세션 관리 (JWT)

### 2. 직원 관리
- 직원 등록/수정/삭제 (CRUD)
- 직원 프로필 관리
- 부서/팀 설정
- 직급 관리
- 직원 검색 및 필터링

### 3. 능력치 시스템
- 직원별 능력치 설정 (1-10점)
  - 업무 숙련도
  - 리더십
  - 속도
  - 팀워크

### 4. 선호도 관리
- 선호 근무일 설정
- 비선호 근무일 설정
- 고정 휴무일 설정

### 5. 휴가 관리
- 휴가 신청
- 휴가 승인/반려 (관리자)
- 잔여 휴가 조회
- 휴가 캘린더 뷰

### 6. 자동 스케줄 생성 ⭐
- 능력치 기반 최적 배치
- 선호도 반영 알고리즘
- 최소 인원 보장
- 휴가 일정 고려
- 월간 자동 생성

### 7. 스케줄 관리
- 월간/주간/일간 뷰
- 드래그 앤 드롭 수정
- 스케줄 히스토리

### 8. 스케줄 공유
- 팀별 스케줄 공유
- 실시간 업데이트

## 👥 사용자 권한

### 관리자 (Admin)
- 모든 직원 관리
- 스케줄 생성/수정/삭제
- 휴가 최종 승인
- 시스템 설정

### 직원 (Employee)  
- 본인 정보 조회/수정
- 휴가 신청
- 선호도 설정
- 스케줄 조회

## 📁 프로젝트 구조

```
scheduleAuto/
├── frontend/                 # React 개발 환경
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   ├── Dashboard/
│   │   │   ├── Employee/
│   │   │   ├── Schedule/
│   │   │   ├── Leave/
│   │   │   └── Common/
│   │   ├── contexts/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── index.jsx
│   └── package.json
│
├── backend/
│   ├── public/              # React 빌드 결과물
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── middlewares/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── .env
│   ├── server.js
│   └── package.json
│
└── PROJECT_PLAN.md
```

## 🚀 실행 방법

### 1. 개발 환경 설정

#### Backend 설정
```bash
cd backend
npm install
```

#### Frontend 설정
```bash
cd frontend
npm install
```

### 2. 데이터베이스 설정

#### MySQL 서버 시작
```bash
sudo service mysql start
```

#### Prisma 마이그레이션
```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

### 3. 개발 서버 실행

#### Backend 실행 (포트 5000)
```bash
cd backend
npm run dev
```

#### Frontend 실행 (포트 5173)
```bash
cd frontend
npm run dev
```

### 4. 프로덕션 빌드

```bash
# Frontend 빌드
cd frontend
npm run build

# Backend에서 통합 실행
cd backend
npm start
```

http://localhost:5000 접속

## 📊 API 엔드포인트

### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/profile` - 프로필 조회

### 직원 관리
- `GET /api/employees` - 직원 목록
- `GET /api/employees/:id` - 직원 상세
- `POST /api/employees` - 직원 등록
- `PUT /api/employees/:id` - 직원 수정
- `DELETE /api/employees/:id` - 직원 삭제

### 스케줄
- `GET /api/schedules` - 스케줄 조회
- `GET /api/schedules/employee/:employeeId` - 직원별 스케줄
- `POST /api/schedules` - 스케줄 생성
- `PUT /api/schedules/:id` - 스케줄 수정
- `DELETE /api/schedules/:id` - 스케줄 삭제

### 휴가
- `GET /api/leaves` - 휴가 목록
- `GET /api/leaves/employee/:employeeId` - 직원별 휴가
- `POST /api/leaves` - 휴가 신청
- `PUT /api/leaves/:id` - 휴가 상태 변경

## 🔑 테스트 계정

### 관리자
- Email: admin@schedule.com
- Password: admin123

### 직원 샘플
- john.doe@schedule.com / password123
- jane.smith@schedule.com / password123
- mike.johnson@schedule.com / password123 (Manager)
- sarah.wilson@schedule.com / password123

## 🔧 환경 변수 (.env)
```
DATABASE_URL="mysql://root:gksrmf2002%21@localhost:3306/schedule"
JWT_SECRET="schedule-auto-secret-key"
PORT=5000
```

## 💾 데이터베이스 스키마

### User
- id (PK)
- email (Unique)
- password (평문)
- role (admin/employee)
- createdAt

### Employee
- id (PK)
- userId (FK)
- name
- department
- position
- hireDate

### Ability
- id (PK)
- employeeId (FK)
- skill (1-10)
- leadership (1-10)
- speed (1-10)
- teamwork (1-10)

### Preference
- id (PK)
- employeeId (FK)
- preferDays (JSON)
- avoidDays (JSON)
- fixedOffDays (JSON)

### Schedule
- id (PK)
- employeeId (FK)
- date
- shift
- status

### Leave
- id (PK)
- employeeId (FK)
- startDate
- endDate
- type
- reason
- status

## 🛠️ 기술적 특징

- **MVC 패턴**: routes → controllers → models 구조
- **JWT 인증**: 토큰 기반 인증 시스템
- **평문 비밀번호**: bcrypt 미사용 (개발 편의)
- **Prisma ORM**: 타입 안전한 데이터베이스 접근
- **반응형 디자인**: 모바일 우선 접근
- **SPA 라우팅**: React Router Dom
- **정적 파일 서빙**: Express에서 React 빌드 파일 서빙