// File: /src/features/documents/hooks/useDocumentComparison.ts
// React Query hooks for document version comparison with visual diff detection
//
// NOTE: This file references database tables that are created in migration 014_enhanced_markup_features.sql
// The database types in src/types/database.ts need to be updated after running the migration.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type { Document } from '@/types/database'
import type { VersionComparisonResult, ChangeRegion, ScaleCalibration } from '../types/markup'
import { compareCanvasImages, analyzeChangeTypes, type DiffResult } from '../services/visual-diff'
import { renderDocumentToCanvas, getPdfInfo, type RenderPdfOptions } from '../utils/pdf-to-canvas'

// Type assertion helper for new tables not yet in database.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

/**
 * Fetch versions of a document for comparison
 */
export function useDocumentVersionsForComparison(documentId: string | undefined) {
  return useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: async () => {
      if (!documentId) {throw new Error('Document ID required')}

      // First get the current document
      const { data: currentDoc, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (docError) {throw docError}

      // Then get all versions with the same base document name/number
      const { data: versions, error: versionsError } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', currentDoc.project_id)
        .or(`name.eq.${currentDoc.name},drawing_number.eq.${currentDoc.drawing_number}`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (versionsError) {throw versionsError}

      return (versions || []) as Document[]
    },
    enabled: !!documentId,
  })
}

/**
 * Extended comparison result with diff image data
 */
export interface ExtendedComparisonResult extends VersionComparisonResult {
  diffImageDataUrl?: string
  doc1PageCount?: number
  doc2PageCount?: number
}

/**
 * Options for version comparison
 */
export interface CompareVersionsOptions {
  /** Page number to compare (1-indexed). Default: 1 */
  pageNumber?: number
  /** DPI for rendering. Higher = more accurate but slower. Default: 150 */
  dpi?: number
  /** Pixel matching threshold (0-1). Higher = more tolerant. Default: 0.1 */
  threshold?: number
}

/**
 * Compare two document versions with visual diff detection
 * Uses pixelmatch for pixel-level comparison and clusters changes into regions
 */
export function useCompareVersions(
  doc1Id: string | undefined,
  doc2Id: string | undefined,
  options: CompareVersionsOptions = {}
) {
  const { pageNumber = 1, dpi = 150, threshold = 0.1 } = options

  return useQuery({
    queryKey: ['document-comparison', doc1Id, doc2Id, pageNumber, dpi, threshold],
    queryFn: async (): Promise<ExtendedComparisonResult> => {
      if (!doc1Id || !doc2Id) {
        throw new Error('Both document IDs are required')
      }

      // Fetch both documents to get their URLs and file types
      const [{ data: doc1, error: err1 }, { data: doc2, error: err2 }] = await Promise.all([
        supabase.from('documents').select('*').eq('id', doc1Id).single(),
        supabase.from('documents').select('*').eq('id', doc2Id).single(),
      ])

      if (err1) {throw new Error(`Failed to fetch document 1: ${err1.message}`)}
      if (err2) {throw new Error(`Failed to fetch document 2: ${err2.message}`)}
      if (!doc1?.file_url) {throw new Error('Document 1 has no file URL')}
      if (!doc2?.file_url) {throw new Error('Document 2 has no file URL')}

      const renderOptions: RenderPdfOptions = {
        dpi,
        maxDimension: 2000,
        backgroundColor: '#FFFFFF',
      }

      // Render both documents to canvas
      const [canvas1, canvas2] = await Promise.all([
        renderDocumentToCanvas(doc1.file_url, doc1.file_type || 'application/pdf', pageNumber, renderOptions),
        renderDocumentToCanvas(doc2.file_url, doc2.file_type || 'application/pdf', pageNumber, renderOptions),
      ])

      // Run the visual diff comparison
      const diffResult = compareCanvasImages(canvas1, canvas2, {
        threshold,
        minRegionSize: 100, // Filter out noise
        mergeDistance: 20,  // Merge nearby regions
      })

      // Get page counts for PDFs
      let doc1PageCount = 1
      let doc2PageCount = 1
      if (doc1.file_type === 'application/pdf') {
        const info = await getPdfInfo(doc1.file_url)
        doc1PageCount = info.numPages
      }
      if (doc2.file_type === 'application/pdf') {
        const info = await getPdfInfo(doc2.file_url)
        doc2PageCount = info.numPages
      }

      // Analyze change types for each region if we have significant changes
      const canvas1Ctx = canvas1.getContext('2d')
      const canvas2Ctx = canvas2.getContext('2d')
      let enhancedRegions = diffResult.changeRegions

      if (canvas1Ctx && canvas2Ctx && diffResult.changeRegions.length > 0) {
        const img1Data = canvas1Ctx.getImageData(0, 0, canvas1.width, canvas1.height)
        const img2Data = canvas2Ctx.getImageData(0, 0, canvas2.width, canvas2.height)

        enhancedRegions = diffResult.changeRegions.map(region => ({
          ...region,
          changeType: analyzeChangeTypes(img1Data, img2Data, region),
        }))
      }

      // Generate summary
      const summary = generateComparisonSummary(diffResult, enhancedRegions)

      // Convert diff image to data URL for display
      const diffCanvas = document.createElement('canvas')
      diffCanvas.width = diffResult.diffImageData.width
      diffCanvas.height = diffResult.diffImageData.height
      const diffCtx = diffCanvas.getContext('2d')
      diffCtx?.putImageData(diffResult.diffImageData, 0, 0)
      const diffImageDataUrl = diffCanvas.toDataURL('image/png')

      return {
        version1Id: doc1Id,
        version2Id: doc2Id,
        changeRegions: enhancedRegions,
        overallChangePercentage: diffResult.overallChangePercentage,
        analyzedAt: new Date().toISOString(),
        summary,
        diffImageDataUrl,
        doc1PageCount,
        doc2PageCount,
      }
    },
    enabled: !!doc1Id && !!doc2Id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,   // Keep in cache for 10 minutes
    retry: 1,                  // Only retry once on failure
  })
}

