/**
 * useOMManual Hook
 *
 * React Query hooks for O&M Manual Builder functionality.
 * Manages manual sections, document uploads, and PDF generation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type {
  OMManualSection,
  OMManualVersion,
  CreateOMManualSectionDTO,
  UpdateOMManualSectionDTO,
  OMManualStatistics,
} from '@/types/closeout-extended'

// =============================================
// Query Keys
// =============================================

export const omManualKeys = {
  all: ['om-manual'] as const,
  sections: (projectId: string) => [...omManualKeys.all, 'sections', projectId] as const,
  section: (id: string) => [...omManualKeys.all, 'section', id] as const,
  versions: (projectId: string) => [...omManualKeys.all, 'versions', projectId] as const,
  statistics: (projectId: string) => [...omManualKeys.all, 'statistics', projectId] as const,
}

// =============================================
// Section Hooks
// =============================================

/**
 * Fetch O&M manual sections for a project
 */
export function useOMManualSections(projectId: string | undefined) {
  return useQuery({
    queryKey: omManualKeys.sections(projectId || ''),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')

      const { data, error } = await supabase
        .from('om_manual_sections')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data as OMManualSection[]
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch a single O&M manual section
 */
export function useOMManualSection(sectionId: string | undefined) {
  return useQuery({
    queryKey: omManualKeys.section(sectionId || ''),
    queryFn: async () => {
      if (!sectionId) throw new Error('Section ID required')

      const { data, error } = await supabase
        .from('om_manual_sections')
        .select('*')
        .eq('id', sectionId)
        .single()

      if (error) throw error
      return data as OMManualSection
    },
    enabled: !!sectionId,
  })
}

/**
 * Create a new O&M manual section
 */
export function useCreateOMManualSection() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateOMManualSectionDTO) => {
      const { data, error } = await supabase
        .from('om_manual_sections')
        .insert({
          company_id: userProfile?.company_id,
          project_id: input.project_id,
          section_type: input.section_type,
          title: input.title,
          description: input.description || null,
          sort_order: input.sort_order ?? 0,
          content: input.content || null,
          custom_template: input.custom_template || null,
          document_urls: input.document_urls || [],
          is_complete: false,
          created_by: userProfile?.id,
        })
        .select()
        .single()

      if (error) throw error
      return data as OMManualSection
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: omManualKeys.sections(data.project_id) })
      queryClient.invalidateQueries({ queryKey: omManualKeys.statistics(data.project_id) })
    },
  })
}

/**
 * Update an O&M manual section
 */
export function useUpdateOMManualSection() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateOMManualSectionDTO & { id: string }) => {
      const updateData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      // Set completion timestamp if marking complete
      if (updates.is_complete === true) {
        updateData.completed_at = new Date().toISOString()
        updateData.completed_by = userProfile?.id
      } else if (updates.is_complete === false) {
        updateData.completed_at = null
        updateData.completed_by = null
      }

      const { data, error } = await supabase
        .from('om_manual_sections')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as OMManualSection
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: omManualKeys.section(data.id) })
      queryClient.invalidateQueries({ queryKey: omManualKeys.sections(data.project_id) })
      queryClient.invalidateQueries({ queryKey: omManualKeys.statistics(data.project_id) })
    },
  })
}

/**
 * Delete an O&M manual section (soft delete)
 */
export function useDeleteOMManualSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('om_manual_sections')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select('project_id')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: omManualKeys.sections(data.project_id) })
      queryClient.invalidateQueries({ queryKey: omManualKeys.statistics(data.project_id) })
    },
  })
}

/**
 * Reorder O&M manual sections
 */
export function useReorderOMManualSections() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      sectionIds,
    }: {
      projectId: string
      sectionIds: string[]
    }) => {
      // Update each section's sort_order
      const updates = sectionIds.map((id, index) => ({
        id,
        sort_order: index,
        updated_at: new Date().toISOString(),
      }))

      for (const update of updates) {
        const { error } = await supabase
          .from('om_manual_sections')
          .update({ sort_order: update.sort_order, updated_at: update.updated_at })
          .eq('id', update.id)

        if (error) throw error
      }

      return projectId
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: omManualKeys.sections(projectId) })
    },
  })
}

