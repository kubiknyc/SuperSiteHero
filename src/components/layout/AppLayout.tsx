// File: /src/components/layout/AppLayout.tsx
// Main application layout with sidebar navigation

import { type ReactNode, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { cn } from '@/lib/utils'
import { SyncStatusBar } from '@/components/sync/SyncStatusBar'
import { OfflineIndicator } from '@/components/OfflineIndicator'
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
  { name: 'Daily Reports', href: '/daily-reports', icon: FileText },
  { name: 'Change Orders', href: '/change-orders', icon: FileEdit },
  { name: 'Workflows', href: '/workflows', icon: Workflow },
  { name: 'Notices', href: '/notices', icon: Mail },
  { name: 'Tasks', href: '/tasks', icon: ClipboardList },
  { name: 'Approvals', href: '/approvals', icon: CheckCircle2, badge: PendingApprovalsBadge },
  { name: 'Punch Lists', href: '/punch-lists', icon: ListChecks },
  { name: 'Checklists', href: '/checklists/templates', icon: CheckSquare },
  { name: 'RFIs', href: '/rfis', icon: AlertCircle },
  { name: 'Safety', href: '/safety', icon: Shield },
  { name: 'Contacts', href: '/contacts', icon: Users },
]

export function AppLayout({ children }: AppLayoutProps) {
  const { signOut, userProfile } = useAuth()
  const location = useLocation()

  // Initialize offline event listeners
  useEffect(() => {
    const cleanup = initOfflineListeners()
    return cleanup
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white flex flex-col">
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

      {/* Main content */}
      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </div>
  )
}
