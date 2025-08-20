import React, { useMemo } from 'react';
import './ScheduleHeatmap.css';

const ScheduleHeatmap = ({ schedule, employees, shiftPatterns }) => {
  
  // Generate time slots (24 hours in 1-hour intervals)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, []);
  
  // Get coverage data for heatmap
  const coverageData = useMemo(() => {
    if (!schedule?.schedulesByDate) return {};
    
    const data = {};
    
    Object.entries(schedule.schedulesByDate).forEach(([date, daySchedules]) => {
      data[date] = {};
      
      // Initialize all time slots with 0 coverage
      timeSlots.forEach(slot => {
        data[date][slot] = {
          count: 0,
          employees: [],
          intensity: 0
        };
      });
      
      // Calculate coverage for each time slot
      daySchedules.forEach(sched => {
        const startHour = parseInt(sched.startTime.split(':')[0]);
        const endHour = parseInt(sched.endTime.split(':')[0]);
        const employee = employees.find(e => e.id === sched.employeeId);
        
        // Handle overnight shifts
        if (endHour < startHour) {
          // From start to midnight
          for (let hour = startHour; hour < 24; hour++) {
            const slot = `${hour.toString().padStart(2, '0')}:00`;
            data[date][slot].count++;
            data[date][slot].employees.push(employee);
          }
          // From midnight to end
          for (let hour = 0; hour < endHour; hour++) {
            const slot = `${hour.toString().padStart(2, '0')}:00`;
            data[date][slot].count++;
            data[date][slot].employees.push(employee);
          }
        } else {
          // Normal shift
          for (let hour = startHour; hour < endHour; hour++) {
            const slot = `${hour.toString().padStart(2, '0')}:00`;
            data[date][slot].count++;
            data[date][slot].employees.push(employee);
          }
        }
      });
      
      // Calculate intensity (0-1) based on max coverage
      const maxCoverage = Math.max(...Object.values(data[date]).map(slot => slot.count));
      Object.keys(data[date]).forEach(slot => {
        data[date][slot].intensity = maxCoverage > 0 ? data[date][slot].count / maxCoverage : 0;
      });
    });
    
    return data;
  }, [schedule, employees, timeSlots]);
  
  // Get dates array
  const dates = useMemo(() => {
    return Object.keys(coverageData).sort();
  }, [coverageData]);
  
  // Get intensity color
  const getIntensityColor = (intensity, count) => {
    if (count === 0) return '#F3F4F6'; // Light gray for no coverage
    
    const baseColor = [59, 130, 246]; // Blue base color
    const alpha = 0.2 + (intensity * 0.8); // Scale from 0.2 to 1.0
    
    return `rgba(${baseColor.join(',')}, ${alpha})`;
  };
  
  // Get coverage status
  const getCoverageStatus = (count) => {
    if (count === 0) return 'none';
    if (count === 1) return 'minimal';
    if (count <= 2) return 'adequate';
    return 'high';
  };
  
  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return {
      day: days[date.getDay()],
      date: `${date.getMonth() + 1}/${date.getDate()}`
    };
  };
  
  // Calculate overall statistics
  const overallStats = useMemo(() => {
    let totalSlots = 0;
    let coveredSlots = 0;
    let totalCoverage = 0;
    let peakCoverage = 0;
    
    Object.values(coverageData).forEach(dayData => {
      Object.values(dayData).forEach(slot => {
        totalSlots++;
        if (slot.count > 0) {
          coveredSlots++;
          totalCoverage += slot.count;
        }
        peakCoverage = Math.max(peakCoverage, slot.count);
      });
    });
    
    return {
      coveragePercentage: totalSlots > 0 ? (coveredSlots / totalSlots) * 100 : 0,
      averageCoverage: coveredSlots > 0 ? totalCoverage / coveredSlots : 0,
      peakCoverage
    };
  }, [coverageData]);
  
  return (
    <div className="schedule-heatmap">
      <div className="heatmap-header">
        <h3>📊 스케줄 커버리지 히트맵</h3>
        <p>시간대별 인력 배치 현황을 한눈에 확인하세요</p>
      </div>
      
      {/* Statistics */}
      <div className="heatmap-stats">
        <div className="stat-item">
          <span className="stat-value">{overallStats.coveragePercentage.toFixed(1)}%</span>
          <span className="stat-label">커버리지</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{overallStats.averageCoverage.toFixed(1)}</span>
          <span className="stat-label">평균 인력</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{overallStats.peakCoverage}</span>
          <span className="stat-label">최대 인력</span>
        </div>
      </div>
      
      {/* Heatmap Grid */}
      <div className="heatmap-container">
        <div className="heatmap-grid">
          {/* Time headers */}
          <div className="time-header-cell"></div>
          {timeSlots.filter((_, index) => index % 2 === 0).map(slot => (
            <div key={slot} className="time-header">
              {slot}
            </div>
          ))}
          
          {/* Date rows */}
          {dates.map(date => {
            const dateInfo = formatDate(date);
            
            return (
              <React.Fragment key={date}>
                <div className="date-header">
                  <div className="date-day">{dateInfo.day}</div>
                  <div className="date-date">{dateInfo.date}</div>
                </div>
                {timeSlots.filter((_, index) => index % 2 === 0).map(slot => {
                  const slotData = coverageData[date]?.[slot] || { count: 0, intensity: 0, employees: [] };
                  const nextSlotData = coverageData[date]?.[timeSlots[timeSlots.indexOf(slot) + 1]] || { count: 0 };
                  const maxCount = Math.max(slotData.count, nextSlotData.count);
                  const avgIntensity = (slotData.intensity + (nextSlotData.intensity || 0)) / 2;
                  
                  return (
                    <div
                      key={`${date}-${slot}`}
                      className={`heatmap-cell coverage-${getCoverageStatus(maxCount)}`}
                      style={{ backgroundColor: getIntensityColor(avgIntensity, maxCount) }}
                      title={`${slot}-${timeSlots[timeSlots.indexOf(slot) + 1] || '24:00'}: ${maxCount}명`}
                    >
                      <span className="cell-count">{maxCount || ''}</span>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="heatmap-legend">
        <div className="legend-section">
          <h4>커버리지 범례</h4>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color coverage-none"></div>
              <span>미배치</span>
            </div>
            <div className="legend-item">
              <div className="legend-color coverage-minimal"></div>
              <span>1명</span>
            </div>
            <div className="legend-item">
              <div className="legend-color coverage-adequate"></div>
              <span>2명</span>
            </div>
            <div className="legend-item">
              <div className="legend-color coverage-high"></div>
              <span>3명+</span>
            </div>
          </div>
        </div>
        
        <div className="legend-section">
          <h4>권장사항</h4>
          <div className="recommendations">
            <div className="recommendation">
              <span className="rec-icon">⚠️</span>
              <span>빨간색 영역: 인력 부족</span>
            </div>
            <div className="recommendation">
              <span className="rec-icon">✅</span>
              <span>파란색 영역: 적정 인력</span>
            </div>
            <div className="recommendation">
              <span className="rec-icon">📈</span>
              <span>진한 영역: 인력 집중</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Coverage Issues Alert */}
      {overallStats.coveragePercentage < 80 && (
        <div className="coverage-alert">
          <div className="alert-content">
            <span className="alert-icon">⚠️</span>
            <div className="alert-text">
              <strong>커버리지 부족 경고</strong>
              <p>전체 시간대 중 {(100 - overallStats.coveragePercentage).toFixed(1)}%가 인력 미배치 상태입니다. 
              근무 패턴을 조정하거나 직원을 추가로 배치하는 것을 고려해보세요.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Peak Hours Analysis */}
      <div className="peak-analysis">
        <h4>시간대별 분석</h4>
        <div className="peak-slots">
          {timeSlots.map(slot => {
            const totalCoverage = dates.reduce((sum, date) => {
              return sum + (coverageData[date]?.[slot]?.count || 0);
            }, 0);
            const avgCoverage = totalCoverage / dates.length;
            
            if (avgCoverage >= 2) {
              return (
                <div key={slot} className="peak-slot">
                  <span className="peak-time">{slot}</span>
                  <span className="peak-coverage">{avgCoverage.toFixed(1)}명</span>
                </div>
              );
            }
            return null;
          }).filter(Boolean)}
        </div>
      </div>
    </div>
  );
};

export default ScheduleHeatmap;