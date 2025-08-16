import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useSwipeGesture from '../../hooks/useSwipeGesture';
import './PageTransition.css';

const PageTransition = ({ children, className = '' }) => {
  const location = useLocation();
  
  const pageVariants = {
    initial: {
      opacity: 0,
      scale: 0.98,
      y: 20
    },
    in: {
      opacity: 1,
      scale: 1,
      y: 0
    },
    out: {
      opacity: 0,
      scale: 0.98,
      y: -20
    }
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.5
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        className={`page-transition ${className}`}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Native-style slide transition hook
export const usePageTransition = () => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const triggerTransition = (direction = 'forward') => {
    setIsTransitioning(true);
    
    // Add haptic feedback simulation
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    
    // Reset after animation
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  return {
    isTransitioning,
    triggerTransition,
    location
  };
};

// Swipe back gesture detector
export const SwipeBackDetector = ({ onSwipeBack, children, disabled = false }) => {
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [canSwipe, setCanSwipe] = useState(false);

  const handleTouchStart = (e) => {
    if (disabled) return;
    
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    
    // Only allow swipe from left edge (first 20px)
    if (startX <= 20) {
      setStartX(startX);
      setStartY(startY);
      setCurrentX(startX);
      setIsTracking(true);
      setCanSwipe(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isTracking || !canSwipe || disabled) return;
    
    const touch = e.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    
    // Calculate deltas
    const deltaX = currentX - startX;
    const deltaY = Math.abs(currentY - startY);
    
    // If vertical movement is too much, cancel swipe
    if (deltaY > 50) {
      setCanSwipe(false);
      return;
    }
    
    // Only track rightward swipes
    if (deltaX > 0) {
      setCurrentX(currentX);
      
      // Add visual feedback for swipe progress
      const progress = Math.min(deltaX / 100, 1);
      document.documentElement.style.setProperty('--swipe-progress', progress);
    }
  };

  const handleTouchEnd = () => {
    if (!isTracking || !canSwipe || disabled) return;
    
    const deltaX = currentX - startX;
    
    // If swiped more than 50px, trigger back navigation
    if (deltaX > 50) {
      // Add haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(20);
      }
      
      onSwipeBack();
    }
    
    // Reset state
    setIsTracking(false);
    setCanSwipe(false);
    document.documentElement.style.setProperty('--swipe-progress', 0);
  };

  return (
    <div
      className="swipe-back-detector"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};

// Route transition wrapper with swipe back support
export const RouteTransition = ({ 
  children, 
  direction = 'forward', 
  onSwipeBack,
  enableSwipeBack = true 
}) => {
  const location = useLocation();
  const [swipeDirection, setSwipeDirection] = useState(0);

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  const handleSwipeLeft = () => {
    if (onSwipeBack) {
      setSwipeDirection(1);
      onSwipeBack();
    }
  };

  const handleSwipeRight = () => {
    if (onSwipeBack) {
      setSwipeDirection(-1);
      onSwipeBack();
    }
  };

  const swipeRef = useSwipeGesture({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    threshold: 100
  });

  const content = (
    <AnimatePresence mode="wait" custom={swipeDirection}>
      <motion.div
        key={location.pathname}
        custom={swipeDirection}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: "spring", stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 }
        }}
        className="route-transition"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );

  if (enableSwipeBack && onSwipeBack) {
    return (
      <div ref={swipeRef} className="swipe-container">
        {content}
      </div>
    );
  }

  return content;
};

// Enhanced loading states
export const LoadingTransition = ({ isLoading, children, className = '' }) => {
  const loadingVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.2
      }
    }
  };

  const skeletonVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    },
    exit: { opacity: 0 }
  };

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="loading"
          className={`loading-transition ${className}`}
          variants={skeletonVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div 
            className="loading-skeleton"
            animate={{
              opacity: [0.5, 1, 0.5],
              scale: [1, 1.02, 1]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="skeleton-shimmer" />
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="content"
          variants={loadingVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Toast notification animations
export const ToastTransition = ({ children, type = 'info', position = 'top-right' }) => {
  const toastVariants = {
    hidden: {
      opacity: 0,
      y: position.includes('top') ? -50 : 50,
      x: position.includes('right') ? 50 : position.includes('left') ? -50 : 0,
      scale: 0.9
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20
      }
    },
    exit: {
      opacity: 0,
      y: position.includes('top') ? -20 : 20,
      x: position.includes('right') ? 20 : position.includes('left') ? -20 : 0,
      scale: 0.95,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <motion.div
      className={`toast-transition toast-${type} toast-${position}`}
      variants={toastVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;