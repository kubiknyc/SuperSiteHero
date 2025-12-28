/**
 * Message Templates Service
 * API service for managing reusable message templates with variable substitution
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Types
// ============================================================================

export interface MessageTemplate {
  id: string
  company_id: string
  created_by: string
  name: string
  content: string
  category: string | null
  is_shared: boolean
  variables: string[]
  usage_count: number
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateTemplateInput {
  name: string
  content: string
  category?: string
  is_shared?: boolean
  variables?: string[]
}

export interface UpdateTemplateInput {
  name?: string
  content?: string
  category?: string | null
  is_shared?: boolean
  variables?: string[]
}

export interface TemplateSearchOptions {
  query?: string
  category?: string
  limit?: number
  includePrivate?: boolean
}

export interface TemplateSubstitution {
  [key: string]: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract variables from template content
 * Finds all {variable} placeholders
 */
export function extractTemplateVariables(content: string): string[] {
  const regex = /\{([a-zA-Z0-9_]+)\}/g
  const variables = new Set<string>()
  let match

  while ((match = regex.exec(content)) !== null) {
    variables.add(match[1])
  }

  return Array.from(variables).sort()
}

/**
 * Substitute variables in template content
 */
export function substituteTemplateVariables(
  content: string,
  substitutions: TemplateSubstitution
): string {
  let result = content

  Object.entries(substitutions).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g')
    result = result.replace(regex, value)
  })

  return result
}

/**
 * Validate template has all required substitutions
 */
export function validateTemplateSubstitutions(
  content: string,
  substitutions: TemplateSubstitution
): { valid: boolean; missing: string[] } {
  const required = extractTemplateVariables(content)
  const provided = Object.keys(substitutions)
  const missing = required.filter(v => !provided.includes(v))

  return {
    valid: missing.length === 0,
    missing,
  }
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get all templates accessible to current user
 */
export async function getTemplates(
  companyId: string,
  options: TemplateSearchOptions = {}
): Promise<MessageTemplate[]> {
  try {
    let query = supabase
      .from('message_templates')
      .select('*')
      .eq('company_id', companyId)

    // Filter by category
    if (options.category) {
      query = query.eq('category', options.category)
    }

    // Filter by search query
    if (options.query) {
      query = query.or(
        `name.ilike.%${options.query}%,content.ilike.%${options.query}%`
      )
    }

    // Order by usage and recency
    query = query.order('usage_count', { ascending: false })
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[MessageTemplates] Error fetching templates:', error)
      throw error
    }

    return data || []
  } catch (_error) {
    logger.error('[MessageTemplates] Exception in getTemplates:', error)
    throw error
  }
}

/**
 * Get a single template by ID
 */
export async function getTemplate(id: string): Promise<MessageTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null
      }
      logger.error('[MessageTemplates] Error fetching template:', error)
      throw error
    }

    return data
  } catch (_error) {
    logger.error('[MessageTemplates] Exception in getTemplate:', error)
    throw error
  }
}

/**
 * Get templates by category
 */
export async function getTemplatesByCategory(
  companyId: string,
  category: string
): Promise<MessageTemplate[]> {
  return getTemplates(companyId, { category })
}

/**
 * Search templates using full-text search
 */
export async function searchTemplates(
  userId: string,
  companyId: string,
  query: string,
  options: { category?: string; limit?: number } = {}
): Promise<MessageTemplate[]> {
  try {
    const { data, error } = await supabase.rpc('search_message_templates', {
      p_user_id: userId,
      p_company_id: companyId,
      p_search_query: query,
      p_category: options.category || null,
      p_limit: options.limit || 20,
    })

    if (error) {
      logger.error('[MessageTemplates] Error searching templates:', error)
      throw error
    }

    return data || []
  } catch (_error) {
    logger.error('[MessageTemplates] Exception in searchTemplates:', error)
    throw error
  }
}

/**
 * Create a new message template
 */
export async function createTemplate(
  companyId: string,
  userId: string,
  input: CreateTemplateInput
): Promise<MessageTemplate> {
  try {
    // Extract variables from content if not provided
    const variables = input.variables || extractTemplateVariables(input.content)

    const { data, error } = await supabase
      .from('message_templates')
      .insert({
        company_id: companyId,
        created_by: userId,
        name: input.name,
        content: input.content,
        category: input.category || null,
        is_shared: input.is_shared || false,
        variables,
      })
      .select()
      .single()

    if (error) {
      logger.error('[MessageTemplates] Error creating template:', error)
      throw error
    }

    logger.log('[MessageTemplates] Template created:', data.id)
    return data
  } catch (_error) {
    logger.error('[MessageTemplates] Exception in createTemplate:', error)
    throw error
  }
}

/**
 * Update an existing template
 */
export async function updateTemplate(
  id: string,
  input: UpdateTemplateInput
): Promise<MessageTemplate> {
  try {
    const updates: Record<string, unknown> = { ...input }

    // If content is being updated, extract variables
    if (input.content && !input.variables) {
      updates.variables = extractTemplateVariables(input.content)
    }

    const { data, error } = await supabase
      .from('message_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('[MessageTemplates] Error updating template:', error)
      throw error
    }

    logger.log('[MessageTemplates] Template updated:', id)
    return data
  } catch (_error) {
    logger.error('[MessageTemplates] Exception in updateTemplate:', error)
    throw error
  }
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('[MessageTemplates] Error deleting template:', error)
      throw error
    }

    logger.log('[MessageTemplates] Template deleted:', id)
  } catch (_error) {
    logger.error('[MessageTemplates] Exception in deleteTemplate:', error)
    throw error
  }
}

/**
 * Increment template usage count
 */
export async function incrementTemplateUsage(id: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('increment_template_usage', {
      p_template_id: id,
    })

    if (error) {
      logger.error('[MessageTemplates] Error incrementing usage:', error)
      throw error
    }

    logger.log('[MessageTemplates] Template usage incremented:', id)
  } catch (_error) {
    logger.error('[MessageTemplates] Exception in incrementTemplateUsage:', error)
    throw error
  }
}

/**
 * Apply template with variable substitution
 */
export async function applyTemplate(
  templateId: string,
  substitutions: TemplateSubstitution
): Promise<string> {
  try {
    // Get template
    const template = await getTemplate(templateId)
    if (!template) {
      throw new Error('Template not found')
    }

    // Validate substitutions
    const validation = validateTemplateSubstitutions(template.content, substitutions)
    if (!validation.valid) {
      logger.warn('[MessageTemplates] Missing substitutions:', validation.missing)
      // Continue anyway - user may want to fill in remaining variables manually
    }

    // Substitute variables
    const content = substituteTemplateVariables(template.content, substitutions)

    // Increment usage count (fire and forget)
    incrementTemplateUsage(templateId).catch(err =>
      logger.error('[MessageTemplates] Failed to increment usage:', err)
    )

    return content
  } catch (_error) {
    logger.error('[MessageTemplates] Exception in applyTemplate:', error)
    throw error
  }
}

/**
 * Get template categories for a company
 */
export async function getTemplateCategories(companyId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('message_templates')
      .select('category')
      .eq('company_id', companyId)
      .not('category', 'is', null)

    if (error) {
      logger.error('[MessageTemplates] Error fetching categories:', error)
      throw error
    }

    // Get unique categories
    const categories = new Set<string>()
    data?.forEach(row => {
      if (row.category) {
        categories.add(row.category)
      }
    })

    return Array.from(categories).sort()
  } catch (_error) {
    logger.error('[MessageTemplates] Exception in getTemplateCategories:', error)
    throw error
  }
}

/**
 * Seed default templates for a company
 */
export async function seedDefaultTemplates(
  companyId: string,
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase.rpc('seed_default_message_templates', {
      p_company_id: companyId,
      p_user_id: userId,
    })

    if (error) {
      logger.error('[MessageTemplates] Error seeding default templates:', error)
      throw error
    }

    logger.log('[MessageTemplates] Default templates seeded for company:', companyId)
  } catch (_error) {
    logger.error('[MessageTemplates] Exception in seedDefaultTemplates:', error)
    throw error
  }
}

// ============================================================================
// Exports
// ============================================================================

export const messageTemplatesApi = {
  getTemplates,
  getTemplate,
  getTemplatesByCategory,
  searchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  incrementTemplateUsage,
  applyTemplate,
  getTemplateCategories,
  seedDefaultTemplates,
  extractTemplateVariables,
  substituteTemplateVariables,
  validateTemplateSubstitutions,
}
