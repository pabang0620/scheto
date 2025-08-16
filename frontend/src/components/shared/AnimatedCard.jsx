import React from 'react';
import { motion } from 'framer-motion';
import './AnimatedCard.css';

const AnimatedCard = ({ 
  children, 
  className = '',
  onClick,
  delay = 0,
  duration = 0.6,
  hover = true,
  press = true,
  entrance = true,
  style = {},
  layoutId,
  ...props 
}) => {
  // Default animation variants
  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 30,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration,
        delay,
        type: "spring",
        stiffness: 200,
        damping: 20
      }
    }
  };

  // Hover animation
  const hoverAnimation = hover ? {
    scale: 1.02,
    y: -5,
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  } : {};

  // Press animation
  const pressAnimation = press ? {
    scale: 0.98,
    transition: {
      duration: 0.1
    }
  } : {};

  return (
    <motion.div
      className={`animated-card ${className}`}
      onClick={onClick}
      style={style}
      layoutId={layoutId}
      initial={entrance ? "hidden" : undefined}
      animate={entrance ? "visible" : undefined}
      variants={entrance ? cardVariants : undefined}
      whileHover={hoverAnimation}
      whileTap={pressAnimation}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Preset variations
export const FadeInCard = ({ children, ...props }) => (
  <AnimatedCard 
    {...props}
    entrance={true}
    hover={false}
    press={false}
  >
    {children}
  </AnimatedCard>
);

export const InteractiveCard = ({ children, ...props }) => (
  <AnimatedCard 
    {...props}
    entrance={true}
    hover={true}
    press={true}
  >
    {children}
  </AnimatedCard>
);

export const StaticCard = ({ children, ...props }) => (
  <AnimatedCard 
    {...props}
    entrance={false}
    hover={false}
    press={false}
  >
    {children}
  </AnimatedCard>
);

// Staggered container for multiple cards
export const StaggerContainer = ({ children, className = "", staggerDelay = 0.1 }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.2
      }
    }
  };

  return (
    <motion.div
      className={`stagger-container ${className}`}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {children}
    </motion.div>
  );
};

// List item with slide-in animation
export const SlideInItem = ({ children, direction = "left", delay = 0, className = "" }) => {
  const slideVariants = {
    hidden: {
      opacity: 0,
      x: direction === "left" ? -50 : direction === "right" ? 50 : 0,
      y: direction === "up" ? -50 : direction === "down" ? 50 : 0
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 0.6,
        delay,
        type: "spring",
        stiffness: 200
      }
    }
  };

  return (
    <motion.div
      className={`slide-in-item ${className}`}
      variants={slideVariants}
    >
      {children}
    </motion.div>
  );
};

// Loading skeleton component
export const SkeletonCard = ({ width = "100%", height = "100px", className = "" }) => {
  return (
    <motion.div
      className={`skeleton-card ${className}`}
      style={{ width, height }}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );
};

// Pulse animation for notifications/badges
export const PulseCard = ({ children, pulseColor = "#4667de", ...props }) => {
  return (
    <motion.div
      {...props}
      animate={{
        boxShadow: [
          `0 0 0 0 ${pulseColor}40`,
          `0 0 0 20px ${pulseColor}00`
        ]
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedCard;