// File: /src/components/layout/AppLayout.tsx
// Main application layout with sidebar navigation and mobile bottom nav
// Enhanced with tablet landscape/portrait optimizations

import { type ReactNode, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { cn } from '@/lib/utils'
import { SyncStatusBar } from '@/components/sync/SyncStatusBar'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { MobileOfflineBanner } from '@/components/mobile/MobileOfflineIndicator'
import { ThemeToggle } from '@/components/ThemeToggle'
import { initOfflineListeners } from '@/stores/offline-store'
import { useTabletMode, useTabletSidebar } from '@/hooks/useTabletMode'
import { Settings, LogOut, Ruler, Menu, X } from 'lucide-react'
import { GlobalSearchBar } from '@/features/search/components/GlobalSearchBar'
import { Button } from '@/components/ui/button'
import { LogoIconLight } from '@/components/brand'
import { NavigationGroup } from './NavigationGroup'
import { primaryNavItems, navigationGroups } from '@/config/navigation'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { signOut, userProfile } = useAuth()
  const location = useLocation()

  // Tablet mode detection
  const { isTablet, isLandscape, isPortrait, isTouchDevice } = useTabletMode()
  const { isOpen: isSidebarOpen, toggle: toggleSidebar, close: closeSidebar } = useTabletSidebar()

  // Extract project ID from current route
  const projectIdMatch = location.pathname.match(/\/projects\/([^/]+)/)
  const currentProjectId = projectIdMatch ? projectIdMatch[1] : null

  // Get user role
  const userRole = userProfile?.role || 'user'

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

  // Determine layout mode
  const _showPersistentSidebar = !isTablet || isLandscape
  const showDrawerSidebar = isTablet && isPortrait

  return (
    <div className={cn(
      "min-h-screen bg-surface dark:bg-gray-950",
      // Tablet landscape: side-by-side layout
      isTablet && isLandscape && "tablet-landscape-sidebar"
    )}>
      {/* Mobile Offline Banner - shows at top on mobile when offline */}
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
            "fixed top-4 left-4 z-50 p-2 rounded-lg",
            "bg-card dark:bg-surface shadow-lg border border-border dark:border-gray-700",
            "hover:bg-surface dark:hover:bg-gray-700 transition-colors",
            isTouchDevice && "min-h-[44px] min-w-[44px]"
          )}
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6 text-secondary dark:text-gray-300" />
        </button>
      )}

      {/* Sidebar Navigation - Premium dark gradient with refined styling */}
      <aside
        className={cn(
          // Base styles - premium dark sidebar with gradient
          "fixed inset-y-0 left-0 text-white flex-col z-50 relative",
          // Premium gradient background
          "bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950",
          // Subtle inner border for depth
          "border-r border-gray-800/50",
          // Desktop: always visible
          !isTablet && "hidden md:flex w-64",
          // Tablet landscape: persistent sidebar (slightly narrower)
          isTablet && isLandscape && "flex w-60",
          // Tablet portrait: drawer sidebar with smooth animation
          showDrawerSidebar && [
            "flex w-72 transform transition-all duration-300 ease-out",
            isSidebarOpen ? "translate-x-0 shadow-2xl shadow-black/50" : "-translate-x-full"
          ],
          // Touch-friendly scrolling
          isTouchDevice && "overflow-y-auto overscroll-contain"
        )}
      >
        {/* Subtle concrete texture overlay */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-concrete-texture" />
        {/* Logo */}
        <div className={cn(
          "border-b border-gray-800",
          isTablet ? "p-4" : "p-6"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "rounded-lg transition-all duration-200",
                "hover:shadow-[0_0_12px_rgba(96,165,250,0.3)]",
                isTablet ? "p-1.5" : "p-2"
              )}>
                <LogoIconLight className={cn(isTablet ? "h-5 w-5" : "h-6 w-6")} />
              </div>
              <div>
                <h1 className={cn(
                  "font-bold",
                  isTablet ? "text-base" : "text-lg"
                )}>
                  JobSight
                </h1>
                <p className="text-xs text-gray-400">Field Management</p>
              </div>
            </div>
            {/* Close button for tablet portrait drawer */}
            {showDrawerSidebar && (
              <button
                onClick={closeSidebar}
                className={cn(
                  "p-2 rounded-lg hover:bg-gray-800 transition-colors",
                  isTouchDevice && "min-h-[44px] min-w-[44px] flex items-center justify-center"
                )}
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Global Search Bar */}
          <div className="mt-4">
            <GlobalSearchBar
              projectId={currentProjectId || undefined}
              placeholder="Search... (Ctrl+K)"
              compact
              className="w-full bg-surface hover:bg-gray-700 border-gray-700 text-gray-300"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 overflow-y-auto",
          isTablet ? "p-3 space-y-2" : "p-4 space-y-2",
          isTouchDevice && "scroll-smooth-touch"
        )}>
          {/* Primary Navigation Items (always visible) */}
          <div className="space-y-1">
            {primaryNavItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
              const Icon = item.icon
              const BadgeComponent = typeof item.badge === 'function' ? item.badge : null

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 rounded-lg font-medium transition-all duration-200',
                    // Premium styles - refined hover and active states with industrial edge
                    isActive
                      ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-white border-l-[4px] border-primary shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.07] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] border-l-[4px] border-transparent',
                    // Tablet: larger touch targets
                    isTablet ? 'px-3 py-3 text-base min-h-[44px]' : 'px-3 py-2.5 text-sm',
                    // Touch feedback with subtle scale
                    isTouchDevice && 'active:scale-[0.98] active:bg-white/10'
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-primary" : "text-gray-500 group-hover:text-gray-300"
                  )} />
                  <span className="flex-1">{item.label}</span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                  {BadgeComponent && <BadgeComponent />}
                </Link>
              )
            })}
          </div>

          {/* Technical divider with notches */}
          <div className="my-4 mx-3 relative">
            <div className="h-px bg-gray-700/40" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-gray-600 rounded-full" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-gray-600 rounded-full" />
          </div>

          {/* Grouped Navigation (collapsible) */}
          <div className="space-y-2">
            {navigationGroups.map((group) => (
              <NavigationGroup
                key={group.id}
                id={group.id}
                label={group.label}
                icon={group.icon}
                items={group.items}
                defaultExpanded={group.defaultExpanded}
              />
            ))}
          </div>

          {/* Conditional Takeoffs navigation - only show when viewing a project and user is internal */}
          {currentProjectId && userRole !== 'client' && userRole !== 'subcontractor' && (
            <>
              {/* Technical divider with notches */}
              <div className="my-4 mx-3 relative">
                <div className="h-px bg-gray-700/40" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-gray-600 rounded-full" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-gray-600 rounded-full" />
              </div>
              <Link
                to={`/projects/${currentProjectId}/takeoffs`}
                className={cn(
                  'flex items-center gap-3 rounded-lg font-medium transition-all duration-200',
                  location.pathname.includes('/takeoffs')
                    ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-white border-l-[4px] border-primary shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.07] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] border-l-[4px] border-transparent',
                  isTablet ? 'px-3 py-3 text-base min-h-[44px]' : 'px-3 py-2.5 text-sm',
                  isTouchDevice && 'active:scale-[0.98] active:bg-white/10'
                )}
              >
                <Ruler className={cn(
                  "h-5 w-5 transition-colors",
                  location.pathname.includes('/takeoffs') ? "text-primary" : "text-gray-500"
                )} />
                <span className="flex-1">Takeoffs</span>
              </Link>
            </>
          )}
        </nav>

        {/* User profile and settings - Premium styling */}
        <div className="p-4 border-t border-gray-800/50 space-y-3 bg-gradient-to-t from-gray-950/50 to-transparent relative">
          {/* Measurement marks decoration */}
          <div className="h-2 mx-4 mb-2 bg-measurement-marks opacity-20" />

          {/* Sync status indicators */}
          <div className="pb-2 flex items-center justify-between gap-2">
            <SyncStatusBar />
            <OfflineIndicator />
          </div>

          {/* Theme toggle */}
          <div className="pb-2 flex items-center justify-between gap-2 px-1">
            <span className="text-sm text-gray-500">Theme</span>
            <ThemeToggle compact />
          </div>

          {/* User info - Premium card style with industrial border */}
          {userProfile && (
            <div className="px-3 py-3 rounded-lg bg-white/5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <p className="font-semibold text-white">
                {userProfile.first_name} {userProfile.last_name}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{userProfile.email}</p>
              <span className="inline-flex mt-2 px-2 py-0.5 text-xs font-medium text-primary bg-primary/10 rounded-full capitalize">
                {userProfile.role}
              </span>
            </div>
          )}

          {/* Settings and sign out - refined styling */}
          <Link
            to="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.07] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] transition-all duration-200"
          >
            <Settings className="h-5 w-5 text-gray-500" />
            Settings
          </Link>

          <Button
            onClick={() => signOut()}
            variant="ghost"
            className="w-full justify-start gap-3 px-3 text-gray-400 hover:text-white hover:bg-white/[0.07] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] rounded-lg"
          >
            <LogOut className="h-5 w-5 text-gray-500" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content - responsive margins with iOS safe areas */}
      <main className={cn(
        "min-h-screen",
        // iOS safe area support for notch/home indicator
        "safe-area-top safe-area-left safe-area-right",
        // Desktop: offset for sidebar
        !isTablet && "md:ml-64 pb-20 md:pb-0",
        // Tablet landscape: offset for persistent sidebar
        isTablet && isLandscape && "ml-60 pb-0",
        // Tablet portrait: no offset (drawer overlays), but add top padding for menu button
        isTablet && isPortrait && "ml-0 pb-20 pt-16",
        // Tablet: slightly larger base padding
        isTablet && "tablet:px-4"
      )}>
        {children}
      </main>

      {/* Mobile Bottom Navigation - Only visible on mobile (not tablet) */}
      {!isTablet && <MobileBottomNav />}

      {/* Tablet Portrait: Bottom navigation similar to mobile */}
      {isTablet && isPortrait && <MobileBottomNav />}
    </div>
  )
}
