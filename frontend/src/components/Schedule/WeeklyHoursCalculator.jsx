import React, { useMemo } from 'react';
import './WeeklyHoursCalculator.css';

const WeeklyHoursCalculator = ({ 
  selectedEmployees, 
  shiftPatterns, 
  startDate, 
  endDate, 
  totalRequiredHours,
  allocatedHours 
}) => {
  
  // Calculate total employees available
  const totalEmployees = selectedEmployees.length;
  
  // Calculate work days in the period
  const workDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);
  
  // Calculate average hours per employee
  const avgHoursPerEmployee = useMemo(() => {
    if (totalEmployees === 0) return 0;
    return totalRequiredHours / totalEmployees;
  }, [totalRequiredHours, totalEmployees]);
  
  // Calculate coverage percentage
  const coveragePercentage = useMemo(() => {
    if (totalRequiredHours === 0) return 0;
    return Math.min((allocatedHours / totalRequiredHours) * 100, 100);
  }, [allocatedHours, totalRequiredHours]);
  
  // Get status color based on coverage
  const getStatusColor = (percentage) => {
    if (percentage >= 95) return '#10B981'; // Green
    if (percentage >= 80) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };
  
  // Calculate shift distribution
  const shiftDistribution = useMemo(() => {
    return shiftPatterns
      .filter(pattern => pattern.enabled)
      .map(pattern => {
        const dailyHours = calculateShiftHours(pattern.start, pattern.end);
        const totalDays = pattern.days.length * Math.ceil(workDays / 7);
        const totalHours = dailyHours * pattern.requiredStaff * totalDays;
        
        return {
          name: pattern.name,
          color: pattern.color,
          hours: totalHours,
          percentage: totalRequiredHours > 0 ? (totalHours / totalRequiredHours) * 100 : 0
        };
      });
  }, [shiftPatterns, workDays, totalRequiredHours]);
  
  const calculateShiftHours = (start, end) => {
    const startTime = new Date(`2000-01-01T${start}`);
    const endTime = new Date(`2000-01-01T${end}`);
    
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }
    
    return (endTime - startTime) / (1000 * 60 * 60);
  };
  
  return (
    <div className="weekly-hours-calculator">
      <div className="calculator-header">
        <h3>📊 근무 시간 계산기</h3>
        <p>총 필요 시간과 배정된 시간을 실시간으로 확인하세요</p>
      </div>
      
      <div className="calculator-content">
        {/* Main Stats */}
        <div className="stats-grid">
          <div className="stat-card total-hours">
            <div className="stat-icon">⏰</div>
            <div className="stat-info">
              <div className="stat-value">{totalRequiredHours.toFixed(1)}h</div>
              <div className="stat-label">총 필요 시간</div>
            </div>
          </div>
          
          <div className="stat-card allocated-hours">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <div className="stat-value">{allocatedHours.toFixed(1)}h</div>
              <div className="stat-label">배정된 시간</div>
            </div>
          </div>
          
          <div className="stat-card employee-count">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <div className="stat-value">{totalEmployees}</div>
              <div className="stat-label">선택된 직원</div>
            </div>
          </div>
          
          <div className="stat-card avg-hours">
            <div className="stat-icon">📈</div>
            <div className="stat-info">
              <div className="stat-value">{avgHoursPerEmployee.toFixed(1)}h</div>
              <div className="stat-label">직원당 평균</div>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="progress-section">
          <div className="progress-header">
            <span className="progress-title">시간 배정 진행률</span>
            <span 
              className="progress-percentage"
              style={{ color: getStatusColor(coveragePercentage) }}
            >
              {coveragePercentage.toFixed(1)}%
            </span>
          </div>
          
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${coveragePercentage}%`,
                  backgroundColor: getStatusColor(coveragePercentage)
                }}
              ></div>
            </div>
            <div className="progress-markers">
              <div className="marker" style={{ left: '80%' }}>
                <div className="marker-line"></div>
                <div className="marker-label">80%</div>
              </div>
              <div className="marker" style={{ left: '95%' }}>
                <div className="marker-line"></div>
                <div className="marker-label">95%</div>
              </div>
            </div>
          </div>
          
          <div className="progress-legend">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#EF4444' }}></div>
              <span>부족 (80% 미만)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#F59E0B' }}></div>
              <span>주의 (80-95%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#10B981' }}></div>
              <span>양호 (95% 이상)</span>
            </div>
          </div>
        </div>
        
        {/* Shift Distribution */}
        {shiftDistribution.length > 0 && (
          <div className="distribution-section">
            <h4>근무 패턴별 시간 분배</h4>
            <div className="distribution-chart">
              {shiftDistribution.map((shift, index) => (
                <div key={index} className="distribution-item">
                  <div className="distribution-header">
                    <div className="shift-info">
                      <div 
                        className="shift-color"
                        style={{ backgroundColor: shift.color }}
                      ></div>
                      <span className="shift-name">{shift.name}</span>
                    </div>
                    <div className="shift-stats">
                      <span className="shift-hours">{shift.hours.toFixed(1)}h</span>
                      <span className="shift-percentage">({shift.percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="distribution-bar">
                    <div 
                      className="distribution-fill"
                      style={{ 
                        width: `${shift.percentage}%`,
                        backgroundColor: shift.color
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Recommendations */}
        <div className="recommendations-section">
          <h4>💡 추천 사항</h4>
          <div className="recommendations-list">
            {coveragePercentage < 80 && (
              <div className="recommendation warning">
                <span className="rec-icon">⚠️</span>
                <span>시간 배정이 부족합니다. 근무 패턴을 추가하거나 직원 수를 늘려보세요.</span>
              </div>
            )}
            {avgHoursPerEmployee > 50 && (
              <div className="recommendation info">
                <span className="rec-icon">ℹ️</span>
                <span>직원당 평균 근무 시간이 높습니다. 업무 분산을 고려해보세요.</span>
              </div>
            )}
            {totalEmployees < 3 && (
              <div className="recommendation warning">
                <span className="rec-icon">⚠️</span>
                <span>선택된 직원 수가 적습니다. 충분한 교대 인력을 확보하세요.</span>
              </div>
            )}
            {coveragePercentage >= 95 && (
              <div className="recommendation success">
                <span className="rec-icon">✅</span>
                <span>훌륭합니다! 시간 배정이 적절하게 이루어졌습니다.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyHoursCalculator;