/**
 * Toolbox Talk Manager Component
 *
 * Comprehensive toolbox talk management including topic library,
 * scheduling, attendance tracking, quiz/acknowledgment, and compliance reporting.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  useToolboxTopics,
  useToolboxTopicsByCategory,
  useToolboxTalks,
  useToolboxTalkWithDetails,
  useUpcomingToolboxTalks,
  useRecentToolboxTalks,
  useToolboxTalkStats,
  useComplianceSummary,
  useCreateTopic,
  useUpdateTopic,
  useCreateToolboxTalk,
  useUpdateToolboxTalk,
  useStartToolboxTalk,
  useCompleteToolboxTalk,
  useCancelToolboxTalk,
  useAddAttendee,
  useBulkAddAttendees,
  useSignInAttendee,
  useQuickSignIn,
  useBulkSignIn,
  useToolboxAttendees,
} from '@/features/toolbox-talks/hooks/useToolboxTalks'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  ToolboxTalkTopic,
  ToolboxTalk,
  ToolboxTalkAttendee,
  ToolboxTopicCategory,
  ToolboxTalkStatus,
  ToolboxAttendanceStatus,
  TOPIC_CATEGORY_LABELS,
  TALK_STATUS_LABELS,
  TALK_STATUS_COLORS,
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_COLORS,
  CreateToolboxTopicDTO,
  CreateToolboxTalkDTO,
} from '@/types/toolbox-talks'
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  Play,
  Square,
  X,
  FileText,
  MessageSquare,
  Video,
  Link as LinkIcon,
  ChevronRight,
  ChevronDown,
  ClipboardList,
  Shield,
  TrendingUp,
  Award,
  User,
  UserCheck,
  UserX,
  PenLine,
  RefreshCw,
  Filter,
  MoreVertical,
  Download,
  Printer,
  ExternalLink,
  Bell,
  Target,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface ToolboxTalkManagerProps {
  projectId: string
  companyId: string
  className?: string
}

interface TopicFormData {
  title: string
  description: string
  category: ToolboxTopicCategory
  talking_points: string[]
  discussion_questions: string[]
  requires_certification: boolean
  certification_valid_days: number
  estimated_duration: number
  osha_standard: string
  regulation_references: string
}

interface ScheduleTalkFormData {
  topic_id: string | null
  custom_topic_title: string
  category: ToolboxTopicCategory
  scheduled_date: string
  scheduled_time: string
  location: string
  presenter_name: string
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(time: string | null): string {
  if (!time) {return ''}
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

function getStatusBadgeVariant(status: ToolboxTalkStatus): string {
  const colors = TALK_STATUS_COLORS[status]
  switch (colors) {
    case 'green':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'blue':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'yellow':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'red':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getAttendanceColor(status: ToolboxAttendanceStatus): string {
  const colors = ATTENDANCE_STATUS_COLORS[status]
  switch (colors) {
    case 'green':
      return 'text-green-600'
    case 'red':
      return 'text-red-600'
    case 'yellow':
      return 'text-yellow-600'
    default:
      return 'text-gray-600'
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Stats card for dashboard
 */
function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: { value: number; positive: boolean }
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  }

  return (
    <Card className={cn('border', colorClasses[color])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          </div>
          <Icon className="h-8 w-8 opacity-50" />
        </div>
        {trend && (
          <div className="mt-2 flex items-center text-xs">
            <TrendingUp
              className={cn(
                'h-3 w-3 mr-1',
                trend.positive ? 'text-green-600' : 'text-red-600'
              )}
            />
            <span className={trend.positive ? 'text-green-600' : 'text-red-600'}>
              {trend.value}%
            </span>
            <span className="text-gray-400 ml-1">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Topic card in library
 */
function TopicCard({
  topic,
  onSelect,
  onEdit,
  selected,
}: {
  topic: ToolboxTalkTopic
  onSelect?: () => void
  onEdit?: () => void
  selected?: boolean
}) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        selected && 'ring-2 ring-blue-500'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">{topic.title}</h4>
            <Badge variant="outline" className="text-xs mt-1">
              {TOPIC_CATEGORY_LABELS[topic.category]}
            </Badge>
          </div>
          {topic.requires_certification && (
            <Award className="h-4 w-4 text-yellow-500 flex-shrink-0 ml-2" />
          )}
        </div>

        {topic.description && (
          <p className="text-sm text-gray-500 mt-2 line-clamp-2">{topic.description}</p>
        )}

        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {topic.estimated_duration} min
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {topic.talking_points?.length || 0} points
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Used {topic.times_used}x
          </span>
        </div>

        {topic.osha_standard && (
          <div className="mt-2">
            <Badge variant="secondary" className="text-xs">
              OSHA {topic.osha_standard}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Talk card for scheduled/completed talks
 */
function TalkCard({
  talk,
  onClick,
}: {
  talk: ToolboxTalk
  onClick?: () => void
}) {
  const attendanceRate = talk.attendance_count && talk.present_count
    ? Math.round((talk.present_count / talk.attendance_count) * 100)
    : null

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium truncate">
                {talk.topic?.title || talk.custom_topic_title || 'Untitled Talk'}
              </h4>
              <Badge className={cn('text-xs', getStatusBadgeVariant(talk.status))}>
                {TALK_STATUS_LABELS[talk.status]}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {talk.talk_number}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDate(talk.scheduled_date)}
          </span>
          {talk.scheduled_time && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatTime(talk.scheduled_time)}
            </span>
          )}
          {talk.attendance_count !== undefined && (
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {talk.present_count || 0}/{talk.attendance_count}
            </span>
          )}
        </div>

        {talk.presenter_name && (
          <div className="mt-2 text-sm text-gray-400">
            Presenter: {talk.presenter_name}
          </div>
        )}

        {attendanceRate !== null && talk.status === 'completed' && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span>Attendance</span>
              <span className="font-medium">{attendanceRate}%</span>
            </div>
            <Progress value={attendanceRate} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Attendee row for attendance tracking
 */
function AttendeeRow({
  attendee,
  onSignIn,
  onMarkAbsent,
  isLoading,
}: {
  attendee: ToolboxTalkAttendee
  onSignIn: () => void
  onMarkAbsent: () => void
  isLoading?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center',
          attendee.attendance_status === 'present' && 'bg-green-100 text-green-600',
          attendee.attendance_status === 'absent' && 'bg-red-100 text-red-600',
          attendee.attendance_status === 'excused' && 'bg-yellow-100 text-yellow-600',
          attendee.attendance_status === 'expected' && 'bg-gray-100 text-gray-600'
        )}>
          {attendee.attendance_status === 'present' ? (
            <UserCheck className="h-4 w-4" />
          ) : attendee.attendance_status === 'absent' ? (
            <UserX className="h-4 w-4" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </div>
        <div>
          <p className="font-medium">{attendee.worker_name}</p>
          <p className="text-xs text-gray-500">
            {attendee.worker_trade || attendee.worker_company || '-'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {attendee.signed_in_at && (
          <span className="text-xs text-gray-400">
            {new Date(attendee.signed_in_at).toLocaleTimeString()}
          </span>
        )}
        <Badge
          variant="outline"
          className={cn('text-xs', getAttendanceColor(attendee.attendance_status))}
        >
          {ATTENDANCE_STATUS_LABELS[attendee.attendance_status]}
        </Badge>

        {attendee.attendance_status === 'expected' && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onSignIn(); }}
              disabled={isLoading}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onMarkAbsent(); }}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Create/Edit Topic Dialog
 */
function TopicFormDialog({
  open,
  onOpenChange,
  topic,
  companyId,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  topic?: ToolboxTalkTopic
  companyId: string
  onSave: () => void
}) {
  const createMutation = useCreateTopic()
  const updateMutation = useUpdateTopic()

  const [formData, setFormData] = React.useState<TopicFormData>({
    title: topic?.title || '',
    description: topic?.description || '',
    category: topic?.category || 'other',
    talking_points: topic?.talking_points || [''],
    discussion_questions: topic?.discussion_questions || [''],
    requires_certification: topic?.requires_certification || false,
    certification_valid_days: topic?.certification_valid_days || 365,
    estimated_duration: topic?.estimated_duration || 15,
    osha_standard: topic?.osha_standard || '',
    regulation_references: topic?.regulation_references || '',
  })

  const handleSubmit = async () => {
    const dto: CreateToolboxTopicDTO = {
      company_id: companyId,
      title: formData.title,
      description: formData.description || null,
      category: formData.category,
      talking_points: formData.talking_points.filter((p) => p.trim()),
      discussion_questions: formData.discussion_questions.filter((q) => q.trim()),
      requires_certification: formData.requires_certification,
      certification_valid_days: formData.certification_valid_days,
      estimated_duration: formData.estimated_duration,
      osha_standard: formData.osha_standard || null,
      regulation_references: formData.regulation_references || null,
    }

    if (topic) {
      await updateMutation.mutateAsync({ id: topic.id, dto })
    } else {
      await createMutation.mutateAsync(dto)
    }

    onSave()
    onOpenChange(false)
  }

  const addTalkingPoint = () => {
    setFormData({ ...formData, talking_points: [...formData.talking_points, ''] })
  }

  const updateTalkingPoint = (index: number, value: string) => {
    const points = [...formData.talking_points]
    points[index] = value
    setFormData({ ...formData, talking_points: points })
  }

  const removeTalkingPoint = (index: number) => {
    const points = formData.talking_points.filter((_, i) => i !== index)
    setFormData({ ...formData, talking_points: points.length ? points : [''] })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{topic ? 'Edit Topic' : 'Create New Topic'}</DialogTitle>
          <DialogDescription>
            Add a new topic to your toolbox talk library
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Topic Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter topic title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v as ToolboxTopicCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TOPIC_CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the topic"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Talking Points</Label>
            {formData.talking_points.map((point, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={point}
                  onChange={(e) => updateTalkingPoint(index, e.target.value)}
                  placeholder={`Point ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTalkingPoint(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addTalkingPoint}>
              <Plus className="h-4 w-4 mr-2" />
              Add Point
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Estimated Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min={5}
                max={120}
                value={formData.estimated_duration}
                onChange={(e) => setFormData({ ...formData, estimated_duration: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="osha_standard">OSHA Standard Reference</Label>
              <Input
                id="osha_standard"
                value={formData.osha_standard}
                onChange={(e) => setFormData({ ...formData, osha_standard: e.target.value })}
                placeholder="e.g., 1926.501"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="requires_certification"
              checked={formData.requires_certification}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, requires_certification: checked as boolean })
              }
            />
            <Label htmlFor="requires_certification">
              Requires certification / periodic refresher
            </Label>
          </div>

          {formData.requires_certification && (
            <div className="space-y-2 pl-6">
              <Label htmlFor="cert_days">Certification Valid For (days)</Label>
              <Input
                id="cert_days"
                type="number"
                min={30}
                max={730}
                value={formData.certification_valid_days}
                onChange={(e) =>
                  setFormData({ ...formData, certification_valid_days: parseInt(e.target.value) })
                }
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.title || createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Topic'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Schedule Talk Dialog
 */
function ScheduleTalkDialog({
  open,
  onOpenChange,
  projectId,
  companyId,
  selectedTopic,
  onSchedule,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  companyId: string
  selectedTopic?: ToolboxTalkTopic | null
  onSchedule: () => void
}) {
  const { user } = useAuth()
  const createMutation = useCreateToolboxTalk()

  const [formData, setFormData] = React.useState<ScheduleTalkFormData>({
    topic_id: selectedTopic?.id || null,
    custom_topic_title: '',
    category: selectedTopic?.category || 'other',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '07:00',
    location: '',
    presenter_name: user?.name || '',
  })

  React.useEffect(() => {
    if (selectedTopic) {
      setFormData((prev) => ({
        ...prev,
        topic_id: selectedTopic.id,
        category: selectedTopic.category,
      }))
    }
  }, [selectedTopic])

  const handleSubmit = async () => {
    const dto: CreateToolboxTalkDTO = {
      project_id: projectId,
      company_id: companyId,
      topic_id: formData.topic_id,
      custom_topic_title: formData.topic_id ? null : formData.custom_topic_title || null,
      category: formData.category,
      scheduled_date: formData.scheduled_date,
      scheduled_time: formData.scheduled_time || null,
      location: formData.location || null,
      presenter_name: formData.presenter_name || null,
    }

    await createMutation.mutateAsync(dto)
    onSchedule()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Toolbox Talk</DialogTitle>
          <DialogDescription>
            {selectedTopic
              ? `Scheduling "${selectedTopic.title}"`
              : 'Create a new toolbox talk session'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedTopic && (
            <>
              <div className="space-y-2">
                <Label htmlFor="custom_title">Custom Topic Title</Label>
                <Input
                  id="custom_title"
                  value={formData.custom_topic_title}
                  onChange={(e) => setFormData({ ...formData, custom_topic_title: e.target.value })}
                  placeholder="Enter topic title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as ToolboxTopicCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TOPIC_CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Main Gate, Break Room"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="presenter">Presenter</Label>
            <Input
              id="presenter"
              value={formData.presenter_name}
              onChange={(e) => setFormData({ ...formData, presenter_name: e.target.value })}
              placeholder="Presenter name"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.scheduled_date || createMutation.isPending}
          >
            {createMutation.isPending ? 'Scheduling...' : 'Schedule Talk'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Talk Detail Dialog with attendance
 */
function TalkDetailDialog({
  open,
  onOpenChange,
  talkId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  talkId: string
}) {
  const { data: talk, isLoading, refetch } = useToolboxTalkWithDetails(talkId)
  const { data: attendees } = useToolboxAttendees(talkId)
  const startMutation = useStartToolboxTalk()
  const completeMutation = useCompleteToolboxTalk()
  const cancelMutation = useCancelToolboxTalk()
  const quickSignInMutation = useQuickSignIn()
  const bulkSignInMutation = useBulkSignIn()

  const [newAttendee, setNewAttendee] = React.useState('')
  const addAttendeeMutation = useAddAttendee()

  const handleStart = async () => {
    await startMutation.mutateAsync({ id: talkId })
    refetch()
  }

  const handleComplete = async () => {
    await completeMutation.mutateAsync({ id: talkId })
    refetch()
  }

  const handleCancel = async () => {
    await cancelMutation.mutateAsync(talkId)
    refetch()
  }

  const handleSignIn = async (attendeeId: string) => {
    await quickSignInMutation.mutateAsync({ attendeeId, talkId })
  }

  const handleBulkSignIn = async () => {
    await bulkSignInMutation.mutateAsync(talkId)
  }

  const handleAddAttendee = async () => {
    if (!newAttendee.trim()) {return}
    await addAttendeeMutation.mutateAsync({
      toolbox_talk_id: talkId,
      worker_name: newAttendee.trim(),
    })
    setNewAttendee('')
  }

  if (isLoading || !talk) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>
              {talk.topic?.title || talk.custom_topic_title || 'Toolbox Talk'}
            </DialogTitle>
            <Badge className={cn('text-xs', getStatusBadgeVariant(talk.status))}>
              {TALK_STATUS_LABELS[talk.status]}
            </Badge>
          </div>
          <DialogDescription>
            {talk.talk_number} - {formatDate(talk.scheduled_date)}
            {talk.scheduled_time && ` at ${formatTime(talk.scheduled_time)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Actions based on status */}
          <div className="flex gap-2">
            {talk.status === 'scheduled' && (
              <>
                <Button onClick={handleStart} disabled={startMutation.isPending}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Talk
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={cancelMutation.isPending}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
            {talk.status === 'in_progress' && (
              <>
                <Button onClick={handleComplete} disabled={completeMutation.isPending}>
                  <Square className="h-4 w-4 mr-2" />
                  Complete Talk
                </Button>
                <Button variant="outline" onClick={handleBulkSignIn} disabled={bulkSignInMutation.isPending}>
                  <Users className="h-4 w-4 mr-2" />
                  Sign In All
                </Button>
              </>
            )}
          </div>

          {/* Talking Points */}
          {talk.topic?.talking_points && talk.topic.talking_points.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Talking Points</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {talk.topic.talking_points.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Checkbox id={`point-${index}`} />
                      <label htmlFor={`point-${index}`} className="flex-1">
                        {point}
                      </label>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Discussion Questions */}
          {talk.topic?.discussion_questions && talk.topic.discussion_questions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Discussion Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {talk.topic.discussion_questions.map((question, index) => (
                    <li key={index} className="text-sm text-gray-600">
                      {index + 1}. {question}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Attendance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Attendance ({talk.present_count || 0}/{talk.attendance_count || 0})</span>
                {talk.status !== 'completed' && talk.status !== 'cancelled' && (
                  <div className="flex gap-2">
                    <Input
                      value={newAttendee}
                      onChange={(e) => setNewAttendee(e.target.value)}
                      placeholder="Add attendee..."
                      className="w-40 h-8"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddAttendee()}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddAttendee}
                      disabled={addAttendeeMutation.isPending}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {attendees && attendees.length > 0 ? (
                  <div className="space-y-1">
                    {attendees.map((attendee) => (
                      <AttendeeRow
                        key={attendee.id}
                        attendee={attendee}
                        onSignIn={() => handleSignIn(attendee.id)}
                        onMarkAbsent={() => {}}
                        isLoading={quickSignInMutation.isPending}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    No attendees yet
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Notes */}
          {talk.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{talk.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Toolbox Talk Manager Component
 *
 * Provides comprehensive toolbox talk management including:
 * - Topic library with content
 * - Schedule recurring talks
 * - Attendance tracking with signatures
 * - Quiz/acknowledgment
 * - Compliance reporting
 * - Topic suggestions based on work activities
 */
export function ToolboxTalkManager({
  projectId,
  companyId,
  className,
}: ToolboxTalkManagerProps) {
  const [activeTab, setActiveTab] = React.useState('dashboard')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all')
  const [selectedTopic, setSelectedTopic] = React.useState<ToolboxTalkTopic | null>(null)
  const [selectedTalk, setSelectedTalk] = React.useState<string | null>(null)

  // Dialogs
  const [showTopicForm, setShowTopicForm] = React.useState(false)
  const [showScheduleForm, setShowScheduleForm] = React.useState(false)
  const [showTalkDetail, setShowTalkDetail] = React.useState(false)
  const [editingTopic, setEditingTopic] = React.useState<ToolboxTalkTopic | undefined>()

  // Data queries
  const { data: stats } = useToolboxTalkStats(projectId)
  const { data: compliance } = useComplianceSummary(companyId)
  const { data: upcomingTalks } = useUpcomingToolboxTalks(projectId, 14)
  const { data: recentTalks } = useRecentToolboxTalks(projectId, 10)
  const { data: topics, refetch: refetchTopics } = useToolboxTopics({
    company_id: companyId,
    include_system_templates: true,
    is_active: true,
    search: searchQuery || undefined,
    category: categoryFilter !== 'all' ? categoryFilter as ToolboxTopicCategory : undefined,
  })
  const { data: topicsByCategory } = useToolboxTopicsByCategory(companyId)

  // Handle topic selection for scheduling
  const handleSelectTopic = (topic: ToolboxTalkTopic) => {
    setSelectedTopic(topic)
    setShowScheduleForm(true)
  }

  // Handle talk click
  const handleTalkClick = (talk: ToolboxTalk) => {
    setSelectedTalk(talk.id)
    setShowTalkDetail(true)
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Toolbox Talk Manager</h2>
          <p className="text-sm text-gray-500">
            Manage safety briefings, track attendance, and ensure compliance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setEditingTopic(undefined); setShowTopicForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Topic
          </Button>
          <Button onClick={() => { setSelectedTopic(null); setShowScheduleForm(true); }}>
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Talk
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="library">Topic Library</TabsTrigger>
          <TabsTrigger value="schedule">Scheduled</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard
              title="Talks This Month"
              value={compliance?.talks_this_month || 0}
              icon={ClipboardList}
              color="blue"
            />
            <StatsCard
              title="Topics Covered"
              value={compliance?.topics_covered_this_month || 0}
              icon={BookOpen}
              color="green"
            />
            <StatsCard
              title="Compliance Rate"
              value={`${compliance?.compliance_percentage || 0}%`}
              icon={Shield}
              color={compliance?.compliance_percentage && compliance.compliance_percentage >= 90 ? 'green' : 'yellow'}
            />
            <StatsCard
              title="Avg. Duration"
              value={`${stats?.avg_duration || 0} min`}
              icon={Clock}
              color="purple"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Upcoming Talks */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Upcoming Talks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingTalks && upcomingTalks.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingTalks.slice(0, 5).map((talk) => (
                      <div
                        key={talk.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => handleTalkClick(talk)}
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {talk.topic?.title || talk.custom_topic_title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(talk.scheduled_date)}
                            {talk.scheduled_time && ` - ${formatTime(talk.scheduled_time)}`}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    <Calendar className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No upcoming talks scheduled</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowScheduleForm(true)}
                    >
                      Schedule one now
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentTalks && recentTalks.length > 0 ? (
                  <div className="space-y-3">
                    {recentTalks.slice(0, 5).map((talk) => (
                      <div
                        key={talk.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => handleTalkClick(talk)}
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {talk.topic?.title || talk.custom_topic_title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(talk.completed_at || talk.scheduled_date)}
                            {' - '}
                            {talk.present_count || 0} attendees
                          </p>
                        </div>
                        <Badge
                          className={cn('text-xs', getStatusBadgeVariant(talk.status))}
                        >
                          {TALK_STATUS_LABELS[talk.status]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    <FileText className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No recent talks</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Suggested Topics */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Suggested Topics
              </CardTitle>
              <CardDescription>
                Based on current season and recent activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {/* Seasonal suggestions */}
                {new Date().getMonth() >= 5 && new Date().getMonth() <= 8 && (
                  <Badge variant="outline" className="cursor-pointer hover:bg-yellow-50">
                    Heat Illness Prevention
                  </Badge>
                )}
                {(new Date().getMonth() >= 11 || new Date().getMonth() <= 2) && (
                  <Badge variant="outline" className="cursor-pointer hover:bg-blue-50">
                    Cold Stress
                  </Badge>
                )}
                <Badge variant="outline" className="cursor-pointer hover:bg-gray-50">
                  Fall Protection
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-gray-50">
                  PPE Refresher
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-gray-50">
                  Housekeeping
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Topic Library Tab */}
        <TabsContent value="library" className="space-y-6">
          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics..."
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(TOPIC_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Topics Grid */}
          {topics && topics.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  onSelect={() => handleSelectTopic(topic)}
                  onEdit={() => { setEditingTopic(topic); setShowTopicForm(true); }}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Topics Found</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery || categoryFilter !== 'all'
                    ? 'Try adjusting your search or filter'
                    : 'Create your first toolbox talk topic'}
                </p>
                <Button onClick={() => { setEditingTopic(undefined); setShowTopicForm(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Topic
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Scheduled Tab */}
        <TabsContent value="schedule" className="space-y-6">
          {upcomingTalks && upcomingTalks.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingTalks.map((talk) => (
                <TalkCard
                  key={talk.id}
                  talk={talk}
                  onClick={() => handleTalkClick(talk)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Scheduled Talks</h3>
                <p className="text-gray-500 mb-4">
                  Schedule a toolbox talk to get started
                </p>
                <Button onClick={() => setShowScheduleForm(true)}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Talk
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          {recentTalks && recentTalks.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentTalks.map((talk) => (
                <TalkCard
                  key={talk.id}
                  talk={talk}
                  onClick={() => handleTalkClick(talk)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">No History</h3>
                <p className="text-gray-500">
                  Completed talks will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          {compliance && (
            <>
              {/* Compliance Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard
                  title="Total Workers"
                  value={compliance.total_workers}
                  icon={Users}
                  color="blue"
                />
                <StatsCard
                  title="Current Certs"
                  value={compliance.workers_with_current_certs}
                  icon={Award}
                  color="green"
                />
                <StatsCard
                  title="Expiring Soon"
                  value={compliance.workers_with_expiring_certs}
                  icon={Bell}
                  color="yellow"
                />
                <StatsCard
                  title="Expired"
                  value={compliance.workers_with_expired_certs}
                  icon={AlertCircle}
                  color="red"
                />
              </div>

              {/* Compliance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Compliance Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span>Overall Compliance</span>
                        <span className="font-medium">{compliance.compliance_percentage}%</span>
                      </div>
                      <Progress
                        value={compliance.compliance_percentage}
                        className="h-3"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center text-sm">
                      <div className="p-3 bg-green-50 rounded">
                        <div className="text-2xl font-bold text-green-600">
                          {compliance.workers_with_current_certs}
                        </div>
                        <div className="text-green-600">Current</div>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded">
                        <div className="text-2xl font-bold text-yellow-600">
                          {compliance.workers_with_expiring_certs}
                        </div>
                        <div className="text-yellow-600">Expiring</div>
                      </div>
                      <div className="p-3 bg-red-50 rounded">
                        <div className="text-2xl font-bold text-red-600">
                          {compliance.workers_with_expired_certs}
                        </div>
                        <div className="text-red-600">Expired</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Alert for low compliance */}
              {compliance.compliance_percentage < 80 && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle>Action Required</AlertTitle>
                  <AlertDescription>
                    Compliance is below 80%. Consider scheduling additional toolbox talks
                    to bring workers up to date on required topics.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <TopicFormDialog
        open={showTopicForm}
        onOpenChange={setShowTopicForm}
        topic={editingTopic}
        companyId={companyId}
        onSave={() => refetchTopics()}
      />

      <ScheduleTalkDialog
        open={showScheduleForm}
        onOpenChange={setShowScheduleForm}
        projectId={projectId}
        companyId={companyId}
        selectedTopic={selectedTopic}
        onSchedule={() => {}}
      />

      {selectedTalk && (
        <TalkDetailDialog
          open={showTalkDetail}
          onOpenChange={setShowTalkDetail}
          talkId={selectedTalk}
        />
      )}
    </div>
  )
}

export default ToolboxTalkManager
