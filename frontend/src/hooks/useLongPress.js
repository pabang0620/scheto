import { useRef, useCallback, useEffect } from 'react';

const useLongPress = ({
  onLongPress,
  onClick,
  duration = 500,
  movementThreshold = 10,
  hapticFeedback = true
} = {}) => {
  const timeoutRef = useRef(null);
  const startPositionRef = useRef({ x: 0, y: 0 });
  const isLongPressRef = useRef(false);
  const elementRef = useRef(null);

  // Trigger haptic feedback
  const triggerHaptic = useCallback((type = 'light') => {
    if (!hapticFeedback) return;
    
    // Try native vibration API first
    if (window.navigator && window.navigator.vibrate) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30, 10, 30]
      };
      window.navigator.vibrate(patterns[type] || patterns.light);
    }
    
    // Visual feedback fallback
    if (elementRef.current) {
      elementRef.current.classList.add(`haptic-${type}`);
      setTimeout(() => {
        if (elementRef.current) {
          elementRef.current.classList.remove(`haptic-${type}`);
        }
      }, type === 'light' ? 100 : type === 'medium' ? 150 : 200);
    }
  }, [hapticFeedback]);

  // Calculate distance between two points
  const calculateDistance = useCallback((point1, point2) => {
    return Math.sqrt(
      Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
    );
  }, []);

  // Start long press detection
  const startLongPress = useCallback((event) => {
    isLongPressRef.current = false;
    
    // Store initial position
    const point = event.touches ? event.touches[0] : event;
    startPositionRef.current = {
      x: point.clientX,
      y: point.clientY
    };

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Start long press timer
    timeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      triggerHaptic('medium');
      
      // Add visual feedback
      if (elementRef.current) {
        elementRef.current.classList.add('long-press-active');
      }
      
      if (onLongPress) {
        onLongPress(event);
      }
    }, duration);

    // Light haptic feedback on initial press
    triggerHaptic('light');
  }, [duration, onLongPress, triggerHaptic]);

  // Handle movement during press
  const handleMove = useCallback((event) => {
    if (!timeoutRef.current) return;

    const point = event.touches ? event.touches[0] : event;
    const currentPosition = {
      x: point.clientX,
      y: point.clientY
    };

    const distance = calculateDistance(startPositionRef.current, currentPosition);

    // Cancel long press if moved too much
    if (distance > movementThreshold) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      
      if (elementRef.current) {
        elementRef.current.classList.remove('long-press-active');
      }
    }
  }, [calculateDistance, movementThreshold]);

  // End long press detection
  const endLongPress = useCallback((event) => {
    const wasLongPress = isLongPressRef.current;
    
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Remove visual feedback
    if (elementRef.current) {
      elementRef.current.classList.remove('long-press-active');
    }

    // Handle click if it wasn't a long press
    if (!wasLongPress && onClick) {
      onClick(event);
    }

    // Reset state
    isLongPressRef.current = false;
  }, [onClick]);

  // Prevent context menu on long press
  const handleContextMenu = useCallback((event) => {
    if (isLongPressRef.current) {
      event.preventDefault();
      return false;
    }
  }, []);

  // Set up event listeners
  const bind = useCallback((element) => {
    if (!element) return;
    
    elementRef.current = element;
    
    // Touch events
    element.addEventListener('touchstart', startLongPress, { passive: false });
    element.addEventListener('touchmove', handleMove, { passive: false });
    element.addEventListener('touchend', endLongPress, { passive: false });
    element.addEventListener('touchcancel', endLongPress, { passive: false });
    
    // Mouse events
    element.addEventListener('mousedown', startLongPress);
    element.addEventListener('mousemove', handleMove);
    element.addEventListener('mouseup', endLongPress);
    element.addEventListener('mouseleave', endLongPress);
    
    // Prevent context menu
    element.addEventListener('contextmenu', handleContextMenu);
    
    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      element.removeEventListener('touchstart', startLongPress);
      element.removeEventListener('touchmove', handleMove);
      element.removeEventListener('touchend', endLongPress);
      element.removeEventListener('touchcancel', endLongPress);
      element.removeEventListener('mousedown', startLongPress);
      element.removeEventListener('mousemove', handleMove);
      element.removeEventListener('mouseup', endLongPress);
      element.removeEventListener('mouseleave', endLongPress);
      element.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [startLongPress, handleMove, endLongPress, handleContextMenu]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    bind,
    isLongPress: isLongPressRef.current
  };
};

export default useLongPress;