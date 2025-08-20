import React, { useState } from 'react';
import './ShiftPatternBuilder.css';

const ShiftPatternBuilder = ({ patterns, onPatternsChange, employees }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPattern, setNewPattern] = useState({
    name: '',
    start: '09:00',
    end: '18:00',
    requiredStaff: 2,
    color: '#3B82F6',
    days: [1, 2, 3, 4, 5] // Monday to Friday
  });
  
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const presetColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'
  ];
  
  const presetPatterns = [
    {
      name: '오전 근무',
      start: '09:00',
      end: '18:00',
      requiredStaff: 2,
      color: '#3B82F6',
      days: [1, 2, 3, 4, 5]
    },
    {
      name: '오후 근무',
      start: '14:00',
      end: '22:00',
      requiredStaff: 2,
      color: '#EF4444',
      days: [1, 2, 3, 4, 5]
    },
    {
      name: '야간 근무',
      start: '22:00',
      end: '06:00',
      requiredStaff: 1,
      color: '#8B5CF6',
      days: [1, 2, 3, 4, 5]
    },
    {
      name: '주말 근무',
      start: '10:00',
      end: '19:00',
      requiredStaff: 1,
      color: '#F59E0B',
      days: [0, 6]
    }
  ];
  
  // Calculate shift hours
  const calculateShiftHours = (start, end) => {
    const startTime = new Date(`2000-01-01T${start}`);
    const endTime = new Date(`2000-01-01T${end}`);
    
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }
    
    return (endTime - startTime) / (1000 * 60 * 60);
  };
  
  // Add new pattern
  const addPattern = () => {
    if (!newPattern.name.trim()) return;
    
    const pattern = {
      ...newPattern,
      id: Date.now(),
      enabled: true
    };
    
    onPatternsChange([...patterns, pattern]);
    setNewPattern({
      name: '',
      start: '09:00',
      end: '18:00',
      requiredStaff: 2,
      color: presetColors[patterns.length % presetColors.length],
      days: [1, 2, 3, 4, 5]
    });
    setShowAddForm(false);
  };
  
  // Update pattern
  const updatePattern = (id, updates) => {
    onPatternsChange(patterns.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ));
  };
  
  // Remove pattern
  const removePattern = (id) => {
    onPatternsChange(patterns.filter(p => p.id !== id));
  };
  
  // Toggle day
  const toggleDay = (patternId, day) => {
    const pattern = patterns.find(p => p.id === patternId);
    const newDays = pattern.days.includes(day)
      ? pattern.days.filter(d => d !== day)
      : [...pattern.days, day].sort((a, b) => a - b);
    
    updatePattern(patternId, { days: newDays });
  };
  
  // Apply preset pattern
  const applyPreset = (preset) => {
    setNewPattern({
      ...preset,
      color: presetColors[patterns.length % presetColors.length]
    });
    setShowAddForm(true);
  };
  
  return (
    <div className="shift-pattern-builder">
      <div className="builder-header">
        <h3>🕐 근무 패턴 설정</h3>
        <p>다양한 근무 시간대와 필요 인원을 설정하세요</p>
      </div>
      
      <div className="builder-content">
        {/* Preset Patterns */}
        <div className="preset-section">
          <h4>빠른 설정</h4>
          <div className="preset-grid">
            {presetPatterns.map((preset, index) => (
              <div 
                key={index}
                className="preset-card"
                onClick={() => applyPreset(preset)}
              >
                <div className="preset-header">
                  <div 
                    className="preset-color"
                    style={{ backgroundColor: preset.color }}
                  ></div>
                  <span className="preset-name">{preset.name}</span>
                </div>
                <div className="preset-details">
                  <span className="preset-time">
                    {preset.start} - {preset.end}
                  </span>
                  <span className="preset-staff">
                    {preset.requiredStaff}명
                  </span>
                </div>
                <div className="preset-days">
                  {preset.days.map(day => dayNames[day]).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Current Patterns */}
        <div className="patterns-section">
          <div className="section-header">
            <h4>설정된 근무 패턴</h4>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddForm(true)}
            >
              + 패턴 추가
            </button>
          </div>
          
          <div className="patterns-list">
            {patterns.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📅</span>
                <p>아직 설정된 근무 패턴이 없습니다</p>
                <p>빠른 설정을 사용하거나 직접 패턴을 추가해보세요</p>
              </div>
            ) : (
              patterns.map(pattern => (
                <div key={pattern.id} className="pattern-card">
                  <div className="pattern-header">
                    <div className="pattern-title">
                      <div 
                        className="pattern-color"
                        style={{ backgroundColor: pattern.color }}
                      ></div>
                      <input
                        type="text"
                        value={pattern.name}
                        onChange={(e) => updatePattern(pattern.id, { name: e.target.value })}
                        className="pattern-name-input"
                      />
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={pattern.enabled}
                          onChange={(e) => updatePattern(pattern.id, { enabled: e.target.checked })}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                    <button 
                      className="btn btn-danger btn-xs"
                      onClick={() => removePattern(pattern.id)}
                    >
                      삭제
                    </button>
                  </div>
                  
                  {pattern.enabled && (
                    <div className="pattern-details">
                      {/* Time Settings */}
                      <div className="time-settings">
                        <div className="time-input-group">
                          <label>시작 시간</label>
                          <input
                            type="time"
                            value={pattern.start}
                            onChange={(e) => updatePattern(pattern.id, { start: e.target.value })}
                            className="time-input"
                          />
                        </div>
                        <div className="time-separator">~</div>
                        <div className="time-input-group">
                          <label>종료 시간</label>
                          <input
                            type="time"
                            value={pattern.end}
                            onChange={(e) => updatePattern(pattern.id, { end: e.target.value })}
                            className="time-input"
                          />
                        </div>
                        <div className="staff-input-group">
                          <label>필요 인원</label>
                          <input
                            type="number"
                            min="1"
                            max={employees.length}
                            value={pattern.requiredStaff}
                            onChange={(e) => updatePattern(pattern.id, { requiredStaff: parseInt(e.target.value) })}
                            className="staff-input"
                          />
                        </div>
                      </div>
                      
                      {/* Days Selection */}
                      <div className="days-selection">
                        <label>근무 요일</label>
                        <div className="days-grid">
                          {dayNames.map((day, index) => (
                            <button
                              key={index}
                              className={`day-button ${pattern.days.includes(index) ? 'selected' : ''}`}
                              onClick={() => toggleDay(pattern.id, index)}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Color Selection */}
                      <div className="color-selection">
                        <label>패턴 색상</label>
                        <div className="color-grid">
                          {presetColors.map(color => (
                            <button
                              key={color}
                              className={`color-button ${pattern.color === color ? 'selected' : ''}`}
                              style={{ backgroundColor: color }}
                              onClick={() => updatePattern(pattern.id, { color })}
                            ></button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Pattern Summary */}
                      <div className="pattern-summary">
                        <div className="summary-item">
                          <span className="summary-label">근무 시간:</span>
                          <span className="summary-value">
                            {calculateShiftHours(pattern.start, pattern.end).toFixed(1)}시간
                          </span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">주간 근무일:</span>
                          <span className="summary-value">{pattern.days.length}일</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">일일 총 시간:</span>
                          <span className="summary-value">
                            {(calculateShiftHours(pattern.start, pattern.end) * pattern.requiredStaff).toFixed(1)}시간
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Add Pattern Form */}
        {showAddForm && (
          <div className="add-form-overlay">
            <div className="add-form">
              <div className="form-header">
                <h4>새 근무 패턴 추가</h4>
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowAddForm(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="form-content">
                <div className="form-group">
                  <label>패턴 이름</label>
                  <input
                    type="text"
                    value={newPattern.name}
                    onChange={(e) => setNewPattern(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="예: 오전 근무, 야간 근무 등"
                    className="text-input"
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>시작 시간</label>
                    <input
                      type="time"
                      value={newPattern.start}
                      onChange={(e) => setNewPattern(prev => ({ ...prev, start: e.target.value }))}
                      className="time-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>종료 시간</label>
                    <input
                      type="time"
                      value={newPattern.end}
                      onChange={(e) => setNewPattern(prev => ({ ...prev, end: e.target.value }))}
                      className="time-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>필요 인원</label>
                    <input
                      type="number"
                      min="1"
                      max={employees.length}
                      value={newPattern.requiredStaff}
                      onChange={(e) => setNewPattern(prev => ({ ...prev, requiredStaff: parseInt(e.target.value) }))}
                      className="number-input"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>근무 요일</label>
                  <div className="days-grid">
                    {dayNames.map((day, index) => (
                      <button
                        key={index}
                        className={`day-button ${newPattern.days.includes(index) ? 'selected' : ''}`}
                        onClick={() => {
                          const newDays = newPattern.days.includes(index)
                            ? newPattern.days.filter(d => d !== index)
                            : [...newPattern.days, index].sort((a, b) => a - b);
                          setNewPattern(prev => ({ ...prev, days: newDays }));
                        }}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="form-group">
                  <label>색상</label>
                  <div className="color-grid">
                    {presetColors.map(color => (
                      <button
                        key={color}
                        className={`color-button ${newPattern.color === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewPattern(prev => ({ ...prev, color }))}
                      ></button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowAddForm(false)}
                >
                  취소
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={addPattern}
                  disabled={!newPattern.name.trim() || newPattern.days.length === 0}
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShiftPatternBuilder;