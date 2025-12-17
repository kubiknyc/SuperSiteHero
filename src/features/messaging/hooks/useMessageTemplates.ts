/**
 * useMessageTemplates Hook
 * React hook for managing message templates
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  messageTemplatesApi,
  type MessageTemplate,
  type CreateTemplateInput,
  type UpdateTemplateInput,
  type TemplateSearchOptions,
  type TemplateSubstitution,
} from '../services/messageTemplates'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Types
// ============================================================================

export interface UseMessageTemplatesOptions {
  companyId?: string
  autoLoad?: boolean
  category?: string
}

export interface UseMessageTemplatesReturn {
  templates: MessageTemplate[]
  categories: string[]
  isLoading: boolean
  error: Error | null

  // CRUD operations
  loadTemplates: (options?: TemplateSearchOptions) => Promise<void>
  getTemplate: (id: string) => Promise<MessageTemplate | null>
  createTemplate: (input: CreateTemplateInput) => Promise<MessageTemplate>
  updateTemplate: (id: string, input: UpdateTemplateInput) => Promise<MessageTemplate>
  deleteTemplate: (id: string) => Promise<void>

  // Search and filter
  searchTemplates: (query: string, category?: string) => Promise<void>
  filterByCategory: (category: string | null) => void
  loadCategories: () => Promise<void>

  // Template application
  applyTemplate: (
    templateId: string,
    substitutions: TemplateSubstitution
  ) => Promise<string>

  // Utilities
  seedDefaults: () => Promise<void>
  refresh: () => Promise<void>
}

// ============================================================================
// Hook
// ============================================================================

export function useMessageTemplates(
  options: UseMessageTemplatesOptions = {}
): UseMessageTemplatesReturn {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [currentCategory, setCurrentCategory] = useState<string | null>(
    options.category || null
  )

  // Get company ID from user or options
  const companyId = options.companyId || user?.company_id

  /**
   * Load templates
   */
  const loadTemplates = useCallback(
    async (searchOptions: TemplateSearchOptions = {}) => {
      if (!companyId) {
        logger.warn('[useMessageTemplates] No company ID available')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const data = await messageTemplatesApi.getTemplates(companyId, {
          ...searchOptions,
          category: currentCategory || searchOptions.category,
        })
        setTemplates(data)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load templates')
        setError(error)
        logger.error('[useMessageTemplates] Error loading templates:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [companyId, currentCategory]
  )

  /**
   * Get single template
   */
  const getTemplate = useCallback(
    async (id: string): Promise<MessageTemplate | null> => {
      setError(null)
      try {
        return await messageTemplatesApi.getTemplate(id)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to get template')
        setError(error)
        logger.error('[useMessageTemplates] Error getting template:', error)
        return null
      }
    },
    []
  )

  /**
   * Create template
   */
  const createTemplate = useCallback(
    async (input: CreateTemplateInput): Promise<MessageTemplate> => {
      if (!companyId || !user?.id) {
        throw new Error('User not authenticated')
      }

      setError(null)
      try {
        const template = await messageTemplatesApi.createTemplate(
          companyId,
          user.id,
          input
        )

        // Add to local state
        setTemplates(prev => [template, ...prev])

        // Refresh categories if category was added
        if (template.category) {
          loadCategories()
        }

        return template
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create template')
        setError(error)
        logger.error('[useMessageTemplates] Error creating template:', error)
        throw error
      }
    },
    [companyId, user?.id]
  )

  /**
   * Update template
   */
  const updateTemplate = useCallback(
    async (id: string, input: UpdateTemplateInput): Promise<MessageTemplate> => {
      setError(null)
      try {
        const updated = await messageTemplatesApi.updateTemplate(id, input)

        // Update local state
        setTemplates(prev =>
          prev.map(t => (t.id === id ? updated : t))
        )

        // Refresh categories if category changed
        if ('category' in input) {
          loadCategories()
        }

        return updated
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update template')
        setError(error)
        logger.error('[useMessageTemplates] Error updating template:', error)
        throw error
      }
    },
    []
  )

  /**
   * Delete template
   */
  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    setError(null)
    try {
      await messageTemplatesApi.deleteTemplate(id)

      // Remove from local state
      setTemplates(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete template')
      setError(error)
      logger.error('[useMessageTemplates] Error deleting template:', error)
      throw error
    }
  }, [])

  /**
   * Search templates
   */
  const searchTemplates = useCallback(
    async (query: string, category?: string): Promise<void> => {
      if (!companyId || !user?.id) {
        logger.warn('[useMessageTemplates] No user or company ID available')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const data = await messageTemplatesApi.searchTemplates(
          user.id,
          companyId,
          query,
          { category }
        )
        setTemplates(data)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to search templates')
        setError(error)
        logger.error('[useMessageTemplates] Error searching templates:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [companyId, user?.id]
  )

  /**
   * Filter by category
   */
  const filterByCategory = useCallback(
    (category: string | null) => {
      setCurrentCategory(category)
      // Reload will happen via useEffect
    },
    []
  )

  /**
   * Load categories
   */
  const loadCategories = useCallback(async (): Promise<void> => {
    if (!companyId) return

    try {
      const data = await messageTemplatesApi.getTemplateCategories(companyId)
      setCategories(data)
    } catch (err) {
      logger.error('[useMessageTemplates] Error loading categories:', err)
    }
  }, [companyId])

  /**
   * Apply template with substitutions
   */
  const applyTemplate = useCallback(
    async (
      templateId: string,
      substitutions: TemplateSubstitution
    ): Promise<string> => {
      setError(null)
      try {
        return await messageTemplatesApi.applyTemplate(templateId, substitutions)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to apply template')
        setError(error)
        logger.error('[useMessageTemplates] Error applying template:', error)
        throw error
      }
    },
    []
  )

  /**
   * Seed default templates
   */
  const seedDefaults = useCallback(async (): Promise<void> => {
    if (!companyId || !user?.id) {
      throw new Error('User not authenticated')
    }

    setError(null)
    try {
      await messageTemplatesApi.seedDefaultTemplates(companyId, user.id)
      await loadTemplates()
      await loadCategories()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to seed templates')
      setError(error)
      logger.error('[useMessageTemplates] Error seeding templates:', error)
      throw error
    }
  }, [companyId, user?.id, loadTemplates, loadCategories])

  /**
   * Refresh all data
   */
  const refresh = useCallback(async (): Promise<void> => {
    await Promise.all([loadTemplates(), loadCategories()])
  }, [loadTemplates, loadCategories])

  // Auto-load templates on mount or when category changes
  useEffect(() => {
    if (options.autoLoad !== false && companyId) {
      loadTemplates()
      loadCategories()
    }
  }, [companyId, currentCategory]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    templates,
    categories,
    isLoading,
    error,
    loadTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    searchTemplates,
    filterByCategory,
    loadCategories,
    applyTemplate,
    seedDefaults,
    refresh,
  }
}
