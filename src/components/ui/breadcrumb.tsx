/**
 * Breadcrumb Component
 *
 * Provides navigation breadcrumbs for deep page hierarchies.
 * Essential for construction workflows where users navigate:
 * Project → Daily Reports → Report #123 → Edit
 *
 * Accessibility features:
 * - nav element with aria-label="Breadcrumb"
 * - aria-current="page" on current page
 * - Proper separator handling
 */

import * as React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBreadcrumb, BreadcrumbItem, BreadcrumbContext } from '@/hooks/useBreadcrumb'

interface BreadcrumbProps {
  /** Custom breadcrumb items (overrides auto-detection) */
  items?: BreadcrumbItem[]
  /** Show home icon as first item */
  showHome?: boolean
  /** Custom separator component */
  separator?: React.ReactNode
  /** Additional class names */
  className?: string
  /** Dynamic labels for route parameters (e.g., { projectId: 'Downtown Tower' }) */
  dynamicLabels?: Record<string, string>
  /** Maximum items before collapsing */
  maxItems?: number
}

export function Breadcrumb({
  items,
  showHome = true,
  separator,
  className,
  dynamicLabels,
  maxItems = 5,
}: BreadcrumbProps) {
  const { allCrumbs } = useBreadcrumb({ dynamicLabels, maxItems })

  // Use custom items if provided, otherwise use auto-detected
  const breadcrumbItems = items || allCrumbs

  if (breadcrumbItems.length === 0) {return null}

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm', className)}
    >
      <ol className="flex items-center space-x-1">
        {/* Home link */}
        {showHome && (
          <>
            <li>
              <Link
                to="/"
                className={cn(
                  'flex items-center text-muted-foreground hover:text-foreground',
                  'transition-colors min-h-[44px] min-w-[44px] justify-center',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md'
                )}
                aria-label="Home"
              >
                <Home className="h-4 w-4" />
              </Link>
            </li>
            <BreadcrumbSeparator separator={separator} />
          </>
        )}

        {/* Breadcrumb items */}
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1
          const isCollapsed = item.label === '...'

          return (
            <React.Fragment key={item.href || index}>
              <li className="flex items-center">
                {isCollapsed ? (
                  <span
                    className="px-2 text-muted-foreground"
                    aria-hidden="true"
                  >
                    ...
                  </span>
                ) : isLast ? (
                  <span
                    className="font-medium text-foreground truncate max-w-[200px]"
                    aria-current="page"
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.href}
                    className={cn(
                      'text-muted-foreground hover:text-foreground truncate max-w-[150px]',
                      'transition-colors py-2',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md px-1'
                    )}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
              {!isLast && !isCollapsed && (
                <BreadcrumbSeparator separator={separator} />
              )}
            </React.Fragment>
          )
        })}
      </ol>
    </nav>
  )
}

function BreadcrumbSeparator({ separator }: { separator?: React.ReactNode }) {
  return (
    <li className="flex items-center text-muted-foreground" aria-hidden="true">
      {separator || <ChevronRight className="h-4 w-4" />}
    </li>
  )
}

/**
 * Breadcrumb Provider - Wrap your app to enable dynamic breadcrumb labels
 *
 * Usage:
 * ```tsx
 * // In App.tsx
 * <BreadcrumbProvider>
 *   <Routes>...</Routes>
 * </BreadcrumbProvider>
 *
 * // In a page component
 * function ProjectDetailPage({ projectId }) {
 *   const { project } = useProject(projectId)
 *   useBreadcrumbLabel('projectId', project?.name || 'Loading...')
 *   return <div>...</div>
 * }
 * ```
 */
export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [labels, setLabels] = React.useState<Record<string, string>>({})

  const setLabel = React.useCallback((key: string, value: string) => {
    setLabels((prev) => ({ ...prev, [key]: value }))
  }, [])

  const removeLabel = React.useCallback((key: string) => {
    setLabels((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const value = React.useMemo(
    () => ({ labels, setLabel, removeLabel }),
    [labels, setLabel, removeLabel]
  )

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

/**
 * Compact breadcrumb for mobile/tablet
 * Shows only current page with back button
 */
export function BreadcrumbCompact({
  className,
  dynamicLabels,
}: {
  className?: string
  dynamicLabels?: Record<string, string>
}) {
  const { crumbs, currentPage } = useBreadcrumb({ dynamicLabels })
  const previousCrumb = crumbs.length > 0 ? crumbs[crumbs.length - 1] : null

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm', className)}
    >
      {previousCrumb && (
        <Link
          to={previousCrumb.href}
          className={cn(
            'flex items-center text-muted-foreground hover:text-foreground',
            'transition-colors mr-2 min-h-[44px] min-w-[44px] justify-center',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md'
          )}
          aria-label={`Back to ${previousCrumb.label}`}
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </Link>
      )}
      <span className="font-medium text-foreground truncate" aria-current="page">
        {currentPage}
      </span>
    </nav>
  )
}

/**
 * Pre-built breadcrumb items for common routes
 * Can be used as starting point for custom breadcrumbs
 */
export const COMMON_BREADCRUMBS = {
  projects: { label: 'Projects', href: '/projects' },
  dailyReports: { label: 'Daily Reports', href: '/daily-reports' },
  tasks: { label: 'Tasks', href: '/tasks' },
  documents: { label: 'Documents', href: '/documents' },
  safety: { label: 'Safety', href: '/safety' },
  settings: { label: 'Settings', href: '/settings' },
} as const
