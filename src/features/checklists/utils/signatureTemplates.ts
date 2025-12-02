// File: /src/features/checklists/utils/signatureTemplates.ts
// Signature template storage and management using localStorage

import { logger } from '@/lib/utils/logger'

export interface SignatureTemplate {
  id: string
  name: string
  dataUrl: string // Base64 encoded signature image
  createdAt: number
  lastUsedAt?: number
  useCount: number
}

const STORAGE_KEY = 'checklist-signature-templates'
const MAX_TEMPLATES = 10

/**
 * Get all signature templates from localStorage
 */
export function getSignatureTemplates(): SignatureTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return []
    }

    const templates = JSON.parse(stored) as SignatureTemplate[]
    return templates.sort((a, b) => (b.lastUsedAt || b.createdAt) - (a.lastUsedAt || a.createdAt))
  } catch (error) {
    logger.error('Failed to load signature templates:', error)
    return []
  }
}

/**
 * Save a new signature template
 */
export function saveSignatureTemplate(
  name: string,
  dataUrl: string
): SignatureTemplate {
  const templates = getSignatureTemplates()

  // Check if template with same name exists
  const existingIndex = templates.findIndex((t) => t.name === name)

  if (existingIndex >= 0) {
    // Update existing template
    templates[existingIndex] = {
      ...templates[existingIndex],
      dataUrl,
      createdAt: Date.now(),
      useCount: 0, // Reset use count on update
    }
  } else {
    // Create new template
    const newTemplate: SignatureTemplate = {
      id: `sig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      dataUrl,
      createdAt: Date.now(),
      useCount: 0,
    }

    templates.unshift(newTemplate)

    // Enforce max templates limit
    if (templates.length > MAX_TEMPLATES) {
      // Remove least recently used templates
      templates.splice(MAX_TEMPLATES)
    }
  }

  // Save to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
    return existingIndex >= 0 ? templates[existingIndex] : templates[0]
  } catch (error) {
    logger.error('Failed to save signature template:', error)
    throw new Error('Failed to save signature template. Storage may be full.')
  }
}

/**
 * Delete a signature template by ID
 */
export function deleteSignatureTemplate(id: string): void {
  const templates = getSignatureTemplates()
  const filtered = templates.filter((t) => t.id !== id)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    logger.error('Failed to delete signature template:', error)
    throw new Error('Failed to delete signature template')
  }
}

/**
 * Get a signature template by ID
 */
export function getSignatureTemplate(id: string): SignatureTemplate | null {
  const templates = getSignatureTemplates()
  return templates.find((t) => t.id === id) || null
}

/**
 * Update template usage statistics
 */
export function updateTemplateUsage(id: string): void {
  const templates = getSignatureTemplates()
  const template = templates.find((t) => t.id === id)

  if (!template) {
    return
  }

  template.lastUsedAt = Date.now()
  template.useCount++

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  } catch (error) {
    logger.error('Failed to update template usage:', error)
  }
}

/**
 * Clear all signature templates
 */
export function clearAllSignatureTemplates(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    logger.error('Failed to clear signature templates:', error)
  }
}

/**
 * Get storage usage estimate for templates
 */
export function getTemplateStorageSize(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return 0
    }
    // Approximate size in bytes
    return new Blob([stored]).size
  } catch {
    return 0
  }
}

/**
 * Check if a template name is available
 */
export function isTemplateNameAvailable(name: string, excludeId?: string): boolean {
  const templates = getSignatureTemplates()
  return !templates.some((t) => t.name === name && t.id !== excludeId)
}

/**
 * Rename a signature template
 */
export function renameSignatureTemplate(id: string, newName: string): void {
  if (!isTemplateNameAvailable(newName, id)) {
    throw new Error('Template name already exists')
  }

  const templates = getSignatureTemplates()
  const template = templates.find((t) => t.id === id)

  if (!template) {
    throw new Error('Template not found')
  }

  template.name = newName

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  } catch (error) {
    logger.error('Failed to rename signature template:', error)
    throw new Error('Failed to rename signature template')
  }
}
