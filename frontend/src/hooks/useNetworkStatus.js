import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to monitor network connectivity status
 * Returns online status and provides toast notifications for connection changes
 */
const useNetworkStatus = (options = {}) => {
  const {
    showToast = true,
    toastDuration = 3000,
    onOnline = null,
    onOffline = null,
    pingUrl = '/api/health',
    pingInterval = 30000, // 30 seconds
    enablePing = false
  } = options;

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isConnected, setIsConnected] = useState(navigator.onLine);
  const [lastOnlineTime, setLastOnlineTime] = useState(Date.now());
  const [connectionType, setConnectionType] = useState('unknown');
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  // Toast notification function
  const showNotification = useCallback((message, type = 'info') => {
    if (!showToast) return;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `network-toast network-toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas fa-${type === 'success' ? 'wifi' : 'exclamation-triangle'}"></i>
        <span>${message}</span>
      </div>
    `;
    
    // Add styles
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10001;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
      max-width: 300px;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      animation: slideIn 0.3s ease forwards;
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        to {
          transform: translateX(0);
        }
      }
      @keyframes slideOut {
        to {
          transform: translateX(100%);
        }
      }
      .toast-content {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(toast);

    // Auto remove toast
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      }, 300);
    }, toastDuration);
  }, [showToast, toastDuration]);

  // Get connection information
  const getConnectionInfo = useCallback(() => {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      const type = connection.effectiveType || connection.type || 'unknown';
      const isSlow = ['slow-2g', '2g'].includes(connection.effectiveType);
      
      setConnectionType(type);
      setIsSlowConnection(isSlow);
      
      return {
        type,
        isSlow,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    return { type: 'unknown', isSlow: false };
  }, []);

  // Ping server to verify actual connectivity
  const pingServer = useCallback(async () => {
    if (!enablePing) return true;
    
    try {
      const response = await fetch(pingUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        timeout: 5000
      });
      return true;
    } catch (error) {
      console.warn('Network ping failed:', error);
      return false;
    }
  }, [pingUrl, enablePing]);

  // Handle online event
  const handleOnline = useCallback(async () => {
    setIsOnline(true);
    
    // Verify actual connectivity if ping is enabled
    if (enablePing) {
      const canReachServer = await pingServer();
      setIsConnected(canReachServer);
      
      if (canReachServer) {
        setLastOnlineTime(Date.now());
        showNotification('Connection restored', 'success');
        onOnline && onOnline();
      }
    } else {
      setIsConnected(true);
      setLastOnlineTime(Date.now());
      showNotification('Connection restored', 'success');
      onOnline && onOnline();
    }
    
    // Update connection info
    getConnectionInfo();
  }, [enablePing, pingServer, showNotification, onOnline, getConnectionInfo]);

  // Handle offline event
  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setIsConnected(false);
    showNotification('Connection lost', 'error');
    onOffline && onOffline();
  }, [showNotification, onOffline]);

  // Handle connection change
  const handleConnectionChange = useCallback(() => {
    const connectionInfo = getConnectionInfo();
    
    if (connectionInfo.isSlow) {
      showNotification('Slow connection detected', 'warning');
    }
  }, [getConnectionInfo, showNotification]);

  // Setup event listeners
  useEffect(() => {
    // Browser online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Connection change events (if supported)
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', handleConnectionChange);
    }

    // Initial connection info
    getConnectionInfo();

    // Setup periodic ping if enabled
    let pingInterval_id;
    if (enablePing && isOnline) {
      pingInterval_id = setInterval(async () => {
        const canReachServer = await pingServer();
        if (canReachServer !== isConnected) {
          setIsConnected(canReachServer);
          if (canReachServer) {
            setLastOnlineTime(Date.now());
            showNotification('Connection restored', 'success');
            onOnline && onOnline();
          } else {
            showNotification('Server unreachable', 'error');
            onOffline && onOffline();
          }
        }
      }, pingInterval);
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', handleConnectionChange);
      }
      
      if (pingInterval_id) {
        clearInterval(pingInterval_id);
      }
    };
  }, [
    handleOnline, 
    handleOffline, 
    handleConnectionChange, 
    getConnectionInfo, 
    enablePing, 
    isOnline, 
    isConnected,
    pingServer,
    pingInterval,
    showNotification,
    onOnline,
    onOffline
  ]);

  // Manual network check
  const checkConnection = useCallback(async () => {
    if (enablePing) {
      const canReachServer = await pingServer();
      setIsConnected(canReachServer);
      return canReachServer;
    }
    return navigator.onLine;
  }, [enablePing, pingServer]);

  // Get offline duration
  const getOfflineDuration = useCallback(() => {
    if (isConnected) return 0;
    return Date.now() - lastOnlineTime;
  }, [isConnected, lastOnlineTime]);

  return {
    isOnline,
    isConnected,
    connectionType,
    isSlowConnection,
    lastOnlineTime,
    checkConnection,
    getOfflineDuration,
    connectionInfo: {
      type: connectionType,
      isSlow: isSlowConnection
    }
  };
};

export default useNetworkStatus;