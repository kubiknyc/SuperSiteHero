/**
 * ListDetailView Component
 *
 * A responsive master-detail layout optimized for tablet viewports.
 * - Desktop/Tablet Landscape: Side-by-side list and detail panels
 * - Tablet Portrait: Stacked with slide-over detail panel
 * - Mobile: Full-screen views with navigation
 *
 * @example
 * <ListDetailView
 *   list={<ProjectList onSelect={setSelectedId} />}
 *   detail={selectedId ? <ProjectDetail id={selectedId} /> : null}
 *   selectedId={selectedId}
 *   onBack={() => setSelectedId(null)}
 *   emptyState={<EmptyState message="Select a project" />}
 * />
 */

import { ReactNode, useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useTabletMode } from '@/hooks/useTabletMode'
import { Button } from '@/components/ui/button'
import { ArrowLeft, X } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface ListDetailViewProps {
  /** The list panel content */
  list: ReactNode
  /** The detail panel content */
  detail: ReactNode | null
  /** Currently selected item ID (controls panel visibility) */
  selectedId?: string | null
  /** Callback when back/close is pressed in detail panel */
  onBack?: () => void
  /** Empty state to show when no item is selected (desktop/tablet landscape) */
  emptyState?: ReactNode
  /** Custom width for list panel (default: '320px' for tablet, '400px' for desktop) */
  listWidth?: string
  /** Custom min-width for detail panel */
  detailMinWidth?: string
  /** Header content for the list panel */
  listHeader?: ReactNode
  /** Header content for the detail panel */
  detailHeader?: ReactNode
  /** Title shown in detail panel header on mobile */
  detailTitle?: string
  /** Show a divider between panels */
  showDivider?: boolean
  /** Additional className for the container */
  className?: string
  /** Whether the detail panel is loading */
  isLoading?: boolean
  /** Loading skeleton for detail panel */
  loadingSkeleton?: ReactNode
}

// ============================================================================
// Default Empty State
// ============================================================================

