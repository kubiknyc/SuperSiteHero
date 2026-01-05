/**
 * Toolbox Talk Detail Page
 *
 * Full view of a toolbox talk with:
 * - Talk details and status
 * - Attendance tracking with sign-in
 * - Topic information and talking points
 * - Actions (start, complete, cancel)
 */

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { Button } from '@/components/ui/button'
import {
  TalkStatusBadge,
  AttendanceTracker,
} from '@/features/toolbox-talks/components'
import {
  useToolboxTalkWithDetails,
  useStartToolboxTalk,
  useCompleteToolboxTalk,
  useCancelToolboxTalk,
  useDeleteToolboxTalk,
} from '@/features/toolbox-talks/hooks'
import { TOPIC_CATEGORY_LABELS } from '@/types/toolbox-talks'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  ClipboardList,
  Play,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit,
  FileText,
  AlertTriangle,
  Shield,
  ListChecks,
  MessageSquare,
} from 'lucide-react'

export function ToolboxTalkDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data: talk, isLoading, error } = useToolboxTalkWithDetails(id || '')
  const startTalk = useStartToolboxTalk()
  const completeTalk = useCompleteToolboxTalk()
  const cancelTalk = useCancelToolboxTalk()
  const deleteTalk = useDeleteToolboxTalk()

  if (isLoading) {
    return (
      <SmartLayout title="Toolbox Talk Details">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-4" />
            <div className="h-4 bg-muted rounded w-1/2 mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-card rounded-lg border p-6">
                  <div className="h-6 bg-muted rounded w-1/3 mb-4" />
                  <div className="h-4 bg-muted rounded w-full mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              </div>
              <div className="bg-card rounded-lg border p-6">
                <div className="h-6 bg-muted rounded w-1/2 mb-4" />
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted rounded" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SmartLayout>
    )
  }

  if (error || !talk) {
    return (
      <SmartLayout title="Toolbox Talk Details">
        <div className="p-6">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <h2 className="text-lg font-medium text-foreground heading-section">Talk Not Found</h2>
            <p className="text-muted mt-1">
              The toolbox talk you're looking for doesn't exist or has been deleted.
            </p>
            <Link to="/toolbox-talks">
              <Button className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Toolbox Talks
              </Button>
            </Link>
          </div>
        </div>
      </SmartLayout>
    )
  }

  const topicTitle = talk.topic?.title || talk.custom_topic_title || 'Untitled Topic'
  const categoryLabel = TOPIC_CATEGORY_LABELS[talk.category]

  const handleStart = () => {
    if (confirm('Start this toolbox talk? Attendance tracking will begin.')) {
      startTalk.mutate({ id: talk.id })
    }
  }

  const handleComplete = () => {
    if (confirm('Mark this toolbox talk as completed?')) {
      completeTalk.mutate({
        id: talk.id,
        dto: {
          duration_minutes: talk.duration_minutes || undefined,
        },
      })
    }
  }

  const handleCancel = () => {
    if (confirm('Cancel this toolbox talk?')) {
      cancelTalk.mutate(talk.id)
    }
  }

  const handleDelete = () => {
    deleteTalk.mutate(talk.id, {
      onSuccess: () => navigate('/toolbox-talks'),
    })
    setShowDeleteConfirm(false)
  }

  return (
    <SmartLayout title="Toolbox Talk Details">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <Link
              to="/toolbox-talks"
              className="inline-flex items-center text-sm text-muted hover:text-secondary mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Toolbox Talks
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground heading-page">{talk.talk_number}</h1>
              <TalkStatusBadge status={talk.status} size="md" />
            </div>
            <p className="text-muted mt-1">{topicTitle}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Action buttons based on status */}
            {talk.status === 'scheduled' && (
              <>
                <Button
                  onClick={handleStart}
                  disabled={startTalk.isPending}
                  className="bg-success hover:bg-green-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Talk
                </Button>
                <Link to={`/toolbox-talks/${talk.id}/edit`}>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              </>
            )}

            {talk.status === 'in_progress' && (
              <Button
                onClick={handleComplete}
                disabled={completeTalk.isPending}
                className="bg-success hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete Talk
              </Button>
            )}

            {['scheduled', 'draft', 'in_progress'].includes(talk.status) && (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancelTalk.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}

            <Button
              variant="outline"
              className="text-error hover:text-error-dark hover:bg-error-light"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-medium text-foreground mb-2 heading-subsection">
                Delete Toolbox Talk?
              </h3>
              <p className="text-muted mb-4">
                This will permanently delete {talk.talk_number} and all associated
                attendance records. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-error hover:bg-red-700"
                  onClick={handleDelete}
                  disabled={deleteTalk.isPending}
                >
                  {deleteTalk.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Talk Details */}
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2 heading-section">
                <ClipboardList className="h-5 w-5 text-disabled" />
                Talk Details
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1">
                    Category
                  </label>
                  <span className="text-sm text-foreground">{categoryLabel}</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1">
                    Scheduled Date
                  </label>
                  <span className="flex items-center gap-1 text-sm text-foreground">
                    <Calendar className="h-4 w-4 text-disabled" />
                    {format(new Date(talk.scheduled_date), 'MMMM d, yyyy')}
                  </span>
                </div>

                {talk.scheduled_time && (
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1">
                      Time
                    </label>
                    <span className="flex items-center gap-1 text-sm text-foreground">
                      <Clock className="h-4 w-4 text-disabled" />
                      {talk.scheduled_time}
                    </span>
                  </div>
                )}

                {talk.location && (
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1">
                      Location
                    </label>
                    <span className="flex items-center gap-1 text-sm text-foreground">
                      <MapPin className="h-4 w-4 text-disabled" />
                      {talk.location}
                    </span>
                  </div>
                )}

                {(talk.presenter?.full_name || talk.presenter_name) && (
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1">
                      Presenter
                    </label>
                    <span className="flex items-center gap-1 text-sm text-foreground">
                      <User className="h-4 w-4 text-disabled" />
                      {talk.presenter?.full_name || talk.presenter_name}
                      {talk.presenter_title && (
                        <span className="text-muted">({talk.presenter_title})</span>
                      )}
                    </span>
                  </div>
                )}

                {talk.duration_minutes && (
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1">
                      Duration
                    </label>
                    <span className="text-sm text-foreground">
                      {talk.duration_minutes} minutes
                    </span>
                  </div>
                )}
              </div>

              {/* Conditions */}
              {(talk.weather_conditions || talk.site_conditions) && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="grid grid-cols-2 gap-4">
                    {talk.weather_conditions && (
                      <div>
                        <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1">
                          Weather Conditions
                        </label>
                        <span className="text-sm text-foreground">
                          {talk.weather_conditions}
                        </span>
                      </div>
                    )}
                    {talk.site_conditions && (
                      <div>
                        <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1">
                          Site Conditions
                        </label>
                        <span className="text-sm text-foreground">
                          {talk.site_conditions}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Topic Content */}
            {talk.topic && (
              <div className="bg-card rounded-lg border p-6">
                <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2 heading-section">
                  <FileText className="h-5 w-5 text-disabled" />
                  Topic: {talk.topic.title}
                </h2>

                {talk.topic.description && (
                  <p className="text-sm text-secondary mb-4">{talk.topic.description}</p>
                )}

                {/* Talking Points */}
                {talk.topic.talking_points && talk.topic.talking_points.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-secondary mb-2 flex items-center gap-1 heading-subsection">
                      <ListChecks className="h-4 w-4" />
                      Key Talking Points
                    </h3>
                    <ul className="space-y-1">
                      {talk.topic.talking_points.map((point: string, index: number) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-secondary"
                        >
                          <span className="text-primary mt-1">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Discussion Questions */}
                {talk.topic.discussion_questions &&
                  talk.topic.discussion_questions.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-secondary mb-2 flex items-center gap-1 heading-subsection">
                        <MessageSquare className="h-4 w-4" />
                        Discussion Questions
                      </h3>
                      <ul className="space-y-1">
                        {talk.topic.discussion_questions.map(
                          (question: string, index: number) => (
                            <li
                              key={index}
                              className="flex items-start gap-2 text-sm text-secondary"
                            >
                              <span className="text-success mt-1">?</span>
                              {question}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                {/* OSHA Reference */}
                {talk.topic.osha_standard && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      <Shield className="h-3 w-3" />
                      OSHA Standard: {talk.topic.osha_standard}
                    </span>
                  </div>
                )}

                {/* Certification Notice */}
                {talk.topic.requires_certification && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-800">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Certification Required</span>
                    </div>
                    <p className="text-xs text-primary mt-1">
                      Attendees who complete this talk will receive certification valid
                      for {talk.topic.certification_valid_days} days.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {talk.notes && (
              <div className="bg-card rounded-lg border p-6">
                <h2 className="text-lg font-medium text-foreground mb-4 heading-section">Notes</h2>
                <p className="text-sm text-secondary whitespace-pre-wrap">{talk.notes}</p>
              </div>
            )}

            {/* Hazards Discussed */}
            {talk.hazards_discussed && (
              <div className="bg-card rounded-lg border p-6">
                <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2 heading-section">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Hazards Discussed
                </h2>
                <p className="text-sm text-secondary whitespace-pre-wrap">
                  {talk.hazards_discussed}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar - Attendance */}
          <div className="space-y-6">
            <div className="bg-card rounded-lg border p-6">
              <AttendanceTracker talkId={talk.id} talkStatus={talk.status} />
            </div>

            {/* Completion Stats (for completed talks) */}
            {talk.status === 'completed' && (
              <div className="bg-success-light rounded-lg border border-green-200 p-4">
                <div className="flex items-center gap-2 text-green-800 mb-3">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Talk Completed</span>
                </div>
                <div className="space-y-2 text-sm text-success-dark">
                  {talk.completed_at && (
                    <div>
                      Completed:{' '}
                      {format(new Date(talk.completed_at), 'MMM d, yyyy h:mm a')}
                    </div>
                  )}
                  <div>
                    Attendance: {talk.present_count} of {talk.attendance_count} (
                    {talk.attendance_count > 0
                      ? Math.round((talk.present_count / talk.attendance_count) * 100)
                      : 0}
                    %)
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SmartLayout>
  )
}

export default ToolboxTalkDetailPage
