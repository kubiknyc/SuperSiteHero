// File: /src/components/layout/ActionPanel.tsx
// Slide-out panel for action items requiring user attention
// Part of the v2 desktop layout redesign

import { useEffect, useRef } from 'react'
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
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
} from 'lucide-react'

interface ActionPanelProps {
  open: boolean
  onClose: () => void
  projectId?: string
  className?: string
}

export function ActionPanel({
  open,
  onClose,
  projectId,
  className,
}: ActionPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { data: actionItems, isLoading } = useActionItems(projectId)

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        open &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onClose])

  // Get priority badge variant
  const getPriorityVariant = (
    priority: string,
    isOverdue: boolean
  ): 'destructive' | 'secondary' | 'outline' | 'default' => {
    if (isOverdue) return 'destructive'
    if (priority === 'urgent') return 'destructive'
    if (priority === 'high') return 'secondary'
    return 'outline'
  }

  // Get type label
  const getTypeLabel = (type: string, isOverdue: boolean) => {
    if (isOverdue) return 'Overdue'
    return type.replace('_', ' ')
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <aside
        ref={panelRef}
        className={cn(
          'fixed top-16 right-0 z-50',
          'w-80 h-[calc(100vh-4rem)]',
          'bg-white dark:bg-gray-900',
          'border-l border-gray-200 dark:border-gray-800',
          'shadow-xl',
          'transform transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Action Required
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {actionItems && actionItems.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {actionItems.length}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <p className="mt-3 text-sm text-gray-500">Loading items...</p>
            </div>
          ) : actionItems && actionItems.length > 0 ? (
            <div className="space-y-2">
              {actionItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.link}
                  onClick={onClose}
                  className={cn(
                    'block p-3 rounded-xl',
                    'bg-gray-50 dark:bg-gray-800/50',
                    'border border-transparent',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    'hover:border-gray-200 dark:hover:border-gray-700',
                    'transition-all duration-150',
                    'group'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Priority badge */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge
                          variant={getPriorityVariant(
                            item.priority,
                            item.isOverdue
                          )}
                          className="text-[10px] uppercase font-semibold"
                        >
                          {getTypeLabel(item.type, item.isOverdue)}
                        </Badge>
                        {item.isOverdue && (
                          <span className="flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400">
                            <Clock className="w-3 h-3" />
                            Overdue
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                        {item.title}
                      </p>

                      {/* Project name */}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                        {item.projectName}
                      </p>

                      {/* Due date if available */}
                      {item.dueDate && (
                        <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Due {new Date(item.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1 group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}

              {/* View all link */}
              {actionItems.length > 5 && (
                <Link
                  to="/tasks"
                  onClick={onClose}
                  className="block text-center text-sm text-primary font-medium py-3 hover:underline"
                >
                  View all {actionItems.length} items
                </Link>
              )}
            </div>
          ) : (
            // Empty state
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                All caught up!
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No items need your attention
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <Button
            variant="outline"
            className="w-full"
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
}
