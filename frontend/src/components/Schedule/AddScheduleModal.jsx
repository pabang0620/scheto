import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getEmployees } from '../../services/api';
import './AddScheduleModal.css';

const AddScheduleModal = ({ isOpen, onClose, onSubmit, selectedDate, editingSchedule, existingSchedules = [] }) => {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    employeeId: '',
    date: selectedDate || new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '18:00',
    shiftType: 'day',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCustomTime, setShowCustomTime] = useState(false);

  const shiftPresets = [
    { 
      id: 'morning', 
      name: '오전 근무', 
      icon: '☀️', 
      start: '06:00', 
      end: '14:00',
      description: '새벽 6시 ~ 오후 2시 (8시간)',
      color: '#fbbf24'
    },
    { 
      id: 'day', 
      name: '주간 근무', 
      icon: '🌤️', 
      start: '09:00', 
      end: '18:00',
      description: '오전 9시 ~ 오후 6시 (9시간)',
      color: '#3b82f6'
    },
    { 
      id: 'afternoon', 
      name: '오후 근무', 
      icon: '🌆', 
      start: '14:00', 
      end: '22:00',
      description: '오후 2시 ~ 밤 10시 (8시간)',
      color: '#8b5cf6'
    },
    { 
      id: 'night', 
      name: '야간 근무', 
      icon: '🌙', 
      start: '22:00', 
      end: '06:00',
      description: '밤 10시 ~ 새벽 6시 (8시간)',
      color: '#4c1d95'
    },
    { 
      id: 'custom', 
      name: '사용자 지정', 
      icon: '⚙️', 
      start: null, 
      end: null,
      description: '원하는 시간대를 직접 설정',
      color: '#6b7280'
    }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      if (editingSchedule) {
        setFormData({
          employeeId: editingSchedule.employeeId,
          date: editingSchedule.date,
          startTime: editingSchedule.startTime,
          endTime: editingSchedule.endTime,
          shiftType: editingSchedule.shiftType || 'day',
          notes: editingSchedule.notes || ''
        });
      } else if (selectedDate) {
        setFormData(prev => ({
          ...prev,
          date: selectedDate
        }));
      }
    }
  }, [isOpen, selectedDate, editingSchedule]);

  const fetchEmployees = async () => {
    try {
      const response = await getEmployees();
      const employeeData = response.data?.employees || response.data || [];
      setEmployees(Array.isArray(employeeData) ? employeeData : []);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      setError('직원 목록을 불러오는데 실패했습니다.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error on change
    
    // 직원이나 날짜가 변경되면 중복 검사
    if ((name === 'employeeId' || name === 'date') && formData.employeeId && formData.date) {
      setTimeout(() => {
        const updatedFormData = { ...formData, [name]: value };
        const schedulesToCheck = editingSchedule 
          ? existingSchedules.filter(s => s.id !== editingSchedule.id)
          : existingSchedules;
        
        const duplicate = schedulesToCheck.find(schedule => {
          const scheduleDate = schedule.date?.split('T')[0];
          return scheduleDate === updatedFormData.date && 
                 String(schedule.employeeId) === String(updatedFormData.employeeId);
        });
        
        if (duplicate) {
          const employee = employees.find(e => String(e.id) === String(updatedFormData.employeeId));
          const employeeName = employee?.name || '선택된 직원';
          setError(`⚠️ ${employeeName}은(는) ${updatedFormData.date}에 이미 근무가 배치되어 있습니다.`);
        }
      }, 100);
    }
  };

  const handleShiftTypeChange = (shiftType) => {
    if (shiftType === 'custom') {
      setShowCustomTime(true);
      setFormData(prev => ({
        ...prev,
        shiftType
      }));
    } else {
      const preset = shiftPresets.find(p => p.id === shiftType);
      if (preset) {
        setFormData(prev => ({
          ...prev,
          shiftType,
          startTime: preset.start,
          endTime: preset.end
        }));
        setShowCustomTime(false);
      }
    }
  };

  const calculateDuration = () => {
    if (!formData.startTime || !formData.endTime) return 0;
    const start = new Date(`2000-01-01T${formData.startTime}`);
    const end = new Date(`2000-01-01T${formData.endTime}`);
    let diff = (end - start) / (1000 * 60 * 60);
    if (diff < 0) diff += 24;
    return diff;
  };

  const checkDuplicateSchedule = () => {
    // 수정 모드인 경우 자기 자신은 제외
    const schedulesToCheck = editingSchedule 
      ? existingSchedules.filter(s => s.id !== editingSchedule.id)
      : existingSchedules;
    
    // 같은 날짜에 같은 직원이 이미 배치되어 있는지 확인
    const duplicate = schedulesToCheck.find(schedule => {
      const scheduleDate = schedule.date?.split('T')[0];
      return scheduleDate === formData.date && 
             String(schedule.employeeId) === String(formData.employeeId);
    });
    
    if (duplicate) {
      const employee = employees.find(e => String(e.id) === String(formData.employeeId));
      const employeeName = employee?.name || '선택된 직원';
      setError(`${employeeName}은(는) ${formData.date}에 이미 근무가 배치되어 있습니다.`);
      return false;
    }
    
    return true;
  };

  const validateForm = () => {
    if (!formData.employeeId) {
      setError('직원을 선택해주세요.');
      return false;
    }
    if (!formData.date) {
      setError('날짜를 선택해주세요.');
      return false;
    }
    if (!formData.startTime || !formData.endTime) {
      setError('근무 시간을 입력해주세요.');
      return false;
    }
    
    const duration = calculateDuration();
    if (duration <= 0) {
      setError('종료 시간이 시작 시간보다 이후여야 합니다.');
      return false;
    }
    if (duration > 24) {
      setError('근무 시간은 24시간을 초과할 수 없습니다.');
      return false;
    }
    
    // 중복 배치 검증
    if (!checkDuplicateSchedule()) {
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      await onSubmit(formData);
      handleClose();
    } catch (err) {
      setError(err.message || '스케줄 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      employeeId: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '18:00',
      shiftType: 'day',
      notes: ''
    });
    setError('');
    setShowCustomTime(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content add-schedule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <i className="fas fa-calendar-plus"></i>
            {editingSchedule ? '스케줄 편집' : '새 스케줄 추가'}
          </h2>
          <button className="modal-close" onClick={handleClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error-banner">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          )}

          {/* 빠른 설정 버튼 */}
          <div className="quick-preset-section">
            <h3>
              <i className="fas fa-magic"></i>
              빠른 근무 타입 선택
            </h3>
            <div className="preset-grid">
              {shiftPresets.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  className={`preset-card ${formData.shiftType === preset.id ? 'active' : ''}`}
                  onClick={() => handleShiftTypeChange(preset.id)}
                  style={{
                    borderColor: formData.shiftType === preset.id ? preset.color : 'transparent',
                    '--preset-color': preset.color
                  }}
                >
                  <div className="preset-icon">{preset.icon}</div>
                  <div className="preset-name">{preset.name}</div>
                  <div className="preset-desc">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 기본 정보 설정 */}
          <div className="form-section">
            <h3>
              <i className="fas fa-info-circle"></i>
              기본 정보
            </h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="employeeId">
                  <i className="fas fa-user"></i>
                  직원 선택 *
                </label>
                <select
                  id="employeeId"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  required
                  className="form-control"
                >
                  <option value="">직원을 선택해주세요</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} - {emp.department || '부서 없음'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="date">
                  <i className="fas fa-calendar"></i>
                  근무 날짜 *
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="form-control"
                />
              </div>
            </div>
          </div>

          {/* 시간 상세 설정 */}
          {(showCustomTime || formData.shiftType === 'custom') && (
            <div className="form-section">
              <h3>
                <i className="fas fa-clock"></i>
                근무 시간 설정
                {calculateDuration() > 0 && (
                  <span className="duration-badge">
                    총 {calculateDuration()}시간 근무
                  </span>
                )}
              </h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startTime">
                    <i className="fas fa-play-circle"></i>
                    시작 시간 *
                  </label>
                  <input
                    type="time"
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="endTime">
                    <i className="fas fa-stop-circle"></i>
                    종료 시간 *
                  </label>
                  <input
                    type="time"
                    id="endTime"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    required
                    className="form-control"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 선택된 시간 표시 */}
          {formData.shiftType !== 'custom' && (
            <div className="selected-time-display">
              <i className="fas fa-clock"></i>
              <span>선택된 근무 시간: </span>
              <strong>{formData.startTime} ~ {formData.endTime}</strong>
              <span className="duration">({calculateDuration()}시간)</span>
            </div>
          )}

          {/* 메모 */}
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="notes">
                <i className="fas fa-sticky-note"></i>
                메모 (선택사항)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder="추가 정보나 특이사항을 입력하세요..."
                className="form-control"
              />
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={handleClose}
              disabled={loading}
            >
              <i className="fas fa-times"></i>
              취소
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  저장 중...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  {editingSchedule ? '수정 완료' : '스케줄 추가'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddScheduleModal;