/**
 * React Query hooks for company profile management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companyApi, type CompanyUpdate } from '@/lib/api/services/company'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Query Keys
// ============================================================================

export const companyKeys = {
  all: ['company'] as const,
  detail: (id: string) => [...companyKeys.all, id] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch company profile for the current user's company
 */
export function useCompanyProfile() {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: companyKeys.detail(companyId || ''),
    queryFn: () => companyApi.getCompany(companyId || ''),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Update company profile
 */
export function useUpdateCompanyProfile() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useMutation({
    mutationFn: (updates: CompanyUpdate) => {
      if (!companyId) {throw new Error('Company not found')}
      return companyApi.updateCompany(companyId, updates)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(companyKeys.detail(companyId || ''), data)
      toast.success('Company profile updated')
    },
    onError: (error) => {
      logger.error('Failed to update company profile:', error)
      toast.error('Failed to update company profile')
    },
  })
}

/**
 * Upload company logo
 */
export function useUploadCompanyLogo() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useMutation({
    mutationFn: (file: File) => {
      if (!companyId) {throw new Error('Company not found')}
      return companyApi.uploadLogo(companyId, file)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(companyId || '') })
      toast.success('Logo uploaded successfully')
    },
    onError: (error) => {
      logger.error('Failed to upload logo:', error)
      toast.error('Failed to upload logo')
    },
  })
}

/**
 * Delete company logo
 */
export function useDeleteCompanyLogo() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useMutation({
    mutationFn: () => {
      if (!companyId) {throw new Error('Company not found')}
      return companyApi.deleteLogo(companyId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(companyId || '') })
      toast.success('Logo removed')
    },
    onError: (error) => {
      logger.error('Failed to delete logo:', error)
      toast.error('Failed to remove logo')
    },
  })
}
