# 📋 스케줄 자동 생성 개선 기획안

## 1. 개요

### 1.1 목적
관리자가 복잡한 근무 스케줄을 쉽고 직관적으로 생성할 수 있도록 하는 고도화된 자동 생성 시스템 구축

### 1.2 핵심 개선 사항
- **주간 근무시간 시각화**: 전체 필요 시간과 배치된 시간을 실시간으로 표시
- **유연한 시간대 설정**: 다양한 근무 패턴을 자유롭게 조합
- **스마트 인원 배치**: 시간대별 최적 인원 자동 계산
- **실시간 피드백**: 설정 변경 시 즉시 반영되는 시각적 피드백

## 2. 사용자 경험 (UX) 설계

### 2.1 사용자 플로우

```
[1단계: 기본 설정]
   ↓
[2단계: 근무 패턴 설계] ← 핵심 개선 영역
   ↓
[3단계: 제약 조건 설정]
   ↓
[4단계: 미리보기 및 조정]
   ↓
[5단계: 최종 생성]
```

### 2.2 화면 구성

#### Step 1: 기본 설정
```
┌─────────────────────────────────────────┐
│  📅 스케줄 생성 기간                     │
│  [시작일] ~ [종료일]  (2주 권장)         │
│                                         │
│  👥 대상 직원 선택                       │
│  □ 전체 선택  ○ 부서별  ○ 개별 선택    │
│                                         │
│  [선택된 직원: 5명]                     │
│  • 김철수 (주 40시간)                   │
│  • 이영희 (주 40시간)                   │
│  • 박민수 (주 32시간) - 파트타임        │
│  • ...                                  │
└─────────────────────────────────────────┘
```

#### Step 2: 근무 패턴 설계 (핵심)
```
┌─────────────────────────────────────────┐
│  💼 주간 근무시간 계산기                 │
│                                         │
│  총 필요 시간: [200시간]                │
│  ■■■■■■■■■□ 90% (180/200시간)          │
│                                         │
│  📊 시간대별 근무 패턴                  │
│  ┌─────────────────────────┐           │
│  │ 06 08 10 12 14 16 18 20 22         │
│  │ ▁▁▃▃▆▆█████▆▆▃▃▁▁         │
│  └─────────────────────────┘           │
│                                         │
│  ➕ 근무 시간대 추가                    │
│  ┌──────────────────────────────────┐  │
│  │ [오전] 09:00-18:00 [2-3명] ✓     │  │
│  │ [점심] 11:00-14:00 [+1명] ✓      │  │
│  │ [저녁] 18:00-22:00 [1-2명] ✓     │  │
│  │ [유동] 시간 유동적 [1명] ✓        │  │
│  └──────────────────────────────────┘  │
│                                         │
│  예상 커버리지: 95% ✅                  │
│  남은 시간: 20시간                      │
└─────────────────────────────────────────┘
```

## 3. 핵심 기능 상세

### 3.1 주간 근무시간 계산기

#### 기능 설명
- **총 필요 시간**: (선택 직원 수) × (주당 근무시간) × (주 수)
- **실시간 계산**: 근무 패턴 추가/수정 시 즉시 반영
- **시각적 표시**: 프로그레스 바와 퍼센티지로 표시

#### 계산 로직
```javascript
totalRequiredHours = employees.reduce((sum, emp) => {
  return sum + (emp.weeklyHours * numberOfWeeks)
}, 0)

allocatedHours = shifts.reduce((sum, shift) => {
  const dailyHours = shift.duration * shift.staffCount
  const workDays = getWorkDays(shift.pattern) // 주 5일, 주 6일 등
  return sum + (dailyHours * workDays * numberOfWeeks)
}, 0)

coverage = (allocatedHours / totalRequiredHours) * 100
```

### 3.2 근무 시간대 설정

#### 시간대 유형
1. **고정 시간대**
   - 시작/종료 시간 명확
   - 필요 인원 수 지정
   - 예: 09:00-18:00 (3명)

2. **피크 시간대**
   - 특정 시간 추가 인원
   - 기존 시간대에 오버레이
   - 예: 11:30-13:30 (+2명)

3. **유동 시간대**
   - 시간 제약 없음
   - 필요시 자동 배치
   - 예: 일 8시간 (시간 무관)

