// File: /src/lib/api/services/markups.ts
// Document markups API service for drawing annotations

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import type { AnnotationType } from '@/types/markup'
import { supabase } from '@/lib/supabase'

/**
 * DocumentMarkup type definition
 */
export interface DocumentMarkup {
  id: string
  project_id: string
  document_id: string
  page_number: number | null
  markup_type: AnnotationType
  markup_data: {
    // Konva shape properties
    x: number
    y: number
    width?: number
    height?: number
    radius?: number
    points?: number[] // For freehand/line
    text?: string // For text annotations
    fill?: string
    stroke?: string
    strokeWidth?: number
    rotation?: number
    scaleX?: number
    scaleY?: number
    // Arrow-specific
    pointerLength?: number
    pointerWidth?: number
    // Cloud-specific
    numBumps?: number
    // Additional metadata
    label?: string
    createdBy?: string
    createdAt?: string
  }
  is_shared: boolean | null
  shared_with_roles: string[] | null
  related_to_id: string | null
  related_to_type: string | null
  // Enhanced markup fields (migration 014)
  layer_id: string | null
  color: string | null
  visible: boolean | null
  author_name: string | null
  permission_level: string | null
  shared_with_users: string[] | null
  created_by: string | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
  // Creator information (joined from users table)
  creator?: {
    id: string
    full_name: string | null
    email: string | null
  }
}

export const markupsApi = {
  /**
   * Fetch all markups for a document
   * @param documentId - Document ID
   * @param pageNumber - Optional page number for PDF documents
   */
  async getDocumentMarkups(
    documentId: string,
    pageNumber?: number | null
  ): Promise<DocumentMarkup[]> {
    try {
      if (!documentId) {
        throw new ApiErrorClass({
          code: 'DOCUMENT_ID_REQUIRED',
          message: 'Document ID is required',
        })
      }

      // Use Supabase directly to join with users table
      let query = supabase
        .from('document_markups')
        .select(`
          *,
          creator:users!document_markups_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('document_id', documentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      // Add page number filter if provided
      if (pageNumber !== undefined && pageNumber !== null) {
        query = query.eq('page_number', pageNumber)
      }

      const { data, error } = await query

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_MARKUPS_ERROR',
          message: `Failed to fetch document markups: ${error.message}`,
        })
      }

      return (data || []) as unknown as DocumentMarkup[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_MARKUPS_ERROR',
            message: 'Failed to fetch document markups',
          })
    }
  },

  /**
   * Fetch a single markup by ID
   */
  async getMarkup(markupId: string): Promise<DocumentMarkup> {
    try {
      if (!markupId) {
        throw new ApiErrorClass({
          code: 'MARKUP_ID_REQUIRED',
          message: 'Markup ID is required',
        })
      }

      return await apiClient.selectOne<DocumentMarkup>('document_markups', markupId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_MARKUP_ERROR',
            message: 'Failed to fetch markup',
          })
    }
  },

  /**
   * Create a new markup annotation
   */
  async createMarkup(
    data: Omit<DocumentMarkup, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
  ): Promise<DocumentMarkup> {
    try {
      if (!data.document_id) {
        throw new ApiErrorClass({
          code: 'DOCUMENT_ID_REQUIRED',
          message: 'Document ID is required',
        })
      }

      if (!data.project_id) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      if (!data.markup_type) {
        throw new ApiErrorClass({
          code: 'MARKUP_TYPE_REQUIRED',
          message: 'Markup type is required',
        })
      }

      if (!data.markup_data) {
        throw new ApiErrorClass({
          code: 'MARKUP_DATA_REQUIRED',
          message: 'Markup data is required',
        })
      }

      return await apiClient.insert<DocumentMarkup>('document_markups', data)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_MARKUP_ERROR',
            message: 'Failed to create markup',
          })
    }
  },

  /**
   * Update an existing markup
   */
  async updateMarkup(
    markupId: string,
    updates: Partial<Omit<DocumentMarkup, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>
  ): Promise<DocumentMarkup> {
    try {
      if (!markupId) {
        throw new ApiErrorClass({
          code: 'MARKUP_ID_REQUIRED',
          message: 'Markup ID is required',
        })
      }

      return await apiClient.update<DocumentMarkup>('document_markups', markupId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_MARKUP_ERROR',
            message: 'Failed to update markup',
          })
    }
  },

  /**
   * Delete a markup (soft delete)
   */
  async deleteMarkup(markupId: string): Promise<void> {
    try {
      if (!markupId) {
        throw new ApiErrorClass({
          code: 'MARKUP_ID_REQUIRED',
          message: 'Markup ID is required',
        })
      }

      await apiClient.delete('document_markups', markupId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_MARKUP_ERROR',
            message: 'Failed to delete markup',
          })
    }
  },

  /**
   * Batch create multiple markups (for efficiency when saving many annotations)
   */
  async batchCreateMarkups(
    markups: Omit<DocumentMarkup, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>[]
  ): Promise<DocumentMarkup[]> {
    try {
      if (!markups || markups.length === 0) {
        throw new ApiErrorClass({
          code: 'MARKUPS_REQUIRED',
          message: 'At least one markup is required',
        })
      }

      // Validate all markups have required fields
      for (const markup of markups) {
        if (!markup.document_id || !markup.project_id || !markup.markup_type) {
          throw new ApiErrorClass({
            code: 'INVALID_MARKUP_DATA',
            message: 'All markups must have document_id, project_id, and markup_type',
          })
        }
      }

      return await apiClient.insertMany<DocumentMarkup>('document_markups', markups)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'BATCH_CREATE_MARKUPS_ERROR',
            message: 'Failed to batch create markups',
          })
    }
  },

  /**
   * Batch delete multiple markups (for clearing all annotations)
   */
  async batchDeleteMarkups(markupIds: string[]): Promise<void> {
    try {
      if (!markupIds || markupIds.length === 0) {
        throw new ApiErrorClass({
          code: 'MARKUP_IDS_REQUIRED',
          message: 'At least one markup ID is required',
        })
      }

      // Perform soft delete for each markup
      await Promise.all(markupIds.map(id => this.deleteMarkup(id)))
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'BATCH_DELETE_MARKUPS_ERROR',
            message: 'Failed to batch delete markups',
          })
    }
  },

  /**
   * Update sharing settings for a markup
   */
  async updateMarkupSharing(
    markupId: string,
    settings: {
      isShared: boolean
      sharedWithRoles?: string[]
      sharedWithUsers?: string[]
      permissionLevel?: 'view' | 'edit' | 'admin'
    }
  ): Promise<DocumentMarkup> {
    try {
      if (!markupId) {
        throw new ApiErrorClass({
          code: 'MARKUP_ID_REQUIRED',
          message: 'Markup ID is required',
        })
      }

      return await this.updateMarkup(markupId, {
        is_shared: settings.isShared,
        shared_with_roles: settings.sharedWithRoles || null,
        shared_with_users: settings.sharedWithUsers || null,
        permission_level: settings.permissionLevel || 'view',
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_MARKUP_SHARING_ERROR',
            message: 'Failed to update markup sharing settings',
          })
    }
  },
}
