/**
 * TabletLayout Component
 *
 * Provides tablet-optimized layouts with:
 * - Master-detail pattern for list views
 * - Responsive grid systems
 * - Collapsible sidebars
 * - Portrait vs landscape optimizations
 * - Touch-optimized controls
 */

import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useOrientation, useResponsiveLayout } from '@/hooks/useOrientation';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  PanelLeftClose,
  PanelLeft,
  X,
} from 'lucide-react';

// ============================================================================
// Master-Detail Layout
// ============================================================================

export interface MasterDetailLayoutProps {
  /** The list/master panel content */
  masterPanel: ReactNode;
  /** The detail panel content - shown when an item is selected */
  detailPanel?: ReactNode;
  /** Whether an item is currently selected */
  hasSelection?: boolean;
  /** Callback when back button is pressed in detail view on mobile */
  onBack?: () => void;
  /** Title for the master panel */
  masterTitle?: string;
  /** Title for the detail panel */
  detailTitle?: string;
  /** Additional actions for the master panel header */
  masterActions?: ReactNode;
  /** Additional actions for the detail panel header */
  detailActions?: ReactNode;
  /** Whether the sidebar is collapsible */
  collapsible?: boolean;
  /** Custom width for the master panel */
  masterWidth?: string;
  /** Placeholder content when no item is selected */
  emptyDetailPlaceholder?: ReactNode;
  /** Additional class names */
  className?: string;
}

