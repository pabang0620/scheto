import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getSchedules, updateSchedule, deleteSchedule } from '../../services/api';
import './ScheduleCalendar.css';

const ScheduleCalendar = () => {
  const [schedules, setSchedules] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('month'); // month, week, day
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const { t } = useLanguage();

  useEffect(() => {
    fetchSchedules();
  }, [currentDate, viewMode]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const startDate = getViewStartDate();
      const endDate = getViewEndDate();
      
      const response = await getSchedules({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
      
      setSchedules(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(t('schedule.failedToLoad'));
      console.error('Schedule fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getViewStartDate = () => {
    const date = new Date(currentDate);
    switch (viewMode) {
      case 'month':
        date.setDate(1);
        date.setDate(date.getDate() - date.getDay());
        return date;
      case 'week':
        date.setDate(date.getDate() - date.getDay());
        return date;
      case 'day':
        return date;
      default:
        return date;
    }
  };

  const getViewEndDate = () => {
    const startDate = getViewStartDate();
    const endDate = new Date(startDate);
    switch (viewMode) {
      case 'month':
        endDate.setDate(endDate.getDate() + 41); // 6 weeks
        return endDate;
      case 'week':
        endDate.setDate(endDate.getDate() + 6);
        return endDate;
      case 'day':
        return endDate;
      default:
        return endDate;
    }
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + direction);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (7 * direction));
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + direction);
        break;
    }
    setCurrentDate(newDate);
  };

  const getSchedulesForDate = (date) => {
    const dateString = date.toISOString().split('T')[0];
    return (Array.isArray(schedules) ? schedules : []).filter(schedule => 
      new Date(schedule.date).toISOString().split('T')[0] === dateString
    );
  };

  const getDaysInView = () => {
    const days = [];
    const startDate = getViewStartDate();
    const endDate = getViewEndDate();
    
    let currentDay = new Date(startDate);
    while (currentDay <= endDate) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
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
      case 'evening': return 'shift-evening';
      case 'night': return 'shift-night';
      default: return 'shift-default';
    }
  };

  const handleScheduleClick = (schedule) => {
    setSelectedSchedule(schedule);
    setShowScheduleModal(true);
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const renderMonthView = () => {
    const days = getDaysInView();
    const weeks = [];
    
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div className="month-view">
        <div className="calendar-header">
          {[
            t('schedule.sunday'),
            t('schedule.monday'),
            t('schedule.tuesday'),
            t('schedule.wednesday'),
            t('schedule.thursday'),
            t('schedule.friday'),
            t('schedule.saturday')
          ].map(day => (
            <div key={day} className="day-header">{day}</div>
          ))}
        </div>
        <div className="calendar-body">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="calendar-week">
              {week.map((day, dayIndex) => {
                const daySchedules = getSchedulesForDate(day);
                return (
                  <div
                    key={dayIndex}
                    className={`calendar-day ${isToday(day) ? 'today' : ''} ${!isCurrentMonth(day) ? 'other-month' : ''} ${selectedDate && day.toDateString() === selectedDate.toDateString() ? 'selected' : ''}`}
                    onClick={() => handleDateClick(day)}
                  >
                    <div className="day-number">{day.getDate()}</div>
                    <div className="day-schedules">
                      {(Array.isArray(daySchedules) ? daySchedules : []).slice(0, 3).map(schedule => (
                        <div
                          key={schedule.id}
                          className={`schedule-item ${getShiftColor(schedule.shift)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleScheduleClick(schedule);
                          }}
                        >
                          <span className="schedule-employee">
                            {schedule.employee?.name?.split(' ')[0] || 'N/A'}
                          </span>
                          <span className="schedule-time">
                            {formatTime(schedule.startTime)}
                          </span>
                        </div>
                      ))}
                      {(Array.isArray(daySchedules) ? daySchedules : []).length > 3 && (
                        <div className="schedule-overflow">
                          +{(Array.isArray(daySchedules) ? daySchedules : []).length - 3} {t('schedule.more')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const days = getDaysInView();
    
    return (
      <div className="week-view">
        <div className="week-header">
          {days.map((day, index) => (
            <div
              key={index}
              className={`week-day-header ${isToday(day) ? 'today' : ''}`}
            >
              <div className="day-name">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="day-date">{day.getDate()}</div>
            </div>
          ))}
        </div>
        <div className="week-body">
          {days.map((day, index) => {
            const daySchedules = getSchedulesForDate(day);
            return (
              <div key={index} className="week-day-column">
                {(Array.isArray(daySchedules) ? daySchedules : []).map(schedule => (
                  <div
                    key={schedule.id}
                    className={`week-schedule-item ${getShiftColor(schedule.shift)}`}
                    onClick={() => handleScheduleClick(schedule)}
                  >
                    <div className="schedule-employee">
                      {schedule.employee?.name}
                    </div>
                    <div className="schedule-time">
                      {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                    </div>
                    <div className="schedule-shift">
                      {schedule.shift}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="schedule-calendar-container">
        <div className="loading-spinner">
          <div className="spinner"><span></span></div>
          <p>{t('schedule.loadingSchedule')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="schedule-calendar-container">
      <div className="calendar-toolbar">
        <div className="calendar-navigation">
          <button 
            className="nav-btn"
            onClick={() => navigateDate(-1)}
          >
            ←
          </button>
          <h2 className="calendar-title">
            {currentDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long',
              ...(viewMode === 'day' && { day: 'numeric' })
            })}
          </h2>
          <button 
            className="nav-btn"
            onClick={() => navigateDate(1)}
          >
            →
          </button>
        </div>

        <div className="calendar-actions">
          <button 
            className="today-btn"
            onClick={() => setCurrentDate(new Date())}
          >
            {t('schedule.today')}
          </button>
          
          <div className="view-mode-buttons">
            <button
              className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              {t('schedule.month')}
            </button>
            <button
              className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              {t('schedule.week')}
            </button>
            <button
              className={`view-btn ${viewMode === 'day' ? 'active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              {t('schedule.day')}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="calendar-content">
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
      </div>

      {/* Schedule Detail Modal */}
      {showScheduleModal && selectedSchedule && (
        <div className="modal-overlay">
          <div className="modal-content schedule-modal">
            <div className="modal-header">
              <h3>{t('schedule.scheduleDetails')}</h3>
              <button
                className="modal-close"
                onClick={() => setShowScheduleModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="schedule-detail">
                <label>{t('schedule.employee')}:</label>
                <span>{selectedSchedule.employee?.name}</span>
              </div>
              <div className="schedule-detail">
                <label>{t('schedule.date')}:</label>
                <span>{formatDate(new Date(selectedSchedule.date))}</span>
              </div>
              <div className="schedule-detail">
                <label>{t('schedule.time')}:</label>
                <span>
                  {formatTime(selectedSchedule.startTime)} - {formatTime(selectedSchedule.endTime)}
                </span>
              </div>
              <div className="schedule-detail">
                <label>{t('schedule.shift')}:</label>
                <span className={`shift-badge ${getShiftColor(selectedSchedule.shift)}`}>
                  {selectedSchedule.shift}
                </span>
              </div>
              {selectedSchedule.notes && (
                <div className="schedule-detail">
                  <label>{t('schedule.notes')}:</label>
                  <span>{selectedSchedule.notes}</span>
                </div>
              )}
            </div>
            
            <div className="modal-actions">
              <button className="edit-schedule-btn">
                {t('schedule.editSchedule')}
              </button>
              <button className="delete-schedule-btn">
                {t('schedule.deleteSchedule')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleCalendar;