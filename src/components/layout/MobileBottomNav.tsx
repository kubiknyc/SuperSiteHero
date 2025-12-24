// File: /src/components/layout/MobileBottomNav.tsx
// Mobile bottom navigation for touch-friendly navigation on small screens

import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Menu } from 'lucide-react'
import { useState } from 'react'
import { MobileNavDrawer } from './MobileNavDrawer'
import { mobileBottomNavItems } from '@/config/navigation'

export function MobileBottomNav() {
  const location = useLocation()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  return (
    <>
      {/* Bottom Navigation Bar - Only visible on mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card dark:bg-background border-t border-border dark:border-gray-700 safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {mobileBottomNavItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path))
            const Icon = item.icon
            const Badge = item.badge

            // Determine display name (shorten for bottom nav)
            const displayName = item.label === 'Dashboard' ? 'Home' :
                               item.label === 'Daily Reports' ? 'Reports' :
                               item.label

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full min-w-[64px] touch-target',
                  'transition-colors duration-200',
                  isActive
                    ? 'text-primary dark:text-blue-400'
                    : 'text-muted dark:text-disabled active:text-secondary dark:active:text-gray-300'
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
                  {displayName}
                </span>
              </Link>
            )
          })}

          {/* More menu button */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full min-w-[64px] touch-target',
              'text-muted dark:text-disabled active:text-secondary dark:active:text-gray-300 transition-colors duration-200'
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
