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
  isLoading?: boolean
}

function NavItem({ to, icon, label, badge, isActive, isLoading }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={cn(
        'flex flex-col items-center justify-center flex-1 py-2 px-1 min-w-0',
        'transition-all duration-200',
        isActive
          ? 'text-primary'
          : 'text-muted-foreground active:text-foreground hover:text-foreground/80'
      )}
    >
      <div className="relative">
        <div className={cn(
          'p-1.5 rounded-lg transition-all duration-200',
          isActive && 'bg-primary/10 shadow-sm'
        )}>
          {icon}
        </div>
        {/* Loading shimmer for badge */}
        {isLoading && (
          <span className={cn(
            'absolute -top-1 -right-1 w-[18px] h-[18px]',
            'rounded-full bg-muted animate-pulse'
          )} />
        )}
        {/* Badge with count */}
        {!isLoading && badge !== undefined && badge > 0 && (
          <span className={cn(
            'absolute -top-1 -right-1 min-w-[18px] h-[18px]',
            'flex items-center justify-center',
            'text-[10px] font-medium text-destructive-foreground',
            'bg-destructive rounded-full px-1',
            'animate-fade-in'
          )}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className={cn(
        'text-[10px] mt-1 truncate max-w-full font-display',
        isActive ? 'font-medium' : 'font-normal'
      )}>
        {label}
      </span>
    </NavLink>
  )
}

export function MobilePortalNav() {
  const location = useLocation()
  const { data: stats, isLoading: statsLoading } = useSubcontractorStats()
  const { data: unreadCount, isLoading: notificationsLoading } = useUnreadNotificationCount()

  /**
   * Improved route matching using path segments to prevent false positives
   * e.g., /sub/assignment-details won't match /sub/assignments
   */
  const isActive = (path: string, additionalPaths?: string[]) => {
    // Exact match for dashboard root
    if (path === '/sub') {
      return location.pathname === '/sub' || location.pathname === '/sub/'
    }

    const pathSegments = path.split('/').filter(Boolean)
    const locationSegments = location.pathname.split('/').filter(Boolean)

    // Check if path segments match location segments (proper prefix match)
    const isMatch = pathSegments.every((seg, i) => locationSegments[i] === seg)
    if (isMatch && locationSegments.length >= pathSegments.length) {return true}

    // Check additional paths for grouped nav items
    return additionalPaths?.some(p => {
      const pSegments = p.split('/').filter(Boolean)
      return pSegments.every((seg, i) => locationSegments[i] === seg) &&
             locationSegments.length >= pSegments.length
    }) ?? false
  }

  // Calculate total pending items
  const pendingItems = (stats?.open_punch_items || 0) + (stats?.open_tasks || 0)

  return (
    <nav className={cn(
      'fixed bottom-0 left-0 right-0 z-40',
      'bg-gradient-to-t from-card via-card to-card/95',
      'backdrop-blur-lg border-t border-border/50',
      'md:hidden', // Only show on mobile
      'safe-area-bottom'
    )}>
      <div className="flex items-center justify-around h-14">
        <NavItem
          to="/sub"
          icon={<LayoutDashboard className="h-5 w-5" />}
          label="Dashboard"
          isActive={isActive('/sub') && location.pathname === '/sub'}
        />
        <NavItem
          to="/sub/assignments"
          icon={<ClipboardList className="h-5 w-5" />}
          label="My Work"
          badge={pendingItems}
          isActive={isActive('/sub/assignments', ['/sub/punch-items', '/sub/tasks'])}
          isLoading={statsLoading}
        />
        <NavItem
          to="/sub/documents"
          icon={<FileText className="h-5 w-5" />}
          label="Docs"
          isActive={isActive('/sub/documents', ['/sub/compliance'])}
        />
        <NavItem
          to="/sub/notifications"
          icon={<Bell className="h-5 w-5" />}
          label="Alerts"
          badge={unreadCount}
          isActive={isActive('/sub/notifications')}
          isLoading={notificationsLoading}
        />
        <NavItem
          to="/sub/profile"
          icon={<User className="h-5 w-5" />}
          label="Profile"
          isActive={isActive('/sub/profile')}
        />
      </div>
    </nav>
  )
}

export default MobilePortalNav
