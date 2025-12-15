// File: /src/components/layout/AppLayout.tsx
// Main application layout with sidebar navigation and mobile bottom nav
// Enhanced with tablet landscape/portrait optimizations

import { type ReactNode, useEffect, useState, useCallback } from 'react'
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
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  ClipboardList,
  ListChecks,
  AlertCircle,
  Shield,
  Users,
  Settings,
  LogOut,
  HardHat,
  FileEdit,
  Workflow,
  CheckCircle2,
  CheckSquare,
  MessageSquare,
  Mail,
  Files,
  ClipboardCheck,
  Ruler,
  BarChart3,
  CloudSun,
  FileSignature,
  CalendarCheck,
  Truck,
  DollarSign,
  FileCheck,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react'
import { PendingApprovalsBadge } from '@/features/approvals/components'
import { UnreadMessagesBadge } from '@/features/messaging/components/UnreadMessagesBadge'
import { Button } from '@/components/ui/button'

interface AppLayoutProps {
  children: ReactNode
}

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavItemWithBadge extends NavItem {
  badge?: React.ComponentType
}

const navigation: NavItemWithBadge[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderOpen },
  { name: 'Messages', href: '/messages', icon: MessageSquare, badge: UnreadMessagesBadge },
  { name: 'Documents', href: '/documents', icon: Files },
  { name: 'Daily Reports', href: '/daily-reports', icon: FileText },
  { name: 'Meetings', href: '/meetings', icon: CalendarCheck },
  { name: 'Weather Logs', href: '/weather-logs', icon: CloudSun },
  { name: 'Change Orders', href: '/change-orders', icon: FileEdit },
  { name: 'Workflows', href: '/workflows', icon: Workflow },
  { name: 'Notices', href: '/notices', icon: Mail },
  { name: 'Site Instructions', href: '/site-instructions', icon: FileSignature },
  { name: 'Tasks', href: '/tasks', icon: ClipboardList },
  { name: 'Approvals', href: '/approvals', icon: CheckCircle2, badge: PendingApprovalsBadge },
  { name: 'Punch Lists', href: '/punch-lists', icon: ListChecks },
  { name: 'Checklists', href: '/checklists/templates', icon: CheckSquare },
  { name: 'RFIs', href: '/rfis', icon: AlertCircle },
  { name: 'Inspections', href: '/inspections', icon: ClipboardCheck },
  { name: 'Permits', href: '/permits', icon: FileCheck },
  { name: 'Safety', href: '/safety', icon: Shield },
  { name: 'Equipment', href: '/equipment', icon: Truck },
  { name: 'Budget', href: '/budget', icon: DollarSign },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
]

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
  const showPersistentSidebar = !isTablet || isLandscape
  const showDrawerSidebar = isTablet && isPortrait
  const showMobileNav = !isTablet && !showPersistentSidebar

  return (
    <div className={cn(
      "min-h-screen bg-gray-50 dark:bg-gray-950",
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
            "bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700",
            "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
            isTouchDevice && "min-h-[44px] min-w-[44px]"
          )}
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
        </button>
      )}

      {/* Sidebar Navigation */}
      <aside
        className={cn(
          // Base styles
          "fixed inset-y-0 left-0 bg-gray-900 text-white flex-col z-50",
          // Desktop: always visible
          !isTablet && "hidden md:flex w-64",
          // Tablet landscape: persistent sidebar (slightly narrower)
          isTablet && isLandscape && "flex w-60",
          // Tablet portrait: drawer sidebar
          showDrawerSidebar && [
            "flex w-72 transform transition-transform duration-300 ease-in-out",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          ],
          // Touch-friendly scrolling
          isTouchDevice && "overflow-y-auto overscroll-contain"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "border-b border-gray-800",
          isTablet ? "p-4" : "p-6"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "rounded-lg bg-blue-600",
                isTablet ? "p-1.5" : "p-2"
              )}>
                <HardHat className={cn(isTablet ? "h-5 w-5" : "h-6 w-6")} />
              </div>
              <div>
                <h1 className={cn(
                  "font-bold",
                  isTablet ? "text-base" : "text-lg"
                )}>Construction</h1>
                <p className="text-xs text-gray-400">Management</p>
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
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 overflow-y-auto",
          isTablet ? "p-3 space-y-0.5" : "p-4 space-y-1",
          isTouchDevice && "scroll-smooth-touch"
        )}>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
            const Icon = item.icon
            const Badge = item.badge

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md font-medium transition-colors',
                  // Base styles
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                  // Tablet: larger touch targets
                  isTablet ? 'px-3 py-3 text-base min-h-[44px]' : 'px-3 py-2 text-sm',
                  // Touch feedback
                  isTouchDevice && 'active:bg-gray-700'
                )}
              >
                <Icon className={cn(isTablet ? "h-5 w-5" : "h-5 w-5")} />
                <span className="flex-1">{item.name}</span>
                {Badge && <Badge />}
              </Link>
            )
          })}

          {/* Conditional Takeoffs navigation - only show when viewing a project and user is internal */}
          {currentProjectId && userRole !== 'client' && userRole !== 'subcontractor' && (
            <Link
              to={`/projects/${currentProjectId}/takeoffs`}
              className={cn(
                'flex items-center gap-3 rounded-md font-medium transition-colors',
                location.pathname.includes('/takeoffs')
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                isTablet ? 'px-3 py-3 text-base min-h-[44px]' : 'px-3 py-2 text-sm',
                isTouchDevice && 'active:bg-gray-700'
              )}
            >
              <Ruler className={cn(isTablet ? "h-5 w-5" : "h-5 w-5")} />
              <span className="flex-1">Takeoffs</span>
            </Link>
          )}
        </nav>

        {/* User profile and settings */}
        <div className="p-4 border-t border-gray-800 space-y-3">
          {/* Sync status indicators */}
          <div className="pb-2 flex items-center justify-between gap-2">
            <SyncStatusBar />
            <OfflineIndicator />
          </div>

          {/* Theme toggle */}
          <div className="pb-2 flex items-center justify-between gap-2">
            <span className="text-sm text-gray-400">Theme</span>
            <ThemeToggle compact />
          </div>

          {/* User info */}
          {userProfile && (
            <div className="px-3 py-2 text-sm">
              <p className="font-medium text-white">
                {userProfile.first_name} {userProfile.last_name}
              </p>
              <p className="text-xs text-gray-400">{userProfile.email}</p>
              <p className="text-xs text-gray-500 capitalize">{userProfile.role}</p>
            </div>
          )}

          {/* Settings and sign out */}
          <Link
            to="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>

          <Button
            onClick={() => signOut()}
            variant="ghost"
            className="w-full justify-start gap-3 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content - responsive margins */}
      <main className={cn(
        "min-h-screen",
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
