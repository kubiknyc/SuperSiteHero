/**
 * MessageSearchDialog Component
 *
 * Dialog for searching messages within a conversation:
 * - Full-text search across message content
 * - Results list with message previews
 * - Click to scroll to message in thread
 * - Highlight matching text
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { Search, X, MessageSquare, Calendar, User } from 'lucide-react'
import { format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button, Input } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import { cn } from '@/lib/utils'
import type { Message } from '@/types/messaging'
import { messagingKeys } from '../hooks/useMessaging'

// Using extended Database types for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface MessageSearchDialogProps {
  conversationId: string
  onSelectMessage?: (messageId: string) => void
  trigger?: React.ReactNode
}

interface SearchResult {
  message: Message
  highlights: string[]
}

/**
 * Highlight matching text in content
 */
function highlightText(text: string, query: string): string {
  if (!query.trim()) return text

  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi')
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-900">$1</mark>')
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Extract preview snippet around match
 */
function extractSnippet(content: string, query: string, maxLength = 150): string {
  const lowerContent = content.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const matchIndex = lowerContent.indexOf(lowerQuery)

  if (matchIndex === -1) {
    return content.slice(0, maxLength) + (content.length > maxLength ? '...' : '')
  }

  // Center the snippet around the match
  const start = Math.max(0, matchIndex - Math.floor(maxLength / 3))
  const end = Math.min(content.length, start + maxLength)

  let snippet = content.slice(start, end)
  if (start > 0) snippet = '...' + snippet
  if (end < content.length) snippet = snippet + '...'

  return snippet
}

export function MessageSearchDialog({
  conversationId,
  onSelectMessage,
  trigger,
}: MessageSearchDialogProps) {
  const { userProfile } = useAuth()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setDebouncedQuery('')
    }
  }, [open])

  // Search messages query
  const {
    data: results = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [...messagingKeys.messagesList(conversationId), 'search', debouncedQuery],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
        return []
      }

      const { data, error } = await db
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(
            id,
            email,
            first_name,
            last_name,
            full_name,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .ilike('content', `%${debouncedQuery}%`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      return (data || []).map((message: any) => ({
        message: message as Message,
        highlights: [extractSnippet(message.content, debouncedQuery)],
      }))
    },
    enabled: open && debouncedQuery.length >= 2,
    staleTime: 30000, // 30 seconds
  })

  // Handle message selection
  const handleSelectMessage = useCallback(
    (messageId: string) => {
      setOpen(false)
      onSelectMessage?.(messageId)
    },
    [onSelectMessage]
  )

  // Clear search
  const handleClear = () => {
    setQuery('')
    inputRef.current?.focus()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Search Messages</DialogTitle>
        </DialogHeader>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
            className="pl-10 pr-10"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-2 min-h-[200px]">
          {!debouncedQuery.trim() ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
              <MessageSquare className="h-12 w-12 mb-3 opacity-50" />
              <p>Enter at least 2 characters to search</p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-full py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <div className="text-center text-destructive py-8">
              Failed to search messages. Please try again.
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
              <Search className="h-12 w-12 mb-3 opacity-50" />
              <p>No messages found for "{debouncedQuery}"</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </p>
              {results.map(({ message, highlights }) => (
                <button
                  key={message.id}
                  onClick={() => handleSelectMessage(message.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-ring'
                  )}
                >
                  {/* Sender and time */}
                  <div className="flex items-center gap-2 mb-1.5">
                    {message.sender?.avatar_url ? (
                      <img
                        src={message.sender.avatar_url}
                        alt=""
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-xs">
                        <User className="h-3 w-3" />
                      </div>
                    )}
                    <span className="text-sm font-medium">
                      {message.sender_id === userProfile?.id
                        ? 'You'
                        : message.sender?.full_name || message.sender?.email || 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(message.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>

                  {/* Message preview with highlighting */}
                  <p
                    className="text-sm text-muted-foreground line-clamp-2"
                    dangerouslySetInnerHTML={{
                      __html: highlightText(highlights[0] || message.content, debouncedQuery),
                    }}
                  />
                </button>
              ))}
            </>
          )}
        </div>

        {/* Keyboard hint */}
        {results.length > 0 && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Click on a message to jump to it in the conversation
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