function DefaultEmptyState() {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <p className="text-sm">Select an item to view details</p>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ListDetailView({
  list,
  detail,
  selectedId,
  onBack,
  emptyState = <DefaultEmptyState />,
  listWidth,
  detailMinWidth = '400px',
  listHeader,
  detailHeader,
  detailTitle,
  showDivider = true,
  className,
  isLoading = false,
  loadingSkeleton,
}: ListDetailViewProps) {
  const { isTablet, isLandscape, isPortrait, isTouchDevice, viewportWidth } = useTabletMode()

  // Mobile is when viewport is less than 768px (tablet min breakpoint)
  const isMobile = viewportWidth < 768

  // Track if detail is visible (for mobile/portrait transitions)
  const [showDetail, setShowDetail] = useState(false)

  // Sync showDetail with selectedId
  useEffect(() => {
    if (selectedId) {
      setShowDetail(true)
    }
  }, [selectedId])

  // Handle back navigation
  const handleBack = useCallback(() => {
    setShowDetail(false)
    // Small delay to allow animation before clearing selection
    setTimeout(() => {
      onBack?.()
    }, 200)
  }, [onBack])

  // Handle keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDetail && (isMobile || isPortrait)) {
        handleBack()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showDetail, isMobile, isPortrait, handleBack])

  // Determine layout mode
  const isSideBySide = !isMobile && (!isTablet || isLandscape)
  const isStackedWithSlide = isTablet && isPortrait
  // Note: isMobile triggers full-screen mode (handled by the final return)

  // Calculate list width based on viewport
  const computedListWidth = listWidth ?? (isTablet ? '320px' : '400px')

  // Render detail panel content
  const renderDetailContent = () => {
    if (isLoading && loadingSkeleton) {
      return loadingSkeleton
    }
    if (!detail && !selectedId) {
      return emptyState
    }
    return detail
  }

  // -------------------------------------------------------------------------
  // Side-by-side layout (Desktop / Tablet Landscape)
  // -------------------------------------------------------------------------
  if (isSideBySide) {
    return (
      <div className={cn('flex h-full', className)}>
        {/* List Panel */}
        <div
          className={cn(
            'flex flex-col border-r border-border bg-card',
            'overflow-hidden flex-shrink-0'
          )}
          style={{ width: computedListWidth }}
        >
          {listHeader && (
            <div className="flex-shrink-0 border-b border-border">
              {listHeader}
            </div>
          )}
          <div className="flex-1 overflow-y-auto">{list}</div>
        </div>

        {/* Divider */}
        {showDivider && (
          <div className="w-px bg-border flex-shrink-0" />
        )}

        {/* Detail Panel */}
        <div
          className="flex-1 flex flex-col overflow-hidden bg-background"
          style={{ minWidth: detailMinWidth }}
        >
          {detailHeader && selectedId && (
            <div className="flex-shrink-0 border-b border-border">
              {detailHeader}
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            {renderDetailContent()}
          </div>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Stacked with slide-over detail (Tablet Portrait)
  // -------------------------------------------------------------------------
  if (isStackedWithSlide) {
    return (
      <div className={cn('relative h-full', className)}>
        {/* List Panel (always visible) */}
        <div className="h-full flex flex-col bg-card">
          {listHeader && (
            <div className="flex-shrink-0 border-b border-border">
              {listHeader}
            </div>
          )}
          <div className="flex-1 overflow-y-auto">{list}</div>
        </div>

        {/* Detail Panel (slide-over from right) */}
        <div
          className={cn(
            'fixed inset-y-0 right-0 w-full max-w-lg bg-background shadow-xl',
            'transform transition-transform duration-300 ease-out z-40',
            showDetail && selectedId ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          {/* Detail Header */}
          <div className="sticky top-0 z-10 bg-background border-b border-border">
            <div className="flex items-center gap-3 p-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className={cn(
                  'flex-shrink-0',
                  isTouchDevice && 'h-11 w-11'
                )}
              >
                <X className="h-5 w-5" />
              </Button>
              {detailTitle && (
                <h2 className="font-semibold text-lg truncate">{detailTitle}</h2>
              )}
              {detailHeader}
            </div>
          </div>

          {/* Detail Content */}
          <div className="overflow-y-auto h-[calc(100%-65px)]">
            {renderDetailContent()}
          </div>
        </div>

        {/* Backdrop */}
        {showDetail && selectedId && (
          <div
            className="fixed inset-0 bg-black/30 z-30 transition-opacity"
            onClick={handleBack}
            aria-hidden="true"
          />
        )}
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Full-screen views (Mobile)
  // -------------------------------------------------------------------------
  return (
    <div className={cn('h-full', className)}>
      {/* List View */}
      <div
        className={cn(
          'h-full flex flex-col bg-card',
          showDetail && selectedId && 'hidden'
        )}
      >
        {listHeader && (
          <div className="flex-shrink-0 border-b border-border">
            {listHeader}
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{list}</div>
      </div>

      {/* Detail View */}
      <div
        className={cn(
          'h-full flex flex-col bg-background',
          !(showDetail && selectedId) && 'hidden'
        )}
      >
        {/* Detail Header with back button */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center gap-3 p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className={cn(
                'flex-shrink-0',
                isTouchDevice && 'h-11 w-11'
              )}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {detailTitle && (
              <h2 className="font-semibold text-lg truncate">{detailTitle}</h2>
            )}
            {detailHeader}
          </div>
        </div>

        {/* Detail Content */}
        <div className="flex-1 overflow-y-auto">
          {renderDetailContent()}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Hook for managing list-detail state
// ============================================================================

export interface UseListDetailOptions {
  /** Initial selected ID */
  initialId?: string | null
  /** Callback when selection changes */
  onSelectionChange?: (id: string | null) => void
}

export function useListDetail(options: UseListDetailOptions = {}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    options.initialId ?? null
  )

  const select = useCallback(
    (id: string) => {
      setSelectedId(id)
      options.onSelectionChange?.(id)
    },
    [options]
  )

  const deselect = useCallback(() => {
    setSelectedId(null)
    options.onSelectionChange?.(null)
  }, [options])

  const toggle = useCallback(
    (id: string) => {
      const newId = selectedId === id ? null : id
      setSelectedId(newId)
      options.onSelectionChange?.(newId)
    },
    [selectedId, options]
  )

  return {
    selectedId,
    select,
    deselect,
    toggle,
    isSelected: (id: string) => selectedId === id,
    hasSelection: selectedId !== null,
  }
}

// ============================================================================
// Prebuilt Panel Components
// ============================================================================

export interface ListPanelHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export function ListPanelHeader({
  title,
  subtitle,
  action,
  className,
}: ListPanelHeaderProps) {
  return (
    <div className={cn('p-4 flex items-center justify-between', className)}>
      <div>
        <h2 className="font-semibold text-lg">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export interface DetailPanelHeaderProps {
  title?: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}

export function DetailPanelHeader({
  title,
  subtitle,
  actions,
  className,
}: DetailPanelHeaderProps) {
  return (
    <div className={cn('p-4 flex items-center justify-between', className)}>
      <div className="min-w-0 flex-1">
        {title && <h2 className="font-semibold text-lg truncate">{title}</h2>}
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex-shrink-0 ml-4">{actions}</div>}
    </div>
  )
}

export default ListDetailView
