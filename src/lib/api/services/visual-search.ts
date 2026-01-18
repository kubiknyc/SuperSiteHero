// File: /src/lib/api/services/visual-search.ts
// Visual Search API service for AI-powered pattern matching in drawings

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import { supabase } from '@/lib/supabase'
import type {
  VisualSearchPattern,
  VisualSearchPatternInsert,
  VisualSearchPatternUpdate,
  FindPatternMatchesRequest,
  FindPatternMatchesResponse,
} from '@/types/drawing-sheets'
import type { QueryOptions } from '../types'

export interface PatternFilters {
  createdBy?: string
  hasDefaultAssembly?: boolean
  searchTerm?: string
}

export const visualSearchApi = {
  // =============================================
  // PATTERN CRUD
  // =============================================

  /**
   * Fetch all visual search patterns for a project
   */
  async getProjectPatterns(
    projectId: string,
    filters?: PatternFilters,
    options?: QueryOptions
  ): Promise<VisualSearchPattern[]> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      const queryFilters = [
        { column: 'project_id', operator: 'eq' as const, value: projectId },
        { column: 'deleted_at', operator: 'eq' as const, value: null },
      ]

      if (filters?.createdBy) {
        queryFilters.push({
          column: 'created_by',
          operator: 'eq' as const,
          value: filters.createdBy,
        })
      }

      if (filters?.hasDefaultAssembly === true) {
        queryFilters.push({
          column: 'default_assembly_id',
          operator: 'neq' as const,
          value: null,
        })
      } else if (filters?.hasDefaultAssembly === false) {
        queryFilters.push({
          column: 'default_assembly_id',
          operator: 'eq' as const,
          value: null,
        })
      }

      // Handle search term with custom query for OR condition
      if (filters?.searchTerm && filters.searchTerm.length >= 2) {
        return await apiClient.query<VisualSearchPattern>(
          'visual_search_patterns',
          (query) =>
            query
              .select('*')
              .eq('project_id', projectId)
              .is('deleted_at', null)
              .or(`name.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%,pattern_description.ilike.%${filters.searchTerm}%`)
              .order(options?.orderBy?.column || 'name', {
                ascending: options?.orderBy?.ascending !== false,
              })
        )
      }

      return await apiClient.select<VisualSearchPattern>('visual_search_patterns', {
        ...options,
        filters: [...(options?.filters || []), ...queryFilters],
        orderBy: options?.orderBy || { column: 'name', ascending: true },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_PATTERNS_ERROR',
            message: 'Failed to fetch visual search patterns',
          })
    }
  },

  /**
   * Fetch a single pattern by ID
   */
  async getPattern(patternId: string): Promise<VisualSearchPattern> {
    try {
      if (!patternId) {
        throw new ApiErrorClass({
          code: 'PATTERN_ID_REQUIRED',
          message: 'Pattern ID is required',
        })
      }

      return await apiClient.selectOne<VisualSearchPattern>('visual_search_patterns', patternId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_PATTERN_ERROR',
            message: 'Failed to fetch visual search pattern',
          })
    }
  },

  /**
   * Create a new visual search pattern
   */
  async createPattern(pattern: VisualSearchPatternInsert): Promise<VisualSearchPattern> {
    try {
      if (!pattern.project_id || !pattern.company_id) {
        throw new ApiErrorClass({
          code: 'REQUIRED_FIELDS_MISSING',
          message: 'project_id and company_id are required',
        })
      }

      if (!pattern.name || !pattern.pattern_image_url) {
        throw new ApiErrorClass({
          code: 'REQUIRED_FIELDS_MISSING',
          message: 'name and pattern_image_url are required',
        })
      }

      return await apiClient.insert<VisualSearchPattern>('visual_search_patterns', {
        ...pattern,
        match_tolerance: pattern.match_tolerance ?? 0.8,
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_PATTERN_ERROR',
            message: 'Failed to create visual search pattern',
          })
    }
  },

  /**
   * Update a visual search pattern
   */
  async updatePattern(
    patternId: string,
    updates: VisualSearchPatternUpdate
  ): Promise<VisualSearchPattern> {
    try {
      if (!patternId) {
        throw new ApiErrorClass({
          code: 'PATTERN_ID_REQUIRED',
          message: 'Pattern ID is required',
        })
      }

      return await apiClient.update<VisualSearchPattern>('visual_search_patterns', patternId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_PATTERN_ERROR',
            message: 'Failed to update visual search pattern',
          })
    }
  },

  /**
   * Soft delete a visual search pattern (set deleted_at)
   */
  async deletePattern(patternId: string): Promise<void> {
    try {
      if (!patternId) {
        throw new ApiErrorClass({
          code: 'PATTERN_ID_REQUIRED',
          message: 'Pattern ID is required',
        })
      }

      await apiClient.update<VisualSearchPattern>('visual_search_patterns', patternId, {
        deleted_at: new Date().toISOString(),
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_PATTERN_ERROR',
            message: 'Failed to delete visual search pattern',
          })
    }
  },

  // =============================================
  // PATTERN USAGE TRACKING
  // =============================================

  /**
   * Increment usage count and update last_used_at for a pattern
   */
  async recordPatternUsage(patternId: string): Promise<VisualSearchPattern> {
    try {
      if (!patternId) {
        throw new ApiErrorClass({
          code: 'PATTERN_ID_REQUIRED',
          message: 'Pattern ID is required',
        })
      }

      // Get current pattern to increment usage_count
      const currentPattern = await this.getPattern(patternId)

      return await apiClient.update<VisualSearchPattern>('visual_search_patterns', patternId, {
        usage_count: currentPattern.usage_count + 1,
        last_used_at: new Date().toISOString(),
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'RECORD_USAGE_ERROR',
            message: 'Failed to record pattern usage',
          })
    }
  },

  /**
   * Get most frequently used patterns for a project
   */
  async getFrequentPatterns(
    projectId: string,
    limit: number = 10
  ): Promise<VisualSearchPattern[]> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      return await apiClient.select<VisualSearchPattern>('visual_search_patterns', {
        filters: [
          { column: 'project_id', operator: 'eq', value: projectId },
          { column: 'deleted_at', operator: 'eq', value: null },
          { column: 'usage_count', operator: 'gt', value: 0 },
        ],
        orderBy: { column: 'usage_count', ascending: false },
        pagination: { limit },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_FREQUENT_PATTERNS_ERROR',
            message: 'Failed to fetch frequently used patterns',
          })
    }
  },

  /**
   * Get recently used patterns for a project
   */
  async getRecentPatterns(
    projectId: string,
    limit: number = 10
  ): Promise<VisualSearchPattern[]> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      return await apiClient.select<VisualSearchPattern>('visual_search_patterns', {
        filters: [
          { column: 'project_id', operator: 'eq', value: projectId },
          { column: 'deleted_at', operator: 'eq', value: null },
          { column: 'last_used_at', operator: 'neq', value: null },
        ],
        orderBy: { column: 'last_used_at', ascending: false },
        pagination: { limit },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_RECENT_PATTERNS_ERROR',
            message: 'Failed to fetch recently used patterns',
          })
    }
  },

  // =============================================
  // SEARCH EXECUTION
  // =============================================

  /**
   * Execute visual pattern matching search via Edge Function
   */
  async executeSearch(request: FindPatternMatchesRequest): Promise<FindPatternMatchesResponse> {
    try {
      if (!request.sheet_ids || request.sheet_ids.length === 0) {
        throw new ApiErrorClass({
          code: 'SHEET_IDS_REQUIRED',
          message: 'At least one sheet ID is required for search',
        })
      }

      if (!request.pattern_id && !request.pattern_image_base64) {
        throw new ApiErrorClass({
          code: 'PATTERN_REQUIRED',
          message: 'Either pattern_id or pattern_image_base64 is required',
        })
      }

      const { data, error } = await supabase.functions.invoke<FindPatternMatchesResponse>(
        'find-pattern-matches',
        {
          body: {
            pattern_id: request.pattern_id,
            pattern_image_base64: request.pattern_image_base64,
            sheet_ids: request.sheet_ids,
            match_tolerance: request.match_tolerance ?? 0.8,
          },
        }
      )

      if (error) {
        throw new ApiErrorClass({
          code: 'EDGE_FUNCTION_ERROR',
          message: error.message || 'Failed to execute pattern search',
        })
      }

      if (!data) {
        throw new ApiErrorClass({
          code: 'NO_RESPONSE',
          message: 'No response received from pattern search',
        })
      }

      // If using a saved pattern, record its usage
      if (request.pattern_id && data.success) {
        // Fire and forget - don't await to avoid blocking the response
        this.recordPatternUsage(request.pattern_id).catch((err) => {
          console.warn('Failed to record pattern usage:', err)
        })
      }

      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'EXECUTE_SEARCH_ERROR',
            message: 'Failed to execute visual pattern search',
          })
    }
  },

  // =============================================
  // STORAGE
  // =============================================

  /**
   * Upload a pattern image to Supabase Storage
   * Returns the public URL of the uploaded image
   */
  async uploadPatternImage(projectId: string, imageBase64: string): Promise<string> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      if (!imageBase64) {
        throw new ApiErrorClass({
          code: 'IMAGE_REQUIRED',
          message: 'Image data is required',
        })
      }

      // Remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

      // Determine image type from base64 header or default to PNG
      let contentType = 'image/png'
      let extension = 'png'
      if (imageBase64.startsWith('data:image/jpeg')) {
        contentType = 'image/jpeg'
        extension = 'jpg'
      } else if (imageBase64.startsWith('data:image/webp')) {
        contentType = 'image/webp'
        extension = 'webp'
      }

      // Convert base64 to Uint8Array
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Generate unique filename
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 8)
      const fileName = `patterns/${projectId}/${timestamp}-${randomId}.${extension}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('visual-search')
        .upload(fileName, bytes, {
          contentType,
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        throw new ApiErrorClass({
          code: 'STORAGE_UPLOAD_ERROR',
          message: error.message || 'Failed to upload pattern image',
        })
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('visual-search')
        .getPublicUrl(data.path)

      return urlData.publicUrl
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPLOAD_PATTERN_IMAGE_ERROR',
            message: 'Failed to upload pattern image',
          })
    }
  },

  /**
   * Delete a pattern image from Supabase Storage
   */
  async deletePatternImage(imageUrl: string): Promise<void> {
    try {
      if (!imageUrl) {
        throw new ApiErrorClass({
          code: 'IMAGE_URL_REQUIRED',
          message: 'Image URL is required',
        })
      }

      // Extract path from URL
      // URL format: https://<project>.supabase.co/storage/v1/object/public/visual-search/patterns/...
      const urlParts = imageUrl.split('/visual-search/')
      if (urlParts.length !== 2) {
        throw new ApiErrorClass({
          code: 'INVALID_IMAGE_URL',
          message: 'Invalid image URL format',
        })
      }

      const filePath = urlParts[1]

      const { error } = await supabase.storage
        .from('visual-search')
        .remove([filePath])

      if (error) {
        throw new ApiErrorClass({
          code: 'STORAGE_DELETE_ERROR',
          message: error.message || 'Failed to delete pattern image',
        })
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_PATTERN_IMAGE_ERROR',
            message: 'Failed to delete pattern image',
          })
    }
  },
}
