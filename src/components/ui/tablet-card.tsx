/**
 * TabletCard Component
 *
 * A card component optimized for tablet displays with:
 * - Larger touch targets
 * - Optimized padding for touch interaction
 * - Better font sizes for tablet viewing
 * - Responsive layouts for portrait/landscape
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useTabletMode } from '@/hooks/useTabletMode';

export interface TabletCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card variant affecting padding and styling */
  variant?: 'default' | 'compact' | 'spacious';
  /** Whether the card is interactive (clickable/hoverable) */
  interactive?: boolean;
  /** Whether to show a border */
  bordered?: boolean;
  /** Optional icon to display */
  icon?: React.ReactNode;
  /** Card title */
  title?: string;
  /** Card description/subtitle */
  description?: string;
  /** Action element (button, link, etc.) */
  action?: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
}

const TabletCard = React.forwardRef<HTMLDivElement, TabletCardProps>(
  (
    {
      className,
      variant = 'default',
      interactive = false,
      bordered = true,
      icon,
      title,
      description,
      action,
      footer,
      children,
      ...props
    },
    ref
  ) => {
    const { isTablet, isLandscape, isTouchDevice } = useTabletMode();

    // Determine padding based on variant and device
    const paddingClasses = React.useMemo(() => {
      const base = {
        default: isTablet ? 'p-5' : 'p-4',
        compact: isTablet ? 'p-4' : 'p-3',
        spacious: isTablet ? 'p-6' : 'p-5',
      };
      return base[variant];
    }, [variant, isTablet]);

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'rounded-lg bg-white dark:bg-gray-900',
          paddingClasses,
          // Border
          bordered && 'border border-gray-200 dark:border-gray-800',
          // Shadow
          'shadow-sm',
          // Interactive states
          interactive && [
            'cursor-pointer',
            'transition-all duration-200',
            'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700',
            isTouchDevice && 'active:scale-[0.98] active:shadow-sm',
          ],
          // Touch-friendly minimum size on tablets
          isTablet && 'min-h-[88px]',
          className
        )}
        {...props}
      >
        {/* Header section with icon, title, description, and action */}
        {(icon || title || description || action) && (
          <div
            className={cn(
              'flex items-start',
              isLandscape ? 'gap-4' : 'gap-3'
            )}
          >
            {/* Icon */}
            {icon && (
              <div
                className={cn(
                  'flex-shrink-0 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800',
                  isTablet ? 'w-12 h-12' : 'w-10 h-10',
                  '[&>svg]:w-6 [&>svg]:h-6',
                  isTablet && '[&>svg]:w-7 [&>svg]:h-7'
                )}
              >
                {icon}
              </div>
            )}

            {/* Title and description */}
            <div className="flex-1 min-w-0">
              {title && (
                <h3
                  className={cn(
                    'font-semibold text-gray-900 dark:text-gray-100 truncate',
                    isTablet ? 'text-lg' : 'text-base'
                  )}
                >
                  {title}
                </h3>
              )}
              {description && (
                <p
                  className={cn(
                    'text-gray-600 dark:text-gray-400 line-clamp-2',
                    isTablet ? 'text-base mt-1' : 'text-sm mt-0.5'
                  )}
                >
                  {description}
                </p>
              )}
            </div>

            {/* Action */}
            {action && <div className="flex-shrink-0">{action}</div>}
          </div>
        )}

        {/* Main content */}
        {children && (
          <div
            className={cn(
              (icon || title || description || action) && (isTablet ? 'mt-4' : 'mt-3')
            )}
          >
            {children}
          </div>
        )}

        {/* Footer */}
        {footer && (
          <div
            className={cn(
              'border-t border-gray-200 dark:border-gray-800 -mx-4 -mb-4 px-4 py-3',
              isTablet && '-mx-5 -mb-5 px-5 py-4',
              variant === 'spacious' && (isTablet ? '-mx-6 -mb-6 px-6 py-4' : '-mx-5 -mb-5 px-5 py-3')
            )}
          >
            {footer}
          </div>
        )}
      </div>
    );
  }
);

TabletCard.displayName = 'TabletCard';

/**
 * TabletCardGrid - A responsive grid for TabletCards
 */
export interface TabletCardGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns on desktop (default: 4) */
  desktopCols?: 2 | 3 | 4;
  /** Number of columns on tablet landscape (default: 3) */
  tabletLandscapeCols?: 2 | 3 | 4;
  /** Number of columns on tablet portrait (default: 2) */
  tabletPortraitCols?: 1 | 2 | 3;
  /** Gap between cards */
  gap?: 'sm' | 'md' | 'lg';
}

const TabletCardGrid = React.forwardRef<HTMLDivElement, TabletCardGridProps>(
  (
    {
      className,
      desktopCols = 4,
      tabletLandscapeCols = 3,
      tabletPortraitCols = 2,
      gap = 'md',
      children,
      ...props
    },
    ref
  ) => {
    const { isTablet, isLandscape, isPortrait } = useTabletMode();

    const gridCols = React.useMemo(() => {
      if (isTablet) {
        if (isLandscape) {
          return {
            2: 'grid-cols-2',
            3: 'grid-cols-3',
            4: 'grid-cols-4',
          }[tabletLandscapeCols];
        }
        if (isPortrait) {
          return {
            1: 'grid-cols-1',
            2: 'grid-cols-2',
            3: 'grid-cols-3',
          }[tabletPortraitCols];
        }
      }
      return {
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4',
      }[desktopCols];
    }, [isTablet, isLandscape, isPortrait, desktopCols, tabletLandscapeCols, tabletPortraitCols]);

    const gapClass = {
      sm: 'gap-3',
      md: 'gap-4',
      lg: 'gap-6',
    }[gap];

    return (
      <div
        ref={ref}
        className={cn('grid', gridCols, gapClass, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabletCardGrid.displayName = 'TabletCardGrid';

export { TabletCard, TabletCardGrid };
