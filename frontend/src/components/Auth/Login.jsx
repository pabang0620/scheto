import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { login } from '../../services/api';
import TouchRipple from '../shared/TouchRipple';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    general: ''
  });
  const [focusedField, setFocusedField] = useState('');
  const [shake, setShake] = useState(false);
  
  const { login: authLogin } = useContext(AuthContext);
  const { t } = useLanguage();
  const navigate = useNavigate();

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error for this field when user starts typing
    setErrors({
      ...errors,
      [name]: '',
      general: ''
    });
  };

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
      general: ''
    };

    if (!formData.email) {
      newErrors.email = t('auth.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('auth.invalidEmailFormat');
    }

    if (!formData.password) {
      newErrors.password = t('auth.passwordRequired');
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (!validateForm()) {
      triggerShake();
      return;
    }

    setLoading(true);
    setErrors({ email: '', password: '', general: '' });

    try {
      const response = await login(formData);
      console.log('로그인 응답:', response.data);
      
      const { token, user } = response.data;
      
      // AuthContext 업데이트 (isAuthenticated도 함께 업데이트됨)
      authLogin(user, token);
      
      console.log('로그인 성공, 대시보드로 이동');
      
      // 약간의 지연 후 리다이렉션 (상태 업데이트를 위해)
      setTimeout(() => {
        navigate('/dashboard');
      }, 100);
    } catch (err) {
      console.error('로그인 실패:', err);
      
      const errorData = err.response?.data;
      
      if (errorData) {
        // Handle specific field errors
        if (errorData.field === 'email') {
          setErrors({
            ...errors,
            email: errorData.message
          });
        } else if (errorData.field === 'password') {
          setErrors({
            ...errors,
            password: errorData.message
          });
        } else if (errorData.errors) {
          // Handle validation errors
          const newErrors = { email: '', password: '', general: '' };
          errorData.errors.forEach(error => {
            if (error.field === 'email') {
              newErrors.email = error.message;
            } else if (error.field === 'password') {
              newErrors.password = error.message;
            }
          });
          setErrors(newErrors);
        } else {
          // General error
          setErrors({
            ...errors,
            general: errorData.message || t('auth.loginFailed')
          });
          triggerShake();
        }
      } else {
        // Network or other error
        setErrors({
          ...errors,
          general: t('auth.networkError')
        });
        triggerShake();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <motion.div 
        className="login-card"
        initial={{ scale: 0.9, opacity: 0, y: 50 }}
        animate={{ 
          scale: 1, 
          opacity: 1, 
          y: 0,
          x: shake ? [-10, 10, -10, 10, 0] : 0
        }}
        transition={{ 
          type: "spring", 
          stiffness: 200, 
          damping: 20,
          x: { duration: 0.5 }
        }}
      >
        <motion.div 
          className="login-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.h2
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
          >
            {t('header.appTitle')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {t('auth.signInToAccount')}
          </motion.p>
        </motion.div>
        
        <motion.form 
          onSubmit={handleSubmit} 
          className="login-form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <AnimatePresence>
            {errors.general && (
              <motion.div 
                className="error-message general-error"
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                {errors.general}
              </motion.div>
            )}
          </AnimatePresence>
          
          <motion.div 
            className={`form-group ${errors.email ? 'has-error' : ''}`}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <motion.label 
              htmlFor="email"
              animate={{ 
                color: focusedField === 'email' ? '#4667de' : '#6b7280',
                scale: focusedField === 'email' ? 1.05 : 1
              }}
              transition={{ duration: 0.2 }}
            >
              <motion.i 
                className="fas fa-envelope"
                animate={{ rotate: focusedField === 'email' ? 5 : 0 }}
              ></motion.i>
              {t('auth.email')}
            </motion.label>
            <motion.input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField('')}
              placeholder={t('auth.enterEmail')}
              className={errors.email ? 'error' : ''}
              whileFocus={{ scale: 1.02 }}
              animate={{
                borderColor: errors.email ? '#ef4444' : 
                           focusedField === 'email' ? '#4667de' : '#d1d5db'
              }}
            />
            <AnimatePresence>
              {errors.email && (
                <motion.div 
                  className="field-error"
                  initial={{ opacity: 0, height: 0, y: -5 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  {errors.email}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
          <motion.div 
            className={`form-group ${errors.password ? 'has-error' : ''}`}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.label 
              htmlFor="password"
              animate={{ 
                color: focusedField === 'password' ? '#4667de' : '#6b7280',
                scale: focusedField === 'password' ? 1.05 : 1
              }}
              transition={{ duration: 0.2 }}
            >
              <motion.i 
                className="fas fa-lock"
                animate={{ rotate: focusedField === 'password' ? 5 : 0 }}
              ></motion.i>
              {t('auth.password')}
            </motion.label>
            <motion.input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField('')}
              placeholder={t('auth.enterPassword')}
              className={errors.password ? 'error' : ''}
              whileFocus={{ scale: 1.02 }}
              animate={{
                borderColor: errors.password ? '#ef4444' : 
                           focusedField === 'password' ? '#4667de' : '#d1d5db'
              }}
            />
            <AnimatePresence>
              {errors.password && (
                <motion.div 
                  className="field-error"
                  initial={{ opacity: 0, height: 0, y: -5 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  {errors.password}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
          <TouchRipple
            className="login-button-wrapper"
            disabled={loading}
            color="rgba(255, 255, 255, 0.3)"
          >
            <motion.button 
              type="submit" 
              className="login-button"
              disabled={loading}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
            {loading ? (
              <>
                <div className="spinner-inline"></div>
                {t('auth.signingIn')}
              </>
            ) : (
              <>
                <motion.i 
                  className="fas fa-sign-in-alt"
                  whileHover={{ x: 5 }}
                ></motion.i>
                {t('auth.signIn')}
              </>
            )}
            </motion.button>
          </TouchRipple>

          {/* Development Team Quick Login Buttons */}
          <motion.div 
            className="dev-login-buttons"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
              <motion.div 
                className="dev-login-title"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8 }}
              >
                <i className="fas fa-tools"></i>
                개발팀 빠른 로그인
              </motion.div>
              <motion.div 
                className="dev-button-group"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1,
                      delayChildren: 0.9
                    }
                  }
                }}
              >
                {[
                  { role: 'admin', email: 'admin@example.com', icon: 'fa-user-shield', label: 'Admin' },
                  { role: 'manager', email: 'manager@example.com', icon: 'fa-user-tie', label: 'Manager' },
                  { role: 'employee', email: 'employee@example.com', icon: 'fa-user', label: 'Employee' }
                ].map((item) => (
                  <motion.button
                    key={item.role}
                    type="button"
                    className={`dev-login-btn ${item.role}`}
                    onClick={() => {
                      setFormData({ email: item.email, password: 'password123' });
                      setTimeout(() => document.querySelector('.login-button').click(), 100);
                    }}
                    variants={{
                      hidden: { y: 20, opacity: 0, scale: 0.9 },
                      visible: { y: 0, opacity: 1, scale: 1 }
                    }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <i className={`fas ${item.icon}`}></i>
                    {item.label}
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
        </motion.form>
        
        <motion.div 
          className="login-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <p>
            {t('auth.dontHaveAccount')} 
            <TouchRipple
              className="link-button-wrapper"
              color="rgba(70, 103, 222, 0.2)"
            >
              <motion.button 
                type="button" 
                className="link-button"
                onClick={() => navigate('/register')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {t('auth.registerHere')}
              </motion.button>
            </TouchRipple>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;