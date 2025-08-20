import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate as formatDateUtil } from '../../utils/dateFormatter';
import {
  getEmployee,
  getEmployeeAbility,
  updateEmployeeAbility,
  getEmployeeNotes,
  addEmployeeNote,
  deleteNote,
  getEmployeeSchedules
} from '../../services/api';
import useSwipeGesture from '../../hooks/useSwipeGesture';
import './EmployeeDetailModal.css';

const EmployeeDetailModal = ({ employeeId, isOpen, onClose }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Tab states
  const [activeTab, setActiveTab] = useState('overview');
  const tabs = ['overview', 'schedule', 'abilities', 'notes'];
  
  // Employee data
  const [employee, setEmployee] = useState(null);
  const [abilities, setAbilities] = useState([]);
  const [notes, setNotes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  
  // Loading and edit states
  const [loading, setLoading] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [editingAbilities, setEditingAbilities] = useState(false);
  const [tempAbilities, setTempAbilities] = useState([]);
  
  // Note form state
  const [noteForm, setNoteForm] = useState({
    type: 'general',
    content: '',
    isPrivate: false
  });
  const [addingNote, setAddingNote] = useState(false);

  // Calendar state for schedule tab
  const [scheduleView, setScheduleView] = useState('month'); // 'list' or 'month'
  const [currentDate, setCurrentDate] = useState(new Date());

  // Animation states
  const [isVisible, setIsVisible] = useState(false);
  const [tabDirection, setTabDirection] = useState(0);

  // Swipe gesture handling
  const handleSwipeLeft = () => {
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1) {
      setTabDirection(1);
      setActiveTab(tabs[currentIndex + 1]);
    }
  };

  const handleSwipeRight = () => {
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex > 0) {
      setTabDirection(-1);
      setActiveTab(tabs[currentIndex - 1]);
    }
  };

  const swipeRef = useSwipeGesture({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    threshold: 50
  });

  useEffect(() => {
    if (isOpen && employeeId) {
      setIsVisible(true);
      fetchEmployeeData();
      // Reset schedules when opening a different employee
      setSchedules([]);
    } else {
      setIsVisible(false);
      // Clear data when closing
      setSchedules([]);
      setNotes([]);
      setAbilities([]);
    }
  }, [isOpen, employeeId]);

  // Fetch schedules when date or view changes
  useEffect(() => {
    if (!isOpen || !employeeId || activeTab !== 'schedule') return;
    
    const timer = setTimeout(() => {
      fetchSchedules();
    }, 100); // Debounce to prevent multiple calls
    
    return () => clearTimeout(timer);
  }, [currentDate, scheduleView, activeTab, employeeId, isOpen]);

  const handleTabChange = (tab) => {
    const currentIndex = tabs.indexOf(activeTab);
    const newIndex = tabs.indexOf(tab);
    setTabDirection(newIndex > currentIndex ? 1 : -1);
    setActiveTab(tab);
  };

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      
      // Fetch employee basic info
      const empResponse = await getEmployee(employeeId);
      setEmployee(empResponse.data);
      
      // Fetch abilities
      try {
        const abilitiesResponse = await getEmployeeAbility(employeeId);
        setAbilities(abilitiesResponse.data || getDefaultAbilities());
      } catch (err) {
        console.warn('Abilities not found, using defaults');
        setAbilities(getDefaultAbilities());
      }
      
      // Fetch notes
      try {
        const notesResponse = await getEmployeeNotes(employeeId);
        setNotes(notesResponse.data || []);
      } catch (err) {
        console.warn('Notes not found');
        setNotes([]);
      }
      
      // Don't fetch schedules here - it's handled by separate useEffect
      
    } catch (error) {
      console.error('Failed to fetch employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    // Prevent duplicate calls
    if (loadingSchedules) return;
    
    try {
      setLoadingSchedules(true);
      const startDate = getScheduleStartDate();
      const endDate = getScheduleEndDate();
      
      console.log('========== EMPLOYEE SCHEDULES DEBUG ==========');
      console.log('[EmployeeDetailModal] fetchSchedules called');
      console.log('[EmployeeDetailModal] Employee ID:', employeeId);
      console.log('[EmployeeDetailModal] Date range:', startDate, 'to', endDate);
      console.log('[EmployeeDetailModal] Calling getEmployeeSchedules...');
      console.trace('[EmployeeDetailModal] Call stack');
      
      const response = await getEmployeeSchedules(employeeId, startDate, endDate);
      console.log('Schedules response:', response.data);
      console.log('Response type:', typeof response.data, 'Array:', Array.isArray(response.data));
      
      // Backend already filters by employeeId, so no need to filter again
      // Just validate that we have the correct data
      const scheduleData = Array.isArray(response.data) ? response.data : [];
      
      // Log for debugging - check if any schedules don't belong to this employee
      const wrongEmployeeSchedules = scheduleData.filter(s => 
        s.employeeId !== parseInt(employeeId)
      );
      
      if (wrongEmployeeSchedules.length > 0) {
        console.warn('Found schedules for other employees:', wrongEmployeeSchedules);
        console.warn('This indicates a backend filtering issue that needs to be fixed');
      }
      
      console.log('Setting schedules:', scheduleData);
      console.log('Schedules count:', scheduleData.length);
      console.log('First few schedules:', scheduleData.slice(0, 3));
      console.log('===============================================');
      setSchedules(scheduleData);
    } catch (error) {
      console.warn('Failed to fetch schedules:', error);
      setSchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const getDefaultAbilities = () => [
    { name: 'Communication', level: 70, category: 'soft' },
    { name: 'Leadership', level: 60, category: 'soft' },
    { name: 'Problem Solving', level: 75, category: 'soft' },
    { name: 'Technical Skills', level: 80, category: 'technical' },
    { name: 'Time Management', level: 85, category: 'soft' }
  ];

  const getScheduleStartDate = () => {
    const date = new Date(currentDate);
    // Always get the first day of the current month
    date.setDate(1);
    return date.toISOString().split('T')[0];
  };

  const getScheduleEndDate = () => {
    const date = new Date(currentDate);
    // Always get the last day of the current month
    date.setMonth(date.getMonth() + 1, 0);
    return date.toISOString().split('T')[0];
  };

  const calculateTotalScore = () => {
    if (abilities.length === 0) return 0;
    return Math.round(abilities.reduce((sum, ability) => sum + ability.level, 0) / abilities.length);
  };

  const getRankFromScore = (score) => {
    if (score >= 90) return 'S';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  };

  const canEditAbilities = () => {
    return user?.role === 'admin' || user?.role === 'manager';
  };

  const handleEditAbilities = () => {
    setTempAbilities([...abilities]);
    setEditingAbilities(true);
  };

  const handleSaveAbilities = async () => {
    try {
      await updateEmployeeAbility(employeeId, { abilities: tempAbilities });
      setAbilities([...tempAbilities]);
      setEditingAbilities(false);
    } catch (error) {
      console.error('Failed to update abilities:', error);
    }
  };

  const handleCancelEditAbilities = () => {
    setTempAbilities([]);
    setEditingAbilities(false);
  };

  const handleAbilityChange = (index, newLevel) => {
    const updated = [...tempAbilities];
    updated[index] = { ...updated[index], level: newLevel };
    setTempAbilities(updated);
  };

  const handleAddNote = async () => {
    if (!noteForm.content.trim()) return;
    
    try {
      setAddingNote(true);
      const response = await addEmployeeNote(employeeId, noteForm);
      setNotes([response.data, ...notes]);
      setNoteForm({ type: 'general', content: '', isPrivate: false });
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote(noteId);
      setNotes(notes.filter(note => note.id !== noteId));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleViewSchedule = () => {
    if (employee) {
      navigate(`/schedules?employeeId=${employee.id}&employeeName=${employee.name}`);
      onClose();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return formatDateUtil(dateString, language, { format: 'short', showWeekday: false });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return formatDateUtil(dateString, language, { showTime: true });
  };

  const getNoteTypeIcon = (type) => {
    switch (type) {
      case 'praise': return 'fa-thumbs-up';
      case 'caution': return 'fa-exclamation-triangle';
      default: return 'fa-comment';
    }
  };

  const renderOverviewTab = () => (
    <div className="tab-content overview-tab">
      <div className="employee-header">
        <div className="employee-avatar-detail">
          {employee?.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div className="employee-basic-info">
          <h2 className="employee-name">{employee?.name || t('common.notAssigned')}</h2>
          <p className="employee-position">{employee?.position || t('common.noPosition')}</p>
          <p className="employee-department">
            <i className="fas fa-building"></i>
            {employee?.department || t('common.noDepartment')}
          </p>
        </div>
        <div className={`role-badge-large ${getRoleClass(employee?.user?.role || employee?.role)}`}>
          {(employee?.user?.role || employee?.role)?.toUpperCase() || t('common.roleNotAssigned')}
        </div>
      </div>

      <div className="info-sections">
        <div className="info-section">
          <h3 className="section-title">
            <i className="fas fa-address-card"></i>
            {t('employee.contactInformation')}
          </h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">{t('common.email')}</span>
              <span className="info-value">{employee?.email || t('common.dataNotEntered')}</span>
            </div>
            <div className="info-item">
              <span className="info-label">{t('employee.phone')}</span>
              <span className={`info-value ${!employee?.phone ? 'empty-state' : ''}`}>
                {employee?.phone || t('common.noPhone')}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">{t('employee.address')}</span>
              <span className={`info-value ${!employee?.address ? 'empty-state' : ''}`}>
                {employee?.address || t('common.noAddress')}
              </span>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h3 className="section-title">
            <i className="fas fa-briefcase"></i>
            {t('employee.employmentDetails')}
          </h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">{t('employee.hireDate')}</span>
              <span className="info-value">{formatDate(employee?.hireDate)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">{t('employee.birthDate')}</span>
              <span className="info-value">{formatDate(employee?.birthDate)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">{t('common.status')}</span>
              <span className={`status-badge ${employee?.status || 'active'}`}>
                {employee?.status || 'active'}
              </span>
            </div>
          </div>
        </div>

        <div className="info-section">
          <div className="schedule-actions">
            <motion.button
              className="btn-primary view-schedule-btn"
              onClick={handleViewSchedule}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <i className="fas fa-calendar-alt"></i>
              {t('employee.viewSchedule')}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Generate calendar days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dateStr = date.toISOString().split('T')[0];
      const daySchedules = schedules.filter(s => 
        new Date(s.date).toISOString().split('T')[0] === dateStr
      );
      
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.getTime() === today.getTime();
      
      days.push({
        date,
        isCurrentMonth,
        isToday,
        schedules: daySchedules
      });
    }
    
    return (
      <div className="calendar-grid">
        <div className="calendar-header">
          {['일', '월', '화', '수', '목', '금', '토'].map(day => (
            <div key={day} className="calendar-day-header">{day}</div>
          ))}
        </div>
        <div className="calendar-body">
          {days.map((day, index) => (
            <div 
              key={index} 
              className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''} ${day.schedules.length > 0 ? 'has-schedule' : ''}`}
            >
              <div className="day-number">{day.date.getDate()}</div>
              {day.schedules.length > 0 && (
                <div className="day-schedules">
                  {day.schedules.slice(0, 2).map((schedule, idx) => (
                    <div key={idx} className={`schedule-indicator ${schedule.shiftType || 'regular'}`}>
                      <span className="schedule-time-mini">
                        {schedule.startTime?.substring(0, 5)}
                      </span>
                    </div>
                  ))}
                  {day.schedules.length > 2 && (
                    <div className="more-schedules">+{day.schedules.length - 2}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderScheduleTab = () => (
    <div className="tab-content schedule-tab">
      <div className="schedule-header">
        <div className="schedule-controls">
          <div className="view-controls">
            <button
              className={`view-btn ${scheduleView === 'list' ? 'active' : ''}`}
              onClick={() => setScheduleView('list')}
            >
              {t('schedule.list')}
            </button>
            <button
              className={`view-btn ${scheduleView === 'month' ? 'active' : ''}`}
              onClick={() => setScheduleView('month')}
            >
              {t('schedule.month')}
            </button>
          </div>
          <div className="date-navigation">
            <button
              className="nav-btn"
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() - 1);
                setCurrentDate(newDate);
              }}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <span className="current-period">
              {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
            </span>
            <button
              className="nav-btn"
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() + 1);
                setCurrentDate(newDate);
              }}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>

      <div className="schedule-calendar">
        {scheduleView === 'month' ? (
          renderCalendarGrid()
        ) : (
          schedules.length === 0 ? (
            <div className="no-schedules empty-state">
              <i className="fas fa-calendar-times"></i>
              <p>{t('employee.noSchedulesMessage')}</p>
            </div>
          ) : (
            <div className="schedule-list">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="schedule-item">
                  <div className="schedule-date">
                    {formatDate(schedule.date)}
                  </div>
                  <div className="schedule-details">
                    <div className="schedule-time">
                      <i className="fas fa-clock"></i>
                      {schedule.startTime} - {schedule.endTime}
                    </div>
                    <div className={`schedule-type ${schedule.shiftType || 'regular'}`}>
                      {schedule.shiftType || 'Regular'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );

  const renderAbilitiesTab = () => (
    <div className="tab-content abilities-tab">
      <div className="abilities-header">
        <div className="abilities-summary">
          <div className="total-score">
            <span className="score-label">{t('employee.totalScore')}</span>
            <motion.span 
              className="score-value"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            >
              {calculateTotalScore()}
            </motion.span>
          </div>
          <motion.div 
            className={`rank-badge rank-${getRankFromScore(calculateTotalScore()).toLowerCase()}`}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 150, delay: 0.3 }}
          >
            {getRankFromScore(calculateTotalScore())}
          </motion.div>
        </div>
        
        {canEditAbilities() && (
          <div className="abilities-actions">
            {editingAbilities ? (
              <>
                <motion.button 
                  className="btn-secondary" 
                  onClick={handleCancelEditAbilities}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('common.cancel')}
                </motion.button>
                <motion.button 
                  className="btn-primary" 
                  onClick={handleSaveAbilities}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('common.save')}
                </motion.button>
              </>
            ) : (
              <motion.button 
                className="btn-primary" 
                onClick={handleEditAbilities}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <i className="fas fa-edit"></i>
                {t('common.edit')}
              </motion.button>
            )}
          </div>
        )}
      </div>

      <motion.div 
        className="abilities-list"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
      >
        {(editingAbilities ? tempAbilities : abilities).map((ability, index) => (
          <motion.div 
            key={index} 
            className="ability-item"
            variants={{
              hidden: { y: 20, opacity: 0 },
              visible: { y: 0, opacity: 1 }
            }}
            transition={{ type: "spring", stiffness: 100 }}
          >
            <div className="ability-info">
              <span className="ability-name">{ability.name}</span>
              <span className="ability-score">{ability.level}%</span>
            </div>
            <div className="ability-progress">
              <div className="progress-bar">
                <motion.div 
                  className="progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${ability.level}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
                ></motion.div>
              </div>
              {editingAbilities && (
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={ability.level}
                  onChange={(e) => handleAbilityChange(index, parseInt(e.target.value))}
                  className="ability-slider"
                />
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );

  const renderNotesTab = () => (
    <div className="tab-content notes-tab">
      <div className="notes-header">
        <h3>{t('employee.notes')}</h3>
        <div className="add-note-form">
          <div className="note-type-selector">
            <select
              value={noteForm.type}
              onChange={(e) => setNoteForm({ ...noteForm, type: e.target.value })}
            >
              <option value="general">{t('employee.generalNote')}</option>
              <option value="praise">{t('employee.praiseNote')}</option>
              <option value="caution">{t('employee.cautionNote')}</option>
            </select>
          </div>
          <textarea
            placeholder={t('employee.addNoteContent')}
            value={noteForm.content}
            onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
            rows="3"
          />
          <div className="note-form-actions">
            <label className="private-checkbox">
              <input
                type="checkbox"
                checked={noteForm.isPrivate}
                onChange={(e) => setNoteForm({ ...noteForm, isPrivate: e.target.checked })}
              />
              {t('employee.privateNote')}
            </label>
            <button
              className="btn-primary"
              onClick={handleAddNote}
              disabled={addingNote || !noteForm.content.trim()}
            >
              {addingNote ? t('common.saving') : t('employee.addNote')}
            </button>
          </div>
        </div>
      </div>

      <div className="notes-list">
        {notes.length === 0 ? (
          <div className="no-notes empty-state">
            <i className="fas fa-sticky-note"></i>
            <p>{t('employee.noNotesMessage')}</p>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className={`note-item note-${note.type}`}>
              <div className="note-header">
                <div className="note-type">
                  <i className={`fas ${getNoteTypeIcon(note.type)}`}></i>
                  <span className="note-type-label">
                    {t(`employee.${note.type}Note`)}
                  </span>
                </div>
                <div className="note-meta">
                  {note.isPrivate && (
                    <span className="private-badge">
                      <i className="fas fa-lock"></i>
                      {t('employee.private')}
                    </span>
                  )}
                  <span className="note-date">{formatDateTime(note.createdAt)}</span>
                  {(note.authorId === user?.id || canEditAbilities()) && (
                    <button
                      className="delete-note-btn"
                      onClick={() => handleDeleteNote(note.id)}
                      title={t('common.delete')}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              </div>
              <div className="note-content">{note.content}</div>
              <div className="note-author">
                {t('employee.by')} {note.author?.name || 'Unknown'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const getRoleClass = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'role-admin';
      case 'manager': return 'role-manager';
      case 'employee': return 'role-employee';
      default: return 'role-default';
    }
  };

  if (!isOpen) return null;

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset, velocity) => {
    return Math.abs(offset) * velocity;
  };

  return (
    <>
      <motion.div 
        className="modal-backdrop" 
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      ></motion.div>
      <motion.div 
        className="employee-detail-modal"
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 50 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <motion.div 
          className="modal-header"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="modal-title">{t('employee.employeeDetails')}</h2>
          <motion.button 
            className="modal-close" 
            onClick={onClose}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
          >
            <i className="fas fa-times"></i>
          </motion.button>
        </motion.div>

        <motion.div 
          className="modal-tabs"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {tabs.map((tab, index) => (
            <motion.button
              key={tab}
              className={`tab-button ${activeTab === tab ? 'active' : ''}`}
              onClick={() => handleTabChange(tab)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <i className={`fas fa-${
                tab === 'overview' ? 'user' :
                tab === 'schedule' ? 'calendar' :
                tab === 'abilities' ? 'chart-bar' : 'sticky-note'
              }`}></i>
              {t(`employee.${tab}`)}
            </motion.button>
          ))}
        </motion.div>

        <div className="modal-body" ref={swipeRef}>
          {loading ? (
            <motion.div 
              className="loading-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div 
                className="loading-spinner"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <div className="spinner-ring"></div>
              </motion.div>
              <p>{t('employee.loadingEmployeeData')}</p>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait" custom={tabDirection}>
              <motion.div
                key={activeTab}
                custom={tabDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={1}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = swipePower(offset.x, velocity.x);

                  if (swipe < -swipeConfidenceThreshold) {
                    handleSwipeLeft();
                  } else if (swipe > swipeConfidenceThreshold) {
                    handleSwipeRight();
                  }
                }}
              >
                {activeTab === 'overview' && renderOverviewTab()}
                {activeTab === 'schedule' && renderScheduleTab()}
                {activeTab === 'abilities' && renderAbilitiesTab()}
                {activeTab === 'notes' && renderNotesTab()}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default EmployeeDetailModal;