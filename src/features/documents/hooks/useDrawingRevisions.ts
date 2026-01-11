/**
 * Hooks for drawing revisions and transmittals
 * Leverages migration 062_document_revisions.sql
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'

// =============================================
// Types
// =============================================

export interface DrawingDocument {
  id: string
  project_id: string
  title: string
  drawing_number: string | null
  sheet_number: string | null
  drawing_discipline: string | null
  drawing_title: string | null
  scale: string | null
  revision_number: number
  revision_letter: string | null
  revision_date: string | null
  is_current_revision: boolean
  previous_revision_id: string | null
  document_set: string | null
  issue_date: string | null
  received_date: string | null
  asi_number: string | null
  asi_date: string | null
  affected_by_asi: boolean
  file_url: string | null
  file_name: string | null
  created_at: string
}

export interface DocumentRevision {
  id: string
  document_id: string
  revision_number: number
  revision_letter: string | null
  revision_date: string
  file_url: string
  file_name: string | null
  file_size: number | null
  thumbnail_url: string | null
  description: string | null
  changes_summary: string | null
  clouded_areas: string[] | null
  asi_number: string | null
  status: 'draft' | 'issued' | 'superseded' | 'void'
  issued_by: string | null
  issued_by_firm: string | null
  received_by: string | null
  received_date: string | null
  created_at: string
  created_by: string | null
}

export interface DocumentTransmittal {
  id: string
  project_id: string
  company_id: string
  transmittal_number: string
  from_company: string | null
  from_contact: string | null
  to_company: string | null
  to_contact: string | null
  cc_contacts: string[] | null
  date_sent: string
  date_required: string | null
  transmitted_for: string | null
  remarks: string | null
  status: 'draft' | 'sent' | 'acknowledged' | 'returned'
  acknowledged_date: string | null
  acknowledged_by: string | null
  created_at: string
  created_by: string | null
  items?: TransmittalItem[]
}

export interface TransmittalItem {
  id: string
  transmittal_id: string
  document_id: string | null
  document_revision_id: string | null
  drawing_number: string | null
  title: string | null
  revision: string | null
  copies: number
  notes: string | null
}

// Drawing discipline labels
export const DRAWING_DISCIPLINES: Record<string, string> = {
  'G': 'General',
  'A': 'Architectural',
  'S': 'Structural',
  'M': 'Mechanical',
  'P': 'Plumbing',
  'E': 'Electrical',
  'C': 'Civil',
  'L': 'Landscape',
  'I': 'Interiors',
  'F': 'Fire Protection',
  'T': 'Technology',
}

// Common document sets
export const DOCUMENT_SETS = [
  'Bid Set',
  'Permit Set',
  'Issued for Construction',
  'Issued for Review',
  'Addendum',
  'Bulletin',
  'As-Built',
  'Record Documents',
]

// =============================================
// Drawing Register Hook
// =============================================

/**
 * Fetch drawing register for a project (drawings with drawing_number)
 */
export function useDrawingRegister(projectId: string | undefined) {
  return useQuery({
    queryKey: ['drawing-register', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .not('drawing_number', 'is', null)
        .eq('is_current_revision', true)
        .is('deleted_at', null)
        .order('drawing_discipline', { ascending: true })
        .order('drawing_number', { ascending: true })

      if (error) {throw error}
      return data as DrawingDocument[]
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch all revisions for a drawing (including superseded)
 */
export function useDrawingRevisionHistory(drawingNumber: string | undefined, projectId: string | undefined) {
  return useQuery({
    queryKey: ['drawing-revisions', projectId, drawingNumber],
    queryFn: async () => {
      if (!projectId || !drawingNumber) {throw new Error('Project ID and drawing number required')}

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .eq('drawing_number', drawingNumber)
        .is('deleted_at', null)
        .order('revision_number', { ascending: false })

      if (error) {throw error}
      return data as DrawingDocument[]
    },
    enabled: !!projectId && !!drawingNumber,
  })
}

// =============================================
// Document Revisions Hook
// =============================================

/**
 * Fetch revisions from document_revisions table
 */
export function useDocumentRevisions(documentId: string | undefined) {
  return useQuery({
    queryKey: ['document-revisions', documentId],
    queryFn: async () => {
      if (!documentId) {throw new Error('Document ID required')}

      const { data, error } = await supabase
        .from('document_revisions')
        .select('*')
        .eq('document_id', documentId)
        .order('revision_number', { ascending: false })

      if (error) {throw error}
      return data as DocumentRevision[]
    },
    enabled: !!documentId,
  })
}

/**
 * Create a new document revision
 */
export function useCreateDocumentRevision() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      documentId,
      fileUrl,
      fileName,
      revisionLetter,
      description,
      changesSummary,
      asiNumber,
    }: {
      documentId: string
      fileUrl: string
      fileName?: string
      revisionLetter?: string
      description?: string
      changesSummary?: string
      asiNumber?: string
    }) => {
      // Use the database function to create revision
      const { data, error } = await supabase.rpc('create_document_revision', {
        p_document_id: documentId,
        p_file_url: fileUrl,
        p_file_name: fileName || null,
        p_revision_letter: revisionLetter || null,
        p_description: description || null,
        p_changes_summary: changesSummary || null,
        p_asi_number: asiNumber || null,
      })

      if (error) {throw error}
      return data as string // Returns new revision ID
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-revisions', variables.documentId] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['drawing-register'] })
    },
  })
}

