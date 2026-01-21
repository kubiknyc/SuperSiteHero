// File: /src/components/layout/QuickActions.tsx
// Quick action buttons for common tasks
// Part of the v2 desktop layout redesign
// Enhanced with Industrial Precision design system
// Now supports role-based quick actions

import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Camera,
  ClipboardList,
  ListChecks,
  FileCheck,
  Plus,
  Calendar,
  FileQuestion,
  LucideIcon,
} from 'lucide-react'
import { useQuickActions } from '@/hooks/useRoleNavigation'
import type { QuickAction as RoleQuickAction } from '@/config/role-navigation'

// ============================================================================
// TYPES
// ============================================================================

export interface QuickAction {
  /** Unique identifier for the action */
  id: string
  /** Display label */
  label: string
  /** Icon component */
  icon: LucideIcon
  /** Navigation path */
  path: string
  /** Text color classes */
  color: string
  /** Background color classes */
  bgColor: string
  /** Hover background color classes */
  hoverColor: string
  /** Whether this action is only shown in project context */
  projectOnly?: boolean
}

// ============================================================================
// ACTION DEFINITIONS - Single source of truth
// ============================================================================

/**
 * All available quick actions
 * Actions can be filtered by context (project vs global)
 */
const ALL_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'photo',
    label: 'Take Photo',
    icon: Camera,
    path: '/photo-progress/capture',
    color: 'text-info dark:text-info',
    bgColor: 'bg-info/10 dark:bg-info/20',
    hoverColor: 'hover:bg-info/20 dark:hover:bg-info/30',
  },
  {
    id: 'daily-report',
    label: 'Daily Report',
    icon: ClipboardList,
    path: '/daily-reports/new',
    color: 'text-success dark:text-success',
    bgColor: 'bg-success/10 dark:bg-success/20',
    hoverColor: 'hover:bg-success/20 dark:hover:bg-success/30',
  },
  {
    id: 'punch-item',
    label: 'Punch Item',
    icon: ListChecks,
    path: '/punch-lists/new',
    color: 'text-warning dark:text-warning',
    bgColor: 'bg-warning/10 dark:bg-warning/20',
    hoverColor: 'hover:bg-warning/20 dark:hover:bg-warning/30',
  },
  {
    id: 'inspection',
    label: 'Inspection',
    icon: FileCheck,
    path: '/inspections/new',
    color: 'text-primary dark:text-primary',
    bgColor: 'bg-primary/10 dark:bg-primary/20',
    hoverColor: 'hover:bg-primary/20 dark:hover:bg-primary/30',
  },
  {
    id: 'rfi',
    label: 'New RFI',
    icon: FileQuestion,
    path: '/rfis/new',
    color: 'text-destructive dark:text-destructive',
    bgColor: 'bg-destructive/10 dark:bg-destructive/20',
    hoverColor: 'hover:bg-destructive/20 dark:hover:bg-destructive/30',
    projectOnly: true,
  },
  {
    id: 'meeting',
    label: 'Schedule Meeting',
    icon: Calendar,
    path: '/meetings/new',
    color: 'text-info dark:text-info',
    bgColor: 'bg-info/10 dark:bg-info/20',
    hoverColor: 'hover:bg-info/20 dark:hover:bg-info/30',
    projectOnly: true,
  },
]

/**
 * Default actions shown without project context
 */
const DEFAULT_ACTION_IDS = ['photo', 'daily-report', 'punch-item', 'inspection']

/**
 * Get default quick actions (no project context)
 */
export function getDefaultActions(): QuickAction[] {
  return ALL_QUICK_ACTIONS.filter((action) =>
    DEFAULT_ACTION_IDS.includes(action.id)
  )
}

/**
 * Get all quick actions including project-only ones
 */
export function getProjectActions(): QuickAction[] {
  return ALL_QUICK_ACTIONS
}

/**
 * Get actions filtered by IDs
 */
export function getActionsByIds(ids: string[]): QuickAction[] {
  return ALL_QUICK_ACTIONS.filter((action) => ids.includes(action.id))
}

// Legacy export for backward compatibility
const defaultActions = getDefaultActions()

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface QuickActionsProps {
  /** Custom actions to display (defaults to defaultActions) */
  actions?: QuickAction[]
  /** Project ID to append to action paths */
  projectId?: string
  /** Additional CSS classes */
  className?: string
  /** Use compact inline style */
  compact?: boolean
}

// ============================================================================
// URL HELPER
// ============================================================================

/**
 * Append project ID to a path as query parameter
 * Uses URLSearchParams for proper URL encoding
 */
