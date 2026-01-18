// File: /src/lib/api/services/drawing-sheets.ts
// Drawing Sheets API service for AI-powered drawing management

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import type {
  DrawingSheet,
  DrawingSheetInsert,
  DrawingSheetUpdate,
  SheetCallout,
  SheetCalloutInsert,
  SheetCalloutUpdate,
  DrawingDiscipline,
  ProcessingStatus,
} from '@/types/drawing-sheets'
import type { QueryOptions } from '../types'

export interface DrawingSheetFilters {
  discipline?: DrawingDiscipline
  sourcePdfId?: string
  processingStatus?: ProcessingStatus
  searchTerm?: string
}

export const drawingSheetsApi = {
  /**
   * Fetch all drawing sheets for a project
   */
  async getProjectSheets(
    projectId: string,
    filters?: DrawingSheetFilters,
    options?: QueryOptions
  ): Promise<DrawingSheet[]> {
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

      if (filters?.discipline) {
        queryFilters.push({
          column: 'discipline',
          operator: 'eq' as const,
          value: filters.discipline,
        })
      }

      if (filters?.sourcePdfId) {
        queryFilters.push({
          column: 'source_pdf_id',
          operator: 'eq' as const,
          value: filters.sourcePdfId,
        })
      }

      if (filters?.processingStatus) {
        queryFilters.push({
          column: 'processing_status',
          operator: 'eq' as const,
          value: filters.processingStatus,
        })
      }

      return await apiClient.select<DrawingSheet>('drawing_sheets', {
        ...options,
        filters: [...(options?.filters || []), ...queryFilters],
        orderBy: options?.orderBy || { column: 'sheet_number', ascending: true },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_DRAWING_SHEETS_ERROR',
            message: 'Failed to fetch drawing sheets',
          })
    }
  },

  /**
   * Fetch a single drawing sheet by ID
   */
  async getSheet(sheetId: string): Promise<DrawingSheet> {
    try {
      if (!sheetId) {
        throw new ApiErrorClass({
          code: 'SHEET_ID_REQUIRED',
          message: 'Sheet ID is required',
        })
      }

      return await apiClient.selectOne<DrawingSheet>('drawing_sheets', sheetId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_DRAWING_SHEET_ERROR',
            message: 'Failed to fetch drawing sheet',
          })
    }
  },

  /**
   * Fetch sheets from a specific PDF document
   */
  async getSheetsByPdf(pdfId: string): Promise<DrawingSheet[]> {
    try {
      if (!pdfId) {
        throw new ApiErrorClass({
          code: 'PDF_ID_REQUIRED',
          message: 'PDF document ID is required',
        })
      }

      return await apiClient.select<DrawingSheet>('drawing_sheets', {
        filters: [
          { column: 'source_pdf_id', operator: 'eq', value: pdfId },
          { column: 'deleted_at', operator: 'eq', value: null },
        ],
        orderBy: { column: 'page_number', ascending: true },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_SHEETS_BY_PDF_ERROR',
            message: 'Failed to fetch sheets for this PDF',
          })
    }
  },

  /**
   * Search sheets by text (title, sheet_number)
   */
  async searchSheets(
    projectId: string,
    searchTerm: string
  ): Promise<DrawingSheet[]> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      if (!searchTerm || searchTerm.length < 2) {
        throw new ApiErrorClass({
          code: 'SEARCH_TERM_TOO_SHORT',
          message: 'Search term must be at least 2 characters',
        })
      }

      // Use custom query for OR condition (title OR sheet_number)
      return await apiClient.query<DrawingSheet>(
        'drawing_sheets',
        (query) =>
          query
            .select('*')
            .eq('project_id', projectId)
            .is('deleted_at', null)
            .or(`title.ilike.%${searchTerm}%,sheet_number.ilike.%${searchTerm}%`)
            .order('sheet_number', { ascending: true })
      )
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'SEARCH_SHEETS_ERROR',
            message: 'Failed to search drawing sheets',
          })
    }
  },

  /**
   * Find a sheet by its sheet number within a project
   */
  async findSheetByNumber(
    projectId: string,
    sheetNumber: string
  ): Promise<DrawingSheet | null> {
    try {
      const results = await apiClient.select<DrawingSheet>('drawing_sheets', {
        filters: [
          { column: 'project_id', operator: 'eq', value: projectId },
          { column: 'sheet_number', operator: 'eq', value: sheetNumber },
          { column: 'deleted_at', operator: 'eq', value: null },
        ],
        pagination: { limit: 1 },
      })

      return results.length > 0 ? results[0] : null
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FIND_SHEET_ERROR',
            message: 'Failed to find sheet by number',
          })
    }
  },

  /**
   * Create a new drawing sheet
   */
  async createSheet(sheet: DrawingSheetInsert): Promise<DrawingSheet> {
    try {
      if (!sheet.project_id || !sheet.company_id) {
        throw new ApiErrorClass({
          code: 'REQUIRED_FIELDS_MISSING',
          message: 'project_id and company_id are required',
        })
      }

      return await apiClient.insert<DrawingSheet>('drawing_sheets', {
        ...sheet,
        ai_extracted_metadata: sheet.ai_extracted_metadata || {},
        processing_status: sheet.processing_status || 'pending',
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_DRAWING_SHEET_ERROR',
            message: 'Failed to create drawing sheet',
          })
    }
  },

  /**
   * Create multiple drawing sheets (batch)
   */
  async createSheets(sheets: DrawingSheetInsert[]): Promise<DrawingSheet[]> {
    try {
      if (sheets.length === 0) {
        return []
      }

      // Validate all sheets have required fields
      for (const sheet of sheets) {
        if (!sheet.project_id || !sheet.company_id) {
          throw new ApiErrorClass({
            code: 'REQUIRED_FIELDS_MISSING',
            message: 'All sheets must have project_id and company_id',
          })
        }
      }

      const sheetsWithDefaults = sheets.map((sheet) => ({
        ...sheet,
        ai_extracted_metadata: sheet.ai_extracted_metadata || {},
        processing_status: sheet.processing_status || 'pending',
      }))

      return await apiClient.insertMany<DrawingSheet>('drawing_sheets', sheetsWithDefaults)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_DRAWING_SHEETS_ERROR',
            message: 'Failed to create drawing sheets',
          })
    }
  },

  /**
   * Update a drawing sheet
   */
  async updateSheet(
    sheetId: string,
    updates: DrawingSheetUpdate
  ): Promise<DrawingSheet> {
    try {
      if (!sheetId) {
        throw new ApiErrorClass({
          code: 'SHEET_ID_REQUIRED',
          message: 'Sheet ID is required',
        })
      }

      return await apiClient.update<DrawingSheet>('drawing_sheets', sheetId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_DRAWING_SHEET_ERROR',
            message: 'Failed to update drawing sheet',
          })
    }
  },

  /**
   * Soft delete a drawing sheet
   */
  async deleteSheet(sheetId: string): Promise<void> {
    try {
      if (!sheetId) {
        throw new ApiErrorClass({
          code: 'SHEET_ID_REQUIRED',
          message: 'Sheet ID is required',
        })
      }

      await apiClient.update<DrawingSheet>('drawing_sheets', sheetId, {
        deleted_at: new Date().toISOString(),
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_DRAWING_SHEET_ERROR',
            message: 'Failed to delete drawing sheet',
          })
    }
  },

  /**
   * Update processing status for a sheet
   */
  async updateProcessingStatus(
    sheetId: string,
    status: ProcessingStatus,
    error?: string
  ): Promise<DrawingSheet> {
    try {
      const updates: DrawingSheetUpdate = {
        processing_status: status,
      }

      if (status === 'completed') {
        updates.ai_processed_at = new Date().toISOString()
      }

      if (status === 'failed' && error) {
        updates.processing_error = error
      }

      return await this.updateSheet(sheetId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_PROCESSING_STATUS_ERROR',
            message: 'Failed to update processing status',
          })
    }
  },

  // =============================================
  // SHEET CALLOUTS
  // =============================================

  /**
   * Get callouts for a specific sheet
   */
  async getSheetCallouts(sheetId: string): Promise<SheetCallout[]> {
    try {
      if (!sheetId) {
        throw new ApiErrorClass({
          code: 'SHEET_ID_REQUIRED',
          message: 'Sheet ID is required',
        })
      }

      return await apiClient.select<SheetCallout>('sheet_callouts', {
        filters: [{ column: 'source_sheet_id', operator: 'eq', value: sheetId }],
        orderBy: { column: 'created_at', ascending: true },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_SHEET_CALLOUTS_ERROR',
            message: 'Failed to fetch sheet callouts',
          })
    }
  },

  /**
   * Get all unlinked callouts for a project (callouts without target_sheet_id)
   */
  async getUnlinkedCallouts(projectId: string): Promise<SheetCallout[]> {
    try {
      // Use custom query to join with drawing_sheets and filter by project
      return await apiClient.query<SheetCallout>(
        'sheet_callouts',
        (query) =>
          query
            .select(`
              *,
              source_sheet:drawing_sheets!source_sheet_id (
                project_id,
                sheet_number
              )
            `)
            .is('target_sheet_id', null)
            .eq('source_sheet.project_id', projectId)
      )
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_UNLINKED_CALLOUTS_ERROR',
            message: 'Failed to fetch unlinked callouts',
          })
    }
  },

  /**
   * Create callouts for a sheet
   */
  async createCallouts(callouts: SheetCalloutInsert[]): Promise<SheetCallout[]> {
    try {
      if (callouts.length === 0) {
        return []
      }

      return await apiClient.insertMany<SheetCallout>('sheet_callouts', callouts)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_CALLOUTS_ERROR',
            message: 'Failed to create callouts',
          })
    }
  },

  /**
   * Link a callout to its target sheet
   */
  async linkCallout(
    calloutId: string,
    targetSheetId: string
  ): Promise<SheetCallout> {
    try {
      if (!calloutId || !targetSheetId) {
        throw new ApiErrorClass({
          code: 'REQUIRED_FIELDS_MISSING',
          message: 'Callout ID and target sheet ID are required',
        })
      }

      return await apiClient.update<SheetCallout>('sheet_callouts', calloutId, {
        target_sheet_id: targetSheetId,
        is_verified: true,
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'LINK_CALLOUT_ERROR',
            message: 'Failed to link callout to target sheet',
          })
    }
  },

  /**
   * Update a callout
   */
  async updateCallout(
    calloutId: string,
    updates: SheetCalloutUpdate
  ): Promise<SheetCallout> {
    try {
      if (!calloutId) {
        throw new ApiErrorClass({
          code: 'CALLOUT_ID_REQUIRED',
          message: 'Callout ID is required',
        })
      }

      return await apiClient.update<SheetCallout>('sheet_callouts', calloutId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_CALLOUT_ERROR',
            message: 'Failed to update callout',
          })
    }
  },

  /**
   * Delete a callout
   */
  async deleteCallout(calloutId: string): Promise<void> {
    try {
      if (!calloutId) {
        throw new ApiErrorClass({
          code: 'CALLOUT_ID_REQUIRED',
          message: 'Callout ID is required',
        })
      }

      await apiClient.delete('sheet_callouts', calloutId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_CALLOUT_ERROR',
            message: 'Failed to delete callout',
          })
    }
  },

  /**
   * Auto-resolve callout links by matching target_sheet_number to existing sheets
   */
  async autoResolveCallouts(projectId: string): Promise<number> {
    try {
      // Get all unlinked callouts with target_sheet_number
      const unlinkedCallouts = await this.getUnlinkedCallouts(projectId)
      const calloutsWithTargets = unlinkedCallouts.filter((c) => c.target_sheet_number)

      let resolved = 0
      for (const callout of calloutsWithTargets) {
        const targetSheet = await this.findSheetByNumber(
          projectId,
          callout.target_sheet_number!
        )

        if (targetSheet) {
          await this.linkCallout(callout.id, targetSheet.id)
          resolved++
        }
      }

      return resolved
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'AUTO_RESOLVE_CALLOUTS_ERROR',
            message: 'Failed to auto-resolve callouts',
          })
    }
  },
}
