// File: /src/features/documents/hooks/useDrawingSetManagement.ts
// Comprehensive hook for drawing set management features
// Coordinates sheet hyperlinks, revision clouds, bulk markup, and migrations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type { Document } from '@/types/database'
import type {
  SheetReference,
  ParsedDrawingReference,
  SheetBacklink,
  SheetWithLinks,
  RevisionCloud,
  RevisionHistoryEntry,
  RevisionCloudGenerationOptions,
  BulkMarkupSelection,
  BulkMarkupTarget,
  BulkMarkupApplyOptions,
  BulkMarkupApplyResult,
  BulkOperationProgress,
  MigratableMarkup,
  MarkupMigrationOptions,
  MarkupMigrationResult,
  NewRevisionDetection,
  ComparisonViewMode,
  FlickerSettings,
  EnhancedOverlaySettings,
  DrawingComparisonState,
  DrawingSetEntry,
  DrawingSetStats,
  SheetReferenceType,
} from '../types/drawing-set'
import type { ChangeRegion } from '../types/markup'

// Type assertion for database access
const db = supabase as any

// ============================================================
// DRAWING REFERENCE PARSING
// ============================================================

/**
 * Standard drawing number patterns
 * Matches formats like: A-101, A101, A-101.1, 3/A-501, Detail 3/A-501
 */
const DRAWING_REFERENCE_PATTERNS = [
  // Detail reference: "Detail 3/A-501" or "3/A-501"
  /(?:detail\s*)?(\d+)\s*\/\s*([A-Z]{1,3}[-.]?\d{2,4}(?:\.\d+)?)/gi,
  // Section reference: "Section A/A-201" or "A/A-201"
  /(?:section\s*)?([A-Z])\s*\/\s*([A-Z]{1,3}[-.]?\d{2,4}(?:\.\d+)?)/gi,
  // Simple drawing number: "See A-201" or "Refer to A-201"
  /(?:see|refer\s*to|ref\.?)\s*([A-Z]{1,3}[-.]?\d{2,4}(?:\.\d+)?)/gi,
  // Elevation reference: "Elevation 1/A-301"
  /elevation\s*(\d+)\s*\/\s*([A-Z]{1,3}[-.]?\d{2,4}(?:\.\d+)?)/gi,
  // Plan reference: "Plan A-100"
  /plan\s+([A-Z]{1,3}[-.]?\d{2,4}(?:\.\d+)?)/gi,
  // Schedule reference: "Schedule S-001"
  /schedule\s+([A-Z]{1,3}[-.]?\d{2,4}(?:\.\d+)?)/gi,
  // General drawing number pattern
  /\b([A-Z]{1,3}[-.]?\d{2,4}(?:\.\d+)?)\b/g,
]

/**
 * Parse drawing references from text content
 */
export function parseDrawingReferences(text: string): ParsedDrawingReference[] {
  const references: ParsedDrawingReference[] = []
  const seen = new Set<string>()

  // Detail references
  const detailPattern = /(?:detail\s*)?(\d+)\s*\/\s*([A-Z]{1,3}[-.]?\d{2,4}(?:\.\d+)?)/gi
  let match: RegExpExecArray | null
  while ((match = detailPattern.exec(text)) !== null) {
    const key = `detail-${match[1]}-${match[2]}`
    if (!seen.has(key)) {
      seen.add(key)
      references.push({
        fullMatch: match[0],
        drawingNumber: match[2].toUpperCase(),
        detailNumber: match[1],
        referenceType: 'detail',
      })
    }
  }

  // Section references
  const sectionPattern = /(?:section\s*)?([A-Z])\s*\/\s*([A-Z]{1,3}[-.]?\d{2,4}(?:\.\d+)?)/gi
  while ((match = sectionPattern.exec(text)) !== null) {
    const key = `section-${match[1]}-${match[2]}`
    if (!seen.has(key)) {
      seen.add(key)
      references.push({
        fullMatch: match[0],
        drawingNumber: match[2].toUpperCase(),
        sheetNumber: match[1].toUpperCase(),
        referenceType: 'section',
      })
    }
  }

  // Elevation references
  const elevationPattern = /elevation\s*(\d+)\s*\/\s*([A-Z]{1,3}[-.]?\d{2,4}(?:\.\d+)?)/gi
  while ((match = elevationPattern.exec(text)) !== null) {
    const key = `elevation-${match[1]}-${match[2]}`
    if (!seen.has(key)) {
      seen.add(key)
      references.push({
        fullMatch: match[0],
        drawingNumber: match[2].toUpperCase(),
        detailNumber: match[1],
        referenceType: 'elevation',
      })
    }
  }

  // Plan references
  const planPattern = /plan\s+([A-Z]{1,3}[-.]?\d{2,4}(?:\.\d+)?)/gi
  while ((match = planPattern.exec(text)) !== null) {
    const key = `plan-${match[1]}`
    if (!seen.has(key)) {
      seen.add(key)
      references.push({
        fullMatch: match[0],
        drawingNumber: match[1].toUpperCase(),
        referenceType: 'plan',
      })
    }
  }

  // Schedule references
  const schedulePattern = /schedule\s+([A-Z]{1,3}[-.]?\d{2,4}(?:\.\d+)?)/gi
  while ((match = schedulePattern.exec(text)) !== null) {
    const key = `schedule-${match[1]}`
    if (!seen.has(key)) {
      seen.add(key)
      references.push({
        fullMatch: match[0],
        drawingNumber: match[1].toUpperCase(),
        referenceType: 'schedule',
      })
    }
  }

  // See/Refer references
  const seePattern = /(?:see|refer\s*to|ref\.?)\s*([A-Z]{1,3}[-.]?\d{2,4}(?:\.\d+)?)/gi
  while ((match = seePattern.exec(text)) !== null) {
    const key = `general-${match[1]}`
    if (!seen.has(key)) {
      seen.add(key)
      references.push({
        fullMatch: match[0],
        drawingNumber: match[1].toUpperCase(),
        referenceType: 'general',
      })
    }
  }

  return references
}

