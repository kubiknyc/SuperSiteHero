/**
 * MessageThread Component
 *
 * Displays messages in a conversation with:
 * - Infinite scroll pagination
 * - Real-time updates
 * - Typing indicators
 * - Message actions (edit, delete, react)
 */

import { useEffect, useRef, useCallback, useState, Fragment } from 'react'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import {
  MoreHorizontal,
  Edit2,
  Trash2,
  Reply,
  Smile,
  Paperclip,
  Check,
  CheckCheck,
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
import type { Message } from '@/types/messaging'
import { formatMentionsForDisplay, formatMessageTime } from '@/types/messaging'
import { cn } from '@/lib/utils'

interface MessageThreadProps {
  conversationId: string
  className?: string
}

// Common emoji reactions
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

export function MessageThread({ conversationId, className }: MessageThreadProps) {
  const { userProfile } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

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
  const messages = data?.pages.flat().reverse() || []

  // Mark as read when conversation is opened
  useEffect(() => {
    if (conversationId) {
      markAsRead.mutate(conversationId)
    }
  }, [conversationId])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current && !isFetchingNextPage) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return

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
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'MMMM d, yyyy')
  }

  // Check if should show date separator
  const shouldShowDateSeparator = (message: Message, prevMessage?: Message) => {
    if (!prevMessage) return true
    return !isSameDay(new Date(message.created_at), new Date(prevMessage.created_at))
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-muted-foreground">Loading messages...</div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn('flex flex-col overflow-y-auto px-4 py-2', className)}
    >
      {/* Load more indicator */}
      {isFetchingNextPage && (
        <div className="text-center py-2 text-sm text-muted-foreground">
          Loading earlier messages...
        </div>
      )}

      {hasNextPage && !isFetchingNextPage && (
        <div className="text-center py-2">
          <Button variant="ghost" size="sm" onClick={() => fetchNextPage()}>
            Load earlier messages
          </Button>
        </div>
      )}

      {/* Messages */}
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        messages.map((message, index) => {
          const prevMessage = messages[index - 1]
          const isOwnMessage = message.sender_id === userProfile?.id
          const showDateSeparator = shouldShowDateSeparator(message, prevMessage)

          return (
            <Fragment key={message.id}>
              {/* Date separator */}
              {showDateSeparator && (
                <div className="flex items-center gap-4 my-4">
                  <div className="flex-1 border-t" />
                  <span className="text-xs text-muted-foreground">
                    {formatDateSeparator(new Date(message.created_at))}
                  </span>
                  <div className="flex-1 border-t" />
                </div>
              )}

              {/* Message bubble */}
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
                  {/* Sender name (for group chats) */}
                  {!isOwnMessage && (
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
                      message.deleted_at && 'opacity-50 italic'
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

                        {/* Message text */}
                        <p
                          className="text-sm whitespace-pre-wrap break-words"
                          dangerouslySetInnerHTML={{
                            __html: message.deleted_at
                              ? 'This message was deleted'
                              : formatMentionsForDisplay(message.content),
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
            </Fragment>
          )
        })
      )}

      {/* Typing indicator */}
      {isTyping && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <div className="flex gap-1">
            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>
              .
            </span>
            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>
              .
            </span>
            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>
              .
            </span>
          </div>
          <span>
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing`
              : `${typingUsers.length} people are typing`}
          </span>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  )
}
