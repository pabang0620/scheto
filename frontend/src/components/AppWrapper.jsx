import React, { useState, useEffect } from 'react';
import SplashScreen from './shared/SplashScreen';
import LoadingScreen from './shared/LoadingScreen';
import OfflineBanner from './shared/OfflineBanner';
import InstallPrompt from './shared/InstallPrompt';
import useNetworkStatus from '../hooks/useNetworkStatus';

/**
 * AppWrapper component that provides native app-like experience
 * Handles splash screen, loading states, offline status, and PWA installation
 */
const AppWrapper = ({ children }) => {
  const [showSplash, setShowSplash] = useState(true);
  const [isAppLoading, setIsAppLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // Network status monitoring
  const { isConnected } = useNetworkStatus({
    showToast: false, // We'll use the OfflineBanner instead
    enablePing: true,
    pingUrl: '/api/health',
    onOnline: () => console.log('App is back online'),
    onOffline: () => console.log('App went offline')
  });

  // Handle splash screen completion
  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Simulate initial app loading after splash
  useEffect(() => {
    if (!showSplash) {
      setIsAppLoading(true);
      setLoadingMessage('Initializing app...');
      
      // Simulate app initialization
      const timer = setTimeout(() => {
        setIsAppLoading(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  // Show splash screen
  if (showSplash) {
    return (
      <SplashScreen 
        onComplete={handleSplashComplete}
        duration={2500}
      />
    );
  }

  // Show loading screen during app initialization
  if (isAppLoading) {
    return (
      <LoadingScreen 
        message={loadingMessage}
      />
    );
  }

  // Main app with mobile features
  return (
    <>
      {/* Main App Content */}
      {children}
      
      {/* Mobile App Features */}
      
      {/* Network Status Banner */}
      <OfflineBanner 
        position="top"
        persistent={false}
        showRetry={true}
        autoHideDelay={3000}
      />
      
      {/* PWA Install Prompt */}
      <InstallPrompt
        position="bottom"
        autoShowDelay={5000}
        dismissible={true}
        showAfterVisits={2}
        hideAfterDismiss={7}
        onInstall={() => {
          console.log('App installed successfully!');
          // You can track this event or show a success message
        }}
        onDismiss={() => {
          console.log('Install prompt dismissed');
        }}
      />
    </>
  );
};

export default AppWrapper;