# 스케줄 자동화 프론트엔드

## 필요한 프로그램
- Node.js 18 이상

## 설치 및 실행

### 1. 패키지 설치
```bash
cd frontend
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```

프론트엔드는 http://localhost:5173 에서 실행됩니다.

### 3. 프로덕션 빌드
```bash
npm run build
```

빌드 파일이 자동으로 `backend/public`으로 이동됩니다.

## 주요 기능
- 로그인/회원가입
- 직원 관리
- 스케줄 캘린더 (월/주/일 보기)
- 자동 스케줄 생성
- 휴가 신청/관리
- 능력치 및 선호도 설정

## 폴더 구조
```
src/
├── components/     # React 컴포넌트
│   ├── Auth/      # 로그인, 회원가입
│   ├── Dashboard/ # 대시보드
│   ├── Employee/  # 직원 관리
│   ├── Schedule/  # 스케줄 관리
│   ├── Leave/     # 휴가 관리
│   └── Common/    # 헤더, 사이드바
├── contexts/      # React Context
├── services/      # API 통신
└── App.jsx        # 메인 앱
```

## 테스트 계정
- **관리자**: admin@schedule.com / admin123
- **직원**: john.doe@schedule.com / password123