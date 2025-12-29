/**
 * ReplyIndicator Component
 *
 * Shows reply count and preview for threaded messages:
 * - Displays "X replies" count
 * - Shows avatar(s) of recent repliers
 * - Click to open thread sidebar
 */

import React from 'react'
import { MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReplyCount, useLatestReply } from '../hooks/useThread'

interface ReplyIndicatorProps {
  /** Parent message ID */
  messageId: string
  /** Pre-fetched reply count (optional - if not provided, will fetch) */
  replyCount?: number
  /** Callback when clicked to open thread */
  onClick?: () => void
  /** Show compact version (icon + count only) */
  compact?: boolean
  /** Additional CSS classes */
  className?: string
}

export function ReplyIndicator({
  messageId,
  replyCount: providedCount,
  onClick,
  compact = false,
  className,
}: ReplyIndicatorProps) {
  // Fetch reply count if not provided
  const { data: fetchedCount = 0 } = useReplyCount(
    providedCount === undefined ? messageId : undefined
  )

  // Get latest reply for preview (only in non-compact mode)
  const { data: latestReply } = useLatestReply(
    !compact && (providedCount ?? fetchedCount) > 0 ? messageId : undefined
  )

  const count = providedCount ?? fetchedCount

  // Don't render if no replies
  if (count === 0) {
    return null
  }

  // Compact view: just icon + count
  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors',
          className
        )}
      >
        <MessageSquare className="h-3 w-3" />
        <span>{count}</span>
      </button>
    )
  }

  // Full view with reply preview
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 mt-1 px-2 py-1 rounded-lg',
        'text-xs text-primary hover:bg-primary/10 transition-colors',
        'border border-transparent hover:border-primary/20',
        className
      )}
    >
      <MessageSquare className="h-3.5 w-3.5" />
      <span className="font-medium">
        {count} {count === 1 ? 'reply' : 'replies'}
      </span>

      {/* Latest replier avatar */}
      {latestReply?.sender && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span>·</span>
          {latestReply.sender.avatar_url ? (
            <img
              src={latestReply.sender.avatar_url}
              alt=""
              className="h-4 w-4 rounded-full object-cover"
            />
          ) : (
            <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-[10px]">
              {latestReply.sender.full_name?.charAt(0) || '?'}
            </div>
          )}
          <span className="truncate max-w-[100px]">
            {(latestReply.sender as any).first_name || latestReply.sender.full_name?.split(' ')[0]}
          </span>
        </div>
      )}
    </button>
  )
}

/**
 * Hook to get reply counts for multiple messages efficiently
 * Use this when rendering a list of messages
 */
export { useReplyCounts } from '../hooks/useThread'
