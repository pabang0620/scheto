import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import './BottomSheet.css';

const BottomSheet = ({ 
  isOpen, 
  onClose, 
  children, 
  title,
  height = 'auto',
  enableSwipeToClose = true,
  backdropBlur = true,
  className = ''
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [dragVelocity, setDragVelocity] = useState(0);
  const [lastMoveTime, setLastMoveTime] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const sheetRef = useRef(null);
  const backdropRef = useRef(null);

  // Trigger haptic feedback (visual simulation)
  const triggerHaptic = useCallback((type = 'light') => {
    if (sheetRef.current) {
      sheetRef.current.classList.remove('haptic-light', 'haptic-medium');
      sheetRef.current.classList.add(`haptic-${type}`);
      setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.classList.remove(`haptic-${type}`);
        }
      }, type === 'light' ? 100 : 200);
    }
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e) => {
    if (!enableSwipeToClose) return;
    
    const touch = e.touches[0];
    const now = Date.now();
    setStartY(touch.clientY);
    setCurrentY(touch.clientY);
    setIsDragging(true);
    setDragVelocity(0);
    setLastMoveTime(now);
    setDragStartTime(now);
    triggerHaptic('light');
  }, [enableSwipeToClose, triggerHaptic]);

  // Handle touch move
  const handleTouchMove = useCallback((e) => {
    if (!isDragging || !enableSwipeToClose) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - startY;
    const now = Date.now();
    const timeDelta = now - lastMoveTime;
    
    // Calculate velocity (pixels per millisecond)
    if (timeDelta > 0) {
      const velocityY = (touch.clientY - currentY) / timeDelta;
      setDragVelocity(velocityY);
    }
    
    setCurrentY(touch.clientY);
    setLastMoveTime(now);
    
    // Handle drag with rubber band effect
    if (deltaY > 0) {
      // Normal downward drag
      setDragY(deltaY);
      
      // Progressive resistance for natural feel
      const maxDrag = window.innerHeight * 0.4;
      let resistance;
      if (deltaY < 100) {
        resistance = 1; // No resistance for initial drag
      } else if (deltaY < 200) {
        resistance = 0.8; // Light resistance
      } else {
        resistance = Math.max(0.3, 1 - (deltaY - 200) / maxDrag); // Strong resistance
      }
      
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${deltaY * resistance}px)`;
        sheetRef.current.style.transition = 'none';
      }
    } else if (deltaY < 0) {
      // Upward drag - rubber band effect
      const rubberBandResistance = Math.max(0.1, 1 - Math.abs(deltaY) / 100);
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${deltaY * rubberBandResistance}px)`;
        sheetRef.current.style.transition = 'none';
      }
    }
  }, [isDragging, startY, currentY, lastMoveTime, enableSwipeToClose]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (!isDragging || !enableSwipeToClose) return;

    setIsDragging(false);
    
    // Velocity-based dismiss logic
    const totalDragTime = Date.now() - dragStartTime;
    const isQuickSwipe = totalDragTime < 300 && Math.abs(dragVelocity) > 0.5;
    const isDownwardSwipe = dragVelocity > 0.3;
    const isDraggedFar = dragY > 120;
    
    // Close conditions:
    // 1. Quick downward swipe
    // 2. Dragged down far enough
    // 3. Moderate velocity with some drag distance
    const shouldClose = (
      (isQuickSwipe && isDownwardSwipe) ||
      isDraggedFar ||
      (dragVelocity > 0.2 && dragY > 60)
    );
    
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
    }
    
    if (shouldClose) {
      triggerHaptic('medium');
      handleClose();
    } else {
      // Snap back with smooth animation
      if (sheetRef.current) {
        sheetRef.current.style.transform = 'translateY(0)';
      }
      // Add slight bounce effect for better UX feedback
      setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transition = '';
        }
      }, 300);
    }
    
    // Reset drag state
    setDragY(0);
    setDragVelocity(0);
  }, [isDragging, dragY, dragVelocity, dragStartTime, enableSwipeToClose, triggerHaptic]);

  // Handle close with animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  }, [onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (e.target === backdropRef.current) {
      triggerHaptic('light');
      handleClose();
    }
  }, [handleClose, triggerHaptic]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll and ensure fixed positioning
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    };
  }, [isOpen, handleClose]);

  // Reset sheet position when opening
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      sheetRef.current.style.transform = 'translateY(0)';
    }
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;

  // Create portal to render at document body level
  return ReactDOM.createPortal(
    <div
      ref={backdropRef}
      className={`bottom-sheet-backdrop ${isClosing ? 'closing' : ''} ${backdropBlur ? 'blur' : ''}`}
      onClick={handleBackdropClick}
    >
      <div
        ref={sheetRef}
        className={`bottom-sheet ${isClosing ? 'closing' : ''} ${isDragging ? 'dragging' : ''} ${className}`}
        style={{ 
          height: height === 'auto' ? 'auto' : height,
          maxHeight: '90vh'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle indicator */}
        <div className="bottom-sheet-handle">
          <div className="handle-indicator" />
        </div>

        {/* Header */}
        {title && (
          <div className="bottom-sheet-header">
            <h3 className="bottom-sheet-title">{title}</h3>
            <button 
              className="bottom-sheet-close"
              onClick={handleClose}
              aria-label="Close"
            >
              <i className="fas fa-times" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="bottom-sheet-content">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

// Action item component for use within bottom sheet
export const BottomSheetAction = ({ 
  icon, 
  label, 
  onClick, 
  danger = false, 
  disabled = false 
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      // Add haptic feedback
      const element = document.querySelector('.bottom-sheet');
      if (element) {
        element.classList.add('haptic-light');
        setTimeout(() => {
          element.classList.remove('haptic-light');
        }, 100);
      }
      onClick();
    }
  };

  return (
    <button
      className={`bottom-sheet-action ${danger ? 'danger' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      disabled={disabled}
    >
      {icon && <i className={icon} />}
      <span>{label}</span>
    </button>
  );
};

export default BottomSheet;