/**
 * SwipeableListItem Component
 *
 * A touch-friendly list item component that supports swipe gestures
 * to reveal action buttons (swipe left/right to show actions).
 */

import * as React from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useSwipe, triggerHapticFeedback } from '@/lib/utils/touchGestures';
import { Check, X, Edit2, Trash2, MoreHorizontal } from 'lucide-react';

export interface SwipeAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  onClick: () => void;
}

export interface SwipeableListItemProps {
  children: React.ReactNode;
  /** Actions revealed when swiping left (typically destructive/secondary actions) */
  leftActions?: SwipeAction[];
  /** Actions revealed when swiping right (typically primary/confirm actions) */
  rightActions?: SwipeAction[];
  /** Callback when item is swiped past threshold without action */
  onSwipeComplete?: (direction: 'left' | 'right') => void;
  /** Disable swipe functionality */
  disabled?: boolean;
  /** Auto-close after action is performed */
  autoClose?: boolean;
  /** Custom className for the container */
  className?: string;
  /** Action width in pixels */
  actionWidth?: number;
}

const colorClasses = {
  default: 'bg-muted-foreground text-white',
  primary: 'bg-primary text-white',
  success: 'bg-success text-white',
  warning: 'bg-warning text-white',
  danger: 'bg-error text-white',
};

export function SwipeableListItem({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeComplete,
  disabled = false,
  autoClose = true,
  className,
  actionWidth = 80,
}: SwipeableListItemProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(false);

  const maxLeftSwipe = leftActions.length * actionWidth;
  const maxRightSwipe = rightActions.length * actionWidth;

  const resetPosition = useCallback(() => {
    setIsAnimating(true);
    setTranslateX(0);
    isOpenRef.current = false;
    setTimeout(() => setIsAnimating(false), 200);
  }, []);

  const { handlers, state } = useSwipe<HTMLDivElement>({
    onSwipeMove: (swipeState) => {
      if (disabled) {return;}

      let newTranslateX = swipeState.deltaX;

      // Add resistance at boundaries
      if (newTranslateX > 0 && rightActions.length === 0) {
        newTranslateX = newTranslateX * 0.3;
      } else if (newTranslateX < 0 && leftActions.length === 0) {
        newTranslateX = newTranslateX * 0.3;
      }

      // Clamp to max values with rubber band effect
      if (newTranslateX > maxRightSwipe) {
        const overflow = newTranslateX - maxRightSwipe;
        newTranslateX = maxRightSwipe + overflow * 0.2;
      } else if (newTranslateX < -maxLeftSwipe) {
        const overflow = Math.abs(newTranslateX) - maxLeftSwipe;
        newTranslateX = -maxLeftSwipe - overflow * 0.2;
      }

      setTranslateX(newTranslateX);
    },
    onSwipeEnd: (swipeState) => {
      if (disabled) {return;}

      setIsAnimating(true);

      const threshold = actionWidth * 0.5;
      const deltaX = swipeState.deltaX;

      // Determine final position
      if (deltaX > threshold && rightActions.length > 0) {
        // Open right actions
        setTranslateX(maxRightSwipe);
        isOpenRef.current = true;
        triggerHapticFeedback('light');
      } else if (deltaX < -threshold && leftActions.length > 0) {
        // Open left actions
        setTranslateX(-maxLeftSwipe);
        isOpenRef.current = true;
        triggerHapticFeedback('light');
      } else if (Math.abs(deltaX) > actionWidth * 1.5) {
        // Full swipe - trigger completion
        const direction = deltaX > 0 ? 'right' : 'left';
        onSwipeComplete?.(direction);
        resetPosition();
      } else {
        // Snap back
        resetPosition();
      }

      setTimeout(() => setIsAnimating(false), 200);
    },
    threshold: 20,
    preventScroll: true,
    enabled: !disabled,
  });

  const handleActionClick = useCallback(
    (action: SwipeAction) => {
      action.onClick();
      if (autoClose) {
        resetPosition();
      }
    },
    [autoClose, resetPosition]
  );

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        isOpenRef.current &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        resetPosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [resetPosition]);

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
    >
      {/* Left Actions (revealed on swipe right) */}
      {rightActions.length > 0 && (
        <div
          className="absolute inset-y-0 left-0 flex"
          style={{ width: maxRightSwipe }}
        >
          {rightActions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={cn(
                'flex flex-col items-center justify-center transition-transform touch-manipulation',
                colorClasses[action.color || 'default']
              )}
              style={{
                width: actionWidth,
                transform: `translateX(${Math.min(
                  0,
                  translateX - maxRightSwipe + index * actionWidth
                )}px)`,
              }}
            >
              {action.icon || <Check className="h-5 w-5" />}
              <span className="text-xs mt-1 font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right Actions (revealed on swipe left) */}
      {leftActions.length > 0 && (
        <div
          className="absolute inset-y-0 right-0 flex"
          style={{ width: maxLeftSwipe }}
        >
          {leftActions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={cn(
                'flex flex-col items-center justify-center transition-transform touch-manipulation',
                colorClasses[action.color || 'default']
              )}
              style={{
                width: actionWidth,
                transform: `translateX(${Math.max(
                  0,
                  translateX + maxLeftSwipe - (leftActions.length - 1 - index) * actionWidth
                )}px)`,
              }}
            >
              {action.icon || <MoreHorizontal className="h-5 w-5" />}
              <span className="text-xs mt-1 font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div
        className={cn(
          'relative bg-card z-10',
          isAnimating && 'transition-transform duration-200 ease-out'
        )}
        style={{
          transform: `translateX(${translateX}px)`,
          // Optimize rendering during swipe gestures
          willChange: state.isSwiping ? 'transform' : 'auto',
        }}
        {...handlers}
      >
        {children}
      </div>

      {/* Swipe indicator hints */}
      {state.isSwiping && (
        <div
          className={cn(
            'absolute inset-0 pointer-events-none z-20',
            'flex items-center',
            translateX > 0 ? 'justify-start pl-4' : 'justify-end pr-4'
          )}
        >
          {state.progress > 0.5 && (
            <div
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium',
                translateX > 0 ? 'bg-success-light text-success-dark' : 'bg-error-light text-error-dark'
              )}
            >
              {translateX > 0 ? 'Release to confirm' : 'Release to show actions'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Pre-configured swipe action factories
// ============================================================================

export function createCompleteAction(onClick: () => void): SwipeAction {
  return {
    id: 'complete',
    label: 'Complete',
    icon: <Check className="h-5 w-5" />,
    color: 'success',
    onClick,
  };
}

export function createEditAction(onClick: () => void): SwipeAction {
  return {
    id: 'edit',
    label: 'Edit',
    icon: <Edit2 className="h-5 w-5" />,
    color: 'primary',
    onClick,
  };
}

export function createDeleteAction(onClick: () => void): SwipeAction {
  return {
    id: 'delete',
    label: 'Delete',
    icon: <Trash2 className="h-5 w-5" />,
    color: 'danger',
    onClick,
  };
}

export function createCancelAction(onClick: () => void): SwipeAction {
  return {
    id: 'cancel',
    label: 'Cancel',
    icon: <X className="h-5 w-5" />,
    color: 'warning',
    onClick,
  };
}

export default SwipeableListItem;
