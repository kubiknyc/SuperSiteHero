/**
 * MessageThread Component
 *
 * Displays messages in a conversation with:
 * - Infinite scroll pagination
 * - Real-time updates
 * - Typing indicators
 * - Message actions (edit, delete, react)
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import DOMPurify from 'dompurify'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  MoreHorizontal,
  Edit2,
  Trash2,
  Reply,
  Smile,
  Paperclip,
  Check,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useMessagesInfinite,
  useMarkAsRead,
  useDeleteMessage,
  useEditMessage,
  useAddReaction,
  useConversationRealtime,
} from '../hooks'
import { useAuth } from '@/lib/auth/AuthContext'
import type { Message, MessagePriority } from '@/types/messaging'
import { formatMentionsForDisplay, formatMessageTime, MESSAGE_PRIORITY_CONFIG } from '@/types/messaging'
import { cn } from '@/lib/utils'

interface MessageThreadProps {
  conversationId: string
  className?: string
}

// Common emoji reactions
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

/**
 * Sanitize HTML content to prevent XSS attacks
 * Used for message content that may contain mention markup
 * Only allows span tags with class attribute (for mentions styling)
 */
function sanitizeMessageContent(content: string): string {
  // Use type assertion to fix DOMPurify config type mismatch
  const config = {
    ALLOWED_TAGS: ['span'],
    ALLOWED_ATTR: ['class'],
  } as Parameters<typeof DOMPurify.sanitize>[1]
  return DOMPurify.sanitize(content, config)
}

// Virtual list item types
type VirtualItem =
  | { type: 'date-separator'; date: Date; key: string }
  | { type: 'message'; message: Message; key: string }
  | { type: 'load-more'; key: string }
  | { type: 'typing'; key: string }

// Estimate item heights for virtual scrolling
const ITEM_HEIGHTS = {
  'date-separator': 48,
  'message': 80, // Base height, adjusted for attachments
  'load-more': 48,
  'typing': 40,
}

