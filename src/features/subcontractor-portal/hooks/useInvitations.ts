/**
 * React Query hooks for subcontractor invitations
 * Used by GCs to manage portal invitations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subcontractorPortalApi } from '@/lib/api/services/subcontractor-portal'
import type {
  CreateInvitationDTO,
  UpdatePortalAccessDTO,
} from '@/types/subcontractor-portal'
import { toast } from 'sonner'

/**
 * Hook to get portal access records for a project
 */
export function useProjectPortalAccess(projectId: string | undefined) {
  return useQuery({
    queryKey: ['portal-access', projectId],
    queryFn: () => subcontractorPortalApi.getPortalAccess(projectId!),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to create a subcontractor invitation
 */
export function useCreateInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      invitedBy,
      data,
    }: {
      invitedBy: string
      data: CreateInvitationDTO
    }) => subcontractorPortalApi.createInvitation(invitedBy, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['portal-access', variables.data.project_id],
      })
      queryClient.invalidateQueries({
        queryKey: ['invitations', variables.data.project_id],
      })
      toast.success('Invitation sent successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send invitation')
    },
  })
}

/**
 * Hook to update portal access permissions
 */
export function useUpdatePortalAccess() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      accessId,
      projectId: _projectId,
      data,
    }: {
      accessId: string
      projectId: string
      data: UpdatePortalAccessDTO
    }) => subcontractorPortalApi.updatePortalAccess(accessId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['portal-access', variables.projectId],
      })
      toast.success('Permissions updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update permissions')
    },
  })
}

/**
 * Hook to revoke portal access
 */
export function useRevokePortalAccess() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      accessId,
      projectId: _projectId,
    }: {
      accessId: string
      projectId: string
    }) => subcontractorPortalApi.revokePortalAccess(accessId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['portal-access', variables.projectId],
      })
      toast.success('Access revoked successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to revoke access')
    },
  })
}

/**
 * Hook to validate an invitation token (for subcontractor acceptance flow)
 */
export function useValidateInvitation(token: string | undefined) {
  return useQuery({
    queryKey: ['invitation-validation', token],
    queryFn: () => subcontractorPortalApi.validateInvitation(token!),
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to accept an invitation
 */
export function useAcceptInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ token, userId }: { token: string; userId: string }) =>
      subcontractorPortalApi.acceptInvitation(token, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractor-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['subcontractor-projects'] })
      toast.success('Invitation accepted! Welcome to the portal.')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to accept invitation')
    },
  })
}
