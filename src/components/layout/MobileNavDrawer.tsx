// File: /src/components/layout/MobileNavDrawer.tsx
// Full-screen mobile navigation drawer with all menu items

import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { cn } from '@/lib/utils'
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
  X,
  FileEdit,
  Workflow,
  CheckCircle2,
  CheckSquare,
  MessageSquare,
  Mail,
  Files,
  ClipboardCheck,
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
import { MobileOfflineIndicator } from '@/components/mobile/MobileOfflineIndicator'
import { useEffect } from 'react'

interface MobileNavDrawerProps {
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: React.ComponentType
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Main',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Projects', href: '/projects', icon: FolderOpen },
      { name: 'Messages', href: '/messages', icon: MessageSquare, badge: UnreadMessagesBadge },
      { name: 'Documents', href: '/documents', icon: Files },
    ],
  },
  {
    title: 'Field Work',
    items: [
      { name: 'Daily Reports', href: '/daily-reports', icon: FileText },
      { name: 'Meetings', href: '/meetings', icon: CalendarCheck },
      { name: 'Weather Logs', href: '/weather-logs', icon: CloudSun },
      { name: 'Tasks', href: '/tasks', icon: ClipboardList },
      { name: 'Inspections', href: '/inspections', icon: ClipboardCheck },
      { name: 'Punch Lists', href: '/punch-lists', icon: ListChecks },
    ],
  },
  {
    title: 'Project Management',
    items: [
      { name: 'Change Orders', href: '/change-orders', icon: FileEdit },
      { name: 'Workflows', href: '/workflows', icon: Workflow },
      { name: 'Approvals', href: '/approvals', icon: CheckCircle2, badge: PendingApprovalsBadge },
      { name: 'RFIs', href: '/rfis', icon: AlertCircle },
      { name: 'Checklists', href: '/checklists/templates', icon: CheckSquare },
    ],
  },
  {
    title: 'Administration',
    items: [
      { name: 'Notices', href: '/notices', icon: Mail },
      { name: 'Site Instructions', href: '/site-instructions', icon: FileSignature },
      { name: 'Permits', href: '/permits', icon: FileCheck },
      { name: 'Safety', href: '/safety', icon: Shield },
      { name: 'Equipment', href: '/equipment', icon: Truck },
      { name: 'Budget', href: '/budget', icon: DollarSign },
      { name: 'Contacts', href: '/contacts', icon: Users },
      { name: 'Reports', href: '/reports', icon: BarChart3 },
    ],
  },
]

export function MobileNavDrawer({ isOpen, onClose }: MobileNavDrawerProps) {
  const { signOut, userProfile } = useAuth()
  const location = useLocation()

  // Close drawer on route change
  useEffect(() => {
    if (isOpen) {
      onClose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="md:hidden fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 -m-2 touch-target text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Offline Indicator */}
        <MobileOfflineIndicator />

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto overscroll-contain">
          {navSections.map((section) => (
            <div key={section.title} className="py-3">
              <h3 className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.title}
              </h3>
              <div className="space-y-1 px-2">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href ||
                    (item.href !== '/' && location.pathname.startsWith(item.href + '/'))
                  const Icon = item.icon
                  const Badge = item.badge

                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium touch-target',
                        'transition-colors duration-200',
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 active:bg-gray-100'
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className="flex-1">{item.name}</span>
                      {Badge && <Badge />}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer with user info and settings */}
        <div className="border-t border-gray-200 p-4 space-y-3 safe-area-bottom">
          {/* User info */}
          {userProfile && (
            <div className="px-2 py-2">
              <p className="font-medium text-gray-900">
                {userProfile.first_name} {userProfile.last_name}
              </p>
              <p className="text-sm text-gray-500">{userProfile.email}</p>
            </div>
          )}

          {/* Settings */}
          <Link
            to="/settings"
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-gray-700 active:bg-gray-100 touch-target"
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>

          {/* Sign out */}
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-base font-medium text-red-600 active:bg-red-50 touch-target"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
