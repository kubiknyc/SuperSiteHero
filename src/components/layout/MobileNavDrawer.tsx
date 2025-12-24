// File: /src/components/layout/MobileNavDrawer.tsx
// Full-screen mobile navigation drawer with all menu items

import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { cn } from '@/lib/utils'
import { Settings, LogOut, X } from 'lucide-react'
import { MobileOfflineIndicator } from '@/components/mobile/MobileOfflineIndicator'
import { useEffect } from 'react'
import { getMobileDrawerSections } from '@/config/navigation'

interface MobileNavDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileNavDrawer({ isOpen, onClose }: MobileNavDrawerProps) {
  const { signOut, userProfile } = useAuth()
  const location = useLocation()

  // Get navigation sections from centralized config
  const navSections = getMobileDrawerSections()

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

  if (!isOpen) {return null}

  return (
    <div className="md:hidden fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-card dark:bg-background shadow-xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border dark:border-gray-700">
          <h2 className="text-lg font-semibold text-foreground dark:text-gray-100 heading-section">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 -m-2 touch-target text-muted dark:text-disabled hover:text-secondary dark:hover:text-gray-200"
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
              <h3 className="px-4 mb-2 text-xs font-semibold text-muted dark:text-disabled uppercase tracking-wider heading-subsection">
                {section.title}
              </h3>
              <div className="space-y-1 px-2">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.path ||
                    (item.path !== '/' && location.pathname.startsWith(item.path + '/'))
                  const Icon = item.icon
                  const Badge = item.badge

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium touch-target',
                        'transition-colors duration-200',
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-primary-hover dark:text-blue-400'
                          : 'text-secondary dark:text-gray-300 active:bg-muted dark:active:bg-surface'
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {Badge && <Badge />}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer with user info and settings */}
        <div className="border-t border-border dark:border-gray-700 p-4 space-y-3 safe-area-bottom">
          {/* User info */}
          {userProfile && (
            <div className="px-2 py-2">
              <p className="font-medium text-foreground dark:text-gray-100">
                {userProfile.first_name} {userProfile.last_name}
              </p>
              <p className="text-sm text-muted dark:text-disabled">{userProfile.email}</p>
            </div>
          )}

          {/* Settings */}
          <Link
            to="/settings"
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-secondary dark:text-gray-300 active:bg-muted dark:active:bg-surface touch-target"
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>

          {/* Sign out */}
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-base font-medium text-error dark:text-red-400 active:bg-error-light dark:active:bg-red-900/30 touch-target"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
