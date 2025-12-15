/**
 * Emails Hook
 *
 * Manages email threads, messages, and entity linking:
 * - Email threads and messages
 * - Read/unread status
 * - Star/archive operations
 * - Entity linking (RFIs, projects, etc.)
 * - Search and filtering
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import * as emailApi from '@/lib/api/services/email-integration'
import type {
  EmailThread,
  Email,
  EmailEntityLink,
  EmailThreadFilters,
  EmailFilters,
  EmailSearchParams,
  ComposeEmailDTO,
  CreateEntityLinkDTO,
  EmailFolder,
  LinkableEntityType,
} from '@/types/email'

// Query key factory
export const emailKeys = {
  all: ['emails'] as const,
  threads: () => [...emailKeys.all, 'threads'] as const,
  threadsList: (filters?: EmailThreadFilters) => [...emailKeys.threads(), 'list', filters] as const,
  thread: (id: string) => [...emailKeys.threads(), 'detail', id] as const,
  messages: () => [...emailKeys.all, 'messages'] as const,
  messagesList: (filters?: EmailFilters) => [...emailKeys.messages(), 'list', filters] as const,
  message: (id: string) => [...emailKeys.messages(), 'detail', id] as const,
  search: (params: EmailSearchParams) => [...emailKeys.all, 'search', params] as const,
  entityEmails: (type: string, id: string) => [...emailKeys.all, 'entity', type, id] as const,
  unreadCount: () => [...emailKeys.all, 'unread'] as const,
  unreadByFolder: () => [...emailKeys.all, 'unread-folders'] as const,
}

// =====================================================
// EMAIL THREADS
// =====================================================

/**
 * Get email threads with filters
 */
export function useEmailThreads(filters?: EmailThreadFilters) {
  return useQuery({
    queryKey: emailKeys.threadsList(filters),
    queryFn: async () => {
      const { data, error } = await emailApi.getEmailThreads(filters)
      if (error) throw error
      return data || []
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Get email threads with infinite scroll pagination
 */
export function useEmailThreadsInfinite(filters?: Omit<EmailThreadFilters, 'offset'>) {
  const limit = filters?.limit || 50

  return useInfiniteQuery({
    queryKey: emailKeys.threadsList({ ...filters, limit }),
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await emailApi.getEmailThreads({
        ...filters,
        limit,
        offset: pageParam,
      })
      if (error) throw error
      return data || []
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < limit) return undefined
      return allPages.length * limit
    },
    staleTime: 30 * 1000,
  })
}

/**
 * Get a single email thread with all emails
 */
export function useEmailThread(threadId: string | undefined) {
  return useQuery({
    queryKey: emailKeys.thread(threadId || ''),
    queryFn: async () => {
      if (!threadId) throw new Error('Thread ID required')
      const { data, error } = await emailApi.getEmailThread(threadId)
      if (error) throw error
      return data
    },
    enabled: !!threadId,
    staleTime: 30 * 1000,
  })
}

/**
 * Update email thread (star, archive, folder)
 */
export function useUpdateEmailThread() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      threadId,
      updates,
    }: {
      threadId: string
      updates: Partial<Pick<EmailThread, 'is_starred' | 'is_archived' | 'folder' | 'labels'>>
    }) => {
      const { data, error } = await emailApi.updateEmailThread(threadId, updates)
      if (error) throw error
      return data
    },
    onSuccess: (thread, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: emailKeys.threads() })
      queryClient.setQueryData(emailKeys.thread(threadId), thread)
    },
    onError: (error: Error) => {
      toast.error(`Failed to update thread: ${error.message}`)
    },
  })
}

/**
 * Mark thread as read/unread
 */
export function useMarkThreadAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ threadId, isRead }: { threadId: string; isRead: boolean }) => {
      const { data, error } = await emailApi.markThreadAsRead(threadId, isRead)
      if (error) throw error
      return data
    },
    onSuccess: (_, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: emailKeys.thread(threadId) })
      queryClient.invalidateQueries({ queryKey: emailKeys.threads() })
      queryClient.invalidateQueries({ queryKey: emailKeys.unreadCount() })
    },
  })
}

// =====================================================
// EMAILS
// =====================================================

/**
 * Get emails with filters
 */
export function useEmails(filters?: EmailFilters) {
  return useQuery({
    queryKey: emailKeys.messagesList(filters),
    queryFn: async () => {
      const { data, error } = await emailApi.getEmails(filters)
      if (error) throw error
      return data || []
    },
    staleTime: 30 * 1000,
  })
}

/**
 * Get a single email by ID
 */
export function useEmail(emailId: string | undefined) {
  return useQuery({
    queryKey: emailKeys.message(emailId || ''),
    queryFn: async () => {
      if (!emailId) throw new Error('Email ID required')
      const { data, error } = await emailApi.getEmail(emailId)
      if (error) throw error
      return data
    },
    enabled: !!emailId,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Mark email as read/unread
 */
export function useMarkEmailAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ emailId, isRead }: { emailId: string; isRead: boolean }) => {
      const { data, error } = await emailApi.markEmailAsRead(emailId, isRead)
      if (error) throw error
      return data
    },
    onSuccess: (email, { emailId }) => {
      queryClient.setQueryData(emailKeys.message(emailId), email)
      queryClient.invalidateQueries({ queryKey: emailKeys.threads() })
      queryClient.invalidateQueries({ queryKey: emailKeys.unreadCount() })
    },
  })
}

/**
 * Star/unstar email
 */
