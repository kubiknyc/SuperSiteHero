// File: /src/lib/api/services/checklists.ts
// Inspection Checklists API service
// Phase: 1.3 - API Service Layer

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import { supabase } from '@/lib/supabase'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any
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
  ChecklistFilters,
  TemplateFilters,
  ChecklistScoreSummary,
} from '@/types/checklists'

export const checklistsApi = {
  // =============================================
  // CHECKLIST TEMPLATES
  // =============================================

  /**
   * Fetch all checklist templates
   * @param filters - Optional filters
   */
  async getTemplates(filters?: TemplateFilters): Promise<ChecklistTemplate[]> {
    try {
      let query = supabase
        .from('checklist_templates')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      // Apply filters
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
        throw new ApiErrorClass({
          code: 'FETCH_TEMPLATES_ERROR',
          message: `Failed to fetch templates: ${error.message}`,
        })
      }

      return (data || []) as ChecklistTemplate[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_TEMPLATES_ERROR',
            message: 'Failed to fetch templates',
          })
    }
  },

  /**
   * Fetch a single template by ID
   */
  async getTemplate(templateId: string): Promise<ChecklistTemplate> {
    try {
      if (!templateId) {
        throw new ApiErrorClass({
          code: 'TEMPLATE_ID_REQUIRED',
          message: 'Template ID is required',
        })
      }

      return await apiClient.selectOne<ChecklistTemplate>('checklist_templates', templateId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_TEMPLATE_ERROR',
            message: 'Failed to fetch template',
          })
    }
  },

  /**
   * Fetch template with items
   */
  async getTemplateWithItems(templateId: string): Promise<ChecklistTemplateWithItems> {
    try {
      if (!templateId) {
        throw new ApiErrorClass({
          code: 'TEMPLATE_ID_REQUIRED',
          message: 'Template ID is required',
        })
      }

      const { data, error } = await supabase
        .from('checklist_templates')
        .select(`
          *,
          template_items:checklist_template_items(*)
        `)
        .eq('id', templateId)
        .is('deleted_at', null)
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_TEMPLATE_ERROR',
          message: `Failed to fetch template: ${error.message}`,
        })
      }

      if (!data) {
        throw new ApiErrorClass({
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Template not found',
        })
      }

      return data as unknown as ChecklistTemplateWithItems
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_TEMPLATE_ERROR',
            message: 'Failed to fetch template',
          })
    }
  },

  /**
   * Create a new checklist template
   */
  async createTemplate(data: CreateChecklistTemplateDTO): Promise<ChecklistTemplate> {
    try {
      if (!data.name) {
        throw new ApiErrorClass({
          code: 'TEMPLATE_NAME_REQUIRED',
          message: 'Template name is required',
        })
      }

      return await apiClient.insert<ChecklistTemplate>('checklist_templates', data)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_TEMPLATE_ERROR',
            message: 'Failed to create template',
          })
    }
  },

  /**
   * Update a checklist template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<ChecklistTemplate>
  ): Promise<ChecklistTemplate> {
    try {
      if (!templateId) {
        throw new ApiErrorClass({
          code: 'TEMPLATE_ID_REQUIRED',
          message: 'Template ID is required',
        })
      }

      return await apiClient.update<ChecklistTemplate>('checklist_templates', templateId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_TEMPLATE_ERROR',
            message: 'Failed to update template',
          })
    }
  },

  /**
   * Delete a checklist template (soft delete)
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      if (!templateId) {
        throw new ApiErrorClass({
          code: 'TEMPLATE_ID_REQUIRED',
          message: 'Template ID is required',
        })
      }

      await apiClient.delete('checklist_templates', templateId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_TEMPLATE_ERROR',
            message: 'Failed to delete template',
          })
    }
  },

  /**
   * Duplicate a checklist template
   */
  async duplicateTemplate(templateId: string, newName: string): Promise<ChecklistTemplate> {
    try {
      const template = await this.getTemplateWithItems(templateId)

      // Create new template
      const newTemplate = await this.createTemplate({
        company_id: template.company_id,
        name: newName,
        description: template.description,
        category: template.category,
        template_level: template.template_level,
        tags: template.tags,
        instructions: template.instructions,
        estimated_duration_minutes: template.estimated_duration_minutes,
        scoring_enabled: template.scoring_enabled,
      })

      // Copy template items
      if (template.template_items && template.template_items.length > 0) {
        await Promise.all(
          template.template_items.map((item) =>
            this.createTemplateItem({
              checklist_template_id: newTemplate.id,
              item_type: item.item_type,
              label: item.label,
              description: item.description || undefined,
              sort_order: item.sort_order,
              section: item.section || undefined,
              is_required: item.is_required,
              config: item.config,
              scoring_enabled: item.scoring_enabled,
              pass_fail_na_scoring: item.pass_fail_na_scoring,
              requires_photo: item.requires_photo,
              min_photos: item.min_photos,
              max_photos: item.max_photos,
            })
          )
        )
      }

      return newTemplate
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DUPLICATE_TEMPLATE_ERROR',
            message: 'Failed to duplicate template',
          })
    }
  },

  // =============================================
  // CHECKLIST TEMPLATE ITEMS
  // =============================================

  /**
   * Fetch template items for a template
   */
  async getTemplateItems(templateId: string): Promise<ChecklistTemplateItem[]> {
    try {
      if (!templateId) {
        throw new ApiErrorClass({
          code: 'TEMPLATE_ID_REQUIRED',
          message: 'Template ID is required',
        })
      }

      const { data, error } = await db
        .from('checklist_template_items')
        .select('*')
        .eq('checklist_template_id', templateId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_TEMPLATE_ITEMS_ERROR',
          message: `Failed to fetch template items: ${error.message}`,
        })
      }

      return (data || []) as ChecklistTemplateItem[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_TEMPLATE_ITEMS_ERROR',
            message: 'Failed to fetch template items',
          })
    }
  },

  /**
   * Create a template item
   */
  async createTemplateItem(data: CreateChecklistTemplateItemDTO): Promise<ChecklistTemplateItem> {
    try {
      if (!data.checklist_template_id) {
        throw new ApiErrorClass({
          code: 'TEMPLATE_ID_REQUIRED',
          message: 'Template ID is required',
        })
      }

      if (!data.label) {
        throw new ApiErrorClass({
          code: 'ITEM_LABEL_REQUIRED',
          message: 'Item label is required',
        })
      }

      return await apiClient.insert<ChecklistTemplateItem>('checklist_template_items', data)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_TEMPLATE_ITEM_ERROR',
            message: 'Failed to create template item',
          })
    }
  },

  /**
   * Update a template item
   */
  async updateTemplateItem(
    itemId: string,
    updates: Partial<ChecklistTemplateItem>
  ): Promise<ChecklistTemplateItem> {
    try {
      if (!itemId) {
        throw new ApiErrorClass({
          code: 'ITEM_ID_REQUIRED',
          message: 'Item ID is required',
        })
      }

      return await apiClient.update<ChecklistTemplateItem>('checklist_template_items', itemId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_TEMPLATE_ITEM_ERROR',
            message: 'Failed to update template item',
          })
    }
  },

  /**
   * Delete a template item (soft delete)
   */
  async deleteTemplateItem(itemId: string): Promise<void> {
    try {
      if (!itemId) {
        throw new ApiErrorClass({
          code: 'ITEM_ID_REQUIRED',
          message: 'Item ID is required',
        })
      }

      await apiClient.delete('checklist_template_items', itemId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_TEMPLATE_ITEM_ERROR',
            message: 'Failed to delete template item',
          })
    }
  },

  /**
   * Reorder template items
   */
  async reorderTemplateItems(items: { id: string; sort_order: number }[]): Promise<void> {
    try {
      await Promise.all(
        items.map((item) =>
          this.updateTemplateItem(item.id, { sort_order: item.sort_order })
        )
      )
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'REORDER_ITEMS_ERROR',
            message: 'Failed to reorder template items',
          })
    }
  },

  // =============================================
  // CHECKLIST EXECUTIONS
  // =============================================

  /**
   * Fetch all checklist executions
   * @param filters - Optional filters
   */
  async getExecutions(filters?: ChecklistFilters): Promise<ChecklistExecution[]> {
    try {
      let query = supabase
        .from('checklists')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      // Apply filters
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
        throw new ApiErrorClass({
          code: 'FETCH_EXECUTIONS_ERROR',
          message: `Failed to fetch executions: ${error.message}`,
        })
      }

      return (data || []) as ChecklistExecution[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_EXECUTIONS_ERROR',
            message: 'Failed to fetch executions',
          })
    }
  },

  /**
   * Fetch a single execution by ID
   */
  async getExecution(executionId: string): Promise<ChecklistExecution> {
    try {
      if (!executionId) {
        throw new ApiErrorClass({
          code: 'EXECUTION_ID_REQUIRED',
          message: 'Execution ID is required',
        })
      }

      return await apiClient.selectOne<ChecklistExecution>('checklists', executionId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_EXECUTION_ERROR',
            message: 'Failed to fetch execution',
          })
    }
  },

  /**
   * Fetch execution with responses
   */
  async getExecutionWithResponses(executionId: string): Promise<ChecklistExecutionWithResponses> {
    try {
      if (!executionId) {
        throw new ApiErrorClass({
          code: 'EXECUTION_ID_REQUIRED',
          message: 'Execution ID is required',
        })
      }

      const { data, error } = await supabase
        .from('checklists')
        .select(`
          *,
          responses:checklist_responses(*)
        `)
        .eq('id', executionId)
        .is('deleted_at', null)
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_EXECUTION_ERROR',
          message: `Failed to fetch execution: ${error.message}`,
        })
      }

      if (!data) {
        throw new ApiErrorClass({
          code: 'EXECUTION_NOT_FOUND',
          message: 'Execution not found',
        })
      }

      return data as unknown as ChecklistExecutionWithResponses
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_EXECUTION_ERROR',
            message: 'Failed to fetch execution',
          })
    }
  },

  /**
   * Create a new checklist execution
   */
  async createExecution(data: CreateChecklistExecutionDTO): Promise<ChecklistExecution> {
    try {
      if (!data.project_id) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      if (!data.name) {
        throw new ApiErrorClass({
          code: 'EXECUTION_NAME_REQUIRED',
          message: 'Execution name is required',
        })
      }

      return await apiClient.insert<ChecklistExecution>('checklists', {
        ...data,
        status: 'draft',
        is_completed: false,
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_EXECUTION_ERROR',
            message: 'Failed to create execution',
          })
    }
  },

  /**
   * Update a checklist execution
   */
  async updateExecution(
    executionId: string,
    updates: Partial<ChecklistExecution>
  ): Promise<ChecklistExecution> {
    try {
      if (!executionId) {
        throw new ApiErrorClass({
          code: 'EXECUTION_ID_REQUIRED',
          message: 'Execution ID is required',
        })
      }

      return await apiClient.update<ChecklistExecution>('checklists', executionId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_EXECUTION_ERROR',
            message: 'Failed to update execution',
          })
    }
  },

  /**
   * Submit a checklist execution
   */
  async submitExecution(executionId: string): Promise<ChecklistExecution> {
    try {
      if (!executionId) {
        throw new ApiErrorClass({
          code: 'EXECUTION_ID_REQUIRED',
          message: 'Execution ID is required',
        })
      }

      return await this.updateExecution(executionId, {
        status: 'submitted',
        is_completed: true,
        submitted_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'SUBMIT_EXECUTION_ERROR',
            message: 'Failed to submit execution',
          })
    }
  },

  /**
   * Delete a checklist execution (soft delete)
   */
  async deleteExecution(executionId: string): Promise<void> {
    try {
      if (!executionId) {
        throw new ApiErrorClass({
          code: 'EXECUTION_ID_REQUIRED',
          message: 'Execution ID is required',
        })
      }

      await apiClient.delete('checklists', executionId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_EXECUTION_ERROR',
            message: 'Failed to delete execution',
          })
    }
  },

  // =============================================
  // CHECKLIST RESPONSES
  // =============================================

  /**
   * Fetch responses for an execution
   */
  async getResponses(executionId: string): Promise<ChecklistResponse[]> {
    try {
      if (!executionId) {
        throw new ApiErrorClass({
          code: 'EXECUTION_ID_REQUIRED',
          message: 'Execution ID is required',
        })
      }

      const { data, error } = await db
        .from('checklist_responses')
        .select('*')
        .eq('checklist_id', executionId)
        .order('sort_order', { ascending: true })

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_RESPONSES_ERROR',
          message: `Failed to fetch responses: ${error.message}`,
        })
      }

      return (data || []) as ChecklistResponse[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_RESPONSES_ERROR',
            message: 'Failed to fetch responses',
          })
    }
  },

  /**
   * Create a response
   */
  async createResponse(data: CreateChecklistResponseDTO): Promise<ChecklistResponse> {
    try {
      if (!data.checklist_id) {
        throw new ApiErrorClass({
          code: 'EXECUTION_ID_REQUIRED',
          message: 'Execution ID is required',
        })
      }

      return await apiClient.insert<ChecklistResponse>('checklist_responses', data)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_RESPONSE_ERROR',
            message: 'Failed to create response',
          })
    }
  },

  /**
   * Update a response
   */
  async updateResponse(
    responseId: string,
    updates: Partial<ChecklistResponse>
  ): Promise<ChecklistResponse> {
    try {
      if (!responseId) {
        throw new ApiErrorClass({
          code: 'RESPONSE_ID_REQUIRED',
          message: 'Response ID is required',
        })
      }

      return await apiClient.update<ChecklistResponse>('checklist_responses', responseId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_RESPONSE_ERROR',
            message: 'Failed to update response',
          })
    }
  },

  /**
   * Delete a response
   */
  async deleteResponse(responseId: string): Promise<void> {
    try {
      if (!responseId) {
        throw new ApiErrorClass({
          code: 'RESPONSE_ID_REQUIRED',
          message: 'Response ID is required',
        })
      }

      const { error } = await db
        .from('checklist_responses')
        .delete()
        .eq('id', responseId)

      if (error) {
        throw new ApiErrorClass({
          code: 'DELETE_RESPONSE_ERROR',
          message: `Failed to delete response: ${error.message}`,
        })
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_RESPONSE_ERROR',
            message: 'Failed to delete response',
          })
    }
  },

  /**
   * Batch create responses (for starting an execution)
   */
  async batchCreateResponses(responses: CreateChecklistResponseDTO[]): Promise<ChecklistResponse[]> {
    try {
      if (!responses || responses.length === 0) {
        throw new ApiErrorClass({
          code: 'RESPONSES_REQUIRED',
          message: 'At least one response is required',
        })
      }

      return await apiClient.insertMany<ChecklistResponse>('checklist_responses', responses)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'BATCH_CREATE_RESPONSES_ERROR',
            message: 'Failed to batch create responses',
          })
    }
  },

  // =============================================
  // SCORING & STATISTICS
  // =============================================

  /**
   * Calculate execution score summary
   */
  async getExecutionScore(executionId: string): Promise<ChecklistScoreSummary> {
    try {
      if (!executionId) {
        throw new ApiErrorClass({
          code: 'EXECUTION_ID_REQUIRED',
          message: 'Execution ID is required',
        })
      }

      const { data, error } = await db
        .rpc('calculate_checklist_score', { checklist_uuid: executionId })

      if (error) {
        throw new ApiErrorClass({
          code: 'CALCULATE_SCORE_ERROR',
          message: `Failed to calculate score: ${error.message}`,
        })
      }

      if (!data || data.length === 0) {
        return {
          pass_count: 0,
          fail_count: 0,
          na_count: 0,
          total_count: 0,
          pass_percentage: 0,
        }
      }

      return data[0] as ChecklistScoreSummary
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CALCULATE_SCORE_ERROR',
            message: 'Failed to calculate score',
          })
    }
  },
}
