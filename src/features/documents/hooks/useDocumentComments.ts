// File: /src/features/documents/hooks/useDocumentComments.ts
// Hook for managing document comments with threading support

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email/email-service'
import { generateDocumentCommentEmail } from '@/lib/email/templates'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// Helper to get user details for notifications
async function getUserDetails(userId: string): Promise<{ email: string; full_name: string | null } | null> {
  const { data } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', userId)
    .single()
  return data
}

// Helper to get document details
async function getDocumentDetails(documentId: string): Promise<{
  name: string
  document_number: string | null
  project_id: string
  created_by: string | null
} | null> {
  const { data } = await supabase
    .from('documents')
    .select('name, document_number, project_id, created_by')
    .eq('id', documentId)
    .single()
  return data
}

// Helper to get project name
async function getProjectName(projectId: string): Promise<string> {
  const { data } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()
  return data?.name || 'Unknown Project'
}

// Send notification for document comment
async function notifyDocumentComment(
  documentId: string,
  comment: string,
  commenterId: string
): Promise<void> {
  try {
    const [document, commenter] = await Promise.all([
      getDocumentDetails(documentId),
      getUserDetails(commenterId),
    ])

    if (!document || !document.created_by) return

    // Don't notify if commenter is the document owner
    if (document.created_by === commenterId) return

    const [documentOwner, projectName] = await Promise.all([
      getUserDetails(document.created_by),
      getProjectName(document.project_id),
    ])

    if (!documentOwner?.email) return

    const appUrl = import.meta.env.VITE_APP_URL || 'https://supersitehero.com'
    const { html, text } = generateDocumentCommentEmail({
      recipientName: documentOwner.full_name || documentOwner.email.split('@')[0],
      documentName: document.name,
      documentNumber: document.document_number ?? undefined,
      projectName,
      commentBy: commenter?.full_name || 'Someone',
      commentAt: new Date().toLocaleString(),
      comment,
      isMention: false,
      viewUrl: `${appUrl}/projects/${document.project_id}/documents/${documentId}`,
    })

    await sendEmail({
      to: { email: documentOwner.email, name: documentOwner.full_name ?? undefined },
      subject: `New Comment on ${document.name}`,
      html,
      text,
      tags: ['document', 'comment'],
    })
  } catch (error) {
    console.error('[DocumentComment] Failed to send notification:', error)
  }
}

// Define types locally since document_comments table may not be in generated types yet
export interface DocumentComment {
  id: string
  document_id: string
  project_id: string
  comment_text: string
  created_by: string
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  parent_comment_id: string | null
}

export interface CommentThread extends DocumentComment {
  replies?: CommentThread[]
}

/**
 * useDocumentComments Hook
 *
 * Fetch all comments for a specific document with threading support.
 *
 * Features:
 * - Fetches comments in thread hierarchy
 * - Caches results with React Query
 * - Real-time updates with Supabase subscriptions
 *
 * @param documentId - The document ID
 * @param options - Query options
 *
 * Usage:
 * ```tsx
 * const { data: comments, isLoading } = useDocumentComments(documentId)
 * ```
 */
export function useDocumentComments(
  documentId: string,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options || {}

  return useQuery<DocumentComment[]>({
    queryKey: ['document-comments', documentId],
    queryFn: async () => {
      const { data, error } = await db
        .from('document_comments')
        .select('*')
        .eq('document_id', documentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching comments:', error)
        throw error
      }

      return (data || []) as DocumentComment[]
    },
    enabled: enabled && !!documentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * useCreateComment Hook
 *
 * Create a new comment on a document.
 *
 * @param documentId - The document ID
 * @param projectId - The project ID
 *
 * Usage:
 * ```tsx
 * const createComment = useCreateComment(documentId, projectId)
 * await createComment.mutateAsync({
 *   comment_text: 'My comment',
 *   parent_comment_id: null
 * })
 * ```
 */
export function useCreateComment(documentId: string, projectId: string) {
  const queryClient = useQueryClient()
  const { data: user } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) {throw error}
      return data.user
    },
  })

  return useMutation({
    mutationFn: async (payload: {
      comment_text: string
      parent_comment_id?: string | null
    }) => {
      if (!user?.id) {throw new Error('User not authenticated')}

      const { data, error } = await db
        .from('document_comments')
        .insert({
          document_id: documentId,
          project_id: projectId,
          comment_text: payload.comment_text,
          parent_comment_id: payload.parent_comment_id ?? null,
          created_by: user.id,
        })
        .select()

      if (error) {
        console.error('Error creating comment:', error)
        throw error
      }

      // Send email notification asynchronously (don't block the UI)
      if (data?.[0] && user?.id) {
        notifyDocumentComment(documentId, payload.comment_text, user.id).catch(console.error)
      }

      return data?.[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-comments', documentId], exact: false })
    },
  })
}

/**
 * useUpdateComment Hook
 *
 * Update an existing comment.
 *
 * @param commentId - The comment ID
 * @param documentId - The document ID
 *
 * Usage:
 * ```tsx
 * const updateComment = useUpdateComment(commentId, documentId)
 * await updateComment.mutateAsync({
 *   comment_text: 'Updated comment'
 * })
 * ```
 */
export function useUpdateComment(commentId: string, documentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { comment_text: string }) => {
      const { data, error } = await db
        .from('document_comments')
        .update({ comment_text: payload.comment_text })
        .eq('id', commentId)
        .select()

      if (error) {
        console.error('Error updating comment:', error)
        throw error
      }

      return data?.[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-comments', documentId], exact: false })
    },
  })
}

/**
 * useDeleteComment Hook
 *
 * Delete a comment (soft delete).
 *
 * @param commentId - The comment ID
 * @param documentId - The document ID
 *
 * Usage:
 * ```tsx
 * const deleteComment = useDeleteComment(commentId, documentId)
 * await deleteComment.mutateAsync()
 * ```
 */
export function useDeleteComment(commentId: string, documentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await db
        .from('document_comments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', commentId)

      if (error) {
        console.error('Error deleting comment:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-comments', documentId], exact: false })
    },
  })
}

/**
 * Build a threaded comment tree from flat comment list
 *
 * Groups comments by their parent relationship to create
 * a hierarchical structure for display.
 *
 * @param comments - Flat list of comments
 * @returns Tree structure with replies nested
 *
 * Usage:
 * ```tsx
 * const commentTree = buildCommentTree(comments)
 * ```
 */
export function buildCommentTree(comments: DocumentComment[]): CommentThread[] {
  const map = new Map<string, CommentThread>()
  const roots: CommentThread[] = []

  // Create map of all comments
  comments.forEach(comment => {
    map.set(comment.id, { ...comment, replies: [] })
  })

  // Build tree structure
  comments.forEach(comment => {
    const node = map.get(comment.id)!
    if (comment.parent_comment_id) {
      const parent = map.get(comment.parent_comment_id)
      if (parent) {
        if (!parent.replies) {parent.replies = []}
        parent.replies.push(node)
      }
    } else {
      roots.push(node)
    }
  })

  return roots
}

/**
 * Count total comments including replies
 *
 * Recursively counts all comments in a tree structure.
 *
 * @param thread - Comment thread
 * @returns Total comment count
 *
 * Usage:
 * ```tsx
 * const count = countCommentsWithReplies(thread)
 * ```
 */
export function countCommentsWithReplies(thread: CommentThread): number {
  let count = 1
  if (thread.replies) {
    thread.replies.forEach(reply => {
      count += countCommentsWithReplies(reply)
    })
  }
  return count
}