export function MessageThread({ conversationId, className }: MessageThreadProps) {
  const { userProfile } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const prevMessageCountRef = useRef(0)

  // Subscribe to realtime updates and typing indicators
  const { typingUsers, isTyping } = useConversationRealtime(conversationId)

  // Fetch messages with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useMessagesInfinite(conversationId)

  // Mutations
  const markAsRead = useMarkAsRead()
  const deleteMessage = useDeleteMessage()
  const editMessage = useEditMessage()
  const addReaction = useAddReaction()

  // Flatten pages into single array and reverse for display (newest at bottom)
  const messages = useMemo(() => data?.pages.flat().reverse() || [], [data])

  // Build virtual items array with date separators
  const virtualItems = useMemo(() => {
    const items: VirtualItem[] = []

    // Add load more button at top if there are more messages
    if (hasNextPage) {
      items.push({ type: 'load-more', key: 'load-more' })
    }

    // Add messages with date separators
    messages.forEach((message, index) => {
      const prevMessage = messages[index - 1]
      const showDateSeparator = !prevMessage ||
        !isSameDay(new Date(message.created_at), new Date(prevMessage.created_at))

      if (showDateSeparator) {
        items.push({
          type: 'date-separator',
          date: new Date(message.created_at),
          key: `separator-${message.id}`,
        })
      }

      items.push({ type: 'message', message, key: message.id })
    })

    // Add typing indicator at bottom if someone is typing
    if (isTyping) {
      items.push({ type: 'typing', key: 'typing' })
    }

    return items
  }, [messages, hasNextPage, isTyping])

  // Estimate size for each item
  const estimateSize = useCallback((index: number) => {
    const item = virtualItems[index]
    if (!item) {return ITEM_HEIGHTS.message}

    if (item.type === 'message') {
      // Increase height for messages with attachments or long content
      const message = item.message
      let height = ITEM_HEIGHTS.message
      if (message.attachments && message.attachments.length > 0) {
        height += 32 // Extra space for attachments
      }
      if (message.reactions && message.reactions.length > 0) {
        height += 24 // Extra space for reactions
      }
      if (message.content.length > 200) {
        height += Math.floor(message.content.length / 100) * 20
      }
      // Extra space for priority indicators
      if (message.priority && message.priority !== 'normal') {
        height += 20
      }
      return height
    }

    return ITEM_HEIGHTS[item.type] || ITEM_HEIGHTS.message
  }, [virtualItems])

  // Set up virtualizer
  const virtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => containerRef.current,
    estimateSize,
    overscan: 5,
  })

  // Mark as read when conversation is opened
  useEffect(() => {
    if (conversationId) {
      markAsRead.mutate(conversationId)
    }
  }, [conversationId])

  // Scroll to bottom on new messages (only when new messages arrive)
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current && !isFetchingNextPage) {
      // New message arrived, scroll to bottom
      virtualizer.scrollToIndex(virtualItems.length - 1, { align: 'end', behavior: 'smooth' })
    }
    prevMessageCountRef.current = messages.length
  }, [messages.length, virtualItems.length, isFetchingNextPage, virtualizer])

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    if (!containerRef.current) {return}

    const { scrollTop } = containerRef.current
    // Load more when scrolled near top
    if (scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Start editing a message
  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id)
    setEditContent(message.content)
  }

  // Save edited message
  const handleSaveEdit = () => {
    if (editingMessageId && editContent.trim()) {
      editMessage.mutate({
        messageId: editingMessageId,
        content: editContent.trim(),
      })
      setEditingMessageId(null)
      setEditContent('')
    }
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditContent('')
  }

  // Delete message
  const handleDelete = (messageId: string) => {
    if (confirm('Are you sure you want to delete this message?')) {
      deleteMessage.mutate({ messageId, conversationId })
    }
  }

  // Add reaction
  const handleReaction = (messageId: string, emoji: string) => {
    addReaction.mutate({ messageId, emoji, conversationId })
  }

  // Format date separator
  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) {return 'Today'}
    if (isYesterday(date)) {return 'Yesterday'}
    return format(date, 'MMMM d, yyyy')
  }

  // Render a single virtual item
  const renderVirtualItem = (item: VirtualItem) => {
    switch (item.type) {
      case 'load-more':
        return (
          <div className="text-center py-2">
            {isFetchingNextPage ? (
              <span className="text-sm text-muted-foreground">Loading earlier messages...</span>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => fetchNextPage()}>
                Load earlier messages
              </Button>
            )}
          </div>
        )

      case 'date-separator':
        return (
          <div className="flex items-center gap-4 my-4">
            <div className="flex-1 border-t" />
            <span className="text-xs text-muted-foreground">
              {formatDateSeparator(item.date)}
            </span>
            <div className="flex-1 border-t" />
          </div>
        )

      case 'typing':
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <div className="flex gap-1">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
            </div>
            <span>
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing`
                : `${typingUsers.length} people are typing`}
            </span>
          </div>
        )

      case 'message': {
        const message = item.message
        const isOwnMessage = message.sender_id === userProfile?.id
        const messagePriority = (message.priority || 'normal') as MessagePriority
        const priorityConfig = MESSAGE_PRIORITY_CONFIG[messagePriority]
        const hasHighPriority = messagePriority !== 'normal'

        return (
          <div
            className={cn(
              'flex gap-2 mb-2 group',
              isOwnMessage ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            {/* Avatar */}
            {!isOwnMessage && (
              <div className="flex-shrink-0">
                {message.sender?.avatar_url ? (
                  <img
                    src={message.sender.avatar_url}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {message.sender?.full_name?.charAt(0) || '?'}
                  </div>
                )}
              </div>
            )}

            <div
              className={cn(
                'max-w-[70%] flex flex-col',
                isOwnMessage ? 'items-end' : 'items-start'
              )}
            >
              {/* Priority indicator for high/urgent messages */}
              {hasHighPriority && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs font-medium mb-1 px-1',
                    messagePriority === 'high' && 'text-amber-600',
                    messagePriority === 'urgent' && 'text-red-600'
                  )}
                >
                  {messagePriority === 'high' ? (
                    <AlertTriangle className="h-3 w-3" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                  <span>{priorityConfig.label}</span>
                </div>
              )}

              {/* Sender name (for group chats) */}
              {!isOwnMessage && !hasHighPriority && (
                <span className="text-xs text-muted-foreground mb-1 px-1">
                  {message.sender?.full_name || message.sender?.email}
                </span>
              )}

              {/* Message content */}
              <div
                className={cn(
                  'relative rounded-2xl px-4 py-2',
                  isOwnMessage
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted rounded-bl-md',
                  message.deleted_at && 'opacity-50 italic',
                  // Priority styling (only for non-own messages to keep visibility)
                  !isOwnMessage && hasHighPriority && priorityConfig.borderClass,
                  !isOwnMessage && hasHighPriority && priorityConfig.bgClass
                )}
              >
                {editingMessageId === message.id ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="bg-background text-foreground rounded px-2 py-1 text-sm min-h-[60px]"
                      autoFocus
                    />
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveEdit}>
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {message.attachments.map((attachment, i) => (
                          <a
                            key={i}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs underline"
                          >
                            <Paperclip className="h-3 w-3" />
                            {attachment.name}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Message text - sanitized to prevent XSS */}
                    <p
                      className="text-sm whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={{
                        __html: message.deleted_at
                          ? 'This message was deleted'
                          : sanitizeMessageContent(formatMentionsForDisplay(message.content)),
                      }}
                    />

                    {/* Edited indicator */}
                    {message.edited_at && !message.deleted_at && (
                      <span className="text-xs opacity-70 ml-1">(edited)</span>
                    )}
                  </>
                )}
              </div>

              {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(
                    message.reactions.reduce(
                      (acc, r) => {
                        acc[r.emoji] = (acc[r.emoji] || 0) + 1
                        return acc
                      },
                      {} as Record<string, number>
                    )
                  ).map(([emoji, count]) => (
                    <span
                      key={emoji}
                      className="text-xs bg-muted rounded-full px-2 py-0.5"
                    >
                      {emoji} {count > 1 && count}
                    </span>
                  ))}
                </div>
              )}

              {/* Time and status */}
              <div className="flex items-center gap-1 mt-1 px-1">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(message.created_at), 'h:mm a')}
                </span>
                {isOwnMessage && (
                  <CheckCheck className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Message actions */}
            {!message.deleted_at && (
              <div
                className={cn(
                  'opacity-0 group-hover:opacity-100 transition-opacity self-center',
                  'flex gap-1'
                )}
              >
                {/* Quick reactions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isOwnMessage ? 'end' : 'start'}>
                    <div className="flex gap-1 p-1">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(message.id, emoji)}
                          className="hover:bg-muted rounded p-1 text-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* More actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isOwnMessage ? 'end' : 'start'}>
                    {isOwnMessage && (
                      <>
                        <DropdownMenuItem onClick={() => handleStartEdit(message)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(message.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem disabled>
                      <Reply className="h-4 w-4 mr-2" />
                      Reply
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        )
      }

      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-muted-foreground">Loading messages...</div>
      </div>
    )
  }

  // Empty state
  if (messages.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn('overflow-y-auto', className)}
    >
      {/* Virtual scroll container */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = virtualItems[virtualRow.index]
          if (!item) {return null}

          return (
            <div
              key={item.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="px-4 py-1"
            >
              {renderVirtualItem(item)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
