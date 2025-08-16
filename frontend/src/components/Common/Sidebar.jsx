import React, { useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import './Sidebar.css';

const Sidebar = () => {
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();
  const location = useLocation();

  const menuItems = [
    {
      path: '/dashboard',
      icon: <i className="fas fa-chart-bar"></i>,
      label: t('sidebar.dashboard'),
      roles: ['admin', 'manager', 'employee']
    },
    {
      path: '/schedules',
      icon: <i className="fas fa-calendar-alt"></i>,
      label: t('sidebar.scheduleCalendar'),
      roles: ['admin', 'manager', 'employee']
    },
    {
      path: '/schedules/auto-generate',
      icon: <i className="fas fa-robot"></i>,
      label: t('sidebar.autoGenerate'),
      roles: ['admin', 'manager']
    },
    {
      path: '/employees',
      icon: <i className="fas fa-users"></i>,
      label: t('sidebar.employees'),
      roles: ['admin', 'manager']
    },
    {
      path: '/leave-requests',
      icon: <i className="fas fa-plane-departure"></i>,
      label: t('sidebar.leaveRequests'),
      roles: ['admin', 'manager', 'employee']
    },
    {
      path: '/reports',
      icon: <i className="fas fa-chart-line"></i>,
      label: t('sidebar.reports'),
      roles: ['admin', 'manager']
    },
    {
      path: '/settings',
      icon: <i className="fas fa-cog"></i>,
      label: t('sidebar.settings'),
      roles: ['admin']
    }
  ];


  const hasAccess = (roles) => {
    if (!user?.role) return false;
    return roles.includes(user.role.toLowerCase());
  };

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
      <aside className="sidebar">
        <div className="sidebar-content">
          {/* Sidebar Header */}
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <span className="logo-icon"><i className="fas fa-calendar-alt"></i></span>
              <span className="logo-text">{t('sidebar.scheduleManager')}</span>
            </div>
          </div>

          {/* User Info */}
          <div className="sidebar-user">
            <div className="user-avatar-sidebar">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="user-details">
              <span className="user-name-sidebar">{user?.name || 'User'}</span>
              <span className="user-role-sidebar">{user?.role?.toUpperCase() || 'USER'}</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="sidebar-nav">
            <div className="nav-section">
              <h3 className="nav-section-title">{t('sidebar.mainMenu')}</h3>
              <ul className="nav-list">
                {menuItems
                  .filter(item => hasAccess(item.roles))
                  .map((item) => (
                    <li key={item.path} className="nav-item">
                      <NavLink
                        to={item.path}
                        className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                      >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                      </NavLink>
                    </li>
                  ))}
              </ul>
            </div>

          </nav>

        </div>
      </aside>
  );
};

export default Sidebar;