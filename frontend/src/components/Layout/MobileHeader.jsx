import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import TouchRipple from '../shared/TouchRipple';
import HamburgerMenu from '../Common/HamburgerMenu';
import './MobileHeader.css';

const MobileHeader = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  const { user, logout } = useContext(AuthContext);
  const { t, currentLanguage, changeLanguage } = useLanguage();
  const { pendingLeaveCount } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();


  useEffect(() => {
    // Handle scroll for hiding/showing header
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const difference = Math.abs(currentScrollY - lastScrollY);
      
      // Only hide/show if significant scroll change (> 15px)
      if (difference > 15) {
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          // Scrolling down - hide header
          setIsVisible(false);
          setSearchOpen(false); // Close search when hiding
        } else {
          // Scrolling up - show header
          setIsVisible(true);
        }
        setLastScrollY(currentScrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);


  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return t('navigation.dashboard') || 'Dashboard';
    if (path.startsWith('/schedules')) return t('navigation.schedules') || 'Schedule';
    if (path.startsWith('/employees')) return t('navigation.team') || 'Team';
    if (path.startsWith('/leave-requests')) return t('navigation.leave') || 'Leave';
    if (path.startsWith('/profile')) return t('navigation.profile') || 'Profile';
    if (path.startsWith('/reports')) return t('navigation.reports') || 'Reports';
    if (path.startsWith('/settings')) return t('navigation.settings') || 'Settings';
    return t('header.appTitle') || 'ScheduleAuto';
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Implement search functionality here
      console.log('Searching for:', searchQuery);
      // For now, just navigate to a search results page or filter current view
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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

  return (
    <header className={`mobile-header ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="mobile-header-background" />
      
      <div className="mobile-header-content">
        {!searchOpen ? (
          <>
            {/* Left section */}
            <div className="header-left">
              <TouchRipple
                className="hamburger-button-mobile"
                onClick={() => setMenuOpen(!menuOpen)}
                color="rgba(0, 122, 255, 0.2)"
              >
                <div className="hamburger-icon">
                  <span className="hamburger-line"></span>
                  <span className="hamburger-line"></span>
                  <span className="hamburger-line"></span>
                </div>
              </TouchRipple>
              <h1 className="page-title">{getPageTitle()}</h1>
            </div>
            
            {/* Right section */}
            <div className="header-right">
              {/* Search button */}
              <TouchRipple
                className="header-action-btn"
                onClick={() => setSearchOpen(true)}
                color="rgba(0, 122, 255, 0.2)"
              >
                <i className="fas fa-search" />
              </TouchRipple>
              
              {/* Notifications */}
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <TouchRipple
                  className="header-action-btn notification-btn"
                  onClick={() => navigate('/leave-requests')}
                  color="rgba(255, 59, 48, 0.2)"
                >
                  <i className="fas fa-bell" />
                  {pendingLeaveCount > 0 && (
                    <span className="notification-badge">
                      {pendingLeaveCount > 99 ? '99+' : pendingLeaveCount}
                    </span>
                  )}
                </TouchRipple>
              )}
              
              {/* Language toggle */}
              <TouchRipple
                className="header-action-btn language-btn"
                onClick={() => changeLanguage(currentLanguage === 'ko' ? 'en' : 'ko')}
                color="rgba(142, 142, 147, 0.2)"
              >
                <span className="language-text">
                  {currentLanguage === 'ko' ? 'EN' : '한'}
                </span>
              </TouchRipple>
              
              {/* User avatar */}
              <TouchRipple
                className="header-action-btn user-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                color="rgba(0, 122, 255, 0.2)"
              >
                <div className="user-avatar-mobile">
                  {getInitials(user?.name)}
                </div>
              </TouchRipple>
            </div>
          </>
        ) : (
          /* Search mode */
          <div className="search-container">
            <form onSubmit={handleSearch} className="search-form">
              <TouchRipple
                className="search-back-btn"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery('');
                }}
                color="rgba(142, 142, 147, 0.2)"
              >
                <i className="fas fa-arrow-left" />
              </TouchRipple>
              
              <input
                type="text"
                className="search-input"
                placeholder={t('header.searchPlaceholder') || 'Search...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              
              {searchQuery && (
                <TouchRipple
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  color="rgba(142, 142, 147, 0.2)"
                >
                  <i className="fas fa-times" />
                </TouchRipple>
              )}
            </form>
          </div>
        )}
      </div>
      
      {/* User dropdown menu */}
      {showNotifications && (
        <>
          <div 
            className="mobile-dropdown-overlay"
            onClick={() => setShowNotifications(false)}
          />
          <div className="mobile-user-dropdown">
            <div className="dropdown-header">
              <div className="user-avatar-large">
                {getInitials(user?.name)}
              </div>
              <div className="user-info">
                <span className="user-name">{user?.name || 'User'}</span>
                <span className="user-email">{user?.email || 'user@example.com'}</span>
                <span className="user-role">{user?.role?.toUpperCase() || 'USER'}</span>
              </div>
            </div>
            
            <div className="dropdown-divider" />
            
            <div className="dropdown-actions">
              <TouchRipple
                className="dropdown-action"
                onClick={() => {
                  setShowNotifications(false);
                  navigate('/profile');
                }}
                color="rgba(142, 142, 147, 0.1)"
              >
                <i className="fas fa-user" />
                <span>{t('header.myProfile') || 'My Profile'}</span>
              </TouchRipple>
              
              <TouchRipple
                className="dropdown-action"
                onClick={() => {
                  setShowNotifications(false);
                  navigate('/settings');
                }}
                color="rgba(142, 142, 147, 0.1)"
              >
                <i className="fas fa-cog" />
                <span>{t('header.settings') || 'Settings'}</span>
              </TouchRipple>
              
              <TouchRipple
                className="dropdown-action"
                onClick={() => {
                  setShowNotifications(false);
                  navigate('/help');
                }}
                color="rgba(142, 142, 147, 0.1)"
              >
                <i className="fas fa-question-circle" />
                <span>{t('header.helpSupport') || 'Help & Support'}</span>
              </TouchRipple>
              
              <div className="dropdown-divider" />
              
              <TouchRipple
                className="dropdown-action logout-action"
                onClick={() => {
                  setShowNotifications(false);
                  handleLogout();
                }}
                color="rgba(255, 59, 48, 0.1)"
              >
                <i className="fas fa-sign-out-alt" />
                <span>{t('header.logout') || 'Logout'}</span>
              </TouchRipple>
            </div>
          </div>
        </>
      )}
      
      {/* Safe area spacer */}
      <div className="header-safe-area" />
      
      <HamburgerMenu 
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
    </header>
  );
};

export default MobileHeader;