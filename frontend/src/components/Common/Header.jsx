import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import HamburgerMenu from './HamburgerMenu';
import './Header.css';

const Header = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const { t, currentLanguage, changeLanguage } = useLanguage();
  const { pendingLeaveCount } = useNotification();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeClass = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'role-admin';
      case 'manager': return 'role-manager';
      case 'employee': return 'role-employee';
      default: return 'role-default';
    }
  };

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <button 
            className="hamburger-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
          
          <div className="logo-section">
            <h1 className="app-title">{t('header.appTitle')}</h1>
            <span className="app-subtitle">{t('header.dashboard')}</span>
          </div>
        </div>

      <div className="header-right">
        <div className="header-actions">
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <button 
              className="notification-btn" 
              aria-label={t('header.notifications')}
              onClick={() => navigate('/leave-requests')}
              title={`${pendingLeaveCount} pending leave requests`}
            >
              <span className="notification-icon"><i className="fas fa-bell"></i></span>
              {pendingLeaveCount > 0 && (
                <span className="notification-badge">{pendingLeaveCount > 99 ? '99+' : pendingLeaveCount}</span>
              )}
            </button>
          )}

          <button 
            className="language-toggle-btn" 
            onClick={() => changeLanguage(currentLanguage === 'ko' ? 'en' : 'ko')}
            aria-label={t('language.selectLanguage')}
          >
            <span className="language-icon"><i className="fas fa-globe"></i></span>
            <span className="language-text">
              {currentLanguage === 'ko' ? 'EN' : '한'}
            </span>
          </button>
        </div>

        <div className="user-menu">
          <button 
            className="user-button"
            onClick={toggleDropdown}
            aria-label={t('header.userMenu')}
          >
            <div className="user-avatar">
              {getInitials(user?.name)}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className={`user-role ${getRoleBadgeClass(user?.role)}`}>
                {user?.role?.toUpperCase() || 'USER'}
              </span>
            </div>
            <span className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`}>
              <i className="fas fa-chevron-down"></i>
            </span>
          </button>

          {dropdownOpen && (
            <div className="user-dropdown">
              <div className="dropdown-header">
                <div className="user-avatar large">
                  {getInitials(user?.name)}
                </div>
                <div className="dropdown-user-info">
                  <span className="dropdown-user-name">{user?.name || 'User'}</span>
                  <span className="dropdown-user-email">{user?.email || 'user@example.com'}</span>
                  <span className={`dropdown-user-role ${getRoleBadgeClass(user?.role)}`}>
                    {user?.role?.toUpperCase() || 'USER'}
                  </span>
                </div>
              </div>

              <div className="dropdown-divider"></div>

              <div className="dropdown-menu">
                <button 
                  className="dropdown-item"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/profile');
                  }}
                >
                  <span className="dropdown-icon"><i className="fas fa-user"></i></span>
                  {t('header.myProfile')}
                </button>
                
                <button 
                  className="dropdown-item"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/settings');
                  }}
                >
                  <span className="dropdown-icon"><i className="fas fa-cog"></i></span>
                  {t('header.settings')}
                </button>
                
                <button 
                  className="dropdown-item"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/help');
                  }}
                >
                  <span className="dropdown-icon"><i className="fas fa-question-circle"></i></span>
                  {t('header.helpSupport')}
                </button>

                <div className="dropdown-divider"></div>

                <button 
                  className="dropdown-item logout-item"
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                >
                  <span className="dropdown-icon"><i className="fas fa-sign-out-alt"></i></span>
                  {t('header.logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay for mobile dropdown */}
      {dropdownOpen && (
        <div 
          className="dropdown-overlay"
          onClick={() => setDropdownOpen(false)}
        ></div>
      )}
      </header>
      
      <HamburgerMenu 
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
    </>
  );
};

export default Header;