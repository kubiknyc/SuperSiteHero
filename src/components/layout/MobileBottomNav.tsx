// File: /src/components/layout/MobileBottomNav.tsx
// Mobile bottom navigation for touch-friendly navigation on small screens

import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  MessageSquare,
  Menu,
} from 'lucide-react'
import { useState } from 'react'
import { MobileNavDrawer } from './MobileNavDrawer'
import { UnreadMessagesBadge } from '@/features/messaging/components/UnreadMessagesBadge'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: React.ComponentType
}

const primaryNavItems: NavItem[] = [
  { name: 'Home', href: '/', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderOpen },
  { name: 'Reports', href: '/daily-reports', icon: FileText },
  { name: 'Messages', href: '/messages', icon: MessageSquare, badge: UnreadMessagesBadge },
]

export function MobileBottomNav() {
  const location = useLocation()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  return (
    <>
      {/* Bottom Navigation Bar - Only visible on mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {primaryNavItems.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href))
            const Icon = item.icon
            const Badge = item.badge

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full min-w-[64px] touch-target',
                  'transition-colors duration-200',
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-500 active:text-gray-700'
                )}
              >
                <div className="relative">
                  <Icon className={cn(
                    'h-6 w-6 mb-1',
                    isActive && 'stroke-[2.5px]'
                  )} />
                  {Badge && (
                    <div className="absolute -top-1 -right-1">
                      <Badge />
                    </div>
                  )}
                </div>
                <span className={cn(
                  'text-xs',
                  isActive ? 'font-semibold' : 'font-medium'
                )}>
                  {item.name}
                </span>
              </Link>
            )
          })}

          {/* More menu button */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full min-w-[64px] touch-target',
              'text-gray-500 active:text-gray-700 transition-colors duration-200'
            )}
          >
            <Menu className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      <MobileNavDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  )
}
