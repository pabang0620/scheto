import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getEmployees, generateSchedule, getScheduleTemplates } from '../../services/api';
import './AutoGenerate.css';

const AutoGenerate = () => {
  const [employees, setEmployees] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    selectedEmployees: [],
    shifts: {
      morning: { enabled: true, startTime: '06:00', endTime: '14:00', requiredStaff: 2 },
      afternoon: { enabled: true, startTime: '14:00', endTime: '22:00', requiredStaff: 2 },
      night: { enabled: false, startTime: '22:00', endTime: '06:00', requiredStaff: 1 }
    },
    constraints: {
      maxConsecutiveDays: 5,
      minRestHours: 12,
      weekendsOff: true,
      fairDistribution: true
    },
    templateId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedSchedule, setGeneratedSchedule] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const { t } = useLanguage();

  useEffect(() => {
    fetchInitialData();
    setDefaultEndDate();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [employeesResponse, templatesResponse] = await Promise.all([
        getEmployees(),
        getScheduleTemplates()
      ]);
      
      // Handle both direct array and nested data structures
      const employeeData = employeesResponse.data?.employees || employeesResponse.data || [];
      const templateData = templatesResponse.data?.templates || templatesResponse.data || [];
      
      setEmployees(Array.isArray(employeeData) ? employeeData : []);
      setTemplates(Array.isArray(templateData) ? templateData : []);
      
      // Select all employees by default
      setFormData(prev => ({
        ...prev,
        selectedEmployees: (Array.isArray(employeeData) ? employeeData : []).map(emp => emp.id)
      }));
    } catch (err) {
      setError(t('schedule.failedToLoadData'));
      console.error('Initial data fetch error:', err);
    }
  };

  const setDefaultEndDate = () => {
    const today = new Date();
    const twoWeeksLater = new Date(today.getTime() + (14 * 24 * 60 * 60 * 1000));
    setFormData(prev => ({
      ...prev,
      endDate: twoWeeksLater.toISOString().split('T')[0]
    }));
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmployeeToggle = (employeeId) => {
    setFormData(prev => ({
      ...prev,
      selectedEmployees: (Array.isArray(prev.selectedEmployees) ? prev.selectedEmployees : []).includes(employeeId)
        ? (Array.isArray(prev.selectedEmployees) ? prev.selectedEmployees : []).filter(id => id !== employeeId)
        : [...(Array.isArray(prev.selectedEmployees) ? prev.selectedEmployees : []), employeeId]
    }));
  };

  const handleShiftChange = (shiftType, field, value) => {
    setFormData(prev => ({
      ...prev,
      shifts: {
        ...prev.shifts,
        [shiftType]: {
          ...prev.shifts[shiftType],
          [field]: field === 'enabled' ? value : field === 'requiredStaff' ? parseInt(value) : value
        }
      }
    }));
  };

  const handleConstraintChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        [field]: typeof value === 'boolean' ? value : parseInt(value)
      }
    }));
  };

  const handleTemplateChange = (templateId) => {
    setFormData(prev => ({
      ...prev,
      templateId
    }));
    
    if (templateId) {
      const template = (Array.isArray(templates) ? templates : []).find(t => t.id === parseInt(templateId));
      if (template) {
        applyTemplate(template);
      }
    }
  };

  const applyTemplate = (template) => {
    if (template.config) {
      setFormData(prev => ({
        ...prev,
        shifts: template.config.shifts || prev.shifts,
        constraints: template.config.constraints || prev.constraints
      }));
    }
  };

  const validateForm = () => {
    if (!formData.startDate || !formData.endDate) {
      setError(t('schedule.selectBothDates'));
      return false;
    }
    
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError(t('schedule.endDateAfterStart'));
      return false;
    }
    
    if ((Array.isArray(formData.selectedEmployees) ? formData.selectedEmployees : []).length === 0) {
      setError(t('schedule.selectAtLeastOneEmployee'));
      return false;
    }
    
    const enabledShifts = Object.values(formData.shifts).filter(shift => shift.enabled);
    if (enabledShifts.length === 0) {
      setError(t('schedule.enableAtLeastOneShift'));
      return false;
    }
    
    return true;
  };

  const handleGenerate = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await generateSchedule(formData);
      setGeneratedSchedule(response.data || {});
      setShowPreview(true);
      setSuccess(t('schedule.scheduleGenerated'));
    } catch (err) {
      setError(err.response?.data?.message || t('schedule.failedToGenerate'));
      console.error('Schedule generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString('ko-KR', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getShiftColor = (shift) => {
    switch (shift?.toLowerCase()) {
      case 'morning': return 'shift-morning';
      case 'afternoon': return 'shift-afternoon';
      case 'night': return 'shift-night';
      default: return 'shift-default';
    }
  };

  return (
    <div className="auto-generate-container">
      <div className="generate-header">
        <h1>{t('schedule.autoGenerateTitle')}</h1>
        <p>{t('schedule.autoGenerateDescription')}</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="generate-form">
        {/* Date Range Section */}
        <div className="form-section">
          <h3>{t('schedule.schedulePeriod')}</h3>
          <div className="date-range-inputs">
            <div className="form-group">
              <label htmlFor="startDate">{t('schedule.startDate')}</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleDateChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="endDate">{t('schedule.endDate')}</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleDateChange}
                required
              />
            </div>
          </div>
        </div>

        {/* Template Section */}
        {templates.length > 0 && (
          <div className="form-section">
            <h3>{t('schedule.useTemplate')}</h3>
            <div className="form-group">
              <label htmlFor="template">{t('schedule.selectTemplate')}</label>
              <select
                id="template"
                value={formData.templateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                <option value="">{t('schedule.customConfiguration')}</option>
                {(Array.isArray(templates) ? templates : []).map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Employee Selection */}
        <div className="form-section">
          <h3>{t('schedule.selectEmployees')}</h3>
          <div className="employee-selection">
            <div className="selection-controls">
              <button
                type="button"
                className="select-all-btn"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  selectedEmployees: (Array.isArray(employees) ? employees : []).map(emp => emp.id)
                }))}
              >
                {t('schedule.selectAll')}
              </button>
              <button
                type="button"
                className="select-none-btn"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  selectedEmployees: []
                }))}
              >
                {t('schedule.selectNone')}
              </button>
            </div>
            <div className="employee-list">
              {(Array.isArray(employees) ? employees : []).map(employee => (
                <div key={employee.id} className="employee-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={(Array.isArray(formData.selectedEmployees) ? formData.selectedEmployees : []).includes(employee.id)}
                      onChange={() => handleEmployeeToggle(employee.id)}
                    />
                    <span className="checkmark"></span>
                    <div className="employee-info">
                      <span className="employee-name">{employee.name}</span>
                      <span className="employee-role">{employee.role}</span>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Shift Configuration */}
        <div className="form-section">
          <h3>{t('schedule.shiftConfiguration')}</h3>
          <div className="shifts-config">
            {Object.entries(formData.shifts).map(([shiftType, shift]) => (
              <div key={shiftType} className="shift-config">
                <div className="shift-header">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={shift.enabled}
                      onChange={(e) => handleShiftChange(shiftType, 'enabled', e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    <span className="shift-name">{t(`schedule.${shiftType}Shift`)}</span>
                  </label>
                </div>
                
                {shift.enabled && (
                  <div className="shift-details">
                    <div className="time-inputs">
                      <div className="form-group">
                        <label>{t('schedule.startTime')}</label>
                        <input
                          type="time"
                          value={shift.startTime}
                          onChange={(e) => handleShiftChange(shiftType, 'startTime', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>{t('schedule.endTime')}</label>
                        <input
                          type="time"
                          value={shift.endTime}
                          onChange={(e) => handleShiftChange(shiftType, 'endTime', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>{t('schedule.requiredStaff')}</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={shift.requiredStaff}
                          onChange={(e) => handleShiftChange(shiftType, 'requiredStaff', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Constraints */}
        <div className="form-section">
          <h3>{t('schedule.schedulingConstraints')}</h3>
          <div className="constraints-config">
            <div className="constraint-item">
              <label htmlFor="maxConsecutiveDays">{t('schedule.maxConsecutiveDays')}</label>
              <input
                type="number"
                id="maxConsecutiveDays"
                min="1"
                max="14"
                value={formData.constraints.maxConsecutiveDays}
                onChange={(e) => handleConstraintChange('maxConsecutiveDays', e.target.value)}
              />
            </div>
            
            <div className="constraint-item">
              <label htmlFor="minRestHours">{t('schedule.minRestHours')}</label>
              <input
                type="number"
                id="minRestHours"
                min="8"
                max="24"
                value={formData.constraints.minRestHours}
                onChange={(e) => handleConstraintChange('minRestHours', e.target.value)}
              />
            </div>
            
            <div className="constraint-item checkbox-constraint">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.constraints.weekendsOff}
                  onChange={(e) => handleConstraintChange('weekendsOff', e.target.checked)}
                />
                <span className="checkmark"></span>
                <span>{t('schedule.preferWeekendsOff')}</span>
              </label>
            </div>
            
            <div className="constraint-item checkbox-constraint">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.constraints.fairDistribution}
                  onChange={(e) => handleConstraintChange('fairDistribution', e.target.checked)}
                />
                <span className="checkmark"></span>
                <span>{t('schedule.fairDistribution')}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="form-actions">
          <button
            type="button"
            className="generate-btn"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? t('schedule.generating') : t('schedule.generateSchedule')}
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && generatedSchedule && (
        <div className="modal-overlay">
          <div className="modal-content preview-modal">
            <div className="modal-header">
              <h3>{t('schedule.generatedSchedulePreview')}</h3>
              <button
                className="modal-close"
                onClick={() => setShowPreview(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="schedule-preview">
                {Object.entries(generatedSchedule?.schedulesByDate || {}).map(([date, daySchedules]) => (
                  <div key={date} className="preview-day">
                    <h4 className="preview-date">{formatDate(date)}</h4>
                    <div className="preview-shifts">
                      {(Array.isArray(daySchedules) ? daySchedules : []).map((schedule, index) => (
                        <div key={index} className={`preview-schedule ${getShiftColor(schedule.shift)}`}>
                          <span className="schedule-employee">{schedule.employeeName}</span>
                          <span className="schedule-time">
                            {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                          </span>
                          <span className="schedule-shift">{schedule.shift}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="approve-btn"
                onClick={() => {
                  // Handle approval and save
                  setShowPreview(false);
                  setSuccess('Schedule approved and saved successfully!');
                }}
              >
                {t('schedule.approveAndSave')}
              </button>
              <button 
                className="regenerate-btn"
                onClick={() => {
                  setShowPreview(false);
                  handleGenerate();
                }}
              >
                {t('schedule.regenerate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoGenerate;