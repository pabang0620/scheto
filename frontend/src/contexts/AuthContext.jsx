import React, { createContext, useState, useEffect, useContext } from 'react';
import { users } from '../services/api';

export const AuthContext = createContext();

// Hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    console.log('Auth 초기화:', {
      hasToken: !!storedToken,
      hasUser: !!storedUser
    });
    
    if (storedToken && storedUser) {
      // 먼저 저장된 사용자 정보로 빠르게 설정
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setToken(storedToken);
        setIsAuthenticated(true);
        console.log('저장된 사용자 정보 로드:', userData.email);
        
        // 백그라운드에서 토큰 검증 (선택적)
        // 실패해도 즉시 로그아웃하지 않음
        users.getCurrentUser()
          .then(response => {
            console.log('토큰 검증 성공');
            if (response.data) {
              setUser(response.data);
              localStorage.setItem('user', JSON.stringify(response.data));
            }
          })
          .catch(error => {
            console.warn('토큰 검증 실패 (무시됨):', error.message);
            // 토큰이 만료되었을 수 있지만, 일단 유지
            // 실제 API 호출 시 401이 발생하면 그때 처리
          });
      } catch (error) {
        console.error('저장된 사용자 정보 파싱 실패:', error);
        setIsAuthenticated(false);
      }
    } else if (storedToken) {
      // 토큰만 있는 경우 (이전 버전 호환성)
      setToken(storedToken);
      try {
        const response = await users.getCurrentUser();
        console.log('사용자 정보 로드 성공:', response.data);
        setUser(response.data);
        setIsAuthenticated(true);
        // 사용자 정보 저장
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch (error) {
        console.error('토큰 검증 실패:', error.message);
        // 개발 환경에서는 토큰 유지 또는 기본 사용자로 자동 로그인
        if (process.env.NODE_ENV === 'development') {
          console.log('개발 모드: 기본 사용자로 자동 로그인 시도');
          try {
            // 기본 테스트 계정으로 로그인 시도
            const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: 'admin@example.com', password: 'password123' })
            });
            
            if (loginResponse.ok) {
              const loginData = await loginResponse.json();
              console.log('개발 모드 자동 로그인 성공:', loginData.user.email);
              setUser(loginData.user);
              setToken(loginData.token);
              setIsAuthenticated(true);
              localStorage.setItem('token', loginData.token);
              localStorage.setItem('user', JSON.stringify(loginData.user));
            } else {
              console.warn('개발 모드 자동 로그인 실패');
              setIsAuthenticated(false);
            }
          } catch (autoLoginError) {
            console.warn('개발 모드 자동 로그인 오류:', autoLoginError);
            setIsAuthenticated(false);
          }
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    } else {
      // No token found - handle development mode auto-login
      if (process.env.NODE_ENV === 'development') {
        console.log('개발 모드: 토큰 없음, 자동 로그인 시도');
        try {
          const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@example.com', password: 'password123' })
          });
          
          if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('개발 모드 자동 로그인 성공:', loginData.user.email);
            setUser(loginData.user);
            setToken(loginData.token);
            setIsAuthenticated(true);
            localStorage.setItem('token', loginData.token);
            localStorage.setItem('user', JSON.stringify(loginData.user));
          } else {
            console.warn('개발 모드 자동 로그인 실패');
            setIsAuthenticated(false);
          }
        } catch (autoLoginError) {
          console.warn('개발 모드 자동 로그인 오류:', autoLoginError);
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    }
    
    setLoading(false);
  };

  const login = (userData, authToken) => {
    console.log('로그인 처리:', userData.email);
    setUser(userData);
    setToken(authToken);
    setIsAuthenticated(true);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    console.log('로그아웃 처리');
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
  };

  const updateUser = (userData) => {
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const hasRole = (requiredRole) => {
    if (!user?.role) return false;
    
    const roleHierarchy = {
      'employee': 1,
      'manager': 2,
      'admin': 3
    };
    
    const userLevel = roleHierarchy[user.role.toLowerCase()] || 0;
    const requiredLevel = roleHierarchy[requiredRole.toLowerCase()] || 0;
    
    return userLevel >= requiredLevel;
  };

  const hasPermission = (permission) => {
    // 개발 환경에서는 모든 권한 허용
    if (process.env.NODE_ENV === 'development') return true;
    
    if (!user?.permissions || !Array.isArray(user.permissions)) return false;
    return user.permissions.includes(permission);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    setUser,
    setToken,
    hasRole,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};