/**
 * Determine reference type from drawing number
 */
export function getDrawingDiscipline(drawingNumber: string): string {
  const prefix = drawingNumber.replace(/[-.\d]/g, '').toUpperCase()
  const disciplineMap: Record<string, string> = {
    'A': 'Architectural',
    'S': 'Structural',
    'M': 'Mechanical',
    'P': 'Plumbing',
    'E': 'Electrical',
    'C': 'Civil',
    'L': 'Landscape',
    'FP': 'Fire Protection',
    'I': 'Interior',
    'G': 'General',
  }
  return disciplineMap[prefix] || 'General'
}

// ============================================================
// SHEET REFERENCE HOOKS
// ============================================================

/**
 * Fetch all sheet references for a document
 */
export function useSheetReferences(documentId: string | undefined) {
  return useQuery({
    queryKey: ['sheet-references', documentId],
    queryFn: async () => {
      if (!documentId) throw new Error('Document ID required')

      const { data, error } = await db
        .from('sheet_references')
        .select(`
          *,
          target_document:documents!sheet_references_target_document_id_fkey(
            id, name, drawing_number
          )
        `)
        .eq('source_document_id', documentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data || []) as SheetReference[]
    },
    enabled: !!documentId,
  })
}

/**
 * Fetch backlinks (incoming references) for a document
 */
export function useSheetBacklinks(documentId: string | undefined) {
  return useQuery({
    queryKey: ['sheet-backlinks', documentId],
    queryFn: async () => {
      if (!documentId) throw new Error('Document ID required')

      const { data, error } = await db
        .from('sheet_references')
        .select(`
          id,
          source_document_id,
          reference_text,
          reference_type,
          source_location,
          source_document:documents!sheet_references_source_document_id_fkey(
            id, name, drawing_number
          )
        `)
        .eq('target_document_id', documentId)
        .is('deleted_at', null)

      if (error) throw error

      return (data || []).map((ref: any) => ({
        id: ref.id,
        sourceDocumentId: ref.source_document_id,
        sourceDocumentName: ref.source_document?.name || 'Unknown',
        sourceDrawingNumber: ref.source_document?.drawing_number,
        referenceText: ref.reference_text,
        referenceType: ref.reference_type,
        location: ref.source_location,
      })) as SheetBacklink[]
    },
    enabled: !!documentId,
  })
}

/**
 * Create a sheet reference
 */
export function useCreateSheetReference() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (reference: Omit<SheetReference, 'id' | 'createdAt' | 'createdBy'>) => {
      if (!userProfile?.id) throw new Error('User not authenticated')

      const { data, error } = await db
        .from('sheet_references')
        .insert({
          source_document_id: reference.sourceDocumentId,
          target_document_id: reference.targetDocumentId,
          source_location: reference.sourceLocation,
          reference_text: reference.referenceText,
          reference_type: reference.referenceType,
          is_auto_detected: reference.isAutoDetected,
          confidence: reference.confidence,
          created_by: userProfile.id,
        })
        .select()
        .single()

      if (error) throw error
      return data as SheetReference
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sheet-references', data.sourceDocumentId] })
      queryClient.invalidateQueries({ queryKey: ['sheet-backlinks', data.targetDocumentId] })
    },
  })
}

/**
 * Delete a sheet reference
 */
export function useDeleteSheetReference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (referenceId: string) => {
      const { error } = await db
        .from('sheet_references')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', referenceId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheet-references'] })
      queryClient.invalidateQueries({ queryKey: ['sheet-backlinks'] })
    },
  })
}

/**
 * Auto-detect and create sheet references from document text
 */
