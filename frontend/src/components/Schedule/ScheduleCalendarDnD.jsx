import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  useDraggable
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatDate as formatDateUtil } from '../../utils/dateFormatter';
import { getSchedules, getEmployeeSchedules, updateSchedule, deleteSchedule, createSchedule, company } from '../../services/api';
import AddScheduleModal from './AddScheduleModal';
import './ScheduleCalendarDnD.css';

// Draggable Schedule Item
const DraggableSchedule = ({ schedule, isDragging, companySettings }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ 
    id: schedule.id,
    data: {
      type: 'schedule',
      schedule: schedule
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    transformOrigin: 'center center'
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
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

  const getLeaveTypeBadge = (leaveType) => {
    const leaveTypeMap = {
      'annual': '연차',
      'sick': '병가',
      'personal': '개인휴가',
      'vacation': '연차',
      'medical': '병가'
    };
    return leaveTypeMap[leaveType?.toLowerCase()] || leaveType || '휴가';
  };

  // Only show leave info for fixed work type
  const isOnLeave = companySettings.workType === 'fixed' ? (schedule.isOnLeave || false) : false;
  const leaveType = companySettings.workType === 'fixed' ? schedule.leaveType : null;
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`schedule-item-dnd ${getShiftColor(schedule.shiftType || schedule.shift)} ${isOnLeave ? 'schedule-on-leave' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="schedule-item-content">
        <div className="schedule-employee-row">
          <span className="schedule-employee">{schedule.employee?.name || '미배정'}</span>
          {isOnLeave && leaveType && (
            <span className="leave-badge">
              {getLeaveTypeBadge(leaveType)}
            </span>
          )}
        </div>
        <span className="schedule-time">
          {formatTime(schedule.startTime || '09:00')} - {formatTime(schedule.endTime || '18:00')}
        </span>
      </div>
      <div className="drag-handle">
        <i className="fas fa-grip-vertical"></i>
      </div>
    </div>
  );
};

// Droppable Day Cell
const DroppableDay = ({ date, schedules, leaves, companySettings, onDrop, onScheduleClick, onAddClick, isToday, isCurrentMonth }) => {
  const { t, language } = useLanguage();
  const dateString = date.toISOString().split('T')[0];
  const droppableId = `day-${dateString}`;

  const {
    isOver,
    setNodeRef
  } = useDroppable({
    id: droppableId,
    data: {
      type: 'calendar-day',
      date: dateString
    }
  });

  const handleDrop = useCallback((draggedSchedule) => {
    onDrop(date, draggedSchedule);
  }, [date, onDrop]);

  // Filter schedules based on work type and leave settings
  const getFilteredSchedules = () => {
    let filteredSchedules = schedules;
    
    // Only filter out leave schedules for non-fixed work types
    if (companySettings.workType !== 'fixed') {
      // For flexible/shift work type: don't show leave-related schedules
      filteredSchedules = filteredSchedules.filter(schedule => !schedule.isOnLeave);
    }
    // For fixed work type: show all schedules including leave
    
    return filteredSchedules;
  };

  const filteredSchedules = getFilteredSchedules();

  // Get today's leaves for this date
  const getTodaysLeaves = () => {
    const dateString = date.toISOString().split('T')[0];
    return leaves.filter(leave => {
      const leaveDate = new Date(leave.date).toISOString().split('T')[0];
      return leaveDate === dateString;
    });
  };

  const todaysLeaves = getTodaysLeaves();
  const leaveCount = todaysLeaves.length;

  // Helper function for leave type badge (shared with DraggableSchedule)
  const getLeaveTypeBadge = (leaveType) => {
    const leaveTypeMap = {
      'annual': '연차',
      'sick': '병가',
      'personal': '개인휴가',
      'vacation': '연차',
      'medical': '병가'
    };
    return leaveTypeMap[leaveType?.toLowerCase()] || leaveType || '휴가';
  };

  return (
    <div
      ref={setNodeRef}
      className={`calendar-day-dnd ${
        isToday ? 'today' : ''
      } ${
        !isCurrentMonth ? 'other-month' : ''
      } ${
        isOver ? 'drop-target' : ''
      }`}
      data-date={dateString}
    >
      <div className="day-header">
        <div className="day-info">
          <span className="day-number">{date.getDate()}</span>
          {companySettings.workType === 'fixed' && leaveCount > 0 && (
            <span className="leave-count" title={`${leaveCount}명 휴가`}>
              휴가 {leaveCount}
            </span>
          )}
        </div>
        <button
          className="add-schedule-btn"
          onClick={() => onAddClick(date)}
          title={t('schedule.addSchedule')}
        >
          <i className="fas fa-plus"></i>
        </button>
      </div>
      
      <div className="day-schedules">
        <SortableContext
          items={filteredSchedules.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {filteredSchedules.map(schedule => (
            <DraggableSchedule
              key={schedule.id}
              schedule={schedule}
              isDragging={false}
              companySettings={companySettings}
            />
          ))}
        </SortableContext>
        
        {/* Show leave info only for fixed work type */}
        {companySettings.workType === 'fixed' && companySettings.showLeaveInSchedule && todaysLeaves.length > 0 && (
          <div className="leave-info-section">
            {todaysLeaves.map((leave, index) => (
              <div key={index} className="leave-info-item">
                <span className="leave-employee">{leave.employee?.name || '미지정'}</span>
                <span className="leave-type">{getLeaveTypeBadge(leave.leaveType)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ScheduleCalendarDnD = () => {
  const [schedules, setSchedules] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [companySettings, setCompanySettings] = useState({ workType: 'flexible', showLeaveInSchedule: false });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('month');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [draggedSchedule, setDraggedSchedule] = useState(null);
  
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get employee filter from URL parameters
  const employeeId = searchParams.get('employeeId');
  const employeeName = searchParams.get('employeeName');
  
  // Log for debugging
  useEffect(() => {
    if (employeeId) {
      console.log('[ScheduleCalendarDnD] Employee filter detected!');
      console.log('[ScheduleCalendarDnD] Employee ID:', employeeId);
      console.log('[ScheduleCalendarDnD] Employee Name:', employeeName || 'Not provided');
    } else {
      console.log('[ScheduleCalendarDnD] No employee filter - showing all schedules');
    }
  }, [employeeId, employeeName]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  useEffect(() => {
    // Fetch company settings first, then schedules
    fetchCompanySettings();
  }, []);
  
  useEffect(() => {
    fetchSchedules();
  }, [currentDate, viewMode, employeeId]);
  
  const fetchCompanySettings = async () => {
    try {
      const response = await company.getSettings();
      if (response.data) {
        setCompanySettings(response.data);
        console.log('[ScheduleCalendarDnD] Company settings loaded:', response.data);
        console.log('[ScheduleCalendarDnD] Work type:', response.data.workType);
      }
    } catch (error) {
      console.error('Failed to fetch company settings:', error);
      // Use default settings if fetch fails
      setCompanySettings({ workType: 'flexible', showLeaveInSchedule: false });
    }
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const startDate = getViewStartDate();
      const endDate = getViewEndDate();
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      let response;
      
      // If employee filter is present, use employee-specific endpoint
      if (employeeId) {
        console.log(`[ScheduleCalendarDnD] Fetching schedules for employee ${employeeId}`);
        console.log(`[ScheduleCalendarDnD] Date range: ${startDateStr} to ${endDateStr}`);
        
        response = await getEmployeeSchedules(employeeId, startDateStr, endDateStr);
        
        // Wrap the response to match expected structure
        response = {
          data: {
            schedules: response.data || [],
            leaves: [],
            companySettings: companySettings // Use fetched settings
          }
        };
      } else {
        // No employee filter, get all schedules
        const params = {
          startDate: startDateStr,
          endDate: endDateStr
        };
        response = await getSchedules(params);
      }
      
      // Handle new API response structure
      const responseData = response.data || {};
      const scheduleData = responseData.schedules || responseData.data || responseData || [];
      const leavesData = responseData.leaves || [];
      // Don't override company settings from schedule response if already fetched
      // Don't override company settings from schedule response
      
      setSchedules(Array.isArray(scheduleData) ? scheduleData : []);
      setLeaves(Array.isArray(leavesData) ? leavesData : []);
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
        endDate.setDate(endDate.getDate() + 41);
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
    let filteredSchedules = schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.date).toISOString().split('T')[0];
      return scheduleDate === dateString;
    });
    
    // Apply employee filter if present
    if (employeeId) {
      filteredSchedules = filteredSchedules.filter(schedule => 
        schedule.employee?.id?.toString() === employeeId
      );
    }
    
    return filteredSchedules;
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

  const handleDragStart = (event) => {
    const { active } = event;
    const schedule = schedules.find(s => s.id === active.id);
    setDraggedSchedule(schedule);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over) {
      setDraggedSchedule(null);
      return;
    }

    const draggedSchedule = schedules.find(s => s.id === active.id);
    
    // Check if it's a cross-day drop (to a calendar day)
    if (over.data?.current?.type === 'calendar-day') {
      const targetDate = over.data.current.date;
      
      if (draggedSchedule && targetDate) {
        // Check if the date actually changed
        const currentDate = new Date(draggedSchedule.date).toISOString().split('T')[0];
        if (currentDate !== targetDate) {
          try {
            // Update schedule with new date
            await updateSchedule(draggedSchedule.id, {
              ...draggedSchedule,
              date: targetDate
            });
            
            // Refresh schedules
            await fetchSchedules();
          } catch (err) {
            console.error('Failed to update schedule:', err);
            setError(t('schedule.failedToUpdate'));
          }
        }
      }
    } else {
      // Handle internal reordering within the same day
      const activeIndex = schedules.findIndex(s => s.id === active.id);
      const overIndex = schedules.findIndex(s => s.id === over.id);
      
      if (activeIndex !== overIndex && activeIndex !== -1 && overIndex !== -1) {
        // Only reorder if both items are on the same date
        const activeSchedule = schedules[activeIndex];
        const overSchedule = schedules[overIndex];
        
        if (activeSchedule.date === overSchedule.date) {
          // This would handle internal reordering if needed
          // For now, we'll skip this as it's not required
        }
      }
    }

    setDraggedSchedule(null);
  };

  const handleScheduleDrop = async (targetDate, schedule) => {
    if (!schedule || !targetDate) return;

    const targetDateString = targetDate.toISOString().split('T')[0];
    
    try {
      await updateSchedule(schedule.id, {
        ...schedule,
        date: targetDateString
      });
      
      await fetchSchedules();
    } catch (err) {
      console.error('Failed to move schedule:', err);
      setError(t('schedule.failedToUpdate'));
    }
  };

  const handleAddClick = (date) => {
    setSelectedDate(date.toISOString().split('T')[0]);
    setEditingSchedule(null);
    setShowAddModal(true);
  };

  const handleScheduleClick = (schedule) => {
    setEditingSchedule(schedule);
    setSelectedDate(schedule.date);
    setShowAddModal(true);
  };

  const handleScheduleSubmit = async (formData) => {
    try {
      if (editingSchedule) {
        await updateSchedule(editingSchedule.id, formData);
      } else {
        await createSchedule(formData);
      }
      
      await fetchSchedules();
      setShowAddModal(false);
    } catch (err) {
      throw new Error(err.response?.data?.message || t('schedule.failedToSave'));
    }
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  // Get today's leaves for banner
  const getTodaysLeavesForBanner = () => {
    const today = new Date().toISOString().split('T')[0];
    return leaves.filter(leave => {
      const leaveDate = new Date(leave.date).toISOString().split('T')[0];
      return leaveDate === today;
    });
  };

  const todaysLeaves = getTodaysLeavesForBanner();
  
  // Function to clear employee filter
  const clearEmployeeFilter = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('employeeId');
    newParams.delete('employeeName');
    navigate({ search: newParams.toString() });
  };

  const renderMonthView = () => {
    const days = getDaysInView();
    const weeks = [];
    
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div className="month-view-dnd">
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
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[snapCenterToCursor]}
        >
          <div className="calendar-body">
            {weeks.map((week, weekIndex) => 
              week.map((day, dayIndex) => {
                const daySchedules = getSchedulesForDate(day);
                return (
                  <DroppableDay
                    key={`${weekIndex}-${dayIndex}`}
                    date={day}
                    schedules={daySchedules}
                    leaves={leaves}
                    companySettings={companySettings}
                    onDrop={handleScheduleDrop}
                    onScheduleClick={handleScheduleClick}
                    onAddClick={handleAddClick}
                    isToday={isToday(day)}
                    isCurrentMonth={isCurrentMonth(day)}
                  />
                );
              })
            )}
          </div>
          
          <DragOverlay 
            dropAnimation={{
              duration: 200,
              easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}
            style={{
              transformOrigin: 'center center',
              zIndex: 1000
            }}
          >
            {draggedSchedule ? (
              <DraggableSchedule schedule={draggedSchedule} isDragging={true} />
            ) : null}
          </DragOverlay>
        </DndContext>
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
            <i className="fas fa-chevron-left"></i>
          </button>
          <h2 className="calendar-title">
            {formatDateUtil(currentDate, language, { 
              format: 'full',
              showWeekday: false,
              showYear: true
            })}
          </h2>
          <button 
            className="nav-btn"
            onClick={() => navigateDate(1)}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>

        <div className="calendar-actions">
          <button 
            className="today-btn"
            onClick={() => setCurrentDate(new Date())}
          >
            <i className="fas fa-calendar-day"></i>
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

      {/* Employee Filter Banner */}
      {employeeId && employeeName && (
        <div className="employee-filter-banner">
          <div className="filter-banner-content">
            <div className="filter-info">
              <i className="fas fa-user"></i>
              <span className="filter-text">
                <strong>{employeeName}</strong>님의 스케줄만 표시 중
              </span>
            </div>
            <button 
              className="clear-filter-btn"
              onClick={clearEmployeeFilter}
              title="전체 보기"
            >
              <i className="fas fa-times"></i>
              전체 보기
            </button>
          </div>
        </div>
      )}

      {/* Today's Leave Info Banner - Only for fixed work type */}
      {companySettings.workType === 'fixed' && companySettings.showLeaveInSchedule && todaysLeaves.length > 0 && (
        <div className="leave-info-banner">
          <div className="leave-banner-header">
            <i className="fas fa-calendar-times"></i>
            <span>오늘의 휴가자 ({todaysLeaves.length}명)</span>
          </div>
          <div className="leave-banner-content">
            {todaysLeaves.map((leave, index) => (
              <div key={index} className="leave-banner-item">
                <span className="leave-employee-name">{leave.employee?.name || '미지정'}</span>
                <span className="leave-type-badge">
                  {(() => {
                    const leaveTypeMap = {
                      'annual': '연차',
                      'sick': '병가',
                      'personal': '개인휴가',
                      'vacation': '연차',
                      'medical': '병가'
                    };
                    return leaveTypeMap[leave.leaveType?.toLowerCase()] || leave.leaveType || '휴가';
                  })()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="calendar-content">
        {viewMode === 'month' && renderMonthView()}
      </div>

      <AddScheduleModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleScheduleSubmit}
        selectedDate={selectedDate}
        editingSchedule={editingSchedule}
      />
    </div>
  );
};

export default ScheduleCalendarDnD;