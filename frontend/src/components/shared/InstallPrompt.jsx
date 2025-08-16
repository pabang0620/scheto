import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './InstallPrompt.css';

const InstallPrompt = ({
  position = 'bottom',
  autoShowDelay = 3000,
  dismissible = true,
  showAfterVisits = 2,
  hideAfterDismiss = 7, // days
  customMessage = null,
  onInstall = null,
  onDismiss = null
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [visitCount, setVisitCount] = useState(0);

  // Storage keys
  const STORAGE_KEYS = {
    dismissed: 'pwa-install-dismissed',
    visits: 'pwa-visit-count',
    lastDismissed: 'pwa-last-dismissed'
  };

  // Check if device is iOS
  const checkIsIOS = useCallback(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
  }, []);

  // Check if app is in standalone mode
  const checkIsStandalone = useCallback(() => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  }, []);

  // Get stored data
  const getStoredData = useCallback(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEYS.dismissed) === 'true';
      const visits = parseInt(localStorage.getItem(STORAGE_KEYS.visits) || '0', 10);
      const lastDismissed = localStorage.getItem(STORAGE_KEYS.lastDismissed);
      
      return { dismissed, visits, lastDismissed };
    } catch (error) {
      console.warn('Error reading PWA install data from localStorage:', error);
      return { dismissed: false, visits: 0, lastDismissed: null };
    }
  }, [STORAGE_KEYS]);

  // Update visit count
  const updateVisitCount = useCallback(() => {
    try {
      const currentCount = parseInt(localStorage.getItem(STORAGE_KEYS.visits) || '0', 10);
      const newCount = currentCount + 1;
      localStorage.setItem(STORAGE_KEYS.visits, newCount.toString());
      setVisitCount(newCount);
      return newCount;
    } catch (error) {
      console.warn('Error updating visit count:', error);
      return 0;
    }
  }, [STORAGE_KEYS]);

  // Check if enough time has passed since last dismissal
  const canShowAfterDismissal = useCallback((lastDismissed) => {
    if (!lastDismissed) return true;
    
    const daysSinceDismissal = (Date.now() - parseInt(lastDismissed, 10)) / (1000 * 60 * 60 * 24);
    return daysSinceDismissal >= hideAfterDismiss;
  }, [hideAfterDismiss]);

  // Handle PWA install prompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Initialize component
  useEffect(() => {
    const ios = checkIsIOS();
    const standalone = checkIsStandalone();
    setIsIOS(ios);
    setIsStandalone(standalone);

    // Don't show if already installed
    if (standalone) return;

    const { dismissed, visits, lastDismissed } = getStoredData();
    const newVisitCount = updateVisitCount();

    // Check if we should show the prompt
    const shouldShow = !dismissed && 
                      newVisitCount >= showAfterVisits && 
                      canShowAfterDismissal(lastDismissed) &&
                      (deferredPrompt || ios);

    if (shouldShow) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, autoShowDelay);

      return () => clearTimeout(timer);
    }
  }, [
    checkIsIOS,
    checkIsStandalone,
    getStoredData,
    updateVisitCount,
    canShowAfterDismissal,
    showAfterVisits,
    autoShowDelay,
    deferredPrompt
  ]);

  // Handle install button click
  const handleInstall = useCallback(async () => {
    if (isIOS) {
      // Show iOS instructions
      setShowPrompt(true);
      return;
    }

    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      const result = await deferredPrompt.prompt();
      
      if (result.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setShowPrompt(false);
        onInstall && onInstall();
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error during installation:', error);
    } finally {
      setIsInstalling(false);
    }
  }, [deferredPrompt, isIOS, onInstall]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.dismissed, 'true');
      localStorage.setItem(STORAGE_KEYS.lastDismissed, Date.now().toString());
    } catch (error) {
      console.warn('Error saving dismissal state:', error);
    }
    
    setShowPrompt(false);
    onDismiss && onDismiss();
  }, [STORAGE_KEYS, onDismiss]);

  // Handle "Not now" (temporary dismissal)
  const handleNotNow = useCallback(() => {
    setShowPrompt(false);
  }, []);

  // Get appropriate message
  const getMessage = () => {
    if (customMessage) return customMessage;
    
    if (isIOS) {
      return "Add ScheduleAuto to your home screen for the best experience!";
    }
    
    return "Install ScheduleAuto app for quick access and offline features!";
  };

  // Animation variants
  const promptVariants = {
    bottom: {
      hidden: { y: '100%', opacity: 0 },
      visible: { y: 0, opacity: 1 },
      exit: { y: '100%', opacity: 0 }
    },
    top: {
      hidden: { y: '-100%', opacity: 0 },
      visible: { y: 0, opacity: 1 },
      exit: { y: '-100%', opacity: 0 }
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  // Don't render if already installed or conditions not met
  if (isStandalone || (!deferredPrompt && !isIOS)) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            className="install-prompt-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
            onClick={handleNotNow}
          />

          {/* Install prompt */}
          <motion.div
            className={`install-prompt install-prompt--${position} ${isIOS ? 'install-prompt--ios' : ''}`}
            variants={promptVariants[position]}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            role="dialog"
            aria-labelledby="install-prompt-title"
            aria-describedby="install-prompt-description"
          >
            <div className="install-prompt__content">
              {/* App Icon */}
              <div className="install-prompt__icon">
                <div className="app-icon">
                  <i className="fas fa-calendar-alt"></i>
                </div>
              </div>

              {/* Content */}
              <div className="install-prompt__text">
                <h3 id="install-prompt-title" className="install-prompt__title">
                  {isIOS ? 'Add to Home Screen' : 'Install App'}
                </h3>
                <p id="install-prompt-description" className="install-prompt__message">
                  {getMessage()}
                </p>

                {/* iOS Instructions */}
                {isIOS && (
                  <div className="install-prompt__ios-steps">
                    <div className="ios-step">
                      <i className="fas fa-share"></i>
                      <span>Tap the share button</span>
                    </div>
                    <div className="ios-step">
                      <i className="fas fa-plus"></i>
                      <span>Select "Add to Home Screen"</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="install-prompt__actions">
                {!isIOS && (
                  <motion.button
                    className="install-prompt__install-btn"
                    onClick={handleInstall}
                    disabled={isInstalling}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isInstalling ? (
                      <>
                        <div className="spinner-inline"></div>
                        Installing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-download"></i>
                        Install
                      </>
                    )}
                  </motion.button>
                )}

                <button
                  className="install-prompt__not-now-btn"
                  onClick={handleNotNow}
                >
                  Not now
                </button>

                {dismissible && (
                  <button
                    className="install-prompt__dismiss-btn"
                    onClick={handleDismiss}
                    aria-label="Don't ask again"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Feature highlights */}
            <div className="install-prompt__features">
              <div className="feature">
                <i className="fas fa-bolt"></i>
                <span>Faster loading</span>
              </div>
              <div className="feature">
                <i className="fas fa-wifi-slash"></i>
                <span>Works offline</span>
              </div>
              <div className="feature">
                <i className="fas fa-bell"></i>
                <span>Push notifications</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;