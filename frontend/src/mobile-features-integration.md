# Mobile App Features Integration Guide

This guide explains how to integrate the new mobile app features into your ScheduleAuto application for a complete native app experience.

## Features Added

1. **SplashScreen** - Animated app logo on first load
2. **LoadingScreen** - Full-screen loading with spinner 
3. **OfflineBanner** - Network status indicator with retry functionality
4. **InstallPrompt** - PWA installation prompt for mobile devices
5. **NetworkStatus Hook** - Monitor online/offline status
6. **PWA Manifest** - Complete Progressive Web App configuration
7. **Service Worker** - Offline functionality and caching

## Integration Steps

### 1. Update App.jsx to use AppWrapper

```jsx
// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import AppWrapper from './components/AppWrapper'; // Import the new wrapper
// ... other imports

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppWrapper>
          <AppContent />
        </AppWrapper>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
```

### 2. Register Service Worker

Add this to your `src/main.jsx`:

```jsx
// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register service worker for PWA functionality
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
```

### 3. Add Loading Screen Usage

You can use the LoadingScreen component anywhere in your app:

```jsx
import LoadingScreen from './components/shared/LoadingScreen';

// Show loading screen during data fetching
const [isLoading, setIsLoading] = useState(true);

if (isLoading) {
  return <LoadingScreen message="Loading schedules..." />;
}
```

### 4. Use Network Status Hook

```jsx
import useNetworkStatus from '../hooks/useNetworkStatus';

const MyComponent = () => {
  const { 
    isOnline, 
    isConnected, 
    connectionType, 
    isSlowConnection 
  } = useNetworkStatus({
    showToast: true,
    onOffline: () => console.log('Connection lost'),
    onOnline: () => console.log('Connection restored')
  });

  return (
    <div>
      <p>Status: {isConnected ? 'Online' : 'Offline'}</p>
      {isSlowConnection && <p>Slow connection detected</p>}
    </div>
  );
};
```

### 5. Individual Component Usage

#### OfflineBanner
```jsx
import OfflineBanner from './components/shared/OfflineBanner';

// Add anywhere in your app layout
<OfflineBanner 
  position="top" 
  showRetry={true}
  autoHideDelay={5000}
/>
```

#### InstallPrompt
```jsx
import InstallPrompt from './components/shared/InstallPrompt';

// Add to main app layout
<InstallPrompt
  position="bottom"
  showAfterVisits={2}
  onInstall={() => console.log('App installed!')}
/>
```

#### SplashScreen
```jsx
import SplashScreen from './components/shared/SplashScreen';

const [showSplash, setShowSplash] = useState(true);

if (showSplash) {
  return (
    <SplashScreen 
      onComplete={() => setShowSplash(false)}
      duration={3000}
    />
  );
}
```

## Required Assets

Create these directories and add appropriate icons:

```
public/
├── images/
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   ├── icon-512x512.png
│   ├── splash-640x1136.png
│   ├── splash-750x1334.png
│   ├── splash-1125x2436.png
│   ├── splash-1242x2208.png
│   ├── splash-1536x2048.png
│   ├── splash-1668x2388.png
│   ├── splash-2048x2732.png
│   ├── og-image.png
│   └── twitter-card.png
├── manifest.json
├── sw.js
└── offline.html
```

## Configuration Options

### SplashScreen Props
- `onComplete`: Function called when splash finishes
- `duration`: Display duration in milliseconds (default: 2000)

### LoadingScreen Props  
- `message`: Loading message text

### OfflineBanner Props
- `position`: 'top' or 'bottom'
- `persistent`: Keep showing until manually dismissed
- `showRetry`: Show retry button
- `autoHideDelay`: Auto-hide delay in ms

### InstallPrompt Props
- `position`: 'top' or 'bottom' 
- `autoShowDelay`: Delay before showing prompt
- `showAfterVisits`: Number of visits before showing
- `dismissible`: Allow permanent dismissal
- `hideAfterDismiss`: Days to hide after dismissal

### useNetworkStatus Options
- `showToast`: Show toast notifications
- `enablePing`: Enable server ping for connectivity check
- `pingUrl`: URL to ping for connectivity
- `onOnline/onOffline`: Callback functions

## Best Practices

1. **Performance**: Use lazy loading for components not immediately needed
2. **Accessibility**: All components include proper ARIA labels and keyboard navigation
3. **Mobile First**: Components are optimized for mobile devices first
4. **Battery Life**: Animations respect `prefers-reduced-motion`
5. **Data Usage**: Network status helps users understand connection costs

## Testing PWA Features

1. **Install Prompt**: Test on mobile browsers (Chrome, Safari)
2. **Offline Mode**: Use DevTools Network tab to simulate offline
3. **Service Worker**: Check Application tab in DevTools
4. **Manifest**: Use Lighthouse audit for PWA compliance

## Customization

All components use CSS custom properties for theming:

```css
:root {
  --color-primary: #667eea;
  --color-background: #ffffff;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
}
```

Components automatically adapt to dark mode using `prefers-color-scheme`.

## Browser Support

- Chrome 67+ (full PWA support)
- Safari 11.1+ (limited PWA support)
- Firefox 62+ (limited PWA support)
- Edge 44+ (full PWA support)

## Next Steps

1. Generate app icons using a tool like PWA Asset Generator
2. Configure push notifications server-side
3. Implement background sync for offline data
4. Add app shortcuts and file handling
5. Test installation flow on various devices

The mobile features are now ready to provide a native app-like experience for your ScheduleAuto application!