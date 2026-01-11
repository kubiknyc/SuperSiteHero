/**
 * Training Records Component
 *
 * Manages training sessions, attendees, sign-in, and certificate generation.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  useTrainingSessions,
  useTrainingSession,
  useCreateTrainingSession,
  useUpdateTrainingSession,
  useCompleteTrainingSession,
  useAddTrainingAttendee,
  useSignInAttendee,
  useGenerateCertificate,
  useRemoveTrainingAttendee,
  useTrainingStatistics,
} from '../hooks/useTrainingRecords'
import {
  TRAINING_SESSION_TYPES,
  TRAINING_SESSION_STATUSES,
  type TrainingSessionWithDetails,
  type TrainingAttendee,
  type TrainingSessionType,
  type TrainingSessionStatus,
} from '@/types/closeout-extended'
import {
  GraduationCap,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  FileText,
  Award,
  CheckCircle2,
  Circle,
  Loader2,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  Pen,
  Download,
  Play,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface TrainingRecordsProps {
  projectId: string
  className?: string
}

export function TrainingRecords({ projectId, className }: TrainingRecordsProps) {
  const [showAddSession, setShowAddSession] = React.useState(false)
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null)
  const [showAddAttendee, setShowAddAttendee] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState('scheduled')

  // Form state for new session
  const [sessionForm, setSessionForm] = React.useState({
    title: '',
    description: '',
    session_type: '' as TrainingSessionType | '',
    scheduled_date: '',
    scheduled_start_time: '',
    scheduled_end_time: '',
    location: '',
    trainer_name: '',
    trainer_company: '',
    trainer_email: '',
  })

  // Form state for new attendee
  const [attendeeForm, setAttendeeForm] = React.useState({
    attendee_name: '',
    attendee_email: '',
    attendee_phone: '',
    attendee_company: '',
    attendee_title: '',
  })

  // Queries
  const { data: sessions = [], isLoading } = useTrainingSessions(projectId)
  const { data: selectedSession } = useTrainingSession(selectedSessionId || undefined)
  const { data: statistics } = useTrainingStatistics(projectId)

  // Mutations
  const createSession = useCreateTrainingSession()
  const updateSession = useUpdateTrainingSession()
  const completeSession = useCompleteTrainingSession()
  const addAttendee = useAddTrainingAttendee()
  const signInAttendee = useSignInAttendee()
  const generateCertificate = useGenerateCertificate()
  const removeAttendee = useRemoveTrainingAttendee()

  // Filter sessions by status
  const scheduledSessions = sessions.filter((s) => s.status === 'scheduled' || s.status === 'rescheduled')
  const completedSessions = sessions.filter((s) => s.status === 'completed')
  const cancelledSessions = sessions.filter((s) => s.status === 'cancelled')

  // Reset session form
  const resetSessionForm = () => {
    setSessionForm({
      title: '',
      description: '',
      session_type: '',
      scheduled_date: '',
      scheduled_start_time: '',
      scheduled_end_time: '',
      location: '',
      trainer_name: '',
      trainer_company: '',
      trainer_email: '',
    })
    setShowAddSession(false)
  }

  // Reset attendee form
  const resetAttendeeForm = () => {
    setAttendeeForm({
      attendee_name: '',
      attendee_email: '',
      attendee_phone: '',
      attendee_company: '',
      attendee_title: '',
    })
    setShowAddAttendee(false)
  }

  // Handle add session
  const handleAddSession = async () => {
    if (!sessionForm.title.trim()) {
      toast.error('Please enter a session title')
      return
    }

    try {
      await createSession.mutateAsync({
        project_id: projectId,
        title: sessionForm.title.trim(),
        description: sessionForm.description.trim() || undefined,
        session_type: sessionForm.session_type || undefined,
        scheduled_date: sessionForm.scheduled_date || undefined,
        scheduled_start_time: sessionForm.scheduled_start_time || undefined,
        scheduled_end_time: sessionForm.scheduled_end_time || undefined,
        location: sessionForm.location.trim() || undefined,
        trainer_name: sessionForm.trainer_name.trim() || undefined,
        trainer_company: sessionForm.trainer_company.trim() || undefined,
        trainer_email: sessionForm.trainer_email.trim() || undefined,
      })
      toast.success('Training session created')
      resetSessionForm()
    } catch {
      toast.error('Failed to create session')
    }
  }

  // Handle add attendee
  const handleAddAttendee = async () => {
    if (!selectedSessionId || !attendeeForm.attendee_name.trim()) {
      toast.error('Please enter attendee name')
      return
    }

    try {
      await addAttendee.mutateAsync({
        training_session_id: selectedSessionId,
        attendee_name: attendeeForm.attendee_name.trim(),
        attendee_email: attendeeForm.attendee_email.trim() || undefined,
        attendee_phone: attendeeForm.attendee_phone.trim() || undefined,
        attendee_company: attendeeForm.attendee_company.trim() || undefined,
        attendee_title: attendeeForm.attendee_title.trim() || undefined,
      })
      toast.success('Attendee added')
      resetAttendeeForm()
    } catch {
      toast.error('Failed to add attendee')
    }
  }

  // Handle sign in
  const handleSignIn = async (attendeeId: string) => {
    try {
      await signInAttendee.mutateAsync({ id: attendeeId })
      toast.success('Attendee signed in')
    } catch {
      toast.error('Failed to sign in attendee')
    }
  }

  // Handle complete session
  const handleCompleteSession = async (sessionId: string) => {
    try {
      await completeSession.mutateAsync({ id: sessionId })
      toast.success('Session marked as complete')
    } catch {
      toast.error('Failed to complete session')
    }
  }

  // Handle generate certificate
  const handleGenerateCertificate = async (attendee: TrainingAttendee) => {
    // In a real implementation, this would call a certificate generation service
    const certificateNumber = `CERT-${Date.now()}`
    const certificateUrl = `/certificates/${certificateNumber}.pdf` // Placeholder

    try {
      await generateCertificate.mutateAsync({
        id: attendee.id,
        certificateUrl,
        certificateNumber,
      })
      toast.success('Certificate generated')
    } catch {
      toast.error('Failed to generate certificate')
    }
  }

  // Handle remove attendee
  const handleRemoveAttendee = async (attendeeId: string) => {
    if (!confirm('Remove this attendee?')) {return}

    try {
      await removeAttendee.mutateAsync(attendeeId)
      toast.success('Attendee removed')
    } catch {
      toast.error('Failed to remove attendee')
    }
  }

  // Get status badge
  const getStatusBadge = (status: TrainingSessionStatus) => {
    const config = TRAINING_SESSION_STATUSES.find((s) => s.value === status)
    const colorClasses: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800',
      orange: 'bg-orange-100 text-orange-800',
    }
    return (
      <Badge className={colorClasses[config?.color || 'gray']}>
        {config?.label || status}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Loading training records...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Training Records
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddSession(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Training
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Statistics */}
          {statistics && (
            <div className="grid grid-cols-5 gap-3">
              <div className="text-center p-2 bg-muted rounded-lg">
                <div className="text-xl font-bold">{statistics.total_sessions}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-700">{statistics.completed_sessions}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-700">{statistics.scheduled_sessions}</div>
                <div className="text-xs text-muted-foreground">Scheduled</div>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-700">{statistics.total_attendees}</div>
                <div className="text-xs text-muted-foreground">Attendees</div>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded-lg">
                <div className="text-xl font-bold text-yellow-700">{statistics.certificates_generated}</div>
                <div className="text-xs text-muted-foreground">Certificates</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Training Sessions</h3>
            <p className="text-muted-foreground mb-4">
              Schedule training sessions for equipment operation and maintenance.
            </p>
            <Button onClick={() => setShowAddSession(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule First Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="scheduled">
                  Scheduled ({scheduledSessions.length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({completedSessions.length})
                </TabsTrigger>
                {cancelledSessions.length > 0 && (
                  <TabsTrigger value="cancelled">
                    Cancelled ({cancelledSessions.length})
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="scheduled">
                <SessionsList
                  sessions={scheduledSessions}
                  onSelect={setSelectedSessionId}
                  onComplete={handleCompleteSession}
                  getStatusBadge={getStatusBadge}
                />
              </TabsContent>

              <TabsContent value="completed">
                <SessionsList
                  sessions={completedSessions}
                  onSelect={setSelectedSessionId}
                  getStatusBadge={getStatusBadge}
                />
              </TabsContent>

              <TabsContent value="cancelled">
                <SessionsList
                  sessions={cancelledSessions}
                  onSelect={setSelectedSessionId}
                  getStatusBadge={getStatusBadge}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Add Session Dialog */}
      <Dialog open={showAddSession} onOpenChange={setShowAddSession}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Training Session</DialogTitle>
            <DialogDescription>
              Schedule a new training session for project closeout.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <Input
                value={sessionForm.title}
                onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                placeholder="e.g., HVAC System Operation Training"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <Select
                value={sessionForm.session_type || 'none'}
                onValueChange={(v) => setSessionForm({ ...sessionForm, session_type: v === 'none' ? '' : v as TrainingSessionType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select type</SelectItem>
                  {TRAINING_SESSION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                value={sessionForm.description}
                onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                placeholder="Training objectives and topics covered"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <Input
                  type="date"
                  value={sessionForm.scheduled_date}
                  onChange={(e) => setSessionForm({ ...sessionForm, scheduled_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Time</label>
                <Input
                  type="time"
                  value={sessionForm.scheduled_start_time}
                  onChange={(e) => setSessionForm({ ...sessionForm, scheduled_start_time: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Time</label>
                <Input
                  type="time"
                  value={sessionForm.scheduled_end_time}
                  onChange={(e) => setSessionForm({ ...sessionForm, scheduled_end_time: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <Input
                value={sessionForm.location}
                onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })}
                placeholder="e.g., Mechanical Room, Building A"
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Trainer Information</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Trainer Name</label>
                  <Input
                    value={sessionForm.trainer_name}
                    onChange={(e) => setSessionForm({ ...sessionForm, trainer_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Company</label>
                    <Input
                      value={sessionForm.trainer_company}
                      onChange={(e) => setSessionForm({ ...sessionForm, trainer_company: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input
                      type="email"
                      value={sessionForm.trainer_email}
                      onChange={(e) => setSessionForm({ ...sessionForm, trainer_email: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetSessionForm}>
              Cancel
            </Button>
            <Button onClick={handleAddSession} disabled={createSession.isPending}>
              {createSession.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Schedule Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Details Dialog */}
      <Dialog open={!!selectedSessionId} onOpenChange={() => setSelectedSessionId(null)}>
        <DialogContent className="max-w-2xl">
          {selectedSession && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSession.title}</DialogTitle>
                <DialogDescription>
                  {selectedSession.session_type && (
                    <Badge variant="outline" className="mr-2">
                      {TRAINING_SESSION_TYPES.find((t) => t.value === selectedSession.session_type)?.label}
                    </Badge>
                  )}
                  {getStatusBadge(selectedSession.status)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Session Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedSession.scheduled_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(selectedSession.scheduled_date), 'MMMM d, yyyy')}
                    </div>
                  )}
                  {(selectedSession.scheduled_start_time || selectedSession.scheduled_end_time) && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {selectedSession.scheduled_start_time} - {selectedSession.scheduled_end_time}
                    </div>
                  )}
                  {selectedSession.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {selectedSession.location}
                    </div>
                  )}
                  {selectedSession.trainer_name && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {selectedSession.trainer_name}
                      {selectedSession.trainer_company && ` (${selectedSession.trainer_company})`}
                    </div>
                  )}
                </div>

                {selectedSession.description && (
                  <p className="text-sm text-muted-foreground">{selectedSession.description}</p>
                )}

                {/* Attendees */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Attendees ({selectedSession.attendees?.length || 0})
                    </h4>
                    <Button size="sm" onClick={() => setShowAddAttendee(true)}>
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add Attendee
                    </Button>
                  </div>

                  {selectedSession.attendees && selectedSession.attendees.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedSession.attendees.map((attendee) => (
                        <div
                          key={attendee.id}
                          className="flex items-center justify-between p-2 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              {attendee.signed_in ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{attendee.attendee_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {[attendee.attendee_company, attendee.attendee_title]
                                  .filter(Boolean)
                                  .join(' - ')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {!attendee.signed_in && selectedSession.status !== 'completed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSignIn(attendee.id)}
                              >
                                <Pen className="h-3 w-3 mr-1" />
                                Sign In
                              </Button>
                            )}
                            {attendee.signed_in && selectedSession.status === 'completed' && !attendee.certificate_generated && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGenerateCertificate(attendee)}
                              >
                                <Award className="h-3 w-3 mr-1" />
                                Certificate
                              </Button>
                            )}
                            {attendee.certificate_generated && attendee.certificate_url && (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={attendee.certificate_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-3 w-3" />
                                </a>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAttendee(attendee.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No attendees added yet
                    </p>
                  )}
                </div>

                {/* Materials & Videos */}
                {(selectedSession.training_materials_urls.length > 0 || selectedSession.video_recording_urls.length > 0) && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Training Materials</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSession.training_materials_urls.map((url, i) => (
                        <Button key={i} variant="outline" size="sm" asChild>
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-4 w-4 mr-1" />
                            Material {i + 1}
                          </a>
                        </Button>
                      ))}
                      {selectedSession.video_recording_urls.map((url, i) => (
                        <Button key={i} variant="outline" size="sm" asChild>
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <Video className="h-4 w-4 mr-1" />
                            Video {i + 1}
                          </a>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                {selectedSession.status === 'scheduled' && (
                  <Button
                    variant="outline"
                    onClick={() => handleCompleteSession(selectedSession.id)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedSessionId(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Attendee Dialog */}
      <Dialog open={showAddAttendee} onOpenChange={setShowAddAttendee}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Attendee</DialogTitle>
            <DialogDescription>
              Add a new attendee to the training session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <Input
                value={attendeeForm.attendee_name}
                onChange={(e) => setAttendeeForm({ ...attendeeForm, attendee_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  value={attendeeForm.attendee_email}
                  onChange={(e) => setAttendeeForm({ ...attendeeForm, attendee_email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input
                  value={attendeeForm.attendee_phone}
                  onChange={(e) => setAttendeeForm({ ...attendeeForm, attendee_phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Company</label>
                <Input
                  value={attendeeForm.attendee_company}
                  onChange={(e) => setAttendeeForm({ ...attendeeForm, attendee_company: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <Input
                  value={attendeeForm.attendee_title}
                  onChange={(e) => setAttendeeForm({ ...attendeeForm, attendee_title: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetAttendeeForm}>
              Cancel
            </Button>
            <Button onClick={handleAddAttendee} disabled={addAttendee.isPending}>
              {addAttendee.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Attendee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Sessions List Helper Component
function SessionsList({
  sessions,
  onSelect,
  onComplete,
  getStatusBadge,
}: {
  sessions: TrainingSessionWithDetails[]
  onSelect: (id: string) => void
  onComplete?: (id: string) => void
  getStatusBadge: (status: TrainingSessionStatus) => React.ReactNode
}) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No sessions in this category
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
          onClick={() => onSelect(session.id)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{session.title}</span>
                {getStatusBadge(session.status)}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {session.scheduled_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(session.scheduled_date), 'MMM d, yyyy')}
                  </span>
                )}
                {session.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {session.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {session.signed_in_count || 0}/{session.attendee_count || 0} signed in
                </span>
                {session.certificates_generated > 0 && (
                  <span className="flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    {session.certificates_generated} certificates
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              {session.status === 'scheduled' && onComplete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onComplete(session.id)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Complete
                </Button>
              )}
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default TrainingRecords