export function MasterDetailLayout({
  masterPanel,
  detailPanel,
  hasSelection = false,
  onBack,
  masterTitle,
  detailTitle,
  masterActions,
  detailActions,
  collapsible = true,
  masterWidth = 'w-80 tablet:w-[320px] tablet-lg:w-[360px]',
  emptyDetailPlaceholder,
  className,
}: MasterDetailLayoutProps) {
  const layout = useResponsiveLayout();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);

  const isMobile = layout === 'mobile';
  const isTabletPortrait = layout === 'tablet-portrait';
  const isTabletLandscape = layout === 'tablet-landscape' || layout === 'desktop';

  // Auto-show detail panel when selection changes on mobile
  useEffect(() => {
    if (isMobile && hasSelection) {
      setShowDetailOnMobile(true);
    }
  }, [isMobile, hasSelection]);

  const handleBack = useCallback(() => {
    setShowDetailOnMobile(false);
    onBack?.();
  }, [onBack]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  // Mobile: Full-screen views with navigation
  if (isMobile) {
    if (showDetailOnMobile && hasSelection) {
      return (
        <div className={cn('flex flex-col h-full', className)}>
          {/* Detail Header */}
          <div className="flex items-center gap-3 p-4 border-b bg-white sticky top-0 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="min-w-touch min-h-touch -ml-2"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Back to list</span>
            </Button>
            {detailTitle && (
              <h2 className="font-semibold text-lg flex-1 truncate">{detailTitle}</h2>
            )}
            {detailActions}
          </div>
          {/* Detail Content */}
          <div className="flex-1 overflow-auto">
            {detailPanel}
          </div>
        </div>
      );
    }

    return (
      <div className={cn('flex flex-col h-full', className)}>
        {/* Master Header */}
        {masterTitle && (
          <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
            <h2 className="font-semibold text-lg">{masterTitle}</h2>
            {masterActions}
          </div>
        )}
        {/* Master Content */}
        <div className="flex-1 overflow-auto">
          {masterPanel}
        </div>
      </div>
    );
  }

  // Tablet Portrait: Overlay detail panel
  if (isTabletPortrait) {
    return (
      <div className={cn('relative flex h-full', className)}>
        {/* Master Panel */}
        <div className={cn(
          'flex flex-col h-full bg-white border-r transition-all duration-300',
          hasSelection && !isCollapsed ? 'w-[280px]' : 'flex-1'
        )}>
          {/* Master Header */}
          {masterTitle && (
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-lg">{masterTitle}</h2>
              <div className="flex items-center gap-2">
                {masterActions}
                {collapsible && hasSelection && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleCollapse}
                    className="min-w-touch min-h-touch"
                  >
                    {isCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                  </Button>
                )}
              </div>
            </div>
          )}
          {/* Master Content */}
          <div className="flex-1 overflow-auto">
            {masterPanel}
          </div>
        </div>

        {/* Detail Panel - Slide in from right on tablet portrait */}
        {hasSelection && !isCollapsed && (
          <div className={cn(
            'flex flex-col h-full bg-white flex-1 min-w-detail-panel',
            'animate-in slide-in-from-right-4 duration-300'
          )}>
            {/* Detail Header */}
            <div className="flex items-center justify-between p-4 border-b">
              {detailTitle && (
                <h2 className="font-semibold text-lg flex-1 truncate">{detailTitle}</h2>
              )}
              <div className="flex items-center gap-2">
                {detailActions}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="min-w-touch min-h-touch"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            {/* Detail Content */}
            <div className="flex-1 overflow-auto">
              {detailPanel}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Tablet Landscape / Desktop: Side-by-side layout
  return (
    <div className={cn('flex h-full', className)}>
      {/* Master Panel */}
      <div className={cn(
        'flex flex-col h-full bg-white border-r transition-all duration-300',
        isCollapsed ? 'w-0 overflow-hidden' : masterWidth,
        'flex-shrink-0'
      )}>
        {/* Master Header */}
        {masterTitle && !isCollapsed && (
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold text-lg">{masterTitle}</h2>
            <div className="flex items-center gap-2">
              {masterActions}
              {collapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCollapse}
                  className="min-w-touch min-h-touch"
                >
                  <PanelLeftClose className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        )}
        {/* Master Content */}
        {!isCollapsed && (
          <div className="flex-1 overflow-auto">
            {masterPanel}
          </div>
        )}
      </div>

      {/* Collapse Toggle when collapsed */}
      {isCollapsed && collapsible && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
          className="absolute left-2 top-4 z-10 min-w-touch min-h-touch"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
      )}

      {/* Detail Panel */}
      <div className="flex flex-col flex-1 h-full bg-gray-50">
        {/* Detail Header */}
        {(detailTitle || detailActions) && (
          <div className="flex items-center justify-between p-4 border-b bg-white">
            {detailTitle && (
              <h2 className="font-semibold text-lg">{detailTitle}</h2>
            )}
            {detailActions}
          </div>
        )}
        {/* Detail Content */}
        <div className="flex-1 overflow-auto">
          {hasSelection ? detailPanel : (
            emptyDetailPlaceholder || (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Select an item to view details</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Responsive Grid Layout
// ============================================================================

export interface ResponsiveGridLayoutProps {
  /** Grid items */
  children: ReactNode;
  /** Minimum width for each grid item */
  minItemWidth?: string;
  /** Gap between items */
  gap?: string;
  /** Number of columns for different layouts */
  columns?: {
    mobile?: number;
    tabletPortrait?: number;
    tabletLandscape?: number;
    desktop?: number;
  };
  /** Additional class names */
  className?: string;
}

export function ResponsiveGridLayout({
  children,
  minItemWidth = '280px',
  gap = 'gap-4 tablet:gap-6',
  columns = {
    mobile: 1,
    tabletPortrait: 2,
    tabletLandscape: 3,
    desktop: 4,
  },
  className,
}: ResponsiveGridLayoutProps) {
  const layout = useResponsiveLayout();

  const getGridCols = () => {
    switch (layout) {
      case 'mobile':
        return `grid-cols-${columns.mobile || 1}`;
      case 'tablet-portrait':
        return `grid-cols-${columns.tabletPortrait || 2}`;
      case 'tablet-landscape':
        return `grid-cols-${columns.tabletLandscape || 3}`;
      case 'desktop':
        return `grid-cols-${columns.desktop || 4}`;
      default:
        return 'grid-cols-1';
    }
  };

  return (
    <div
      className={cn(
        'grid',
        gap,
        className
      )}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Collapsible Sidebar Layout
// ============================================================================

export interface CollapsibleSidebarLayoutProps {
  /** Sidebar content */
  sidebar: ReactNode;
  /** Main content */
  children: ReactNode;
  /** Whether sidebar is open */
  isOpen?: boolean;
  /** Callback when sidebar state changes */
  onOpenChange?: (open: boolean) => void;
  /** Sidebar position */
  position?: 'left' | 'right';
  /** Sidebar width when expanded */
  sidebarWidth?: string;
  /** Whether to show overlay on mobile/tablet portrait */
  showOverlay?: boolean;
  /** Additional class names */
  className?: string;
}

export function CollapsibleSidebarLayout({
  sidebar,
  children,
  isOpen = true,
  onOpenChange,
  position = 'left',
  sidebarWidth = 'w-80',
  showOverlay = true,
  className,
}: CollapsibleSidebarLayoutProps) {
  const layout = useResponsiveLayout();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const isMobileOrPortrait = layout === 'mobile' || layout === 'tablet-portrait';

  // Handle click outside on mobile/portrait
  useEffect(() => {
    if (!isMobileOrPortrait || !isOpen || !showOverlay) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onOpenChange?.(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileOrPortrait, isOpen, showOverlay, onOpenChange]);

  const sidebarClasses = cn(
    'flex-shrink-0 bg-white transition-all duration-300',
    position === 'left' ? 'border-r' : 'border-l',
    isOpen ? sidebarWidth : 'w-0 overflow-hidden',
    isMobileOrPortrait && isOpen && 'fixed inset-y-0 z-40',
    isMobileOrPortrait && position === 'left' && 'left-0',
    isMobileOrPortrait && position === 'right' && 'right-0',
  );

  const overlayClasses = cn(
    'fixed inset-0 bg-black/50 z-30 transition-opacity duration-300',
    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
  );

  return (
    <div className={cn('flex h-full', position === 'right' && 'flex-row-reverse', className)}>
      {/* Overlay for mobile/portrait */}
      {isMobileOrPortrait && showOverlay && (
        <div
          className={overlayClasses}
          onClick={() => onOpenChange?.(false)}
        />
      )}

      {/* Sidebar */}
      <div ref={sidebarRef} className={sidebarClasses}>
        {sidebar}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Split View Layout (Two-pane horizontal split)
// ============================================================================

export interface SplitViewLayoutProps {
  /** Top/Left panel content */
  primaryPanel: ReactNode;
  /** Bottom/Right panel content */
  secondaryPanel: ReactNode;
  /** Split direction - horizontal is left/right, vertical is top/bottom */
  direction?: 'horizontal' | 'vertical';
  /** Default split ratio (0-1) */
  defaultRatio?: number;
  /** Whether the split is resizable */
  resizable?: boolean;
  /** Minimum size for primary panel */
  minPrimarySize?: number;
  /** Minimum size for secondary panel */
  minSecondarySize?: number;
  /** Additional class names */
  className?: string;
}

export function SplitViewLayout({
  primaryPanel,
  secondaryPanel,
  direction = 'horizontal',
  defaultRatio = 0.5,
  resizable = true,
  minPrimarySize = 200,
  minSecondarySize = 200,
  className,
}: SplitViewLayoutProps) {
  const layout = useResponsiveLayout();
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(defaultRatio);
  const [isDragging, setIsDragging] = useState(false);

  const isHorizontal = direction === 'horizontal';
  const isMobile = layout === 'mobile';

  // On mobile, stack vertically regardless of direction prop
  const effectiveDirection = isMobile ? 'vertical' : direction;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!resizable) return;
    e.preventDefault();
    setIsDragging(true);
  }, [resizable]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const containerSize = effectiveDirection === 'horizontal' ? rect.width : rect.height;
      const position = effectiveDirection === 'horizontal'
        ? e.clientX - rect.left
        : e.clientY - rect.top;

      const newRatio = Math.max(
        minPrimarySize / containerSize,
        Math.min(
          (containerSize - minSecondarySize) / containerSize,
          position / containerSize
        )
      );

      setRatio(newRatio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, effectiveDirection, minPrimarySize, minSecondarySize]);

  const primaryStyle = {
    [effectiveDirection === 'horizontal' ? 'width' : 'height']:
      isMobile ? '100%' : `${ratio * 100}%`,
  };

  const secondaryStyle = {
    [effectiveDirection === 'horizontal' ? 'width' : 'height']:
      isMobile ? '100%' : `${(1 - ratio) * 100}%`,
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex h-full',
        effectiveDirection === 'vertical' && 'flex-col',
        className
      )}
    >
      {/* Primary Panel */}
      <div
        className={cn(
          'overflow-auto',
          isMobile && effectiveDirection === 'vertical' && 'flex-1'
        )}
        style={primaryStyle}
      >
        {primaryPanel}
      </div>

      {/* Resizer */}
      {resizable && !isMobile && (
        <div
          className={cn(
            'flex-shrink-0 bg-gray-200 hover:bg-blue-400 transition-colors',
            effectiveDirection === 'horizontal' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize',
            isDragging && 'bg-blue-500'
          )}
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Secondary Panel */}
      <div
        className={cn(
          'overflow-auto',
          isMobile && effectiveDirection === 'vertical' && 'flex-1'
        )}
        style={secondaryStyle}
      >
        {secondaryPanel}
      </div>
    </div>
  );
}

// ============================================================================
// Tablet Form Layout
// ============================================================================

export interface TabletFormLayoutProps {
  /** Form content */
  children: ReactNode;
  /** Whether to use multi-column layout on tablets */
  multiColumn?: boolean;
  /** Maximum width for the form */
  maxWidth?: string;
  /** Additional class names */
  className?: string;
}

export function TabletFormLayout({
  children,
  multiColumn = true,
  maxWidth = 'max-w-tablet-form tablet-lg:max-w-4xl',
  className,
}: TabletFormLayoutProps) {
  const layout = useResponsiveLayout();

  const shouldUseMultiColumn = multiColumn && (
    layout === 'tablet-landscape' || layout === 'desktop'
  );

  return (
    <div className={cn(
      'mx-auto px-4 tablet:px-tablet-gutter',
      maxWidth,
      className
    )}>
      <div className={cn(
        shouldUseMultiColumn && 'grid grid-cols-tablet-form gap-6'
      )}>
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Touch-Optimized Container
// ============================================================================

export interface TouchOptimizedContainerProps {
  /** Content */
  children: ReactNode;
  /** Whether to add extra padding for touch targets */
  padForTouch?: boolean;
  /** Additional class names */
  className?: string;
}

export function TouchOptimizedContainer({
  children,
  padForTouch = true,
  className,
}: TouchOptimizedContainerProps) {
  const { isTouchDevice } = useOrientation();

  return (
    <div className={cn(
      isTouchDevice && padForTouch && 'py-2',
      '[&_button]:min-h-touch [&_button]:min-w-touch',
      '[&_a]:min-h-touch',
      '[&_input]:min-h-touch',
      '[&_select]:min-h-touch',
      className
    )}>
      {children}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default {
  MasterDetailLayout,
  ResponsiveGridLayout,
  CollapsibleSidebarLayout,
  SplitViewLayout,
  TabletFormLayout,
  TouchOptimizedContainer,
};
