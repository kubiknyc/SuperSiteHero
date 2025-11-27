// File: /src/features/documents/components/DocumentComments.tsx
// UI component for document comments with threading support

import { useState } from 'react'
import {
  useDocumentComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  buildCommentTree,
  type CommentThread,
} from '../hooks/useDocumentComments'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MessageSquare, Reply, Edit2, Trash2, Send, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface DocumentCommentsProps {
  documentId: string
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentComments({
  documentId,
  projectId,
  open,
  onOpenChange,
}: DocumentCommentsProps) {
  const { data: comments, isLoading } = useDocumentComments(documentId, { enabled: open })
  const createComment = useCreateComment(documentId, projectId)

  const [newComment, setNewComment] = useState('')

  const commentTree = comments ? buildCommentTree(comments) : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      await createComment.mutateAsync({
        comment_text: newComment.trim(),
        parent_comment_id: null,
      })
      setNewComment('')
      toast.success('Comment added')
    } catch {
      toast.error('Failed to add comment')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Document Comments ({comments?.length || 0})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* New Comment Form */}
          <form onSubmit={handleSubmit} className="space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="min-h-[80px]"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={!newComment.trim() || createComment.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                {createComment.isPending ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </form>

          {/* Comments List */}
          <div className="border-t pt-4">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading comments...
              </div>
            ) : commentTree.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No comments yet</p>
                <p className="text-sm">Be the first to comment on this document</p>
              </div>
            ) : (
              <div className="space-y-4">
                {commentTree.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    documentId={documentId}
                    projectId={projectId}
                    depth={0}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface CommentItemProps {
  comment: CommentThread
  documentId: string
  projectId: string
  depth: number
}

function CommentItem({ comment, documentId, projectId, depth }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isReplying, setIsReplying] = useState(false)
  const [editText, setEditText] = useState(comment.comment_text)
  const [replyText, setReplyText] = useState('')

  const updateComment = useUpdateComment(comment.id, documentId)
  const deleteComment = useDeleteComment(comment.id, documentId)
  const createReply = useCreateComment(documentId, projectId)

  const handleUpdate = async () => {
    if (!editText.trim()) return
    try {
      await updateComment.mutateAsync({ comment_text: editText.trim() })
      setIsEditing(false)
      toast.success('Comment updated')
    } catch {
      toast.error('Failed to update comment')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return
    try {
      await deleteComment.mutateAsync()
      toast.success('Comment deleted')
    } catch {
      toast.error('Failed to delete comment')
    }
  }

  const handleReply = async () => {
    if (!replyText.trim()) return
    try {
      await createReply.mutateAsync({
        comment_text: replyText.trim(),
        parent_comment_id: comment.id,
      })
      setReplyText('')
      setIsReplying(false)
      toast.success('Reply added')
    } catch {
      toast.error('Failed to add reply')
    }
  }

  return (
    <div className={cn('space-y-2', depth > 0 && 'ml-6 pl-4 border-l-2 border-gray-200')}>
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-gray-900">
                {comment.created_by.slice(0, 8)}...
              </span>
              <span className="text-xs text-gray-500">
                {comment.created_at
                  ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })
                  : 'Unknown'}
              </span>
              {comment.updated_at && comment.updated_at !== comment.created_at && (
                <span className="text-xs text-gray-400">(edited)</span>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleUpdate} disabled={updateComment.isPending}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {comment.comment_text}
              </p>
            )}
          </div>

          {!isEditing && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReplying(!isReplying)}
                className="h-7 w-7 p-0"
                title="Reply"
              >
                <Reply className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-7 w-7 p-0"
                title="Edit"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                title="Delete"
                disabled={deleteComment.isPending}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Reply Form */}
        {isReplying && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleReply} disabled={createReply.isPending}>
                <Send className="mr-1 h-3 w-3" />
                Reply
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsReplying(false)}>
                <X className="mr-1 h-3 w-3" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              documentId={documentId}
              projectId={projectId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default DocumentComments
