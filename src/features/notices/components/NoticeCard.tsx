// File: /src/features/notices/components/NoticeCard.tsx
// Individual notice card component for list views

import { memo } from 'react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, AlertTriangle, ArrowUpRight, ArrowDownLeft, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NoticeStatusBadge } from './NoticeStatusBadge'
import { NoticeTypeBadge } from './NoticeTypeBadge'
import { ResponseDueIndicator } from './ResponseDueIndicator'
import type { Notice } from '../types'
import { isResponseOverdue, getDaysUntilDue } from '../types'

interface NoticeCardProps {
  notice: Notice
}

function NoticeCardComponent({ notice }: NoticeCardProps) {
  const overdue = isResponseOverdue(notice)
  const daysUntilDue = getDaysUntilDue(notice)
  const isUrgent = overdue || (daysUntilDue !== null && daysUntilDue <= 3)

  // Determine left border color based on priority/urgency
  const getBorderColor = () => {
    if (notice.is_critical) {return 'border-l-red-500'}
    if (overdue) {return 'border-l-red-400'}
    if (daysUntilDue !== null && daysUntilDue <= 3) {return 'border-l-orange-400'}
    if (daysUntilDue !== null && daysUntilDue <= 7) {return 'border-l-yellow-400'}
    return 'border-l-blue-400'
  }

  return (
    <Card
      className={cn(
        'p-4 hover:shadow-md transition-shadow border-l-4',
        getBorderColor()
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header row with reference, type, status */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {notice.reference_number && (
              <span className="font-semibold text-lg">
                {notice.reference_number}
              </span>
            )}
            <NoticeTypeBadge type={notice.notice_type} />
            <NoticeStatusBadge status={notice.status} />
            {notice.is_critical && (
              <Badge className="bg-error-light text-red-800">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Critical
              </Badge>
            )}
            {/* Direction indicator */}
            <Badge variant="outline" className="gap-1">
              {notice.direction === 'outgoing' ? (
                <>
                  <ArrowUpRight className="w-3 h-3" />
                  Sent
                </>
              ) : (
                <>
                  <ArrowDownLeft className="w-3 h-3" />
                  Received
                </>
              )}
            </Badge>
          </div>

          {/* Subject */}
          <h3 className="font-medium text-foreground mb-2 line-clamp-2 heading-subsection">
            {notice.subject}
          </h3>

          {/* Description preview */}
          {notice.description && (
            <p className="text-sm text-secondary mb-3 line-clamp-2">
              {notice.description}
            </p>
          )}

          {/* Metadata row */}
          <div className="flex items-center gap-4 flex-wrap text-sm text-secondary">
            {notice.from_party && (
              <span>
                <span className="text-muted">From:</span> {notice.from_party}
              </span>
            )}
            {notice.to_party && (
              <span>
                <span className="text-muted">To:</span> {notice.to_party}
              </span>
            )}
            <span>
              <span className="text-muted">Date:</span>{' '}
              {notice.notice_date
                ? format(new Date(notice.notice_date), 'MMM d, yyyy')
                : 'N/A'}
            </span>
            {notice.document_url && (
              <span className="flex items-center gap-1 text-primary">
                <Paperclip className="w-3 h-3" />
                Attachment
              </span>
            )}
          </div>

          {/* Response due indicator */}
          {notice.response_required && (
            <div className="mt-2">
              <ResponseDueIndicator notice={notice} />
            </div>
          )}
        </div>

        {/* View button */}
        <Link to={`/notices/${notice.id}`}>
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
        </Link>
      </div>
    </Card>
  )
}

export const NoticeCard = memo(NoticeCardComponent)
