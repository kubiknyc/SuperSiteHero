// File: src/components/presence/PresenceAvatars.tsx
// Component to display avatars of users currently viewing a page/resource

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { PresenceUser } from '@/lib/realtime'

interface PresenceAvatarsProps {
  users: PresenceUser[]
  maxVisible?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showCurrentUser?: boolean
  currentUserId?: string
}

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
}

const overlapClasses = {
  sm: '-ml-2',
  md: '-ml-3',
  lg: '-ml-4',
}

/**
 * Display avatars of users currently viewing a resource
 *
 * @example
 * ```tsx
 * const { users } = useRealtimePresence({ roomId: 'project:123' })
 * <PresenceAvatars users={users} maxVisible={3} />
 * ```
 */
export function PresenceAvatars({
  users,
  maxVisible = 3,
  size = 'md',
  className,
  showCurrentUser = false,
  currentUserId,
}: PresenceAvatarsProps) {
  // Filter out current user if needed
  const filteredUsers = React.useMemo(() => {
    if (showCurrentUser || !currentUserId) {return users}
    return users.filter((u) => u.id !== currentUserId)
  }, [users, showCurrentUser, currentUserId])

  if (filteredUsers.length === 0) {return null}

  const visibleUsers = filteredUsers.slice(0, maxVisible)
  const remainingCount = filteredUsers.length - maxVisible
  const hasMore = remainingCount > 0

  return (
    <TooltipProvider>
      <div className={cn('flex items-center', className)}>
        {visibleUsers.map((user, index) => (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'relative rounded-full ring-2 ring-white dark:ring-gray-900',
                  sizeClasses[size],
                  index > 0 && overlapClasses[size]
                )}
                style={{ zIndex: visibleUsers.length - index }}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div
                    className={cn(
                      'flex h-full w-full items-center justify-center rounded-full font-medium text-white',
                      sizeClasses[size]
                    )}
                    style={{ backgroundColor: user.color }}
                  >
                    {getInitials(user.name)}
                  </div>
                )}
                {/* Online indicator dot */}
                <span
                  className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-900"
                  aria-hidden="true"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-medium">{user.name}</p>
              {user.currentPage && (
                <p className="text-disabled text-xs">Viewing: {user.currentPage}</p>
              )}
            </TooltipContent>
          </Tooltip>
        ))}

        {hasMore && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'flex items-center justify-center rounded-full bg-muted dark:bg-muted ring-2 ring-white dark:ring-gray-900 font-medium text-secondary dark:text-gray-300',
                  sizeClasses[size],
                  overlapClasses[size]
                )}
                style={{ zIndex: 0 }}
              >
                +{remainingCount}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="space-y-1">
                {filteredUsers.slice(maxVisible).map((user) => (
                  <p key={user.id} className="text-sm">
                    {user.name}
                  </p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export default PresenceAvatars
