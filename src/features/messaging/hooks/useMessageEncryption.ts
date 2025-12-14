/**
 * Message Encryption Hook
 *
 * React hook for encrypting/decrypting messages in conversations.
 * Provides a simple interface for E2E encryption.
 */

import { useState, useCallback, useEffect } from 'react'
import {
  encryptMessage,
  decryptMessage,
  isEncryptedMessage,
  parseEncryptedMessage,
  stringifyEncryptedMessage,
  isEncryptionSupported,
  deleteConversationKeys,
  type EncryptedMessage,
} from '@/lib/crypto/message-encryption'

export interface UseMessageEncryptionOptions {
  /** Enable encryption for this conversation */
  enabled?: boolean
  /** Conversation ID */
  conversationId?: string
}

export interface UseMessageEncryptionReturn {
  /** Whether encryption is supported in this browser */
  isSupported: boolean
  /** Whether encryption is enabled for this conversation */
  isEnabled: boolean
  /** Encrypt a message */
  encrypt: (plaintext: string) => Promise<string>
  /** Decrypt a message */
  decrypt: (content: string) => Promise<string>
  /** Check if content is encrypted */
  isEncrypted: (content: string) => boolean
  /** Toggle encryption on/off */
  setEnabled: (enabled: boolean) => void
  /** Error state */
  error: string | null
  /** Loading state during encryption/decryption */
  isProcessing: boolean
}

/**
 * Hook for message encryption
 */
export function useMessageEncryption(
  options: UseMessageEncryptionOptions = {}
): UseMessageEncryptionReturn {
  const { enabled: initialEnabled = false, conversationId } = options

  const [isEnabled, setIsEnabled] = useState(initialEnabled)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const isSupported = isEncryptionSupported()

  // Load encryption preference from localStorage
  useEffect(() => {
    if (conversationId && isSupported) {
      const stored = localStorage.getItem(`ssh-encryption-${conversationId}`)
      if (stored === 'true') {
        setIsEnabled(true)
      }
    }
  }, [conversationId, isSupported])

  // Save encryption preference
  const handleSetEnabled = useCallback(
    (enabled: boolean) => {
      setIsEnabled(enabled)
      if (conversationId) {
        if (enabled) {
          localStorage.setItem(`ssh-encryption-${conversationId}`, 'true')
        } else {
          localStorage.removeItem(`ssh-encryption-${conversationId}`)
        }
      }
    },
    [conversationId]
  )

  // Encrypt a message
  const encrypt = useCallback(
    async (plaintext: string): Promise<string> => {
      if (!isSupported) {
        throw new Error('Encryption not supported in this browser')
      }

      if (!conversationId) {
        throw new Error('Conversation ID required for encryption')
      }

      if (!isEnabled) {
        return plaintext // Return as-is if encryption disabled
      }

      setIsProcessing(true)
      setError(null)

      try {
        const encrypted = await encryptMessage(plaintext, conversationId)
        return stringifyEncryptedMessage(encrypted)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Encryption failed'
        setError(message)
        throw new Error(message)
      } finally {
        setIsProcessing(false)
      }
    },
    [isSupported, conversationId, isEnabled]
  )

  // Decrypt a message
  const decrypt = useCallback(
    async (content: string): Promise<string> => {
      if (!isSupported) {
        return content // Return as-is if not supported
      }

      // Check if content is actually encrypted
      if (!isEncryptedMessage(content)) {
        return content // Return as-is if not encrypted
      }

      setIsProcessing(true)
      setError(null)

      try {
        const encrypted = parseEncryptedMessage(content)
        if (!encrypted) {
          return content
        }

        return await decryptMessage(encrypted)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Decryption failed'
        setError(message)
        // Return placeholder for failed decryption
        return '[Encrypted message - unable to decrypt]'
      } finally {
        setIsProcessing(false)
      }
    },
    [isSupported]
  )

  // Check if content is encrypted
  const checkEncrypted = useCallback((content: string): boolean => {
    return isEncryptedMessage(content)
  }, [])

  return {
    isSupported,
    isEnabled,
    encrypt,
    decrypt,
    isEncrypted: checkEncrypted,
    setEnabled: handleSetEnabled,
    error,
    isProcessing,
  }
}

/**
 * Hook for batch decrypting multiple messages
 */
export function useDecryptMessages() {
  const [isDecrypting, setIsDecrypting] = useState(false)

  const decryptMessages = useCallback(
    async <T extends { content: string }>(
      messages: T[]
    ): Promise<(T & { decryptedContent: string })[]> => {
      if (!isEncryptionSupported()) {
        return messages.map((m) => ({ ...m, decryptedContent: m.content }))
      }

      setIsDecrypting(true)

      try {
        const decrypted = await Promise.all(
          messages.map(async (message) => {
            if (isEncryptedMessage(message.content)) {
              try {
                const encrypted = parseEncryptedMessage(message.content)
                if (encrypted) {
                  const plaintext = await decryptMessage(encrypted)
                  return { ...message, decryptedContent: plaintext }
                }
              } catch {
                return {
                  ...message,
                  decryptedContent: '[Encrypted message - unable to decrypt]',
                }
              }
            }
            return { ...message, decryptedContent: message.content }
          })
        )

        return decrypted
      } finally {
        setIsDecrypting(false)
      }
    },
    []
  )

  return {
    decryptMessages,
    isDecrypting,
  }
}

/**
 * Hook for managing encryption keys
 */
export function useEncryptionKeys(conversationId: string | undefined) {
  const [hasKeys, setHasKeys] = useState(false)

  // Check if keys exist for conversation
  useEffect(() => {
    if (!conversationId || !isEncryptionSupported()) {
      setHasKeys(false)
      return
    }

    // Check localStorage for encryption preference as proxy for key existence
    const stored = localStorage.getItem(`ssh-encryption-${conversationId}`)
    setHasKeys(stored === 'true')
  }, [conversationId])

  // Clear keys for conversation
  const clearKeys = useCallback(async () => {
    if (!conversationId) return

    try {
      await deleteConversationKeys(conversationId)
      localStorage.removeItem(`ssh-encryption-${conversationId}`)
      setHasKeys(false)
    } catch (err) {
      console.error('Failed to clear encryption keys:', err)
    }
  }, [conversationId])

  return {
    hasKeys,
    clearKeys,
  }
}

export default useMessageEncryption
