/**
 * DashboardGrid Component
 *
 * Responsive dashboard grid optimized for tablets with:
 * - 1 column on mobile
 * - 2 columns on tablet portrait (768px)
 * - 3 columns on tablet landscape (1024px)
 * - 4 columns on desktop (1280px+)
 *
 * Includes touch-optimized widget controls and adaptive sizing.
 */

import { type ReactNode, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useOrientation, useResponsiveLayout } from '@/hooks/useOrientation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical, Maximize2, Minimize2, X, GripVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================================================
// Types
// ============================================================================

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface DashboardWidgetProps {
  /** Widget ID */
  id: string;
  /** Widget title */
  title: string;
  /** Optional description */
  description?: string;
  /** Widget content */
  children: ReactNode;
  /** Widget size - affects column span */
  size?: WidgetSize;
  /** Whether the widget can be expanded to full screen */
  expandable?: boolean;
  /** Whether the widget is currently expanded */
  isExpanded?: boolean;
  /** Callback when expand/collapse is toggled */
  onExpandChange?: (expanded: boolean) => void;
  /** Whether the widget can be removed */
  removable?: boolean;
  /** Callback when widget is removed */
  onRemove?: () => void;
  /** Whether the widget is draggable (for reordering) */
  draggable?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: string | null;
  /** Header actions (buttons, etc.) */
  headerActions?: ReactNode;
  /** Custom header content (replaces default) */
  customHeader?: ReactNode;
  /** Additional class names */
  className?: string;
  /** Content padding */
  noPadding?: boolean;
}

