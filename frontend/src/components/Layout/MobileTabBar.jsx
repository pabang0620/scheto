import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import TouchRipple from '../shared/TouchRipple';
import './MobileTabBar.css';

const MobileTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();
  const { pendingLeaveCount } = useNotification();
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);


  useEffect(() => {
    // Handle scroll for hiding/showing tab bar
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const difference = Math.abs(currentScrollY - lastScrollY);
      
      // Only hide/show if significant scroll change (> 10px)
      if (difference > 10) {
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          // Scrolling down - hide tab bar
          setVisible(false);
        } else {
          // Scrolling up - show tab bar
          setVisible(true);
        }
        setLastScrollY(currentScrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);


  const getTabItems = () => {
    const baseItems = [
      {
        path: '/dashboard',
        icon: 'fas fa-home',
        label: t('navigation.dashboard') || 'Home',
        activePattern: /^\/dashboard/,
        badge: null
      },
      {
        path: '/schedules',
        icon: 'fas fa-calendar-alt',
        label: t('navigation.schedules') || 'Schedule',
        activePattern: /^\/schedules/,
        badge: null
      }
    ];

    // Add team tab for managers/admins
    if (user?.role === 'admin' || user?.role === 'manager') {
      baseItems.push({
        path: '/employees',
        icon: 'fas fa-users',
        label: t('navigation.team') || 'Team',
        activePattern: /^\/employees/,
        badge: null
      });
    }

    // Add leave requests with potential badge
    baseItems.push({
      path: '/leave-requests',
      icon: 'fas fa-plane-departure',
      label: t('navigation.leave') || 'Leave',
      activePattern: /^\/leave-requests/,
      badge: (user?.role === 'admin' || user?.role === 'manager') && pendingLeaveCount > 0 ? pendingLeaveCount : null
    });

    baseItems.push({
      path: '/profile',
      icon: 'fas fa-user',
      label: t('navigation.profile') || 'Profile',
      activePattern: /^\/profile/,
      badge: null
    });

    return baseItems;
  };

  const isActive = (pattern) => {
    return pattern.test(location.pathname);
  };

  const handleTabPress = (path, e) => {
    e.preventDefault();
    
    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    // Navigate with a small delay for better UX
    setTimeout(() => {
      navigate(path);
    }, 100);
  };

  const tabItems = getTabItems();

  return (
    <nav className={`mobile-tab-bar ${visible ? 'visible' : 'hidden'}`}>
      <div className="tab-bar-background" />
      <div className="tab-bar-content">
        {tabItems.map((item, index) => {
          const active = isActive(item.activePattern);
          return (
            <TouchRipple
              key={item.path}
              className={`tab-item ${active ? 'active' : ''}`}
              color={active ? 'rgba(0, 122, 255, 0.3)' : 'rgba(142, 142, 147, 0.2)'}
            >
              <Link
                to={item.path}
                className="tab-link"
                onClick={(e) => handleTabPress(item.path, e)}
                aria-label={item.label}
              >
                <div className="tab-icon-container">
                  <i className={`${item.icon} tab-icon`} />
                  {item.badge && (
                    <span className="tab-badge">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                  {active && <div className="tab-active-indicator" />}
                </div>
                <span className="tab-label">{item.label}</span>
                {active && <div className="tab-active-background" />}
              </Link>
            </TouchRipple>
          );
        })}
      </div>
      
      {/* Safe area spacer for devices with home indicator */}
      <div className="safe-area-spacer" />
    </nav>
  );
};

export default MobileTabBar;