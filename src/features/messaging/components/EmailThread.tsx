/**
 * EmailThread Component
 *
 * Displays email thread conversation view:
 * - Email messages in chronological order
 * - Expandable message bodies
 * - Attachment display
 * - Entity links sidebar
 * - Reply/forward actions
 */

import { useState } from 'react'
import { format } from 'date-fns'
import DOMPurify from 'dompurify'
import {
  ArrowLeft,
  Reply,
  Forward,
  Star,
  Archive,
  Trash2,
  Paperclip,
  Link2,
  ChevronDown,
  ChevronUp,
  Download,
  MoreHorizontal,
  Loader2,
  Mail,
  Building,
  HelpCircle,
  FileCheck,
  FileEdit,
} from 'lucide-react'
import {
  Button,
  Badge,
  Card,
  CardContent,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useEmailThread,
  useUpdateEmailThread,
  useMarkEmailAsRead,
  useMoveEmailToFolder,
  useEmailEntityLinks,
} from '../hooks/useEmails'
import { cn } from '@/lib/utils'
import {
  formatParticipants,
  formatFileSize,
  getParticipantInitials,
  LINKABLE_ENTITY_CONFIG,
  type Email,
  type EmailEntityLink,
  type EmailAttachment,
} from '@/types/email'

interface EmailThreadProps {
  threadId: string
  onBack?: () => void
  onReply?: (email: Email) => void
  onForward?: (email: Email) => void
  onLinkEntity?: (email: Email) => void
  className?: string
}

export function EmailThreadView({
  threadId,
  onBack,
  onReply,
  onForward,
  onLinkEntity,
  className,
}: EmailThreadProps) {
  const [expandedEmailIds, setExpandedEmailIds] = useState<Set<string>>(new Set())

  // Fetch thread with emails
  const { data: thread, isLoading, error } = useEmailThread(threadId)

  // Mutations
  const updateThread = useUpdateEmailThread()
  const markAsRead = useMarkEmailAsRead()
  const moveToFolder = useMoveEmailToFolder()

  // Toggle email expansion
  const toggleEmailExpanded = (emailId: string) => {
    setExpandedEmailIds((prev) => {
      const next = new Set(prev)
      if (next.has(emailId)) {
        next.delete(emailId)
      } else {
        next.add(emailId)
        // Mark as read when expanded
        markAsRead.mutate({ emailId, isRead: true })
      }
      return next
    })
  }

  const handleStar = () => {
    if (thread) {
      updateThread.mutate({
        threadId: thread.id,
        updates: { is_starred: !thread.is_starred },
      })
    }
  }

  const handleArchive = () => {
    if (thread) {
      updateThread.mutate({
        threadId: thread.id,
        updates: { is_archived: !thread.is_archived },
      })
    }
  }

  const handleDelete = () => {
    if (thread) {
      updateThread.mutate({
        threadId: thread.id,
        updates: { folder: 'trash' },
      })
      onBack?.()
    }
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-64', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !thread) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-64 text-muted-foreground', className)}>
        <Mail className="h-8 w-8 mb-2" />
        <p>Email thread not found</p>
        {onBack && (
          <Button variant="link" onClick={onBack} className="mt-2">
            Go back
          </Button>
        )}
      </div>
    )
  }

  const emails = thread.emails || []
  const latestEmail = emails[emails.length - 1]

  // Auto-expand the latest email
  if (latestEmail && !expandedEmailIds.has(latestEmail.id) && expandedEmailIds.size === 0) {
    setExpandedEmailIds(new Set([latestEmail.id]))
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="border-b p-4 flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate heading-section">{thread.subject}</h2>
          <p className="text-sm text-muted-foreground">
            {thread.message_count} message{thread.message_count !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleStar}>
                  <Star
                    className={cn(
                      'h-4 w-4',
                      thread.is_starred && 'fill-yellow-400 text-yellow-400'
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{thread.is_starred ? 'Remove star' : 'Star thread'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleArchive}>
                  <Archive className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{thread.is_archived ? 'Unarchive' : 'Archive'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onLinkEntity?.(latestEmail!)}>
                <Link2 className="h-4 w-4 mr-2" />
                Link to project/RFI
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => moveToFolder.mutate({ emailId: latestEmail!.id, folder: 'spam' })}>
                Mark as spam
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Email Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {emails.map((email, index) => (
          <EmailMessage
            key={email.id}
            email={email}
            isExpanded={expandedEmailIds.has(email.id)}
            isLatest={index === emails.length - 1}
            onToggleExpand={() => toggleEmailExpanded(email.id)}
            onReply={() => onReply?.(email)}
            onForward={() => onForward?.(email)}
            onLinkEntity={() => onLinkEntity?.(email)}
          />
        ))}
      </div>

      {/* Quick Reply Bar */}
      <div className="border-t p-4 flex items-center gap-2">
        <Button onClick={() => onReply?.(latestEmail!)} className="flex-1">
          <Reply className="h-4 w-4 mr-2" />
          Reply
        </Button>
        <Button variant="outline" onClick={() => onForward?.(latestEmail!)}>
          <Forward className="h-4 w-4 mr-2" />
          Forward
        </Button>
      </div>
    </div>
  )
}

