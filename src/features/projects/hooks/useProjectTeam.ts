// File: /src/features/projects/hooks/useProjectTeam.ts
// React Query hooks for project team management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectTeamApi } from '@/lib/api/projectTeam'
import type { AddTeamMemberInput, UpdateTeamMemberInput } from '../types/team'
import { useToast } from '@/lib/notifications/ToastContext'
import { useAuth } from '@/hooks/useAuth'

// Query keys for cache management
export const projectTeamKeys = {
  all: ['project-team'] as const,
  team: (projectId: string) => [...projectTeamKeys.all, 'team', projectId] as const,
  availableUsers: (projectId: string, companyId: string) =>
    [...projectTeamKeys.all, 'available', projectId, companyId] as const,
}

/**
 * Hook to fetch project team members
 */
export function useProjectTeam(projectId: string | undefined) {
  return useQuery({
    queryKey: projectTeamKeys.team(projectId || ''),
    queryFn: () => {
      if (!projectId) throw new Error('Project ID required')
      return projectTeamApi.getProjectTeam(projectId)
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch available users (not yet on project)
 */
export function useAvailableUsers(projectId: string | undefined, companyId: string | undefined) {
  return useQuery({
    queryKey: projectTeamKeys.availableUsers(projectId || '', companyId || ''),
    queryFn: () => {
      if (!projectId || !companyId) throw new Error('Project ID and Company ID required')
      return projectTeamApi.getAvailableUsers(projectId, companyId)
    },
    enabled: !!projectId && !!companyId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook to add a team member
 */
export function useAddTeamMember(projectId: string) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useToast()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: (input: AddTeamMemberInput) =>
      projectTeamApi.addTeamMember(projectId, input, userProfile?.id),
    onSuccess: (newMember) => {
      // Invalidate both team and available users
      queryClient.invalidateQueries({ queryKey: projectTeamKeys.team(projectId) })
      if (userProfile?.company_id) {
        queryClient.invalidateQueries({
          queryKey: projectTeamKeys.availableUsers(projectId, userProfile.company_id),
        })
      }
      const name = newMember.user
        ? `${newMember.user.first_name || ''} ${newMember.user.last_name || ''}`.trim() ||
          newMember.user.email
        : 'Team member'
      success('Team Member Added', `${name} has been added to the project`)
    },
    onError: (error: Error) => {
      showError('Failed to Add Team Member', error.message)
    },
  })
}

/**
 * Hook to update a team member
 */
export function useUpdateTeamMember(projectId: string) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useToast()

  return useMutation({
    mutationFn: ({ membershipId, input }: { membershipId: string; input: UpdateTeamMemberInput }) =>
      projectTeamApi.updateTeamMember(membershipId, input),
    onSuccess: (updatedMember) => {
      queryClient.invalidateQueries({ queryKey: projectTeamKeys.team(projectId) })
      const name = updatedMember.user
        ? `${updatedMember.user.first_name || ''} ${updatedMember.user.last_name || ''}`.trim() ||
          updatedMember.user.email
        : 'Team member'
      success('Team Member Updated', `${name}'s role has been updated`)
    },
    onError: (error: Error) => {
      showError('Failed to Update Team Member', error.message)
    },
  })
}

/**
 * Hook to remove a team member
 */
export function useRemoveTeamMember(projectId: string) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useToast()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: (membershipId: string) => projectTeamApi.removeTeamMember(membershipId),
    onSuccess: () => {
      // Invalidate both team and available users
      queryClient.invalidateQueries({ queryKey: projectTeamKeys.team(projectId) })
      if (userProfile?.company_id) {
        queryClient.invalidateQueries({
          queryKey: projectTeamKeys.availableUsers(projectId, userProfile.company_id),
        })
      }
      success('Team Member Removed', 'The team member has been removed from the project')
    },
    onError: (error: Error) => {
      showError('Failed to Remove Team Member', error.message)
    },
  })
}