#### 시간대 템플릿
```javascript
const templates = {
  'office': [
    { name: '오전', start: '09:00', end: '18:00', staff: 'auto' }
  ],
  'retail': [
    { name: '오픈', start: '10:00', end: '14:00', staff: 2 },
    { name: '피크', start: '14:00', end: '20:00', staff: 3 },
    { name: '마감', start: '20:00', end: '22:00', staff: 1 }
  ],
  'restaurant': [
    { name: '준비', start: '10:00', end: '11:00', staff: 2 },
    { name: '점심', start: '11:00', end: '14:00', staff: 4 },
    { name: '브레이크', start: '14:00', end: '17:00', staff: 1 },
    { name: '저녁', start: '17:00', end: '22:00', staff: 4 }
  ],
  'hospital': [
    { name: '주간', start: '07:00', end: '15:00', staff: 'auto' },
    { name: '오후', start: '15:00', end: '23:00', staff: 'auto' },
    { name: '야간', start: '23:00', end: '07:00', staff: 'auto' }
  ]
}
```

### 3.3 스마트 인원 배치

#### 자동 계산 기능
1. **최소 인원 보장**
   - 각 시간대 최소 인원 확보
   - 법정 휴게시간 고려

2. **피크 시간 대응**
   - 업무량 기반 인원 증원
   - 점심/저녁 시간대 추가 배치

3. **효율성 최적화**
   - 불필요한 중복 최소화
   - 연속 근무 선호

#### 제약 조건 검증
```javascript
const constraints = {
  maxConsecutiveDays: 5,      // 최대 연속 근무일
  minRestHours: 11,           // 최소 휴식 시간
  maxDailyHours: 12,          // 일일 최대 근무시간
  minDailyHours: 4,           // 일일 최소 근무시간
  weeklyMaxHours: 52,         // 주당 최대 근무시간
  monthlyMaxHours: 200        // 월 최대 근무시간
}
```

### 3.4 시각화 컴포넌트

#### 주간 히트맵
```
     월   화   수   목   금   토   일
06  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]
08  [▒]  [▒]  [▒]  [▒]  [▒]  [ ]  [ ]
10  [█]  [█]  [█]  [█]  [█]  [▒]  [ ]
12  [█]  [█]  [█]  [█]  [█]  [▒]  [ ]
14  [▓]  [▓]  [▓]  [▓]  [▓]  [░]  [ ]
16  [▓]  [▓]  [▓]  [▓]  [▓]  [ ]  [ ]
18  [▒]  [▒]  [▒]  [▒]  [▒]  [ ]  [ ]
20  [░]  [░]  [░]  [░]  [ ]  [ ]  [ ]
22  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]

범례: █ 3명+ ▓ 2명 ▒ 1명 ░ 대기 □ 없음
```

#### 실시간 통계
- **일별 근무시간**: 막대 그래프
- **직원별 할당시간**: 도넛 차트
- **시간대별 커버리지**: 라인 차트

## 4. 기술 구현 계획

### 4.1 프론트엔드 구조

```
components/
  Schedule/
    AutoGenerate/
      ├── index.jsx                 // 메인 컨테이너
      ├── StepBasicSetup.jsx        // 1단계: 기본 설정
      ├── StepShiftPattern.jsx      // 2단계: 근무 패턴
      ├── StepConstraints.jsx       // 3단계: 제약 조건
      ├── StepPreview.jsx           // 4단계: 미리보기
      ├── StepFinalize.jsx          // 5단계: 최종 확인
      │
      ├── components/
      │   ├── WeeklyHoursCalculator.jsx   // 주간 시간 계산기
      │   ├── ShiftPatternBuilder.jsx     // 시간대 빌더
      │   ├── ShiftTemplateSelector.jsx   // 템플릿 선택기
      │   ├── TimeAllocationChart.jsx     // 시간 할당 차트
      │   ├── CoverageHeatmap.jsx         // 커버리지 히트맵
      │   └── EmployeeWorkloadTable.jsx   // 직원별 업무량 표
      │
      └── hooks/
          ├── useScheduleCalculation.js    // 스케줄 계산 로직
          ├── useTimeAllocation.js        // 시간 배분 로직
          └── useConstraintValidation.js  // 제약 검증 로직
```

### 4.2 상태 관리

```javascript
const scheduleGeneratorState = {
  // 기본 정보
  period: {
    startDate: '2025-08-20',
    endDate: '2025-09-02',
    totalDays: 14,
    workingDays: 10
  },
  
  // 직원 정보
  employees: [
    {
      id: 1,
      name: '김철수',
      weeklyHours: 40,
      type: 'full-time',
      skills: ['morning', 'peak'],
      constraints: {
        maxConsecutiveDays: 5,
        preferredShifts: ['morning'],
        unavailableDates: []
      }
    }
  ],
  
  // 근무 패턴
  shiftPatterns: [
    {
      id: 'morning-shift',
      name: '오전 근무',
      timeRange: { start: '09:00', end: '18:00' },
      requiredStaff: { min: 2, max: 3, optimal: 2.5 },
      priority: 'high',
      days: ['mon', 'tue', 'wed', 'thu', 'fri']
    }
  ],
  
  // 계산 결과
  calculations: {
    totalRequiredHours: 200,
    allocatedHours: 180,
    coverage: 90,
    unassignedHours: 20,
    conflicts: [],
    warnings: []
  }
}
```

### 4.3 API 엔드포인트

```javascript
// 새로운 API 엔드포인트
POST /api/schedules/calculate-requirements
  Request: { employees, period, patterns }
  Response: { totalHours, distribution, suggestions }

POST /api/schedules/validate-pattern
  Request: { pattern, employees, constraints }
  Response: { valid, issues, recommendations }

POST /api/schedules/generate-advanced
  Request: { 
    period, 
    employees, 
    patterns, 
    constraints,
    optimization: 'balanced|efficiency|coverage'
  }
  Response: { schedules, statistics, warnings }

GET /api/schedules/templates/:industry
  Response: { templates, bestPractices }
```

## 5. 사용자 인터페이스 개선

### 5.1 인터랙션 디자인

#### 드래그 앤 드롭
- 시간대 블록을 드래그하여 조정
- 직원을 시간대에 드래그하여 할당

#### 실시간 피드백
- 변경사항 즉시 반영
- 문제 발생 시 즉시 경고
- 개선 제안 자동 표시

#### 단축키
- `Ctrl+Z`: 실행 취소
- `Ctrl+S`: 임시 저장
- `Space`: 미리보기 토글
- `Tab`: 다음 단계

### 5.2 반응형 디자인

```css
/* 모바일 (< 768px) */
.shift-pattern-builder {
  display: flex;
  flex-direction: column;
}

/* 태블릿 (768px - 1024px) */
.shift-pattern-builder {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

/* 데스크톱 (> 1024px) */
.shift-pattern-builder {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-areas:
    "main sidebar"
    "chart sidebar";
}
```

## 6. 성능 최적화

### 6.1 계산 최적화
- Web Worker 활용한 백그라운드 계산
- 메모이제이션으로 중복 계산 방지
- 청크 단위 처리로 UI 블로킹 방지

### 6.2 렌더링 최적화
- Virtual scrolling for large employee lists
- React.memo로 불필요한 리렌더링 방지
- 차트 라이브러리 lazy loading

## 7. 예상 개발 일정

### Phase 1: 기초 구현 (1주)
- [ ] 새로운 컴포넌트 구조 생성
- [ ] 주간 근무시간 계산기 구현
- [ ] 기본 시간대 패턴 빌더

### Phase 2: 고급 기능 (1주)
- [ ] 시각화 컴포넌트 구현
- [ ] 제약 조건 검증 시스템
- [ ] 템플릿 시스템 구축

### Phase 3: 최적화 및 테스트 (3일)
- [ ] 성능 최적화
- [ ] 사용자 테스트
- [ ] 버그 수정 및 개선

## 8. 예상 효과

### 8.1 정량적 효과
- **스케줄 생성 시간**: 30분 → 5분 (83% 감소)
- **오류 발생률**: 15% → 2% (87% 감소)
- **재작업 빈도**: 주 3회 → 주 0.5회 (83% 감소)

### 8.2 정성적 효과
- 관리자 업무 스트레스 감소
- 직원 만족도 향상 (공정한 배치)
- 시스템 신뢰도 증가

## 9. 리스크 및 대응 방안

### 9.1 기술적 리스크
- **복잡한 계산 로직**: 단계별 검증 및 테스트
- **성능 이슈**: Web Worker 및 최적화 기법 적용
- **브라우저 호환성**: 폴리필 및 대체 방안 준비

### 9.2 사용성 리스크
- **학습 곡선**: 튜토리얼 및 툴팁 제공
- **복잡한 UI**: 점진적 공개 및 단순화 옵션
- **기존 사용자 저항**: 기존 방식도 유지

## 10. 향후 확장 계획

### 10.1 AI 기반 최적화
- 과거 데이터 학습을 통한 패턴 제안
- 자동 이상 감지 및 조정
- 수요 예측 기반 스케줄링

### 10.2 통합 기능
- 급여 시스템 연동
- 근태 관리 시스템 연동
- 외부 캘린더 동기화

### 10.3 분석 대시보드
- 근무 패턴 분석
- 비용 효율성 리포트
- 직원 만족도 추적

---

*작성일: 2025-08-20*  
*버전: 1.0*