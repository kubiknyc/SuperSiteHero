/**
 * PullToRefresh Component
 *
 * A touch-friendly pull-to-refresh container for list views.
 * Provides visual feedback and haptic response on mobile devices.
 */

import * as React from 'react';
import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/lib/utils/touchGestures';
import { RefreshCw, ArrowDown, Check } from 'lucide-react';

export interface PullToRefreshProps {
  children: React.ReactNode;
  /** Async function to call when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Disable pull-to-refresh functionality */
  disabled?: boolean;
  /** Threshold distance to trigger refresh (default: 80px) */
  threshold?: number;
  /** Pull resistance factor (default: 2.5) */
  resistance?: number;
  /** Custom className for the container */
  className?: string;
  /** Custom refresh indicator */
  refreshIndicator?: React.ReactNode;
  /** Text to show when pulling */
  pullText?: string;
  /** Text to show when release will trigger refresh */
  releaseText?: string;
  /** Text to show while refreshing */
  refreshingText?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  threshold = 80,
  resistance = 2.5,
  className,
  refreshIndicator,
  pullText = 'Pull to refresh',
  releaseText = 'Release to refresh',
  refreshingText = 'Refreshing...',
}: PullToRefreshProps) {
  const { ref, state, handlers } = usePullToRefresh<HTMLDivElement>({
    onRefresh,
    threshold,
    resistance,
    enabled: !disabled,
  });

  const { isPulling, pullDistance, isRefreshing, canRefresh } = state;

  // Calculate indicator styles based on pull progress
  const progress = Math.min(1, pullDistance / threshold);
  const rotation = progress * 180;
  const scale = 0.5 + progress * 0.5;
  const opacity = Math.min(1, progress * 1.5);

  const renderIndicator = useCallback(() => {
    if (refreshIndicator) {
      return refreshIndicator;
    }

    if (isRefreshing) {
      return (
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-6 w-6 text-primary animate-spin" />
          <span className="text-sm text-secondary">{refreshingText}</span>
        </div>
      );
    }

    if (canRefresh) {
      return (
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <Check className="h-6 w-6 text-success" />
          </div>
          <span className="text-sm text-success font-medium">{releaseText}</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-2">
        <ArrowDown
          className="h-6 w-6 text-disabled transition-transform"
          style={{
            transform: `rotate(${rotation}deg) scale(${scale})`,
            opacity,
          }}
        />
        <span className="text-sm text-muted">{pullText}</span>
      </div>
    );
  }, [
    isRefreshing,
    canRefresh,
    refreshIndicator,
    refreshingText,
    releaseText,
    pullText,
    rotation,
    scale,
    opacity,
  ]);

  return (
    <div
      ref={ref}
      className={cn('relative overflow-hidden', className)}
      {...handlers}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute left-0 right-0 flex items-center justify-center transition-all duration-200 bg-surface border-b border-border',
          'transform -translate-y-full',
          (isPulling || isRefreshing) && 'translate-y-0'
        )}
        style={{
          height: isRefreshing ? 60 : Math.min(80, pullDistance),
          top: 0,
          zIndex: 10,
        }}
      >
        {renderIndicator()}
      </div>

      {/* Content container */}
      <div
        className={cn(
          'transition-transform duration-200',
          (isPulling || isRefreshing) && 'ease-out'
        )}
        style={{
          transform: `translateY(${isRefreshing ? 60 : Math.min(80, pullDistance)}px)`,
          // Optimize rendering during pull gesture
          willChange: isPulling ? 'transform' : 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// RefreshableList - Convenience wrapper for list components
// ============================================================================

export interface RefreshableListProps extends Omit<PullToRefreshProps, 'children'> {
  /** List items to render */
  items: React.ReactNode[];
  /** Component to render when list is empty */
  emptyComponent?: React.ReactNode;
  /** Gap between list items */
  gap?: number;
  /** Additional padding */
  padding?: number;
}

export function RefreshableList({
  items,
  emptyComponent,
  gap = 8,
  padding = 16,
  ...pullToRefreshProps
}: RefreshableListProps) {
  return (
    <PullToRefresh {...pullToRefreshProps}>
      <div
        className="min-h-[200px]"
        style={{ padding, display: 'flex', flexDirection: 'column', gap }}
      >
        {items.length === 0
          ? emptyComponent || (
              <div className="flex flex-col items-center justify-center py-12 text-muted">
                <p>No items to display</p>
                <p className="text-sm mt-1">Pull down to refresh</p>
              </div>
            )
          : items}
      </div>
    </PullToRefresh>
  );
}

export default PullToRefresh;
