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
    notes: '',
    repeat: {
      enabled: false,
      type: 'weekly', // weekly, daily, monthly
      endDate: '',
      daysOfWeek: [] // for weekly repeat
    }
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
          notes: editingSchedule.notes || '',
          repeat: {
            enabled: false,
            type: 'weekly',
            endDate: '',
            daysOfWeek: []
          }
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

  const handleRepeatChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      repeat: {
        ...prev.repeat,
        [field]: value
      }
    }));
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      repeat: {
        ...prev.repeat,
        daysOfWeek: prev.repeat.daysOfWeek.includes(day)
          ? prev.repeat.daysOfWeek.filter(d => d !== day)
          : [...prev.repeat.daysOfWeek, day]
      }
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
    if (formData.repeat.enabled && formData.repeat.type === 'weekly' && formData.repeat.daysOfWeek.length === 0) {
      setError(t('schedule.selectRepeatDays'));
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
      notes: '',
      repeat: {
        enabled: false,
        type: 'weekly',
        endDate: '',
        daysOfWeek: []
      }
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  const daysOfWeek = [
    { value: 0, label: t('schedule.sunday') },
    { value: 1, label: t('schedule.monday') },
    { value: 2, label: t('schedule.tuesday') },
    { value: 3, label: t('schedule.wednesday') },
    { value: 4, label: t('schedule.thursday') },
    { value: 5, label: t('schedule.friday') },
    { value: 6, label: t('schedule.saturday') }
  ];

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

        <form onSubmit={handleSubmit} className="schedule-form">
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
                {t('schedule.date')} *
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
              {['morning', 'afternoon', 'evening', 'night'].map(shift => (
                <button
                  key={shift}
                  type="button"
                  className={`shift-type-btn ${formData.shiftType === shift ? 'active' : ''} ${shift}`}
                  onClick={() => handleShiftTypeChange(shift)}
                >
                  <i className={`fas fa-${shift === 'morning' ? 'sun' : shift === 'afternoon' ? 'cloud-sun' : shift === 'evening' ? 'cloud-moon' : 'moon'}`}></i>
                  {t(`schedule.${shift}`)}
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
            <div className="repeat-section">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.repeat.enabled}
                  onChange={(e) => handleRepeatChange('enabled', e.target.checked)}
                />
                <span className="checkmark"></span>
                <span>
                  <i className="fas fa-redo"></i>
                  {t('schedule.repeatSchedule')}
                </span>
              </label>

              {formData.repeat.enabled && (
                <div className="repeat-options">
                  <div className="form-group">
                    <label>{t('schedule.repeatType')}</label>
                    <select
                      value={formData.repeat.type}
                      onChange={(e) => handleRepeatChange('type', e.target.value)}
                    >
                      <option value="daily">{t('schedule.daily')}</option>
                      <option value="weekly">{t('schedule.weekly')}</option>
                      <option value="monthly">{t('schedule.monthly')}</option>
                    </select>
                  </div>

                  {formData.repeat.type === 'weekly' && (
                    <div className="form-group">
                      <label>{t('schedule.repeatDays')}</label>
                      <div className="days-selector">
                        {daysOfWeek.map(day => (
                          <button
                            key={day.value}
                            type="button"
                            className={`day-btn ${formData.repeat.daysOfWeek.includes(day.value) ? 'active' : ''}`}
                            onClick={() => handleDayToggle(day.value)}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="repeatEndDate">
                      {t('schedule.repeatUntil')}
                    </label>
                    <input
                      type="date"
                      id="repeatEndDate"
                      value={formData.repeat.endDate}
                      onChange={(e) => handleRepeatChange('endDate', e.target.value)}
                      min={formData.date}
                    />
                  </div>
                </div>
              )}
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
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              <i className="fas fa-check"></i>
              {loading ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddScheduleModal;