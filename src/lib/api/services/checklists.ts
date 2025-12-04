// File: /src/lib/api/services/checklists.ts
// Comprehensive Checklists API service for templates, items, executions, and responses

import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type {
  ChecklistTemplate,
  ChecklistTemplateItem,
  ChecklistExecution,
  ChecklistResponse,
  ChecklistTemplateWithItems,
  ChecklistExecutionWithResponses,
  CreateChecklistTemplateDTO,
  CreateChecklistTemplateItemDTO,
  CreateChecklistExecutionDTO,
  CreateChecklistResponseDTO,
  TemplateFilters,
  ChecklistFilters,
} from '@/types/checklists'

// ==============================================
// CHECKLIST TEMPLATES
// ==============================================

/**
 * Fetch all templates with optional filters
 */
async function getTemplates(filters?: TemplateFilters): Promise<ChecklistTemplate[]> {
  let query = supabase
    .from('checklist_templates')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (filters?.company_id) {
    query = query.eq('company_id', filters.company_id)
  }

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  if (filters?.template_level) {
    query = query.eq('template_level', filters.template_level)
  }

  if (filters?.is_system_template !== undefined) {
    query = query.eq('is_system_template', filters.is_system_template)
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.contains('tags', filters.tags)
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch templates: ${error.message}`)
  }

  return data as ChecklistTemplate[]
}

/**
 * Fetch a single template by ID
 */
async function getTemplate(templateId: string): Promise<ChecklistTemplate> {
  const { data, error } = await supabase
    .from('checklist_templates')
    .select('*')
    .eq('id', templateId)
    .is('deleted_at', null)
    .single()

  if (error) {
    throw new Error(`Failed to fetch template: ${error.message}`)
  }

  return data as ChecklistTemplate
}

/**
 * Fetch template with all items
 */
async function getTemplateWithItems(templateId: string): Promise<ChecklistTemplateWithItems> {
  const [template, items] = await Promise.all([
    getTemplate(templateId),
    getTemplateItems(templateId),
  ])

  return {
    ...template,
    template_items: items,
  }
}

/**
 * Create a new template
 */
async function createTemplate(data: CreateChecklistTemplateDTO): Promise<ChecklistTemplate> {
  const { data: created, error } = await supabase
    .from('checklist_templates')
    .insert({
      ...data,
      items: [],
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create template: ${error.message}`)
  }

  return created as ChecklistTemplate
}

/**
 * Update a template
 */
async function updateTemplate(
  templateId: string,
  updates: Partial<Omit<ChecklistTemplate, 'id' | 'created_at' | 'updated_at'>>
): Promise<ChecklistTemplate> {
  const { data, error } = await supabase
    .from('checklist_templates')
    .update(updates as any)
    .eq('id', templateId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update template: ${error.message}`)
  }

  return data as ChecklistTemplate
}

/**
 * Soft delete a template
 */
async function deleteTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('checklist_templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', templateId)

  if (error) {
    throw new Error(`Failed to delete template: ${error.message}`)
  }
}

/**
 * Duplicate a template with a new name
 */
async function duplicateTemplate(templateId: string, newName: string): Promise<ChecklistTemplate> {
  // Get original template with items
  const original = await getTemplateWithItems(templateId)

  // Create new template
  const { data: newTemplate, error: templateError } = await supabase
    .from('checklist_templates')
    .insert({
      name: newName,
      description: original.description,
      category: original.category,
      template_level: 'company',
      is_system_template: false,
      company_id: original.company_id,
      tags: original.tags,
      instructions: original.instructions,
      estimated_duration_minutes: original.estimated_duration_minutes,
      scoring_enabled: original.scoring_enabled,
      items: [],
    } as any)
    .select()
    .single()

  if (templateError) {
    throw new Error(`Failed to duplicate template: ${templateError.message}`)
  }

  // Duplicate all template items
  if (original.template_items.length > 0) {
    const newItems = original.template_items.map((item) => ({
      checklist_template_id: newTemplate.id,
      item_type: item.item_type,
      label: item.label,
      description: item.description,
      sort_order: item.sort_order,
      section: item.section,
      is_required: item.is_required,
      config: item.config as any,
      scoring_enabled: item.scoring_enabled,
      pass_fail_na_scoring: item.pass_fail_na_scoring,
      requires_photo: item.requires_photo,
      min_photos: item.min_photos,
      max_photos: item.max_photos,
    }))

    const { error: itemsError } = await supabase
      .from('checklist_template_items')
      .insert(newItems as any)

    if (itemsError) {
      throw new Error(`Failed to duplicate template items: ${itemsError.message}`)
    }
  }

  return newTemplate as ChecklistTemplate
}

// ==============================================
// CHECKLIST TEMPLATE ITEMS
// ==============================================

/**
 * Fetch all items for a template
 */
async function getTemplateItems(templateId: string): Promise<ChecklistTemplateItem[]> {
  const { data, error } = await supabase
    .from('checklist_template_items')
    .select('*')
    .eq('checklist_template_id', templateId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch template items: ${error.message}`)
  }

  return data as ChecklistTemplateItem[]
}

/**
 * Create a new template item
 */
async function createTemplateItem(
  data: CreateChecklistTemplateItemDTO
): Promise<ChecklistTemplateItem> {
  const { data: created, error } = await supabase
    .from('checklist_template_items')
    .insert(data as any)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create template item: ${error.message}`)
  }

  return created as ChecklistTemplateItem
}

/**
 * Update a template item
 */
async function updateTemplateItem(
  itemId: string,
  updates: Partial<ChecklistTemplateItem>
): Promise<ChecklistTemplateItem> {
  const { data, error } = await supabase
    .from('checklist_template_items')
    .update(updates as any)
    .eq('id', itemId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update template item: ${error.message}`)
  }

  return data as ChecklistTemplateItem
}

/**
 * Soft delete a template item
 */
async function deleteTemplateItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('checklist_template_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', itemId)

  if (error) {
    throw new Error(`Failed to delete template item: ${error.message}`)
  }
}

/**
 * Reorder template items
 */
async function reorderTemplateItems(
  items: Array<{ id: string; sort_order: number }>
): Promise<void> {
  const updates = items.map((item) =>
    supabase
      .from('checklist_template_items')
      .update({ sort_order: item.sort_order })
      .eq('id', item.id)
  )

  const results = await Promise.all(updates)
  const errors = results.filter((r) => r.error)

  if (errors.length > 0) {
    throw new Error(`Failed to reorder template items: ${errors[0].error?.message}`)
  }
}

// ==============================================
// CHECKLIST EXECUTIONS
// ==============================================

/**
 * Fetch all executions with optional filters
 */
async function getExecutions(filters?: ChecklistFilters): Promise<ChecklistExecution[]> {
  let query = supabase
    .from('checklists')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (filters?.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  if (filters?.inspector_user_id) {
    query = query.eq('inspector_user_id', filters.inspector_user_id)
  }

  if (filters?.is_completed !== undefined) {
    query = query.eq('is_completed', filters.is_completed)
  }

  if (filters?.date_from) {
    query = query.gte('created_at', filters.date_from)
  }

  if (filters?.date_to) {
    query = query.lte('created_at', filters.date_to)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch executions: ${error.message}`)
  }

  return data as ChecklistExecution[]
}

/**
 * Fetch a single execution by ID
 */
async function getExecution(executionId: string): Promise<ChecklistExecution> {
  const { data, error } = await supabase
    .from('checklists')
    .select('*')
    .eq('id', executionId)
    .is('deleted_at', null)
    .single()

  if (error) {
    throw new Error(`Failed to fetch execution: ${error.message}`)
  }

  return data as ChecklistExecution
}

/**
 * Fetch execution with all responses
 */
async function getExecutionWithResponses(
  executionId: string
): Promise<ChecklistExecutionWithResponses> {
  const [execution, responses] = await Promise.all([
    getExecution(executionId),
    getResponses(executionId),
  ])

  return {
    ...execution,
    responses,
  }
}

/**
 * Create a new execution (start a checklist)
 */
async function createExecution(
  data: CreateChecklistExecutionDTO
): Promise<ChecklistExecution> {
  const { data: created, error } = await supabase
    .from('checklists')
    .insert({
      ...data,
      status: 'draft',
      items: [],
    } as any)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create execution: ${error.message}`)
  }

  return created as ChecklistExecution
}

/**
 * Update an execution
 */
async function updateExecution(
  executionId: string,
  updates: Partial<ChecklistExecution>
): Promise<ChecklistExecution> {
  const { data, error } = await supabase
    .from('checklists')
    .update(updates as any)
    .eq('id', executionId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update execution: ${error.message}`)
  }

  return data as ChecklistExecution
}

/**
 * Submit an execution (mark as completed)
 */
async function submitExecution(executionId: string): Promise<ChecklistExecution> {
  const { data, error } = await supabase
    .from('checklists')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      is_completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', executionId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to submit execution: ${error.message}`)
  }

  return data as ChecklistExecution
}

/**
 * Soft delete an execution
 */
async function deleteExecution(executionId: string): Promise<void> {
  const { error } = await supabase
    .from('checklists')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', executionId)

  if (error) {
    throw new Error(`Failed to delete execution: ${error.message}`)
  }
}

// ==============================================
// CHECKLIST RESPONSES
// ==============================================

/**
 * Fetch all responses for a checklist execution
 */
async function getResponses(checklistId: string): Promise<ChecklistResponse[]> {
  const { data, error } = await supabase
    .from('checklist_responses')
    .select('*')
    .eq('checklist_id', checklistId)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch responses: ${error.message}`)
  }

  return data as any as ChecklistResponse[]
}

/**
 * Create a new response
 */
async function createResponse(data: CreateChecklistResponseDTO): Promise<ChecklistResponse> {
  const { data: created, error } = await supabase
    .from('checklist_responses')
    .insert(data as any)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create response: ${error.message}`)
  }

  return created as any as ChecklistResponse
}

/**
 * Update a response
 */
async function updateResponse(
  responseId: string,
  updates: Partial<ChecklistResponse>
): Promise<ChecklistResponse> {
  const { data, error } = await supabase
    .from('checklist_responses')
    .update(updates as any)
    .eq('id', responseId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update response: ${error.message}`)
  }

  return data as any as ChecklistResponse
}

/**
 * Delete a response
 */
async function deleteResponse(responseId: string): Promise<void> {
  const { error } = await supabase
    .from('checklist_responses')
    .delete()
    .eq('id', responseId)

  if (error) {
    throw new Error(`Failed to delete response: ${error.message}`)
  }
}

/**
 * Bulk upsert responses (create or update multiple at once)
 */
async function upsertResponses(
  responses: CreateChecklistResponseDTO[]
): Promise<ChecklistResponse[]> {
  const { data, error } = await supabase
    .from('checklist_responses')
    .upsert(responses as any)
    .select()

  if (error) {
    throw new Error(`Failed to upsert responses: ${error.message}`)
  }

  return data as any as ChecklistResponse[]
}

/**
 * Batch create responses
 */
async function batchCreateResponses(
  responses: CreateChecklistResponseDTO[]
): Promise<ChecklistResponse[]> {
  const { data, error } = await supabase
    .from('checklist_responses')
    .insert(responses as any)
    .select()

  if (error) {
    throw new Error(`Failed to batch create responses: ${error.message}`)
  }

  return data as any as ChecklistResponse[]
}

/**
 * Get execution score summary
 */
async function getExecutionScore(executionId: string): Promise<{
  pass_count: number
  fail_count: number
  na_count: number
  total_count: number
  pass_percentage: number
}> {
  const responses = await getResponses(executionId)

  const pass_count = responses.filter(r => r.score_value === 'pass').length
  const fail_count = responses.filter(r => r.score_value === 'fail').length
  const na_count = responses.filter(r => r.score_value === 'na').length
  const total_count = responses.length
  const scorable_count = pass_count + fail_count
  const pass_percentage = scorable_count > 0 ? (pass_count / scorable_count) * 100 : 0

  return {
    pass_count,
    fail_count,
    na_count,
    total_count,
    pass_percentage: Math.round(pass_percentage * 100) / 100,
  }
}

// ==============================================
// EXPORTS
// ==============================================

export const checklistsApi = {
  // Templates
  getTemplates,
  getTemplate,
  getTemplateWithItems,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,

  // Template Items
  getTemplateItems,
  createTemplateItem,
  updateTemplateItem,
  deleteTemplateItem,
  reorderTemplateItems,

  // Executions
  getExecutions,
  getExecution,
  getExecutionWithResponses,
  createExecution,
  updateExecution,
  submitExecution,
  deleteExecution,

  // Responses
  getResponses,
  createResponse,
  updateResponse,
  deleteResponse,
  upsertResponses,
  batchCreateResponses,
  getExecutionScore,
}
