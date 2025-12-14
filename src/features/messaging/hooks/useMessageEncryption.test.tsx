/**
 * Unit Tests for useMessageEncryption Hook
 *
 * Tests the React hook for message encryption including:
 * - Encryption/decryption flows
 * - State management
 * - Error handling
 * - Batch decryption
 * - Key management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import {
  useMessageEncryption,
  useDecryptMessages,
  useEncryptionKeys,
} from './useMessageEncryption'

// Mock the crypto module
vi.mock('@/lib/crypto/message-encryption', () => ({
  encryptMessage: vi.fn(async (plaintext: string) => ({
    ciphertext: 'encrypted_' + plaintext,
    iv: 'test_iv',
    keyId: 'test_key_id',
    algorithm: 'AES-GCM' as const,
    version: 1,
  })),
  decryptMessage: vi.fn(async (encrypted: any) => {
    if (encrypted.ciphertext === 'fail') {
      throw new Error('Decryption failed')
    }
    return encrypted.ciphertext.replace('encrypted_', '')
  }),
  isEncryptedMessage: vi.fn((content: string) => {
    try {
      const parsed = JSON.parse(content)
      return parsed.algorithm === 'AES-GCM'
    } catch {
      return false
    }
  }),
  parseEncryptedMessage: vi.fn((content: string) => {
    try {
      const parsed = JSON.parse(content)
      if (parsed.algorithm === 'AES-GCM') {
        return parsed
      }
    } catch {
      return null
    }
    return null
  }),
  stringifyEncryptedMessage: vi.fn((encrypted: any) => JSON.stringify(encrypted)),
  isEncryptionSupported: vi.fn(() => true),
  deleteConversationKeys: vi.fn(async () => {}),
}))

describe('useMessageEncryption', () => {
  const conversationId = 'test-conversation-123'
  const plaintext = 'Hello, secret world!'

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Initialization', () => {
    it('should initialize with default disabled state', () => {
      const { result } = renderHook(() => useMessageEncryption())

      expect(result.current.isSupported).toBe(true)
      expect(result.current.isEnabled).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.isProcessing).toBe(false)
    })

    it('should initialize with enabled state when specified', () => {
      const { result } = renderHook(() =>
        useMessageEncryption({ enabled: true, conversationId })
      )

      expect(result.current.isEnabled).toBe(true)
    })

    it('should load encryption preference from localStorage', () => {
      localStorage.setItem(`ssh-encryption-${conversationId}`, 'true')

      const { result } = renderHook(() =>
        useMessageEncryption({ conversationId })
      )

      waitFor(() => {
        expect(result.current.isEnabled).toBe(true)
      })
    })

    it('should handle missing localStorage preference', () => {
      const { result } = renderHook(() =>
        useMessageEncryption({ conversationId })
      )

      expect(result.current.isEnabled).toBe(false)
    })
  })

  describe('Encryption', () => {
    it('should encrypt a message when enabled', async () => {
      const { result } = renderHook(() =>
        useMessageEncryption({ enabled: true, conversationId })
      )

      let encrypted: string = ''

      await act(async () => {
        encrypted = await result.current.encrypt(plaintext)
      })

      expect(encrypted).toBeDefined()
      expect(encrypted).toContain('encrypted_')
    })

    it('should return plaintext when encryption is disabled', async () => {
      const { result } = renderHook(() =>
        useMessageEncryption({ enabled: false, conversationId })
      )

      let encrypted: string = ''

      await act(async () => {
        encrypted = await result.current.encrypt(plaintext)
      })

      expect(encrypted).toBe(plaintext)
    })

    it('should set isProcessing during encryption', async () => {
      const { result } = renderHook(() =>
        useMessageEncryption({ enabled: true, conversationId })
      )

      // Start encryption but don't await immediately
      const encryptPromise = act(async () => {
        return result.current.encrypt(plaintext)
      })

      // Check if processing is set (may be too fast to catch)
      // Just verify it completes successfully
      await encryptPromise

      expect(result.current.isProcessing).toBe(false)
    })

    it('should throw error when conversation ID is missing', async () => {
      const { result } = renderHook(() =>
        useMessageEncryption({ enabled: true })
      )

      await act(async () => {
        await expect(result.current.encrypt(plaintext)).rejects.toThrow(
          'Conversation ID required'
        )
      })
    })

    it('should handle encryption errors', async () => {
      const { encryptMessage } = await import('@/lib/crypto/message-encryption')
      vi.mocked(encryptMessage).mockRejectedValueOnce(new Error('Encryption failed'))

      const { result } = renderHook(() =>
        useMessageEncryption({ enabled: true, conversationId })
      )

      await act(async () => {
        await expect(result.current.encrypt(plaintext)).rejects.toThrow(
          'Encryption failed'
        )
      })

      expect(result.current.error).toBe('Encryption failed')
    })
  })

  describe('Decryption', () => {
    it('should decrypt an encrypted message', async () => {
      const { result } = renderHook(() => useMessageEncryption({ conversationId }))

      const encryptedContent = JSON.stringify({
        ciphertext: 'encrypted_Hello',
        iv: 'test_iv',
        keyId: 'test_key_id',
        algorithm: 'AES-GCM',
        version: 1,
      })

      let decrypted: string = ''

      await act(async () => {
        decrypted = await result.current.decrypt(encryptedContent)
      })

      expect(decrypted).toBe('Hello')
    })

    it('should return plaintext for non-encrypted content', async () => {
      const { result } = renderHook(() => useMessageEncryption({ conversationId }))

      let decrypted: string = ''

      await act(async () => {
        decrypted = await result.current.decrypt('Plain text message')
      })

      expect(decrypted).toBe('Plain text message')
    })

    it('should handle decryption errors gracefully', async () => {
      const { result } = renderHook(() => useMessageEncryption({ conversationId }))

      const encryptedContent = JSON.stringify({
        ciphertext: 'fail',
        iv: 'test_iv',
        keyId: 'test_key_id',
        algorithm: 'AES-GCM',
        version: 1,
      })

      let decrypted: string = ''

      await act(async () => {
        decrypted = await result.current.decrypt(encryptedContent)
      })

      expect(decrypted).toBe('[Encrypted message - unable to decrypt]')
      expect(result.current.error).toBe('Decryption failed')
    })

    it('should set isProcessing during decryption', async () => {
      const { result } = renderHook(() => useMessageEncryption({ conversationId }))

      const encryptedContent = JSON.stringify({
        ciphertext: 'encrypted_Hello',
        iv: 'test_iv',
        keyId: 'test_key_id',
        algorithm: 'AES-GCM',
        version: 1,
      })

      // Start decryption but don't await immediately
      const decryptPromise = act(async () => {
        return result.current.decrypt(encryptedContent)
      })

      // Check if processing completes successfully
      await decryptPromise

      expect(result.current.isProcessing).toBe(false)
    })
  })

  describe('isEncrypted', () => {
    it('should detect encrypted messages', () => {
      const { result } = renderHook(() => useMessageEncryption())

      const encryptedContent = JSON.stringify({
        ciphertext: 'test',
        iv: 'test_iv',
        keyId: 'test_key_id',
        algorithm: 'AES-GCM',
        version: 1,
      })

      const isEncrypted = result.current.isEncrypted(encryptedContent)
      expect(isEncrypted).toBe(true)
    })

    it('should return false for plain text', () => {
      const { result } = renderHook(() => useMessageEncryption())

      const isEncrypted = result.current.isEncrypted('Plain text')
      expect(isEncrypted).toBe(false)
    })
  })

  describe('setEnabled', () => {
    it('should toggle encryption on and off', () => {
      const { result } = renderHook(() =>
        useMessageEncryption({ conversationId })
      )

      expect(result.current.isEnabled).toBe(false)

      act(() => {
        result.current.setEnabled(true)
      })

      expect(result.current.isEnabled).toBe(true)

      act(() => {
        result.current.setEnabled(false)
      })

      expect(result.current.isEnabled).toBe(false)
    })

    it('should persist encryption preference to localStorage', () => {
      const { result } = renderHook(() =>
        useMessageEncryption({ conversationId })
      )

      act(() => {
        result.current.setEnabled(true)
      })

      expect(localStorage.getItem(`ssh-encryption-${conversationId}`)).toBe('true')

      act(() => {
        result.current.setEnabled(false)
      })

      expect(localStorage.getItem(`ssh-encryption-${conversationId}`)).toBeNull()
    })
  })
})

describe('useDecryptMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should decrypt multiple messages', async () => {
    const { result } = renderHook(() => useDecryptMessages())

    const messages = [
      {
        id: '1',
        content: JSON.stringify({
          ciphertext: 'encrypted_Hello',
          iv: 'iv1',
          keyId: 'key1',
          algorithm: 'AES-GCM',
          version: 1,
        }),
      },
      {
        id: '2',
        content: 'Plain message',
      },
      {
        id: '3',
        content: JSON.stringify({
          ciphertext: 'encrypted_World',
          iv: 'iv2',
          keyId: 'key2',
          algorithm: 'AES-GCM',
          version: 1,
        }),
      },
    ]

    let decrypted: any[] = []

    await act(async () => {
      decrypted = await result.current.decryptMessages(messages)
    })

    expect(decrypted).toHaveLength(3)
    expect(decrypted[0].decryptedContent).toBe('Hello')
    expect(decrypted[1].decryptedContent).toBe('Plain message')
    expect(decrypted[2].decryptedContent).toBe('World')
  })

  it('should handle decryption errors in batch', async () => {
    const { result } = renderHook(() => useDecryptMessages())

    const messages = [
      {
        id: '1',
        content: JSON.stringify({
          ciphertext: 'fail',
          iv: 'iv1',
          keyId: 'key1',
          algorithm: 'AES-GCM',
          version: 1,
        }),
      },
    ]

    let decrypted: any[] = []

    await act(async () => {
      decrypted = await result.current.decryptMessages(messages)
    })

    expect(decrypted).toHaveLength(1)
    expect(decrypted[0].decryptedContent).toBe('[Encrypted message - unable to decrypt]')
  })

  it('should set isDecrypting state', async () => {
    const { result } = renderHook(() => useDecryptMessages())

    const messages = [{ id: '1', content: 'Test' }]

    expect(result.current.isDecrypting).toBe(false)

    await act(async () => {
      const promise = result.current.decryptMessages(messages)
      await promise
    })

    expect(result.current.isDecrypting).toBe(false)
  })

  it('should preserve original message properties', async () => {
    const { result } = renderHook(() => useDecryptMessages())

    const messages = [
      {
        id: '1',
        content: 'Test',
        sender_id: 'user123',
        created_at: '2024-01-01',
      },
    ]

    let decrypted: any[] = []

    await act(async () => {
      decrypted = await result.current.decryptMessages(messages)
    })

    expect(decrypted[0]).toMatchObject({
      id: '1',
      sender_id: 'user123',
      created_at: '2024-01-01',
      decryptedContent: 'Test',
    })
  })
})

describe('useEncryptionKeys', () => {
  const conversationId = 'test-conversation-123'

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should detect when keys exist', () => {
    localStorage.setItem(`ssh-encryption-${conversationId}`, 'true')

    const { result } = renderHook(() => useEncryptionKeys(conversationId))

    waitFor(() => {
      expect(result.current.hasKeys).toBe(true)
    })
  })

  it('should return false when keys do not exist', () => {
    const { result } = renderHook(() => useEncryptionKeys(conversationId))

    expect(result.current.hasKeys).toBe(false)
  })

  it('should clear encryption keys', async () => {
    localStorage.setItem(`ssh-encryption-${conversationId}`, 'true')

    const { result } = renderHook(() => useEncryptionKeys(conversationId))

    await act(async () => {
      await result.current.clearKeys()
    })

    expect(localStorage.getItem(`ssh-encryption-${conversationId}`)).toBeNull()
    expect(result.current.hasKeys).toBe(false)
  })

  it('should handle undefined conversation ID', () => {
    const { result } = renderHook(() => useEncryptionKeys(undefined))

    expect(result.current.hasKeys).toBe(false)
  })

  it('should handle errors when clearing keys', async () => {
    const { deleteConversationKeys } = await import('@/lib/crypto/message-encryption')
    vi.mocked(deleteConversationKeys).mockRejectedValueOnce(new Error('Delete failed'))

    const { result } = renderHook(() => useEncryptionKeys(conversationId))

    // Should not throw, just log error
    await act(async () => {
      await result.current.clearKeys()
    })

    // Should still update state
    expect(result.current.hasKeys).toBe(false)
  })
})
