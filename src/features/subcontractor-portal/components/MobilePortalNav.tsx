/**
 * Mobile Portal Navigation
 * Bottom navigation bar for subcontractor portal on mobile devices
 * Milestone 4.1: Mobile-Optimized Portal UI
 */

import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  User,
  Bell,
} from 'lucide-react'
import { useSubcontractorStats } from '../hooks'
import { useUnreadNotificationCount } from '@/features/notifications/hooks/useNotifications'

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
  badge?: number
  isActive: boolean
}

function NavItem({ to, icon, label, badge, isActive }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={cn(
        'flex flex-col items-center justify-center flex-1 py-2 px-1 min-w-0',
        'transition-colors duration-200',
        isActive
          ? 'text-blue-600'
          : 'text-gray-500 active:text-gray-700'
      )}
    >
      <div className="relative">
        <div className={cn(
          'p-1.5 rounded-lg transition-colors',
          isActive && 'bg-blue-50'
        )}>
          {icon}
        </div>
        {badge !== undefined && badge > 0 && (
          <span className={cn(
            'absolute -top-1 -right-1 min-w-[18px] h-[18px]',
            'flex items-center justify-center',
            'text-[10px] font-medium text-white',
            'bg-red-500 rounded-full px-1'
          )}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className={cn(
        'text-[10px] mt-1 truncate max-w-full',
        isActive ? 'font-medium' : 'font-normal'
      )}>
        {label}
      </span>
    </NavLink>
  )
}

export function MobilePortalNav() {
  const location = useLocation()
  const { data: stats } = useSubcontractorStats()
  const { data: unreadCount } = useUnreadNotificationCount()

  const isActive = (path: string) => {
    if (path === '/portal') {
      return location.pathname === '/portal'
    }
    return location.pathname.startsWith(path)
  }

  // Calculate total pending items
  const pendingItems = (stats?.open_punch_items || 0) + (stats?.open_tasks || 0)

  return (
    <nav className={cn(
      'fixed bottom-0 left-0 right-0 z-40',
      'bg-white border-t border-gray-200',
      'md:hidden', // Only show on mobile
      'safe-area-bottom'
    )}>
      <div className="flex items-center justify-around h-14">
        <NavItem
          to="/portal"
          icon={<LayoutDashboard className="h-5 w-5" />}
          label="Dashboard"
          isActive={isActive('/portal') && !location.pathname.includes('/portal/')}
        />
        <NavItem
          to="/portal/assignments"
          icon={<ClipboardList className="h-5 w-5" />}
          label="My Work"
          badge={pendingItems}
          isActive={isActive('/portal/assignments') || isActive('/portal/punch-items') || isActive('/portal/tasks')}
        />
        <NavItem
          to="/portal/documents"
          icon={<FileText className="h-5 w-5" />}
          label="Docs"
          isActive={isActive('/portal/documents') || isActive('/portal/compliance')}
        />
        <NavItem
          to="/portal/notifications"
          icon={<Bell className="h-5 w-5" />}
          label="Alerts"
          badge={unreadCount}
          isActive={isActive('/portal/notifications')}
        />
        <NavItem
          to="/portal/profile"
          icon={<User className="h-5 w-5" />}
          label="Profile"
          isActive={isActive('/portal/profile')}
        />
      </div>
    </nav>
  )
}

export default MobilePortalNav