/**
 * Generate a human-readable summary of the comparison
 */
function generateComparisonSummary(diffResult: DiffResult, regions: ChangeRegion[]): string {
  const { overallChangePercentage, changedPixels, totalPixels } = diffResult
  const regionCount = regions.length

  if (regionCount === 0) {
    return 'No visual differences detected between these versions.'
  }

  const addedCount = regions.filter(r => r.changeType === 'added').length
  const removedCount = regions.filter(r => r.changeType === 'removed').length
  const modifiedCount = regions.filter(r => r.changeType === 'modified').length

  const parts: string[] = []

  if (overallChangePercentage < 1) {
    parts.push('Minor changes detected')
  } else if (overallChangePercentage < 5) {
    parts.push('Moderate changes detected')
  } else if (overallChangePercentage < 20) {
    parts.push('Significant changes detected')
  } else {
    parts.push('Major changes detected')
  }

  parts.push(`(${overallChangePercentage.toFixed(1)}% of page)`)

  const changeParts: string[] = []
  if (addedCount > 0) {changeParts.push(`${addedCount} addition${addedCount > 1 ? 's' : ''}`)}
  if (removedCount > 0) {changeParts.push(`${removedCount} removal${removedCount > 1 ? 's' : ''}`)}
  if (modifiedCount > 0) {changeParts.push(`${modifiedCount} modification${modifiedCount > 1 ? 's' : ''}`)}

  if (changeParts.length > 0) {
    parts.push(`- ${changeParts.join(', ')}`)
  }

  return parts.join(' ')
}

/**
 * Legacy mutation hook for backwards compatibility
 * @deprecated Use useCompareVersions query hook instead
 */
export function useCompareVersionsMutation() {
  return useMutation({
    mutationFn: async ({
      version1Id,
      version2Id,
    }: {
      version1Id: string
      version2Id: string
    }): Promise<VersionComparisonResult> => {
      // Fetch documents
      const [{ data: doc1, error: err1 }, { data: doc2, error: err2 }] = await Promise.all([
        supabase.from('documents').select('*').eq('id', version1Id).single(),
        supabase.from('documents').select('*').eq('id', version2Id).single(),
      ])

      if (err1 || err2 || !doc1?.file_url || !doc2?.file_url) {
        return {
          version1Id,
          version2Id,
          changeRegions: [],
          overallChangePercentage: 0,
          analyzedAt: new Date().toISOString(),
          summary: 'Failed to load documents for comparison',
        }
      }

      // Render and compare
      const [canvas1, canvas2] = await Promise.all([
        renderDocumentToCanvas(doc1.file_url, doc1.file_type || 'application/pdf', 1),
        renderDocumentToCanvas(doc2.file_url, doc2.file_type || 'application/pdf', 1),
      ])

      const diffResult = compareCanvasImages(canvas1, canvas2)

      return {
        version1Id,
        version2Id,
        changeRegions: diffResult.changeRegions,
        overallChangePercentage: diffResult.overallChangePercentage,
        analyzedAt: new Date().toISOString(),
        summary: `Detected ${diffResult.changeRegions.length} change regions (${diffResult.overallChangePercentage.toFixed(1)}% changed)`,
      }
    },
  })
}

/**
 * Transfer markups from one version to another
 */
export function useTransferMarkups() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      fromDocumentId,
      toDocumentId,
      markupIds,
    }: {
      fromDocumentId: string
      toDocumentId: string
      markupIds?: string[] // If not provided, transfer all
    }) => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}

      // Get the source document's markups
      let query = supabase
        .from('document_markups')
        .select('*')
        .eq('document_id', fromDocumentId)
        .is('deleted_at', null)

      if (markupIds && markupIds.length > 0) {
        query = query.in('id', markupIds)
      }

      const { data: sourceMarkups, error: fetchError } = await query

      if (fetchError) {throw fetchError}

      if (!sourceMarkups || sourceMarkups.length === 0) {
        return { transferred: 0, toDocumentId }
      }

      // Get the target document for project_id
      const { data: targetDoc, error: targetError } = await supabase
        .from('documents')
        .select('project_id')
        .eq('id', toDocumentId)
        .single()

      if (targetError) {throw targetError}

      // Create copies of the markups for the new document
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newMarkups = sourceMarkups.map((markup: any) => ({
        document_id: toDocumentId,
        project_id: targetDoc.project_id,
        page_number: markup.page_number,
        markup_type: markup.markup_type,
        markup_data: {
          ...(markup.markup_data || {}),
          transferredFrom: fromDocumentId,
          transferredAt: new Date().toISOString(),
        },
        is_shared: markup.is_shared,
        shared_with_roles: markup.shared_with_roles,
        related_to_id: markup.related_to_id,
        related_to_type: markup.related_to_type,
        created_by: userProfile.id,
      }))

      const { data: inserted, error: insertError } = await supabase
        .from('document_markups')
        .insert(newMarkups)
        .select()

      if (insertError) {throw insertError}

      return {
        transferred: inserted?.length || 0,
        toDocumentId,
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['markups', data.toDocumentId] })
    },
  })
}

/**
 * Save scale calibration for a document page
 */
export function useSaveScaleCalibration() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (calibration: Omit<ScaleCalibration, 'id' | 'calibratedAt'>) => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}

      const { data, error } = await db
        .from('document_scale_calibrations')
        .upsert({
          document_id: calibration.documentId,
          page_number: calibration.pageNumber,
          pixel_distance: calibration.pixelDistance,
          real_world_distance: calibration.realWorldDistance,
          unit: calibration.unit,
          calibrated_by: userProfile.id,
          calibrated_at: new Date().toISOString(),
        }, {
          onConflict: 'document_id,page_number',
        })
        .select()
        .single()

      if (error) {throw error}
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scale-calibration', data.document_id, data.page_number] })
    },
  })
}

/**
 * Get scale calibration for a document page
 */
export function useScaleCalibration(documentId: string | undefined, pageNumber: number = 1) {
  return useQuery({
    queryKey: ['scale-calibration', documentId, pageNumber],
    queryFn: async (): Promise<ScaleCalibration | null> => {
      if (!documentId) {return null}

      const { data, error } = await db
        .from('document_scale_calibrations')
        .select('*')
        .eq('document_id', documentId)
        .eq('page_number', pageNumber)
        .maybeSingle()

      if (error) {throw error}
      if (!data) {return null}

      return {
        id: data.id,
        documentId: data.document_id,
        pageNumber: data.page_number,
        pixelDistance: data.pixel_distance,
        realWorldDistance: data.real_world_distance,
        unit: data.unit,
        calibratedBy: data.calibrated_by,
        calibratedAt: data.calibrated_at,
      }
    },
    enabled: !!documentId,
  })
}

/**
 * Get comparison history between document versions
 */
export function useComparisonHistory(documentId: string | undefined) {
  return useQuery({
    queryKey: ['comparison-history', documentId],
    queryFn: async () => {
      if (!documentId) {return []}

      // This would fetch from a comparison history table if one exists
      // For now, return empty array
      return [] as VersionComparisonResult[]
    },
    enabled: !!documentId,
  })
}

export default {
  useDocumentVersionsForComparison,
  useCompareVersions,
  useCompareVersionsMutation,
  useTransferMarkups,
  useSaveScaleCalibration,
  useScaleCalibration,
  useComparisonHistory,
}

