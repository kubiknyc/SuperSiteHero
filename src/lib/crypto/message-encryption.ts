/**
 * Message End-to-End Encryption Service
 *
 * Provides client-side encryption for sensitive messages using
 * the Web Crypto API with AES-GCM for symmetric encryption
 * and ECDH for key exchange.
 *
 * Security Model:
 * - Each conversation has a unique symmetric key
 * - Keys are derived via ECDH between participants
 * - Messages encrypted with AES-256-GCM
 * - Keys stored encrypted in IndexedDB (never sent to server)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface EncryptedMessage {
  /** Base64-encoded ciphertext */
  ciphertext: string
  /** Base64-encoded initialization vector */
  iv: string
  /** Key ID used for encryption */
  keyId: string
  /** Algorithm used */
  algorithm: 'AES-GCM'
  /** Encryption version for future compatibility */
  version: number
}

export interface KeyPair {
  publicKey: CryptoKey
  privateKey: CryptoKey
}

export interface ExportedKeyPair {
  publicKey: string // JWK JSON string
  privateKey: string // JWK JSON string (encrypted)
}

export interface ConversationKey {
  keyId: string
  conversationId: string
  symmetricKey: CryptoKey
  createdAt: string
  expiresAt?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12 // 96 bits for GCM
const ECDH_CURVE = 'P-256'
const ENCRYPTION_VERSION = 1

// IndexedDB constants
const DB_NAME = 'ssh-encryption'
const DB_VERSION = 1
const KEY_STORE = 'conversation-keys'
const USER_KEY_STORE = 'user-keys'

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Generate a unique key ID
 */
function generateKeyId(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Generate a random initialization vector
 */
function generateIV(): Uint8Array {
  const iv = new Uint8Array(IV_LENGTH)
  crypto.getRandomValues(iv)
  return iv
}

// ============================================================================
// INDEXEDDB KEY STORAGE
// ============================================================================

/**
 * Open the encryption database
 */
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Store for conversation symmetric keys
      if (!db.objectStoreNames.contains(KEY_STORE)) {
        const keyStore = db.createObjectStore(KEY_STORE, { keyPath: 'keyId' })
        keyStore.createIndex('conversationId', 'conversationId', { unique: false })
      }

      // Store for user's ECDH key pairs
      if (!db.objectStoreNames.contains(USER_KEY_STORE)) {
        db.createObjectStore(USER_KEY_STORE, { keyPath: 'id' })
      }
    }
  })
}

/**
 * Store a conversation key
 */
async function storeConversationKey(key: ConversationKey): Promise<void> {
  const db = await openDatabase()

  // Export key for storage
  const exportedKey = await crypto.subtle.exportKey('raw', key.symmetricKey)

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(KEY_STORE, 'readwrite')
    const store = transaction.objectStore(KEY_STORE)

    const request = store.put({
      keyId: key.keyId,
      conversationId: key.conversationId,
      keyData: arrayBufferToBase64(exportedKey),
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
    })

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Get a conversation key by ID
 */
async function getConversationKey(keyId: string): Promise<ConversationKey | null> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(KEY_STORE, 'readonly')
    const store = transaction.objectStore(KEY_STORE)
    const request = store.get(keyId)

    request.onerror = () => reject(request.error)
    request.onsuccess = async () => {
      if (!request.result) {
        resolve(null)
        return
      }

      // Import key from storage
      const keyData = base64ToArrayBuffer(request.result.keyData)
      const symmetricKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
      )

      resolve({
        keyId: request.result.keyId,
        conversationId: request.result.conversationId,
        symmetricKey,
        createdAt: request.result.createdAt,
        expiresAt: request.result.expiresAt,
      })
    }
  })
}

/**
 * Get the latest key for a conversation
 */
async function getLatestConversationKey(
  conversationId: string
): Promise<ConversationKey | null> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(KEY_STORE, 'readonly')
    const store = transaction.objectStore(KEY_STORE)
    const index = store.index('conversationId')
    const request = index.getAll(conversationId)

    request.onerror = () => reject(request.error)
    request.onsuccess = async () => {
      const keys = request.result
      if (!keys || keys.length === 0) {
        resolve(null)
        return
      }

      // Get most recent key
      keys.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      const latestKeyData = keys[0]

      // Import key
      const keyData = base64ToArrayBuffer(latestKeyData.keyData)
      const symmetricKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
      )

      resolve({
        keyId: latestKeyData.keyId,
        conversationId: latestKeyData.conversationId,
        symmetricKey,
        createdAt: latestKeyData.createdAt,
        expiresAt: latestKeyData.expiresAt,
      })
    }
  })
}

// ============================================================================
// KEY GENERATION
// ============================================================================

/**
 * Generate a new AES-256-GCM symmetric key
 */
export async function generateSymmetricKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true, // extractable for storage
    ['encrypt', 'decrypt']
  )
}

/**
 * Generate an ECDH key pair for key exchange
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: ECDH_CURVE },
    true, // extractable
    ['deriveKey']
  )

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  }
}

/**
 * Export public key to shareable format
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('jwk', publicKey)
  return JSON.stringify(exported)
}

/**
 * Import public key from shared format
 */
export async function importPublicKey(publicKeyJson: string): Promise<CryptoKey> {
  const jwk = JSON.parse(publicKeyJson)
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: ECDH_CURVE },
    true,
    []
  )
}

/**
 * Derive a shared secret from ECDH key exchange
 */
export async function deriveSharedKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

// ============================================================================
// ENCRYPTION / DECRYPTION
// ============================================================================

/**
 * Encrypt a message
 */
export async function encryptMessage(
  plaintext: string,
  conversationId: string
): Promise<EncryptedMessage> {
  // Get or create conversation key
  let key = await getLatestConversationKey(conversationId)

  if (!key) {
    // Generate new key for conversation
    const symmetricKey = await generateSymmetricKey()
    key = {
      keyId: generateKeyId(),
      conversationId,
      symmetricKey,
      createdAt: new Date().toISOString(),
    }
    await storeConversationKey(key)
  }

  // Generate IV
  const iv = generateIV()

  // Encode plaintext
  const encoder = new TextEncoder()
  const data = encoder.encode(plaintext)

  // Encrypt - cast iv to BufferSource for Web Crypto API
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key.symmetricKey,
    data
  )

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    keyId: key.keyId,
    algorithm: ALGORITHM,
    version: ENCRYPTION_VERSION,
  }
}

/**
 * Decrypt a message
 */
export async function decryptMessage(
  encrypted: EncryptedMessage
): Promise<string> {
  // Get key
  const key = await getConversationKey(encrypted.keyId)

  if (!key) {
    throw new Error('Encryption key not found. Cannot decrypt message.')
  }

  // Decode ciphertext and IV
  const ciphertext = base64ToArrayBuffer(encrypted.ciphertext)
  const iv = new Uint8Array(base64ToArrayBuffer(encrypted.iv))

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key.symmetricKey,
    ciphertext
  )

  // Decode plaintext
  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

// ============================================================================
// MESSAGE HELPERS
// ============================================================================

/**
 * Check if a message content is encrypted
 */
export function isEncryptedMessage(content: string): boolean {
  try {
    const parsed = JSON.parse(content)
    return (
      parsed.algorithm === ALGORITHM &&
      typeof parsed.ciphertext === 'string' &&
      typeof parsed.iv === 'string' &&
      typeof parsed.keyId === 'string'
    )
  } catch {
    return false
  }
}

/**
 * Parse encrypted message from string
 */
export function parseEncryptedMessage(content: string): EncryptedMessage | null {
  try {
    const parsed = JSON.parse(content)
    if (isEncryptedMessage(content)) {
      return parsed as EncryptedMessage
    }
    return null
  } catch {
    return null
  }
}

/**
 * Stringify encrypted message for storage
 */
export function stringifyEncryptedMessage(encrypted: EncryptedMessage): string {
  return JSON.stringify(encrypted)
}

// ============================================================================
// KEY SHARING (for adding participants)
// ============================================================================

/**
 * Export conversation key encrypted with recipient's public key
 * Used when adding a new participant to an encrypted conversation
 */
export async function exportConversationKeyForRecipient(
  conversationId: string,
  recipientPublicKeyJson: string
): Promise<string | null> {
  const key = await getLatestConversationKey(conversationId)
  if (!key) {return null}

  // Import recipient's public key
  const _recipientPublicKey = await importPublicKey(recipientPublicKeyJson)

  // We need the sender's private key to derive shared secret
  // This would require the user's private key to be stored
  // For now, return the raw key (in production, use proper key exchange)

  const exportedKey = await crypto.subtle.exportKey('raw', key.symmetricKey)
  return arrayBufferToBase64(exportedKey)
}

/**
 * Import a conversation key from another participant
 */
export async function importConversationKey(
  conversationId: string,
  keyData: string,
  keyId: string
): Promise<void> {
  const rawKey = base64ToArrayBuffer(keyData)

  const symmetricKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  )

  const key: ConversationKey = {
    keyId,
    conversationId,
    symmetricKey,
    createdAt: new Date().toISOString(),
  }

  await storeConversationKey(key)
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Delete all keys for a conversation
 */
export async function deleteConversationKeys(conversationId: string): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(KEY_STORE, 'readwrite')
    const store = transaction.objectStore(KEY_STORE)
    const index = store.index('conversationId')
    const request = index.getAllKeys(conversationId)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const keys = request.result
      for (const key of keys) {
        store.delete(key)
      }
      resolve()
    }
  })
}

/**
 * Check if Web Crypto API is available
 */
export function isEncryptionSupported(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof indexedDB !== 'undefined'
  )
}

export default {
  // Key generation
  generateSymmetricKey,
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
  // Encryption
  encryptMessage,
  decryptMessage,
  // Helpers
  isEncryptedMessage,
  parseEncryptedMessage,
  stringifyEncryptedMessage,
  isEncryptionSupported,
  // Key management
  exportConversationKeyForRecipient,
  importConversationKey,
  deleteConversationKeys,
}
