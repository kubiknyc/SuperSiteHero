/**
 * File Validation Utility
 *
 * Provides comprehensive file validation for uploads including:
 * - MIME type validation
 * - File size limits
 * - Magic number (file signature) verification
 * - Construction industry specific document types
 */

// ============================================================================
// Types
// ============================================================================

export interface FileValidationResult {
  valid: boolean
  error?: string
  warnings?: string[]
}

export interface FileValidationOptions {
  /** Maximum file size in bytes */
  maxSize?: number
  /** Allowed MIME types */
  allowedTypes?: string[]
  /** Whether to verify file signatures (magic numbers) */
  verifySignature?: boolean
  /** Custom error messages */
  messages?: {
    tooLarge?: string
    invalidType?: string
    invalidSignature?: string
  }
}

// ============================================================================
// Constants
// ============================================================================

/** Default max file size: 50MB */
export const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024

/** Common document MIME types for construction */
export const DOCUMENT_MIME_TYPES = [
  // PDFs
  'application/pdf',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/tiff',
  // Microsoft Office
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  // AutoCAD/CAD
  'application/acad', // .dwg
  'image/vnd.dwg', // .dwg
  'application/x-autocad', // .dwg
  'application/dxf', // .dxf
  // Text
  'text/plain',
  'text/csv',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
] as const

/** Image-only MIME types */
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

/** PDF-only MIME types */
export const PDF_MIME_TYPES = ['application/pdf'] as const

/** Spreadsheet MIME types */
export const SPREADSHEET_MIME_TYPES = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
] as const

/**
 * File signatures (magic numbers) for common file types
 * Used to verify actual file content matches claimed MIME type
 */
const FILE_SIGNATURES: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/jpeg': [[0xFF, 0xD8, 0xFF]], // JPEG
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]], // PNG
  'image/gif': [[0x47, 0x49, 0x46, 0x38]], // GIF87a or GIF89a
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP starts with RIFF)
  'application/zip': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06]], // PK (ZIP)
  // DOCX, XLSX, PPTX are all ZIP-based
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4B, 0x03, 0x04]],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [[0x50, 0x4B, 0x03, 0x04]],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [[0x50, 0x4B, 0x03, 0x04]],
}

/** Dangerous file extensions to block */
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr',
  '.vbs', '.vbe', '.js', '.jse', '.ws', '.wsf', '.wsc', '.wsh',
  '.ps1', '.ps1xml', '.ps2', '.ps2xml', '.psc1', '.psc2',
  '.sh', '.bash', '.zsh', '.csh',
  '.dll', '.sys', '.drv',
  '.pif', '.application', '.gadget',
  '.msc', '.msp', '.reg', '.lnk',
  '.jar', '.class',
  '.php', '.php3', '.php4', '.php5', '.phtml',
  '.asp', '.aspx', '.cer',
  '.py', '.pyc', '.pyo',
  '.rb', '.pl', '.cgi',
]

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if a file extension is blocked
 */
export function isBlockedExtension(filename: string): boolean {
  const lowerFilename = filename.toLowerCase()
  return BLOCKED_EXTENSIONS.some(ext => lowerFilename.endsWith(ext))
}

/**
 * Get the file extension from a filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return ''
  }
  return filename.slice(lastDot).toLowerCase()
}

/**
 * Verify file signature (magic numbers) matches claimed MIME type
 */
