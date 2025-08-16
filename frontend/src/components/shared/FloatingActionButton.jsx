import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import TouchRipple from './TouchRipple';
import './FloatingActionButton.css';

const FloatingActionButton = ({ className = '', style = {} }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const { t } = useLanguage();
  const navigate = useNavigate();
  const fabRef = useRef(null);
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);

  // Initialize position on mount
  useEffect(() => {
    const savedPosition = localStorage.getItem('fab-position');
    if (savedPosition) {
      setPosition(JSON.parse(savedPosition));
    } else {
      // Default position: bottom right with some margin
      setPosition({
        x: window.innerWidth - 80,
        y: window.innerHeight - 160
      });
    }
  }, []);

  // Save position to localStorage
  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      localStorage.setItem('fab-position', JSON.stringify(position));
    }
  }, [position]);

  const actions = [
    {
      id: 'schedule',
      icon: 'fas fa-calendar-plus',
      label: t('fab.addSchedule') || 'Add Schedule',
      color: '#007AFF',
      path: '/schedules/new'
    },
    {
      id: 'employee',
      icon: 'fas fa-user-plus',
      label: t('fab.addEmployee') || 'Add Employee',
      color: '#34C759',
      path: '/employees/new',
      requiresRole: ['admin', 'manager']
    },
    {
      id: 'leave',
      icon: 'fas fa-plane',
      label: t('fab.requestLeave') || 'Request Leave',
      color: '#FF9500',
      path: '/leave-requests/new'
    },
    {
      id: 'report',
      icon: 'fas fa-chart-line',
      label: t('fab.viewReports') || 'View Reports',
      color: '#5856D6',
      path: '/reports',
      requiresRole: ['admin', 'manager']
    }
  ];

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    const rect = fabRef.current.getBoundingClientRect();
    
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });

    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setIsDragging(true);
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    
    // Calculate new position
    const newX = Math.max(16, Math.min(window.innerWidth - 56, touch.clientX - dragOffset.x));
    const newY = Math.max(16, Math.min(window.innerHeight - 56, touch.clientY - dragOffset.y));
    
    setPosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
    
    if (isDragging) {
      setIsDragging(false);
      // Snap to edges for better UX
      snapToEdge();
    } else if (!isLongPress.current) {
      // Normal tap - toggle expanded state
      handleFabClick();
    }
    
    isLongPress.current = false;
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    
    const rect = fabRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });

    // Start long press timer for mouse
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setIsDragging(true);
    }, 500);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    e.preventDefault();
    const newX = Math.max(16, Math.min(window.innerWidth - 56, e.clientX - dragOffset.x));
    const newY = Math.max(16, Math.min(window.innerHeight - 56, e.clientY - dragOffset.y));
    
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    clearTimeout(longPressTimer.current);
    
    if (isDragging) {
      setIsDragging(false);
      snapToEdge();
    } else if (!isLongPress.current) {
      handleFabClick();
    }
    
    isLongPress.current = false;
  };

  const snapToEdge = () => {
    const screenWidth = window.innerWidth;
    const fabCenterX = position.x + 28; // FAB width/2
    
    // Snap to closest horizontal edge
    const newX = fabCenterX < screenWidth / 2 ? 16 : screenWidth - 72;
    
    setPosition(prev => ({ ...prev, x: newX }));
  };

  const handleFabClick = () => {
    if (isDragging) return;
    setIsExpanded(!isExpanded);
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleActionClick = (action) => {
    setIsExpanded(false);
    
    // Add slight delay for better animation
    setTimeout(() => {
      navigate(action.path);
    }, 150);
  };

  // Filter actions based on user role (you'll need to get user from context)
  const filteredActions = actions; // For now, show all actions

  // Mouse event listeners for desktop drag support
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <div 
          className="fab-backdrop"
          onClick={() => setIsExpanded(false)}
        />
      )}
      
      {/* Action Buttons */}
      {isExpanded && (
        <div className="fab-actions" style={{ 
          left: position.x, 
          top: position.y - (filteredActions.length * 64) - 16
        }}>
          {filteredActions.map((action, index) => (
            <TouchRipple
              key={action.id}
              className="fab-action"
              style={{
                backgroundColor: action.color,
                animationDelay: `${index * 50}ms`
              }}
              onClick={() => handleActionClick(action)}
            >
              <i className={action.icon} />
              <span className="fab-action-label">{action.label}</span>
            </TouchRipple>
          ))}
        </div>
      )}
      
      {/* Main FAB Button */}
      <TouchRipple
        ref={fabRef}
        className={`floating-action-button ${isDragging ? 'dragging' : ''} ${isExpanded ? 'expanded' : ''} ${className}`}
        style={{
          left: position.x,
          top: position.y,
          ...style
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        color="rgba(0, 122, 255, 0.3)"
      >
        <i className={`fas ${isExpanded ? 'fa-times' : 'fa-plus'} fab-icon`} />
      </TouchRipple>
    </>
  );
};

export default FloatingActionButton;