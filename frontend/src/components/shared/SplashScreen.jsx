import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './SplashScreen.css';

const SplashScreen = ({ onComplete, duration = 2000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Wait for exit animation to complete before calling onComplete
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 500);
    }, duration);

    return () => clearTimeout(timer);
  }, [onComplete, duration]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="splash-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ 
            opacity: { duration: 0.5 },
            scale: { duration: 0.5 }
          }}
        >
          <div className="splash-content">
            {/* Main logo animation */}
            <motion.div
              className="splash-logo"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 10,
                duration: 1
              }}
            >
              <motion.div
                className="logo-icon-splash"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <motion.i
                  className="fas fa-calendar-alt"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: 0.7,
                    type: "spring",
                    stiffness: 200,
                    damping: 10
                  }}
                />
              </motion.div>
              
              {/* Pulsing ring effect */}
              <motion.div
                className="pulse-ring"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: [1, 1.5, 1], 
                  opacity: [0.7, 0, 0.7] 
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: 1
                }}
              />
            </motion.div>

            {/* App title with typewriter effect */}
            <motion.div
              className="splash-title"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
            >
              <motion.h1
                className="app-title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.8 }}
              >
                ScheduleAuto
              </motion.h1>
              <motion.p
                className="app-subtitle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6, duration: 0.6 }}
              >
                Smart Scheduling Made Simple
              </motion.p>
            </motion.div>

            {/* Loading indicator */}
            <motion.div
              className="splash-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8, duration: 0.4 }}
            >
              <motion.div
                className="loading-bar"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ 
                  delay: 2,
                  duration: duration / 1000 - 1.5,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
          </div>

          {/* Background elements */}
          <div className="splash-background">
            {/* Floating schedule icons */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="floating-icon"
                style={{
                  left: `${15 + (i % 4) * 20}%`,
                  top: `${20 + Math.floor(i / 4) * 60}%`,
                }}
                initial={{ opacity: 0, scale: 0, rotate: 0 }}
                animate={{ 
                  opacity: [0, 0.3, 0],
                  scale: [0, 1, 0],
                  rotate: 360,
                  y: [-20, 20, -20]
                }}
                transition={{
                  duration: 3,
                  delay: 0.5 + i * 0.2,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
              >
                <i className={[
                  'fas fa-clock',
                  'fas fa-user-friends',
                  'fas fa-calendar-check',
                  'fas fa-tasks',
                  'fas fa-chart-line',
                  'fas fa-bell',
                  'fas fa-mobile-alt',
                  'fas fa-sync-alt'
                ][i]} />
              </motion.div>
            ))}

            {/* Gradient orbs */}
            <motion.div
              className="gradient-orb orb-1"
              animate={{
                x: [0, 50, 0],
                y: [0, -30, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className="gradient-orb orb-2"
              animate={{
                x: [0, -30, 0],
                y: [0, 40, 0],
                scale: [1, 0.8, 1]
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
            />
          </div>

          {/* Version info */}
          <motion.div
            className="version-info"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2, duration: 0.3 }}
          >
            v1.0.0
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;