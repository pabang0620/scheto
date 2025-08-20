import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getEmployees } from '../../services/api';
import './AddScheduleModal.css';

const AddScheduleModal = ({ isOpen, onClose, onSubmit, selectedDate, editingSchedule }) => {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    employeeId: '',
    date: selectedDate || new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '18:00',
    shiftType: 'morning',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      if (editingSchedule) {
        setFormData({
          employeeId: editingSchedule.employeeId,
          date: editingSchedule.date,
          startTime: editingSchedule.startTime,
          endTime: editingSchedule.endTime,
          shiftType: editingSchedule.shiftType || 'morning',
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
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };


  const getShiftTimes = (shiftType) => {
    switch (shiftType) {
      case 'morning':
        return { start: '06:00', end: '14:00' };
      case 'afternoon':
        return { start: '14:00', end: '22:00' };
      case 'evening':
        return { start: '18:00', end: '02:00' };
      case 'night':
        return { start: '22:00', end: '06:00' };
      default:
        return { start: '09:00', end: '18:00' };
    }
  };

  const handleShiftTypeChange = (shiftType) => {
    const times = getShiftTimes(shiftType);
    setFormData(prev => ({
      ...prev,
      shiftType,
      startTime: times.start,
      endTime: times.end
    }));
  };

  const validateForm = () => {
    if (!formData.employeeId) {
      setError(t('schedule.selectEmployee'));
      return false;
    }
    if (!formData.date) {
      setError(t('schedule.selectDate'));
      return false;
    }
    if (!formData.startTime || !formData.endTime) {
      setError(t('schedule.selectTime'));
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
      setError(err.message || t('schedule.failedToSave'));
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
      shiftType: 'morning',
      notes: ''
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;


  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content add-schedule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <i className="fas fa-calendar-plus"></i>
            {editingSchedule ? t('schedule.editSchedule') : t('schedule.addSchedule')}
          </h2>
          <button className="modal-close" onClick={handleClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="schedule-form">
          <form onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}

            <div className="form-section">
            <div className="form-group">
              <label htmlFor="employeeId">
                <i className="fas fa-user"></i>
                {t('schedule.employee')} *
              </label>
              <select
                id="employeeId"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                required
              >
                <option value="">{t('schedule.selectEmployee')}</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} - {emp.department || t('common.noDepartment')}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="date">
                <i className="fas fa-calendar"></i>
                날짜 선택 *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-section">
            <label className="section-label">
              <i className="fas fa-business-time"></i>
              {t('schedule.shiftType')}
            </label>
            <div className="shift-type-buttons">
              {[
                { type: 'morning', label: '오전', icon: 'sun' },
                { type: 'afternoon', label: '오후', icon: 'cloud-sun' },
                { type: 'evening', label: '저녁', icon: 'cloud-moon' },
                { type: 'night', label: '야간', icon: 'moon' }
              ].map(shift => (
                <button
                  key={shift.type}
                  type="button"
                  className={`shift-type-btn ${formData.shiftType === shift.type ? 'active' : ''} ${shift.type}`}
                  onClick={() => handleShiftTypeChange(shift.type)}
                >
                  <i className={`fas fa-${shift.icon}`}></i>
                  {shift.label}
                  <span style={{fontSize: '11px', opacity: 0.7}}>
                    {shift.type === 'morning' && '06:00-14:00'}
                    {shift.type === 'afternoon' && '14:00-22:00'}
                    {shift.type === 'evening' && '18:00-02:00'}
                    {shift.type === 'night' && '22:00-06:00'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <div className="time-inputs">
              <div className="form-group">
                <label htmlFor="startTime">
                  <i className="fas fa-clock"></i>
                  {t('schedule.startTime')} *
                </label>
                <input
                  type="time"
                  id="startTime"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="endTime">
                  <i className="fas fa-clock"></i>
                  {t('schedule.endTime')} *
                </label>
                <input
                  type="time"
                  id="endTime"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>


          <div className="form-section">
            <div className="form-group">
              <label htmlFor="notes">
                <i className="fas fa-sticky-note"></i>
                {t('schedule.notes')}
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder={t('schedule.notesPlaceholder')}
              />
            </div>
          </div>
          </form>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={handleClose}
            disabled={loading}
          >
            <i className="fas fa-times"></i>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="submit-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            <i className="fas fa-check"></i>
            {loading ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddScheduleModal;