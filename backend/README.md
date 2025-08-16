# 스케줄 자동화 백엔드

## 필요한 프로그램
- Node.js 18 이상
- MySQL 8.0 이상

## 설치 및 실행

### 1. 패키지 설치
```bash
cd backend
npm install
```

### 2. MySQL 서버 시작
```bash
sudo service mysql start
```

### 3. 데이터베이스 설정
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. 서버 실행
```bash
# 개발 모드
npm run dev

# 프로덕션 모드  
npm start
```

서버는 http://localhost:5000 에서 실행됩니다.

## 테스트 계정
- **관리자**: admin@schedule.com / admin123
- **직원**: john.doe@schedule.com / password123

## API 엔드포인트

### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/profile` - 프로필 조회

### 직원 관리
- `GET /api/employees` - 직원 목록
- `POST /api/employees` - 직원 추가
- `PUT /api/employees/:id` - 직원 수정
- `DELETE /api/employees/:id` - 직원 삭제

### 스케줄
- `GET /api/schedules` - 스케줄 조회
- `POST /api/schedules` - 스케줄 생성
- `PUT /api/schedules/:id` - 스케줄 수정

### 휴가
- `GET /api/leaves` - 휴가 목록
- `POST /api/leaves` - 휴가 신청
- `PUT /api/leaves/:id` - 휴가 상태 변경