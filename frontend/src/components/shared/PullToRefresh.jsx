import React, { useState, useRef, useCallback, useEffect } from 'react';
import './PullToRefresh.css';

const PullToRefresh = ({ 
  onRefresh, 
  children, 
  disabled = false,
  refreshThreshold = 80,
  maxPullDistance = 120,
  className = ''
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [canPull, setCanPull] = useState(false);
  
  const containerRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isAtTop = useRef(true);

  // Check if container is at top
  const checkIsAtTop = useCallback(() => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      isAtTop.current = scrollTop <= 0;
      return isAtTop.current;
    }
    return false;
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e) => {
    if (disabled || isRefreshing) return;

    const touch = e.touches[0];
    startY.current = touch.clientY;
    currentY.current = touch.clientY;
    
    // Check if we're at the top and can start pulling
    if (checkIsAtTop()) {
      setCanPull(true);
    }
  }, [disabled, isRefreshing, checkIsAtTop]);

  // Handle touch move
  const handleTouchMove = useCallback((e) => {
    if (disabled || isRefreshing || !canPull) return;

    const touch = e.touches[0];
    currentY.current = touch.clientY;
    const deltaY = currentY.current - startY.current;

    // Only pull when at top and pulling down
    if (deltaY > 0 && isAtTop.current) {
      e.preventDefault(); // Prevent native scroll
      
      setIsPulling(true);
      
      // Apply resistance curve for elastic feel
      const resistance = Math.min(deltaY / 2.5, maxPullDistance);
      const easedDistance = resistance * (1 - resistance / (maxPullDistance * 1.5));
      
      setPullDistance(Math.max(0, easedDistance));
    }
  }, [disabled, isRefreshing, canPull, maxPullDistance]);

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing || !isPulling) return;

    setIsPulling(false);
    setCanPull(false);

    // Trigger refresh if pulled beyond threshold
    if (pullDistance >= refreshThreshold) {
      setIsRefreshing(true);
      
      // Add haptic feedback simulation
      if (containerRef.current) {
        containerRef.current.classList.add('haptic-medium');
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.classList.remove('haptic-medium');
          }
        }, 200);
      }

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        // Add delay to show spinner and provide feedback
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 300);
      }
    } else {
      // Snap back if not pulled enough
      setPullDistance(0);
    }
  }, [disabled, isRefreshing, isPulling, pullDistance, refreshThreshold, onRefresh]);

  // Handle scroll to update isAtTop
  const handleScroll = useCallback(() => {
    checkIsAtTop();
  }, [checkIsAtTop]);

  // Reset state when disabled
  useEffect(() => {
    if (disabled) {
      setPullDistance(0);
      setIsRefreshing(false);
      setIsPulling(false);
      setCanPull(false);
    }
  }, [disabled]);

  const pullProgress = Math.min(pullDistance / refreshThreshold, 1);
  const shouldShowRefresh = isRefreshing || pullDistance > 0;

  return (
    <div 
      className={`pull-to-refresh-container ${className}`}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onScroll={handleScroll}
      style={{
        transform: isPulling ? `translateY(${Math.min(pullDistance / 2, 40)}px)` : 'none',
        transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        overscrollBehavior: 'contain'
      }}
    >
      {/* Pull to refresh indicator */}
      <div 
        className={`pull-refresh-indicator ${shouldShowRefresh ? 'visible' : ''} ${isRefreshing ? 'refreshing' : ''}`}
        style={{
          transform: `translateY(${Math.min(pullDistance - 40, 20)}px)`,
          opacity: Math.max(pullProgress, isRefreshing ? 1 : 0)
        }}
      >
        <div className="refresh-spinner">
          <div 
            className={`spinner-icon ${isRefreshing ? 'spinning' : ''}`}
            style={{
              transform: `rotate(${pullProgress * 360}deg)`
            }}
          >
            <i className="fas fa-arrow-down" />
          </div>
        </div>
        <div className="refresh-text">
          {isRefreshing 
            ? 'Refreshing...' 
            : pullDistance >= refreshThreshold 
              ? 'Release to refresh' 
              : 'Pull to refresh'
          }
        </div>
      </div>

      {/* Content */}
      <div className="pull-refresh-content">
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;