export function useStarEmail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ emailId, isStarred }: { emailId: string; isStarred: boolean }) => {
      const { data, error } = await emailApi.starEmail(emailId, isStarred)
      if (error) throw error
      return data
    },
    onSuccess: (email, { emailId }) => {
      queryClient.setQueryData(emailKeys.message(emailId), email)
      queryClient.invalidateQueries({ queryKey: emailKeys.threads() })
    },
  })
}

/**
 * Move email to folder
 */
export function useMoveEmailToFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ emailId, folder }: { emailId: string; folder: EmailFolder }) => {
      const { data, error } = await emailApi.moveEmailToFolder(emailId, folder)
      if (error) throw error
      return data
    },
    onSuccess: (email, { emailId }) => {
      queryClient.setQueryData(emailKeys.message(emailId), email)
      queryClient.invalidateQueries({ queryKey: emailKeys.threads() })
      toast.success(`Moved to ${folder}`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to move email: ${error.message}`)
    },
  })
}

// =====================================================
// SEARCH
// =====================================================

/**
 * Search emails
 */
export function useEmailSearch(params: EmailSearchParams, enabled = true) {
  return useQuery({
    queryKey: emailKeys.search(params),
    queryFn: async () => {
      const { data, error } = await emailApi.searchEmails(params)
      if (error) throw error
      return data || []
    },
    enabled: enabled && !!params.query && params.query.length >= 2,
    staleTime: 60 * 1000,
  })
}

// =====================================================
// COMPOSE & SEND
// =====================================================

/**
 * Send an email
 */
export function useSendEmail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ComposeEmailDTO) => {
      const { data: result, error } = await emailApi.sendEmail(data)
      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.threads() })
      toast.success('Email sent')
    },
    onError: (error: Error) => {
      toast.error(`Failed to send email: ${error.message}`)
    },
  })
}

/**
 * Save email as draft
 */
export function useSaveDraft() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ComposeEmailDTO) => {
      const { data: result, error } = await emailApi.saveDraft(data)
      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.threads() })
      toast.success('Draft saved')
    },
    onError: (error: Error) => {
      toast.error(`Failed to save draft: ${error.message}`)
    },
  })
}

// =====================================================
// ENTITY LINKING
// =====================================================

/**
 * Link email to an entity
 */
export function useCreateEntityLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateEntityLinkDTO) => {
      const { data: link, error } = await emailApi.createEntityLink(data)
      if (error) throw error
      return link
    },
    onSuccess: (link, { email_id, thread_id, entity_type, entity_id }) => {
      if (email_id) {
        queryClient.invalidateQueries({ queryKey: emailKeys.message(email_id) })
      }
      if (thread_id) {
        queryClient.invalidateQueries({ queryKey: emailKeys.thread(thread_id) })
      }
      queryClient.invalidateQueries({ queryKey: emailKeys.entityEmails(entity_type, entity_id) })
      toast.success('Email linked successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to link email: ${error.message}`)
    },
  })
}

/**
 * Remove entity link
 */
export function useRemoveEntityLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (linkId: string) => {
      const { data, error } = await emailApi.removeEntityLink(linkId)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.all })
      toast.success('Link removed')
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove link: ${error.message}`)
    },
  })
}

/**
 * Get emails linked to an entity
 */
export function useEntityEmails(
  entityType: LinkableEntityType | undefined,
  entityId: string | undefined,
  limit = 20
) {
  return useQuery({
    queryKey: emailKeys.entityEmails(entityType || '', entityId || ''),
    queryFn: async () => {
      if (!entityType || !entityId) throw new Error('Entity type and ID required')
      const { data, error } = await emailApi.getEntityEmails(entityType, entityId, limit)
      if (error) throw error
      return data || []
    },
    enabled: !!entityType && !!entityId,
    staleTime: 60 * 1000,
  })
}

/**
 * Get entity links for an email
 */
export function useEmailEntityLinks(emailId: string | undefined) {
  return useQuery({
    queryKey: [...emailKeys.message(emailId || ''), 'links'],
    queryFn: async () => {
      if (!emailId) throw new Error('Email ID required')
      const { data, error } = await emailApi.getEmailEntityLinks(emailId)
      if (error) throw error
      return data || []
    },
    enabled: !!emailId,
    staleTime: 60 * 1000,
  })
}

// =====================================================
// UNREAD COUNTS
// =====================================================

/**
 * Get total unread email count
 */
export function useUnreadEmailCount() {
  return useQuery({
    queryKey: emailKeys.unreadCount(),
    queryFn: async () => {
      const { data, error } = await emailApi.getUnreadEmailCount()
      if (error) throw error
      return data
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

/**
 * Get unread counts by folder
 */
export function useUnreadCountsByFolder() {
  return useQuery({
    queryKey: emailKeys.unreadByFolder(),
    queryFn: async () => {
      const { data, error } = await emailApi.getUnreadCountsByFolder()
      if (error) throw error
      return data
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}

// =====================================================
// CONVENIENCE HOOKS
// =====================================================

/**
 * Get inbox threads
 */
export function useInboxThreads(accountId?: string) {
  return useEmailThreads({
    account_id: accountId,
    folder: 'inbox',
    is_archived: false,
  })
}

/**
 * Get starred threads
 */
export function useStarredThreads(accountId?: string) {
  return useEmailThreads({
    account_id: accountId,
    is_starred: true,
  })
}

/**
 * Get unread threads
 */
export function useUnreadThreads(accountId?: string) {
  return useEmailThreads({
    account_id: accountId,
    has_unread: true,
  })
}

/**
 * Get thread emails sorted by date
 */
export function useThreadEmails(threadId: string | undefined) {
  return useEmails({
    thread_id: threadId,
    limit: 100,
  })
}
