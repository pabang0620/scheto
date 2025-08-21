import React from 'react';
import './ErrorMessage.css';

const ErrorMessage = ({ 
  message, 
  type = 'error', 
  onDismiss = null, 
  onRetry = null,
  dismissible = true 
}) => {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '❌';
    }
  };

  return (
    <div className={`error-message ${type}`}>
      <div className="error-content">
        <span className="error-icon">{getIcon()}</span>
        <span className="error-text">{message}</span>
      </div>
      
      <div className="error-actions">
        {onRetry && (
          <button className="btn btn-sm btn-secondary" onClick={onRetry}>
            다시 시도
          </button>
        )}
        
        {dismissible && onDismiss && (
          <button 
            className="error-dismiss" 
            onClick={onDismiss}
            aria-label="닫기"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;