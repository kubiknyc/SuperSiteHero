// File: /src/features/drawing-sheets/hooks/useDrawingSheets.ts
// React Query hooks for drawing sheets and callouts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { drawingSheetsApi, type DrawingSheetFilters } from '@/lib/api/services/drawing-sheets'
import type {
  DrawingSheet,
  DrawingSheetInsert,
  DrawingSheetUpdate,
  SheetCallout,
  SheetCalloutInsert,
  SheetCalloutUpdate,
} from '@/types/drawing-sheets'

// =============================================
// Query Keys
// =============================================

export const drawingSheetKeys = {
  all: ['drawing-sheets'] as const,
  lists: () => [...drawingSheetKeys.all, 'list'] as const,
  list: (projectId: string, filters?: DrawingSheetFilters) =>
    [...drawingSheetKeys.lists(), projectId, filters] as const,
  details: () => [...drawingSheetKeys.all, 'detail'] as const,
  detail: (id: string) => [...drawingSheetKeys.details(), id] as const,
  byPdf: (pdfId: string) => [...drawingSheetKeys.all, 'pdf', pdfId] as const,
  search: (projectId: string, term: string) =>
    [...drawingSheetKeys.all, 'search', projectId, term] as const,
  callouts: {
    all: ['sheet-callouts'] as const,
    bySheet: (sheetId: string) => ['sheet-callouts', 'sheet', sheetId] as const,
    unlinked: (projectId: string) => ['sheet-callouts', 'unlinked', projectId] as const,
  },
}

// =============================================
// Drawing Sheet Query Hooks
// =============================================

/**
 * Fetch all drawing sheets for a project with optional filtering
 * @param projectId - Project ID
 * @param filters - Optional filters (discipline, sourcePdfId, processingStatus)
 *
 * Usage:
 * const { data: sheets } = useDrawingSheets(projectId)
 * const { data: sheets } = useDrawingSheets(projectId, { discipline: 'electrical' })
 */
export function useDrawingSheets(
  projectId: string | undefined,
  filters?: DrawingSheetFilters
) {
  return useQuery({
    queryKey: drawingSheetKeys.list(projectId || '', filters),
    queryFn: () => drawingSheetsApi.getProjectSheets(projectId!, filters),
    enabled: !!projectId,
  })
}

/**
 * Fetch a single drawing sheet by ID
 * @param sheetId - Sheet ID
 *
 * Usage:
 * const { data: sheet } = useDrawingSheet(sheetId)
 */
export function useDrawingSheet(sheetId: string | undefined) {
  return useQuery({
    queryKey: drawingSheetKeys.detail(sheetId || ''),
    queryFn: () => drawingSheetsApi.getSheet(sheetId!),
    enabled: !!sheetId,
  })
}

/**
 * Fetch all sheets extracted from a specific PDF document
 * @param pdfId - Source PDF document ID
 *
 * Usage:
 * const { data: sheets } = useSheetsByPdf(documentId)
 */
export function useSheetsByPdf(pdfId: string | undefined) {
  return useQuery({
    queryKey: drawingSheetKeys.byPdf(pdfId || ''),
    queryFn: () => drawingSheetsApi.getSheetsByPdf(pdfId!),
    enabled: !!pdfId,
  })
}

/**
 * Search sheets by text (title, sheet_number)
 * Requires at least 2 characters to search
 * @param projectId - Project ID
 * @param searchTerm - Search term
 *
 * Usage:
 * const { data: results } = useSearchSheets(projectId, 'A2.1')
 */
export function useSearchSheets(
  projectId: string | undefined,
  searchTerm: string
) {
  return useQuery({
    queryKey: drawingSheetKeys.search(projectId || '', searchTerm),
    queryFn: () => drawingSheetsApi.searchSheets(projectId!, searchTerm),
    enabled: !!projectId && searchTerm.length >= 2,
  })
}

