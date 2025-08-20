import React, { useContext, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import './HamburgerMenu.css';

const HamburgerMenu = ({ isOpen, onClose }) => {
  const { user, logout } = useContext(AuthContext);
  const { t, currentLanguage, changeLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);

  // 메뉴 아이템 정의
  const menuItems = [
    {
      section: 'main',
      items: [
        { 
          path: '/dashboard', 
          label: 'menu.dashboard', 
          icon: 'fa-solid fa-chart-line',
          roles: ['employee', 'manager', 'admin'] 
        },
        { 
          path: '/employees', 
          label: 'menu.employeeManagement', 
          icon: 'fa-solid fa-users',
          roles: ['manager', 'admin'] 
        },
        { 
          path: '/schedules', 
          label: 'menu.scheduleManagement', 
          icon: 'fa-solid fa-calendar-days',
          roles: ['employee', 'manager', 'admin'] 
        },
        { 
          path: '/schedules/auto-generate', 
          label: 'menu.autoSchedule', 
          icon: 'fa-solid fa-wand-magic-sparkles',
          roles: ['manager', 'admin'] 
        },
        { 
          path: '/leave-requests', 
          label: 'menu.leaveManagement', 
          icon: 'fa-solid fa-umbrella-beach',
          roles: ['employee', 'manager', 'admin'] 
        },
        { 
          path: '/reports', 
          label: 'menu.reports', 
          icon: 'fa-solid fa-chart-column',
          roles: ['manager', 'admin'] 
        },
      ]
    },
    {
      section: 'employee',
      items: [
        { 
          path: '/employees/new', 
          label: 'menu.addEmployee', 
          icon: 'fa-solid fa-user-plus',
          roles: ['manager', 'admin'] 
        },
      ]
    },
    {
      section: 'settings',
      items: [
        { 
          path: '/settings', 
          label: 'menu.companySettings', 
          icon: 'fa-solid fa-building',
          roles: ['admin'] 
        },
        { 
          path: '/notices/manage', 
          label: 'menu.noticeManagement', 
          icon: 'fa-solid fa-bullhorn',
          roles: ['admin'] 
        },
        { 
          path: '/profile', 
          label: 'menu.myProfile', 
          icon: 'fa-solid fa-user',
          roles: ['employee', 'manager', 'admin'] 
        },
      ]
    },
    {
      section: 'other',
      items: [
        { 
          path: '/help', 
          label: 'menu.help', 
          icon: 'fa-solid fa-circle-question',
          roles: ['employee', 'manager', 'admin'] 
        },
      ]
    }
  ];

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // 외부 클릭으로 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        const hamburgerButton = document.querySelector('.hamburger-button');
        if (!hamburgerButton?.contains(e.target)) {
          onClose();
        }
      }
    };
    
    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // 페이지 이동 시 메뉴 닫기
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    onClose();
  };

  const handleLanguageChange = (lang) => {
    changeLanguage(lang);
  };

  const handleMenuItemClick = (path) => {
    navigate(path);
    onClose();
  };

  // 권한 체크
  const hasPermission = (roles) => {
    return roles.includes(user?.role);
  };

  // 역할 표시 텍스트
  const getRoleDisplay = (role) => {
    switch(role) {
      case 'admin': return t('roles.admin');
      case 'manager': return t('roles.manager');
      case 'employee': return t('roles.employee');
      default: return role;
    }
  };

  const menuVariants = {
    closed: {
      x: '-100%',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40
      }
    },
    open: {
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40
      }
    }
  };

  const overlayVariants = {
    closed: {
      opacity: 0,
      transition: {
        duration: 0.3
      }
    },
    open: {
      opacity: 1,
      transition: {
        duration: 0.3
      }
    }
  };

  const itemVariants = {
    closed: {
      x: -20,
      opacity: 0
    },
    open: (i) => ({
      x: 0,
      opacity: 1,
      transition: {
        delay: i * 0.05,
        duration: 0.3
      }
    })
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 오버레이 */}
          <motion.div
            className="hamburger-menu-overlay"
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={onClose}
          />
          
          {/* 메뉴 */}
          <motion.div
            ref={menuRef}
            className="hamburger-menu"
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            {/* 사용자 프로필 섹션 */}
            <div className="hamburger-menu-header">
              <div className="user-profile-section">
                <div className="user-avatar">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <div className="user-name">{user?.name}</div>
                  <div className="user-email">{user?.email}</div>
                  <div className="user-role-badge">
                    {getRoleDisplay(user?.role)}
                  </div>
                </div>
              </div>
              <button className="menu-close-button" onClick={onClose}>
                ✕
              </button>
            </div>

            {/* 메뉴 아이템 */}
            <div className="hamburger-menu-content">
              {menuItems.map((section, sectionIndex) => (
                <div key={section.section} className="menu-section">
                  {section.section !== 'main' && (
                    <div className="menu-section-divider" />
                  )}
                  {section.items.map((item, itemIndex) => {
                    if (!hasPermission(item.roles)) return null;
                    
                    const globalIndex = sectionIndex * 10 + itemIndex;
                    const isActive = location.pathname === item.path;
                    
                    return (
                      <motion.div
                        key={item.path}
                        custom={globalIndex}
                        variants={itemVariants}
                        initial="closed"
                        animate="open"
                        className={`menu-item ${isActive ? 'active' : ''}`}
                        onClick={() => handleMenuItemClick(item.path)}
                      >
                        <i className={`menu-item-icon ${item.icon}`}></i>
                        <span className="menu-item-label">{t(item.label)}</span>
                        {isActive && <span className="menu-item-indicator" />}
                      </motion.div>
                    );
                  })}
                </div>
              ))}

              {/* 언어 선택 */}
              <div className="menu-section">
                <div className="menu-section-divider" />
                <div className="language-selector">
                  <span className="language-label">{t('menu.language')}</span>
                  <div className="language-buttons">
                    <button
                      className={`lang-btn ${currentLanguage === 'ko' ? 'active' : ''}`}
                      onClick={() => handleLanguageChange('ko')}
                    >
                      한국어
                    </button>
                    <button
                      className={`lang-btn ${currentLanguage === 'en' ? 'active' : ''}`}
                      onClick={() => handleLanguageChange('en')}
                    >
                      English
                    </button>
                  </div>
                </div>
              </div>

              {/* 로그아웃 */}
              <div className="menu-section">
                <div className="menu-section-divider" />
                <motion.div
                  className="menu-item logout-item"
                  onClick={handleLogout}
                  whileTap={{ scale: 0.98 }}
                >
                  <i className="menu-item-icon fa-solid fa-right-from-bracket"></i>
                  <span className="menu-item-label">{t('menu.logout')}</span>
                </motion.div>
              </div>
            </div>

            {/* 푸터 */}
            <div className="hamburger-menu-footer">
              <div className="app-version">v1.0.0</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HamburgerMenu;