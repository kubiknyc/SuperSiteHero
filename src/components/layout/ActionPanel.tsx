// File: /src/components/layout/ActionPanel.tsx
// Slide-out panel for action items requiring user attention
// Part of the v2 desktop layout redesign

import { useEffect, useRef, memo } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useActionItems } from '@/features/dashboard/hooks/useDashboardStats'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Bell,
  X,
  ChevronRight,
  Clock,
  Loader2,
  Shield,
} from 'lucide-react'

// ============================================================================
// HELPER FUNCTIONS - Defined outside component for stability
// ============================================================================

type BadgeVariant = 'destructive' | 'secondary' | 'outline' | 'default'

/**
 * Get badge variant based on priority and overdue status
 */
function getPriorityVariant(priority: string, isOverdue: boolean): BadgeVariant {
  if (isOverdue) {
    return 'destructive'
  }
  if (priority === 'urgent') {
    return 'destructive'
  }
  if (priority === 'high') {
    return 'secondary'
  }
  return 'outline'
}

/**
 * Get display label for action item type
 */
function getTypeLabel(type: string, isOverdue: boolean): string {
  if (isOverdue) {
    return 'Overdue'
  }
  return type.replace('_', ' ')
}

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

/**
 * Hook for handling escape key to close panel
 */
function useEscapeKey(open: boolean, onClose: () => void) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])
}

/**
 * Hook for handling click outside panel to close
 */
function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void
) {
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (open && ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [ref, open, onClose])
}

// ============================================================================
// PROPS
// ============================================================================

interface ActionPanelProps {
  open: boolean
  onClose: () => void
  projectId?: string
  className?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ActionPanel = memo(function ActionPanel({
  open,
  onClose,
  projectId,
  className,
}: ActionPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { data: actionItems, isLoading } = useActionItems(projectId)

  // Custom hooks for panel behavior
  useEscapeKey(open, onClose)
  useClickOutside(panelRef, open, onClose)

  return (
    <>
      {/* Backdrop with blur */}
      {open && (
        <div
          className={cn(
            'fixed inset-0 z-40',
            'bg-black/20 dark:bg-black/50',
            'backdrop-blur-sm',
            'transition-all duration-300'
          )}
          aria-hidden="true"
        />
      )}

      {/* Panel with premium styling */}
      <aside
        ref={panelRef}
        className={cn(
          'fixed top-[72px] right-0 z-50',
          'w-[340px] h-[calc(100vh-72px)]',
          // Glass morphism background
          'bg-white/95 dark:bg-slate-900/95',
          'backdrop-blur-xl',
          '[backdrop-filter:blur(20px)_saturate(180%)]',
          // Border and shadow
          'border-l border-gray-200/60 dark:border-white/[0.06]',
          'shadow-[-8px_0_32px_rgba(0,0,0,0.1)]',
          'dark:shadow-[-8px_0_32px_rgba(0,0,0,0.4)]',
          // Smooth spring transition
          'transform transition-all duration-300',
          '[transition-timing-function:cubic-bezier(0.32,0.72,0,1)]',
          open ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        {/* Header with premium styling */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200/60 dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-9 h-9 rounded-xl',
              'bg-primary/10 dark:bg-primary/20',
              'flex items-center justify-center'
            )}>
              <Bell className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Action Required
              </h2>
              {actionItems && actionItems.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {actionItems.length} items need attention
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className={cn(
              'w-9 h-9 rounded-xl',
              'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
              'hover:bg-gray-100/60 dark:hover:bg-white/[0.08]',
              'active:scale-95',
              'transition-all duration-200'
            )}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content with enhanced styling */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative w-12 h-12">
                <Loader2 className="w-12 h-12 animate-spin text-primary/30" />
                <Loader2 className="absolute inset-0 w-12 h-12 animate-spin text-primary" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-slate-400 font-medium">Loading items...</p>
            </div>
          ) : actionItems && actionItems.length > 0 ? (
            <div className="space-y-3">
              {actionItems.map((item, index) => (
                <Link
                  key={item.id}
                  to={item.link}
                  onClick={onClose}
                  className={cn(
                    'block p-4 rounded-xl',
                    // Glass background
                    'bg-gray-50/80 dark:bg-white/[0.03]',
                    'ring-1 ring-gray-200/50 dark:ring-white/[0.04]',
                    // Hover effects
                    'hover:bg-white dark:hover:bg-white/[0.06]',
                    'hover:ring-gray-300/60 dark:hover:ring-white/[0.08]',
                    'hover:shadow-md',
                    // Transition
                    'transition-all duration-200',
                    '[transition-timing-function:cubic-bezier(0.32,0.72,0,1)]',
                    'group'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Priority badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={getPriorityVariant(
                            item.priority,
                            item.isOverdue
                          )}
                          className="text-[10px] uppercase font-bold tracking-wide"
                        >
                          {getTypeLabel(item.type, item.isOverdue)}
                        </Badge>
                        {item.isOverdue && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-destructive dark:text-destructive bg-destructive/10 dark:bg-destructive/10 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            Overdue
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </p>

                      {/* Project name */}
                      <p className="mt-1.5 text-xs text-gray-500 dark:text-slate-400 truncate font-medium">
                        {item.projectName}
                      </p>

                      {/* Due date if available */}
                      {item.dueDate && (
                        <p className="mt-2 text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3" />
                          Due {new Date(item.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Arrow with animation */}
                    <ChevronRight className="w-4 h-4 text-gray-400 dark:text-slate-500 flex-shrink-0 mt-0.5 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}

              {/* View all link */}
              {actionItems.length > 5 && (
                <Link
                  to="/tasks"
                  onClick={onClose}
                  className={cn(
                    'flex items-center justify-center gap-2',
                    'text-sm text-primary font-semibold',
                    'py-3 mt-2 rounded-xl',
                    'hover:bg-primary/5 dark:hover:bg-primary/10',
                    'transition-colors duration-200'
                  )}
                >
                  View all {actionItems.length} items
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          ) : (
            // Empty state with premium styling
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className={cn(
                'w-20 h-20 rounded-2xl',
                'bg-gradient-to-br from-success-light to-success/20',
                'dark:from-success/20 dark:to-success/10',
                'flex items-center justify-center mb-5',
                'shadow-lg shadow-success/10'
              )}>
                <Shield className="w-10 h-10 text-success" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1.5 text-lg">
                All caught up!
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 max-w-[200px]">
                No items need your attention right now
              </p>
            </div>
          )}
        </div>

        {/* Footer with premium button */}
        <div className="p-5 border-t border-gray-200/60 dark:border-white/[0.06]">
          <Button
            variant="outline"
            className={cn(
              'w-full h-11 rounded-xl',
              'font-semibold',
              'border-gray-200 dark:border-white/10',
              'hover:bg-primary hover:text-white hover:border-primary',
              'hover:shadow-lg hover:shadow-primary/20',
              'active:scale-[0.98]',
              'transition-all duration-200'
            )}
            asChild
          >
            <Link to="/approvals" onClick={onClose}>
              View All Approvals
            </Link>
          </Button>
        </div>
      </aside>
    </>
  )
})
