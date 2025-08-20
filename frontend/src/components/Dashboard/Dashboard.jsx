import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  getDashboardStats, 
  getRecentSchedules,
  users,
  leaveRequests,
  getEmployees,
  getEmployeeAbility,
  getDashboardAlerts,
  getNotices,
  markNoticeAsRead,
  getUnreadCount
} from '../../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatDate, isToday, isFutureDate } from '../../utils/dateFormatter';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentSchedules, setRecentSchedules] = useState([]);
  const [myLeaveBalance, setMyLeaveBalance] = useState(null);
  const [rankDistribution, setRankDistribution] = useState([]);
  const [leaveData, setLeaveData] = useState({
    todayLeaves: [],
    upcomingLeaves: [],
    loading: false
  });
  const [alerts, setAlerts] = useState([]);
  const [notices, setNotices] = useState([]);
  const [unreadNoticesCount, setUnreadNoticesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [animatedStats, setAnimatedStats] = useState({});
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();
  const navigate = useNavigate();


  useEffect(() => {
    fetchDashboardData();
    fetchLeaveData();
    fetchAlertsAndNotices();
    // Removed auto-refresh - NotificationContext handles periodic updates
    // Dashboard will only refresh when user navigates or manually refreshes
  }, [user]);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      else setRefreshing(true);

      // Fetch based on user role
      if (user?.role === 'admin' || user?.role === 'manager') {
        const [statsResponse, schedulesResponse] = await Promise.all([
          getDashboardStats(),
          getRecentSchedules(10)
        ]);
        
        const newStats = statsResponse.data || {};
        setStats(newStats);
        setRecentSchedules(Array.isArray(schedulesResponse.data) ? schedulesResponse.data : []);
        
        // Fetch rank distribution for admin/manager
        await fetchRankDistribution();
      } else {
        // Employee view
        const [statsResponse, userResponse, schedulesResponse, leaveResponse] = await Promise.all([
          getDashboardStats(),
          users.getCurrentUser(),
          getRecentSchedules(5),
          leaveRequests.getMyRequests()
        ]);
        
        const newStats = statsResponse.data || {};
        setStats(newStats);
        setRecentSchedules(Array.isArray(schedulesResponse.data) ? schedulesResponse.data : []);
        
        // Calculate leave balance
        const myLeaves = Array.isArray(leaveResponse.data) ? leaveResponse.data : [];
        const usedDays = myLeaves
          .filter(leave => leave.status === 'approved')
          .reduce((acc, leave) => {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            return acc + days;
          }, 0);
        
        setMyLeaveBalance({
          total: 15, // Default annual leave
          used: usedDays,
          remaining: 15 - usedDays
        });
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchRankDistribution = async () => {
    try {
      const employeesResponse = await getEmployees();
      const employees = employeesResponse.data?.employees || employeesResponse.data || [];
      
      const rankCounts = { S: 0, A: 0, B: 0, C: 0, D: 0 };
      
      // Fetch abilities for each employee and calculate their rank
      for (const employee of employees) {
        try {
          const abilityResponse = await getEmployeeAbility(employee.id);
          const ability = abilityResponse.data;
          
          if (ability && ability.abilities && ability.abilities.length > 0) {
            // Calculate overall rank based on abilities
            const averageRank = ability.abilities.reduce((sum, skill) => {
              const rankValue = {'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1}[skill.rank] || 1;
              return sum + rankValue;
            }, 0) / ability.abilities.length;
            
            let overallRank;
            if (averageRank >= 4.5) overallRank = 'S';
            else if (averageRank >= 3.5) overallRank = 'A';
            else if (averageRank >= 2.5) overallRank = 'B';
            else if (averageRank >= 1.5) overallRank = 'C';
            else overallRank = 'D';
            
            rankCounts[overallRank]++;
          } else {
            rankCounts.D++; // Default to D if no abilities
          }
        } catch (err) {
          console.warn(`Failed to fetch abilities for employee ${employee.id}:`, err);
          rankCounts.D++; // Default to D if fetch fails
        }
      }
      
      // Convert to chart data
      const chartData = Object.entries(rankCounts)
        .filter(([_, count]) => count > 0)
        .map(([rank, count]) => ({
          rank,
          count,
          percentage: employees.length > 0 ? Math.round((count / employees.length) * 100) : 0
        }));
      
      setRankDistribution(chartData);
    } catch (error) {
      console.error('Failed to fetch rank distribution:', error);
    }
  };

  const fetchLeaveData = async () => {
    try {
      setLeaveData(prev => ({ ...prev, loading: true }));

      let leavesResponse;
      if (user?.role === 'admin' || user?.role === 'manager') {
        // Admin/Manager: Get all approved leaves
        leavesResponse = await leaveRequests.getAll({ status: 'approved' });
      } else {
        // Employee: Get only their own leaves
        leavesResponse = await leaveRequests.getMyRequests();
      }

      const leaves = Array.isArray(leavesResponse.data) ? leavesResponse.data : [];
      const approvedLeaves = leaves.filter(leave => leave.status === 'approved');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      // Filter today's leaves
      const todayLeaves = approvedLeaves.filter(leave => {
        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        
        return today >= startDate && today <= endDate;
      });

      // Filter upcoming leaves (next 7 days)
      const upcomingLeaves = approvedLeaves.filter(leave => {
        const startDate = new Date(leave.startDate);
        startDate.setHours(0, 0, 0, 0);
        
        return startDate > today && startDate <= nextWeek;
      }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

      setLeaveData({
        todayLeaves,
        upcomingLeaves,
        loading: false
      });
    } catch (error) {
      console.error('Failed to fetch leave data:', error);
      setLeaveData(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchAlertsAndNotices = async () => {
    try {
      // Fetch alerts and notices in parallel
      const [alertsResponse, noticesResponse, unreadResponse] = await Promise.all([
        getDashboardAlerts(),
        getNotices(),
        getUnreadCount()
      ]);

      setAlerts(Array.isArray(alertsResponse.data) ? alertsResponse.data : []);
      setNotices(Array.isArray(noticesResponse.data) ? noticesResponse.data : []);
      setUnreadNoticesCount(unreadResponse.data?.count || 0);
    } catch (error) {
      console.error('Failed to fetch alerts and notices:', error);
      // Set empty arrays if fetch fails
      setAlerts([]);
      setNotices([]);
      setUnreadNoticesCount(0);
    }
  };

  const handleMarkNoticeAsRead = async (noticeId) => {
    try {
      await markNoticeAsRead(noticeId);
      // Update local state
      setNotices(prev => prev.map(notice => 
        notice.id === noticeId ? { ...notice, isRead: true } : notice
      ));
      // Update unread count
      setUnreadNoticesCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notice as read:', error);
    }
  };

  const quickActions = [
    {
      icon: 'fa-calendar-plus',
      label: t('dashboard.createSchedule'),
      path: '/schedules',
      color: '#4667de',
      bgColor: 'rgba(70, 103, 222, 0.1)',
      roles: ['admin', 'manager']
    },
    {
      icon: 'fa-user-plus',
      label: t('dashboard.addEmployee'),
      path: '/employees/new',
      color: '#22c55e',
      bgColor: 'rgba(34, 195, 94, 0.1)',
      roles: ['admin', 'manager']
    },
    {
      icon: 'fa-robot',
      label: t('dashboard.autoGenerate'),
      path: '/schedules/auto-generate',
      color: '#8b5cf6',
      bgColor: 'rgba(139, 92, 246, 0.1)',
      roles: ['admin', 'manager']
    },
    {
      icon: 'fa-plane-departure',
      label: t('leave.requestLeave'),
      path: '/leave-requests',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      roles: ['employee']
    },
    {
      icon: 'fa-chart-line',
      label: t('dashboard.viewReports'),
      path: '/reports',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      roles: ['admin', 'manager']
    }
  ];

  const filteredActions = quickActions.filter(action => 
    action.roles.includes(user?.role?.toLowerCase() || 'employee')
  );

  const formatDate = (dateString) => {
    if (!dateString) return t('common.dataNotEntered');
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return t('time.today');
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return t('time.tomorrow');
    }
    
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const getShiftColor = (shiftType) => {
    switch (shiftType?.toLowerCase()) {
      case 'morning': return { bg: '#fef3c7', color: '#f59e0b', icon: 'fa-sun' };
      case 'afternoon': return { bg: '#dbeafe', color: '#3b82f6', icon: 'fa-cloud-sun' };
      case 'evening': return { bg: '#e9d5ff', color: '#8b5cf6', icon: 'fa-cloud-moon' };
      case 'night': return { bg: '#e0e7ff', color: '#6366f1', icon: 'fa-moon' };
      case 'regular': return { bg: '#e6f4ea', color: '#34a853', icon: 'fa-briefcase' };
      default: return { bg: '#f3f4f6', color: '#6b7280', icon: 'fa-clock' };
    }
  };

  const QuickStats = ({ stats, userRole, onStatClick }) => {
    const statItems = [
      {
        id: 'employees',
        icon: 'fa-users',
        value: stats.totalEmployees || 0,
        label: '직원',
        path: '/employees',
        bgColor: '#e8f5e9',
        iconColor: '#4caf50'
      },
      {
        id: 'schedules',
        icon: 'fa-calendar-check',
        value: `${stats.schedulesThisWeek || 0}일`,
        label: '운영',
        path: '/schedules',
        bgColor: '#e3f2fd',
        iconColor: '#2196f3'
      },
      {
        id: 'leaves',
        icon: 'fa-plane-departure',
        value: stats.pendingLeaves || 0,
        label: '대기중',
        path: '/leave-requests',
        bgColor: stats.pendingLeaves > 0 ? '#fff3e0' : '#f5f5f5',
        iconColor: stats.pendingLeaves > 0 ? '#ff9800' : '#9e9e9e'
      },
      {
        id: 'shifts',
        icon: 'fa-clock',
        value: stats.upcomingShifts || 0,
        label: '예정',
        path: '/schedules',
        bgColor: '#f3e5f5',
        iconColor: '#9c27b0'
      }
    ];

    return (
      <motion.div 
        className="quick-stats-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="quick-stats-scroll">
          {statItems.map((stat, index) => (
            <motion.div
              key={stat.id}
              className="quick-stat-pill"
              onClick={() => onStatClick(stat.path)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ 
                backgroundColor: stat.bgColor,
                borderColor: stat.iconColor + '30'
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onStatClick(stat.path)}
            >
              <i className={`fas ${stat.icon} stat-icon`} style={{ color: stat.iconColor }}></i>
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  };

  const AlertCenter = () => {
    const getAlertTypeStyle = (type) => {
      switch (type?.toLowerCase()) {
        case 'critical':
          return { 
            bg: '#fee2e2', 
            color: '#dc2626', 
            border: '#fca5a5',
            icon: 'fa-exclamation-triangle'
          };
        case 'warning':
          return { 
            bg: '#fef3c7', 
            color: '#d97706', 
            border: '#fcd34d',
            icon: 'fa-exclamation-circle'
          };
        case 'info':
          return { 
            bg: '#dbeafe', 
            color: '#2563eb', 
            border: '#93c5fd',
            icon: 'fa-info-circle'
          };
        default:
          return { 
            bg: '#f3f4f6', 
            color: '#6b7280', 
            border: '#d1d5db',
            icon: 'fa-bell'
          };
      }
    };

    return (
      <motion.div 
        className="alert-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="widget-header">
          <h3 className="widget-title">
            <i className="fas fa-exclamation-triangle"></i>
            {t('dashboard.alerts')}
          </h3>
          {alerts.length > 3 && (
            <span className="alert-count-badge">{alerts.length}</span>
          )}
        </div>
        
        <div className="alerts-list">
          {alerts.length > 0 ? (
            alerts.slice(0, 3).map((alert, index) => {
              const alertStyle = getAlertTypeStyle(alert.type);
              return (
                <motion.div 
                  key={`${alert.type}-${index}`}
                  className={`alert-item ${alert.type}`}
                  style={{ 
                    background: alertStyle.bg,
                    borderColor: alertStyle.border,
                    color: alertStyle.color
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.02, x: 5 }}
                  onClick={() => alert.action?.url && navigate(alert.action.url)}
                >
                  <div className="alert-icon">
                    <i className={`fas ${alertStyle.icon}`}></i>
                  </div>
                  <div className="alert-content">
                    <div className="alert-title">{alert.title}</div>
                    <div className="alert-message">{alert.message}</div>
                    <div className="alert-timestamp">
                      {new Date(alert.timestamp).toLocaleString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="no-alerts">
              <i className="fas fa-check-circle"></i>
              <span>{t('dashboard.noAlerts')}</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const NoticeBoard = () => {
    return (
      <motion.div 
        className="notice-board"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <div className="widget-header">
          <h3 className="widget-title">
            <i className="fas fa-bullhorn"></i>
            {t('dashboard.notices')}
          </h3>
          <div className="notice-actions">
            {unreadNoticesCount > 0 && (
              <span className="unread-count-badge">{unreadNoticesCount}</span>
            )}
            <motion.button 
              className="view-all-btn"
              onClick={() => navigate('/notices')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t('common.viewAll')} <i className="fas fa-arrow-right"></i>
            </motion.button>
          </div>
        </div>
        
        <div className="notices-list">
          {notices.length > 0 ? (
            notices.slice(0, 4).map((notice, index) => (
              <motion.div 
                key={notice.id}
                className={`notice-item ${notice.isRead ? 'read' : 'unread'}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ scale: 1.02, x: 5 }}
                onClick={() => !notice.isRead && handleMarkNoticeAsRead(notice.id)}
              >
                <div className="notice-content">
                  <div className="notice-title">{notice.title}</div>
                  <div className="notice-message">{notice.message}</div>
                  <div className="notice-meta">
                    <span className="notice-author">{notice.author}</span>
                    <span className="notice-date">
                      {new Date(notice.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {!notice.isRead && (
                  <div className="notice-status">
                    <div className="unread-indicator"></div>
                  </div>
                )}
              </motion.div>
            ))
          ) : (
            <div className="no-notices">
              <i className="fas fa-clipboard"></i>
              <span>{t('dashboard.noNotices')}</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const getLeaveTypeIcon = (leaveType) => {
    switch (leaveType?.toLowerCase()) {
      case 'annual':
      case 'vacation':
      case '연차':
        return { icon: 'fa-umbrella-beach', color: '#3b82f6', bg: '#dbeafe' };
      case 'sick':
      case '병가':
        return { icon: 'fa-thermometer-half', color: '#ef4444', bg: '#fee2e2' };
      case 'personal':
      case '개인사유':
        return { icon: 'fa-user-clock', color: '#8b5cf6', bg: '#e9d5ff' };
      case 'maternity':
      case 'paternity':
      case '출산휴가':
      case '육아휴직':
        return { icon: 'fa-baby', color: '#f59e0b', bg: '#fef3c7' };
      case 'emergency':
      case '경조사':
        return { icon: 'fa-exclamation-triangle', color: '#ef4444', bg: '#fee2e2' };
      default:
        return { icon: 'fa-calendar-times', color: '#6b7280', bg: '#f3f4f6' };
    }
  };

  const LeaveStatusWidget = () => {
    const { todayLeaves, upcomingLeaves, loading } = leaveData;
    const isEmployee = user?.role === 'employee';

    return (
      <motion.div 
        className="leave-status-widget"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.8 }}
      >
        <div className="widget-header">
          <h3 className="widget-title">
            <i className="fas fa-plane-departure"></i>
            {isEmployee ? '내 휴가 현황' : '팀 휴가 현황'}
          </h3>
          <motion.button 
            className="view-all-btn"
            onClick={() => navigate('/leave-requests')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            전체보기 <i className="fas fa-arrow-right"></i>
          </motion.button>
        </div>

        {loading ? (
          <div className="widget-loading">
            <div className="loading-spinner-small">
              <div className="spinner-ring-small"></div>
            </div>
            <span>휴가 정보를 불러오는 중...</span>
          </div>
        ) : (
          <div className="leave-content">
            {/* Today's Leaves */}
            <div className="leave-section">
              <div className="leave-section-header">
                <h4>
                  <i className="fas fa-calendar-day"></i>
                  오늘 휴가 ({todayLeaves.length}명)
                </h4>
              </div>
              <div className="leave-list">
                {todayLeaves.length > 0 ? (
                  todayLeaves.slice(0, 3).map((leave, index) => {
                    const leaveStyle = getLeaveTypeIcon(leave.leaveType);
                    return (
                      <motion.div 
                        key={leave.id}
                        className="leave-item today"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        whileHover={{ scale: 1.02, x: 5 }}
                      >
                        <div className="leave-avatar">
                          <motion.div 
                            className="leave-icon"
                            style={{ background: leaveStyle.bg, color: leaveStyle.color }}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                          >
                            <i className={`fas ${leaveStyle.icon}`}></i>
                          </motion.div>
                        </div>
                        <div className="leave-details">
                          <div className="leave-employee">
                            {leave.employee?.name || leave.userName || '직원'}
                            {leave.employee?.department && (
                              <span className="department-tag">
                                {leave.employee.department}
                              </span>
                            )}
                          </div>
                          <div className="leave-info">
                            <span className="leave-type">{leave.leaveType || '휴가'}</span>
                            <span className="leave-duration">
                              {formatDate(leave.startDate, 'ko', { format: 'short', showWeekday: false })}
                              {leave.startDate !== leave.endDate && (
                                ` - ${formatDate(leave.endDate, 'ko', { format: 'short', showWeekday: false })}`
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="leave-status today-badge">
                          <i className="fas fa-circle"></i>
                          <span>오늘</span>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="no-leaves">
                    <i className="fas fa-check-circle"></i>
                    <span>오늘 휴가자가 없습니다</span>
                  </div>
                )}
                {todayLeaves.length > 3 && (
                  <div className="more-leaves">
                    외 {todayLeaves.length - 3}명 더
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Leaves */}
            <div className="leave-section">
              <div className="leave-section-header">
                <h4>
                  <i className="fas fa-calendar-week"></i>
                  다가오는 휴가 (7일 내)
                </h4>
              </div>
              <div className="leave-list">
                {upcomingLeaves.length > 0 ? (
                  upcomingLeaves.slice(0, 4).map((leave, index) => {
                    const leaveStyle = getLeaveTypeIcon(leave.leaveType);
                    const daysUntil = Math.ceil((new Date(leave.startDate) - new Date()) / (1000 * 60 * 60 * 24));
                    return (
                      <motion.div 
                        key={leave.id}
                        className="leave-item upcoming"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        whileHover={{ scale: 1.02, x: 5 }}
                      >
                        <div className="leave-avatar">
                          <motion.div 
                            className="leave-icon"
                            style={{ background: leaveStyle.bg, color: leaveStyle.color }}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                          >
                            <i className={`fas ${leaveStyle.icon}`}></i>
                          </motion.div>
                        </div>
                        <div className="leave-details">
                          <div className="leave-employee">
                            {leave.employee?.name || leave.userName || '직원'}
                            {leave.employee?.department && (
                              <span className="department-tag">
                                {leave.employee.department}
                              </span>
                            )}
                          </div>
                          <div className="leave-info">
                            <span className="leave-type">{leave.leaveType || '휴가'}</span>
                            <span className="leave-duration">
                              {formatDate(leave.startDate, 'ko', { format: 'short', showWeekday: true })}
                              {leave.startDate !== leave.endDate && (
                                ` - ${formatDate(leave.endDate, 'ko', { format: 'short', showWeekday: false })}`
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="leave-status upcoming-badge">
                          <span>{daysUntil}일 후</span>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="no-leaves">
                    <i className="fas fa-calendar-check"></i>
                    <span>예정된 휴가가 없습니다</span>
                  </div>
                )}
                {upcomingLeaves.length > 4 && (
                  <div className="more-leaves">
                    외 {upcomingLeaves.length - 4}명 더
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
          </div>
          <p className="loading-text">{t('dashboard.loadingDashboard')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Refresh Indicator */}
      {refreshing && (
        <div className="refresh-indicator">
          <i className="fas fa-sync fa-spin"></i>
          <span>새로고침 중...</span>
        </div>
      )}

      {/* Alert Center and Notice Board */}
      <div className="dashboard-widgets-grid">
        <AlertCenter />
        <NoticeBoard />
      </div>

      {/* QuickStats - Admin/Manager View */}
      {(user?.role === 'admin' || user?.role === 'manager') && stats && (
        <QuickStats 
          stats={{
            totalEmployees: stats.totalEmployees || 0,
            schedulesThisWeek: stats.schedulesThisWeek || 0,
            pendingLeaves: stats.pendingLeaves || 0,
            upcomingShifts: stats.upcomingShifts || 0
          }}
          userRole={user?.role}
          onStatClick={(path) => navigate(path)}
        />
      )}

      {/* Team Rank Distribution - Admin/Manager View */}
      {(user?.role === 'admin' || user?.role === 'manager') && rankDistribution.length > 0 && (
        <div className="rank-distribution-section">
          <div className="section-header">
            <h3 className="section-title">
              <i className="fas fa-chart-pie"></i> {t('dashboard.teamRankDistribution')}
            </h3>
          </div>
          
          <div className="rank-distribution-card">
            <div className="rank-chart-container">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={rankDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {rankDistribution.map((entry, index) => {
                      const colors = {
                        S: '#ffd700',
                        A: '#ef4444',
                        B: '#3b82f6',
                        C: '#10b981',
                        D: '#6b7280'
                      };
                      return (
                        <Cell key={`cell-${index}`} fill={colors[entry.rank] || '#6b7280'} />
                      );
                    })}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [`${value} employees`, `Rank ${name}`]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="rank-stats-grid">
              {rankDistribution.map((item) => {
                const colors = {
                  S: { bg: '#fef3c7', color: '#f59e0b', border: '#fbbf24' },
                  A: { bg: '#fee2e2', color: '#ef4444', border: '#f87171' },
                  B: { bg: '#dbeafe', color: '#3b82f6', border: '#60a5fa' },
                  C: { bg: '#d1fae5', color: '#10b981', border: '#34d399' },
                  D: { bg: '#f3f4f6', color: '#6b7280', border: '#9ca3af' }
                };
                const style = colors[item.rank] || colors.D;
                
                return (
                  <div 
                    key={item.rank} 
                    className="rank-stat-item"
                    style={{ 
                      background: style.bg, 
                      borderColor: style.border,
                      color: style.color 
                    }}
                  >
                    <div className="rank-label">
                      <i className="fas fa-star"></i>
                      Rank {item.rank}
                    </div>
                    <div className="rank-count">{item.count}</div>
                    <div className="rank-percentage">{item.percentage}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Leave Status Widget for Admin/Manager */}
      {(user?.role === 'admin' || user?.role === 'manager') && (
        <LeaveStatusWidget />
      )}

      {/* Employee View - Personal Stats */}
      {user?.role === 'employee' && (
        <div className="employee-stats">
          {/* This Week's Schedule Card */}
          <div className="today-schedule-card">
            <div className="card-header">
              <h3><i className="fas fa-calendar-week"></i> 이번 주 출근</h3>
            </div>
            <div className="schedule-info">
              <div className="week-schedule-summary">
                <div className="week-stat-main">
                  <span className="week-stat-number">{stats?.mySchedulesThisWeek || 0}</span>
                  <span className="week-stat-label">일 출근</span>
                </div>
                <div className="week-stat-details">
                  <div className="week-days-indicator">
                    {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => {
                      const today = new Date();
                      const startOfWeek = new Date(today);
                      startOfWeek.setDate(today.getDate() - today.getDay());
                      const dayDate = new Date(startOfWeek);
                      dayDate.setDate(startOfWeek.getDate() + index);
                      
                      const hasSchedule = recentSchedules.some(s => 
                        new Date(s.date).toDateString() === dayDate.toDateString()
                      );
                      const isToday = dayDate.toDateString() === today.toDateString();
                      
                      return (
                        <div 
                          key={day} 
                          className={`week-day-dot ${hasSchedule ? 'scheduled' : ''} ${isToday ? 'today' : ''}`}
                          title={day}
                        >
                          <span className="day-label">{day}</span>
                          {hasSchedule && <i className="fas fa-check"></i>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Schedule Card */}
          <div className="today-schedule-card">
            <div className="card-header">
              <h3><i className="fas fa-calendar-day"></i> 오늘의 근무</h3>
            </div>
            <div className="schedule-info">
              {recentSchedules.find(s => 
                new Date(s.date).toDateString() === new Date().toDateString()
              ) ? (
                <div className="shift-display">
                  <div className="shift-time">
                    <i className="fas fa-clock"></i>
                    <span>09:00 - 18:00</span>
                  </div>
                  <div className="shift-type">
                    <span className="shift-badge morning">오전 근무</span>
                  </div>
                </div>
              ) : (
                <div className="no-schedule">
                  <i className="fas fa-coffee"></i>
                  <span>오늘은 휴무입니다</span>
                </div>
              )}
            </div>
          </div>

          {/* Leave Balance Card */}
          {myLeaveBalance && (
            <div className="leave-balance-card">
              <div className="card-header">
                <h3><i className="fas fa-umbrella-beach"></i> 연차 현황</h3>
              </div>
              <div className="leave-stats">
                <div className="leave-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${(myLeaveBalance.used / myLeaveBalance.total) * 100}%` }}
                    />
                  </div>
                  <div className="leave-numbers">
                    <span className="used">{myLeaveBalance.used}일 사용</span>
                    <span className="remaining">{myLeaveBalance.remaining}일 남음</span>
                  </div>
                </div>
              </div>
              <button 
                className="request-leave-btn"
                onClick={() => navigate('/leave-requests')}
              >
                <i className="fas fa-plus"></i> 휴가 신청
              </button>
            </div>
          )}

          {/* Team Members Card */}
          <div className="team-card">
            <div className="card-header">
              <h3><i className="fas fa-user-friends"></i> 우리 팀</h3>
            </div>
            <div className="team-members">
              <div className="member-avatar">김</div>
              <div className="member-avatar">박</div>
              <div className="member-avatar">이</div>
              <div className="member-avatar">최</div>
              <div className="member-avatar more">+3</div>
            </div>
          </div>

          {/* Leave Status Widget for Employee */}
          <LeaveStatusWidget />
        </div>
      )}

      {/* Quick Actions */}
      <motion.div 
        className="quick-actions-section"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <motion.h3 
          className="section-title"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
        >
          {t('dashboard.quickActions')}
        </motion.h3>
        <motion.div 
          className="quick-actions-grid"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
                delayChildren: 1.1
              }
            }
          }}
        >
          {filteredActions.map((action, index) => (
            <motion.button
              key={index}
              className="quick-action-card"
              onClick={() => navigate(action.path)}
              style={{ '--hover-color': action.color }}
              variants={{
                hidden: { y: 30, opacity: 0, scale: 0.9 },
                visible: { y: 0, opacity: 1, scale: 1 }
              }}
              whileHover={{ scale: 1.03, y: -3 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <motion.div 
                className="action-icon"
                style={{ background: action.bgColor, color: action.color }}
                whileHover={{ rotate: 5, scale: 1.1 }}
              >
                <i className={`fas ${action.icon}`}></i>
              </motion.div>
              <span className="action-label">{action.label}</span>
              <motion.i 
                className="fas fa-arrow-right action-arrow"
                whileHover={{ x: 5 }}
              ></motion.i>
            </motion.button>
          ))}
        </motion.div>
      </motion.div>

      {/* Recent Schedules */}
      {recentSchedules.length > 0 && (
        <motion.div 
          className="recent-schedules-section"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <motion.div 
            className="section-header"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 1.3 }}
          >
            <h3 className="section-title">{t('dashboard.recentSchedules')}</h3>
            <motion.button 
              className="view-all-btn"
              onClick={() => navigate('/schedules')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t('dashboard.viewAll')} <motion.i 
                className="fas fa-arrow-right"
                whileHover={{ x: 5 }}
              ></motion.i>
            </motion.button>
          </motion.div>
          
          <motion.div 
            className="schedules-list"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1,
                  delayChildren: 1.4
                }
              }
            }}
          >
            {recentSchedules.slice(0, 5).map((schedule, index) => {
              const shiftStyle = getShiftColor(schedule.shiftType);
              return (
                <motion.div 
                  key={index} 
                  className="schedule-item"
                  variants={{
                    hidden: { x: -50, opacity: 0 },
                    visible: { x: 0, opacity: 1 }
                  }}
                  whileHover={{ scale: 1.02, x: 10 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <div className="schedule-date">
                    <span className="date-text">{formatDate(schedule.date)}</span>
                  </div>
                  <div className="schedule-details">
                    <div className="schedule-employee">
                      <motion.div 
                        className="employee-avatar-mini"
                        whileHover={{ scale: 1.2, rotate: 5 }}
                      >
                        {schedule.employee?.name?.charAt(0) || '?'}
                      </motion.div>
                      <span className="employee-name">{schedule.employee?.name || t('common.notAssigned')}</span>
                    </div>
                    <motion.div 
                      className="schedule-shift"
                      style={{ background: shiftStyle.bg }}
                      whileHover={{ scale: 1.1 }}
                    >
                      <i className={`fas ${shiftStyle.icon}`} style={{ color: shiftStyle.color }}></i>
                      <span style={{ color: shiftStyle.color }}>
                        {schedule.shiftType ? (t(`schedule.${schedule.shiftType}`) || schedule.shiftType) : 
                         `${schedule.startTime || '09:00'} - ${schedule.endTime || '18:00'}`}
                      </span>
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      )}

      {/* Floating Action Button for Mobile */}
      <motion.button 
        className="fab-primary"
        onClick={() => navigate(
          user?.role === 'employee' ? '/leave-requests' : '/schedules/auto-generate'
        )}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, delay: 1.5 }}
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
      >
        <i className={`fas ${user?.role === 'employee' ? 'fa-plane-departure' : 'fa-robot'}`}></i>
      </motion.button>
    </div>
  );
};

export default Dashboard;