// File: /src/components/layout/MobileBottomNav.tsx
// Mobile bottom navigation for touch-friendly navigation on small screens

import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Menu } from 'lucide-react'
import { useState, memo, useCallback } from 'react'
import { MobileNavDrawer } from './MobileNavDrawer'
import { useRoleNavigation } from '@/hooks/useRoleNavigation'

export const MobileBottomNav = memo(function MobileBottomNav() {
  const location = useLocation()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Get role-based mobile navigation items
  const { mobileBottomNav } = useRoleNavigation()

  const openDrawer = useCallback(() => setIsDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])

  return (
    <>
      {/* Bottom Navigation Bar - Only visible on mobile */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card dark:bg-background border-t border-border safe-area-bottom"
        aria-label="Main navigation"
        role="navigation"
      >
        <div className="flex items-center justify-around h-16">
          {mobileBottomNav.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path))
            const Icon = item.icon
            const BadgeComponent = typeof item.badge === 'function' ? item.badge : null

            // Determine display name (shorten for bottom nav)
            const displayName = item.label === 'Dashboard' ? 'Home' :
                               item.label === 'Daily Reports' ? 'Reports' :
                               item.label

            return (
              <Link
                key={item.path}
                to={item.path}
                aria-label={`Navigate to ${item.label}`}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full min-w-[64px] touch-target',
                  'transition-all duration-200 ease-out',
                  'active:scale-95',
                  isActive
                    ? 'text-primary'
                    : 'text-muted active:text-secondary'
                )}
              >
                <div className={cn(
                  'relative transition-transform duration-200',
                  isActive && 'scale-110'
                )}>
                  <Icon
                    className={cn(
                      'h-6 w-6 mb-1 transition-all duration-200',
                      isActive && 'stroke-[2.5px]'
                    )}
                    aria-hidden="true"
                  />
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <div className="absolute -top-1 -right-1 animate-pulse" aria-hidden="true">
                      <span className="px-1 py-0.5 text-[10px] font-medium bg-error text-white rounded-full min-w-[16px] text-center">
                        {item.badge}
                      </span>
                    </div>
                  )}
                  {BadgeComponent && (
                    <div className="absolute -top-1 -right-1 animate-pulse" aria-hidden="true">
                      <BadgeComponent />
                    </div>
                  )}
                </div>
                <span className={cn(
                  'text-xs transition-all duration-200',
                  isActive ? 'font-semibold' : 'font-medium'
                )}>
                  {displayName}
                </span>
                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute bottom-1 w-1 h-1 bg-primary rounded-full" />
                )}
              </Link>
            )
          })}

          {/* More menu button */}
          <button
            onClick={openDrawer}
            aria-label="Open navigation menu"
            aria-expanded={isDrawerOpen}
            aria-haspopup="dialog"
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full min-w-[64px] touch-target',
              'text-muted active:text-secondary transition-colors duration-200'
            )}
          >
            <Menu className="h-6 w-6 mb-1" aria-hidden="true" />
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      <MobileNavDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
      />
    </>
  )
})
