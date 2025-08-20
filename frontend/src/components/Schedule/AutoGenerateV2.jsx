import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  getEmployees, 
  getEmployeeAbility,
  getLeaveRequests,
  getSchedules,
  generateSchedule,
  updateSchedule
} from '../../services/api';
import './AutoGenerateV2.css';

const AutoGenerateV2 = () => {
  const { t } = useLanguage();
  
  // 단계 관리
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Step 1: 기간 및 직원 선택
  const [periodData, setPeriodData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    selectedEmployees: [],
    existingSchedules: null
  });
  
  // Step 2: 근무 조건 설정
  const [conditionData, setConditionData] = useState({
    conflicts: [], // [{emp1Id, emp2Id, emp1Name, emp2Name}]
    peakTimes: [{ start: '11:00', end: '14:00', minStaff: 3, enabled: false }],
    shiftPreset: 'default', // default, 2shifts, 3shifts, custom
    shifts: [
      { type: 'morning', start: '09:00', end: '18:00', staff: 2, enabled: true }
    ],
    maxConsecutiveDays: 5,
    avoidWeekends: false
  });
  
  // Step 3: 생성 결과
  const [generatedSchedule, setGeneratedSchedule] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  
  // 데이터
  const [employees, setEmployees] = useState([]);
  const [employeeAbilities, setEmployeeAbilities] = useState({});
  const [employeeLeaves, setEmployeeLeaves] = useState([]);
  
  // 초기 데이터 로드
  useEffect(() => {
    loadInitialData();
  }, []);
  
  // 종료일 자동 설정
  useEffect(() => {
    if (periodData.startDate && !periodData.endDate) {
      const start = new Date(periodData.startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 13); // 2주 기본
      setPeriodData(prev => ({
        ...prev,
        endDate: end.toISOString().split('T')[0]
      }));
    }
  }, [periodData.startDate]);
  
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [empRes, leaveRes] = await Promise.all([
        getEmployees(),
        getLeaveRequests()
      ]);
      
      const employeeData = empRes.data?.employees || empRes.data || [];
      setEmployees(Array.isArray(employeeData) ? employeeData : []);
      
      const leaveData = leaveRes.data?.leaves || leaveRes.data || [];
      setEmployeeLeaves(Array.isArray(leaveData) ? leaveData : []);
      
      // 능력치 데이터 로드
      const abilities = {};
      for (const emp of employeeData) {
        try {
          const abilityRes = await getEmployeeAbility(emp.id);
          abilities[emp.id] = abilityRes.data;
        } catch (err) {
          console.log(`No abilities for employee ${emp.id}`);
        }
      }
      setEmployeeAbilities(abilities);
      
    } catch (err) {
      setError('데이터를 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // 기간 체크
  const checkPeriod = async () => {
    if (!periodData.startDate || !periodData.endDate) return;
    
    try {
      const res = await getSchedules();
      const schedules = res.data || [];
      const existingInPeriod = schedules.filter(s => {
        const scheduleDate = new Date(s.date);
        const start = new Date(periodData.startDate);
        const end = new Date(periodData.endDate);
        return scheduleDate >= start && scheduleDate <= end;
      });
      
      setPeriodData(prev => ({
        ...prev,
        existingSchedules: existingInPeriod
      }));
      
      if (existingInPeriod.length > 0) {
        setError(`선택한 기간에 ${existingInPeriod.length}개의 기존 스케줄이 있습니다.`);
      }
    } catch (err) {
      console.error('Period check error:', err);
    }
  };
  
  // 직원 선택 토글
  const toggleEmployee = (employeeId) => {
    setPeriodData(prev => ({
      ...prev,
      selectedEmployees: prev.selectedEmployees.includes(employeeId)
        ? prev.selectedEmployees.filter(id => id !== employeeId)
        : [...prev.selectedEmployees, employeeId]
    }));
  };
  
  // 충돌 관계 추가
  const addConflict = (emp1Id, emp2Id) => {
    if (!emp1Id || !emp2Id || emp1Id === emp2Id) return;
    
    const emp1 = employees.find(e => e.id === parseInt(emp1Id));
    const emp2 = employees.find(e => e.id === parseInt(emp2Id));
    
    const exists = conditionData.conflicts.some(c => 
      (c.emp1Id === emp1Id && c.emp2Id === emp2Id) ||
      (c.emp1Id === emp2Id && c.emp2Id === emp1Id)
    );
    
    if (!exists) {
      setConditionData(prev => ({
        ...prev,
        conflicts: [...prev.conflicts, {
          emp1Id: parseInt(emp1Id),
          emp2Id: parseInt(emp2Id),
          emp1Name: emp1?.name,
          emp2Name: emp2?.name
        }]
      }));
    }
  };
  
  // 충돌 관계 삭제
  const removeConflict = (index) => {
    setConditionData(prev => ({
      ...prev,
      conflicts: prev.conflicts.filter((_, i) => i !== index)
    }));
  };
  
  // 교대 프리셋 적용
  const applyShiftPreset = (preset) => {
    let shifts = [];
    
    switch (preset) {
      case '2shifts':
        shifts = [
          { type: 'morning', start: '06:00', end: '14:00', staff: 2, enabled: true },
          { type: 'afternoon', start: '14:00', end: '22:00', staff: 2, enabled: true }
        ];
        break;
      case '3shifts':
        shifts = [
          { type: 'morning', start: '06:00', end: '14:00', staff: 2, enabled: true },
          { type: 'afternoon', start: '14:00', end: '22:00', staff: 2, enabled: true },
          { type: 'night', start: '22:00', end: '06:00', staff: 1, enabled: true }
        ];
        break;
      default:
        shifts = [
          { type: 'morning', start: '09:00', end: '18:00', staff: 2, enabled: true }
        ];
    }
    
    setConditionData(prev => ({
      ...prev,
      shiftPreset: preset,
      shifts
    }));
  };
  
  // 스케줄 생성
  const handleGenerateSchedule = async () => {
    setLoading(true);
    setError('');
    
    try {
      // API 요청 데이터 구성
      const requestData = {
        startDate: periodData.startDate,
        endDate: periodData.endDate,
        employeeIds: periodData.selectedEmployees,
        conflicts: conditionData.conflicts.map(c => ({
          employee1: c.emp1Id,
          employee2: c.emp2Id
        })),
        priorityHours: conditionData.peakTimes
          .filter(p => p.enabled)
          .map(p => ({
            start: p.start,
            end: p.end,
            weight: 5
          })),
        shifts: conditionData.shifts.filter(s => s.enabled),
        minStaffPerDay: Math.min(...conditionData.shifts.filter(s => s.enabled).map(s => s.staff)),
        maxStaffPerDay: Math.max(...conditionData.shifts.filter(s => s.enabled).map(s => s.staff)),
        avoidWeekends: conditionData.avoidWeekends,
        maxConsecutiveDays: conditionData.maxConsecutiveDays
      };
      
      const res = await generateSchedule(requestData);
      setGeneratedSchedule(res.data);
      setSuccess('스케줄이 성공적으로 생성되었습니다!');
      setCurrentStep(3);
    } catch (err) {
      setError(err.response?.data?.message || '스케줄 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  // 스케줄 빠른 수정
  const handleQuickEdit = async (scheduleId, newEmployeeId) => {
    try {
      await quickUpdateSchedule(scheduleId, { employeeId: newEmployeeId });
      setSuccess('스케줄이 수정되었습니다.');
      // 스케줄 새로고침
      handleGenerateSchedule();
    } catch (err) {
      setError('스케줄 수정에 실패했습니다.');
    }
  };
  
  // 단계 유효성 검사
  const validateStep = (step) => {
    switch (step) {
      case 1:
        return periodData.startDate && 
               periodData.endDate && 
               periodData.selectedEmployees.length > 0;
      case 2:
        return conditionData.shifts.some(s => s.enabled);
      default:
        return true;
    }
  };
  
  // 직원 휴가 여부 확인
  const isOnLeave = (employeeId, date) => {
    return employeeLeaves.some(leave => 
      leave.employeeId === employeeId &&
      leave.status === 'approved' &&
      new Date(leave.startDate) <= new Date(date) &&
      new Date(leave.endDate) >= new Date(date)
    );
  };
  
  // 직원 등급 가져오기
  const getEmployeeRank = (employeeId) => {
    return employeeAbilities[employeeId]?.rank || 'C';
  };
  
  // 날짜 포맷
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getMonth() + 1}/${date.getDate()} (${days[date.getDay()]})`;
  };
  
  return (
    <div className="auto-generate-v2">
      {/* 헤더 */}
      <div className="wizard-header">
        <h1>자동 스케줄 생성</h1>
        <div className="progress-bar">
          <div className={`progress-dot ${currentStep >= 1 ? 'active' : ''}`}>1</div>
          <div className={`progress-line ${currentStep >= 2 ? 'active' : ''}`}></div>
          <div className={`progress-dot ${currentStep >= 2 ? 'active' : ''}`}>2</div>
          <div className={`progress-line ${currentStep >= 3 ? 'active' : ''}`}></div>
          <div className={`progress-dot ${currentStep >= 3 ? 'active' : ''}`}>3</div>
        </div>
      </div>
      
      {/* 에러/성공 메시지 */}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      {/* Step 1: 기간 및 직원 선택 */}
      {currentStep === 1 && (
        <div className="wizard-step step-1">
          <h2>📅 기간 및 직원 선택</h2>
          
          {/* 기간 선택 */}
          <div className="section period-section">
            <h3>스케줄 기간</h3>
            <div className="date-picker-row">
              <div className="form-group">
                <label>시작일</label>
                <input
                  type="date"
                  value={periodData.startDate}
                  onChange={(e) => setPeriodData(prev => ({
                    ...prev,
                    startDate: e.target.value
                  }))}
                  onBlur={checkPeriod}
                />
              </div>
              <div className="form-group">
                <label>종료일</label>
                <input
                  type="date"
                  value={periodData.endDate}
                  onChange={(e) => setPeriodData(prev => ({
                    ...prev,
                    endDate: e.target.value
                  }))}
                  onBlur={checkPeriod}
                />
              </div>
            </div>
            
            {periodData.existingSchedules?.summary?.totalSchedules > 0 && (
              <div className="warning-box">
                ⚠️ 해당 기간에 {periodData.existingSchedules.summary.totalSchedules}개의 기존 스케줄이 있습니다.
              </div>
            )}
          </div>
          
          {/* 직원 선택 */}
          <div className="section employee-section">
            <h3>근무 직원 선택</h3>
            <div className="select-controls">
              <button 
                className="btn btn-sm"
                onClick={() => setPeriodData(prev => ({
                  ...prev,
                  selectedEmployees: employees.map(e => e.id)
                }))}
              >
                전체 선택
              </button>
              <button 
                className="btn btn-sm"
                onClick={() => setPeriodData(prev => ({
                  ...prev,
                  selectedEmployees: []
                }))}
              >
                선택 해제
              </button>
              <span className="selected-count">
                {periodData.selectedEmployees.length}명 선택됨
              </span>
            </div>
            
            <div className="employee-list">
              {employees.map(emp => {
                const onLeave = isOnLeave(emp.id, periodData.startDate);
                const rank = getEmployeeRank(emp.id);
                
                return (
                  <div 
                    key={emp.id} 
                    className={`employee-card ${periodData.selectedEmployees.includes(emp.id) ? 'selected' : ''}`}
                    onClick={() => !onLeave && toggleEmployee(emp.id)}
                  >
                    <input
                      type="checkbox"
                      checked={periodData.selectedEmployees.includes(emp.id)}
                      onChange={() => {}}
                      disabled={onLeave}
                    />
                    <div className="employee-info">
                      <span className="name">{emp.name}</span>
                      <div className="tags">
                        <span className={`rank rank-${rank}`}>{rank}급</span>
                        {emp.department && <span className="dept">{emp.department}</span>}
                        {onLeave && <span className="leave-badge">휴가중</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Step 2: 근무 조건 설정 */}
      {currentStep === 2 && (
        <div className="wizard-step step-2">
          <h2>⚙️ 근무 조건 설정</h2>
          
          {/* 충돌 관계 설정 */}
          <div className="section conflict-section">
            <h3>🚫 같이 근무 불가 설정</h3>
            <p className="helper-text">같은 시간대 근무를 피해야 하는 직원을 선택하세요</p>
            
            <div className="conflict-setter">
              <select id="conflict-emp1">
                <option value="">직원 1 선택</option>
                {periodData.selectedEmployees.map(empId => {
                  const emp = employees.find(e => e.id === empId);
                  return <option key={empId} value={empId}>{emp?.name}</option>;
                })}
              </select>
              <span className="separator">↔️</span>
              <select id="conflict-emp2">
                <option value="">직원 2 선택</option>
                {periodData.selectedEmployees.map(empId => {
                  const emp = employees.find(e => e.id === empId);
                  return <option key={empId} value={empId}>{emp?.name}</option>;
                })}
              </select>
              <button 
                className="btn btn-add"
                onClick={() => {
                  const emp1 = document.getElementById('conflict-emp1').value;
                  const emp2 = document.getElementById('conflict-emp2').value;
                  addConflict(emp1, emp2);
                  document.getElementById('conflict-emp1').value = '';
                  document.getElementById('conflict-emp2').value = '';
                }}
              >
                추가
              </button>
            </div>
            
            <div className="conflict-list">
              {conditionData.conflicts.map((conflict, idx) => (
                <div key={idx} className="conflict-item">
                  <span>{conflict.emp1Name} ↔️ {conflict.emp2Name}</span>
                  <button 
                    className="btn-remove"
                    onClick={() => removeConflict(idx)}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          {/* 중요 시간대 설정 */}
          <div className="section peak-section">
            <h3>⭐ 중요 시간대</h3>
            <p className="helper-text">능력치 높은 직원을 우선 배치합니다</p>
            
            {conditionData.peakTimes.map((peak, idx) => (
              <div key={idx} className="peak-time-slot">
                <input
                  type="checkbox"
                  checked={peak.enabled}
                  onChange={(e) => {
                    const newPeaks = [...conditionData.peakTimes];
                    newPeaks[idx].enabled = e.target.checked;
                    setConditionData(prev => ({ ...prev, peakTimes: newPeaks }));
                  }}
                />
                <input
                  type="time"
                  value={peak.start}
                  onChange={(e) => {
                    const newPeaks = [...conditionData.peakTimes];
                    newPeaks[idx].start = e.target.value;
                    setConditionData(prev => ({ ...prev, peakTimes: newPeaks }));
                  }}
                />
                <span>~</span>
                <input
                  type="time"
                  value={peak.end}
                  onChange={(e) => {
                    const newPeaks = [...conditionData.peakTimes];
                    newPeaks[idx].end = e.target.value;
                    setConditionData(prev => ({ ...prev, peakTimes: newPeaks }));
                  }}
                />
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={peak.minStaff}
                  onChange={(e) => {
                    const newPeaks = [...conditionData.peakTimes];
                    newPeaks[idx].minStaff = parseInt(e.target.value);
                    setConditionData(prev => ({ ...prev, peakTimes: newPeaks }));
                  }}
                  placeholder="최소 인원"
                />
              </div>
            ))}
          </div>
          
          {/* 교대 시간 설정 */}
          <div className="section shift-section">
            <h3>🕐 교대 시간</h3>
            
            <div className="shift-presets">
              <button 
                className={`preset-btn ${conditionData.shiftPreset === 'default' ? 'active' : ''}`}
                onClick={() => applyShiftPreset('default')}
              >
                기본 (9-6)
              </button>
              <button 
                className={`preset-btn ${conditionData.shiftPreset === '2shifts' ? 'active' : ''}`}
                onClick={() => applyShiftPreset('2shifts')}
              >
                2교대
              </button>
              <button 
                className={`preset-btn ${conditionData.shiftPreset === '3shifts' ? 'active' : ''}`}
                onClick={() => applyShiftPreset('3shifts')}
              >
                3교대
              </button>
            </div>
            
            <div className="shifts-list">
              {conditionData.shifts.map((shift, idx) => (
                <div key={idx} className="shift-config">
                  <input
                    type="checkbox"
                    checked={shift.enabled}
                    onChange={(e) => {
                      const newShifts = [...conditionData.shifts];
                      newShifts[idx].enabled = e.target.checked;
                      setConditionData(prev => ({ ...prev, shifts: newShifts }));
                    }}
                  />
                  <span className="shift-label">{shift.type}</span>
                  <input
                    type="time"
                    value={shift.start}
                    onChange={(e) => {
                      const newShifts = [...conditionData.shifts];
                      newShifts[idx].start = e.target.value;
                      setConditionData(prev => ({ ...prev, shifts: newShifts }));
                    }}
                  />
                  <span>~</span>
                  <input
                    type="time"
                    value={shift.end}
                    onChange={(e) => {
                      const newShifts = [...conditionData.shifts];
                      newShifts[idx].end = e.target.value;
                      setConditionData(prev => ({ ...prev, shifts: newShifts }));
                    }}
                  />
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={shift.staff}
                    onChange={(e) => {
                      const newShifts = [...conditionData.shifts];
                      newShifts[idx].staff = parseInt(e.target.value);
                      setConditionData(prev => ({ ...prev, shifts: newShifts }));
                    }}
                    placeholder="인원"
                  />
                </div>
              ))}
            </div>
            
            {/* 추가 옵션 */}
            <div className="additional-options">
              <label>
                <input
                  type="checkbox"
                  checked={conditionData.avoidWeekends}
                  onChange={(e) => setConditionData(prev => ({
                    ...prev,
                    avoidWeekends: e.target.checked
                  }))}
                />
                주말 근무 최소화
              </label>
              <div className="form-group">
                <label>최대 연속 근무일</label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={conditionData.maxConsecutiveDays}
                  onChange={(e) => setConditionData(prev => ({
                    ...prev,
                    maxConsecutiveDays: parseInt(e.target.value)
                  }))}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Step 3: 결과 및 수정 */}
      {currentStep === 3 && (
        <div className="wizard-step step-3">
          <h2>📊 생성 결과</h2>
          
          {!generatedSchedule && (
            <div className="summary-section">
              <h3>스케줄 요약</h3>
              <div className="summary-card">
                <div className="summary-item">
                  <span>기간:</span>
                  <strong>{periodData.startDate} ~ {periodData.endDate}</strong>
                </div>
                <div className="summary-item">
                  <span>직원:</span>
                  <strong>{periodData.selectedEmployees.length}명</strong>
                </div>
                <div className="summary-item">
                  <span>충돌 설정:</span>
                  <strong>{conditionData.conflicts.length}쌍</strong>
                </div>
                <div className="summary-item">
                  <span>중요 시간대:</span>
                  <strong>{conditionData.peakTimes.filter(p => p.enabled).length}개</strong>
                </div>
              </div>
              
              <button 
                className="btn btn-generate"
                onClick={handleGenerateSchedule}
                disabled={loading}
              >
                {loading ? '생성 중...' : '🎯 스케줄 자동 생성'}
              </button>
            </div>
          )}
          
          {generatedSchedule && (
            <div className="result-section">
              <div className="schedule-preview">
                <div className="week-view">
                  {Object.entries(generatedSchedule.schedulesByDate || {}).map(([date, schedules]) => (
                    <div key={date} className="day-column">
                      <div className="date-header">{formatDate(date)}</div>
                      <div className="schedule-list">
                        {schedules.map((schedule, idx) => {
                          const isPeak = conditionData.peakTimes.some(p => 
                            p.enabled && 
                            schedule.startTime >= p.start && 
                            schedule.startTime < p.end
                          );
                          
                          return (
                            <div 
                              key={idx} 
                              className={`schedule-card ${isPeak ? 'peak' : ''}`}
                              onClick={() => setEditingSchedule(schedule)}
                            >
                              <div className="time">{schedule.startTime} - {schedule.endTime}</div>
                              <div className="employee">{schedule.employeeName}</div>
                              <div className="rank">{getEmployeeRank(schedule.employeeId)}급</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="action-buttons">
                <button className="btn btn-save">💾 저장하기</button>
                <button 
                  className="btn btn-regenerate"
                  onClick={handleGenerateSchedule}
                >
                  🔄 다시 생성
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* 네비게이션 버튼 */}
      <div className="wizard-navigation">
        {currentStep > 1 && (
          <button 
            className="btn btn-prev"
            onClick={() => setCurrentStep(currentStep - 1)}
          >
            이전
          </button>
        )}
        
        {currentStep < 3 && (
          <button 
            className="btn btn-next"
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={!validateStep(currentStep)}
          >
            다음
          </button>
        )}
      </div>
      
      {/* 로딩 오버레이 */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
    </div>
  );
};

export default AutoGenerateV2;