import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  getEmployees, 
  getEmployeeAbility,
  getLeaveRequests,
  getSchedules,
  generateSchedule,
  updateSchedule
} from '../../services/api';
import WeeklyHoursCalculator from './WeeklyHoursCalculator';
import ShiftPatternBuilder from './ShiftPatternBuilder';
import ScheduleHeatmap from './ScheduleHeatmap';
import './ScheduleAutoGenerator.css';

const ScheduleAutoGenerator = () => {
  const { t } = useLanguage();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Core data
  const [employees, setEmployees] = useState([]);
  const [employeeAbilities, setEmployeeAbilities] = useState({});
  const [employeeLeaves, setEmployeeLeaves] = useState([]);
  
  // Step 1: Period & Employee Selection
  const [periodData, setPeriodData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    selectedEmployees: [],
    existingSchedules: null
  });
  
  // Step 2: Shift Patterns & Conditions
  const [shiftPatterns, setShiftPatterns] = useState([
    { 
      id: 1, 
      name: '오전 근무', 
      start: '09:00', 
      end: '18:00', 
      requiredStaff: 2, 
      enabled: true,
      color: '#3B82F6',
      days: [1, 2, 3, 4, 5] // Monday to Friday
    }
  ]);
  
  const [workConditions, setWorkConditions] = useState({
    conflicts: [],
    priorityHours: [],
    maxConsecutiveDays: 5,
    minRestDays: 1,
    avoidWeekends: false,
    balanceWorkload: true
  });
  
  // Step 3: Generated Schedule
  const [generatedSchedule, setGeneratedSchedule] = useState(null);
  const [scheduleDragSource, setScheduleDragSource] = useState(null);
  
  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);
  
  // Auto-set end date
  useEffect(() => {
    if (periodData.startDate && !periodData.endDate) {
      const start = new Date(periodData.startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 13); // Default 2 weeks
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
      
      // Load abilities
      const abilities = {};
      for (const emp of employeeData) {
        try {
          const abilityRes = await getEmployeeAbility(emp.id);
          abilities[emp.id] = abilityRes.data;
        } catch (err) {
          abilities[emp.id] = { rank: 'C', skills: [] };
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
  
  // Calculate total required hours
  const totalRequiredHours = useMemo(() => {
    if (!periodData.startDate || !periodData.endDate) return 0;
    
    const start = new Date(periodData.startDate);
    const end = new Date(periodData.endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    return shiftPatterns.reduce((total, pattern) => {
      if (!pattern.enabled) return total;
      
      const dailyHours = calculateShiftHours(pattern.start, pattern.end);
      const workDays = pattern.days.length * Math.ceil(days / 7);
      
      return total + (dailyHours * pattern.requiredStaff * workDays);
    }, 0);
  }, [periodData.startDate, periodData.endDate, shiftPatterns]);
  
  // Calculate allocated hours from generated schedule
  const allocatedHours = useMemo(() => {
    if (!generatedSchedule) return 0;
    
    return Object.values(generatedSchedule.schedulesByDate || {}).reduce((total, daySchedules) => {
      return total + daySchedules.reduce((dayTotal, schedule) => {
        const hours = calculateShiftHours(schedule.startTime, schedule.endTime);
        return dayTotal + hours;
      }, 0);
    }, 0);
  }, [generatedSchedule]);
  
  const calculateShiftHours = (start, end) => {
    const startTime = new Date(`2000-01-01T${start}`);
    const endTime = new Date(`2000-01-01T${end}`);
    
    // Handle overnight shifts
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }
    
    return (endTime - startTime) / (1000 * 60 * 60);
  };
  
  // Toggle employee selection
  const toggleEmployee = (employeeId) => {
    setPeriodData(prev => ({
      ...prev,
      selectedEmployees: prev.selectedEmployees.includes(employeeId)
        ? prev.selectedEmployees.filter(id => id !== employeeId)
        : [...prev.selectedEmployees, employeeId]
    }));
  };
  
  // Add conflict relationship
  const addConflict = (emp1Id, emp2Id) => {
    if (!emp1Id || !emp2Id || emp1Id === emp2Id) return;
    
    const emp1 = employees.find(e => e.id === parseInt(emp1Id));
    const emp2 = employees.find(e => e.id === parseInt(emp2Id));
    
    const exists = workConditions.conflicts.some(c => 
      (c.emp1Id === emp1Id && c.emp2Id === emp2Id) ||
      (c.emp1Id === emp2Id && c.emp2Id === emp1Id)
    );
    
    if (!exists) {
      setWorkConditions(prev => ({
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
  
  // Remove conflict
  const removeConflict = (index) => {
    setWorkConditions(prev => ({
      ...prev,
      conflicts: prev.conflicts.filter((_, i) => i !== index)
    }));
  };
  
  // Generate schedule
  const handleGenerateSchedule = async () => {
    setLoading(true);
    setError('');
    
    try {
      const requestData = {
        startDate: periodData.startDate,
        endDate: periodData.endDate,
        employeeIds: periodData.selectedEmployees,
        shifts: shiftPatterns.filter(p => p.enabled).map(p => ({
          type: p.name,
          start: p.start,
          end: p.end,
          staff: p.requiredStaff,
          days: p.days
        })),
        conflicts: workConditions.conflicts.map(c => ({
          employee1: c.emp1Id,
          employee2: c.emp2Id
        })),
        priorityHours: workConditions.priorityHours,
        maxConsecutiveDays: workConditions.maxConsecutiveDays,
        minRestDays: workConditions.minRestDays,
        avoidWeekends: workConditions.avoidWeekends,
        balanceWorkload: workConditions.balanceWorkload
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
  
  // Handle drag and drop
  const handleDragStart = (e, schedule) => {
    setScheduleDragSource(schedule);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = async (e, targetDate, targetTime) => {
    e.preventDefault();
    
    if (!scheduleDragSource) return;
    
    try {
      // Update schedule via API
      await updateSchedule(scheduleDragSource.id, {
        date: targetDate,
        startTime: targetTime
      });
      
      // Refresh schedule
      await handleGenerateSchedule();
      setSuccess('스케줄이 수정되었습니다.');
    } catch (err) {
      setError('스케줄 수정에 실패했습니다.');
    }
    
    setScheduleDragSource(null);
  };
  
  // Validation
  const validateStep = (step) => {
    switch (step) {
      case 1:
        return periodData.startDate && 
               periodData.endDate && 
               periodData.selectedEmployees.length > 0;
      case 2:
        return shiftPatterns.some(p => p.enabled);
      default:
        return true;
    }
  };
  
  // Check if employee is on leave
  const isOnLeave = (employeeId, date) => {
    return employeeLeaves.some(leave => 
      leave.employeeId === employeeId &&
      leave.status === 'approved' &&
      new Date(leave.startDate) <= new Date(date) &&
      new Date(leave.endDate) >= new Date(date)
    );
  };
  
  // Get employee rank
  const getEmployeeRank = (employeeId) => {
    return employeeAbilities[employeeId]?.rank || 'C';
  };
  
  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getMonth() + 1}/${date.getDate()} (${days[date.getDay()]})`;
  };
  
  return (
    <div className="schedule-auto-generator">
      {/* Header with Progress */}
      <div className="generator-header">
        <h1 className="generator-title">스마트 스케줄 생성기</h1>
        <p className="generator-subtitle">직관적인 인터페이스로 최적의 근무 스케줄을 생성하세요</p>
        
        <div className="progress-tracker">
          <div className={`progress-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            <div className="step-circle">1</div>
            <div className="step-label">기간 & 직원</div>
          </div>
          <div className={`progress-connector ${currentStep >= 2 ? 'active' : ''}`}></div>
          <div className={`progress-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <div className="step-circle">2</div>
            <div className="step-label">근무 패턴</div>
          </div>
          <div className={`progress-connector ${currentStep >= 3 ? 'active' : ''}`}></div>
          <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
            <div className="step-circle">3</div>
            <div className="step-label">결과 & 수정</div>
          </div>
        </div>
      </div>
      
      {/* Alert Messages */}
      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
          <button className="alert-close" onClick={() => setError('')}>×</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          <span>{success}</span>
          <button className="alert-close" onClick={() => setSuccess('')}>×</button>
        </div>
      )}
      
      {/* Step 1: Period & Employee Selection */}
      {currentStep === 1 && (
        <div className="step-container step-1">
          <div className="step-header">
            <h2>📅 근무 기간 및 직원 선택</h2>
            <p>스케줄을 생성할 기간과 근무할 직원을 선택하세요</p>
          </div>
          
          <div className="step-content">
            {/* Period Selection */}
            <div className="section period-section">
              <h3>근무 기간</h3>
              <div className="period-inputs">
                <div className="date-input-group">
                  <label>시작일</label>
                  <input
                    type="date"
                    value={periodData.startDate}
                    onChange={(e) => setPeriodData(prev => ({
                      ...prev,
                      startDate: e.target.value
                    }))}
                    className="date-input"
                  />
                </div>
                <div className="date-input-group">
                  <label>종료일</label>
                  <input
                    type="date"
                    value={periodData.endDate}
                    onChange={(e) => setPeriodData(prev => ({
                      ...prev,
                      endDate: e.target.value
                    }))}
                    className="date-input"
                  />
                </div>
              </div>
              
              {periodData.startDate && periodData.endDate && (
                <div className="period-summary">
                  <span className="period-duration">
                    총 {Math.ceil((new Date(periodData.endDate) - new Date(periodData.startDate)) / (1000 * 60 * 60 * 24)) + 1}일간
                  </span>
                </div>
              )}
            </div>
            
            {/* Employee Selection */}
            <div className="section employee-section">
              <div className="section-header">
                <h3>근무 직원 선택</h3>
                <div className="selection-controls">
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPeriodData(prev => ({
                      ...prev,
                      selectedEmployees: employees.map(e => e.id)
                    }))}
                  >
                    전체 선택
                  </button>
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPeriodData(prev => ({
                      ...prev,
                      selectedEmployees: []
                    }))}
                  >
                    선택 해제
                  </button>
                  <span className="selection-count">
                    {periodData.selectedEmployees.length}명 선택
                  </span>
                </div>
              </div>
              
              <div className="employee-grid">
                {employees.map(emp => {
                  const onLeave = isOnLeave(emp.id, periodData.startDate);
                  const rank = getEmployeeRank(emp.id);
                  const isSelected = periodData.selectedEmployees.includes(emp.id);
                  
                  return (
                    <div 
                      key={emp.id} 
                      className={`employee-card ${isSelected ? 'selected' : ''} ${onLeave ? 'on-leave' : ''}`}
                      onClick={() => !onLeave && toggleEmployee(emp.id)}
                    >
                      <div className="employee-checkbox-wrapper">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          disabled={onLeave}
                          className="employee-checkbox"
                        />
                      </div>
                      <div className="employee-info">
                        <div className="employee-name">{emp.name}</div>
                        <div className="employee-tags">
                          <span className={`rank-badge rank-${rank.toLowerCase()}`}>{rank}급</span>
                          {emp.department && <span className="dept-badge">{emp.department}</span>}
                          {onLeave && <span className="leave-badge">휴가중</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Step 2: Shift Patterns & Conditions */}
      {currentStep === 2 && (
        <div className="step-container step-2">
          <div className="step-header">
            <h2>⚙️ 근무 패턴 및 조건 설정</h2>
            <p>근무 시간, 패턴 및 제약 조건을 설정하세요</p>
          </div>
          
          <div className="step-content">
            <div className="grid-layout">
              {/* Weekly Hours Calculator */}
              <WeeklyHoursCalculator
                selectedEmployees={periodData.selectedEmployees}
                shiftPatterns={shiftPatterns}
                startDate={periodData.startDate}
                endDate={periodData.endDate}
                totalRequiredHours={totalRequiredHours}
                allocatedHours={allocatedHours}
              />
              
              {/* Shift Pattern Builder */}
              <ShiftPatternBuilder
                patterns={shiftPatterns}
                onPatternsChange={setShiftPatterns}
                employees={employees.filter(e => periodData.selectedEmployees.includes(e.id))}
              />
              
              {/* Conflict Settings */}
              <div className="section conflict-section">
                <h3>🚫 근무 제약 조건</h3>
                
                <div className="conflict-builder">
                  <h4>같이 근무 불가 설정</h4>
                  <div className="conflict-adder">
                    <select id="conflict-emp1" className="select-input">
                      <option value="">직원 1 선택</option>
                      {periodData.selectedEmployees.map(empId => {
                        const emp = employees.find(e => e.id === empId);
                        return <option key={empId} value={empId}>{emp?.name}</option>;
                      })}
                    </select>
                    <span className="conflict-separator">⚡</span>
                    <select id="conflict-emp2" className="select-input">
                      <option value="">직원 2 선택</option>
                      {periodData.selectedEmployees.map(empId => {
                        const emp = employees.find(e => e.id === empId);
                        return <option key={empId} value={empId}>{emp?.name}</option>;
                      })}
                    </select>
                    <button 
                      className="btn btn-primary btn-sm"
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
                    {workConditions.conflicts.map((conflict, idx) => (
                      <div key={idx} className="conflict-item">
                        <span className="conflict-text">
                          {conflict.emp1Name} ⚡ {conflict.emp2Name}
                        </span>
                        <button 
                          className="btn btn-danger btn-xs"
                          onClick={() => removeConflict(idx)}
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Additional Conditions */}
                <div className="conditions-grid">
                  <div className="condition-item">
                    <label>최대 연속 근무일</label>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={workConditions.maxConsecutiveDays}
                      onChange={(e) => setWorkConditions(prev => ({
                        ...prev,
                        maxConsecutiveDays: parseInt(e.target.value)
                      }))}
                      className="number-input"
                    />
                  </div>
                  <div className="condition-item">
                    <label>최소 휴무일</label>
                    <input
                      type="number"
                      min="1"
                      max="3"
                      value={workConditions.minRestDays}
                      onChange={(e) => setWorkConditions(prev => ({
                        ...prev,
                        minRestDays: parseInt(e.target.value)
                      }))}
                      className="number-input"
                    />
                  </div>
                </div>
                
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={workConditions.avoidWeekends}
                      onChange={(e) => setWorkConditions(prev => ({
                        ...prev,
                        avoidWeekends: e.target.checked
                      }))}
                    />
                    주말 근무 최소화
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={workConditions.balanceWorkload}
                      onChange={(e) => setWorkConditions(prev => ({
                        ...prev,
                        balanceWorkload: e.target.checked
                      }))}
                    />
                    근무량 균등 분배
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Step 3: Results & Editing */}
      {currentStep === 3 && (
        <div className="step-container step-3">
          <div className="step-header">
            <h2>📊 생성 결과 및 수정</h2>
            <p>생성된 스케줄을 확인하고 필요시 수정하세요</p>
          </div>
          
          <div className="step-content">
            {!generatedSchedule ? (
              <div className="generation-panel">
                <div className="summary-card">
                  <h3>스케줄 생성 요약</h3>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">기간</span>
                      <span className="summary-value">{periodData.startDate} ~ {periodData.endDate}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">직원 수</span>
                      <span className="summary-value">{periodData.selectedEmployees.length}명</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">근무 패턴</span>
                      <span className="summary-value">{shiftPatterns.filter(p => p.enabled).length}개</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">예상 총 근무시간</span>
                      <span className="summary-value">{totalRequiredHours.toFixed(1)}시간</span>
                    </div>
                  </div>
                </div>
                
                <button 
                  className="btn btn-primary btn-lg generate-btn"
                  onClick={handleGenerateSchedule}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="loading-spinner"></span>
                      생성 중...
                    </>
                  ) : (
                    <>
                      🎯 스마트 스케줄 생성
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="result-panel">
                {/* Schedule Heatmap */}
                <ScheduleHeatmap
                  schedule={generatedSchedule}
                  employees={employees}
                  shiftPatterns={shiftPatterns}
                />
                
                {/* Drag & Drop Schedule Editor */}
                <div className="schedule-editor">
                  <div className="editor-header">
                    <h3>스케줄 편집</h3>
                    <div className="coverage-indicator">
                      <span>커버리지: {((allocatedHours / totalRequiredHours) * 100).toFixed(1)}%</span>
                      <div className="coverage-bar">
                        <div 
                          className="coverage-fill"
                          style={{ width: `${Math.min((allocatedHours / totalRequiredHours) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="schedule-grid">
                    {Object.entries(generatedSchedule.schedulesByDate || {}).map(([date, schedules]) => (
                      <div key={date} className="day-column">
                        <div className="day-header">{formatDate(date)}</div>
                        <div 
                          className="schedule-slots"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, date, null)}
                        >
                          {schedules.map((schedule, idx) => {
                            const employee = employees.find(e => e.id === schedule.employeeId);
                            const pattern = shiftPatterns.find(p => p.name === schedule.shiftType);
                            
                            return (
                              <div 
                                key={idx} 
                                className="schedule-slot"
                                draggable
                                onDragStart={(e) => handleDragStart(e, schedule)}
                                style={{ borderLeftColor: pattern?.color }}
                              >
                                <div className="schedule-time">
                                  {schedule.startTime} - {schedule.endTime}
                                </div>
                                <div className="schedule-employee">
                                  {employee?.name}
                                  <span className={`rank-indicator rank-${getEmployeeRank(schedule.employeeId).toLowerCase()}`}>
                                    {getEmployeeRank(schedule.employeeId)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="result-actions">
                  <button className="btn btn-success btn-lg">
                    💾 스케줄 저장
                  </button>
                  <button 
                    className="btn btn-secondary btn-lg"
                    onClick={handleGenerateSchedule}
                  >
                    🔄 다시 생성
                  </button>
                  <button 
                    className="btn btn-ghost btn-lg"
                    onClick={() => setCurrentStep(2)}
                  >
                    ⚙️ 설정 수정
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Navigation */}
      <div className="navigation-controls">
        {currentStep > 1 && (
          <button 
            className="btn btn-secondary"
            onClick={() => setCurrentStep(currentStep - 1)}
          >
            ← 이전
          </button>
        )}
        
        {currentStep < 3 && (
          <button 
            className="btn btn-primary"
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={!validateStep(currentStep)}
          >
            다음 →
          </button>
        )}
      </div>
      
      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner large"></div>
            <p>스케줄을 생성하고 있습니다...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleAutoGenerator;