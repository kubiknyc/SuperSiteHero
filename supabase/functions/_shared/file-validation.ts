/**
 * Server-side File Validation Utilities
 * Mirrors client-side validation for defense-in-depth
 */

// ============================================================================
// Types
// ============================================================================

export interface ServerFileValidationResult {
  valid: boolean
  error?: string
  warnings?: string[]
  fileInfo?: {
    detectedMimeType: string
    signatureValid: boolean
    size: number
  }
}

export interface ServerValidationOptions {
  maxSize?: number
  allowedTypes?: string[]
  verifySignature?: boolean
  bucket?: string
  userId?: string
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/tiff',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/acad',
  'image/vnd.dwg',
  'application/x-autocad',
  'application/dxf',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
] as const

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/tiff',
  'image/heic',
  'image/heif',
] as const

/** File signatures (magic numbers) for verification */
const FILE_SIGNATURES: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]], // GIF87a or GIF89a
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF
  'application/zip': [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06]],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    [0x50, 0x4b, 0x03, 0x04],
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    [0x50, 0x4b, 0x03, 0x04],
  ],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
    [0x50, 0x4b, 0x03, 0x04],
  ],
}

/** Dangerous file extensions to block */
const BLOCKED_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.msi',
  '.scr',
  '.vbs',
  '.vbe',
  '.js',
  '.jse',
  '.ws',
  '.wsf',
  '.wsc',
  '.wsh',
  '.ps1',
  '.ps1xml',
  '.ps2',
  '.ps2xml',
  '.psc1',
  '.psc2',
  '.sh',
  '.bash',
  '.zsh',
  '.csh',
  '.dll',
  '.sys',
  '.drv',
  '.pif',
  '.application',
  '.gadget',
  '.msc',
  '.msp',
  '.reg',
  '.lnk',
  '.jar',
  '.class',
  '.php',
  '.php3',
  '.php4',
  '.php5',
  '.phtml',
  '.asp',
  '.aspx',
  '.cer',
  '.py',
  '.pyc',
  '.pyo',
  '.rb',
  '.pl',
  '.cgi',
]

/** Extension to MIME type mapping */
const EXTENSION_TO_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.zip': 'application/zip',
  '.dwg': 'image/vnd.dwg',
  '.dxf': 'application/dxf',
}

// ============================================================================
// Validation Functions
// ============================================================================

export function isBlockedExtension(filename: string): boolean {
  const lowerFilename = filename.toLowerCase()
  return BLOCKED_EXTENSIONS.some((ext) => lowerFilename.endsWith(ext))
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return ''
  }
  return filename.slice(lastDot).toLowerCase()
}

export function inferMimeType(filename: string): string | undefined {
  const ext = getFileExtension(filename)
  return EXTENSION_TO_MIME[ext]
}

export function verifyFileSignature(
  bytes: Uint8Array,
  expectedMimeType: string
): boolean {
  const signatures = FILE_SIGNATURES[expectedMimeType]

  if (!signatures) {
    return true // No signature to verify
  }

  return signatures.some((signature) => {
    if (bytes.length < signature.length) {
      return false
    }
    return signature.every((byte, index) => bytes[index] === byte)
  })
}

export function detectMimeTypeFromSignature(
  bytes: Uint8Array
): string | undefined {
  for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
    for (const signature of signatures) {
      if (bytes.length >= signature.length) {
        const matches = signature.every((byte, index) => bytes[index] === byte)
        if (matches) {
          return mimeType
        }
      }
    }
  }
  return undefined
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) {return '0 B'}
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`
}

export async function validateFileContent(
  fileContent: ArrayBuffer,
  filename: string,
  claimedMimeType: string,
  options: ServerValidationOptions = {}
): Promise<ServerFileValidationResult> {
  const {
    maxSize = DEFAULT_MAX_FILE_SIZE,
    allowedTypes = DOCUMENT_MIME_TYPES as unknown as string[],
    verifySignature = true,
  } = options

  const warnings: string[] = []
  const bytes = new Uint8Array(fileContent)
  const size = fileContent.byteLength

  // Check for blocked extensions
  if (isBlockedExtension(filename)) {
    return {
      valid: false,
      error: 'This file type is not allowed for security reasons.',
    }
  }

  // Check file size
  if (size > maxSize) {
    return {
      valid: false,
      error: `File size (${formatFileSize(size)}) exceeds maximum (${formatFileSize(maxSize)}).`,
    }
  }

  // Check if file is empty
  if (size === 0) {
    return {
      valid: false,
      error: 'File is empty.',
    }
  }

  // Determine MIME type
  let mimeType = claimedMimeType?.toLowerCase()
  let detectedMime: string | undefined

  if (verifySignature) {
    detectedMime = detectMimeTypeFromSignature(bytes.slice(0, 16))
  }

  // If no claimed type or generic, try to infer
  if (!mimeType || mimeType === 'application/octet-stream') {
    mimeType = inferMimeType(filename) || detectedMime || mimeType
    if (!mimeType) {
      warnings.push('Unable to determine file type.')
    }
  }

  // Check MIME type against allowlist
  if (mimeType && !allowedTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `File type "${mimeType}" is not allowed.`,
    }
  }

  // Verify signature matches claimed type
  let signatureValid = true
  if (verifySignature && mimeType) {
    signatureValid = verifyFileSignature(bytes.slice(0, 16), mimeType)
    if (!signatureValid) {
      // Check if detected type is allowed (possible mislabeled file)
      if (detectedMime && allowedTypes.includes(detectedMime)) {
        warnings.push(
          `File signature suggests ${detectedMime}, not ${mimeType}. Proceeding with caution.`
        )
        mimeType = detectedMime
        signatureValid = true
      } else {
        return {
          valid: false,
          error:
            'File content does not match the file type. The file may be corrupted or mislabeled.',
        }
      }
    }
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    fileInfo: {
      detectedMimeType: detectedMime || mimeType || 'unknown',
      signatureValid,
      size,
    },
  }
}

// ============================================================================
// Preset Validation Options
// ============================================================================

export const VALIDATION_PRESETS = {
  documents: {
    maxSize: 50 * 1024 * 1024,
    allowedTypes: DOCUMENT_MIME_TYPES as unknown as string[],
    verifySignature: true,
  },
  images: {
    maxSize: 20 * 1024 * 1024,
    allowedTypes: IMAGE_MIME_TYPES as unknown as string[],
    verifySignature: true,
  },
  pdfs: {
    maxSize: 100 * 1024 * 1024,
    allowedTypes: ['application/pdf'],
    verifySignature: true,
  },
  avatar: {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    verifySignature: true,
  },
} as const