// =============================================
// Transmittals Hooks
// =============================================

/**
 * Fetch transmittals for a project
 */
export function useTransmittals(projectId: string | undefined) {
  return useQuery({
    queryKey: ['transmittals', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      const { data, error } = await supabase
        .from('document_transmittals')
        .select(`
          *,
          items:document_transmittal_items(*)
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('date_sent', { ascending: false })

      if (error) {throw error}
      return data as DocumentTransmittal[]
    },
    enabled: !!projectId,
  })
}

/**
 * Get a single transmittal with items
 */
export function useTransmittal(transmittalId: string | undefined) {
  return useQuery({
    queryKey: ['transmittals', transmittalId],
    queryFn: async () => {
      if (!transmittalId) {throw new Error('Transmittal ID required')}

      const { data, error } = await supabase
        .from('document_transmittals')
        .select(`
          *,
          items:document_transmittal_items(
            *,
            document:documents(*),
            revision:document_revisions(*)
          )
        `)
        .eq('id', transmittalId)
        .single()

      if (error) {throw error}
      return data as DocumentTransmittal
    },
    enabled: !!transmittalId,
  })
}

/**
 * Create a new transmittal
 */
export function useCreateTransmittal() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      projectId,
      toCompany,
      toContact,
      transmittedFor,
      remarks,
      items,
    }: {
      projectId: string
      toCompany: string
      toContact?: string
      transmittedFor?: string
      remarks?: string
      items: Array<{
        documentId?: string
        revisionId?: string
        drawingNumber?: string
        title?: string
        revision?: string
        copies?: number
        notes?: string
      }>
    }) => {
      if (!userProfile?.company_id) {throw new Error('User company not found')}

      // Get next transmittal number
      const { data: transmittalNumber, error: numError } = await supabase.rpc(
        'get_next_transmittal_number',
        { p_project_id: projectId }
      )

      if (numError) {throw numError}

      // Create transmittal
      const { data: transmittal, error: transmittalError } = await supabase
        .from('document_transmittals')
        .insert({
          project_id: projectId,
          company_id: userProfile.company_id,
          transmittal_number: transmittalNumber,
          to_company: toCompany,
          to_contact: toContact,
          transmitted_for: transmittedFor,
          remarks: remarks,
          created_by: userProfile.id,
        })
        .select()
        .single()

      if (transmittalError) {throw transmittalError}

      // Add items
      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('document_transmittal_items')
          .insert(
            items.map((item) => ({
              transmittal_id: transmittal.id,
              document_id: item.documentId,
              document_revision_id: item.revisionId,
              drawing_number: item.drawingNumber,
              title: item.title,
              revision: item.revision,
              copies: item.copies || 1,
              notes: item.notes,
            }))
          )

        if (itemsError) {throw itemsError}
      }

      return transmittal as DocumentTransmittal
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transmittals', data.project_id] })
    },
  })
}

/**
 * Update transmittal status (acknowledge, return)
 */
export function useUpdateTransmittalStatus() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      transmittalId,
      status,
    }: {
      transmittalId: string
      status: 'acknowledged' | 'returned'
    }) => {
      const updateData: Record<string, any> = { status }

      if (status === 'acknowledged') {
        updateData.acknowledged_date = new Date().toISOString().split('T')[0]
        updateData.acknowledged_by = userProfile?.id
      }

      const { data, error } = await supabase
        .from('document_transmittals')
        .update(updateData)
        .eq('id', transmittalId)
        .select()
        .single()

      if (error) {throw error}
      return data as DocumentTransmittal
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transmittals'] })
      queryClient.invalidateQueries({ queryKey: ['transmittals', data.id] })
    },
  })
}

// =============================================
// ASI (Architect's Supplemental Instruction) Hooks
// =============================================

/**
 * Get drawings affected by a specific ASI
 */
export function useDrawingsAffectedByASI(asiNumber: string | undefined, projectId: string | undefined) {
  return useQuery({
    queryKey: ['drawings-by-asi', projectId, asiNumber],
    queryFn: async () => {
      if (!projectId || !asiNumber) {throw new Error('Project ID and ASI number required')}

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .eq('asi_number', asiNumber)
        .is('deleted_at', null)
        .order('drawing_number', { ascending: true })

      if (error) {throw error}
      return data as DrawingDocument[]
    },
    enabled: !!projectId && !!asiNumber,
  })
}

/**
 * Get list of unique ASI numbers for a project
 */
export function useProjectASIs(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-asis', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      const { data, error } = await supabase
        .from('documents')
        .select('asi_number, asi_date')
        .eq('project_id', projectId)
        .not('asi_number', 'is', null)
        .is('deleted_at', null)

      if (error) {throw error}

      // Get unique ASI numbers with dates
      const asiMap = new Map<string, string>()
      data.forEach((doc) => {
        if (doc.asi_number && !asiMap.has(doc.asi_number)) {
          asiMap.set(doc.asi_number, doc.asi_date || '')
        }
      })

      return Array.from(asiMap.entries())
        .map(([number, date]) => ({ asi_number: number, asi_date: date }))
        .sort((a, b) => a.asi_number.localeCompare(b.asi_number))
    },
    enabled: !!projectId,
  })
}

// =============================================
// Revision Comparison Hooks
// =============================================

export interface RevisionComparison {
  oldRevision: DocumentRevision
  newRevision: DocumentRevision
  changes: {
    field: string
    oldValue: string | number | null
    newValue: string | number | null
  }[]
}

/**
 * Compare two document revisions
 */
export function useCompareRevisions(
  documentId: string | undefined,
  oldRevisionId: string | undefined,
  newRevisionId: string | undefined
) {
  return useQuery({
    queryKey: ['revision-comparison', documentId, oldRevisionId, newRevisionId],
    queryFn: async () => {
      if (!documentId || !oldRevisionId || !newRevisionId) {
        throw new Error('Document ID and both revision IDs required')
      }

      // Fetch both revisions
      const { data: revisions, error } = await supabase
        .from('document_revisions')
        .select('*')
        .eq('document_id', documentId)
        .in('id', [oldRevisionId, newRevisionId])

      if (error) {throw error}
      if (!revisions || revisions.length !== 2) {
        throw new Error('Could not find both revisions')
      }

      const oldRevision = revisions.find((r) => r.id === oldRevisionId) as DocumentRevision
      const newRevision = revisions.find((r) => r.id === newRevisionId) as DocumentRevision

      // Compare fields
      const fieldsToCompare: (keyof DocumentRevision)[] = [
        'revision_number',
        'revision_letter',
        'revision_date',
        'description',
        'changes_summary',
        'asi_number',
        'status',
        'issued_by',
        'issued_by_firm',
      ]

      const changes = fieldsToCompare
        .filter((field) => oldRevision[field] !== newRevision[field])
        .map((field) => ({
          field,
          oldValue: oldRevision[field] as string | number | null,
          newValue: newRevision[field] as string | number | null,
        }))

      return {
        oldRevision,
        newRevision,
        changes,
      } as RevisionComparison
    },
    enabled: !!documentId && !!oldRevisionId && !!newRevisionId,
  })
}

/**
 * Get revision statistics for a document
 */
export function useRevisionStats(documentId: string | undefined) {
  return useQuery({
    queryKey: ['revision-stats', documentId],
    queryFn: async () => {
      if (!documentId) {throw new Error('Document ID required')}

      const { data: revisions, error } = await supabase
        .from('document_revisions')
        .select('id, revision_number, revision_date, status, created_at')
        .eq('document_id', documentId)
        .order('revision_number', { ascending: true })

      if (error) {throw error}

      const totalRevisions = revisions.length
      const currentRevision = revisions[revisions.length - 1]
      const firstRevision = revisions[0]

      // Calculate average time between revisions
      let avgDaysBetweenRevisions = 0
      if (revisions.length > 1) {
        const totalDays = revisions.slice(1).reduce((acc, rev, idx) => {
          const prevDate = new Date(revisions[idx].created_at)
          const currDate = new Date(rev.created_at)
          return acc + (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        }, 0)
        avgDaysBetweenRevisions = Math.round(totalDays / (revisions.length - 1))
      }

      // Count revisions by status
      const statusCounts = revisions.reduce(
        (acc, rev) => {
          acc[rev.status] = (acc[rev.status] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      return {
        totalRevisions,
        currentRevisionNumber: currentRevision?.revision_number || 0,
        firstRevisionDate: firstRevision?.revision_date || firstRevision?.created_at,
        latestRevisionDate: currentRevision?.revision_date || currentRevision?.created_at,
        avgDaysBetweenRevisions,
        statusCounts,
      }
    },
    enabled: !!documentId,
  })
}

/**
 * Bulk create revisions for multiple documents
 */
export function useBulkCreateRevisions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      revisions,
    }: {
      revisions: Array<{
        documentId: string
        fileUrl: string
        fileName?: string
        revisionLetter?: string
        description?: string
        changesSummary?: string
        asiNumber?: string
      }>
    }) => {
      const results: string[] = []

      for (const revision of revisions) {
        const { data, error } = await supabase.rpc('create_document_revision', {
          p_document_id: revision.documentId,
          p_file_url: revision.fileUrl,
          p_file_name: revision.fileName || null,
          p_revision_letter: revision.revisionLetter || null,
          p_description: revision.description || null,
          p_changes_summary: revision.changesSummary || null,
          p_asi_number: revision.asiNumber || null,
        })

        if (error) {throw error}
        results.push(data as string)
      }

      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-revisions'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['drawing-register'] })
    },
  })
}
