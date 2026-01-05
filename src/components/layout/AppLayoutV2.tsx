// File: /src/components/layout/AppLayoutV2.tsx
// V2 Application layout with collapsible sidebar, sticky header, and action panel
// Desktop layout redesign for improved UX

import { type ReactNode, useEffect, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/AuthContext'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { MobileOfflineBanner } from '@/components/mobile/MobileOfflineIndicator'
import { useTabletMode, useTabletSidebar } from '@/hooks/useTabletMode'
import { initOfflineListeners } from '@/stores/offline-store'
import { Menu, X } from 'lucide-react'

import {
  CollapsibleSidebar,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  useSidebarState,
} from './CollapsibleSidebar'
import { StickyHeader } from './StickyHeader'
import { ActionPanel } from './ActionPanel'

// Page title map for auto-detection
const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Overview of your projects' },
  '/projects': { title: 'Projects', subtitle: 'Manage your construction projects' },
  '/messages': { title: 'Messages', subtitle: 'Team communication' },
  '/documents': { title: 'Documents', subtitle: 'Project documentation' },
  '/tasks': { title: 'Tasks', subtitle: 'Track work items' },
  '/daily-reports': { title: 'Daily Reports', subtitle: 'Field activity logs' },
  '/rfis': { title: 'RFIs', subtitle: 'Requests for information' },
  '/punch-lists': { title: 'Punch Lists', subtitle: 'Deficiency tracking' },
  '/inspections': { title: 'Inspections', subtitle: 'Quality inspections' },
  '/approvals': { title: 'Approvals', subtitle: 'Pending approvals' },
  '/settings': { title: 'Settings', subtitle: 'Account preferences' },
  '/analytics': { title: 'Analytics', subtitle: 'Project insights' },
  '/safety': { title: 'Safety', subtitle: 'Safety management' },
  '/budget': { title: 'Budget', subtitle: 'Cost tracking' },
  '/contacts': { title: 'Contacts', subtitle: 'Directory' },
}

interface AppLayoutV2Props {
  children: ReactNode
  /** Override the auto-detected page title */
  title?: string
  /** Override the auto-detected subtitle */
  subtitle?: string
  /** Show inline stats in header (default: true on dashboard) */
  showHeaderStats?: boolean
  /** Hide the sticky header */
  hideHeader?: boolean
}

