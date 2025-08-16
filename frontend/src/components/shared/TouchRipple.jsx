import React, { useState, useRef, useCallback } from 'react';
import './TouchRipple.css';

const TouchRipple = ({ 
  children, 
  color = 'rgba(255, 255, 255, 0.3)', 
  duration = 600,
  disabled = false,
  className = '',
  onClick,
  onTouchStart,
  onTouchEnd,
  ...props 
}) => {
  const [ripples, setRipples] = useState([]);
  const containerRef = useRef(null);
  const rippleId = useRef(0);

  const createRipple = useCallback((event) => {
    if (disabled) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const newRipple = {
      id: rippleId.current++,
      x,
      y,
      size,
      color,
      duration
    };

    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, duration);
  }, [disabled, color, duration]);

  const handleMouseDown = useCallback((event) => {
    // Only create ripple for mouse events, not touch events
    if (event.pointerType !== 'touch') {
      createRipple(event);
    }
  }, [createRipple]);

  const handleTouchStart = useCallback((event) => {
    // Create ripple for touch events
    if (event.touches && event.touches[0]) {
      const touch = event.touches[0];
      createRipple(touch);
    }
    
    // Call parent's onTouchStart if provided
    if (onTouchStart) {
      onTouchStart(event);
    }
  }, [createRipple, onTouchStart]);

  const handleTouchEnd = useCallback((event) => {
    // Trigger haptic feedback for touch devices
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10); // Very light vibration
    }
    
    // Call parent's onTouchEnd if provided
    if (onTouchEnd) {
      onTouchEnd(event);
    }
  }, [onTouchEnd]);

  const handleClick = useCallback((event) => {
    if (onClick) {
      onClick(event);
    }
  }, [onClick]);

  return (
    <div
      ref={containerRef}
      className={`touch-ripple-container ${className} ${disabled ? 'disabled' : ''}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      {...props}
    >
      {children}
      <div className="ripples-wrapper">
        {ripples.map(ripple => (
          <div
            key={ripple.id}
            className="ripple"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
              backgroundColor: ripple.color,
              animationDuration: `${ripple.duration}ms`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default TouchRipple;