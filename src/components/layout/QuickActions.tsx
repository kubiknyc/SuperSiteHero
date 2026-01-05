// File: /src/components/layout/QuickActions.tsx
// Quick action buttons for common tasks
// Part of the v2 desktop layout redesign

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
  AlertCircle,
} from 'lucide-react'

interface QuickAction {
  label: string
  icon: typeof Camera
  path: string
  color: string
  bgColor: string
  hoverColor: string
}

const defaultActions: QuickAction[] = [
  {
    label: 'Take Photo',
    icon: Camera,
    path: '/photo-progress/capture',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    hoverColor: 'hover:bg-blue-100 dark:hover:bg-blue-900',
  },
  {
    label: 'Daily Report',
    icon: ClipboardList,
    path: '/daily-reports/new',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    hoverColor: 'hover:bg-emerald-100 dark:hover:bg-emerald-900',
  },
  {
    label: 'Punch Item',
    icon: ListChecks,
    path: '/punch-lists/new',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
    hoverColor: 'hover:bg-amber-100 dark:hover:bg-amber-900',
  },
  {
    label: 'Inspection',
    icon: FileCheck,
    path: '/inspections/new',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    hoverColor: 'hover:bg-purple-100 dark:hover:bg-purple-900',
  },
]

interface QuickActionsProps {
  actions?: QuickAction[]
  projectId?: string
  className?: string
  compact?: boolean
}

export function QuickActions({
  actions = defaultActions,
  projectId,
  className,
  compact = false,
}: QuickActionsProps) {
  // Append project ID to paths if available
  const getPath = (path: string) => {
    if (projectId && !path.includes('projectId')) {
      const separator = path.includes('?') ? '&' : '?'
      return `${path}${separator}projectId=${projectId}`
    }
    return path
  }

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
                'border-gray-200 dark:border-gray-700',
                'bg-white dark:bg-gray-800',
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
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
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
        'grid grid-cols-2 sm:grid-cols-4 gap-3',
        className
      )}
    >
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <Link
            key={action.label}
            to={getPath(action.path)}
            className={cn(
              'flex flex-col items-center justify-center',
              'p-4 rounded-xl',
              'bg-white dark:bg-gray-900',
              'border border-gray-200 dark:border-gray-800',
              'hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5',
              'transition-all duration-200',
              'group'
            )}
          >
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center mb-2.5',
                action.bgColor,
                action.hoverColor,
                'transition-colors duration-150'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5',
                  action.color,
                  'group-hover:scale-110 transition-transform duration-150'
                )}
              />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 text-center">
              {action.label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

// Extended quick actions for project context
export const projectQuickActions: QuickAction[] = [
  {
    label: 'Take Photo',
    icon: Camera,
    path: '/photo-progress/capture',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    hoverColor: 'hover:bg-blue-100 dark:hover:bg-blue-900',
  },
  {
    label: 'Daily Report',
    icon: ClipboardList,
    path: '/daily-reports/new',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    hoverColor: 'hover:bg-emerald-100 dark:hover:bg-emerald-900',
  },
  {
    label: 'Punch Item',
    icon: ListChecks,
    path: '/punch-lists/new',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
    hoverColor: 'hover:bg-amber-100 dark:hover:bg-amber-900',
  },
  {
    label: 'Inspection',
    icon: FileCheck,
    path: '/inspections/new',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    hoverColor: 'hover:bg-purple-100 dark:hover:bg-purple-900',
  },
  {
    label: 'New RFI',
    icon: FileQuestion,
    path: '/rfis/new',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950',
    hoverColor: 'hover:bg-rose-100 dark:hover:bg-rose-900',
  },
  {
    label: 'Schedule Meeting',
    icon: Calendar,
    path: '/meetings/new',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950',
    hoverColor: 'hover:bg-cyan-100 dark:hover:bg-cyan-900',
  },
]
