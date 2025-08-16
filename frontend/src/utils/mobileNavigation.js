// Mobile navigation utilities for native app-like transitions
import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Enhanced navigation with haptic feedback and smooth transitions
 */
export const navigateWithTransition = (navigate, path, options = {}) => {
  const {
    direction = 'forward',
    haptic = true,
    transition = 'slide'
  } = options;

  // Add haptic feedback for mobile devices
  if (haptic && navigator.vibrate) {
    navigator.vibrate(10);
  }

  // Visual feedback - add loading state
  const body = document.body;
  body.classList.add('navigation-loading');

  // Navigate with state for transition direction
  navigate(path, {
    state: { 
      direction,
      transition,
      timestamp: Date.now()
    }
  });

  // Remove loading state after transition
  setTimeout(() => {
    body.classList.remove('navigation-loading');
  }, 300);
};

/**
 * Back navigation with swipe gesture simulation
 */
export const navigateBack = (navigate, options = {}) => {
  navigateWithTransition(navigate, -1, {
    direction: 'back',
    haptic: true,
    ...options
  });
};

/**
 * Enhanced link component with mobile optimizations
 */
export const MobileLink = ({ 
  to, 
  children, 
  className = '', 
  haptic = true,
  transition = 'slide',
  onClick,
  ...props 
}) => {
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.preventDefault();
    
    if (onClick) {
      onClick(e);
    }

    navigateWithTransition(navigate, to, { haptic, transition });
  };

  return (
    <a 
      href={to} 
      className={`mobile-link ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </a>
  );
};

/**
 * Swipe gesture detector for navigation
 */
export class SwipeNavigationDetector {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      threshold: 50,
      maxVerticalDistance: 100,
      onSwipeLeft: null,
      onSwipeRight: null,
      ...options
    };

    this.startX = 0;
    this.startY = 0;
    this.isTracking = false;

    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);

    this.init();
  }

  init() {
    if (this.element) {
      this.element.addEventListener('touchstart', this.handleTouchStart, { passive: true });
      this.element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      this.element.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    }
  }

  handleTouchStart(e) {
    const touch = e.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.isTracking = true;
  }

  handleTouchMove(e) {
    if (!this.isTracking) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - this.startX;
    const deltaY = Math.abs(touch.clientY - this.startY);

    // Cancel if too much vertical movement
    if (deltaY > this.options.maxVerticalDistance) {
      this.isTracking = false;
      return;
    }

    // Prevent default only if we're swiping horizontally
    if (Math.abs(deltaX) > 10) {
      e.preventDefault();
    }
  }

  handleTouchEnd(e) {
    if (!this.isTracking) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this.startX;
    const deltaY = Math.abs(touch.clientY - this.startY);

    this.isTracking = false;

    // Check if it's a valid swipe
    if (Math.abs(deltaX) > this.options.threshold && deltaY < this.options.maxVerticalDistance) {
      if (deltaX > 0 && this.options.onSwipeRight) {
        // Swipe right (usually back)
        this.options.onSwipeRight();
      } else if (deltaX < 0 && this.options.onSwipeLeft) {
        // Swipe left (usually forward)
        this.options.onSwipeLeft();
      }
    }
  }

  destroy() {
    if (this.element) {
      this.element.removeEventListener('touchstart', this.handleTouchStart);
      this.element.removeEventListener('touchmove', this.handleTouchMove);
      this.element.removeEventListener('touchend', this.handleTouchEnd);
    }
  }
}

/**
 * Add mobile-specific styles for navigation loading states
 */
export const addNavigationStyles = () => {
  if (document.getElementById('mobile-nav-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'mobile-nav-styles';
  styles.textContent = `
    /* Mobile navigation loading state */
    .navigation-loading {
      pointer-events: none;
    }

    .navigation-loading::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(
        90deg,
        transparent,
        var(--ios-blue, #007AFF),
        transparent
      );
      animation: navigationProgress 0.3s ease-out;
      z-index: 10000;
    }

    @keyframes navigationProgress {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    /* Mobile link styles */
    .mobile-link {
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      transition: all 0.2s ease;
    }

    .mobile-link:active {
      transform: scale(0.98);
      opacity: 0.8;
    }

    /* Swipe back indicator */
    .swipe-back-active::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: var(--ios-blue, #007AFF);
      z-index: 9999;
      animation: swipeBackIndicator 0.3s ease-out;
    }

    @keyframes swipeBackIndicator {
      0% { 
        opacity: 0;
        transform: scaleY(0);
      }
      50% {
        opacity: 1;
        transform: scaleY(0.5);
      }
      100% { 
        opacity: 1;
        transform: scaleY(1);
      }
    }
  `;
  document.head.appendChild(styles);
};

/**
 * Initialize mobile navigation enhancements
 */
export const initMobileNavigation = () => {
  // Add styles
  addNavigationStyles();

  // Add global swipe navigation if supported
  if ('ontouchstart' in window) {
    const detector = new SwipeNavigationDetector(document.body, {
      onSwipeRight: () => {
        // Only allow swipe back from left edge
        if (window.pageXOffset === 0) {
          document.body.classList.add('swipe-back-active');
          setTimeout(() => {
            document.body.classList.remove('swipe-back-active');
          }, 300);
          
          if (window.history.length > 1) {
            window.history.back();
          }
        }
      }
    });

    // Cleanup function
    return () => detector.destroy();
  }

  return () => {};
};

// Auto-initialize on module load
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initMobileNavigation);
}