// =============================================
// Version Hooks
// =============================================

/**
 * Fetch O&M manual versions for a project
 */
export function useOMManualVersions(projectId: string | undefined) {
  return useQuery({
    queryKey: omManualKeys.versions(projectId || ''),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')

      const { data, error } = await supabase
        .from('om_manual_versions')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('version_number', { ascending: false })

      if (error) throw error
      return data as OMManualVersion[]
    },
    enabled: !!projectId,
  })
}

/**
 * Generate a new O&M manual version
 */
export function useGenerateOMManual() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      projectId,
      versionLabel,
      recipientType,
    }: {
      projectId: string
      versionLabel?: string
      recipientType?: 'owner' | 'facility_manager' | 'contractor' | 'archive'
    }) => {
      // Get the next version number
      const { data: existingVersions } = await supabase
        .from('om_manual_versions')
        .select('version_number')
        .eq('project_id', projectId)
        .order('version_number', { ascending: false })
        .limit(1)

      const nextVersion = (existingVersions?.[0]?.version_number || 0) + 1

      // Create the version record (actual PDF generation would be handled by a backend service)
      const { data, error } = await supabase
        .from('om_manual_versions')
        .insert({
          company_id: userProfile?.company_id,
          project_id: projectId,
          version_number: nextVersion,
          version_label: versionLabel || `Version ${nextVersion}`,
          recipient_type: recipientType || null,
          status: 'generating',
          generated_by: userProfile?.id,
          generated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data as OMManualVersion
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: omManualKeys.versions(data.project_id) })
      queryClient.invalidateQueries({ queryKey: omManualKeys.statistics(data.project_id) })
    },
  })
}

// =============================================
// Statistics Hook
// =============================================

/**
 * Get O&M manual statistics for a project
 */
export function useOMManualStatistics(projectId: string | undefined) {
  const { data: sections } = useOMManualSections(projectId)
  const { data: versions } = useOMManualVersions(projectId)

  return useQuery({
    queryKey: omManualKeys.statistics(projectId || ''),
    queryFn: async (): Promise<OMManualStatistics> => {
      const totalSections = sections?.length || 0
      const completedSections = sections?.filter((s) => s.is_complete).length || 0
      const completionPercentage = totalSections > 0
        ? Math.round((completedSections / totalSections) * 100)
        : 0
      const versionsGenerated = versions?.filter((v) => v.status === 'complete').length || 0

      return {
        total_sections: totalSections,
        completed_sections: completedSections,
        completion_percentage: completionPercentage,
        versions_generated: versionsGenerated,
      }
    },
    enabled: !!projectId && !!sections,
  })
}

/**
 * Initialize default O&M manual sections for a project
 */
export function useInitializeOMManualSections() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (projectId: string) => {
      const defaultSections = [
        { section_type: 'cover', title: 'Cover Page', sort_order: 0 },
        { section_type: 'toc', title: 'Table of Contents', sort_order: 1 },
        { section_type: 'emergency_contacts', title: 'Emergency Contacts', sort_order: 2 },
        { section_type: 'system_overview', title: 'System Overview', sort_order: 3 },
        { section_type: 'equipment', title: 'Equipment Information', sort_order: 4 },
        { section_type: 'operating_procedures', title: 'Operating Procedures', sort_order: 5 },
        { section_type: 'maintenance', title: 'Maintenance Schedules', sort_order: 6 },
        { section_type: 'warranties', title: 'Warranties', sort_order: 7 },
        { section_type: 'as_builts', title: 'As-Built Drawings', sort_order: 8 },
      ]

      const sectionsToInsert = defaultSections.map((s) => ({
        company_id: userProfile?.company_id,
        project_id: projectId,
        section_type: s.section_type,
        title: s.title,
        sort_order: s.sort_order,
        document_urls: [],
        is_complete: false,
        created_by: userProfile?.id,
      }))

      const { data, error } = await supabase
        .from('om_manual_sections')
        .insert(sectionsToInsert)
        .select()

      if (error) throw error
      return data as OMManualSection[]
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: omManualKeys.sections(data[0].project_id) })
      }
    },
  })
}
