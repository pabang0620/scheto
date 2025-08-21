import React, { useState } from 'react';
import './ShiftPatternManager.css';

const ShiftPatternManager = ({ patterns, onPatternsChange, onSave, experienceLevels, onExperienceLevelsChange }) => {
  const [editingPattern, setEditingPattern] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedPatterns, setExpandedPatterns] = useState({}); // Track which patterns are expanded
  const [showExperienceLevelConfig, setShowExperienceLevelConfig] = useState(false);
  const [localExperienceLevels, setLocalExperienceLevels] = useState(
    experienceLevels || [
      { id: 1, name: '3년차', years: 3, enabled: true },
      { id: 2, name: '5년차', years: 5, enabled: true },
      { id: 3, name: '7년차', years: 7, enabled: false },
      { id: 4, name: '10년차', years: 10, enabled: false }
    ]
  );
  
  const updateExperienceLevels = (newLevels) => {
    setLocalExperienceLevels(newLevels);
    if (onExperienceLevelsChange) {
      onExperienceLevelsChange(newLevels);
    }
  };
  
  const colorOptions = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16'
  ];
  
  const defaultPattern = {
    name: '새 패턴',
    start: '09:00',
    end: '18:00',
    requiredStaff: 1,
    enabled: true,
    color: colorOptions[patterns.length % colorOptions.length],
    days: [1, 2, 3, 4, 5], // Mon-Fri
    requirements: {
      minRankS: 0,
      minRankA: 0,
      minRankB: 0,
      minRankC: 0,
      experienceLevels: {}
    }
  };
  
  const handleAddPattern = () => {
    const newPattern = {
      ...defaultPattern,
      id: Date.now(),
      name: `패턴 ${patterns.length + 1}`
    };
    onPatternsChange([...patterns, newPattern]);
    // Expand the newly added pattern
    setExpandedPatterns(prev => ({ ...prev, [newPattern.id]: true }));
    setShowAddForm(false);
  };
  
  const togglePatternExpand = (id) => {
    setExpandedPatterns(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  const handleUpdatePattern = (id, field, value) => {
    const updated = patterns.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    );
    onPatternsChange(updated);
  };
  
  const handleDeletePattern = (id) => {
    if (patterns.length > 1) {
      onPatternsChange(patterns.filter(p => p.id !== id));
    } else {
      alert('최소 1개의 패턴은 필요합니다.');
    }
  };
  
  const calculateHours = (start, end) => {
    const startTime = new Date(`2000-01-01T${start}`);
    const endTime = new Date(`2000-01-01T${end}`);
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }
    return ((endTime - startTime) / (1000 * 60 * 60)).toFixed(1);
  };
  
  return (
    <div className="shift-pattern-manager">
      <div className="manager-header">
        <h3><i className="fas fa-clock"></i> 근무 패턴 관리</h3>
        <div className="manager-actions">
          {onSave && (
            <button 
              className="btn-save-patterns"
              onClick={onSave}
              title="패턴을 저장하면 다음에 접속해도 유지됩니다"
            >
              <i className="fas fa-save"></i> 저장
            </button>
          )}
          <button 
            className="btn-add-pattern"
            onClick={() => setShowAddForm(true)}
          >
            <i className="fas fa-plus"></i> 패턴 추가
          </button>
        </div>
      </div>
      
      
      {/* Pattern List */}
      <div className="pattern-list">
        {patterns.map((pattern, index) => (
          <div key={pattern.id} className={`pattern-card ${expandedPatterns[pattern.id] ? 'expanded' : 'collapsed'}`}>
            <div className="pattern-header" onClick={() => togglePatternExpand(pattern.id)}>
              <div className="pattern-header-left">
                <button className="pattern-expand-btn">
                  <i className={`fas fa-chevron-${expandedPatterns[pattern.id] ? 'down' : 'right'}`}></i>
                </button>
                <div className="pattern-color-indicator" style={{ backgroundColor: pattern.color }}></div>
                <input 
                  className="pattern-name-input"
                  value={pattern.name}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleUpdatePattern(pattern.id, 'name', e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="패턴 이름"
                />
                <div className="pattern-summary">
                  <span className="summary-time">
                    <i className="fas fa-clock"></i> {pattern.start} - {pattern.end}
                  </span>
                  <span className="summary-staff">
                    <i className="fas fa-users"></i> {pattern.requiredStaff}명
                  </span>
                  <span className="summary-hours">
                    {calculateHours(pattern.start, pattern.end)}시간
                  </span>
                </div>
              </div>
              <button 
                className="btn-delete-pattern"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePattern(pattern.id);
                }}
                disabled={patterns.length === 1}
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
            
            {expandedPatterns[pattern.id] && (
              <div className="pattern-body">
              <div className="pattern-time">
                <div className="time-input-group">
                  <label>시작</label>
                  <input 
                    type="time"
                    value={pattern.start}
                    onChange={(e) => handleUpdatePattern(pattern.id, 'start', e.target.value)}
                  />
                </div>
                <div className="time-input-group">
                  <label>종료</label>
                  <input 
                    type="time"
                    value={pattern.end}
                    onChange={(e) => handleUpdatePattern(pattern.id, 'end', e.target.value)}
                  />
                </div>
                <div className="time-info">
                  {calculateHours(pattern.start, pattern.end)}시간
                </div>
              </div>
              
              <div className="pattern-staff">
                <label>필요 인원</label>
                <div className="staff-control">
                  <button 
                    className="staff-btn"
                    onClick={() => handleUpdatePattern(pattern.id, 'requiredStaff', Math.max(1, pattern.requiredStaff - 1))}
                  >
                    <i className="fas fa-minus"></i>
                  </button>
                  <span className="staff-count">{pattern.requiredStaff}명</span>
                  <button 
                    className="staff-btn"
                    onClick={() => handleUpdatePattern(pattern.id, 'requiredStaff', pattern.requiredStaff + 1)}
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
              </div>
              
              <div className="pattern-days">
                <label>적용 요일</label>
                <div className="days-selector">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                    <button
                      key={idx}
                      className={`day-btn ${pattern.days?.includes(idx) ? 'active' : ''}`}
                      onClick={() => {
                        const newDays = pattern.days?.includes(idx)
                          ? pattern.days.filter(d => d !== idx)
                          : [...(pattern.days || []), idx].sort();
                        handleUpdatePattern(pattern.id, 'days', newDays);
                      }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Requirements Section */}
              <div className="pattern-requirements">
                <label><i className="fas fa-star"></i> 최소 요구사항</label>
                
                <div className="requirements-grid">
                  <div className="requirement-group">
                    <span className="requirement-label">랭크별 최소 인원</span>
                    <div className="requirement-controls">
                      <div className="requirement-item">
                        <span className="rank-badge rank-s">S급</span>
                        <div className="requirement-input">
                          <button 
                            className="req-btn"
                            onClick={() => {
                              const reqs = pattern.requirements || {};
                              handleUpdatePattern(pattern.id, 'requirements', {
                                ...reqs,
                                minRankS: Math.max(0, (reqs.minRankS || 0) - 1)
                              });
                            }}
                          >
                            <i className="fas fa-minus"></i>
                          </button>
                          <span className="req-count">{pattern.requirements?.minRankS || 0}명</span>
                          <button 
                            className="req-btn"
                            onClick={() => {
                              const reqs = pattern.requirements || {};
                              handleUpdatePattern(pattern.id, 'requirements', {
                                ...reqs,
                                minRankS: (reqs.minRankS || 0) + 1
                              });
                            }}
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        </div>
                      </div>
                      
                      <div className="requirement-item">
                        <span className="rank-badge rank-a">A급</span>
                        <div className="requirement-input">
                          <button 
                            className="req-btn"
                            onClick={() => {
                              const reqs = pattern.requirements || {};
                              handleUpdatePattern(pattern.id, 'requirements', {
                                ...reqs,
                                minRankA: Math.max(0, (reqs.minRankA || 0) - 1)
                              });
                            }}
                          >
                            <i className="fas fa-minus"></i>
                          </button>
                          <span className="req-count">{pattern.requirements?.minRankA || 0}명</span>
                          <button 
                            className="req-btn"
                            onClick={() => {
                              const reqs = pattern.requirements || {};
                              handleUpdatePattern(pattern.id, 'requirements', {
                                ...reqs,
                                minRankA: (reqs.minRankA || 0) + 1
                              });
                            }}
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        </div>
                      </div>
                      
                      <div className="requirement-item">
                        <span className="rank-badge rank-b">B급</span>
                        <div className="requirement-input">
                          <button 
                            className="req-btn"
                            onClick={() => {
                              const reqs = pattern.requirements || {};
                              handleUpdatePattern(pattern.id, 'requirements', {
                                ...reqs,
                                minRankB: Math.max(0, (reqs.minRankB || 0) - 1)
                              });
                            }}
                          >
                            <i className="fas fa-minus"></i>
                          </button>
                          <span className="req-count">{pattern.requirements?.minRankB || 0}명</span>
                          <button 
                            className="req-btn"
                            onClick={() => {
                              const reqs = pattern.requirements || {};
                              handleUpdatePattern(pattern.id, 'requirements', {
                                ...reqs,
                                minRankB: (reqs.minRankB || 0) + 1
                              });
                            }}
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        </div>
                      </div>
                      
                      <div className="requirement-item">
                        <span className="rank-badge rank-c">C급</span>
                        <div className="requirement-input">
                          <button 
                            className="req-btn"
                            onClick={() => {
                              const reqs = pattern.requirements || {};
                              handleUpdatePattern(pattern.id, 'requirements', {
                                ...reqs,
                                minRankC: Math.max(0, (reqs.minRankC || 0) - 1)
                              });
                            }}
                          >
                            <i className="fas fa-minus"></i>
                          </button>
                          <span className="req-count">{pattern.requirements?.minRankC || 0}명</span>
                          <button 
                            className="req-btn"
                            onClick={() => {
                              const reqs = pattern.requirements || {};
                              handleUpdatePattern(pattern.id, 'requirements', {
                                ...reqs,
                                minRankC: (reqs.minRankC || 0) + 1
                              });
                            }}
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="requirement-group">
                    <div className="requirement-label-with-config">
                      <span className="requirement-label">경력별 최소 인원</span>
                      <button 
                        className="config-btn"
                        onClick={() => setShowExperienceLevelConfig(!showExperienceLevelConfig)}
                        title="경력 레벨 설정"
                      >
                        <i className="fas fa-cog"></i>
                      </button>
                    </div>
                    
                    {showExperienceLevelConfig && (
                      <div className="experience-level-config">
                        <div className="config-header">
                          <span className="config-title">경력 레벨 설정</span>
                          <button 
                            className="add-level-btn"
                            onClick={() => {
                              const nextYear = Math.max(...localExperienceLevels.map(l => l.years)) + 1;
                              const newLevel = {
                                id: Date.now(),
                                name: `${nextYear}년차`,
                                years: nextYear,
                                enabled: true
                              };
                              updateExperienceLevels([...localExperienceLevels, newLevel]);
                            }}
                          >
                            <i className="fas fa-plus"></i> 추가
                          </button>
                        </div>
                        <div className="level-list">
                          {localExperienceLevels.map(level => (
                            <div key={level.id} className="level-item">
                              <input
                                type="checkbox"
                                checked={level.enabled}
                                onChange={(e) => {
                                  updateExperienceLevels(localExperienceLevels.map(l => 
                                    l.id === level.id ? { ...l, enabled: e.target.checked } : l
                                  ));
                                }}
                              />
                              <input
                                type="number"
                                className="level-years-input"
                                value={level.years}
                                min="1"
                                max="50"
                                onChange={(e) => {
                                  const years = parseInt(e.target.value) || 1;
                                  updateExperienceLevels(localExperienceLevels.map(l => 
                                    l.id === level.id ? { 
                                      ...l, 
                                      years: years,
                                      name: `${years}년차`
                                    } : l
                                  ));
                                }}
                              />
                              <span className="level-display-name">{level.name} 이상</span>
                              {localExperienceLevels.length > 1 && (
                                <button
                                  className="remove-level-btn"
                                  onClick={() => {
                                    updateExperienceLevels(localExperienceLevels.filter(l => l.id !== level.id));
                                  }}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="requirement-controls">
                      {localExperienceLevels.filter(level => level.enabled).map(level => {
                        const reqs = pattern.requirements || {};
                        const expLevels = reqs.experienceLevels || {};
                        const currentValue = expLevels[level.id] || 0;
                        
                        return (
                          <div key={level.id} className="requirement-item">
                            <span className="experience-badge">{level.name}↑</span>
                            <div className="requirement-input">
                              <button 
                                className="req-btn"
                                onClick={() => {
                                  handleUpdatePattern(pattern.id, 'requirements', {
                                    ...reqs,
                                    experienceLevels: {
                                      ...expLevels,
                                      [level.id]: Math.max(0, currentValue - 1)
                                    }
                                  });
                                }}
                              >
                                <i className="fas fa-minus"></i>
                              </button>
                              <span className="req-count">{currentValue}명</span>
                              <button 
                                className="req-btn"
                                onClick={() => {
                                  handleUpdatePattern(pattern.id, 'requirements', {
                                    ...reqs,
                                    experienceLevels: {
                                      ...expLevels,
                                      [level.id]: currentValue + 1
                                    }
                                  });
                                }}
                              >
                                <i className="fas fa-plus"></i>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Add Pattern Form Modal */}
      {showAddForm && (
        <div className="pattern-modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="pattern-modal" onClick={(e) => e.stopPropagation()}>
            <h4>새 패턴 추가</h4>
            <button className="btn-quick-add" onClick={handleAddPattern}>
              <i className="fas fa-plus"></i> 빠른 추가
            </button>
            <button className="btn-cancel" onClick={() => setShowAddForm(false)}>
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftPatternManager;