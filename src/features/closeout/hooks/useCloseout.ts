/**
 * Closeout Hooks
 *
 * React Query hooks for closeout documents and warranties.
 * Provides data fetching, mutations, and statistics.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseUntyped as supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type {
  CloseoutDocument,
  CloseoutDocumentWithDetails,
  Warranty,
  WarrantyWithDetails,
  CloseoutStatistics,
  WarrantyStatistics,
  CloseoutChecklistItem,
  CloseoutChecklistItemWithDetails,
  CreateCloseoutDocumentDTO,
  UpdateCloseoutDocumentDTO,
  CreateWarrantyDTO,
  UpdateWarrantyDTO,
  CreateCloseoutChecklistItemDTO,
  CloseoutStatus,
  CloseoutDocumentType,
  WarrantyStatus,
  WarrantyType,
} from '@/types/closeout'

// Database row types for untyped Supabase client
type DbCloseoutDocument = {
  id: string
  project_id: string
  status: CloseoutStatus
  document_type: CloseoutDocumentType
  required?: boolean
  project?: { id: string; name: string; number?: string }
  subcontractor?: { id: string; company_name?: string; first_name?: string; last_name?: string }
  [key: string]: unknown
}

type DbWarranty = {
  id: string
  project_id: string
  status: WarrantyStatus
  warranty_type?: WarrantyType
  end_date: string
  project?: { id: string; name: string }
  subcontractor?: { id: string; company_name?: string }
  [key: string]: unknown
}

// =============================================
// Query Keys
// =============================================

export const closeoutKeys = {
  all: ['closeout'] as const,
  documents: (projectId?: string) => [...closeoutKeys.all, 'documents', projectId] as const,
  document: (id: string) => [...closeoutKeys.all, 'document', id] as const,
  warranties: (projectId?: string) => [...closeoutKeys.all, 'warranties', projectId] as const,
  warranty: (id: string) => [...closeoutKeys.all, 'warranty', id] as const,
  checklist: (projectId: string) => [...closeoutKeys.all, 'checklist', projectId] as const,
  documentStats: (projectId?: string) => [...closeoutKeys.all, 'documentStats', projectId] as const,
  warrantyStats: (projectId?: string) => [...closeoutKeys.all, 'warrantyStats', projectId] as const,
}

// =============================================
// Document Hooks
// =============================================

/**
 * Fetch closeout documents for a project
 */
