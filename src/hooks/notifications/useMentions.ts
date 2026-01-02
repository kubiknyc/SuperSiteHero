/**
 * useMentions Hook
 * 
 * Provides @mention functionality for comments and messages
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { sendNotification } from '@/lib/notifications/notification-service'
import { logger } from '@/lib/utils/logger'
import { useAuth } from '@/hooks/useAuth'

export interface MentionUser {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  email?: string
}

export interface MentionSuggestion extends MentionUser {
  score?: number
}

export interface ParsedMention {
  id: string
  user_id: string
  username: string
  display_name: string
  start_index: number
  end_index: number
  raw_text: string
}

export interface MentionContext {
  project_id?: string
  entity_type?: string
  entity_id?: string
  conversation_id?: string
}

const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g
const MENTION_TRIGGER_REGEX = /@(\w*)$/

export function useMentions(options?: {
  projectId?: string
  onMention?: (user: MentionUser) => void
  maxSuggestions?: number
}) {
  const { user: currentUser } = useAuth()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const triggerPosition = useRef<{ start: number; end: number } | null>(null)
  const maxSuggestions = options?.maxSuggestions || 5

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['mention-users', query, options?.projectId],
    queryFn: async (): Promise<MentionSuggestion[]> => {
      if (!query) return []

      const queryBuilder = supabase
        .from('users')
        .select('id, full_name, email, avatar_url')
        .or('full_name.ilike.%' + query + '%,email.ilike.%' + query + '%')
        .limit(maxSuggestions + 1)

      const { data, error } = await queryBuilder

      if (error) {
        logger.error('[useMentions] Failed to fetch users:', error)
        return []
      }

      return (data || [])
        .filter(u => u.id !== currentUser?.id)
        .slice(0, maxSuggestions)
        .map(u => ({
          id: u.id,
          username: u.email?.split('@')[0] || u.id.slice(0, 8),
          display_name: u.full_name || u.email?.split('@')[0] || 'Unknown',
          avatar_url: u.avatar_url,
          email: u.email,
        }))
    },
    enabled: query.length > 0 && isOpen,
    staleTime: 30000,
  })

  const handleInputChange = useCallback((value: string, cursorPosition: number) => {
    const textBeforeCursor = value.slice(0, cursorPosition)
    const match = textBeforeCursor.match(MENTION_TRIGGER_REGEX)

    if (match) {
      setQuery(match[1] || '')
      setIsOpen(true)
      setSelectedIndex(0)
      triggerPosition.current = { start: cursorPosition - match[0].length, end: cursorPosition }
    } else {
      setIsOpen(false)
      setQuery('')
      triggerPosition.current = null
    }
  }, [])

  const insertMention = useCallback((user: MentionUser, value: string): string => {
    if (!triggerPosition.current) return value
    const { start, end } = triggerPosition.current
    const mentionText = '@[' + user.display_name + '](' + user.id + ')'
    const newValue = value.slice(0, start) + mentionText + ' ' + value.slice(end)
    options?.onMention?.(user)
    setIsOpen(false)
    setQuery('')
    triggerPosition.current = null
    return newValue
  }, [options])

  const handleKeyDown = useCallback((
    event: React.KeyboardEvent,
    value: string,
    onChange: (value: string) => void
  ): boolean => {
    if (!isOpen || suggestions.length === 0) return false

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setSelectedIndex(i => (i + 1) % suggestions.length)
        return true
      case 'ArrowUp':
        event.preventDefault()
        setSelectedIndex(i => (i - 1 + suggestions.length) % suggestions.length)
        return true
      case 'Enter':
      case 'Tab':
        event.preventDefault()
        const selected = suggestions[selectedIndex]
        if (selected) onChange(insertMention(selected, value))
        return true
      case 'Escape':
        event.preventDefault()
        setIsOpen(false)
        return true
      default:
        return false
    }
  }, [isOpen, suggestions, selectedIndex, insertMention])

  const parseMentions = useCallback((text: string): ParsedMention[] => {
    const mentions: ParsedMention[] = []
    let match: RegExpExecArray | null
    MENTION_REGEX.lastIndex = 0
    while ((match = MENTION_REGEX.exec(text)) !== null) {
      mentions.push({
        id: 'mention-' + match.index,
        display_name: match[1],
        user_id: match[2],
        username: match[1].toLowerCase().replace(/\s+/g, ''),
        start_index: match.index,
        end_index: match.index + match[0].length,
        raw_text: match[0],
      })
    }
    return mentions
  }, [])

  const extractMentionedUserIds = useCallback((text: string): string[] => {
    return [...new Set(parseMentions(text).map(m => m.user_id))]
  }, [parseMentions])

  const toPlainText = useCallback((text: string): string => {
    return text.replace(MENTION_REGEX, '@$1')
  }, [])

  const notifyMentionedUsers = useCallback(async (
    text: string,
    context: MentionContext & { message_preview?: string; sender_name?: string }
  ): Promise<void> => {
    const userIds = extractMentionedUserIds(text).filter(id => id !== currentUser?.id)
    if (userIds.length === 0) return

    const preview = context.message_preview || toPlainText(text).slice(0, 100)

    for (const userId of userIds) {
      try {
        await sendNotification({
          user_id: userId,
          type: 'mention',
          title: (context.sender_name || 'Someone') + ' mentioned you',
          message: preview + (preview.length >= 100 ? '...' : ''),
          link: context.conversation_id ? '/messages/' + context.conversation_id : undefined,
          data: context,
        })
      } catch (error) {
        logger.error('[useMentions] Failed to notify:', userId, error)
      }
    }
  }, [currentUser?.id, extractMentionedUserIds, toPlainText])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return {
    query, isOpen, suggestions, selectedIndex, isLoading, inputRef,
    setIsOpen, setSelectedIndex, handleInputChange, handleKeyDown, insertMention,
    parseMentions, extractMentionedUserIds, toPlainText, notifyMentionedUsers,
  }
}

export default useMentions