function appendProjectId(path: string, projectId?: string): string {
  if (!projectId) {
    return path
  }

  // Don't add if already present
  if (path.includes('projectId=')) {
    return path
  }

  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}projectId=${encodeURIComponent(projectId)}`
}

// ============================================================================
// COMPONENT
// ============================================================================

export function QuickActions({
  actions = defaultActions,
  projectId,
  className,
  compact = false,
}: QuickActionsProps) {
  // Helper to build action paths
  const getPath = (path: string) => appendProjectId(path, projectId)

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.label}
              to={getPath(action.path)}
              className={cn(
                'flex items-center gap-2 px-3 py-2',
                'rounded-lg border',
                'border-border',
                'bg-card',
                'hover:border-primary/50 hover:shadow-sm',
                'transition-all duration-150',
                'group'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-md flex items-center justify-center',
                  action.bgColor
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', action.color)} />
              </div>
              <span className="text-sm font-medium text-foreground">
                {action.label}
              </span>
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 sm:grid-cols-4 gap-4',
        className
      )}
    >
      {actions.map((action, index) => {
        const Icon = action.icon
        return (
          <Link
            key={action.label}
            to={getPath(action.path)}
            className={cn(
              'relative flex flex-col items-center justify-center',
              'p-5 rounded-2xl',
              // Glass morphism background
              'bg-white/70 dark:bg-white/[0.04]',
              'backdrop-blur-sm',
              // Ring border
              'ring-1 ring-border',
              // Layered shadow
              'shadow-sm',
              // Hover effects
              'hover:bg-white/90 dark:hover:bg-white/[0.08]',
              'hover:ring-border/80',
              'hover:shadow-lg hover:-translate-y-1',
              // Premium spring transition
              'transition-all duration-200',
              '[transition-timing-function:cubic-bezier(0.32,0.72,0,1)]',
              'group',
              // Active state
              'active:scale-[0.97]'
            )}
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            {/* Icon container with glow effect */}
            <div
              className={cn(
                'relative w-12 h-12 rounded-xl flex items-center justify-center mb-3',
                action.bgColor,
                // Smooth transition
                'transition-all duration-200',
                'group-hover:scale-110 group-hover:rotate-3'
              )}
            >
              <Icon
                className={cn(
                  'w-5.5 h-5.5',
                  action.color,
                  'transition-transform duration-200'
                )}
              />
              {/* Glow effect on hover */}
              <div
                className={cn(
                  'absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100',
                  'transition-opacity duration-300',
                  'blur-md',
                  action.bgColor
                )}
              />
            </div>
            <span className="text-sm font-semibold text-foreground text-center">
              {action.label}
            </span>

            {/* Plus icon indicator */}
            <div className={cn(
              'absolute top-3 right-3 w-5 h-5 rounded-full',
              'bg-muted',
              'flex items-center justify-center',
              'opacity-0 group-hover:opacity-100',
              'scale-75 group-hover:scale-100',
              'transition-all duration-200'
            )}>
              <Plus className="w-3 h-3 text-muted-foreground" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// Legacy export for backward compatibility - use getProjectActions() instead
export const projectQuickActions = getProjectActions()

// ============================================================================
// ROLE-BASED QUICK ACTIONS
// ============================================================================

/**
 * Convert role-based quick action to component format
 */
function convertRoleAction(action: RoleQuickAction): QuickAction {
  // Map solid color classes to semantic color scheme
  const colorMap: Record<string, { color: string; bgColor: string; hoverColor: string }> = {
    'bg-blue-500': {
      color: 'text-info dark:text-info',
      bgColor: 'bg-info/10 dark:bg-info/20',
      hoverColor: 'hover:bg-info/20 dark:hover:bg-info/30',
    },
    'bg-green-500': {
      color: 'text-success dark:text-success',
      bgColor: 'bg-success/10 dark:bg-success/20',
      hoverColor: 'hover:bg-success/20 dark:hover:bg-success/30',
    },
    'bg-orange-500': {
      color: 'text-warning dark:text-warning',
      bgColor: 'bg-warning/10 dark:bg-warning/20',
      hoverColor: 'hover:bg-warning/20 dark:hover:bg-warning/30',
    },
    'bg-purple-500': {
      color: 'text-primary dark:text-primary',
      bgColor: 'bg-primary/10 dark:bg-primary/20',
      hoverColor: 'hover:bg-primary/20 dark:hover:bg-primary/30',
    },
    'bg-red-500': {
      color: 'text-destructive dark:text-destructive',
      bgColor: 'bg-destructive/10 dark:bg-destructive/20',
      hoverColor: 'hover:bg-destructive/20 dark:hover:bg-destructive/30',
    },
    'bg-gray-500': {
      color: 'text-muted-foreground dark:text-muted-foreground',
      bgColor: 'bg-muted dark:bg-muted',
      hoverColor: 'hover:bg-muted/80 dark:hover:bg-muted/80',
    },
  }

  const colors = colorMap[action.color] || colorMap['bg-blue-500']

  return {
    id: action.id,
    label: action.label,
    icon: action.icon,
    path: action.path,
    ...colors,
  }
}

/**
 * RoleBasedQuickActions - Uses the current user's role-specific actions
 */
interface RoleBasedQuickActionsProps {
  /** Project ID to append to action paths */
  projectId?: string
  /** Additional CSS classes */
  className?: string
  /** Use compact inline style */
  compact?: boolean
}

export function RoleBasedQuickActions({
  projectId,
  className,
  compact = false,
}: RoleBasedQuickActionsProps) {
  const roleActions = useQuickActions()
  const actions = roleActions.map(convertRoleAction)

  return (
    <QuickActions
      actions={actions}
      projectId={projectId}
      className={className}
      compact={compact}
    />
  )
}