export function useAutoDetectSheetReferences() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      sourceDocumentId,
      projectId,
      textContent,
      pageNumber = 1,
    }: {
      sourceDocumentId: string
      projectId: string
      textContent: string
      pageNumber?: number
    }) => {
      if (!userProfile?.id) throw new Error('User not authenticated')

      // Parse references from text
      const parsedRefs = parseDrawingReferences(textContent)
      if (parsedRefs.length === 0) return { created: 0, references: [] }

      // Find matching documents in the project
      const drawingNumbers = [...new Set(parsedRefs.map(r => r.drawingNumber))]
      const { data: matchingDocs, error: docError } = await supabase
        .from('documents')
        .select('id, drawing_number, name')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .in('drawing_number', drawingNumbers)

      if (docError) throw docError

      if (!matchingDocs || matchingDocs.length === 0) {
        return { created: 0, references: [] }
      }

      // Create a map of drawing number to document
      const docMap = new Map(matchingDocs.map(d => [d.drawing_number?.toUpperCase(), d]))

      // Create references for matched documents
      const referencesToCreate = parsedRefs
        .filter(ref => {
          const targetDoc = docMap.get(ref.drawingNumber)
          return targetDoc && targetDoc.id !== sourceDocumentId
        })
        .map(ref => {
          const targetDoc = docMap.get(ref.drawingNumber)!
          return {
            source_document_id: sourceDocumentId,
            target_document_id: targetDoc.id,
            source_location: { x: 0, y: 0, page: pageNumber },
            reference_text: ref.fullMatch,
            reference_type: ref.referenceType,
            is_auto_detected: true,
            confidence: 0.9,
            created_by: userProfile.id,
          }
        })

      if (referencesToCreate.length === 0) {
        return { created: 0, references: [] }
      }

      const { data, error } = await db
        .from('sheet_references')
        .insert(referencesToCreate)
        .select()

      if (error) throw error

      return { created: data?.length || 0, references: data || [] }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheet-references'] })
      queryClient.invalidateQueries({ queryKey: ['sheet-backlinks'] })
    },
  })
}

// ============================================================
// REVISION CLOUD HOOKS
// ============================================================

/**
 * Fetch revision clouds for a document
 */
export function useRevisionClouds(documentId: string | undefined) {
  return useQuery({
    queryKey: ['revision-clouds', documentId],
    queryFn: async () => {
      if (!documentId) throw new Error('Document ID required')

      const { data, error } = await db
        .from('revision_clouds')
        .select(`
          *,
          creator:users!revision_clouds_created_by_fkey(id, full_name)
        `)
        .eq('document_id', documentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map((cloud: any) => ({
        id: cloud.id,
        documentId: cloud.document_id,
        versionFrom: cloud.version_from,
        versionTo: cloud.version_to,
        region: cloud.region,
        description: cloud.description,
        revisionNumber: cloud.revision_number,
        revisionDate: cloud.revision_date,
        createdBy: cloud.created_by,
        createdAt: cloud.created_at,
        isAutoGenerated: cloud.is_auto_generated,
        pageNumber: cloud.page_number,
        linkedRfiId: cloud.linked_rfi_id,
        linkedAsiId: cloud.linked_asi_id,
        color: cloud.color,
        showMarker: cloud.show_marker,
        markerPosition: cloud.marker_position,
      })) as RevisionCloud[]
    },
    enabled: !!documentId,
  })
}

/**
 * Create a revision cloud
 */
export function useCreateRevisionCloud() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (cloud: Omit<RevisionCloud, 'id' | 'createdAt' | 'createdBy'>) => {
      if (!userProfile?.id) throw new Error('User not authenticated')

      const { data, error } = await db
        .from('revision_clouds')
        .insert({
          document_id: cloud.documentId,
          version_from: cloud.versionFrom,
          version_to: cloud.versionTo,
          region: cloud.region,
          description: cloud.description,
          revision_number: cloud.revisionNumber,
          revision_date: cloud.revisionDate,
          is_auto_generated: cloud.isAutoGenerated,
          page_number: cloud.pageNumber,
          linked_rfi_id: cloud.linkedRfiId,
          linked_asi_id: cloud.linkedAsiId,
          color: cloud.color,
          show_marker: cloud.showMarker,
          marker_position: cloud.markerPosition,
          created_by: userProfile.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['revision-clouds', data.document_id] })
    },
  })
}

/**
 * Delete a revision cloud
 */
export function useDeleteRevisionCloud() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (cloudId: string) => {
      const { error } = await db
        .from('revision_clouds')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', cloudId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revision-clouds'] })
    },
  })
}

/**
 * Generate revision clouds from change regions
 */
