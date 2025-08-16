# 스케줄 자동화 인사관리 시스템

직원의 능력치와 선호도를 기반으로 자동 스케줄을 생성하는 인사관리 시스템

## 🚀 빠른 시작

### 필요한 프로그램
- Node.js 18 이상
- MySQL 8.0 이상

### 설치 방법

#### 1. 프로젝트 클론
```bash
git clone [repository-url]
cd scheduleAuto
```

#### 2. 백엔드 설정
```bash
cd backend
npm install
sudo service mysql start
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

#### 3. 프론트엔드 설정 (새 터미널)
```bash
cd frontend
npm install
npm run dev
```

#### 4. 접속
- 프론트엔드: http://localhost:5173
- 백엔드 API: http://localhost:5000

## 📦 프로덕션 빌드

```bash
# 프론트엔드 빌드
cd frontend
npm run build

# 백엔드에서 통합 실행
cd ../backend
npm start
```

http://localhost:5000 접속

## 🔑 테스트 계정
- **관리자**: admin@schedule.com / admin123
- **직원**: john.doe@schedule.com / password123

## 📁 프로젝트 구조
```
scheduleAuto/
├── backend/      # Express 서버
├── frontend/     # React 앱
└── README.md
```

## 💡 주요 기능
- 로그인/회원가입
- 직원 관리 (CRUD)
- 능력치 설정 (1-10점)
- 근무 선호도 설정
- 자동 스케줄 생성
- 휴가 신청/관리
- 스케줄 수정 및 공유