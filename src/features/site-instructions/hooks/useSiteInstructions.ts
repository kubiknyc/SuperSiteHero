import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SiteInstructionStatus, SiteInstructionPriority } from '@/types/database'
import { logger } from '../../../lib/utils/logger';


// Query keys
export const siteInstructionKeys = {
  all: ['site-instructions'] as const,
  lists: () => [...siteInstructionKeys.all, 'list'] as const,
  list: (projectId: string, filters?: SiteInstructionFilters) =>
    [...siteInstructionKeys.lists(), projectId, filters] as const,
  details: () => [...siteInstructionKeys.all, 'detail'] as const,
  detail: (id: string) => [...siteInstructionKeys.details(), id] as const,
  history: (id: string) => [...siteInstructionKeys.all, 'history', id] as const,
  comments: (id: string) => [...siteInstructionKeys.all, 'comments', id] as const,
}

export interface SiteInstructionFilters {
  status?: SiteInstructionStatus | SiteInstructionStatus[]
  priority?: SiteInstructionPriority
  subcontractorId?: string
  search?: string
}

export interface CreateSiteInstructionInput {
  project_id: string
  title: string
  description: string
  subcontractor_id: string
  priority?: SiteInstructionPriority
  due_date?: string
  requires_acknowledgment?: boolean
  requires_completion_tracking?: boolean
}

export interface UpdateSiteInstructionInput {
  id: string
  title?: string
  description?: string
  subcontractor_id?: string
  priority?: SiteInstructionPriority
  due_date?: string
  status?: SiteInstructionStatus
  acknowledgment_notes?: string
  completion_notes?: string
  verification_notes?: string
}

// Extended type with relations and new fields from migration 045
// Note: These fields will be added by the migration; this type anticipates them
export interface SiteInstructionWithRelations {
  id: string
  project_id: string
  reference_number: string | null
  instruction_number: string | null
  title: string
  description: string
  subcontractor_id: string
  created_by: string | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
  // Existing fields
  acknowledged: boolean | null
  acknowledged_at: string | null
  acknowledged_by: string | null
  acknowledgment_signature: string | null
  completed_at: string | null
  completed_by: string | null
  completion_status: string | null
  issued_to_user_id: string | null
  related_to_id: string | null
  related_to_type: string | null
  requires_acknowledgment: boolean | null
  requires_completion_tracking: boolean | null
  verified_by: string | null
  // New fields from migration 045
  status: SiteInstructionStatus | null
  priority: SiteInstructionPriority | null
  due_date: string | null
  issued_by: string | null
  issued_at: string | null
  acknowledgment_notes: string | null
  completion_notes: string | null
  verification_notes: string | null
  linked_task_id: string | null
  linked_punch_list_id: string | null
  linked_daily_report_id: string | null
  // Relations
  subcontractor?: {
    id: string
    company_name: string
    contact_name: string | null
    email?: string | null
    phone?: string | null
  } | null
  issued_by_user?: {
    id: string
    full_name: string
    email?: string | null
  } | null
  created_by_user?: {
    id: string
    full_name: string
    email?: string | null
  } | null
  verified_by_user?: {
    id: string
    full_name: string
  } | null
  project?: {
    id: string
    name: string
  } | null
}

// Fetch all site instructions for a project
export function useSiteInstructions(projectId: string, filters?: SiteInstructionFilters) {
  return useQuery({
    queryKey: siteInstructionKeys.list(projectId, filters),
    queryFn: async () => {
      // Build base query - use type assertion since we have extended fields from migration
      let query = supabase
        .from('site_instructions')
        .select(`
          *,
          project:projects(id, name)
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status)
        } else {
          query = query.eq('status', filters.status)
        }
      }

      if (filters?.priority) {
        query = query.eq('priority', filters.priority)
      }

      if (filters?.subcontractorId) {
        query = query.eq('subcontractor_id', filters.subcontractorId)
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,reference_number.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) {throw error}

      // Fetch subcontractor info separately for each instruction
      const results = await Promise.all(
        (data || []).map(async (instruction) => {
          let subcontractor = null
          if (instruction.subcontractor_id) {
            const { data: contact } = await supabase
              .from('contacts')
              .select('id, company_name, contact_name')
              .eq('id', instruction.subcontractor_id)
              .single()
            subcontractor = contact
          }
          return {
            ...instruction,
            subcontractor,
          } as SiteInstructionWithRelations
        })
      )

      return results
    },
    enabled: !!projectId,
  })
}

// Fetch single site instruction
export function useSiteInstruction(id: string) {
  return useQuery({
    queryKey: siteInstructionKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_instructions')
        .select(`
          *,
          project:projects(id, name)
        `)
        .eq('id', id)
        .single()

      if (error) {throw error}

      // Fetch related data separately
      let subcontractor = null
      let created_by_user = null
      let issued_by_user = null
      let verified_by_user = null

      if (data.subcontractor_id) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('id, company_name, contact_name, email, phone')
          .eq('id', data.subcontractor_id)
          .single()
        subcontractor = contact
      }

      if (data.created_by) {
        const { data: user } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('id', data.created_by)
          .single()
        created_by_user = user
      }

      if ((data as any).issued_by) {
        const { data: user } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('id', (data as any).issued_by)
          .single()
        issued_by_user = user
      }

      if (data.verified_by) {
        const { data: user } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('id', data.verified_by)
          .single()
        verified_by_user = user
      }

      return {
        ...data,
        subcontractor,
        created_by_user,
        issued_by_user,
        verified_by_user,
      } as SiteInstructionWithRelations
    },
    enabled: !!id,
  })
}

// Create site instruction
export function useCreateSiteInstruction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSiteInstructionInput) => {
      // Use type assertion since migration adds new fields
      const insertData = {
        ...input,
        status: 'draft',
      } as any

      const { data, error } = await supabase
        .from('site_instructions')
        .insert(insertData)
        .select()
        .single()

      if (error) {throw error}
      return data as SiteInstructionWithRelations
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteInstructionKeys.lists() })
    },
  })
}

// Update site instruction
export function useUpdateSiteInstruction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateSiteInstructionInput) => {
      const { data, error } = await supabase
        .from('site_instructions')
        .update(input as any)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as SiteInstructionWithRelations
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: siteInstructionKeys.lists() })
      queryClient.invalidateQueries({ queryKey: siteInstructionKeys.detail(data.id) })
    },
  })
}

// Delete site instruction (soft delete)
export function useDeleteSiteInstruction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('site_instructions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {throw error}
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteInstructionKeys.lists() })
    },
  })
}

// Issue site instruction (change status from draft to issued)
export function useIssueSiteInstruction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('site_instructions')
        .update({
          status: 'issued',
          issued_by: user?.id,
          issued_at: new Date().toISOString(),
        } as any)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as SiteInstructionWithRelations
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: siteInstructionKeys.lists() })
      queryClient.invalidateQueries({ queryKey: siteInstructionKeys.detail(data.id) })
    },
  })
}

// Acknowledge site instruction (subcontractor acknowledges receipt)
export function useAcknowledgeSiteInstruction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      acknowledgedBy,
      signature,
      notes,
    }: {
      id: string
      acknowledgedBy: string
      signature?: string
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('site_instructions')
        .update({
          status: 'acknowledged',
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: acknowledgedBy,
          acknowledgment_signature: signature,
          acknowledgment_notes: notes,
        } as any)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as SiteInstructionWithRelations
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: siteInstructionKeys.lists() })
      queryClient.invalidateQueries({ queryKey: siteInstructionKeys.detail(data.id) })
    },
  })
}

// Start work on site instruction
export function useStartSiteInstruction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('site_instructions')
        .update({
          status: 'in_progress',
        } as any)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as SiteInstructionWithRelations
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: siteInstructionKeys.lists() })
      queryClient.invalidateQueries({ queryKey: siteInstructionKeys.detail(data.id) })
    },
  })
}

// Complete site instruction (subcontractor marks as complete)
export function useCompleteSiteInstruction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      completedBy,
      notes,
    }: {
      id: string
      completedBy: string
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('site_instructions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: completedBy,
          completion_status: 'completed',
          completion_notes: notes,
        } as any)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as SiteInstructionWithRelations
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: siteInstructionKeys.lists() })
      queryClient.invalidateQueries({ queryKey: siteInstructionKeys.detail(data.id) })
    },
  })
}

// Verify site instruction (GC verifies completion)
export function useVerifySiteInstruction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      notes,
    }: {
      id: string
      notes?: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('site_instructions')
        .update({
          status: 'verified',
          verified_by: user?.id,
          verification_notes: notes,
        } as any)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as SiteInstructionWithRelations
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: siteInstructionKeys.lists() })
      queryClient.invalidateQueries({ queryKey: siteInstructionKeys.detail(data.id) })
    },
  })
}

// Void site instruction
export function useVoidSiteInstruction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('site_instructions')
        .update({
          status: 'void',
        } as any)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as SiteInstructionWithRelations
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: siteInstructionKeys.lists() })
      queryClient.invalidateQueries({ queryKey: siteInstructionKeys.detail(data.id) })
    },
  })
}

// Fetch history for a site instruction
export function useSiteInstructionHistory(id: string) {
  return useQuery({
    queryKey: siteInstructionKeys.history(id),
    queryFn: async () => {
      // Tables will be created by migration 045
      const { data, error } = await (supabase as any)
        .from('site_instruction_history')
        .select('*')
        .eq('site_instruction_id', id)
        .order('performed_at', { ascending: false })

      if (error) {throw error}

      // Fetch user info for each entry
      const results = await Promise.all(
        (data || []).map(async (entry: any) => {
          let performed_by_user = null
          if (entry.performed_by) {
            const { data: user } = await supabase
              .from('users')
              .select('id, full_name')
              .eq('id', entry.performed_by)
              .single()
            performed_by_user = user
          }
          return {
            ...entry,
            performed_by_user,
          }
        })
      )

      return results
    },
    enabled: !!id,
  })
}

// Fetch comments for a site instruction
export function useSiteInstructionComments(id: string) {
  return useQuery({
    queryKey: siteInstructionKeys.comments(id),
    queryFn: async () => {
      // Tables will be created by migration 045
      const { data, error } = await (supabase as any)
        .from('site_instruction_comments')
        .select('*')
        .eq('site_instruction_id', id)
        .order('created_at', { ascending: true })

      if (error) {throw error}

      // Fetch user info for each comment
      const results = await Promise.all(
        (data || []).map(async (comment: any) => {
          let created_by_user = null
          if (comment.created_by) {
            const { data: user } = await supabase
              .from('users')
              .select('id, full_name')
              .eq('id', comment.created_by)
              .single()
            created_by_user = user
          }
          return {
            ...comment,
            created_by_user,
          }
        })
      )

      return results
    },
    enabled: !!id,
  })
}

// Add comment to site instruction
export function useAddSiteInstructionComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      siteInstructionId,
      content,
    }: {
      siteInstructionId: string
      content: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()

      // Table will be created by migration 045
      const { data, error } = await (supabase as any)
        .from('site_instruction_comments')
        .insert({
          site_instruction_id: siteInstructionId,
          content,
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) {throw error}
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: siteInstructionKeys.comments(variables.siteInstructionId),
      })
    },
  })
}

// =============================================
// Attachments
// =============================================

export interface SiteInstructionAttachment {
  id: string
  site_instruction_id: string
  file_name: string
  file_type: string
  file_size: number
  file_url: string
  storage_path: string
  uploaded_by: string | null
  uploaded_at: string
  description: string | null
  uploaded_by_user?: {
    id: string
    full_name: string
  } | null
}

// Fetch attachments for a site instruction
export function useSiteInstructionAttachments(id: string) {
  return useQuery({
    queryKey: [...siteInstructionKeys.all, 'attachments', id] as const,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('site_instruction_attachments')
        .select('*')
        .eq('site_instruction_id', id)
        .order('uploaded_at', { ascending: false })

      if (error) {throw error}

      // Fetch user info for each attachment
      const results = await Promise.all(
        (data || []).map(async (attachment: SiteInstructionAttachment) => {
          let uploaded_by_user = null
          if (attachment.uploaded_by) {
            const { data: user } = await supabase
              .from('users')
              .select('id, full_name')
              .eq('id', attachment.uploaded_by)
              .single()
            uploaded_by_user = user
          }
          return {
            ...attachment,
            uploaded_by_user,
          }
        })
      )

      return results as SiteInstructionAttachment[]
    },
    enabled: !!id,
  })
}

// Upload attachment
export function useUploadSiteInstructionAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      siteInstructionId,
      file,
      description,
    }: {
      siteInstructionId: string
      file: File
      description?: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()

      // Upload file to storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${siteInstructionId}/${Date.now()}-${file.name}`
      const storagePath = `site-instructions/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(storagePath, file)

      if (uploadError) {throw uploadError}

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(storagePath)

      // Create attachment record
      const { data, error } = await (supabase as any)
        .from('site_instruction_attachments')
        .insert({
          site_instruction_id: siteInstructionId,
          file_name: file.name,
          file_type: file.type || `application/${fileExt}`,
          file_size: file.size,
          file_url: publicUrl,
          storage_path: storagePath,
          uploaded_by: user?.id,
          description,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as SiteInstructionAttachment
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...siteInstructionKeys.all, 'attachments', variables.siteInstructionId],
      })
    },
  })
}

// Delete attachment
export function useDeleteSiteInstructionAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      attachmentId,
      siteInstructionId,
      storagePath,
    }: {
      attachmentId: string
      siteInstructionId: string
      storagePath: string
    }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('attachments')
        .remove([storagePath])

      if (storageError) {
        logger.warn('Failed to delete file from storage:', storageError)
      }

      // Delete record
      const { error } = await (supabase as any)
        .from('site_instruction_attachments')
        .delete()
        .eq('id', attachmentId)

      if (error) {throw error}
      return { attachmentId, siteInstructionId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: [...siteInstructionKeys.all, 'attachments', result.siteInstructionId],
      })
    },
  })
}
