/**
 * Client Portal React Query Hooks
 *
 * Hooks for fetching and managing client portal data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientPortalApi } from '@/lib/api/services/client-portal'
import type { UpdateClientPortalSettingsDTO } from '@/types/client-portal'

// ============================================
// Query Keys
// ============================================

export const clientPortalKeys = {
  all: ['client-portal'] as const,
  projects: () => [...clientPortalKeys.all, 'projects'] as const,
  project: (id: string) => [...clientPortalKeys.all, 'project', id] as const,
  stats: () => [...clientPortalKeys.all, 'stats'] as const,
  settings: (projectId: string) => [...clientPortalKeys.all, 'settings', projectId] as const,
  rfis: (projectId: string) => [...clientPortalKeys.all, 'rfis', projectId] as const,
  changeOrders: (projectId: string) => [...clientPortalKeys.all, 'change-orders', projectId] as const,
  documents: (projectId: string) => [...clientPortalKeys.all, 'documents', projectId] as const,
  photos: (projectId: string) => [...clientPortalKeys.all, 'photos', projectId] as const,
  schedule: (projectId: string) => [...clientPortalKeys.all, 'schedule', projectId] as const,
}

// ============================================
// Client Projects
// ============================================

/**
 * Fetch all projects the client has access to
 */
export function useClientProjects() {
  return useQuery({
    queryKey: clientPortalKeys.projects(),
    queryFn: () => clientPortalApi.getClientProjects(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch a single project for client view
 */
export function useClientProject(projectId: string | undefined) {
  return useQuery({
    queryKey: clientPortalKeys.project(projectId!),
    queryFn: () => clientPortalApi.getClientProject(projectId!),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Fetch client dashboard statistics
 */
export function useClientDashboardStats() {
  return useQuery({
    queryKey: clientPortalKeys.stats(),
    queryFn: () => clientPortalApi.getClientDashboardStats(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// ============================================
// Portal Settings (Admin)
// ============================================

/**
 * Fetch portal settings for a project
 */
export function useClientPortalSettings(projectId: string | undefined) {
  return useQuery({
    queryKey: clientPortalKeys.settings(projectId!),
    queryFn: () => clientPortalApi.getPortalSettings(projectId!),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

/**
 * Update portal settings for a project
 */
export function useUpdateClientPortalSettings(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: UpdateClientPortalSettingsDTO) =>
      clientPortalApi.updatePortalSettings(projectId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientPortalKeys.settings(projectId) })
      queryClient.invalidateQueries({ queryKey: clientPortalKeys.project(projectId) })
    },
  })
}

// ============================================
// Client RFIs
// ============================================

/**
 * Fetch RFIs for a project (client view)
 */
export function useClientRFIs(projectId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: clientPortalKeys.rfis(projectId!),
    queryFn: () => clientPortalApi.getClientRFIs(projectId!),
    enabled: !!projectId && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
  })
}

// ============================================
// Client Change Orders
// ============================================

/**
 * Fetch change orders for a project (client view)
 */
export function useClientChangeOrders(projectId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: clientPortalKeys.changeOrders(projectId!),
    queryFn: () => clientPortalApi.getClientChangeOrders(projectId!),
    enabled: !!projectId && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
  })
}

// ============================================
// Client Documents
// ============================================

/**
 * Fetch documents for a project (client view)
 */
export function useClientDocuments(projectId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: clientPortalKeys.documents(projectId!),
    queryFn: () => clientPortalApi.getClientDocuments(projectId!),
    enabled: !!projectId && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
  })
}

// ============================================
// Client Photos
// ============================================

/**
 * Fetch photos for a project (client view)
 */
export function useClientPhotos(projectId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: clientPortalKeys.photos(projectId!),
    queryFn: () => clientPortalApi.getClientPhotos(projectId!),
    enabled: !!projectId && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
  })
}

// ============================================
// Client Schedule
// ============================================

/**
 * Fetch schedule for a project (client view)
 */
export function useClientSchedule(projectId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: clientPortalKeys.schedule(projectId!),
    queryFn: () => clientPortalApi.getClientSchedule(projectId!),
    enabled: !!projectId && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
  })
}

// ============================================
// Client Invitation
// ============================================

/**
 * Invite a client to the portal
 */
export function useInviteClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      email,
      projectIds,
      invitedBy,
    }: {
      email: string
      projectIds: string[]
      invitedBy: string
    }) => clientPortalApi.inviteClient(email, projectIds, invitedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientPortalKeys.all })
    },
  })
}