/**
 * Find a specific sheet by its sheet number
 * @param projectId - Project ID
 * @param sheetNumber - Sheet number to find (e.g., "A2.1")
 *
 * Usage:
 * const { data: sheet } = useFindSheetByNumber(projectId, 'A2.1')
 */
export function useFindSheetByNumber(
  projectId: string | undefined,
  sheetNumber: string | undefined
) {
  return useQuery({
    queryKey: [...drawingSheetKeys.all, 'find', projectId, sheetNumber] as const,
    queryFn: () => drawingSheetsApi.findSheetByNumber(projectId!, sheetNumber!),
    enabled: !!projectId && !!sheetNumber,
  })
}

// =============================================
// Drawing Sheet Mutation Hooks
// =============================================

/**
 * Create a new drawing sheet
 *
 * Usage:
 * const createSheet = useCreateDrawingSheet()
 * await createSheet.mutateAsync({
 *   project_id: projectId,
 *   company_id: companyId,
 *   page_number: 1,
 *   source_pdf_id: documentId
 * })
 */
export function useCreateDrawingSheet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sheet: DrawingSheetInsert) =>
      drawingSheetsApi.createSheet(sheet),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: drawingSheetKeys.lists() })
      if (data.source_pdf_id) {
        queryClient.invalidateQueries({
          queryKey: drawingSheetKeys.byPdf(data.source_pdf_id),
        })
      }
    },
  })
}

/**
 * Create multiple drawing sheets at once (batch)
 *
 * Usage:
 * const createSheets = useCreateDrawingSheets()
 * await createSheets.mutateAsync(sheetsArray)
 */
export function useCreateDrawingSheets() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sheets: DrawingSheetInsert[]) =>
      drawingSheetsApi.createSheets(sheets),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: drawingSheetKeys.lists() })

      // Invalidate PDF-specific queries
      const pdfIds = [...new Set(data.map((s) => s.source_pdf_id).filter(Boolean))]
      pdfIds.forEach((pdfId) => {
        if (pdfId) {
          queryClient.invalidateQueries({
            queryKey: drawingSheetKeys.byPdf(pdfId),
          })
        }
      })
    },
  })
}

/**
 * Update a drawing sheet
 *
 * Usage:
 * const updateSheet = useUpdateDrawingSheet()
 * await updateSheet.mutateAsync({
 *   id: sheetId,
 *   sheet_number: 'A2.1',
 *   title: 'Floor Plan - Level 2'
 * })
 */
export function useUpdateDrawingSheet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...updates }: DrawingSheetUpdate & { id: string }) =>
      drawingSheetsApi.updateSheet(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: drawingSheetKeys.lists() })
      queryClient.invalidateQueries({ queryKey: drawingSheetKeys.detail(data.id) })
      if (data.source_pdf_id) {
        queryClient.invalidateQueries({
          queryKey: drawingSheetKeys.byPdf(data.source_pdf_id),
        })
      }
    },
  })
}

/**
 * Delete a drawing sheet (soft delete)
 *
 * Usage:
 * const deleteSheet = useDeleteDrawingSheet()
 * await deleteSheet.mutateAsync(sheetId)
 */
export function useDeleteDrawingSheet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sheetId: string) => drawingSheetsApi.deleteSheet(sheetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: drawingSheetKeys.lists() })
    },
  })
}

/**
 * Update processing status for a sheet
 *
 * Usage:
 * const updateStatus = useUpdateProcessingStatus()
 * await updateStatus.mutateAsync({ sheetId, status: 'completed' })
 */
export function useUpdateProcessingStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      sheetId,
      status,
      error,
    }: {
      sheetId: string
      status: 'pending' | 'processing' | 'completed' | 'failed'
      error?: string
    }) => drawingSheetsApi.updateProcessingStatus(sheetId, status, error),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: drawingSheetKeys.lists() })
      queryClient.invalidateQueries({ queryKey: drawingSheetKeys.detail(data.id) })
    },
  })
}

// =============================================
// Sheet Callouts Query Hooks
// =============================================

