import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

const RoleRoute = ({ children, requiredRole }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // 역할 검증
  if (requiredRole) {
    const roleHierarchy = {
      'employee': 1,
      'manager': 2,
      'admin': 3
    };
    
    const userLevel = roleHierarchy[user.role?.toLowerCase()] || 0;
    const requiredLevel = roleHierarchy[requiredRole.toLowerCase()] || 0;
    
    if (userLevel < requiredLevel) {
      return <Navigate to="/dashboard" />;
    }
  }

  return children;
};

export default RoleRoute;