/**
 * React Query hooks for company user management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companyUsersApi, type UserRole, type InviteUserData } from '@/lib/api/services/company-users'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Query Keys
// ============================================================================

export const companyUsersKeys = {
  all: ['company-users'] as const,
  list: (companyId: string) => [...companyUsersKeys.all, 'list', companyId] as const,
  detail: (userId: string) => [...companyUsersKeys.all, 'detail', userId] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all users in the current user's company
 */
export function useCompanyUsers() {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: companyUsersKeys.list(companyId || ''),
    queryFn: () => companyUsersApi.getCompanyUsers(companyId || ''),
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Invite a new user to the company
 */
export function useInviteUser() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useMutation({
    mutationFn: (data: InviteUserData) => {
      if (!companyId || !userProfile?.id) throw new Error('Company not found')
      return companyUsersApi.inviteUser(companyId, userProfile.id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyUsersKeys.list(companyId || '') })
      toast.success('Invitation sent successfully')
    },
    onError: (error) => {
      logger.error('Failed to invite user:', error)
      toast.error('Failed to send invitation')
    },
  })
}

/**
 * Update a user's role
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) => {
      return companyUsersApi.updateUserRole(userId, role)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: companyUsersKeys.list(companyId || '') })
      queryClient.setQueryData(companyUsersKeys.detail(data.id), data)
      toast.success('User role updated')
    },
    onError: (error) => {
      logger.error('Failed to update user role:', error)
      toast.error('Failed to update user role')
    },
  })
}

/**
 * Activate or deactivate a user
 */
export function useToggleUserActive() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      return companyUsersApi.setUserActive(userId, isActive)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: companyUsersKeys.list(companyId || '') })
      queryClient.setQueryData(companyUsersKeys.detail(data.id), data)
      toast.success(data.is_active ? 'User activated' : 'User deactivated')
    },
    onError: (error) => {
      logger.error('Failed to update user status:', error)
      toast.error('Failed to update user status')
    },
  })
}

/**
 * Delete a user (soft delete)
 */
export function useDeleteUser() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useMutation({
    mutationFn: (userId: string) => {
      return companyUsersApi.deleteUser(userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyUsersKeys.list(companyId || '') })
      toast.success('User removed')
    },
    onError: (error) => {
      logger.error('Failed to delete user:', error)
      toast.error('Failed to remove user')
    },
  })
}
