import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  getEmployees, 
  getEmployeeAbility,
  getLeaveRequests,
  getSchedules,
  schedules,
  updateSchedule,
  getShiftPatterns,
  bulkUpdateShiftPatterns
} from '../../services/api';
import WeeklyHoursCalculator from './WeeklyHoursCalculator';
import ShiftPatternBuilder from './ShiftPatternBuilder';
import ShiftPatternManager from './ShiftPatternManager';
import ConflictManager from './ConflictManager';
import ScheduleHeatmap from './ScheduleHeatmap';
import './ScheduleAutoGenerator.css';
import './ScheduleAutoGenerator-Mobile.css';

const ScheduleAutoGenerator = () => {
  const { t } = useLanguage();
  
  // Helper function - Define before useMemo hooks
  const calculateShiftHours = (start, end) => {
    const startTime = new Date(`2000-01-01T${start}`);
    const endTime = new Date(`2000-01-01T${end}`);
    
    // Handle overnight shifts
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }
    
    return (endTime - startTime) / (1000 * 60 * 60);
  };
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Scroll to top when step changes
  const handleStepChange = (newStep) => {
    setCurrentStep(newStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
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
  
  // Experience Levels Configuration
  const [experienceLevels, setExperienceLevels] = useState([
    { id: 1, name: '3년차', years: 3, enabled: true },
    { id: 2, name: '5년차', years: 5, enabled: true },
    { id: 3, name: '7년차', years: 7, enabled: false },
    { id: 4, name: '10년차', years: 10, enabled: false }
  ]);
  
  // Step 2: Shift Patterns & Conditions
  const [shiftPatterns, setShiftPatterns] = useState([
    { 
      id: 1, 
      name: '일반 근무', 
      start: '09:00', 
      end: '18:00', 
      requiredStaff: 2, 
      enabled: true,
      color: '#3B82F6',
      days: [1, 2, 3, 4, 5], // Monday to Friday
      requirements: {
        minRankS: 0,
        minRankA: 0,
        minRankB: 0,
        minRankC: 0,
        experienceLevels: {}
      }
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
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [scheduleDragSource, setScheduleDragSource] = useState(null);
  
  // Load initial data
  useEffect(() => {
    loadInitialData();
    loadShiftPatterns();
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

  // Load shift patterns from database
  const loadShiftPatterns = async () => {
    try {
      console.log('Loading shift patterns...');
      const res = await getShiftPatterns({ companyId: 1 }); // Pass as params object
      console.log('Shift patterns response:', res.data);
      const patterns = res.data?.patterns || [];
      
      if (patterns.length > 0) {
        // Convert from database format to component format
        const formattedPatterns = patterns.map(p => ({
          id: p.id,
          name: p.name,
          start: p.startTime,
          end: p.endTime,
          requiredStaff: p.requiredStaff,
          enabled: p.enabled,
          color: p.color,
          days: Array.isArray(p.days) ? p.days : JSON.parse(p.days || '[1,2,3,4,5]'),
          requirements: typeof p.requirements === 'object' ? p.requirements : JSON.parse(p.requirements || '{}')
        }));
        console.log('Formatted patterns:', formattedPatterns);
        setShiftPatterns(formattedPatterns);
      } else {
        console.log('No patterns loaded, keeping defaults');
      }
    } catch (err) {
      console.error('Failed to load shift patterns:', err);
      // Keep default pattern if loading fails
    }
  };

  // Save shift patterns to database
  const saveShiftPatterns = async (patterns) => {
    try {
      const formattedPatterns = patterns.map(p => ({
        id: p.id,
        name: p.name,
        start: p.start,
        end: p.end,
        requiredStaff: p.requiredStaff,
        enabled: p.enabled,
        color: p.color,
        days: p.days,
        requirements: p.requirements || {}
      }));
      
      const res = await bulkUpdateShiftPatterns({
        patterns: formattedPatterns,
        companyId: 1, // TODO: Get actual company ID
        deleteOthers: true // Delete patterns not in the list
      });
      
      if (res.data?.patterns) {
        // Update with saved patterns (includes new IDs)
        const savedPatterns = res.data.patterns.map(p => ({
          id: p.id,
          name: p.name,
          start: p.startTime,
          end: p.endTime,
          requiredStaff: p.requiredStaff,
          enabled: p.enabled,
          color: p.color,
          days: Array.isArray(p.days) ? p.days : JSON.parse(p.days || '[1,2,3,4,5]'),
          requirements: typeof p.requirements === 'object' ? p.requirements : JSON.parse(p.requirements || '{}')
        }));
        setShiftPatterns(savedPatterns);
        setSuccess('패턴이 저장되었습니다.');
      }
    } catch (err) {
      console.error('Failed to save shift patterns:', err);
      setError('패턴 저장에 실패했습니다.');
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
  const addConflict = (conflictData) => {
    const exists = workConditions.conflicts.some(c => 
      (c.emp1Id === conflictData.emp1Id && c.emp2Id === conflictData.emp2Id) ||
      (c.emp1Id === conflictData.emp2Id && c.emp2Id === conflictData.emp1Id)
    );
    
    if (!exists) {
      setWorkConditions(prev => ({
        ...prev,
        conflicts: [...prev.conflicts, conflictData]
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
  
  // Validate requirements
  const validateRequirements = () => {
    const selectedEmps = employees.filter(e => periodData.selectedEmployees.includes(e.id));
    
    // Count available employees by rank and experience
    const counts = {
      rankS: selectedEmps.filter(e => employeeAbilities[e.id]?.rank === 'S').length,
      rankA: selectedEmps.filter(e => employeeAbilities[e.id]?.rank === 'A').length,
      rankB: selectedEmps.filter(e => employeeAbilities[e.id]?.rank === 'B').length,
      rankC: selectedEmps.filter(e => employeeAbilities[e.id]?.rank === 'C').length
    };
    
    // Count employees for each experience level
    const experienceCounts = {};
    experienceLevels.filter(level => level.enabled).forEach(level => {
      experienceCounts[level.id] = selectedEmps.filter(e => 
        (e.yearsOfExperience || 0) >= level.years
      ).length;
    });
    
    // Check if any pattern's requirements exceed available staff
    const warnings = [];
    for (const pattern of shiftPatterns.filter(p => p.enabled)) {
      const reqs = pattern.requirements || {};
      
      if (reqs.minRankS > counts.rankS) {
        warnings.push(`${pattern.name}: S급 ${reqs.minRankS}명 필요 (현재 ${counts.rankS}명)`);
      }
      if (reqs.minRankA > counts.rankA) {
        warnings.push(`${pattern.name}: A급 ${reqs.minRankA}명 필요 (현재 ${counts.rankA}명)`);
      }
      if (reqs.minRankB > counts.rankB) {
        warnings.push(`${pattern.name}: B급 ${reqs.minRankB}명 필요 (현재 ${counts.rankB}명)`);
      }
      if (reqs.minRankC > counts.rankC) {
        warnings.push(`${pattern.name}: C급 ${reqs.minRankC}명 필요 (현재 ${counts.rankC}명)`);
      }
      
      // Check experience level requirements
      const expLevels = reqs.experienceLevels || {};
      experienceLevels.filter(level => level.enabled).forEach(level => {
        const required = expLevels[level.id] || 0;
        const available = experienceCounts[level.id] || 0;
        if (required > available) {
          warnings.push(`${pattern.name}: ${level.name}↑ ${required}명 필요 (현재 ${available}명)`);
        }
      });
    }
    
    return warnings;
  };

  // Generate schedule
  const handleGenerateSchedule = async () => {
    console.log('=== handleGenerateSchedule 함수 시작 ===');
    
    // Validate requirements first
    const warnings = validateRequirements();
    if (warnings.length > 0) {
      const proceed = window.confirm(
        `다음 요구사항을 충족하지 못합니다:\n\n${warnings.join('\n')}\n\n그래도 계속하시겠습니까?`
      );
      if (!proceed) return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const requestData = {
        startDate: periodData.startDate,
        endDate: periodData.endDate,
        employeeIds: periodData.selectedEmployees,
        shiftPatterns: shiftPatterns.filter(p => p.enabled).map(p => ({
          name: p.name,
          startTime: p.start,
          endTime: p.end,
          staffRequired: p.requiredStaff,
          daysOfWeek: p.days,
          requirements: p.requirements || {}
        })),
        constraints: {
          maxConsecutiveDays: workConditions.maxConsecutiveDays,
          minRestHours: 10,
          maxWeeklyHours: 45,
          respectPreferences: true,
          avoidPoorChemistry: workConditions.conflicts.length > 0,
          fairDistribution: workConditions.balanceWorkload
        },
        priorities: {
          seniorityWeight: 0.2,
          abilityWeight: 0.4,
          preferenceWeight: 0.3,
          availabilityWeight: 0.1
        }
      };
      
      const response = await schedules.generateAdvanced(requestData);
      
      // 디버깅용 - 실제 응답 구조 확인
      window.DEBUG_RESPONSE = response;
      console.log('Schedule generation response received:', response);
      
      // Axios는 실제 데이터를 response.data에 담아서 반환
      const apiResponse = response.data || response;
      
      // Transform the response data into the expected format
      const transformedData = {
        ...apiResponse,
        schedulesByDate: {}
      };
      
      // Group schedules by date
      if (apiResponse.schedules && Array.isArray(apiResponse.schedules)) {
        apiResponse.schedules.forEach(schedule => {
          const dateStr = schedule.date.split('T')[0];
          if (!transformedData.schedulesByDate[dateStr]) {
            transformedData.schedulesByDate[dateStr] = [];
          }
          transformedData.schedulesByDate[dateStr].push(schedule);
        });
      }
      
      // 디버깅용
      window.DEBUG_TRANSFORMED = transformedData;
      console.log('Transformed data:', transformedData);
      
      setGeneratedSchedule(transformedData);
      setSuccess(`스케줄이 성공적으로 생성되었습니다! ${apiResponse.schedules?.length || 0}개의 스케줄이 생성되었습니다.`);
      handleStepChange(3);
    } catch (err) {
      console.error('=== 스케줄 생성 에러 ===', err);
      
      // 상세한 에러 메시지 처리
      let errorMessage = '스케줄 생성에 실패했습니다.';
      
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        // Validation errors from express-validator
        const errors = err.response.data.errors.map(e => `• ${e.msg}`).join('\n');
        errorMessage = `입력 검증 실패:\n${errors}`;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.status === 400) {
        errorMessage = '요청 데이터가 올바르지 않습니다. 모든 필수 항목을 확인해주세요.';
      } else if (err.response?.status === 401) {
        errorMessage = '인증이 필요합니다. 다시 로그인해주세요.';
      } else if (err.response?.status === 403) {
        errorMessage = '권한이 없습니다. 관리자 계정으로 로그인해주세요.';
      } else if (err.response?.status === 404) {
        errorMessage = '요청한 리소스를 찾을 수 없습니다.';
      } else if (err.response?.status === 500) {
        errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (err.message) {
        errorMessage = `오류: ${err.message}`;
      }
      
      // 추가 정보가 있는 경우
      if (err.response?.data?.details) {
        errorMessage += `\n\n상세 정보: ${err.response.data.details}`;
      }
      
      // 충돌 정보가 있는 경우
      if (err.response?.data?.conflicts && err.response.data.conflicts.length > 0) {
        const conflicts = err.response.data.conflicts.map(c => 
          `• ${c.date}: ${c.message || c.type}`
        ).join('\n');
        errorMessage += `\n\n발견된 충돌:\n${conflicts}`;
      }
      
      setError(errorMessage);
      console.error('Schedule generation error:', err);
      
      // 에러가 발생하면 현재 스텝에 머무르기
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle drag and drop
  const handleDragStart = (e, schedule) => {
    setScheduleDragSource(schedule);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  };
  
  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  };
  
  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };
  
  const handleDrop = async (e, targetDate) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (!scheduleDragSource) return;
    
    try {
      // Update the schedule locally first for immediate feedback
      const updatedSchedules = { ...generatedSchedule };
      
      // Remove from original date
      const sourceDate = new Date(scheduleDragSource.date).toISOString().split('T')[0];
      if (updatedSchedules.schedulesByDate) {
        updatedSchedules.schedulesByDate[sourceDate] = 
          (updatedSchedules.schedulesByDate[sourceDate] || []).filter(s => s.id !== scheduleDragSource.id);
        
        // Add to target date
        if (!updatedSchedules.schedulesByDate[targetDate]) {
          updatedSchedules.schedulesByDate[targetDate] = [];
        }
        updatedSchedules.schedulesByDate[targetDate].push({
          ...scheduleDragSource,
          date: targetDate
        });
        
        setGeneratedSchedule(updatedSchedules);
      }
      
      // Update via API
      await updateSchedule(scheduleDragSource.id, {
        date: targetDate
      });
      
      setSuccess('스케줄이 성공적으로 이동되었습니다.');
    } catch (err) {
      setError('스케줄 수정에 실패했습니다.');
      // Revert changes on error
      await handleGenerateSchedule();
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
        <div className="alert alert-error animate-shake">
          <div className="alert-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="alert-content">
            <div className="alert-title">오류 발생</div>
            <div className="alert-message" style={{ whiteSpace: 'pre-line' }}>{error}</div>
          </div>
          <button className="alert-close" onClick={() => setError('')}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
      {success && (
        <div className="alert alert-success animate-slide-in">
          <div className="alert-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="alert-content">
            <div className="alert-title">성공</div>
            <div className="alert-message">{success}</div>
          </div>
          <button className="alert-close" onClick={() => setSuccess('')}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
      
      {/* Step 1: Period & Employee Selection */}
      {currentStep === 1 && (
        <div className="step-container step-1">
          <div className="step-header">
            <h2><i className="fas fa-calendar-alt"></i> 근무 기간 및 직원 선택</h2>
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
            
            {/* Employee Selection - Mobile Optimized */}
            <div className="section employee-section-mobile">
              <div className="mobile-section-header">
                <h3><i className="fas fa-users"></i> 근무할 직원을 선택하세요</h3>
                <p className="helper-text">스케줄을 생성할 직원을 선택해주세요</p>
              </div>
              
              <div className="mobile-selection-bar">
                <button 
                  className="mobile-select-btn"
                  onClick={() => setPeriodData(prev => ({
                    ...prev,
                    selectedEmployees: employees.map(e => e.id)
                  }))}
                >
                  <i className="fas fa-check-circle"></i>
                  전체 선택
                </button>
                <button 
                  className="mobile-select-btn"
                  onClick={() => setPeriodData(prev => ({
                    ...prev,
                    selectedEmployees: []
                  }))}
                >
                  <i className="fas fa-times-circle"></i>
                  선택 해제
                </button>
                <div className="mobile-count-badge">
                  <span className="count-number">{periodData.selectedEmployees.length}</span>
                  <span className="count-label">명</span>
                </div>
              </div>
              
              <div className="mobile-employee-list">
                {employees.map(emp => {
                  const onLeave = isOnLeave(emp.id, periodData.startDate);
                  const rank = getEmployeeRank(emp.id);
                  const isSelected = periodData.selectedEmployees.includes(emp.id);
                  
                  return (
                    <div 
                      key={emp.id} 
                      className={`mobile-employee-item ${isSelected ? 'selected' : ''} ${onLeave ? 'on-leave' : ''}`}
                      onClick={() => !onLeave && toggleEmployee(emp.id)}
                    >
                      <div className="mobile-employee-left">
                        <div className="mobile-employee-avatar">
                          {emp.name?.charAt(0)}
                        </div>
                        <div className="mobile-employee-info">
                          <div className="mobile-employee-name">{emp.name}</div>
                          <div className="mobile-employee-meta">
                            <span className={`mobile-rank rank-${rank.toLowerCase()}`}>{rank}급</span>
                            {emp.yearsOfExperience > 0 && (
                              <span className="mobile-experience">{emp.yearsOfExperience}년차</span>
                            )}
                            {emp.department && <span className="mobile-dept">{emp.department}</span>}
                            {onLeave && <span className="mobile-leave">휴가</span>}
                          </div>
                        </div>
                      </div>
                      <div className="mobile-employee-right">
                        {!onLeave && (
                          <div className={`mobile-check-icon ${isSelected ? 'checked' : ''}`}>
                            <i className="fas fa-check"></i>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Step 2: Simplified Work Settings */}
      {currentStep === 2 && (
        <div className="step-container step-2-mobile">
          <div className="step-header">
            <h2>🕐️ 근무 시간 설정</h2>
            <p>간단하게 근무 시간을 설정해주세요</p>
          </div>
          
          <div className="mobile-step-content">
            {/* Shift Pattern Manager - Works for both PC and Mobile */}
            <ShiftPatternManager 
              patterns={shiftPatterns}
              onPatternsChange={setShiftPatterns}
              onSave={() => saveShiftPatterns(shiftPatterns)}
              experienceLevels={experienceLevels}
              onExperienceLevelsChange={setExperienceLevels}
            />
            
            {/* Simple Rules with Explanations */}
            <div className="mobile-rules-section">
              <h3><i className="fas fa-cog"></i> 근무 제약 조건 설정</h3>
              <p className="rules-explanation">
                스케줄 생성 시 지켜야 할 규칙들을 설정합니다.
                이 설정들은 직원들의 건강과 워라밸을 보호하기 위한 것입니다.
              </p>
              
              <div className="mobile-rules-list">
                <div className="mobile-rule-item">
                  <div className="rule-icon"><i className="fas fa-calendar-check"></i></div>
                  <div className="rule-content">
                    <div className="rule-info">
                      <div className="rule-label">연속 근무 제한</div>
                      <div className="rule-description">직원이 쉬는 날 없이 연속으로 일할 수 있는 최대 일수</div>
                    </div>
                    <select 
                      className="mobile-select"
                      value={workConditions.maxConsecutiveDays}
                      onChange={(e) => setWorkConditions(prev => ({
                        ...prev,
                        maxConsecutiveDays: parseInt(e.target.value)
                      }))}
                    >
                      <option value="3">3일까지</option>
                      <option value="4">4일까지</option>
                      <option value="5">5일까지</option>
                      <option value="6">6일까지</option>
                      <option value="7">제한 없음</option>
                    </select>
                  </div>
                </div>
                
                <div className="mobile-rule-item">
                  <div className="rule-icon"><i className="fas fa-bed"></i></div>
                  <div className="rule-content">
                    <div className="rule-info">
                      <div className="rule-label">주당 최소 휴무</div>
                      <div className="rule-description">매주 보장되어야 하는 최소 휴무 일수</div>
                    </div>
                    <select 
                      className="mobile-select"
                      value={workConditions.minRestDays}
                      onChange={(e) => setWorkConditions(prev => ({
                        ...prev,
                        minRestDays: parseInt(e.target.value)
                      }))}
                    >
                      <option value="1">주 1일</option>
                      <option value="2">주 2일</option>
                      <option value="3">주 3일</option>
                    </select>
                  </div>
                </div>
                
                <div className="mobile-rule-item">
                  <div className="rule-icon"><i className="fas fa-exclamation-triangle"></i></div>
                  <div className="rule-content">
                    <div className="rule-info">
                      <div className="rule-label">같이 근무 불가</div>
                      <div className="rule-description">
                        서로 같은 시간에 근무하면 안 되는 직원들
                        (예: 부부, 갈등 관계 등)
                      </div>
                    </div>
                    <button 
                      className="mobile-btn-small"
                      onClick={() => setShowConflictModal(true)}
                    >
                      {workConditions.conflicts.length > 0 
                        ? `${workConditions.conflicts.length}개 설정됨`
                        : '설정하기'
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mobile-step-info">
              <i className="fas fa-info-circle"></i>
              <p>
                <strong><i className="fas fa-lightbulb"></i> 알아두세요!</strong><br/>
                자동 생성은 이 규칙들을 최대한 지키려고 하지만, 
                직원이 부족하거나 특수한 상황에서는 일부 규칙이 지켜지지 않을 수 있습니다.
                생성된 스케줄은 언제든지 수동으로 수정 가능합니다.
              </p>
            </div>
            
            <div className="grid-layout" style={{display: 'none'}}>
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
                <h3><i className="fas fa-user-slash"></i> 근무 제약 조건</h3>
                
                <div className="conflict-builder">
                  <h4>같이 근무 불가 설정</h4>
                  <p className="conflict-description">
                    서로 같은 시간에 근무하면 안 되는 직원들을 설정합니다.
                  </p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowConflictModal(true)}
                  >
                    <i className="fas fa-user-slash"></i>
                    {workConditions.conflicts.length > 0 
                      ? `제약 관리 (${workConditions.conflicts.length}개 설정됨)`
                      : '제약 설정하기'
                    }
                  </button>
                  
                  {workConditions.conflicts.length > 0 && (
                    <div className="conflict-list">
                      {workConditions.conflicts.map((conflict, idx) => (
                        <div key={idx} className="conflict-item">
                          <span className="conflict-text">
                            <i className="fas fa-user"></i> {conflict.emp1Name} 
                            <i className="fas fa-times" style={{margin: '0 10px', color: '#dc3545'}}></i> 
                            <i className="fas fa-user"></i> {conflict.emp2Name}
                            {conflict.reason && (
                              <span className="conflict-reason-badge" style={{marginLeft: '10px', fontSize: '12px', color: '#6c757d'}}>
                                ({conflict.reason === 'family' ? '가족 관계' : 
                                  conflict.reason === 'conflict' ? '갈등 관계' :
                                  conflict.reason === 'skill' ? '동일 업무' : '기타'})
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
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
                    {generatedSchedule && generatedSchedule.schedulesByDate ? 
                      Object.entries(generatedSchedule.schedulesByDate).map(([date, schedules]) => (
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
                    )) : (
                      <div className="no-schedules-message">
                        <p>생성된 스케줄이 없습니다. 스케줄을 생성해주세요.</p>
                      </div>
                    )}
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
                    onClick={() => handleStepChange(2)}
                  >
                    <i className="fas fa-cog"></i> 설정 수정
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Navigation */}
      <div className={`navigation-controls step-${currentStep}`}>
        {currentStep > 1 && (
          <button 
            className="btn btn-secondary"
            onClick={() => handleStepChange(currentStep - 1)}
          >
            <i className="fas fa-chevron-left"></i> 이전 단계
          </button>
        )}
        
        {currentStep < 3 && (
          <button 
            className="btn btn-primary"
            onClick={() => handleStepChange(currentStep + 1)}
            disabled={!validateStep(currentStep)}
          >
            {currentStep === 1 ? '근무 패턴 설정' : '스케줄 생성'} 
            <i className="fas fa-chevron-right"></i>
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
      
      {/* Conflict Manager Modal */}
      <ConflictManager
        employees={employees.filter(e => periodData.selectedEmployees.includes(e.id))}
        conflicts={workConditions.conflicts}
        onAddConflict={addConflict}
        onRemoveConflict={removeConflict}
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
      />
    </div>
  );
};

export default ScheduleAutoGenerator;