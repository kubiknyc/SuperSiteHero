/**
 * Unit Tests for Message Encryption Service
 *
 * Tests end-to-end encryption functionality including:
 * - Key generation and management
 * - Message encryption/decryption
 * - IndexedDB key storage
 * - Encryption helpers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  generateSymmetricKey,
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  isEncryptedMessage,
  parseEncryptedMessage,
  stringifyEncryptedMessage,
  isEncryptionSupported,
  deleteConversationKeys,
} from './message-encryption'

// Mock IndexedDB
const mockIndexedDB = {
  databases: new Map<string, any>(),
  open: vi.fn(),
}

describe('Message Encryption Service', () => {
  const testConversationId = 'test-conversation-123'
  const testPlaintext = 'This is a secret message'

  beforeEach(() => {
    // Mock Web Crypto API and IndexedDB
    if (!globalThis.crypto) {
      Object.defineProperty(globalThis, 'crypto', {
        value: {
          subtle: crypto.subtle,
          getRandomValues: crypto.getRandomValues.bind(crypto),
        },
      })
    }

    if (!globalThis.indexedDB) {
      Object.defineProperty(globalThis, 'indexedDB', {
        value: {
          open: vi.fn((name: string, version: number) => {
            const request = {
              result: null,
              error: null,
              onsuccess: null as any,
              onerror: null as any,
              onupgradeneeded: null as any,
            }

            setTimeout(() => {
              // Simulate upgrade
              if (request.onupgradeneeded) {
                const db = {
                  objectStoreNames: {
                    contains: vi.fn(() => false),
                  },
                  createObjectStore: vi.fn((name: string, options: any) => ({
                    createIndex: vi.fn(),
                  })),
                }
                request.onupgradeneeded({ target: { result: db } } as any)
              }

              // Simulate success
              request.result = {
                transaction: vi.fn((stores: string[], mode: string) => ({
                  objectStore: vi.fn(() => ({
                    put: vi.fn(() => ({
                      onsuccess: null,
                      onerror: null,
                    })),
                    get: vi.fn(() => ({
                      result: null,
                      onsuccess: null,
                      onerror: null,
                    })),
                    index: vi.fn(() => ({
                      getAll: vi.fn(() => ({
                        result: [],
                        onsuccess: null,
                        onerror: null,
                      })),
                      getAllKeys: vi.fn(() => ({
                        result: [],
                        onsuccess: null,
                        onerror: null,
                      })),
                    })),
                    delete: vi.fn(() => ({
                      onsuccess: null,
                      onerror: null,
                    })),
                  })),
                })),
              }

              if (request.onsuccess) {
                request.onsuccess({ target: { result: request.result } } as any)
              }
            }, 0)

            return request
          }),
        },
      })
    }
  })

  afterEach(async () => {
    // Clean up test data
    try {
      await deleteConversationKeys(testConversationId)
    } catch (err) {
      // Ignore cleanup errors
    }
  })

  describe('isEncryptionSupported', () => {
    it('should return true when crypto and indexedDB are available', () => {
      expect(isEncryptionSupported()).toBe(true)
    })
  })

  describe('Key Generation', () => {
    it('should generate a symmetric AES-256-GCM key', async () => {
      const key = await generateSymmetricKey()

      expect(key).toBeDefined()
      expect(key.type).toBe('secret')
      expect(key.algorithm.name).toBe('AES-GCM')
      // @ts-expect-error - length property exists on AES key
      expect(key.algorithm.length).toBe(256)
    })

    it('should generate extractable keys', async () => {
      const key = await generateSymmetricKey()
      expect(key.extractable).toBe(true)
    })

    it('should generate ECDH key pair', async () => {
      const keyPair = await generateKeyPair()

      expect(keyPair.publicKey).toBeDefined()
      expect(keyPair.privateKey).toBeDefined()
      expect(keyPair.publicKey.type).toBe('public')
      expect(keyPair.privateKey.type).toBe('private')
    })

    it('should export and import public key', async () => {
      const keyPair = await generateKeyPair()
      const exportedKey = await exportPublicKey(keyPair.publicKey)

      expect(typeof exportedKey).toBe('string')
      expect(exportedKey.length).toBeGreaterThan(0)

      const importedKey = await importPublicKey(exportedKey)
      expect(importedKey.type).toBe('public')
      expect(importedKey.algorithm.name).toBe('ECDH')
    })

    it('should derive shared key from ECDH key pairs', async () => {
      const aliceKeyPair = await generateKeyPair()
      const bobKeyPair = await generateKeyPair()

      // Derive shared secret (Alice's private + Bob's public)
      const sharedKeyAlice = await deriveSharedKey(
        aliceKeyPair.privateKey,
        bobKeyPair.publicKey
      )

      // Derive shared secret (Bob's private + Alice's public)
      const sharedKeyBob = await deriveSharedKey(
        bobKeyPair.privateKey,
        aliceKeyPair.publicKey
      )

      // Both should produce the same symmetric key
      expect(sharedKeyAlice).toBeDefined()
      expect(sharedKeyBob).toBeDefined()

      // Export both to compare
      const exportedAlice = await crypto.subtle.exportKey('raw', sharedKeyAlice)
      const exportedBob = await crypto.subtle.exportKey('raw', sharedKeyBob)

      expect(new Uint8Array(exportedAlice)).toEqual(new Uint8Array(exportedBob))
    })
  })

  describe('Encryption and Decryption', () => {
    it('should encrypt and decrypt a message successfully', async () => {
      const encrypted = await encryptMessage(testPlaintext, testConversationId)

      expect(encrypted).toBeDefined()
      expect(encrypted.ciphertext).toBeDefined()
      expect(encrypted.iv).toBeDefined()
      expect(encrypted.keyId).toBeDefined()
      expect(encrypted.algorithm).toBe('AES-GCM')
      expect(encrypted.version).toBe(1)

      const decrypted = await decryptMessage(encrypted)
      expect(decrypted).toBe(testPlaintext)
    })

    it('should produce different ciphertexts for same plaintext', async () => {
      const encrypted1 = await encryptMessage(testPlaintext, testConversationId)
      const encrypted2 = await encryptMessage(testPlaintext, testConversationId)

      // Should have different IVs
      expect(encrypted1.iv).not.toBe(encrypted2.iv)
      // Should have different ciphertexts (due to different IVs)
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext)
    })

    it('should reuse the same key for messages in same conversation', async () => {
      const encrypted1 = await encryptMessage(testPlaintext, testConversationId)
      const encrypted2 = await encryptMessage('Another message', testConversationId)

      // Should use the same key ID
      expect(encrypted1.keyId).toBe(encrypted2.keyId)
    })

    it('should use different keys for different conversations', async () => {
      const conversation1 = 'conversation-1'
      const conversation2 = 'conversation-2'

      const encrypted1 = await encryptMessage(testPlaintext, conversation1)
      const encrypted2 = await encryptMessage(testPlaintext, conversation2)

      // Should have different key IDs
      expect(encrypted1.keyId).not.toBe(encrypted2.keyId)

      // Clean up
      await deleteConversationKeys(conversation1)
      await deleteConversationKeys(conversation2)
    })

    it('should handle Unicode characters correctly', async () => {
      const unicodePlaintext = 'Hello 👋 世界 🌍 مرحبا'
      const encrypted = await encryptMessage(unicodePlaintext, testConversationId)
      const decrypted = await decryptMessage(encrypted)

      expect(decrypted).toBe(unicodePlaintext)
    })

    it('should handle empty string', async () => {
      const encrypted = await encryptMessage('', testConversationId)
      const decrypted = await decryptMessage(encrypted)

      expect(decrypted).toBe('')
    })

    it('should handle very long messages', async () => {
      const longPlaintext = 'A'.repeat(10000)
      const encrypted = await encryptMessage(longPlaintext, testConversationId)
      const decrypted = await decryptMessage(encrypted)

      expect(decrypted).toBe(longPlaintext)
    })

    it('should throw error when decrypting with missing key', async () => {
      const encrypted = await encryptMessage(testPlaintext, testConversationId)

      // Modify keyId to simulate missing key
      const badEncrypted = {
        ...encrypted,
        keyId: 'non-existent-key-id',
      }

      await expect(decryptMessage(badEncrypted)).rejects.toThrow()
    })

    it('should throw error when decrypting corrupted ciphertext', async () => {
      const encrypted = await encryptMessage(testPlaintext, testConversationId)

      // Corrupt the ciphertext
      const corruptedEncrypted = {
        ...encrypted,
        ciphertext: encrypted.ciphertext.slice(0, -10) + 'corrupted==',
      }

      await expect(decryptMessage(corruptedEncrypted)).rejects.toThrow()
    })
  })

  describe('Message Helpers', () => {
    it('should identify encrypted messages correctly', async () => {
      const encrypted = await encryptMessage(testPlaintext, testConversationId)
      const stringified = stringifyEncryptedMessage(encrypted)

      expect(isEncryptedMessage(stringified)).toBe(true)
    })

    it('should return false for non-encrypted messages', () => {
      expect(isEncryptedMessage('Hello, world!')).toBe(false)
      expect(isEncryptedMessage('{"not": "encrypted"}')).toBe(false)
      expect(isEncryptedMessage('')).toBe(false)
    })

    it('should stringify and parse encrypted messages', async () => {
      const encrypted = await encryptMessage(testPlaintext, testConversationId)
      const stringified = stringifyEncryptedMessage(encrypted)

      expect(typeof stringified).toBe('string')

      const parsed = parseEncryptedMessage(stringified)
      expect(parsed).toEqual(encrypted)
    })

    it('should return null when parsing invalid encrypted message', () => {
      expect(parseEncryptedMessage('invalid json')).toBe(null)
      expect(parseEncryptedMessage('{"not": "encrypted"}')).toBe(null)
      expect(parseEncryptedMessage('')).toBe(null)
    })

    it('should detect encrypted message format', () => {
      const validEncrypted = JSON.stringify({
        algorithm: 'AES-GCM',
        ciphertext: 'abc123',
        iv: 'def456',
        keyId: 'key123',
      })

      expect(isEncryptedMessage(validEncrypted)).toBe(true)
    })

    it('should reject incomplete encrypted message format', () => {
      const missingField = JSON.stringify({
        algorithm: 'AES-GCM',
        ciphertext: 'abc123',
        // Missing iv and keyId
      })

      expect(isEncryptedMessage(missingField)).toBe(false)
    })
  })

  describe('Key Management', () => {
    it('should delete conversation keys', async () => {
      // Create some encrypted messages to generate keys
      await encryptMessage(testPlaintext, testConversationId)

      // Delete the keys
      await deleteConversationKeys(testConversationId)

      // Try to encrypt again - should create new key
      const encrypted = await encryptMessage('New message', testConversationId)

      expect(encrypted).toBeDefined()
      expect(encrypted.keyId).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle encryption errors gracefully', async () => {
      // Try to encrypt with invalid conversation ID
      await expect(encryptMessage(testPlaintext, '')).rejects.toThrow()
    })

    it('should provide meaningful error messages', async () => {
      const encrypted = await encryptMessage(testPlaintext, testConversationId)

      // Try to decrypt with wrong key
      const wrongEncrypted = {
        ...encrypted,
        keyId: 'wrong-key-id-12345',
      }

      try {
        await decryptMessage(wrongEncrypted)
        expect.fail('Should have thrown error')
      } catch (err) {
        expect(err).toBeInstanceOf(Error)
        expect((err as Error).message).toContain('key not found')
      }
    })
  })

  describe('Security Properties', () => {
    it('should use different IVs for each encryption', async () => {
      const ivs = new Set<string>()

      for (let i = 0; i < 10; i++) {
        const encrypted = await encryptMessage(testPlaintext, testConversationId)
        ivs.add(encrypted.iv)
      }

      // All IVs should be unique
      expect(ivs.size).toBe(10)
    })

    it('should generate cryptographically random key IDs', async () => {
      const keyIds = new Set<string>()

      for (let i = 0; i < 5; i++) {
        const conversationId = `conversation-${i}`
        const encrypted = await encryptMessage(testPlaintext, conversationId)
        keyIds.add(encrypted.keyId)
        await deleteConversationKeys(conversationId)
      }

      // All key IDs should be unique
      expect(keyIds.size).toBe(5)

      // Key IDs should be hex strings of appropriate length
      keyIds.forEach((keyId) => {
        expect(keyId).toMatch(/^[0-9a-f]{32}$/)
      })
    })

    it('should mark encryption version for forward compatibility', async () => {
      const encrypted = await encryptMessage(testPlaintext, testConversationId)

      expect(encrypted.version).toBe(1)
    })

    it('should use AES-GCM algorithm', async () => {
      const encrypted = await encryptMessage(testPlaintext, testConversationId)

      expect(encrypted.algorithm).toBe('AES-GCM')
    })
  })

  describe('Performance', () => {
    it('should encrypt messages quickly', async () => {
      const startTime = performance.now()

      for (let i = 0; i < 10; i++) {
        await encryptMessage(`Message ${i}`, testConversationId)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete 10 encryptions in under 1 second
      expect(duration).toBeLessThan(1000)
    })

    it('should decrypt messages quickly', async () => {
      const encrypted = await encryptMessage(testPlaintext, testConversationId)

      const startTime = performance.now()

      for (let i = 0; i < 10; i++) {
        await decryptMessage(encrypted)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete 10 decryptions in under 500ms
      expect(duration).toBeLessThan(500)
    })
  })
})