export interface DashboardGridProps {
  /** Dashboard widgets */
  children: ReactNode;
  /** Gap between widgets */
  gap?: 'sm' | 'md' | 'lg';
  /** Padding around the grid */
  padding?: 'sm' | 'md' | 'lg' | 'none';
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Size Mappings
// ============================================================================

const gapClasses = {
  sm: 'gap-3 tablet:gap-4',
  md: 'gap-4 tablet:gap-6',
  lg: 'gap-6 tablet:gap-8',
};

const paddingClasses = {
  none: '',
  sm: 'p-3 tablet:p-4',
  md: 'p-4 tablet:p-6',
  lg: 'p-6 tablet:p-8',
};

// Widget size to column span mapping per layout
const sizeToSpan = {
  mobile: {
    small: 1,
    medium: 1,
    large: 1,
    full: 1,
  },
  'tablet-portrait': {
    small: 1,
    medium: 1,
    large: 2,
    full: 2,
  },
  'tablet-landscape': {
    small: 1,
    medium: 1,
    large: 2,
    full: 3,
  },
  desktop: {
    small: 1,
    medium: 1,
    large: 2,
    full: 4,
  },
};

// ============================================================================
// DashboardWidget Component
// ============================================================================

export function DashboardWidget({
  id,
  title,
  description,
  children,
  size = 'medium',
  expandable = false,
  isExpanded = false,
  onExpandChange,
  removable = false,
  onRemove,
  draggable = false,
  isLoading = false,
  error = null,
  headerActions,
  customHeader,
  className,
  noPadding = false,
}: DashboardWidgetProps) {
  const layout = useResponsiveLayout();
  const { isTouchDevice } = useOrientation();

  // Calculate column span based on layout and size
  const colSpan = useMemo(() => {
    const spans = sizeToSpan[layout] || sizeToSpan.desktop;
    return spans[size] || 1;
  }, [layout, size]);

  // If expanded, render as a modal/overlay
  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 tablet:p-8">
        <Card className="w-full h-full max-w-6xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
          {customHeader || (
            <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between border-b">
              <div>
                <CardTitle className="text-lg tablet:text-xl">{title}</CardTitle>
                {description && (
                  <CardDescription>{description}</CardDescription>
                )}
              </div>
              <div className="flex items-center gap-2">
                {headerActions}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onExpandChange?.(false)}
                  className="min-w-touch min-h-touch"
                >
                  <Minimize2 className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
          )}
          <CardContent className={cn(
            'flex-1 overflow-auto',
            !noPadding && 'p-4 tablet:p-6'
          )}>
            {error ? (
              <div className="text-red-500 text-center py-8">{error}</div>
            ) : (
              children
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'flex flex-col overflow-hidden transition-shadow hover:shadow-md',
        // Column span classes
        colSpan === 2 && 'tablet:col-span-2',
        colSpan === 3 && 'tablet-lg:col-span-3',
        colSpan === 4 && 'xl:col-span-4',
        // Touch device optimizations
        isTouchDevice && 'touch-manipulation',
        className
      )}
      data-widget-id={id}
      data-widget-size={size}
    >
      {customHeader || (
        <CardHeader className="flex-shrink-0 flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex items-start gap-2">
            {draggable && (
              <div className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-gray-400 hover:text-gray-600">
                <GripVertical className="h-4 w-4" />
              </div>
            )}
            <div>
              <CardTitle className="text-base tablet:text-lg font-semibold">
                {title}
              </CardTitle>
              {description && (
                <CardDescription className="text-sm">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {headerActions}
            {(expandable || removable) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-8 w-8 p-0',
                      isTouchDevice && 'min-w-touch min-h-touch'
                    )}
                  >
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Widget options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {expandable && (
                    <DropdownMenuItem
                      onClick={() => onExpandChange?.(true)}
                      className={cn(isTouchDevice && 'py-3')}
                    >
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Expand
                    </DropdownMenuItem>
                  )}
                  {removable && (
                    <DropdownMenuItem
                      onClick={onRemove}
                      className={cn('text-red-600', isTouchDevice && 'py-3')}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
      )}

      <CardContent className={cn(
        'flex-1',
        !noPadding && 'pt-0'
      )}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-8 text-sm">{error}</div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// DashboardGrid Component
// ============================================================================

export function DashboardGrid({
  children,
  gap = 'md',
  padding = 'md',
  className,
}: DashboardGridProps) {
  const layout = useResponsiveLayout();

  // Determine number of columns based on layout
  const gridCols = useMemo(() => {
    switch (layout) {
      case 'mobile':
        return 'grid-cols-1';
      case 'tablet-portrait':
        return 'grid-cols-2';
      case 'tablet-landscape':
        return 'grid-cols-3';
      case 'desktop':
        return 'grid-cols-4';
      default:
        return 'grid-cols-1 tablet:grid-cols-2 tablet-lg:grid-cols-3 xl:grid-cols-4';
    }
  }, [layout]);

  return (
    <div
      className={cn(
        'grid',
        gridCols,
        gapClasses[gap],
        paddingClasses[padding],
        // Auto-rows to handle varying heights
        'auto-rows-auto',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Dashboard Section Component
// ============================================================================

export interface DashboardSectionProps {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Section content */
  children: ReactNode;
  /** Additional class names */
  className?: string;
  /** Collapse on mobile */
  collapsibleOnMobile?: boolean;
}

export function DashboardSection({
  title,
  description,
  children,
  className,
}: DashboardSectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="px-4 tablet:px-6">
          {title && (
            <h2 className="text-lg tablet:text-xl font-semibold text-gray-900">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

// ============================================================================
// Quick Stats Bar (Optimized for tablets)
// ============================================================================

export interface QuickStatProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: ReactNode;
  onClick?: () => void;
}

export interface QuickStatsBarProps {
  stats: QuickStatProps[];
  className?: string;
}

export function QuickStatsBar({ stats, className }: QuickStatsBarProps) {
  const { isTouchDevice } = useOrientation();
  const layout = useResponsiveLayout();

  // On mobile, make stats scrollable horizontally
  const isMobile = layout === 'mobile';

  return (
    <div
      className={cn(
        'bg-white border-b',
        isMobile ? 'overflow-x-auto scrollbar-hide' : '',
        className
      )}
    >
      <div className={cn(
        'flex',
        isMobile ? 'min-w-max' : 'justify-around',
        'divide-x'
      )}>
        {stats.map((stat, index) => (
          <button
            key={index}
            onClick={stat.onClick}
            disabled={!stat.onClick}
            className={cn(
              'flex-1 flex items-center justify-center gap-3 py-3 px-4 tablet:px-6',
              'transition-colors',
              stat.onClick && 'hover:bg-gray-50 cursor-pointer',
              !stat.onClick && 'cursor-default',
              isTouchDevice && 'min-h-touch',
              isMobile && 'min-w-[120px]'
            )}
          >
            {stat.icon && (
              <div className="text-gray-400">{stat.icon}</div>
            )}
            <div className="text-center">
              <div className="text-xl tablet:text-2xl font-bold text-gray-900">
                {stat.value}
              </div>
              <div className="text-xs tablet:text-sm text-gray-500">
                {stat.label}
              </div>
            </div>
            {stat.trend && (
              <div className={cn(
                'text-xs font-medium',
                stat.trend.direction === 'up' && 'text-green-600',
                stat.trend.direction === 'down' && 'text-red-600',
                stat.trend.direction === 'neutral' && 'text-gray-500'
              )}>
                {stat.trend.direction === 'up' && '+'}
                {stat.trend.value}%
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default DashboardGrid;
