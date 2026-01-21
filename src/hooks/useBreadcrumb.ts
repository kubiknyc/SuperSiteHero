/**
 * useBreadcrumb - Generates breadcrumb items from current route
 *
 * Automatically parses the URL path and generates navigation breadcrumbs
 * with human-readable labels and proper hierarchy.
 *
 * Usage:
 * ```tsx
 * const { crumbs, currentPage } = useBreadcrumb()
 *
 * // crumbs = [
 * //   { label: 'Projects', href: '/projects' },
 * //   { label: 'Downtown Tower', href: '/projects/123' },
 * //   { label: 'Daily Reports', href: '/projects/123/daily-reports' },
 * // ]
 * // currentPage = 'Report #456'
 * ```
 */

import { useMemo, createContext, useContext, useEffect } from 'react'
import { useLocation, useParams } from 'react-router-dom'

export interface BreadcrumbItem {
  /** Display label */
  label: string
  /** Navigation href */
  href: string
  /** Whether this is the current page (last item) */
  isCurrent?: boolean
}

// Route segment to human-readable label mapping
const SEGMENT_LABELS: Record<string, string> = {
  // Main sections
  'projects': 'Projects',
  'daily-reports': 'Daily Reports',
  'change-orders': 'Change Orders',
  'punch-lists': 'Punch Lists',
  'documents': 'Documents',
  'rfis': 'RFIs',
  'submittals': 'Submittals',
  'tasks': 'Tasks',
  'workflows': 'Workflows',
  'safety': 'Safety',
  'inspections': 'Inspections',
  'checklists': 'Checklists',
  'meetings': 'Meetings',
  'contacts': 'Contacts',
  'reports': 'Reports',
  'settings': 'Settings',
  'analytics': 'Analytics',
  'schedule': 'Schedule',
  'budget': 'Budget',
  'permits': 'Permits',
  'equipment': 'Equipment',
  'photos': 'Photos',
  'photo-progress': 'Photo Progress',
  'material-receiving': 'Material Receiving',
  'procurement': 'Procurement',
  'closeout': 'Closeout',
  'quality-control': 'Quality Control',
  'insurance': 'Insurance',
  'lien-waivers': 'Lien Waivers',
  'payment-applications': 'Pay Apps',
  'cost-tracking': 'Cost Tracking',
  'toolbox-talks': 'Toolbox Talks',
  'site-instructions': 'Site Instructions',
  'transmittals': 'Transmittals',
  'notices': 'Notices',
  'messages': 'Messages',
  'approvals': 'Approvals',
  'look-ahead': 'Look Ahead',
  'gantt': 'Gantt Chart',
  'drawing-sheets': 'Drawing Sheets',
  'visual-search': 'Visual Search',
  'material-lists': 'Material Lists',
  'jsa': 'JSA',
  'bidding': 'Bidding',

  // Sub-routes
  'new': 'New',
  'edit': 'Edit',
  'detail': 'Details',
  'templates': 'Templates',
  'executions': 'Executions',
  'dashboard': 'Dashboard',
  'by-area': 'By Area',

  // Settings sub-routes
  'company': 'Company',
  'users': 'Users',
  'notifications': 'Notifications',
  'roles': 'Roles',
  'integrations': 'Integrations',
  'cost-codes': 'Cost Codes',

  // Portals
  'sub': 'Subcontractor Portal',
  'client': 'Client Portal',
}

// Segments that should be skipped in breadcrumbs
const SKIP_SEGMENTS = new Set([
  'dashboard', // Usually redundant
  'v2', // Version indicators
])

// Segments that represent dynamic IDs (not labels)
const ID_PATTERN = /^[0-9a-f-]{8,}$/i // UUID or similar

interface UseBreadcrumbOptions {
  /** Custom labels for dynamic route parameters */
  dynamicLabels?: Record<string, string>
  /** Maximum number of breadcrumbs to show (older ones collapse) */
  maxItems?: number
}

export function useBreadcrumb(options: UseBreadcrumbOptions = {}) {
  const { dynamicLabels = {}, maxItems = 5 } = options
  const location = useLocation()
  const params = useParams()

  const crumbs = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const items: BreadcrumbItem[] = []

    let currentPath = ''

    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i]
      currentPath += `/${segment}`

      // Skip certain segments
      if (SKIP_SEGMENTS.has(segment)) {continue}

      // Check if this is a dynamic segment (ID)
      const isId = ID_PATTERN.test(segment)

      let label: string

      if (isId) {
        // Try to get a custom label for this ID
        // First check if there's a param name we can use
        const paramKey = Object.keys(params).find(
          (key) => params[key] === segment
        )

        if (paramKey && dynamicLabels[paramKey]) {
          label = dynamicLabels[paramKey]
        } else if (dynamicLabels[segment]) {
          label = dynamicLabels[segment]
        } else {
          // Default: truncate the ID
          label = `#${segment.substring(0, 8)}...`
        }
      } else {
        // Use predefined label or capitalize the segment
        label = SEGMENT_LABELS[segment] || formatSegment(segment)
      }

      items.push({
        label,
        href: currentPath,
        isCurrent: i === pathSegments.length - 1,
      })
    }

    // If we have more items than maxItems, collapse middle items
    if (items.length > maxItems) {
      const firstItems = items.slice(0, 1)
      const lastItems = items.slice(-Math.min(maxItems - 1, items.length - 1))

      return [
        ...firstItems,
        { label: '...', href: '', isCurrent: false },
        ...lastItems,
      ]
    }

    return items
  }, [location.pathname, params, dynamicLabels, maxItems])

  const currentPage = crumbs.length > 0 ? crumbs[crumbs.length - 1].label : ''

  return {
    /** Array of breadcrumb items (excluding current page) */
    crumbs: crumbs.slice(0, -1),
    /** All breadcrumb items including current page */
    allCrumbs: crumbs,
    /** Label of the current page */
    currentPage,
    /** Full path */
    path: location.pathname,
  }
}

/**
 * Format a URL segment into a human-readable label
 * e.g., "daily-reports" -> "Daily Reports"
 */
function formatSegment(segment: string): string {
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Hook to provide dynamic labels for breadcrumbs
 *
 * Usage in a page component:
 * ```tsx
 * function ProjectDetailPage() {
 *   const { project } = useProject(projectId)
 *
 *   useBreadcrumbLabel('projectId', project?.name || 'Loading...')
 *
 *   return <div>...</div>
 * }
 * ```
 */

interface BreadcrumbContextValue {
  labels: Record<string, string>
  setLabel: (key: string, value: string) => void
  removeLabel: (key: string) => void
}

export const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  labels: {},
  setLabel: () => {},
  removeLabel: () => {},
})

export function useBreadcrumbLabel(key: string, label: string) {
  const { setLabel, removeLabel } = useContext(BreadcrumbContext)

  useEffect(() => {
    if (label) {
      setLabel(key, label)
    }
    return () => removeLabel(key)
  }, [key, label, setLabel, removeLabel])
}

export function useBreadcrumbContext() {
  return useContext(BreadcrumbContext)
}