export function useGenerateRevisionClouds() {
  const createCloud = useCreateRevisionCloud()

  return useMutation({
    mutationFn: async ({
      documentId,
      changeRegions,
      versionFrom,
      versionTo,
      revisionNumber,
      options,
    }: {
      documentId: string
      changeRegions: ChangeRegion[]
      versionFrom: number
      versionTo: number
      revisionNumber: string
      options: RevisionCloudGenerationOptions
    }) => {
      const createdClouds: RevisionCloud[] = []

      // Filter regions by minimum size
      let filteredRegions = changeRegions.filter(
        region => region.width * region.height >= options.minRegionSize
      )

      // Optionally merge nearby regions
      if (options.mergeNearbyRegions) {
        filteredRegions = mergeNearbyRegions(filteredRegions, options.mergeDistance)
      }

      // Create a cloud for each region
      for (const region of filteredRegions) {
        const cloud = await createCloud.mutateAsync({
          documentId,
          versionFrom,
          versionTo,
          region: {
            points: [
              { x: region.x, y: region.y },
              { x: region.x + region.width, y: region.y },
              { x: region.x + region.width, y: region.y + region.height },
              { x: region.x, y: region.y + region.height },
            ],
            bounds: {
              x: region.x,
              y: region.y,
              width: region.width,
              height: region.height,
            },
          },
          description: region.description || `${region.changeType} change detected`,
          revisionNumber,
          revisionDate: new Date().toISOString(),
          isAutoGenerated: true,
          pageNumber: 1,
          color: options.defaultColor,
          showMarker: options.showMarkers,
          markerPosition: options.markerPosition,
        })
        createdClouds.push(cloud)
      }

      return createdClouds
    },
  })
}

/**
 * Helper to merge nearby change regions
 */
function mergeNearbyRegions(regions: ChangeRegion[], distance: number): ChangeRegion[] {
  if (regions.length <= 1) return regions

  const merged: ChangeRegion[] = []
  const used = new Set<string>()

  for (const region of regions) {
    if (used.has(region.id)) continue

    // Find all regions within merge distance
    const nearby = regions.filter(r => {
      if (r.id === region.id || used.has(r.id)) return false
      const dx = Math.abs((r.x + r.width / 2) - (region.x + region.width / 2))
      const dy = Math.abs((r.y + r.height / 2) - (region.y + region.height / 2))
      return dx <= distance && dy <= distance
    })

    if (nearby.length === 0) {
      merged.push(region)
      used.add(region.id)
    } else {
      // Merge all nearby regions into one
      const allRegions = [region, ...nearby]
      const minX = Math.min(...allRegions.map(r => r.x))
      const minY = Math.min(...allRegions.map(r => r.y))
      const maxX = Math.max(...allRegions.map(r => r.x + r.width))
      const maxY = Math.max(...allRegions.map(r => r.y + r.height))

      merged.push({
        ...region,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      })

      allRegions.forEach(r => used.add(r.id))
    }
  }

  return merged
}

// ============================================================
// BULK MARKUP APPLICATION HOOKS
// ============================================================

/**
 * Apply markups to multiple sheets
 */
export function useBulkApplyMarkups() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      selection,
      targets,
      options,
      onProgress,
    }: {
      selection: BulkMarkupSelection
      targets: BulkMarkupTarget[]
      options: BulkMarkupApplyOptions
      onProgress?: (progress: BulkOperationProgress) => void
    }): Promise<BulkMarkupApplyResult> => {
      if (!userProfile?.id) throw new Error('User not authenticated')

      const selectedTargets = targets.filter(t => t.selected)
      const result: BulkMarkupApplyResult = {
        success: true,
        appliedCount: 0,
        failedCount: 0,
        errors: [],
        createdMarkupIds: [],
      }

      // Fetch source markups
      const { data: sourceMarkups, error: fetchError } = await supabase
        .from('document_markups')
        .select('*')
        .in('id', selection.markupIds)
        .is('deleted_at', null)

      if (fetchError) throw fetchError
      if (!sourceMarkups || sourceMarkups.length === 0) {
        return { ...result, success: false }
      }

      // Get source document dimensions for scaling
      const { data: sourceDoc } = await supabase
        .from('documents')
        .select('*')
        .eq('id', selection.sourceDocumentId)
        .single()

      const totalOperations = selectedTargets.length * sourceMarkups.length
      let currentOperation = 0

      // Apply to each target
      for (const target of selectedTargets) {
        onProgress?.({
          current: currentOperation,
          total: totalOperations,
          currentTarget: target.documentName,
          status: 'in-progress',
        })

        try {
          // Get target document for project_id and dimensions
          const { data: targetDoc, error: targetError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', target.documentId)
            .single()

          if (targetError || !targetDoc) {
            result.errors.push({
              targetDocumentId: target.documentId,
              error: 'Target document not found',
            })
            result.failedCount += sourceMarkups.length
            continue
          }

          // Create copies of markups for this target
          const newMarkups = sourceMarkups.map(markup => {
            const adjustedData = adjustMarkupPosition(
              markup.markup_data,
              options,
              sourceDoc,
              targetDoc
            )

            return {
              document_id: target.documentId,
              project_id: targetDoc.project_id,
              page_number: target.pageNumber || markup.page_number,
              markup_type: markup.markup_type,
              markup_data: {
                ...adjustedData,
                ...(options.preserveColors ? {} : { stroke: '#FF0000' }),
                bulkAppliedFrom: selection.sourceDocumentId,
                bulkAppliedAt: new Date().toISOString(),
              },
              is_shared: markup.is_shared,
              shared_with_roles: markup.shared_with_roles,
              created_by: userProfile.id,
            }
          })

          const { data: inserted, error: insertError } = await supabase
            .from('document_markups')
            .insert(newMarkups)
            .select()

          if (insertError) {
            result.errors.push({
              targetDocumentId: target.documentId,
              error: insertError.message,
            })
            result.failedCount += sourceMarkups.length
          } else {
            result.appliedCount += inserted?.length || 0
            result.createdMarkupIds.push(...(inserted?.map(m => m.id) || []))
          }

          currentOperation += sourceMarkups.length
        } catch (err: any) {
          result.errors.push({
            targetDocumentId: target.documentId,
            error: err.message || 'Unknown error',
          })
          result.failedCount += sourceMarkups.length
        }
      }

      onProgress?.({
        current: totalOperations,
        total: totalOperations,
        status: 'completed',
      })

      result.success = result.failedCount === 0
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markups'] })
    },
  })
}

/**
 * Adjust markup position based on strategy
 */
function adjustMarkupPosition(
  markupData: any,
  options: BulkMarkupApplyOptions,
  sourceDoc: any,
  targetDoc: any
): any {
  const adjusted = { ...markupData }

  switch (options.positionStrategy) {
    case 'same-position':
      if (options.offset) {
        adjusted.x = (adjusted.x || 0) + options.offset.x
        adjusted.y = (adjusted.y || 0) + options.offset.y
      }
      break

    case 'centered':
      // Assume standard page dimensions if not available
      const targetWidth = 800
      const targetHeight = 600
      adjusted.x = targetWidth / 2
      adjusted.y = targetHeight / 2
      break

    case 'scaled':
      const scaleFactor = options.scaleFactor || 1
      adjusted.x = (adjusted.x || 0) * scaleFactor
      adjusted.y = (adjusted.y || 0) * scaleFactor
      if (adjusted.width) adjusted.width *= scaleFactor
      if (adjusted.height) adjusted.height *= scaleFactor
      if (adjusted.radius) adjusted.radius *= scaleFactor
      if (adjusted.strokeWidth) adjusted.strokeWidth *= scaleFactor
      break

    case 'relative':
      // Keep relative position as percentage
      // This would require knowing source/target dimensions
      break
  }

  return adjusted
}

// ============================================================
// MARKUP MIGRATION HOOKS
// ============================================================

/**
 * Detect new revisions with migratable markups
 */
