// File: /src/lib/api/services/takeoff-templates.ts
// API service for takeoff templates CRUD operations

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import type { TakeoffTemplate, TakeoffTemplateInsert, TakeoffTemplateUpdate } from '@/types/database-extensions'
import type { QueryOptions } from '../types'
import { supabase } from '@/lib/supabase'

export const takeoffTemplatesApi = {
  /**
   * Get all company-wide templates for a company
   * Excludes project-specific templates
   */
  async getCompanyTemplates(
    companyId: string,
    options?: QueryOptions
  ): Promise<TakeoffTemplate[]> {
    try {
      if (!companyId) {
        throw new ApiErrorClass({
          code: 'COMPANY_ID_REQUIRED',
          message: 'Company ID is required',
        })
      }

      return await apiClient.select<TakeoffTemplate>('takeoff_templates', {
        ...options,
        filters: [
          ...(options?.filters || []),
          { column: 'company_id', operator: 'eq', value: companyId },
          { column: 'project_id', operator: 'eq', value: null }, // Company-wide only
          { column: 'deleted_at', operator: 'eq', value: null },
        ],
        orderBy: options?.orderBy || { column: 'usage_count', ascending: false },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_COMPANY_TEMPLATES_ERROR',
            message: 'Failed to fetch company templates',
          })
    }
  },

  /**
   * Get templates for a project (includes both company-wide and project-specific)
   * Returns templates where project_id is null OR matches the given project
   */
  async getProjectTemplates(
    projectId: string,
    companyId: string,
    options?: QueryOptions
  ): Promise<TakeoffTemplate[]> {
    try {
      if (!projectId || !companyId) {
        throw new ApiErrorClass({
          code: 'REQUIRED_PARAMS_MISSING',
          message: 'Project ID and Company ID are required',
        })
      }

      // Use raw Supabase query for OR condition
      // Note: takeoff_templates table may not exist in generated types but exists in database
      const { data, error } = await (supabase as any)
        .from('takeoff_templates')
        .select('*')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .or(`project_id.is.null,project_id.eq.${projectId}`)
        .order('usage_count', { ascending: false })

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_PROJECT_TEMPLATES_ERROR',
          message: error.message,
        })
      }

      return (data as TakeoffTemplate[]) ?? []
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_PROJECT_TEMPLATES_ERROR',
            message: 'Failed to fetch project templates',
          })
    }
  },

  /**
   * Get templates by measurement type
   * Filter templates by specific measurement type
   */
  async getTemplatesByType(
    measurementType: string,
    companyId: string,
    projectId?: string,
    options?: QueryOptions
  ): Promise<TakeoffTemplate[]> {
    try {
      if (!measurementType || !companyId) {
        throw new ApiErrorClass({
          code: 'REQUIRED_PARAMS_MISSING',
          message: 'Measurement type and Company ID are required',
        })
      }

      if (projectId) {
        // Get both company-wide and project templates
        // Note: 'takeoff_templates' table exists in DB but not in generated types yet
        const { data, error } = await (supabase as any)
          .from('takeoff_templates')
          .select('*')
          .eq('company_id', companyId)
          .eq('measurement_type', measurementType)
          .is('deleted_at', null)
          .or(`project_id.is.null,project_id.eq.${projectId}`)
          .order('usage_count', { ascending: false })

        if (error) {
          throw new ApiErrorClass({
            code: 'FETCH_TEMPLATES_BY_TYPE_ERROR',
            message: error.message,
          })
        }

        return data as TakeoffTemplate[]
      } else {
        // Company-wide only
        return await apiClient.select<TakeoffTemplate>('takeoff_templates', {
          ...options,
          filters: [
            ...(options?.filters || []),
            { column: 'company_id', operator: 'eq', value: companyId },
            { column: 'measurement_type', operator: 'eq', value: measurementType },
            { column: 'project_id', operator: 'eq', value: null },
            { column: 'deleted_at', operator: 'eq', value: null },
          ],
          orderBy: options?.orderBy || { column: 'usage_count', ascending: false },
        })
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_TEMPLATES_BY_TYPE_ERROR',
            message: 'Failed to fetch templates by type',
          })
    }
  },

  /**
   * Get a single template by ID
   */
  async getTemplate(templateId: string): Promise<TakeoffTemplate> {
    try {
      if (!templateId) {
        throw new ApiErrorClass({
          code: 'TEMPLATE_ID_REQUIRED',
          message: 'Template ID is required',
        })
      }

      return await apiClient.selectOne<TakeoffTemplate>('takeoff_templates', templateId)
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
   * Create a new template
   */
  async createTemplate(
    data: TakeoffTemplateInsert
  ): Promise<TakeoffTemplate> {
    try {
      if (!data.name) {
        throw new ApiErrorClass({
          code: 'TEMPLATE_NAME_REQUIRED',
          message: 'Template name is required',
        })
      }

      if (!data.company_id) {
        throw new ApiErrorClass({
          code: 'COMPANY_ID_REQUIRED',
          message: 'Company ID is required',
        })
      }

      if (!data.measurement_type) {
        throw new ApiErrorClass({
          code: 'MEASUREMENT_TYPE_REQUIRED',
          message: 'Measurement type is required',
        })
      }

      return await apiClient.insert<TakeoffTemplate>('takeoff_templates', data)
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
   * Update an existing template
   */
  async updateTemplate(
    templateId: string,
    updates: TakeoffTemplateUpdate
  ): Promise<TakeoffTemplate> {
    try {
      if (!templateId) {
        throw new ApiErrorClass({
          code: 'TEMPLATE_ID_REQUIRED',
          message: 'Template ID is required',
        })
      }

      return await apiClient.update<TakeoffTemplate>('takeoff_templates', templateId, updates)
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
   * Delete a template (soft delete)
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      if (!templateId) {
        throw new ApiErrorClass({
          code: 'TEMPLATE_ID_REQUIRED',
          message: 'Template ID is required',
        })
      }

      await apiClient.update('takeoff_templates', templateId, {
        deleted_at: new Date().toISOString()
      })
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
   * Increment usage count when template is applied
   */
  async incrementUsage(templateId: string): Promise<void> {
    try {
      if (!templateId) {
        throw new ApiErrorClass({
          code: 'TEMPLATE_ID_REQUIRED',
          message: 'Template ID is required',
        })
      }

      // Call the database function
      // Note: 'increment_template_usage' function exists in DB but not in generated types yet
      const { error } = await (supabase as any).rpc('increment_template_usage', {
        template_id: templateId,
      })

      if (error) {
        throw new ApiErrorClass({
          code: 'INCREMENT_USAGE_ERROR',
          message: error.message,
        })
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'INCREMENT_USAGE_ERROR',
            message: 'Failed to increment template usage',
          })
    }
  },

  /**
   * Search templates by name or tags
   */
  async searchTemplates(
    query: string,
    companyId: string,
    projectId?: string,
    options?: QueryOptions
  ): Promise<TakeoffTemplate[]> {
    try {
      if (!companyId) {
        throw new ApiErrorClass({
          code: 'COMPANY_ID_REQUIRED',
          message: 'Company ID is required',
        })
      }

      if (!query || query.trim().length === 0) {
        return []
      }

      const searchQuery = `%${query}%`

      if (projectId) {
        // Search in both company-wide and project templates
        // Note: 'takeoff_templates' table exists in DB but not in generated types yet
        const { data, error } = await (supabase as any)
          .from('takeoff_templates')
          .select('*')
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .or(`project_id.is.null,project_id.eq.${projectId}`)
          .or(`name.ilike.${searchQuery},description.ilike.${searchQuery}`)
          .order('usage_count', { ascending: false })
          .limit(50)

        if (error) {
          throw new ApiErrorClass({
            code: 'SEARCH_TEMPLATES_ERROR',
            message: error.message,
          })
        }

        return data as TakeoffTemplate[]
      } else {
        // Search company-wide templates only
        return await apiClient.select<TakeoffTemplate>('takeoff_templates', {
          ...options,
          filters: [
            ...(options?.filters || []),
            { column: 'company_id', operator: 'eq', value: companyId },
            { column: 'project_id', operator: 'eq', value: null },
            { column: 'name', operator: 'ilike', value: searchQuery },
            { column: 'deleted_at', operator: 'eq', value: null },
          ],
          orderBy: options?.orderBy || { column: 'usage_count', ascending: false },
        })
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'SEARCH_TEMPLATES_ERROR',
            message: 'Failed to search templates',
          })
    }
  },
}
