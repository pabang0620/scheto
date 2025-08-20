import React, { createContext, useContext, useState, useEffect } from 'react';
import { leaveRequests, notices } from '../services/api';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children, user }) => {
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [unreadNoticeCount, setUnreadNoticeCount] = useState(0);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchPendingLeaveCount = async () => {
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      setPendingLeaveCount(0);
      return;
    }

    try {
      const response = await leaveRequests.getPendingApprovals();
      setPendingLeaveCount(response.data?.length || 0);
    } catch (error) {
      console.error('Failed to fetch pending leave count:', error);
      setPendingLeaveCount(0);
    }
  };

  const fetchUnreadNoticeCount = async () => {
    if (!user) {
      setUnreadNoticeCount(0);
      return;
    }

    try {
      // Use the correct API endpoint
      const response = await fetch('/api/notices/unread/count', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadNoticeCount(data?.count || 0);
      } else {
        setUnreadNoticeCount(0);
      }
    } catch (error) {
      console.error('Failed to fetch unread notice count:', error);
      setUnreadNoticeCount(0);
    }
  };

  const refreshCounts = async () => {
    // Prevent too frequent calls (minimum 5 seconds between calls)
    const now = Date.now();
    if (lastFetch && now - lastFetch < 5000) {
      return;
    }
    
    setLastFetch(now);
    await Promise.all([
      fetchPendingLeaveCount(),
      fetchUnreadNoticeCount()
    ]);
  };

  useEffect(() => {
    if (user) {
      refreshCounts();
      
      // Set up interval for auto-refresh (every 60 seconds)
      // Only refresh notification counts, not entire dashboard
      const interval = setInterval(refreshCounts, 60000);
      
      return () => clearInterval(interval);
    } else {
      setPendingLeaveCount(0);
      setUnreadNoticeCount(0);
    }
  }, [user]);

  const value = {
    pendingLeaveCount,
    unreadNoticeCount,
    refreshCounts
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};