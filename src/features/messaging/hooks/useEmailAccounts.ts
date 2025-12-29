/**
 * Email Accounts Hook
 *
 * Manages email account connections and sync operations:
 * - Connect/disconnect accounts (Gmail, Outlook, IMAP)
 * - Account status and sync management
 * - OAuth flow handling
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import * as emailApi from '@/lib/api/services/email-integration'
import type {
  ConnectEmailAccountDTO,
  EmailProvider,
} from '@/types/email'

// Query key factory
export const emailAccountKeys = {
  all: ['email-accounts'] as const,
  list: () => [...emailAccountKeys.all, 'list'] as const,
  detail: (id: string) => [...emailAccountKeys.all, 'detail', id] as const,
  syncLogs: (id: string) => [...emailAccountKeys.all, 'sync-logs', id] as const,
}

/**
 * Get all email accounts for the current user
 */
export function useEmailAccounts() {
  return useQuery({
    queryKey: emailAccountKeys.list(),
    queryFn: async () => {
      const { data, error } = await emailApi.getEmailAccounts()
      if (error) {throw error}
      return data || []
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Get a single email account
 */
export function useEmailAccount(accountId: string | undefined) {
  return useQuery({
    queryKey: emailAccountKeys.detail(accountId || ''),
    queryFn: async () => {
      if (!accountId) {throw new Error('Account ID required')}
      const { data, error } = await emailApi.getEmailAccount(accountId)
      if (error) {throw error}
      return data
    },
    enabled: !!accountId,
    staleTime: 60 * 1000,
  })
}

/**
 * Get sync logs for an account
 */
export function useEmailSyncLogs(accountId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: emailAccountKeys.syncLogs(accountId || ''),
    queryFn: async () => {
      if (!accountId) {throw new Error('Account ID required')}
      const { data, error } = await emailApi.getEmailSyncLogs(accountId, limit)
      if (error) {throw error}
      return data || []
    },
    enabled: !!accountId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Connect a new email account
 */
export function useConnectEmailAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ConnectEmailAccountDTO) => {
      const { data: account, error } = await emailApi.connectEmailAccount(data)
      if (error) {throw error}
      return account
    },
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: emailAccountKeys.list() })
      toast.success(`Connected ${account?.email_address}`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to connect account: ${error.message}`)
    },
  })
}

/**
 * Disconnect an email account
 */
export function useDisconnectEmailAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await emailApi.disconnectEmailAccount(accountId)
      if (error) {throw error}
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailAccountKeys.list() })
      toast.success('Email account disconnected')
    },
    onError: (error: Error) => {
      toast.error(`Failed to disconnect: ${error.message}`)
    },
  })
}

/**
 * Toggle email sync
 */
export function useToggleEmailSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ accountId, enabled }: { accountId: string; enabled: boolean }) => {
      const { data, error } = await emailApi.toggleEmailSync(accountId, enabled)
      if (error) {throw error}
      return data
    },
    onSuccess: (account, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: emailAccountKeys.list() })
      toast.success(enabled ? 'Email sync enabled' : 'Email sync paused')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update sync settings: ${error.message}`)
    },
  })
}

/**
 * Trigger manual email sync
 */
export function useTriggerEmailSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await emailApi.triggerEmailSync(accountId)
      if (error) {throw error}
      return data
    },
    onSuccess: (result, accountId) => {
      queryClient.invalidateQueries({ queryKey: emailAccountKeys.syncLogs(accountId) })
      toast.success('Email sync started')
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`)
    },
  })
}

/**
 * Hook to handle OAuth callback
 */
export function useOAuthCallback() {
  const connectAccount = useConnectEmailAccount()

  const handleCallback = async (provider: EmailProvider, code: string) => {
    return connectAccount.mutateAsync({ provider, code })
  }

  return {
    handleCallback,
    isLoading: connectAccount.isPending,
    error: connectAccount.error,
  }
}

/**
 * Get OAuth URL for a provider
 */
export function useGetOAuthUrl() {
  return (provider: EmailProvider) => {
    const redirectUri = `${window.location.origin}/settings/email/callback`
    return emailApi.getOAuthUrl(provider, redirectUri)
  }
}

/**
 * Check if user has any connected email accounts
 */
export function useHasEmailAccounts() {
  const { data: accounts, isLoading } = useEmailAccounts()
  return {
    hasAccounts: (accounts?.length || 0) > 0,
    isLoading,
  }
}

/**
 * Get primary (first) email account
 */
export function usePrimaryEmailAccount() {
  const { data: accounts, isLoading } = useEmailAccounts()
  return {
    account: accounts?.[0] || null,
    isLoading,
  }
}
