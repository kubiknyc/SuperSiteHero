// File: src/components/realtime/TypingIndicator.tsx
// Component to show who is currently typing

import * as React from 'react'
import { cn } from '@/lib/utils'
import type { TypingState } from '@/lib/realtime'

interface TypingIndicatorProps {
  typingUsers: TypingState[]
  className?: string
  maxNames?: number
}

/**
 * Display typing indicator for realtime collaboration
 *
 * @example
 * ```tsx
 * const { typingUsers } = useRealtimePresence({ roomId: 'doc:123' })
 * <TypingIndicator typingUsers={typingUsers} />
 * ```
 */
export function TypingIndicator({
  typingUsers,
  className,
  maxNames = 2,
}: TypingIndicatorProps) {
  const activeTypers = typingUsers.filter((t) => t.isTyping)

  if (activeTypers.length === 0) {return null}

  const names = activeTypers.slice(0, maxNames).map((t) => t.userName)
  const remainingCount = activeTypers.length - maxNames

  let text: string
  if (names.length === 1) {
    text = `${names[0]} is typing`
  } else if (remainingCount > 0) {
    text = `${names.join(', ')} and ${remainingCount} other${remainingCount > 1 ? 's are' : ' is'} typing`
  } else {
    text = `${names.join(' and ')} are typing`
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm text-muted dark:text-disabled',
        className
      )}
    >
      <TypingDots />
      <span>{text}</span>
    </div>
  )
}

/**
 * Animated typing dots
 */
function TypingDots() {
  return (
    <div className="flex items-center gap-0.5">
      <span
        className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: '150ms' }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  )
}

export default TypingIndicator
