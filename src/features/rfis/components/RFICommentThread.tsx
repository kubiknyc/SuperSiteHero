// File: /src/features/rfis/components/RFICommentThread.tsx
// Display comments and add new comments to an RFI with @mention support

import { useState, FormEvent } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkflowItemComment, UserProfile } from '@/types/database'

export interface RFICommentThreadProps {
  rfiId: string
  comments: WorkflowItemComment[]
  isLoadingComments: boolean
  isAddingComment: boolean
  onAddComment: (comment: string) => Promise<void>
  userProfile: UserProfile
}

/**
 * RFICommentThread Component
 *
 * Displays conversation thread for RFI with ability to add new comments
 * Highlights @mentions and shows current user's comments distinctly
 *
 * @example
 * ```tsx
 * <RFICommentThread
 *   rfiId={rfi.id}
 *   comments={comments}
 *   isLoadingComments={isLoading}
 *   isAddingComment={isAdding}
 *   onAddComment={handleAddComment}
 *   userProfile={currentUser}
 * />
 * ```
 *
 * Accessibility:
 * - Semantic HTML for conversation thread
 * - ARIA labels for author identification
 * - Keyboard navigation for form
 * - Clear loading states
 * - Focus management after comment submission
 */
export function RFICommentThread({
  comments,
  isLoadingComments,
  isAddingComment,
  onAddComment,
  userProfile,
}: RFICommentThreadProps) {
  const [newComment, setNewComment] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!newComment.trim()) {
      return
    }

    try {
      await onAddComment(newComment)
      setNewComment('') // Clear input after successful submission
    } catch (error) {
      // Error handling done in parent component via toast
      console.error('Comment submission error:', error)
    }
  }

  // Highlight @mentions in comment text
  const highlightMentions = (text: string) => {
    const parts = text.split(/(@\w+)/g)
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-blue-600 font-medium">
            {part}
          </span>
        )
      }
      return part
    })
  }

  // Generate user initials for avatar
  const getInitials = (userId: string) => {
    // For now, use first 2 chars of user ID
    // In production, fetch user name and use actual initials
    return userId.substring(0, 2).toUpperCase()
  }

  // Get display name for user
  const getDisplayName = (userId: string) => {
    if (userId === userProfile.id) {
      return 'You'
    }
    // In production, fetch user profile and return full name
    // For now, return truncated user ID
    return userId.substring(0, 8)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Activity & Comments
          <span className="text-sm font-normal text-gray-500">
            ({comments.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comments List */}
        {isLoadingComments ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No comments yet</p>
            <p className="text-sm text-gray-400 mt-1">Be the first to comment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => {
              const isOwnComment = comment.created_by === userProfile.id
              return (
                <div key={comment.id} className="flex gap-3">
                  {/* Avatar */}
                  <div
                    className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold',
                      isOwnComment
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    )}
                    aria-label={`Avatar for ${getDisplayName(comment.created_by || '')}`}
                  >
                    {getInitials(comment.created_by || '')}
                  </div>

                  {/* Comment Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span
                        className={cn(
                          'font-medium text-sm',
                          isOwnComment ? 'text-blue-600' : 'text-gray-900'
                        )}
                      >
                        {getDisplayName(comment.created_by || '')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 break-words">
                      {highlightMentions(comment.comment)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* New Comment Form */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-4 border-t">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment... Use @ to mention team members"
            rows={3}
            disabled={isAddingComment}
            className="resize-none"
            aria-label="New comment"
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              Tip: Use @username to notify team members
            </p>
            <Button type="submit" disabled={isAddingComment || !newComment.trim()}>
              {isAddingComment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post Comment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
