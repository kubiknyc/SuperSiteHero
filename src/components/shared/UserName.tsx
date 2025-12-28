/**
 * UserName Component
 *
 * Displays a user's name by fetching their profile from the database.
 * Falls back to a truncated UUID or custom fallback while loading or if not found.
 */

import { useUserProfile, getDisplayName } from '@/hooks/useUserProfile'
import { cn } from '@/lib/utils'

export interface UserNameProps {
  /** The user ID to fetch and display */
  userId: string | null | undefined
  /** Fallback text when user is not found */
  fallback?: string
  /** Additional CSS classes */
  className?: string
  /** Show loading state with truncated UUID */
  showLoadingState?: boolean
}

/**
 * Displays a user's name from their profile.
 * Shows truncated UUID during loading, or fallback if not found.
 *
 * @example
 * // Basic usage
 * <UserName userId={comment.created_by} />
 *
 * // With custom fallback
 * <UserName userId={task.assignee_id} fallback="Unassigned" />
 *
 * // With custom styling
 * <UserName userId={rfi.raised_by} className="font-semibold" />
 */
export function UserName({
  userId,
  fallback = 'Unknown User',
  className,
  showLoadingState = true,
}: UserNameProps) {
  const { data: user, isLoading } = useUserProfile(userId)

  // No user ID provided
  if (!userId) {
    return <span className={cn('text-muted-foreground', className)}>{fallback}</span>
  }

  // Loading state - show truncated UUID
  if (isLoading && showLoadingState) {
    return (
      <span className={cn('text-muted-foreground', className)}>
        {userId.substring(0, 8)}...
      </span>
    )
  }

  // User found - display their name
  if (user) {
    return <span className={className}>{getDisplayName(user, fallback)}</span>
  }

  // User not found - show fallback
  return <span className={cn('text-muted-foreground', className)}>{fallback}</span>
}

export default UserName