// Individual email message component
interface EmailMessageProps {
  email: Email
  isExpanded: boolean
  isLatest: boolean
  onToggleExpand: () => void
  onReply: () => void
  onForward: () => void
  onLinkEntity: () => void
}

function EmailMessage({
  email,
  isExpanded,
  isLatest: _isLatest,
  onToggleExpand,
  onReply,
  onForward,
  onLinkEntity,
}: EmailMessageProps) {
  // Fetch entity links for this email
  const { data: entityLinks } = useEmailEntityLinks(email.id)

  const sanitizedHtml = email.body_html
    ? DOMPurify.sanitize(email.body_html, {
        ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'span', 'div', 'table', 'tr', 'td', 'th', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        ALLOWED_ATTR: ['href', 'class', 'style', 'target'],
      })
    : null

  return (
    <Card className={cn(!email.is_read && 'border-blue-200 bg-blue-50/30 dark:bg-blue-950/10')}>
      {/* Email Header - Always Visible */}
      <div
        onClick={onToggleExpand}
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 text-primary text-sm font-medium flex-shrink-0">
            {getParticipantInitials({ email: email.from_address, name: email.from_name || '' })}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium truncate">
                {email.from_name || email.from_address}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(email.date_sent), 'MMM d, yyyy h:mm a')}
              </span>
              {!email.is_read && (
                <Badge variant="default" className="ml-auto">New</Badge>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              To: {formatParticipants(email.to_addresses)}
              {email.cc_addresses.length > 0 && (
                <span className="ml-2">CC: {formatParticipants(email.cc_addresses)}</span>
              )}
            </div>

            {/* Collapsed Preview */}
            {!isExpanded && (
              <div className="text-sm text-muted-foreground mt-2 truncate">
                {email.snippet}
              </div>
            )}
          </div>

          {/* Expand/Collapse Icon */}
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <CardContent className="pt-0">
          {/* Entity Links */}
          {entityLinks && entityLinks.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {entityLinks.map((link) => (
                <EntityLinkBadge key={link.id} link={link} />
              ))}
            </div>
          )}

          {/* Email Body */}
          <div className="border-t pt-4">
            {sanitizedHtml ? (
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm font-sans">
                {email.body_text || '(No content)'}
              </pre>
            )}
          </div>

          {/* Attachments */}
          {email.has_attachments && email.attachments.length > 0 && (
            <div className="border-t mt-4 pt-4">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2 heading-card">
                <Paperclip className="h-4 w-4" />
                Attachments ({email.attachments.length})
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {email.attachments.map((attachment, index) => (
                  <AttachmentItem key={index} attachment={attachment} />
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="border-t mt-4 pt-4 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onReply}>
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </Button>
            <Button variant="outline" size="sm" onClick={onForward}>
              <Forward className="h-4 w-4 mr-2" />
              Forward
            </Button>
            <Button variant="outline" size="sm" onClick={onLinkEntity}>
              <Link2 className="h-4 w-4 mr-2" />
              Link
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// Attachment item component
function AttachmentItem({ attachment }: { attachment: EmailAttachment }) {
  return (
    <div className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted/50 transition-colors">
      <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{attachment.name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
      </div>
      <Button variant="ghost" size="icon" className="flex-shrink-0">
        <Download className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Entity icon component that renders the appropriate icon based on entity type
interface EntityIconProps {
  entityType: string
  className?: string
}

function EntityIcon({ entityType, className }: EntityIconProps) {
  switch (entityType) {
    case 'project':
      return <Building className={className} />
    case 'rfi':
      return <HelpCircle className={className} />
    case 'submittal':
      return <FileCheck className={className} />
    case 'change_order':
      return <FileEdit className={className} />
    default:
      return <Link2 className={className} />
  }
}

// Entity link badge component
function EntityLinkBadge({ link }: { link: EmailEntityLink }) {
  const config = LINKABLE_ENTITY_CONFIG[link.entity_type]

  return (
    <Badge variant="secondary" className="flex items-center gap-1">
      <EntityIcon entityType={link.entity_type} className="h-3 w-3" />
      <span>{config.label}</span>
      {link.entity?.name && <span>: {link.entity.name}</span>}
      {link.link_type === 'ai_suggested' && (
        <span className="text-xs text-muted-foreground">(suggested)</span>
      )}
    </Badge>
  )
}

export default EmailThreadView
