/**
 * Report Sharing React Query Hooks
 *
 * Provides data fetching and mutation hooks for report sharing functionality.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/lib/notifications/ToastContext'
import { reportSharingApi } from '@/lib/api/services/report-sharing'
import type {
  SharedReport,
  CreateReportShareDTO,
  UpdateReportShareDTO,
  PublicSharedReportData,
} from '@/types/report-builder'

// ============================================================================
// Query Keys
// ============================================================================

export const reportSharingKeys = {
  all: ['report-sharing'] as const,
  shares: () => [...reportSharingKeys.all, 'shares'] as const,
  sharesByReport: (reportId: string) => [...reportSharingKeys.shares(), 'by-report', reportId] as const,
  sharesByCompany: (companyId: string) => [...reportSharingKeys.shares(), 'by-company', companyId] as const,
  shareDetail: (shareId: string) => [...reportSharingKeys.shares(), 'detail', shareId] as const,
  publicReport: (token: string) => [...reportSharingKeys.all, 'public', token] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all shares for a specific report template
 */
export function useReportShares(reportTemplateId: string | undefined) {
  return useQuery({
    queryKey: reportSharingKeys.sharesByReport(reportTemplateId!),
    queryFn: () => reportSharingApi.getReportShares(reportTemplateId!),
    enabled: !!reportTemplateId,
  })
}

/**
 * Fetch a single shared report by ID
 */
export function useReportShare(shareId: string | undefined) {
  return useQuery({
    queryKey: reportSharingKeys.shareDetail(shareId!),
    queryFn: () => reportSharingApi.getReportShare(shareId!),
    enabled: !!shareId,
  })
}

/**
 * Fetch shared report data by public token (for public viewer)
 */
export function usePublicSharedReport(token: string | undefined) {
  return useQuery({
    queryKey: reportSharingKeys.publicReport(token!),
    queryFn: () => reportSharingApi.getSharedReportByToken(token!),
    enabled: !!token,
    // Don't retry on 404 errors
    retry: (failureCount, error: any) => {
      if (error?.code === 'PGRST116') {return false}
      return failureCount < 2
    },
    // Cache public reports for 5 minutes
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch all shared reports for a company
 */
export function useCompanySharedReports(companyId: string | undefined) {
  return useQuery({
    queryKey: reportSharingKeys.sharesByCompany(companyId!),
    queryFn: () => reportSharingApi.getCompanySharedReports(companyId!),
    enabled: !!companyId,
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new report share
 */
export function useCreateReportShare() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (data: CreateReportShareDTO) => reportSharingApi.createReportShare(data),
    onSuccess: (share) => {
      queryClient.invalidateQueries({ queryKey: reportSharingKeys.sharesByReport(share.report_template_id) })
      queryClient.invalidateQueries({ queryKey: reportSharingKeys.sharesByCompany(share.company_id) })
      showToast({
        type: 'success',
        title: 'Share Created',
        message: 'Report share link has been created.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to create report share',
      })
    },
  })
}

/**
 * Update an existing report share
 */
export function useUpdateReportShare() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ shareId, data }: { shareId: string; data: UpdateReportShareDTO }) =>
      reportSharingApi.updateReportShare(shareId, data),
    onSuccess: (share) => {
      queryClient.invalidateQueries({ queryKey: reportSharingKeys.shareDetail(share.id) })
      queryClient.invalidateQueries({ queryKey: reportSharingKeys.sharesByReport(share.report_template_id) })
      showToast({
        type: 'success',
        title: 'Share Updated',
        message: 'Report share settings have been updated.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update report share',
      })
    },
  })
}

/**
 * Delete a report share
 */
export function useDeleteReportShare() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ shareId, reportTemplateId }: { shareId: string; reportTemplateId: string }) =>
      reportSharingApi.deleteReportShare(shareId).then(() => ({ shareId, reportTemplateId })),
    onSuccess: ({ reportTemplateId }) => {
      queryClient.invalidateQueries({ queryKey: reportSharingKeys.sharesByReport(reportTemplateId) })
      queryClient.invalidateQueries({ queryKey: reportSharingKeys.shares() })
      showToast({
        type: 'success',
        title: 'Share Deleted',
        message: 'The share link has been removed.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to delete report share',
      })
    },
  })
}

/**
 * Regenerate the public token for a share
 */
export function useRegenerateShareToken() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ shareId, reportTemplateId }: { shareId: string; reportTemplateId: string }) =>
      reportSharingApi.regenerateShareToken(shareId).then((newToken) => ({
        shareId,
        reportTemplateId,
        newToken,
      })),
    onSuccess: ({ reportTemplateId, newToken }) => {
      queryClient.invalidateQueries({ queryKey: reportSharingKeys.shares() })
      showToast({
        type: 'success',
        title: 'Token Regenerated',
        message: 'A new share link has been generated. The old link will no longer work.',
      })
      return newToken
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to regenerate token',
      })
    },
  })
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * Hook to get the share URL for a token
 */
export function useShareUrl(token: string | undefined): string {
  if (!token) {return ''}
  return reportSharingApi.getShareUrl(token)
}

/**
 * Hook to get the embed code for a token
 */
export function useEmbedCode(token: string | undefined, width?: string, height?: string): string {
  if (!token) {return ''}
  return reportSharingApi.getEmbedCode(token, width, height)
}

/**
 * Hook to copy text to clipboard
 */
export function useCopyToClipboard() {
  const { showToast } = useToast()

  const copyToClipboard = async (text: string, label = 'Link') => {
    try {
      await navigator.clipboard.writeText(text)
      showToast({
        type: 'success',
        title: 'Copied',
        message: `${label} copied to clipboard`,
      })
      return true
    } catch (_error) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to copy to clipboard',
      })
      return false
    }
  }

  return { copyToClipboard }
}
