import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import TouchRipple from '../shared/TouchRipple';
import './BottomNav.css';

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    {
      path: '/dashboard',
      icon: <i className="fas fa-home"></i>,
      label: 'Home',
      activePattern: /^\/dashboard/
    },
    {
      path: '/schedules',
      icon: <i className="fas fa-calendar-alt"></i>,
      label: 'Schedule',
      activePattern: /^\/schedules/
    },
    {
      path: '/employees',
      icon: <i className="fas fa-users"></i>,
      label: 'Team',
      activePattern: /^\/employees/
    },
    {
      path: '/leave-requests',
      icon: <i className="fas fa-plane-departure"></i>,
      label: 'Leave',
      activePattern: /^\/leave-requests/
    },
    {
      path: '/profile',
      icon: <i className="fas fa-user"></i>,
      label: 'Profile',
      activePattern: /^\/profile/
    }
  ];

  const isActive = (pattern) => {
    return pattern.test(location.pathname);
  };

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <TouchRipple
          key={item.path}
          className={`bottom-nav-item ${isActive(item.activePattern) ? 'active' : ''}`}
          color={isActive(item.activePattern) ? 'rgba(0, 122, 255, 0.3)' : 'rgba(142, 142, 147, 0.2)'}
        >
          <Link
            to={item.path}
            className="bottom-nav-link"
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        </TouchRipple>
      ))}
    </nav>
  );
};

export default BottomNav;