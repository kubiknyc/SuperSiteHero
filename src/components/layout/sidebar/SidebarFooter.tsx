// File: src/components/layout/sidebar/SidebarFooter.tsx
// Footer section of the collapsible sidebar
// Contains quick actions and user profile

import { cn } from '@/lib/utils'
import { Bell, HelpCircle, Settings, LogOut } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { QuickActionButton } from './NavLinkItem'

interface UserProfile {
  full_name?: string
  first_name?: string
  last_name?: string
  email?: string
  avatar_url?: string
  role?: string
}

interface SidebarFooterProps {
  isExpanded: boolean
  userProfile?: UserProfile
  onSignOut?: () => void
}

/**
 * Get user initials for avatar fallback
 */
function getUserInitials(userProfile?: UserProfile): string {
  const userName =
    userProfile?.full_name ||
    (userProfile?.first_name && userProfile?.last_name
      ? `${userProfile.first_name} ${userProfile.last_name}`
      : 'User')

  return userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Get display name from user profile
 */
function getUserDisplayName(userProfile?: UserProfile): string {
  return (
    userProfile?.full_name ||
    (userProfile?.first_name && userProfile?.last_name
      ? `${userProfile.first_name} ${userProfile.last_name}`
      : 'User')
  )
}

export function SidebarFooter({
  isExpanded,
  userProfile,
  onSignOut,
}: SidebarFooterProps) {
  const userRole = userProfile?.role || 'user'
  const userName = getUserDisplayName(userProfile)
  const userInitials = getUserInitials(userProfile)

  return (
    <div className="border-t border-slate-800/50">
      {/* Quick actions */}
      <div
        className={cn(
          'flex items-center px-3 py-2 gap-1',
          isExpanded ? 'justify-start' : 'justify-center'
        )}
      >
        <QuickActionButton
          icon={Bell}
          label="Notifications"
          isExpanded={isExpanded}
        />
        <QuickActionButton
          icon={HelpCircle}
          label="Help & Support"
          isExpanded={isExpanded}
        />
        <QuickActionButton
          icon={Settings}
          label="Settings"
          href="/settings"
          isExpanded={isExpanded}
        />
      </div>

      {/* User profile */}
      <div
        className={cn(
          'px-3 py-3 border-t border-slate-800/30',
          'flex items-center gap-3'
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            'flex-shrink-0 w-9 h-9 rounded-lg',
            'bg-gradient-to-br from-slate-700 to-slate-800',
            'flex items-center justify-center',
            'text-sm font-semibold text-slate-300'
          )}
        >
          {userInitials}
        </div>

        {/* User info - visible when expanded */}
        {isExpanded && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-slate-500 truncate capitalize">
              {userRole}
            </p>
          </div>
        )}

        {/* Sign out button */}
        {isExpanded && onSignOut && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onSignOut}
                className={cn(
                  'p-2 rounded-lg transition-colors duration-200',
                  'text-slate-500 hover:text-red-400 hover:bg-red-500/10'
                )}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <p>Sign out</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
