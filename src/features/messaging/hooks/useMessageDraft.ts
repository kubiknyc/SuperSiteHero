/**
 * useMessageDraft Hook
 *
 * Persists message drafts to localStorage per conversation.
 * Automatically saves drafts as the user types and restores them
 * when returning to a conversation.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { logger } from '../../../lib/utils/logger';


const DRAFT_PREFIX = 'message-draft-'
const DEBOUNCE_MS = 500

/**
 * Custom hook for managing message drafts with localStorage persistence
 *
 * @param conversationId - The conversation ID to store the draft for
 * @returns Draft state and control functions
 *
 * @example
 * ```tsx
 * const { draft, saveDraft, clearDraft } = useMessageDraft(conversationId)
 *
 * // In your input
 * <textarea
 *   value={draft}
 *   onChange={(e) => saveDraft(e.target.value)}
 * />
 *
 * // Clear on send
 * onSend={() => {
 *   sendMessage()
 *   clearDraft()
 * }}
 * ```
 */
export function useMessageDraft(conversationId: string | undefined) {
  const storageKey = conversationId ? `${DRAFT_PREFIX}${conversationId}` : null

  // Initialize state from localStorage
  const [draft, setDraft] = useState<string>(() => {
    if (!storageKey) {return ''}
    try {
      return localStorage.getItem(storageKey) || ''
    } catch {
      // Handle localStorage errors (e.g., private browsing)
      return ''
    }
  })

  // Ref for debounce timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Load draft when conversation changes
  useEffect(() => {
    if (!storageKey) {
      setDraft('')
      return
    }

    try {
      const savedDraft = localStorage.getItem(storageKey)
      setDraft(savedDraft || '')
    } catch {
      setDraft('')
    }
  }, [storageKey])

  // Save draft to localStorage (debounced)
  const saveDraft = useCallback(
    (content: string) => {
      setDraft(content)

      // Clear any pending save
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Debounce the localStorage write
      debounceTimerRef.current = setTimeout(() => {
        if (!storageKey) {return}

        try {
          if (content.trim()) {
            localStorage.setItem(storageKey, content)
          } else {
            // Remove empty drafts
            localStorage.removeItem(storageKey)
          }
        } catch (error) {
          // Handle quota exceeded or other localStorage errors
          logger.warn('Failed to save message draft:', error)
        }
      }, DEBOUNCE_MS)
    },
    [storageKey]
  )

  // Clear draft immediately (used after sending)
  const clearDraft = useCallback(() => {
    setDraft('')

    // Clear any pending save
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (!storageKey) {return}

    try {
      localStorage.removeItem(storageKey)
    } catch {
      // Ignore errors
    }
  }, [storageKey])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    /** Current draft content */
    draft,
    /** Save content as draft (debounced to localStorage) */
    saveDraft,
    /** Clear the draft immediately */
    clearDraft,
    /** Whether a draft exists for this conversation */
    hasDraft: draft.trim().length > 0,
  }
}

/**
 * Get all draft conversation IDs
 * Useful for showing indicators in conversation list
 */
export function getDraftConversationIds(): string[] {
  const ids: string[] = []

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(DRAFT_PREFIX)) {
        const conversationId = key.slice(DRAFT_PREFIX.length)
        const content = localStorage.getItem(key)
        if (content?.trim()) {
          ids.push(conversationId)
        }
      }
    }
  } catch {
    // Ignore errors
  }

  return ids
}

/**
 * Clear all message drafts
 * Useful for logout cleanup
 */
export function clearAllDrafts(): void {
  try {
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(DRAFT_PREFIX)) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key))
  } catch {
    // Ignore errors
  }
}