export function useCloseoutDocuments(projectId?: string) {
  return useQuery({
    queryKey: closeoutKeys.documents(projectId),
    queryFn: async () => {
      let query = supabase
        .from('closeout_documents')
        .select(`
          *,
          project:projects(id, name, number),
          subcontractor:contacts!closeout_documents_subcontractor_id_fkey(id, company_name, first_name, last_name)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) {throw error}

      // Transform the data to match CloseoutDocumentWithDetails
      return (data || []).map((doc: DbCloseoutDocument) => ({
        ...doc,
        project: doc.project ? {
          id: doc.project.id,
          name: doc.project.name,
          number: doc.project.number ?? null,
        } : undefined,
        subcontractor: doc.subcontractor ? {
          id: doc.subcontractor.id,
          company_name: doc.subcontractor.company_name || `${doc.subcontractor.first_name} ${doc.subcontractor.last_name}`,
          contact_name: doc.subcontractor.first_name ? `${doc.subcontractor.first_name} ${doc.subcontractor.last_name}` : null,
        } : undefined,
      } as CloseoutDocumentWithDetails))
    },
    enabled: true,
  })
}

/**
 * Fetch a single closeout document by ID
 */
export function useCloseoutDocument(documentId?: string) {
  return useQuery({
    queryKey: closeoutKeys.document(documentId || ''),
    queryFn: async () => {
      if (!documentId) {throw new Error('Document ID required')}

      const { data, error } = await supabase
        .from('closeout_documents')
        .select(`
          *,
          project:projects(id, name, number),
          subcontractor:contacts!closeout_documents_subcontractor_id_fkey(id, company_name, first_name, last_name)
        `)
        .eq('id', documentId)
        .single()

      if (error) {throw error}
      return data as CloseoutDocumentWithDetails
    },
    enabled: !!documentId,
  })
}

/**
 * Create a new closeout document
 */
export function useCreateCloseoutDocument() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateCloseoutDocumentDTO) => {
      const { data, error } = await supabase
        .from('closeout_documents')
        .insert({
          company_id: userProfile?.company_id,
          project_id: input.project_id,
          document_type: input.document_type,
          title: input.title,
          description: input.description || null,
          spec_section: input.spec_section || null,
          spec_section_title: input.spec_section_title || null,
          subcontractor_id: input.subcontractor_id || null,
          responsible_party: input.responsible_party || null,
          required: input.required ?? true,
          required_copies: input.required_copies ?? 1,
          format_required: input.format_required || null,
          required_date: input.required_date || null,
          notes: input.notes || null,
          status: 'pending',
          created_by: userProfile?.id,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as CloseoutDocument
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: closeoutKeys.documents(data.project_id) })
      queryClient.invalidateQueries({ queryKey: closeoutKeys.documentStats(data.project_id) })
    },
  })
}

/**
 * Update a closeout document
 */
export function useUpdateCloseoutDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateCloseoutDocumentDTO & { id: string }) => {
      const updateData: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() }

      // Set timestamps based on status changes
      if (updates.status === 'submitted' && !updates.document_url) {
        updateData.submitted_date = new Date().toISOString()
      }
      if (updates.status === 'approved') {
        updateData.approved_date = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('closeout_documents')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as CloseoutDocument
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: closeoutKeys.document(data.id) })
      queryClient.invalidateQueries({ queryKey: closeoutKeys.documents(data.project_id) })
      queryClient.invalidateQueries({ queryKey: closeoutKeys.documentStats(data.project_id) })
    },
  })
}

/**
 * Delete (soft) a closeout document
 */
export function useDeleteCloseoutDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('closeout_documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: closeoutKeys.all })
    },
  })
}

// =============================================
// Warranty Hooks
// =============================================

/**
 * Fetch warranties for a project
 */
export function useWarranties(projectId?: string) {
  return useQuery({
    queryKey: closeoutKeys.warranties(projectId),
    queryFn: async () => {
      let query = supabase
        .from('warranties')
        .select(`
          *,
          project:projects(id, name),
          subcontractor:contacts!warranties_subcontractor_id_fkey(id, company_name)
        `)
        .is('deleted_at', null)
        .order('end_date', { ascending: true })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) {throw error}

      // Calculate expiration info for each warranty
      const today = new Date()
      return (data || []).map((warranty: DbWarranty) => {
        const endDate = new Date(warranty.end_date)
        const daysUntilExpiration = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        return {
          ...warranty,
          project: warranty.project ? {
            id: warranty.project.id,
            name: warranty.project.name,
          } : undefined,
          subcontractor: warranty.subcontractor ? {
            id: warranty.subcontractor.id,
            company_name: warranty.subcontractor.company_name || '',
          } : undefined,
          days_until_expiration: daysUntilExpiration,
          is_expiring_soon: warranty.status === 'active' && daysUntilExpiration <= 90 && daysUntilExpiration > 0,
        } as WarrantyWithDetails
      })
    },
    enabled: true,
  })
}

/**
 * Fetch a single warranty by ID
 */
export function useWarranty(warrantyId?: string) {
  return useQuery({
    queryKey: closeoutKeys.warranty(warrantyId || ''),
    queryFn: async () => {
      if (!warrantyId) {throw new Error('Warranty ID required')}

      const { data, error } = await supabase
        .from('warranties')
        .select(`
          *,
          project:projects(id, name),
          subcontractor:contacts!warranties_subcontractor_id_fkey(id, company_name)
        `)
        .eq('id', warrantyId)
        .single()

      if (error) {throw error}
      return data as WarrantyWithDetails
    },
    enabled: !!warrantyId,
  })
}

/**
 * Create a new warranty
 */
export function useCreateWarranty() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateWarrantyDTO) => {
      const { data, error } = await supabase
        .from('warranties')
        .insert({
          company_id: userProfile?.company_id,
          project_id: input.project_id,
          title: input.title,
          description: input.description || null,
          spec_section: input.spec_section || null,
          subcontractor_id: input.subcontractor_id || null,
          manufacturer_name: input.manufacturer_name || null,
          manufacturer_contact: input.manufacturer_contact || null,
          manufacturer_phone: input.manufacturer_phone || null,
          manufacturer_email: input.manufacturer_email || null,
          warranty_type: input.warranty_type || null,
          coverage_description: input.coverage_description || null,
          start_date: input.start_date,
          end_date: input.end_date,
          duration_years: input.duration_years || null,
          document_url: input.document_url || null,
          notification_days: input.notification_days || [90, 60, 30, 7],
          notes: input.notes || null,
          status: 'active',
        })
        .select()
        .single()

      if (error) {throw error}
      return data as Warranty
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: closeoutKeys.warranties(data.project_id) })
      queryClient.invalidateQueries({ queryKey: closeoutKeys.warrantyStats(data.project_id) })
    },
  })
}

/**
 * Update a warranty
 */
export function useUpdateWarranty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateWarrantyDTO & { id: string }) => {
      const { data, error } = await supabase
        .from('warranties')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as Warranty
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: closeoutKeys.warranty(data.id) })
      queryClient.invalidateQueries({ queryKey: closeoutKeys.warranties(data.project_id) })
      queryClient.invalidateQueries({ queryKey: closeoutKeys.warrantyStats(data.project_id) })
    },
  })
}

/**
 * Delete (soft) a warranty
 */
export function useDeleteWarranty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('warranties')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: closeoutKeys.all })
    },
  })
}

// =============================================
// Statistics Hooks
// =============================================

/**
 * Calculate closeout document statistics
 */
export function useCloseoutStatistics(projectId?: string) {
  const { data: documents } = useCloseoutDocuments(projectId)

  return useQuery({
    queryKey: closeoutKeys.documentStats(projectId),
    queryFn: async (): Promise<CloseoutStatistics> => {
      if (!documents) {
        return {
          total_documents: 0,
          by_status: {} as Record<CloseoutStatus, number>,
          by_type: {} as Record<CloseoutDocumentType, number>,
          required_count: 0,
          approved_count: 0,
          pending_count: 0,
          rejected_count: 0,
          completion_percentage: 0,
        }
      }

      const byStatus = documents.reduce((acc: Record<CloseoutStatus, number>, doc: CloseoutDocumentWithDetails) => {
        acc[doc.status] = (acc[doc.status] || 0) + 1
        return acc
      }, {} as Record<CloseoutStatus, number>)

      const byType = documents.reduce((acc: Record<CloseoutDocumentType, number>, doc: CloseoutDocumentWithDetails) => {
        acc[doc.document_type] = (acc[doc.document_type] || 0) + 1
        return acc
      }, {} as Record<CloseoutDocumentType, number>)

      const requiredDocs = documents.filter((d: CloseoutDocumentWithDetails) => d.required)
      const approvedRequired = requiredDocs.filter((d: CloseoutDocumentWithDetails) => d.status === 'approved').length

      return {
        total_documents: documents.length,
        by_status: byStatus,
        by_type: byType,
        required_count: requiredDocs.length,
        approved_count: byStatus['approved'] || 0,
        pending_count: (byStatus['pending'] || 0) + (byStatus['submitted'] || 0) + (byStatus['under_review'] || 0),
        rejected_count: byStatus['rejected'] || 0,
        completion_percentage: requiredDocs.length > 0 ? Math.round((approvedRequired / requiredDocs.length) * 100) : 0,
      }
    },
    enabled: !!documents,
  })
}

/**
 * Calculate warranty statistics
 */
export function useWarrantyStatistics(projectId?: string) {
  const { data: warranties } = useWarranties(projectId)

  return useQuery({
    queryKey: closeoutKeys.warrantyStats(projectId),
    queryFn: async (): Promise<WarrantyStatistics> => {
      if (!warranties) {
        return {
          total_warranties: 0,
          active_count: 0,
          expiring_soon_count: 0,
          expired_count: 0,
          by_type: {} as Record<WarrantyType, number>,
        }
      }

      const byType = warranties.reduce((acc: Record<WarrantyType, number>, w: WarrantyWithDetails) => {
        if (w.warranty_type) {
          acc[w.warranty_type] = (acc[w.warranty_type] || 0) + 1
        }
        return acc
      }, {} as Record<WarrantyType, number>)

      return {
        total_warranties: warranties.length,
        active_count: warranties.filter((w: WarrantyWithDetails) => w.status === 'active').length,
        expiring_soon_count: warranties.filter((w: WarrantyWithDetails) => w.is_expiring_soon).length,
        expired_count: warranties.filter((w: WarrantyWithDetails) => w.status === 'expired').length,
        by_type: byType,
      }
    },
    enabled: !!warranties,
  })
}

// =============================================
// Checklist Hooks
// =============================================

/**
 * Fetch checklist items for a project
 */
export function useCloseoutChecklist(projectId: string) {
  return useQuery({
    queryKey: closeoutKeys.checklist(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('closeout_checklist_items')
        .select(`
          *,
          assigned_to_user:profiles!closeout_checklist_items_assigned_to_user_id_fkey(id, full_name, email),
          subcontractor:contacts!closeout_checklist_items_subcontractor_id_fkey(id, company_name)
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })

      if (error) {throw error}
      return data as CloseoutChecklistItemWithDetails[]
    },
    enabled: !!projectId,
  })
}

/**
 * Create a checklist item
 */
export function useCreateChecklistItem() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateCloseoutChecklistItemDTO) => {
      const { data, error } = await supabase
        .from('closeout_checklist_items')
        .insert({
          company_id: userProfile?.company_id,
          project_id: input.project_id,
          category: input.category || null,
          description: input.description,
          assigned_to_user_id: input.assigned_to_user_id || null,
          assigned_to_name: input.assigned_to_name || null,
          subcontractor_id: input.subcontractor_id || null,
          due_date: input.due_date || null,
          sort_order: input.sort_order ?? 0,
          closeout_document_id: input.closeout_document_id || null,
          notes: input.notes || null,
          completed: false,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as CloseoutChecklistItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: closeoutKeys.checklist(data.project_id) })
    },
  })
}

/**
 * Toggle checklist item completion
 */
export function useToggleChecklistItem() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { data, error } = await supabase
        .from('closeout_checklist_items')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? userProfile?.id : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as CloseoutChecklistItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: closeoutKeys.checklist(data.project_id) })
    },
  })
}
