/**
 * ReadReceiptsDisplay Component
 *
 * Displays who has read a message:
 * - Avatar stack of readers (max 3)
 * - "+N more" indicator for additional readers
 * - Tooltip with full list of readers and timestamps
 */

import { useMemo } from 'react'
import { format } from 'date-fns'
import { Check, CheckCheck, Eye } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatReadReceipts, type ReadReceipt } from '../hooks/useReadReceipts'

interface ReadReceiptsDisplayProps {
  /** Read receipts for the message */
  receipts: ReadReceipt[]
  /** Whether the current user sent this message */
  isOwnMessage: boolean
  /** Total number of participants (excluding sender) */
  participantCount?: number
  /** Max avatars to display */
  maxAvatars?: number
  /** Show as compact (single check icon) or expanded (avatars) */
  variant?: 'compact' | 'expanded' | 'avatars'
  className?: string
}

export function ReadReceiptsDisplay({
  receipts,
  isOwnMessage,
  participantCount = 0,
  maxAvatars = 3,
  variant = 'compact',
  className,
}: ReadReceiptsDisplayProps) {
  const { displayText, avatars, hasMore, moreCount } = useMemo(
    () => formatReadReceipts(receipts, maxAvatars),
    [receipts, maxAvatars]
  )

  const isReadByAll = participantCount > 0 && receipts.length >= participantCount
  const hasReaders = receipts.length > 0

  // Only show for own messages
  if (!isOwnMessage) {
    return null
  }

  // Compact variant: just check marks
  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn('inline-flex items-center', className)}>
              {isReadByAll ? (
                <CheckCheck className="h-3 w-3 text-primary" />
              ) : hasReaders ? (
                <CheckCheck className="h-3 w-3 text-muted-foreground" />
              ) : (
                <Check className="h-3 w-3 text-muted-foreground" />
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {hasReaders ? (
              <div className="space-y-1">
                <p className="font-medium text-xs">{displayText}</p>
                {receipts.slice(0, 5).map((receipt) => (
                  <p key={receipt.id} className="text-xs text-muted-foreground">
                    {receipt.user?.full_name || receipt.user?.email} -{' '}
                    {format(new Date(receipt.read_at), 'h:mm a')}
                  </p>
                ))}
                {receipts.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    +{receipts.length - 5} more
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs">Sent</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Expanded variant: text with tooltip
  if (variant === 'expanded') {
    if (!hasReaders) {
      return (
        <span className={cn('text-xs text-muted-foreground', className)}>
          <Check className="inline h-3 w-3 mr-1" />
          Sent
        </span>
      )
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'text-xs text-muted-foreground cursor-help flex items-center gap-1',
                className
              )}
            >
              <Eye className="h-3 w-3" />
              <span>{displayText}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              {receipts.map((receipt) => (
                <p key={receipt.id} className="text-xs">
                  {receipt.user?.full_name || receipt.user?.email} -{' '}
                  {format(new Date(receipt.read_at), 'MMM d, h:mm a')}
                </p>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Avatars variant: show avatar stack
  if (!hasReaders) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center -space-x-1.5', className)}>
            {avatars.map((receipt, index) => (
              <div
                key={receipt.id}
                className="relative inline-block"
                style={{ zIndex: maxAvatars - index }}
              >
                {receipt.user?.avatar_url ? (
                  <img
                    src={receipt.user.avatar_url}
                    alt=""
                    className="h-4 w-4 rounded-full border border-background object-cover"
                  />
                ) : (
                  <div className="h-4 w-4 rounded-full bg-muted border border-background flex items-center justify-center text-[8px] font-medium">
                    {receipt.user?.full_name?.charAt(0) || '?'}
                  </div>
                )}
              </div>
            ))}
            {hasMore && (
              <div
                className="h-4 w-4 rounded-full bg-muted border border-background flex items-center justify-center text-[8px] font-medium"
                style={{ zIndex: 0 }}
              >
                +{moreCount}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium text-xs">{displayText}</p>
            {receipts.slice(0, 8).map((receipt) => (
              <p key={receipt.id} className="text-xs text-muted-foreground">
                {receipt.user?.full_name || receipt.user?.email} -{' '}
                {format(new Date(receipt.read_at), 'h:mm a')}
              </p>
            ))}
            {receipts.length > 8 && (
              <p className="text-xs text-muted-foreground">
                +{receipts.length - 8} more
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