export function useNewRevisionDetection(projectId: string | undefined) {
  return useQuery({
    queryKey: ['new-revision-detection', projectId],
    queryFn: async () => {
      if (!projectId) return []

      // Find documents that supersede others and have markups to migrate
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          name,
          version,
          supersedes_document_id,
          created_at
        `)
        .eq('project_id', projectId)
        .not('supersedes_document_id', 'is', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      if (!data || data.length === 0) return []

      // Check each for migratable markups
      const detections: NewRevisionDetection[] = []
      for (const doc of data) {
        const { count } = await supabase
          .from('document_markups')
          .select('id', { count: 'exact', head: true })
          .eq('document_id', doc.supersedes_document_id)
          .is('deleted_at', null)

        if (count && count > 0) {
          // Get previous version info
          const { data: prevDoc } = await supabase
            .from('documents')
            .select('version')
            .eq('id', doc.supersedes_document_id)
            .single()

          detections.push({
            documentId: doc.id,
            documentName: doc.name,
            newVersion: doc.version || 'Unknown',
            previousVersion: prevDoc?.version || 'Unknown',
            previousDocumentId: doc.supersedes_document_id,
            detectedAt: doc.created_at,
            hasMigratableMarkups: true,
            markupCount: count,
          })
        }
      }

      return detections
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Get migratable markups for a document
 */
export function useMigratableMarkups(
  fromDocumentId: string | undefined,
  toDocumentId: string | undefined,
  changeRegions?: ChangeRegion[]
) {
  return useQuery({
    queryKey: ['migratable-markups', fromDocumentId, toDocumentId],
    queryFn: async () => {
      if (!fromDocumentId || !toDocumentId) return []

      const { data: markups, error } = await supabase
        .from('document_markups')
        .select('*')
        .eq('document_id', fromDocumentId)
        .is('deleted_at', null)

      if (error) throw error
      if (!markups) return []

      return markups.map(markup => {
        const position = {
          x: markup.markup_data?.x || 0,
          y: markup.markup_data?.y || 0,
        }

        // Check if markup overlaps with any change region
        const overlapsChange = changeRegions?.some(region => {
          const markupBounds = {
            x: position.x,
            y: position.y,
            width: markup.markup_data?.width || 50,
            height: markup.markup_data?.height || 50,
          }
          return boundsOverlap(markupBounds, region)
        }) || false

        return {
          id: markup.id,
          markupType: markup.markup_type,
          markupData: markup.markup_data,
          pageNumber: markup.page_number || 1,
          originalPosition: position,
          suggestedPosition: overlapsChange ? undefined : position,
          status: 'pending' as const,
          overlapsChange,
          positionConfidence: overlapsChange ? 0.5 : 0.95,
        }
      }) as MigratableMarkup[]
    },
    enabled: !!fromDocumentId && !!toDocumentId,
  })
}

/**
 * Check if two rectangles overlap
 */
function boundsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  )
}

/**
 * Migrate markups to a new document version
 */
export function useMigrateMarkups() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      fromDocumentId,
      toDocumentId,
      markups,
      options,
    }: {
      fromDocumentId: string
      toDocumentId: string
      markups: MigratableMarkup[]
      options: MarkupMigrationOptions
    }): Promise<MarkupMigrationResult> => {
      if (!userProfile?.id) throw new Error('User not authenticated')

      const result: MarkupMigrationResult = {
        success: true,
        migratedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        migratedMarkups: [],
      }

      // Get target document for project_id
      const { data: targetDoc, error: targetError } = await supabase
        .from('documents')
        .select('project_id')
        .eq('id', toDocumentId)
        .single()

      if (targetError || !targetDoc) {
        throw new Error('Target document not found')
      }

      for (const markup of markups) {
        // Skip based on options
        if (markup.overlapsChange && options.skipOverlapping) {
          result.skippedCount++
          result.migratedMarkups.push({
            originalId: markup.id,
            newId: '',
            status: 'skipped',
          })
          continue
        }

        // Auto-migrate unchanged markups
        if (!markup.overlapsChange && options.autoMigrateUnchanged) {
          try {
            const newMarkup = {
              document_id: toDocumentId,
              project_id: targetDoc.project_id,
              page_number: markup.pageNumber,
              markup_type: markup.markupType,
              markup_data: {
                ...markup.markupData,
                migratedFrom: fromDocumentId,
                originalMarkupId: options.keepOriginalReference ? markup.id : undefined,
                migratedAt: new Date().toISOString(),
              },
              created_by: userProfile.id,
            }

            const { data, error } = await supabase
              .from('document_markups')
              .insert(newMarkup)
              .select()
              .single()

            if (error) throw error

            result.migratedCount++
            result.migratedMarkups.push({
              originalId: markup.id,
              newId: data.id,
              status: 'migrated',
            })
          } catch (err) {
            result.failedCount++
            result.migratedMarkups.push({
              originalId: markup.id,
              newId: '',
              status: 'failed',
            })
          }
        } else if (markup.overlapsChange && options.smartReposition) {
          // Smart repositioning for changed areas (simplified)
          const adjustedPosition = markup.suggestedPosition || markup.originalPosition

          try {
            const newMarkup = {
              document_id: toDocumentId,
              project_id: targetDoc.project_id,
              page_number: markup.pageNumber,
              markup_type: markup.markupType,
              markup_data: {
                ...markup.markupData,
                x: adjustedPosition.x,
                y: adjustedPosition.y,
                migratedFrom: fromDocumentId,
                originalMarkupId: options.keepOriginalReference ? markup.id : undefined,
                migratedAt: new Date().toISOString(),
                wasAdjusted: true,
              },
              created_by: userProfile.id,
            }

            const { data, error } = await supabase
              .from('document_markups')
              .insert(newMarkup)
              .select()
              .single()

            if (error) throw error

            result.migratedCount++
            result.migratedMarkups.push({
              originalId: markup.id,
              newId: data.id,
              status: 'adjusted',
            })
          } catch (err) {
            result.failedCount++
            result.migratedMarkups.push({
              originalId: markup.id,
              newId: '',
              status: 'failed',
            })
          }
        } else {
          result.skippedCount++
          result.migratedMarkups.push({
            originalId: markup.id,
            newId: '',
            status: 'skipped',
          })
        }
      }

      result.success = result.failedCount === 0
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markups'] })
      queryClient.invalidateQueries({ queryKey: ['migratable-markups'] })
    },
  })
}

// ============================================================
// DRAWING COMPARISON STATE HOOK
// ============================================================

/**
 * Hook to manage drawing comparison state with all view modes
 */
export function useDrawingComparisonState() {
  const [state, setState] = useState<DrawingComparisonState>({
    viewMode: 'side-by-side',
    flickerSettings: {
      interval: 500,
      isActive: false,
      currentVersion: 1,
    },
    overlaySettings: {
      opacity1: 50,
      opacity2: 50,
      blendMode: 'difference',
      showChangeHighlights: true,
      changeHighlightColor: '#FFD700',
      changeHighlightOpacity: 70,
      useTinting: false,
      tint1: '#FF0000',
      tint2: '#00FF00',
    },
    syncedView: {
      zoom: 100,
      position: { x: 0, y: 0 },
      pageNumber: 1,
      syncEnabled: true,
    },
    differenceColors: {
      added: '#00CC66',
      removed: '#FF0000',
      modified: '#FFD700',
      opacity: 70,
    },
    showChangeList: false,
  })

  // Flicker animation effect
  const flickerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (state.viewMode === 'flicker' && state.flickerSettings.isActive) {
      flickerIntervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          flickerSettings: {
            ...prev.flickerSettings,
            currentVersion: prev.flickerSettings.currentVersion === 1 ? 2 : 1,
          },
        }))
      }, state.flickerSettings.interval)
    }

    return () => {
      if (flickerIntervalRef.current) {
        clearInterval(flickerIntervalRef.current)
      }
    }
  }, [state.viewMode, state.flickerSettings.isActive, state.flickerSettings.interval])

  const setViewMode = useCallback((mode: ComparisonViewMode) => {
    setState(prev => ({
      ...prev,
      viewMode: mode,
      flickerSettings: {
        ...prev.flickerSettings,
        isActive: mode === 'flicker',
      },
    }))
  }, [])

  const toggleFlicker = useCallback(() => {
    setState(prev => ({
      ...prev,
      flickerSettings: {
        ...prev.flickerSettings,
        isActive: !prev.flickerSettings.isActive,
      },
    }))
  }, [])

  const setFlickerInterval = useCallback((interval: number) => {
    setState(prev => ({
      ...prev,
      flickerSettings: {
        ...prev.flickerSettings,
        interval,
      },
    }))
  }, [])

  const setOverlayOpacity = useCallback((version: 1 | 2, opacity: number) => {
    setState(prev => ({
      ...prev,
      overlaySettings: {
        ...prev.overlaySettings,
        [version === 1 ? 'opacity1' : 'opacity2']: opacity,
      },
    }))
  }, [])

  const setBlendMode = useCallback((blendMode: EnhancedOverlaySettings['blendMode']) => {
    setState(prev => ({
      ...prev,
      overlaySettings: {
        ...prev.overlaySettings,
        blendMode,
      },
    }))
  }, [])

  const setZoom = useCallback((zoom: number) => {
    setState(prev => ({
      ...prev,
      syncedView: {
        ...prev.syncedView,
        zoom: Math.max(25, Math.min(300, zoom)),
      },
    }))
  }, [])

  const setPan = useCallback((position: { x: number; y: number }) => {
    setState(prev => ({
      ...prev,
      syncedView: {
        ...prev.syncedView,
        position,
      },
    }))
  }, [])

  const setPage = useCallback((pageNumber: number) => {
    setState(prev => ({
      ...prev,
      syncedView: {
        ...prev.syncedView,
        pageNumber,
      },
    }))
  }, [])

  const toggleSync = useCallback(() => {
    setState(prev => ({
      ...prev,
      syncedView: {
        ...prev.syncedView,
        syncEnabled: !prev.syncedView.syncEnabled,
      },
    }))
  }, [])

  const selectChangeRegion = useCallback((region: ChangeRegion | undefined) => {
    setState(prev => ({
      ...prev,
      selectedChangeRegion: region,
    }))
  }, [])

  const toggleChangeList = useCallback(() => {
    setState(prev => ({
      ...prev,
      showChangeList: !prev.showChangeList,
    }))
  }, [])

  const resetView = useCallback(() => {
    setState(prev => ({
      ...prev,
      syncedView: {
        zoom: 100,
        position: { x: 0, y: 0 },
        pageNumber: 1,
        syncEnabled: true,
      },
    }))
  }, [])

  const setOverlaySettings = useCallback((settings: EnhancedOverlaySettings) => {
    setState(prev => ({
      ...prev,
      overlaySettings: settings,
    }))
  }, [])

  const setDifferenceColors = useCallback((colors: DrawingComparisonState['differenceColors']) => {
    setState(prev => ({
      ...prev,
      differenceColors: colors,
    }))
  }, [])

  const toggleTinting = useCallback(() => {
    setState(prev => ({
      ...prev,
      overlaySettings: {
        ...prev.overlaySettings,
        useTinting: !prev.overlaySettings.useTinting,
      },
    }))
  }, [])

  const setTintColors = useCallback((tint1: string, tint2: string) => {
    setState(prev => ({
      ...prev,
      overlaySettings: {
        ...prev.overlaySettings,
        tint1,
        tint2,
      },
    }))
  }, [])

  return {
    state,
    setViewMode,
    toggleFlicker,
    setFlickerInterval,
    setOverlayOpacity,
    setBlendMode,
    setZoom,
    setPan,
    setPage,
    toggleSync,
    selectChangeRegion,
    toggleChangeList,
    resetView,
    setOverlaySettings,
    setDifferenceColors,
    toggleTinting,
    setTintColors,
  }
}

// ============================================================
// DRAWING SET INDEX HOOKS
// ============================================================

/**
 * Fetch drawing set index for a project
 */
export function useDrawingSetIndex(projectId: string | undefined) {
  return useQuery({
    queryKey: ['drawing-set-index', projectId],
    queryFn: async () => {
      if (!projectId) return []

      // Get all drawings in the project
      const { data: documents, error } = await supabase
        .from('documents')
        .select(`
          id,
          name,
          drawing_number,
          discipline,
          revision,
          issue_date
        `)
        .eq('project_id', projectId)
        .eq('document_type', 'drawing')
        .is('deleted_at', null)
        .order('drawing_number', { ascending: true })

      if (error) throw error
      if (!documents) return []

      // Get link counts and markup info
      const entries: DrawingSetEntry[] = await Promise.all(
        documents.map(async (doc) => {
          // Count outgoing links
          const { count: outgoing } = await db
            .from('sheet_references')
            .select('id', { count: 'exact', head: true })
            .eq('source_document_id', doc.id)
            .is('deleted_at', null)

          // Count incoming links
          const { count: incoming } = await db
            .from('sheet_references')
            .select('id', { count: 'exact', head: true })
            .eq('target_document_id', doc.id)
            .is('deleted_at', null)

          // Count markups
          const { count: markupCount } = await supabase
            .from('document_markups')
            .select('id', { count: 'exact', head: true })
            .eq('document_id', doc.id)
            .is('deleted_at', null)

          // Count revision clouds
          const { count: cloudCount } = await db
            .from('revision_clouds')
            .select('id', { count: 'exact', head: true })
            .eq('document_id', doc.id)
            .is('deleted_at', null)

          return {
            documentId: doc.id,
            drawingNumber: doc.drawing_number || doc.name,
            sheetTitle: doc.name,
            discipline: doc.discipline || getDrawingDiscipline(doc.drawing_number || ''),
            currentRevision: doc.revision || '0',
            revisionDate: doc.issue_date || '',
            outgoingLinkCount: outgoing || 0,
            incomingLinkCount: incoming || 0,
            hasMarkups: (markupCount || 0) > 0,
            revisionCloudCount: cloudCount || 0,
          }
        })
      )

      return entries
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Get drawing set statistics
 */
export function useDrawingSetStats(projectId: string | undefined) {
  const { data: index } = useDrawingSetIndex(projectId)

  return useMemo(() => {
    if (!index || index.length === 0) {
      return {
        totalSheets: 0,
        totalRevisionClouds: 0,
        totalHyperlinks: 0,
        sheetsWithMarkups: 0,
        disciplineBreakdown: {},
        lastUpdated: new Date().toISOString(),
      } as DrawingSetStats
    }

    const disciplineBreakdown: Record<string, number> = {}
    let totalClouds = 0
    let totalLinks = 0
    let sheetsWithMarkups = 0

    for (const entry of index) {
      disciplineBreakdown[entry.discipline] = (disciplineBreakdown[entry.discipline] || 0) + 1
      totalClouds += entry.revisionCloudCount
      totalLinks += entry.outgoingLinkCount + entry.incomingLinkCount
      if (entry.hasMarkups) sheetsWithMarkups++
    }

    return {
      totalSheets: index.length,
      totalRevisionClouds: totalClouds,
      totalHyperlinks: totalLinks / 2, // Each link is counted twice (outgoing + incoming)
      sheetsWithMarkups,
      disciplineBreakdown,
      lastUpdated: new Date().toISOString(),
    } as DrawingSetStats
  }, [index])
}

// Export default object with all hooks
export default {
  // Parsing utilities
  parseDrawingReferences,
  getDrawingDiscipline,
  // Sheet reference hooks
  useSheetReferences,
  useSheetBacklinks,
  useCreateSheetReference,
  useDeleteSheetReference,
  useAutoDetectSheetReferences,
  // Revision cloud hooks
  useRevisionClouds,
  useCreateRevisionCloud,
  useDeleteRevisionCloud,
  useGenerateRevisionClouds,
  // Bulk markup hooks
  useBulkApplyMarkups,
  // Migration hooks
  useNewRevisionDetection,
  useMigratableMarkups,
  useMigrateMarkups,
  // Comparison state
  useDrawingComparisonState,
  // Index hooks
  useDrawingSetIndex,
  useDrawingSetStats,
}
