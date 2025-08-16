import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

const PrivateRoute = ({ children, requiredRole = null, requiredPermission = null }) => {
  const { isAuthenticated, user, loading, hasRole, hasPermission } = useContext(AuthContext);
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#6b7280' }}>Loading...</p>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '4rem', opacity: '0.5' }}>🚫</div>
        <h2 style={{ color: '#1f2937', margin: 0 }}>Access Denied</h2>
        <p style={{ color: '#6b7280', margin: 0 }}>
          You don't have permission to access this page.
        </p>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
          Required role: {requiredRole.toUpperCase()}
        </p>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
          Your role: {user?.role?.toUpperCase() || 'UNKNOWN'}
        </p>
        <button
          onClick={() => window.history.back()}
          style={{
            background: '#667eea',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            cursor: 'pointer',
            marginTop: '1rem',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  // Check permission-based access
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '4rem', opacity: '0.5' }}>🚫</div>
        <h2 style={{ color: '#1f2937', margin: 0 }}>Permission Denied</h2>
        <p style={{ color: '#6b7280', margin: 0 }}>
          You don't have the required permission to access this page.
        </p>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
          Required permission: {requiredPermission}
        </p>
        <button
          onClick={() => window.history.back()}
          style={{
            background: '#667eea',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            cursor: 'pointer',
            marginTop: '1rem',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  // Render the protected component
  return children;
};

export default PrivateRoute;