export async function verifyFileSignature(
  file: File,
  expectedMimeType: string
): Promise<boolean> {
  const signatures = FILE_SIGNATURES[expectedMimeType]

  // If we don't have signatures for this type, skip verification
  if (!signatures) {
    return true
  }

  try {
    // Read the first 16 bytes of the file
    const slice = file.slice(0, 16)
    const buffer = await slice.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // Check if any signature matches
    return signatures.some(signature => {
      if (bytes.length < signature.length) {
        return false
      }
      return signature.every((byte, index) => bytes[index] === byte)
    })
  } catch {
    // If we can't read the file, assume it's invalid
    return false
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`
}

/**
 * Validate a file against specified criteria
 */
export async function validateFile(
  file: File,
  options: FileValidationOptions = {}
): Promise<FileValidationResult> {
  const {
    maxSize = DEFAULT_MAX_FILE_SIZE,
    allowedTypes = DOCUMENT_MIME_TYPES as unknown as string[],
    verifySignature = true,
    messages = {},
  } = options

  const warnings: string[] = []

  // Check for blocked extensions
  if (isBlockedExtension(file.name)) {
    return {
      valid: false,
      error: 'This file type is not allowed for security reasons.',
    }
  }

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: messages.tooLarge ?? `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)}).`,
    }
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty.',
    }
  }

  // Check MIME type
  const mimeType = file.type.toLowerCase()

  // Handle case where browser doesn't provide MIME type
  if (!mimeType || mimeType === 'application/octet-stream') {
    // Try to infer from extension
    const ext = getFileExtension(file.name)
    const inferredType = EXTENSION_TO_MIME[ext]

    if (inferredType && allowedTypes.includes(inferredType)) {
      warnings.push('File type was inferred from extension. Content verification recommended.')
    } else if (!inferredType) {
      warnings.push('Unable to determine file type. Please ensure file is correct format.')
    }
  } else if (!allowedTypes.includes(mimeType)) {
    return {
      valid: false,
      error: messages.invalidType ?? `File type "${mimeType}" is not allowed. Allowed types: ${getAllowedTypesDescription(allowedTypes)}.`,
    }
  }

  // Verify file signature if enabled
  if (verifySignature && mimeType) {
    const signatureValid = await verifyFileSignature(file, mimeType)
    if (!signatureValid) {
      return {
        valid: false,
        error: messages.invalidSignature ?? 'File content does not match the file type. The file may be corrupted or mislabeled.',
      }
    }
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

/**
 * Validate multiple files
 */
export async function validateFiles(
  files: FileList | File[],
  options: FileValidationOptions = {}
): Promise<Map<File, FileValidationResult>> {
  const results = new Map<File, FileValidationResult>()
  const fileArray = Array.from(files)

  await Promise.all(
    fileArray.map(async (file) => {
      const result = await validateFile(file, options)
      results.set(file, result)
    })
  )

  return results
}

/**
 * Quick validation without async signature check
 */
export function validateFileSync(
  file: File,
  options: Omit<FileValidationOptions, 'verifySignature'> = {}
): FileValidationResult {
  const {
    maxSize = DEFAULT_MAX_FILE_SIZE,
    allowedTypes = DOCUMENT_MIME_TYPES as unknown as string[],
    messages = {},
  } = options

  // Check for blocked extensions
  if (isBlockedExtension(file.name)) {
    return {
      valid: false,
      error: 'This file type is not allowed for security reasons.',
    }
  }

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: messages.tooLarge ?? `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)}).`,
    }
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty.',
    }
  }

  // Check MIME type
  const mimeType = file.type.toLowerCase()
  if (mimeType && mimeType !== 'application/octet-stream' && !allowedTypes.includes(mimeType)) {
    return {
      valid: false,
      error: messages.invalidType ?? `File type "${mimeType}" is not allowed.`,
    }
  }

  return { valid: true }
}

// ============================================================================
// Helpers
// ============================================================================

/** Map of common extensions to MIME types */
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
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.zip': 'application/zip',
  '.dwg': 'image/vnd.dwg',
  '.dxf': 'application/dxf',
}

/**
 * Get a human-readable description of allowed types
 */
function getAllowedTypesDescription(types: string[]): string {
  const typeGroups: Record<string, string[]> = {}

  for (const type of types) {
    if (type.startsWith('image/')) {
      typeGroups['Images'] = typeGroups['Images'] || []
      typeGroups['Images'].push(type.replace('image/', '').toUpperCase())
    } else if (type.includes('pdf')) {
      typeGroups['Documents'] = typeGroups['Documents'] || []
      typeGroups['Documents'].push('PDF')
    } else if (type.includes('word') || type.includes('document')) {
      typeGroups['Documents'] = typeGroups['Documents'] || []
      typeGroups['Documents'].push('Word')
    } else if (type.includes('excel') || type.includes('spreadsheet')) {
      typeGroups['Documents'] = typeGroups['Documents'] || []
      typeGroups['Documents'].push('Excel')
    } else if (type.includes('powerpoint') || type.includes('presentation')) {
      typeGroups['Documents'] = typeGroups['Documents'] || []
      typeGroups['Documents'].push('PowerPoint')
    }
  }

  return Object.entries(typeGroups)
    .map(([group, items]) => `${group} (${[...new Set(items)].join(', ')})`)
    .join(', ')
}

/**
 * Get accept attribute string for file input
 */
export function getAcceptString(types: readonly string[]): string {
  return types.join(',')
}

/**
 * Preset validation options for common use cases
 */
export const FILE_VALIDATION_PRESETS = {
  /** Standard document upload (PDFs, Office, images) */
  documents: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: DOCUMENT_MIME_TYPES as unknown as string[],
    verifySignature: true,
  } as FileValidationOptions,

  /** Images only (photos, screenshots) */
  images: {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedTypes: IMAGE_MIME_TYPES as unknown as string[],
    verifySignature: true,
  } as FileValidationOptions,

  /** PDFs only */
  pdfs: {
    maxSize: 100 * 1024 * 1024, // 100MB for large PDFs
    allowedTypes: PDF_MIME_TYPES as unknown as string[],
    verifySignature: true,
  } as FileValidationOptions,

  /** Spreadsheets for import */
  spreadsheets: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: SPREADSHEET_MIME_TYPES as unknown as string[],
    verifySignature: true,
  } as FileValidationOptions,

  /** Avatar/profile images (smaller) */
  avatar: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    verifySignature: true,
  } as FileValidationOptions,
}