/**
 * Fetch all callouts for a specific sheet
 * @param sheetId - Sheet ID
 *
 * Usage:
 * const { data: callouts } = useSheetCallouts(sheetId)
 */
export function useSheetCallouts(sheetId: string | undefined) {
  return useQuery({
    queryKey: drawingSheetKeys.callouts.bySheet(sheetId || ''),
    queryFn: () => drawingSheetsApi.getSheetCallouts(sheetId!),
    enabled: !!sheetId,
  })
}

/**
 * Fetch all unlinked callouts (no target_sheet_id) for a project
 * @param projectId - Project ID
 *
 * Usage:
 * const { data: unlinkedCallouts } = useUnlinkedCallouts(projectId)
 */
export function useUnlinkedCallouts(projectId: string | undefined) {
  return useQuery({
    queryKey: drawingSheetKeys.callouts.unlinked(projectId || ''),
    queryFn: () => drawingSheetsApi.getUnlinkedCallouts(projectId!),
    enabled: !!projectId,
  })
}

// =============================================
// Sheet Callouts Mutation Hooks
// =============================================

/**
 * Create callouts for a sheet
 *
 * Usage:
 * const createCallouts = useCreateCallouts()
 * await createCallouts.mutateAsync([
 *   { source_sheet_id: sheetId, callout_text: 'SEE A2.1', callout_type: 'reference' }
 * ])
 */
export function useCreateCallouts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (callouts: SheetCalloutInsert[]) =>
      drawingSheetsApi.createCallouts(callouts),
    onSuccess: (data) => {
      if (data.length > 0) {
        const sourceSheetIds = [...new Set(data.map((c) => c.source_sheet_id))]
        sourceSheetIds.forEach((sheetId) => {
          queryClient.invalidateQueries({
            queryKey: drawingSheetKeys.callouts.bySheet(sheetId),
          })
        })
        queryClient.invalidateQueries({
          queryKey: drawingSheetKeys.callouts.unlinked,
        })
      }
    },
  })
}

/**
 * Link a callout to its target sheet
 *
 * Usage:
 * const linkCallout = useLinkCallout()
 * await linkCallout.mutateAsync({ calloutId, targetSheetId })
 */
export function useLinkCallout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      calloutId,
      targetSheetId,
    }: {
      calloutId: string
      targetSheetId: string
    }) => drawingSheetsApi.linkCallout(calloutId, targetSheetId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: drawingSheetKeys.callouts.bySheet(data.source_sheet_id),
      })
      queryClient.invalidateQueries({
        queryKey: drawingSheetKeys.callouts.unlinked,
      })
    },
  })
}

/**
 * Update a callout
 *
 * Usage:
 * const updateCallout = useUpdateCallout()
 * await updateCallout.mutateAsync({
 *   id: calloutId,
 *   is_verified: true
 * })
 */
export function useUpdateCallout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...updates }: SheetCalloutUpdate & { id: string }) =>
      drawingSheetsApi.updateCallout(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: drawingSheetKeys.callouts.bySheet(data.source_sheet_id),
      })
    },
  })
}

/**
 * Delete a callout
 *
 * Usage:
 * const deleteCallout = useDeleteCallout()
 * await deleteCallout.mutateAsync(calloutId)
 */
export function useDeleteCallout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (calloutId: string) => drawingSheetsApi.deleteCallout(calloutId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: drawingSheetKeys.callouts.all,
      })
    },
  })
}

/**
 * Auto-resolve unlinked callouts by matching target_sheet_number to existing sheets
 *
 * Usage:
 * const autoResolve = useAutoResolveCallouts()
 * const resolvedCount = await autoResolve.mutateAsync(projectId)
 */
export function useAutoResolveCallouts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) =>
      drawingSheetsApi.autoResolveCallouts(projectId),
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({
        queryKey: drawingSheetKeys.callouts.all,
      })
      queryClient.invalidateQueries({
        queryKey: drawingSheetKeys.callouts.unlinked(projectId),
      })
    },
  })
}
