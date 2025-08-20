# 근무 스케줄 자동화 시스템 - 전체 기능 문서

## 📋 목차
1. [시스템 개요](#시스템-개요)
2. [기술 스택](#기술-스택)
3. [주요 기능](#주요-기능)
4. [API 엔드포인트](#api-엔드포인트)
5. [데이터베이스 구조](#데이터베이스-구조)
6. [프론트엔드 구조](#프론트엔드-구조)
7. [인증 및 권한](#인증-및-권한)
8. [설치 및 실행](#설치-및-실행)
9. [최근 수정 사항](#최근-수정-사항)

---

## 시스템 개요

근무 스케줄 자동화 시스템은 직원들의 근무 일정을 효율적으로 관리하고 자동으로 생성할 수 있는 웹 애플리케이션입니다.

### 주요 특징
- 🤖 AI 기반 스케줄 자동 생성
- 📅 드래그 앤 드롭 캘린더 인터페이스
- 🏖️ 휴가 신청 및 승인 시스템
- 📊 실시간 대시보드 및 통계
- 📱 모바일 반응형 디자인
- 🇰🇷 한국어/영어 다국어 지원

---

## 기술 스택

### Backend
- **Node.js** (v18+)
- **Express.js** - 웹 프레임워크
- **Prisma ORM** - 데이터베이스 ORM
- **MySQL** - 데이터베이스
- **JWT** - 인증 토큰
- **bcrypt** - 비밀번호 암호화

### Frontend
- **React 19** - UI 프레임워크
- **Vite** - 빌드 도구
- **React Router v7** - 라우팅
- **Context API** - 상태 관리
- **Framer Motion** - 애니메이션
- **FullCalendar** - 캘린더 컴포넌트
- **Recharts** - 차트 라이브러리
- **Font Awesome** - 아이콘

---

## 주요 기능

### 1. 인증 시스템
- **로그인/로그아웃**
  - JWT 기반 인증
  - 토큰 유효기간: 7일
  - 자동 로그인 유지

- **회원가입**
  - 이메일 중복 확인
  - 비밀번호 암호화
  - 직원 정보 자동 생성

### 2. 대시보드
- **QuickStats** (빠른 통계)
  - 전체 직원 수
  - 이번 주 운영 일수
  - 대기 중인 휴가 신청
  - 예정된 근무

- **알림 센터**
  - 인력 부족 경고
  - 휴가 승인 대기
  - 실시간 업데이트 (60초 간격)

- **공지사항**
  - 읽음/안읽음 표시
  - 중요 공지 고정

### 3. 직원 관리
- **직원 목록**
  - 부서별 필터링
  - 검색 기능
  - 상세 정보 조회

- **직원 추가/수정/삭제**
  - 기본 정보 (이름, 이메일, 전화번호)
  - 부서 및 직급
  - 입사일 관리

### 4. 스케줄 관리

#### 4.1 스케줄 조회
- **캘린더 뷰**
  - 월/주/일 보기
  - 드래그 앤 드롭으로 일정 이동
  - 색상으로 근무 유형 구분

#### 4.2 스케줄 자동 생성 ⭐
- **기간 설정**
  - 시작일/종료일 선택
  - 직원 선택 (개별/부서별)

- **근무 조건 설정**
  - 근무 시간 (09:00-18:00 등)
  - 근무 유형 (morning/afternoon/evening/night)
  - 최소/최대 인원 설정
  - 주말 제외 옵션

- **충돌 방지**
  - 휴가 기간 자동 제외
  - 직원 간 궁합 고려
  - 연속 근무일 제한 (최대 5일)

- **스코어링 시스템**
  - 직원 선호도 반영
  - 능력치 기반 배치
  - 균등 분배 알고리즘

### 5. 휴가 관리

#### 5.1 휴가 신청
- **신청 정보**
  - 휴가 기간 (시작일/종료일)
  - 휴가 유형 (연차/병가/특별휴가)
  - 사유 입력

- **중복 검증**
  - 기존 휴가와 겹침 방지
  - 스케줄 충돌 체크

#### 5.2 휴가 승인
- **관리자 기능**
  - 대기 중인 휴가 목록
  - 승인/거절 처리
  - 코멘트 추가

### 6. 프로필 관리
- **내 정보**
  - 기본 정보 수정
  - 비밀번호 변경

- **근무 선호도**
  - 선호 근무일
  - 피하고 싶은 요일
  - 고정 휴무일
  - 선호 근무 시간

- **근무 통계**
  - 이번 달 근무 시간
  - 근무 일수
  - 다가오는 일정
  - 최근 휴가 내역

### 7. 회사 설정
- **기본 설정**
  - 회사명
  - 업종
  - 규모

- **근무 설정**
  - 기본 근무 시간
  - 최소 필요 인원
  - 휴가 표시 여부

### 8. 공지사항
- **공지 작성** (관리자)
  - 제목 및 내용
  - 중요도 설정
  - 고정 여부

- **공지 조회**
  - 읽음 표시
  - 읽은 사용자 수 표시

---

## API 엔드포인트

### 인증 API
```
POST   /api/auth/register     - 회원가입
POST   /api/auth/login        - 로그인
GET    /api/auth/verify       - 토큰 검증
```

### 사용자 API
```
GET    /api/users/current     - 현재 사용자 정보
GET    /api/users/profile     - 프로필 조회
PUT    /api/users/profile     - 프로필 수정
GET    /api/users/preferences - 근무 선호도 조회
PUT    /api/users/preferences - 근무 선호도 수정
GET    /api/users/statistics  - 근무 통계
PUT    /api/users/change-password - 비밀번호 변경
```

### 직원 API
```
GET    /api/employees         - 직원 목록
GET    /api/employees/:id     - 직원 상세
POST   /api/employees         - 직원 추가
PUT    /api/employees/:id     - 직원 수정
DELETE /api/employees/:id     - 직원 삭제
GET    /api/employees/:id/ability - 직원 능력치
```

### 스케줄 API
```
GET    /api/schedules         - 스케줄 목록
GET    /api/schedules/:id     - 스케줄 상세
POST   /api/schedules         - 스케줄 생성
PUT    /api/schedules/:id     - 스케줄 수정
DELETE /api/schedules/:id     - 스케줄 삭제
POST   /api/schedules/bulk    - 일괄 생성
POST   /api/schedules/check-period - 기간 체크
POST   /api/schedules/auto-generate - 자동 생성 ⭐
```

### 휴가 API
```
GET    /api/leaves            - 휴가 목록
GET    /api/leaves/my-requests - 내 휴가 신청
GET    /api/leaves/pending    - 대기 중인 휴가
GET    /api/leaves/:id        - 휴가 상세
POST   /api/leaves            - 휴가 신청
PUT    /api/leaves/:id        - 휴가 수정
DELETE /api/leaves/:id        - 휴가 삭제
PUT    /api/leaves/:id/approve - 휴가 승인
PUT    /api/leaves/:id/reject - 휴가 거절
```

### 대시보드 API
```
GET    /api/dashboard/stats   - 대시보드 통계
GET    /api/dashboard/alerts  - 알림 목록
GET    /api/dashboard/upcoming-schedules - 예정 스케줄
```

### 공지사항 API
```
GET    /api/notices           - 공지 목록
GET    /api/notices/:id       - 공지 상세
POST   /api/notices           - 공지 작성
PUT    /api/notices/:id       - 공지 수정
DELETE /api/notices/:id       - 공지 삭제
PUT    /api/notices/:id/read  - 읽음 표시
GET    /api/notices/unread/count - 안읽은 개수
```

### 회사 설정 API
```
GET    /api/company/settings  - 설정 조회
PUT    /api/company/settings  - 설정 수정
```

---

## 데이터베이스 구조

### 주요 테이블
- `User` - 사용자 계정
- `Employee` - 직원 정보
- `Schedule` - 근무 스케줄
- `Leave` - 휴가 신청
- `Notice` - 공지사항
- `NoticeReadStatus` - 공지 읽음 상태
- `Company` - 회사 설정
- `EmployeeAbility` - 직원 능력치
- `EmployeePreference` - 직원 선호도
- `EmployeeChemistry` - 직원 간 궁합

### 관계
- User ↔ Employee (1:1)
- Employee ↔ Schedule (1:N)
- Employee ↔ Leave (1:N)
- User ↔ Notice (작성자, 1:N)
- Notice ↔ NoticeReadStatus (N:M)

---

## 프론트엔드 구조

### 디렉토리 구조
```
frontend/src/
├── components/
│   ├── Auth/           # 로그인, 회원가입
│   ├── Common/         # Header, HamburgerMenu
│   ├── Dashboard/      # 대시보드
│   ├── Employee/       # 직원 관리
│   ├── Schedule/       # 스케줄 관리
│   │   ├── ScheduleCalendarDnD.jsx  # 캘린더
│   │   └── AutoGenerateV2.jsx       # 자동 생성
│   ├── Leave/          # 휴가 관리
│   ├── Profile/        # 프로필
│   ├── Settings/       # 설정
│   ├── Notice/         # 공지사항
│   └── Layout/         # 레이아웃
├── contexts/
│   ├── AuthContext.jsx         # 인증 상태
│   ├── LanguageContext.jsx     # 다국어
│   └── NotificationContext.jsx # 알림
├── services/
│   └── api.js          # API 통신
├── translations/
│   ├── en.js           # 영어
│   └── ko.js           # 한국어
└── utils/
    └── dateFormatter.js # 날짜 유틸
```

### 주요 컴포넌트

#### Dashboard.jsx
- QuickStats 위젯
- AlertCenter (알림)
- NoticeBoard (공지)
- 실시간 데이터 표시

#### ScheduleCalendarDnD.jsx
- FullCalendar 기반
- 드래그 앤 드롭
- 일정 CRUD

#### AutoGenerateV2.jsx
- 3단계 마법사
- 기간/직원 선택
- 조건 설정
- 결과 미리보기

#### Profile.jsx
- 탭 인터페이스
- 내 정보
- 근무 선호도
- 통계
- 보안

---

## 인증 및 권한

### 사용자 역할
1. **admin** - 관리자
   - 모든 기능 접근 가능
   - 회사 설정 관리
   - 직원 관리

2. **manager** - 매니저
   - 스케줄 생성/수정
   - 휴가 승인
   - 공지 작성

3. **employee** - 직원
   - 본인 스케줄 조회
   - 휴가 신청
   - 프로필 수정

### JWT 토큰
- 헤더: `Authorization: Bearer {token}`
- 페이로드: `{ userId, iat, exp }`
- 유효기간: 7일

---

## 설치 및 실행

### 1. 환경 설정
```bash
# Backend .env
DATABASE_URL="mysql://user:password@localhost:3306/schedule_db"
JWT_SECRET="your-secret-key"
PORT=5000

# Frontend .env
VITE_API_URL="http://localhost:5000"
```

### 2. 데이터베이스 설정
```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

### 3. 의존성 설치
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 4. 실행
```bash
# Backend
cd backend
npm start

# Frontend
cd frontend
npm run dev

# 프로덕션 빌드
npm run build
```

---

## 최근 수정 사항

### 2025-08-18 수정 내용

#### 1. 디자인 개선
- QuickStats 파란색 배경 제거
- 한국식 심플한 디자인 적용
- Toss 스타일 탭 인디케이터

#### 2. 성능 최적화
- Dashboard 자동 새로고침 제거
- NotificationContext 새로고침 60초로 조정
- 불필요한 API 호출 감소

#### 3. 버그 수정
- 공지사항 ID undefined 오류 해결
- 휴가 my-requests API 추가
- 알림 timestamp 필드 수정
- schedule.undefined 오류 해결

#### 4. 기능 추가
- 알림 클릭 시 해당 페이지 이동
- 프로필 페이지 완성
- 근무 선호도 설정

### 테스트 계정
```
관리자: admin@example.com / password123
매니저: manager@example.com / password123
직원: employee@example.com / password123
```

---

## 주의사항

1. **데이터베이스 백업**
   - 정기적인 백업 필수
   - 마이그레이션 전 백업

2. **보안**
   - JWT_SECRET 변경 필수
   - HTTPS 사용 권장
   - SQL Injection 방지 (Prisma ORM)

3. **성능**
   - 대량 데이터 시 페이지네이션
   - 이미지 최적화
   - 캐싱 고려

4. **브라우저 지원**
   - Chrome 90+
   - Firefox 88+
   - Safari 14+
   - Edge 90+

---

## 향후 개발 계획

- [ ] 푸시 알림
- [ ] 엑셀 내보내기/가져오기
- [ ] 근태 관리 시스템
- [ ] 급여 계산 연동
- [ ] 모바일 앱
- [ ] 다크 모드
- [ ] 실시간 채팅

---

## 문의 및 지원

프로젝트 관련 문의사항이나 버그 리포트는 GitHub Issues를 통해 등록해주세요.

---

*마지막 업데이트: 2025-08-18*