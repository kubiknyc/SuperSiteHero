// File: /src/pages/notices/NoticeDetailPage.tsx
// Notice detail view page

import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { useNotice, useDeleteNoticeWithNotification } from '@/features/notices/hooks'
import {
  NoticeStatusBadge,
  NoticeTypeBadge,
  ResponseDueIndicator,
  RecordResponseDialog,
  NoticeDocumentUpload,
} from '@/features/notices/components'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  User,
  FileText,
  Trash2,
  Edit,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { isResponseOverdue } from '@/features/notices/types'

export function NoticeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: notice, isLoading, error } = useNotice(id)
  const deleteMutation = useDeleteNoticeWithNotification()

  const handleDelete = async () => {
    if (!notice) {return}

    if (window.confirm('Are you sure you want to delete this notice?')) {
      try {
        await deleteMutation.mutateAsync({
          id: notice.id,
          projectId: notice.project_id,
        })
        navigate('/notices')
      } catch (error) {
        console.error('Failed to delete notice:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    )
  }

  if (error || !notice) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Notice Not Found
              </h3>
              <p className="text-gray-600 mb-6">
                {error?.message || 'The notice you are looking for does not exist.'}
              </p>
              <Link to="/notices">
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Notices
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  const overdue = isResponseOverdue(notice)

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Back button and actions */}
        <div className="flex items-center justify-between">
          <Link to="/notices">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Notices
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {notice.response_required && !notice.response_date && (
              <RecordResponseDialog notice={notice} />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Header Card */}
        <Card
          className={cn(
            'border-l-4',
            notice.is_critical
              ? 'border-l-red-500'
              : overdue
              ? 'border-l-red-400'
              : 'border-l-blue-500'
          )}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {/* Badges row */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {notice.reference_number && (
                    <span className="font-bold text-xl">
                      {notice.reference_number}
                    </span>
                  )}
                  <NoticeTypeBadge type={notice.notice_type} />
                  <NoticeStatusBadge status={notice.status} />
                  {notice.is_critical && (
                    <Badge className="bg-red-100 text-red-800">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Critical
                    </Badge>
                  )}
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
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  {notice.subject}
                </h1>

                {/* Response Due Indicator */}
                {notice.response_required && (
                  <div className="mb-4">
                    <ResponseDueIndicator notice={notice} />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Notice Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">From Party</p>
                  <p className="font-medium">{notice.from_party || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">To Party</p>
                  <p className="font-medium">{notice.to_party || '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Notice Date</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {notice.notice_date
                      ? format(new Date(notice.notice_date), 'MMM d, yyyy')
                      : '—'}
                  </p>
                </div>
                {notice.direction === 'incoming' && (
                  <div>
                    <p className="text-sm text-gray-500">Received Date</p>
                    <p className="font-medium">
                      {notice.received_date
                        ? format(new Date(notice.received_date), 'MMM d, yyyy')
                        : '—'}
                    </p>
                  </div>
                )}
              </div>

              {notice.response_required && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Response Due</p>
                    <p
                      className={cn(
                        'font-medium',
                        overdue && 'text-red-600'
                      )}
                    >
                      {notice.response_due_date
                        ? format(new Date(notice.response_due_date), 'MMM d, yyyy')
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Response Date</p>
                    <p className="font-medium">
                      {notice.response_date
                        ? format(new Date(notice.response_date), 'MMM d, yyyy')
                        : 'Not yet responded'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Notice Document */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Notice Document
                </p>
                {notice.document_url ? (
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <a
                      href={notice.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      View Document
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No document attached</p>
                )}
              </div>

              {/* Response Document */}
              {notice.response_required && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Response Document
                  </p>
                  {notice.response_document_url ? (
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-green-500" />
                      <a
                        href={notice.response_document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        View Response
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No response document attached
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        {notice.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">
                {notice.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {notice.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{notice.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span>
                Created:{' '}
                {notice.created_at
                  ? format(new Date(notice.created_at), 'MMM d, yyyy h:mm a')
                  : '—'}
              </span>
              {notice.updated_at && notice.updated_at !== notice.created_at && (
                <span>
                  Updated:{' '}
                  {format(new Date(notice.updated_at), 'MMM d, yyyy h:mm a')}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
