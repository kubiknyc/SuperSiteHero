// File: /src/components/layout/AppLayout.tsx
// Main application layout with sidebar navigation and mobile bottom nav

import { type ReactNode, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { cn } from '@/lib/utils'
import { SyncStatusBar } from '@/components/sync/SyncStatusBar'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { MobileOfflineBanner } from '@/components/mobile/MobileOfflineIndicator'
import { initOfflineListeners } from '@/stores/offline-store'
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Offline Banner - shows at top on mobile when offline */}
      <MobileOfflineBanner />

      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 bg-gray-900 text-white flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-2">
              <HardHat className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Construction</h1>
              <p className="text-xs text-gray-400">Management</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
            const Icon = item.icon
            const Badge = item.badge

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" />
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
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                location.pathname.includes('/takeoffs')
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Ruler className="h-5 w-5" />
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
      <main className="md:ml-64 min-h-screen pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation - Only visible on mobile */}
      <MobileBottomNav />
    </div>
  )
}
