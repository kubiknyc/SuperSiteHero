// File: /src/pages/meetings/MeetingDetailPage.tsx
// Meeting detail view with minutes, attendees, action items, and recordings

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  useMeeting,
  useDeleteMeeting,
  useUpdateActionItem,
  useMeetingRecordings,
  useDistributeMinutes,
  useNextMeeting,
  MEETING_TYPES,
  ACTION_ITEM_CATEGORIES,
  ATTENDEE_REPRESENTING,
  type MeetingAttendee,
  type MeetingActionItem,
} from '@/features/meetings/hooks'
import {
  MeetingRecorder,
  RecordingPlayback,
  TranscriptionViewer,
} from '@/features/meetings/components'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Users,
  FileText,
  ListChecks,
  MessageSquare,
  CheckCircle2,
  Circle,
  AlertCircle,
  Download,
  Send,
  Video,
  Mic,
  Loader2,
  CheckCheck,
  Link2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { MeetingActionItemExtractor } from '@/features/summaries/components/MeetingActionItemExtractor'
import type { MeetingRecording } from '@/types/meeting-recordings'
import { useAuth } from '@/lib/auth/AuthContext'
import { logger } from '../../lib/utils/logger';
import { toast } from 'sonner'


export function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const { data: meeting, isLoading, error } = useMeeting(id)
  const { data: recordings, refetch: refetchRecordings } = useMeetingRecordings(id)
  const { data: nextMeeting } = useNextMeeting(id)
  const deleteMeeting = useDeleteMeeting()
  const updateActionItem = useUpdateActionItem()
  const distributeMinutes = useDistributeMinutes()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDistributing, setIsDistributing] = useState(false)
  const [selectedRecording, setSelectedRecording] = useState<MeetingRecording | null>(null)
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0)
  const [seekToTime, setSeekToTime] = useState<number | null>(null)

  // Get meeting type label
  const getMeetingTypeLabel = (type: string) => {
    return MEETING_TYPES.find((t) => t.value === type)?.label || type
  }

  // Handle delete
  const handleDelete = async () => {
    if (!id) {return}
    try {
      await deleteMeeting.mutateAsync(id)
      navigate('/meetings')
    } catch (err) {
      logger.error('Failed to delete meeting:', err)
    }
  }

  // Handle distribute minutes
  const handleDistributeMinutes = async () => {
    if (!id || !meeting) {return}

    // Check if we have attendees with emails
    const attendeesWithEmails = (meeting.attendees as MeetingAttendee[] | null)?.filter(
      (a) => a.email && a.email.trim() !== ''
    ) || []

    if (attendeesWithEmails.length === 0) {
      toast.error('No attendees with email addresses found. Add attendee emails to distribute minutes.')
      return
    }

    setIsDistributing(true)
    try {
      await distributeMinutes.mutateAsync(id)
      toast.success(`Meeting minutes distributed to ${attendeesWithEmails.length} attendee(s)`)
    } catch (err) {
      logger.error('Failed to distribute minutes:', err)
      toast.error('Failed to distribute meeting minutes')
    } finally {
      setIsDistributing(false)
    }
  }

  // Toggle action item completion
  const handleToggleActionItem = async (actionItem: MeetingActionItem) => {
    if (!id) {return}
    const newStatus = actionItem.status === 'completed' ? 'open' : 'completed'
    await updateActionItem.mutateAsync({
      meetingId: id,
      actionItemId: actionItem.id,
      updates: {
        status: newStatus,
        completedDate: newStatus === 'completed' ? new Date().toISOString() : undefined,
      },
    })
  }

  // Get action item status icon
  const getActionItemIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-success" />
      case 'in_progress':
        return <AlertCircle className="h-5 w-5 text-warning" />
      default:
        return <Circle className="h-5 w-5 text-disabled" />
    }
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 text-center">
          <p className="text-muted">Loading meeting details...</p>
        </div>
      </AppLayout>
    )
  }

  if (error || !meeting) {
    return (
      <AppLayout>
        <div className="p-6 text-center">
          <p className="text-error">Failed to load meeting</p>
          <Button variant="outline" onClick={() => navigate('/meetings')} className="mt-4">
            Back to Meetings
          </Button>
        </div>
      </AppLayout>
    )
  }

  const attendees = meeting.attendees as MeetingAttendee[] | null
  const actionItems = meeting.action_items as MeetingActionItem[] | null

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/meetings')}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Meetings
            </Button>
            <h1 className="text-3xl font-bold text-foreground heading-page">
              {meeting.meeting_name || getMeetingTypeLabel(meeting.meeting_type)}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline">{getMeetingTypeLabel(meeting.meeting_type)}</Badge>
              {meeting.projects && (
                <Link
                  to={`/projects/${meeting.projects.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  {meeting.projects.name}
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDistributeMinutes}
              disabled={isDistributing}
            >
              {isDistributing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : meeting.minutes_distributed_at ? (
                <CheckCheck className="h-4 w-4 mr-1" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              {isDistributing ? 'Sending...' : meeting.minutes_distributed_at ? 'Re-distribute' : 'Distribute'}
            </Button>
            <Link to={`/meetings/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <Card className="border-red-200 bg-error-light">
            <CardContent className="p-4">
              <p className="text-red-800 mb-4">
                Are you sure you want to delete this meeting? This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  Yes, Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Meeting Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Meeting Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted">Date</p>
                    <p className="text-foreground">
                      {format(parseISO(meeting.meeting_date), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                  {meeting.meeting_time && (
                    <div>
                      <p className="text-sm font-medium text-muted">Time</p>
                      <p className="text-foreground">{meeting.meeting_time}</p>
                    </div>
                  )}
                  {meeting.duration_minutes && (
                    <div>
                      <p className="text-sm font-medium text-muted">Duration</p>
                      <p className="text-foreground">{meeting.duration_minutes} minutes</p>
                    </div>
                  )}
                  {meeting.location && (
                    <div>
                      <p className="text-sm font-medium text-muted">Location</p>
                      <p className="text-foreground flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-disabled" />
                        {meeting.location}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Agenda */}
            {meeting.agenda && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Agenda
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-secondary">
                      {meeting.agenda}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Discussion Notes / Minutes */}
            {meeting.discussion_notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Meeting Minutes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-secondary">
                      {meeting.discussion_notes}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Decisions */}
            {meeting.decisions && (
              <Card>
                <CardHeader>
                  <CardTitle>Key Decisions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-secondary">
                      {meeting.decisions}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Action Items
                </CardTitle>
                <CardDescription>
                  {actionItems?.length || 0} action item{actionItems?.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {actionItems && actionItems.length > 0 ? (
                  <div className="space-y-3">
                    {actionItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-surface"
                      >
                        <button
                          onClick={() => handleToggleActionItem(item)}
                          className="mt-0.5"
                        >
                          {getActionItemIcon(item.status)}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p
                              className={`text-foreground ${
                                item.status === 'completed' ? 'line-through text-muted' : ''
                              }`}
                            >
                              {item.description}
                            </p>
                            {item.priority && (
                              <Badge
                                variant={
                                  item.priority === 'high'
                                    ? 'destructive'
                                    : item.priority === 'medium'
                                    ? 'default'
                                    : 'secondary'
                                }
                                className="text-xs"
                              >
                                {item.priority}
                              </Badge>
                            )}
                            {item.category && (
                              <Badge variant="outline" className="text-xs">
                                {ACTION_ITEM_CATEGORIES.find((c) => c.value === item.category)?.label || item.category}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                            {item.assignee && (
                              <span>
                                Assigned to: {item.assignee}
                                {item.assignee_company && ` (${item.assignee_company})`}
                              </span>
                            )}
                            {item.dueDate && (
                              <span>Due: {format(parseISO(item.dueDate), 'MMM d, yyyy')}</span>
                            )}
                            {item.completedDate && (
                              <span className="text-success">
                                Completed: {format(parseISO(item.completedDate), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                          {(item.cost_impact || item.schedule_impact) && (
                            <div className="flex items-center gap-2 mt-1 text-xs">
                              {item.cost_impact && (
                                <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                                  Cost Impact
                                </span>
                              )}
                              {item.schedule_impact && (
                                <span className="text-primary bg-blue-50 px-2 py-0.5 rounded">
                                  Schedule Impact
                                  {item.schedule_impact_days && ` (${item.schedule_impact_days} days)`}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant={
                            item.status === 'completed'
                              ? 'success'
                              : item.status === 'in_progress'
                              ? 'default'
                              : item.status === 'cancelled'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {item.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-center py-4">
                    No action items recorded for this meeting.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Meeting Recordings Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Recordings & Transcriptions
                </CardTitle>
                <CardDescription>
                  {recordings?.length || 0} recording{recordings?.length !== 1 ? 's' : ''} available
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Recording Controls */}
                {meeting.project_id && userProfile?.company_id && (
                  <MeetingRecorder
                    meetingId={meeting.id}
                    projectId={meeting.project_id}
                    companyId={userProfile.company_id}
                    onRecordingComplete={(recording) => {
                      refetchRecordings()
                      setSelectedRecording(recording)
                    }}
                  />
                )}

                {/* Existing Recordings */}
                {recordings && recordings.length > 0 && (
                  <div className="space-y-4 mt-4">
                    <h4 className="text-sm font-medium text-secondary heading-card">Saved Recordings</h4>

                    {/* Recording Tabs */}
                    <Tabs
                      value={selectedRecording?.id || recordings[0]?.id}
                      onValueChange={(value) => {
                        const rec = recordings.find((r) => r.id === value)
                        if (rec) {setSelectedRecording(rec)}
                      }}
                    >
                      <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted p-1">
                        {recordings.map((rec, index) => (
                          <TabsTrigger
                            key={rec.id}
                            value={rec.id}
                            className="flex items-center gap-1.5 text-xs"
                          >
                            {rec.recording_type === 'audio' ? (
                              <Mic className="h-3 w-3" />
                            ) : (
                              <Video className="h-3 w-3" />
                            )}
                            Recording {index + 1}
                            {rec.transcription_status === 'completed' && (
                              <Badge variant="success" className="h-4 text-[10px] px-1">
                                Transcribed
                              </Badge>
                            )}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {recordings.map((rec) => (
                        <TabsContent key={rec.id} value={rec.id} className="mt-4 space-y-4">
                          {/* Playback */}
                          <RecordingPlayback
                            recording={rec}
                            onTimeUpdate={setCurrentPlaybackTime}
                            seekToTime={selectedRecording?.id === rec.id ? seekToTime : null}
                          />

                          {/* Transcription */}
                          <TranscriptionViewer
                            recording={rec}
                            currentTimeMs={currentPlaybackTime}
                            onSeekToTime={(timeMs) => {
                              setSeekToTime(timeMs)
                              // Reset after a brief delay to allow re-seeking to same time
                              setTimeout(() => setSeekToTime(null), 100)
                            }}
                          />

                          {/* Recording Info */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted pt-2 border-t">
                            <span>
                              Recorded: {format(parseISO(rec.recorded_at), 'MMM d, yyyy h:mm a')}
                            </span>
                            {rec.duration_seconds && (
                              <span>
                                Duration: {Math.floor(rec.duration_seconds / 60)}m{' '}
                                {rec.duration_seconds % 60}s
                              </span>
                            )}
                            <span>
                              Size: {(rec.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {rec.recording_type}
                            </Badge>
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>
                )}

                {/* Empty State */}
                {(!recordings || recordings.length === 0) && !meeting.project_id && (
                  <div className="text-center py-6 text-muted">
                    <Video className="h-10 w-10 mx-auto mb-2 text-disabled" />
                    <p>No recordings yet</p>
                    <p className="text-xs mt-1">
                      Start a recording to capture audio, video, or screen share
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Action Item Extractor */}
            {meeting.discussion_notes && (
              <MeetingActionItemExtractor meetingId={meeting.id} />
            )}

            {/* Linked Meetings */}
            {(meeting.previous_meeting_id || nextMeeting) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Linked Meetings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Previous Meeting */}
                  {meeting.previous_meeting_id && (meeting as any).previous_meeting && (
                    <Link
                      to={`/meetings/${meeting.previous_meeting_id}`}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-surface transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Previous Meeting</p>
                        <p className="font-medium text-sm truncate">
                          {(meeting as any).previous_meeting.title ||
                            MEETING_TYPES.find(t => t.value === (meeting as any).previous_meeting.meeting_type)?.label}
                        </p>
                        <p className="text-xs text-muted">
                          {format(parseISO((meeting as any).previous_meeting.meeting_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </Link>
                  )}

                  {/* Next Meeting */}
                  {nextMeeting && (
                    <Link
                      to={`/meetings/${nextMeeting.id}`}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-surface transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Next Meeting</p>
                        <p className="font-medium text-sm truncate">
                          {nextMeeting.title ||
                            MEETING_TYPES.find(t => t.value === nextMeeting.meeting_type)?.label}
                        </p>
                        <p className="text-xs text-muted">
                          {format(parseISO(nextMeeting.meeting_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Attendees */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Attendees
                </CardTitle>
                <CardDescription>
                  {attendees?.length || 0} attendee{attendees?.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {attendees && attendees.length > 0 ? (
                  <div className="space-y-3">
                    {attendees.map((attendee, index) => (
                      <div key={index} className="p-3 border rounded-lg hover:bg-surface">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              attendee.present !== false ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-foreground">{attendee.name}</p>
                              {attendee.required && (
                                <Badge variant="outline" className="text-xs">Required</Badge>
                              )}
                              {attendee.representing && (
                                <Badge variant="secondary" className="text-xs">
                                  {ATTENDEE_REPRESENTING.find(r => r.value === attendee.representing)?.label || attendee.representing}
                                </Badge>
                              )}
                            </div>
                            {attendee.title && (
                              <p className="text-sm text-secondary">{attendee.title}</p>
                            )}
                            {attendee.company && (
                              <p className="text-sm text-muted">{attendee.company}</p>
                            )}
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted">
                              {attendee.role && <span>Role: {attendee.role}</span>}
                              {attendee.trade && <span>Trade: {attendee.trade}</span>}
                              {attendee.email && <span>{attendee.email}</span>}
                              {attendee.phone && <span>{attendee.phone}</span>}
                            </div>
                            {attendee.signature && (
                              <p className="text-xs text-success mt-1">✓ Signed</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-center py-4">No attendees recorded.</p>
                )}
              </CardContent>
            </Card>

            {/* Distribution List */}
            {meeting.distributed_to && meeting.distributed_to.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Distributed To
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {meeting.distributed_to.map((email, index) => (
                      <p key={index} className="text-sm text-secondary">
                        {email}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {meeting.created_at && (
                  <div>
                    <p className="text-muted">Created</p>
                    <p className="text-foreground">
                      {format(parseISO(meeting.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}
                {meeting.updated_at && (
                  <div>
                    <p className="text-muted">Last Updated</p>
                    <p className="text-foreground">
                      {format(parseISO(meeting.updated_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}
                {meeting.minutes_distributed_at && (
                  <div>
                    <p className="text-muted">Minutes Distributed</p>
                    <p className="text-foreground flex items-center gap-1">
                      <CheckCheck className="h-4 w-4 text-success" />
                      {format(parseISO(meeting.minutes_distributed_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}
                {meeting.minutes_pdf_url && (
                  <div>
                    <a
                      href={meeting.minutes_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Download className="h-4 w-4" />
                      Download Minutes PDF
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
