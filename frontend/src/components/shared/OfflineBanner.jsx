import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useNetworkStatus from '../../hooks/useNetworkStatus';
import './OfflineBanner.css';

const OfflineBanner = ({ 
  position = 'top',
  persistent = false,
  showRetry = true,
  autoHideDelay = 5000,
  className = '',
  customMessage = null
}) => {
  const { isConnected, isSlowConnection, connectionType, checkConnection } = useNetworkStatus({
    showToast: false // Disable toast since we're showing banner
  });
  
  const [isVisible, setIsVisible] = useState(!isConnected);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hideTimer, setHideTimer] = useState(null);

  // Show/hide banner based on connection status
  useEffect(() => {
    if (!isConnected) {
      setIsVisible(true);
      // Clear any existing hide timer
      if (hideTimer) {
        clearTimeout(hideTimer);
        setHideTimer(null);
      }
    } else {
      // If back online and not persistent, auto-hide after delay
      if (!persistent && autoHideDelay > 0) {
        const timer = setTimeout(() => {
          setIsVisible(false);
        }, autoHideDelay);
        setHideTimer(timer);
      } else if (!persistent) {
        setIsVisible(false);
      }
      // Reset retry count when back online
      setRetryCount(0);
    }

    return () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, [isConnected, persistent, autoHideDelay, hideTimer]);

  // Handle retry connection
  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await checkConnection();
      // Add a small delay to show the retry animation
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.warn('Retry connection failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  // Handle manual dismiss
  const handleDismiss = () => {
    setIsVisible(false);
  };

  // Get banner message
  const getBannerMessage = () => {
    if (customMessage) return customMessage;
    
    if (!isConnected) {
      return "You're currently offline. Some features may not work properly.";
    }
    
    if (isSlowConnection) {
      return `Slow ${connectionType} connection detected. App may load slowly.`;
    }
    
    return "Connection restored!";
  };

  // Get banner type
  const getBannerType = () => {
    if (!isConnected) return 'offline';
    if (isSlowConnection) return 'slow';
    return 'online';
  };

  // Animation variants
  const bannerVariants = {
    top: {
      hidden: { y: '-100%', opacity: 0 },
      visible: { y: 0, opacity: 1 },
      exit: { y: '-100%', opacity: 0 }
    },
    bottom: {
      hidden: { y: '100%', opacity: 0 },
      visible: { y: 0, opacity: 1 },
      exit: { y: '100%', opacity: 0 }
    }
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: { scale: 1, rotate: 0 },
    exit: { scale: 0, rotate: 180 }
  };

  const retryVariants = {
    idle: { rotate: 0 },
    spinning: { rotate: 360 }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`offline-banner offline-banner--${position} offline-banner--${getBannerType()} ${className}`}
          variants={bannerVariants[position]}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
            duration: 0.3
          }}
          role="alert"
          aria-live="polite"
        >
          <div className="offline-banner__content">
            {/* Status Icon */}
            <motion.div
              className="offline-banner__icon"
              variants={iconVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <i className={`fas fa-${
                !isConnected ? 'wifi-slash' : 
                isSlowConnection ? 'signal' : 
                'check-circle'
              }`} />
            </motion.div>

            {/* Message */}
            <div className="offline-banner__message">
              <motion.span
                className="offline-banner__text"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                {getBannerMessage()}
              </motion.span>
              
              {!isConnected && retryCount > 0 && (
                <motion.span
                  className="offline-banner__retry-count"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  Attempt {retryCount}
                </motion.span>
              )}
            </div>

            {/* Actions */}
            <div className="offline-banner__actions">
              {showRetry && !isConnected && (
                <motion.button
                  className="offline-banner__retry-btn"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                >
                  <motion.i
                    className="fas fa-redo"
                    variants={retryVariants}
                    animate={isRetrying ? "spinning" : "idle"}
                    transition={{
                      duration: 1,
                      repeat: isRetrying ? Infinity : 0,
                      ease: "linear"
                    }}
                  />
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </motion.button>
              )}

              {/* Dismiss Button */}
              <motion.button
                className="offline-banner__dismiss-btn"
                onClick={handleDismiss}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.2 }}
                aria-label="Dismiss notification"
              >
                <i className="fas fa-times" />
              </motion.button>
            </div>
          </div>

          {/* Connection Status Bar */}
          <motion.div
            className="offline-banner__status-bar"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ delay: 0.6, duration: 0.8 }}
          />

          {/* Progress indicator for retry */}
          {isRetrying && (
            <motion.div
              className="offline-banner__progress"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, ease: "linear" }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;