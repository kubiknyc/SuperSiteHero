// File: /src/features/workflows/components/WorkflowItemCommentsPanel.tsx
// Panel component for displaying and managing workflow item comments

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, MessageSquare, Send, Trash2, Edit2, X, Check } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  useWorkflowItemComments,
  useCreateWorkflowItemComment,
  useUpdateWorkflowItemComment,
  useDeleteWorkflowItemComment,
} from '@/features/workflows/hooks/useWorkflowItemComments'
import type { WorkflowItemComment } from '@/types/database'

interface WorkflowItemCommentsPanelProps {
  workflowItemId: string
}

export function WorkflowItemCommentsPanel({ workflowItemId }: WorkflowItemCommentsPanelProps) {
  const { user } = useAuth()
  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  const { data: comments, isLoading, error } = useWorkflowItemComments(workflowItemId)
  const createComment = useCreateWorkflowItemComment()
  const updateComment = useUpdateWorkflowItemComment()
  const deleteComment = useDeleteWorkflowItemComment()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !user) {return}

    createComment.mutate(
      {
        workflow_item_id: workflowItemId,
        comment: newComment.trim(),
        created_by: user.id,
        mentioned_users: null,
      },
      {
        onSuccess: () => {
          setNewComment('')
        },
      }
    )
  }

  const handleStartEdit = (comment: WorkflowItemComment) => {
    setEditingCommentId(comment.id)
    setEditingText(comment.comment)
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditingText('')
  }

  const handleSaveEdit = (commentId: string) => {
    if (!editingText.trim()) {return}

    updateComment.mutate(
      {
        commentId,
        workflowItemId,
        updates: { comment: editingText.trim() },
      },
      {
        onSuccess: () => {
          setEditingCommentId(null)
          setEditingText('')
        },
      }
    )
  }

  const handleDelete = (commentId: string) => {
    if (confirm('Are you sure you want to delete this comment?')) {
      deleteComment.mutate({ commentId, workflowItemId })
    }
  }

  const canEditOrDelete = (comment: WorkflowItemComment) => {
    return user?.id === comment.created_by
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-disabled" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-error text-sm">Failed to load comments</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Comments
          {comments && comments.length > 0 && (
            <span className="text-sm font-normal text-muted">
              ({comments.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment Form */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!newComment.trim() || createComment.isPending}
              className="gap-2"
            >
              {createComment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Post Comment
            </Button>
          </div>
        </form>

        {/* Comments List */}
        {comments && comments.length > 0 ? (
          <div className="space-y-4 pt-4 border-t">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-surface rounded-lg p-4 space-y-2"
              >
                {editingCommentId === comment.id ? (
                  // Edit Mode
                  <div className="space-y-2">
                    <Textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={3}
                      className="resize-none"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="gap-1"
                      >
                        <X className="h-3 w-3" />
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveEdit(comment.id)}
                        disabled={!editingText.trim() || updateComment.isPending}
                        className="gap-1"
                      >
                        {updateComment.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm text-secondary whitespace-pre-wrap">
                          {comment.comment}
                        </p>
                      </div>
                      {canEditOrDelete(comment) && (
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(comment)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(comment.id)}
                            disabled={deleteComment.isPending}
                            className="h-7 w-7 p-0 text-error hover:text-error-dark hover:bg-error-light"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted">
                      {comment.created_at
                        ? format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')
                        : 'Just now'}
                      {comment.updated_at &&
                        comment.updated_at !== comment.created_at && (
                          <span className="ml-2 italic">(edited)</span>
                        )}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No comments yet</p>
            <p className="text-xs">Be the first to add a comment</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