export function AppLayoutV2({
  children,
  title: titleOverride,
  subtitle: subtitleOverride,
  showHeaderStats,
  hideHeader = false,
}: AppLayoutV2Props) {
  const { userProfile } = useAuth()
  const location = useLocation()

  // Tablet mode detection
  const { isTablet, isLandscape, isPortrait, isTouchDevice } = useTabletMode()
  const {
    isOpen: isSidebarOpen,
    toggle: toggleSidebar,
    close: closeSidebar,
  } = useTabletSidebar()

  // Action panel state
  const [actionPanelOpen, setActionPanelOpen] = useState(false)

  // Sidebar pinned state (shared with CollapsibleSidebar)
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('sidebar-pinned')
    return saved === 'true'
  })

  // Extract project ID from current route
  const projectIdMatch = location.pathname.match(/\/projects\/([^/]+)/)
  const currentProjectId = projectIdMatch ? projectIdMatch[1] : null

  // Get page title based on route
  const getPageInfo = () => {
    // Check for exact match first
    if (pageTitles[location.pathname]) {
      return pageTitles[location.pathname]
    }

    // Check for partial matches (e.g., /projects/123 -> /projects)
    const basePath = '/' + location.pathname.split('/')[1]
    if (pageTitles[basePath]) {
      return pageTitles[basePath]
    }

    return { title: 'JobSight', subtitle: undefined }
  }

  const pageInfo = getPageInfo()
  const title = titleOverride || pageInfo.title
  const subtitle =
    subtitleOverride !== undefined
      ? subtitleOverride
      : userProfile
      ? `Welcome back, ${userProfile.first_name}`
      : pageInfo.subtitle

  // Determine if we should show header stats
  const shouldShowStats =
    showHeaderStats !== undefined
      ? showHeaderStats
      : location.pathname === '/' || location.pathname === '/dashboard'

  // Initialize offline event listeners
  useEffect(() => {
    const cleanup = initOfflineListeners()
    return cleanup
  }, [])

  // Close sidebar on route change in tablet portrait mode
  useEffect(() => {
    if (isTablet && isPortrait) {
      closeSidebar()
    }
  }, [location.pathname, isTablet, isPortrait, closeSidebar])

  // Toggle action panel
  const handleActionPanelToggle = useCallback(() => {
    setActionPanelOpen((prev) => !prev)
  }, [])

  // Close action panel
  const handleActionPanelClose = useCallback(() => {
    setActionPanelOpen(false)
  }, [])

  // Determine layout mode
  const showPersistentSidebar = !isTablet || isLandscape
  const showDrawerSidebar = isTablet && isPortrait

  // Calculate main content margin based on sidebar state
  const getSidebarOffset = () => {
    if (isTablet && isPortrait) return 0
    if (isTablet && isLandscape) return 240 // Slightly narrower for tablet
    return isPinned ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH
  }

  return (
    <div
      className={cn(
        'min-h-screen bg-gray-50 dark:bg-gray-950',
        isTablet && isLandscape && 'tablet-landscape-sidebar'
      )}
    >
      {/* Mobile Offline Banner */}
      <MobileOfflineBanner />

      {/* Tablet Portrait: Backdrop overlay when drawer is open */}
      {showDrawerSidebar && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Tablet Portrait: Menu toggle button */}
      {showDrawerSidebar && !isSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className={cn(
            'fixed top-4 left-4 z-50 p-2 rounded-lg',
            'bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700',
            'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
            isTouchDevice && 'min-h-[44px] min-w-[44px]'
          )}
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </button>
      )}

      {/* Sidebar - Desktop uses CollapsibleSidebar */}
      {!isTablet && <CollapsibleSidebar />}

      {/* Tablet sidebar (drawer style for portrait, persistent for landscape) */}
      {isTablet && (
        <CollapsibleSidebar
          className={cn(
            showDrawerSidebar && [
              'w-72 transform transition-all duration-300 ease-out',
              isSidebarOpen
                ? 'translate-x-0 shadow-2xl shadow-black/50'
                : '-translate-x-full',
            ]
          )}
        />
      )}

      {/* Main content wrapper */}
      <div
        className={cn(
          'min-h-screen transition-[margin-left] duration-300 ease-out',
          // Desktop: dynamic margin based on sidebar state
          !isTablet && 'hidden md:block'
        )}
        style={{
          marginLeft: !isTablet ? getSidebarOffset() : undefined,
        }}
      >
        {/* Sticky Header */}
        {!hideHeader && (
          <StickyHeader
            title={title}
            subtitle={subtitle}
            projectId={currentProjectId || undefined}
            onActionPanelToggle={handleActionPanelToggle}
            actionPanelOpen={actionPanelOpen}
            showStats={shouldShowStats}
          />
        )}

        {/* Main content */}
        <main
          className={cn(
            'min-h-[calc(100vh-4rem)]',
            // Mobile bottom padding for nav
            'pb-20 md:pb-0',
            // Tablet portrait: add top padding for menu button
            isTablet && isPortrait && 'pt-16'
          )}
        >
          {children}
        </main>
      </div>

      {/* Mobile layout fallback */}
      <div className="md:hidden">
        <main className="min-h-screen pb-20">{children}</main>
      </div>

      {/* Action Panel (slide-out) */}
      <ActionPanel
        open={actionPanelOpen}
        onClose={handleActionPanelClose}
        projectId={currentProjectId || undefined}
      />

      {/* Mobile Bottom Navigation */}
      {!isTablet && <MobileBottomNav />}

      {/* Tablet Portrait: Bottom navigation */}
      {isTablet && isPortrait && <MobileBottomNav />}
    </div>
  )
}
