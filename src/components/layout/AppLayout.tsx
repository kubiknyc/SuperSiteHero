// File: /src/components/layout/AppLayout.tsx
// Main application layout with Modern Minimal navigation sidebar
// Updated to use NavigationSidebar component

import { type ReactNode, useEffect, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { MobileOfflineBanner } from '@/components/mobile/MobileOfflineIndicator'
import { initOfflineListeners } from '@/stores/offline-store'
import { useTabletMode, useTabletSidebar } from '@/hooks/useTabletMode'
import { Menu } from 'lucide-react'

// New Modern Minimal Navigation Sidebar
import { NavigationSidebar } from './sidebar'

// Sidebar dimensions
const SIDEBAR_COLLAPSED_WIDTH = 72
const SIDEBAR_EXPANDED_WIDTH = 280

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { signOut, userProfile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { resolvedTheme, toggleTheme } = useTheme()

  // Tablet mode detection
  const { isTablet, isLandscape, isPortrait, isTouchDevice } = useTabletMode()
  const { isOpen: isSidebarOpen, toggle: toggleSidebar, close: closeSidebar } = useTabletSidebar()

  // Sidebar pinned state
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('jobsight-sidebar-expanded')
    return saved === 'true'
  })

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

  // Handle logout
  const handleLogout = useCallback(async () => {
    await signOut()
    navigate('/login')
  }, [signOut, navigate])

  // Handle search trigger (command palette)
  const handleSearchTrigger = useCallback(() => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    })
    document.dispatchEvent(event)
  }, [])

  // Build user object for sidebar
  const sidebarUser = userProfile
    ? {
        name: `${userProfile.first_name} ${userProfile.last_name}`,
        email: userProfile.email || '',
        role: userProfile.role || 'User',
      }
    : undefined

  // Check if user is admin
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'owner'

  // Determine layout mode
  const showDrawerSidebar = isTablet && isPortrait

  // Calculate main content margin based on sidebar state
  const getSidebarOffset = () => {
    if (isTablet && isPortrait) return 0
    if (isTablet && isLandscape) return 240
    return isPinned ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH
  }

  return (
    <div
      className={cn(
        'min-h-screen',
        'bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100',
        'dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-950 dark:to-slate-900',
        'relative',
        isTablet && isLandscape && 'tablet-landscape-sidebar'
      )}
    >
      {/* Subtle dot pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

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

      {/* Navigation Sidebar - Modern Minimal Design */}
      {!isTablet && (
        <NavigationSidebar
          user={sidebarUser}
          isAdmin={isAdmin}
          isDarkMode={resolvedTheme === 'dark'}
          onThemeToggle={toggleTheme}
          onLogout={handleLogout}
          onSearchTrigger={handleSearchTrigger}
          onExpandedChange={(expanded) => setIsPinned(expanded)}
        />
      )}

      {/* Tablet sidebar (drawer style for portrait, persistent for landscape) */}
      {isTablet && (
        <NavigationSidebar
          user={sidebarUser}
          isAdmin={isAdmin}
          isDarkMode={resolvedTheme === 'dark'}
          onThemeToggle={toggleTheme}
          onLogout={handleLogout}
          onSearchTrigger={handleSearchTrigger}
          onExpandedChange={(expanded) => setIsPinned(expanded)}
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

      {/* Main content - responsive margins */}
      <main
        className={cn(
          'min-h-screen',
          'transition-[margin-left] duration-300',
          '[transition-timing-function:cubic-bezier(0.32,0.72,0,1)]',
          // Desktop: offset for sidebar
          !isTablet && 'md:pb-0',
          // Mobile bottom padding for nav
          'pb-20 md:pb-0',
          // Tablet portrait: add top padding for menu button
          isTablet && isPortrait && 'pt-16'
        )}
        style={{
          marginLeft: !isTablet ? getSidebarOffset() : undefined,
        }}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {!isTablet && <MobileBottomNav />}

      {/* Tablet Portrait: Bottom navigation */}
      {isTablet && isPortrait && <MobileBottomNav />}
    </div>
  )
}
