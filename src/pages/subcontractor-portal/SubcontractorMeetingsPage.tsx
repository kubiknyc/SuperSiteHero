/**
 * Subcontractor Meetings Page
 * View meeting minutes and action items - P2-2 Feature
 */

import { useState, useMemo } from 'react'
import {
  useSubcontractorMeetings,
  useSubcontractorActionItems,
  useMeetingSummary,
  useMarkActionItemComplete,
  getMeetingStatusBadgeVariant,
  getMeetingStatusLabel,
  getActionItemStatusBadgeVariant,
  getActionItemStatusLabel,
  getActionItemPriorityBadgeVariant,
  getActionItemPriorityLabel,
  formatMeetingDate,
  formatMeetingTime,
  formatDuration,
  isActionItemOverdue,
  filterActionItemsByStatus,
  filterMeetingsByStatus,
  getMeetingTypeLabel,
  type SubcontractorMeeting,
  type SubcontractorActionItem,
} from '@/features/subcontractor-portal/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Users,
  Calendar,
  Clock,
  MapPin,
  Video,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  CheckSquare,
  ListTodo,
  CalendarClock,
  Paperclip,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type MeetingFilter = 'all' | 'upcoming' | 'past' | 'attended'
type ActionItemFilter = 'all' | 'open' | 'overdue' | 'completed'

export default function SubcontractorMeetingsPage() {
  const [activeTab, setActiveTab] = useState<'meetings' | 'action-items'>('meetings')
  const [meetingFilter, setMeetingFilter] = useState<MeetingFilter>('all')
  const [actionItemFilter, setActionItemFilter] = useState<ActionItemFilter>('open')
  const [expandedMeetings, setExpandedMeetings] = useState<Set<string>>(new Set())

  const { data: meetings = [], isLoading: meetingsLoading } = useSubcontractorMeetings()
  const { data: actionItems = [], isLoading: actionItemsLoading } = useSubcontractorActionItems()
  const { data: summary } = useMeetingSummary()
  const markComplete = useMarkActionItemComplete()

  // Filter meetings
  const filteredMeetings = useMemo(
    () => filterMeetingsByStatus(meetings, meetingFilter),
    [meetings, meetingFilter]
  )

  // Filter action items
  const filteredActionItems = useMemo(
    () => filterActionItemsByStatus(actionItems, actionItemFilter),
    [actionItems, actionItemFilter]
  )

  // Toggle meeting expansion
  const toggleMeeting = (meetingId: string) => {
    setExpandedMeetings(prev => {
      const next = new Set(prev)
      if (next.has(meetingId)) {
        next.delete(meetingId)
      } else {
        next.add(meetingId)
      }
      return next
    })
  }

  // Handle marking action item complete
  const handleMarkComplete = (actionItemId: string) => {
    markComplete.mutate(actionItemId)
  }

  const _isLoading = meetingsLoading || actionItemsLoading

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 heading-page">
            <Users className="h-6 w-6 text-primary" />
            Meetings & Action Items
          </h1>
          <p className="text-muted-foreground mt-1">
            View meeting minutes and track your action items
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Meetings</span>
              </div>
              <p className="mt-1 heading-section">{summary.total_meetings}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Upcoming</span>
              </div>
              <p className="mt-1 heading-section">{summary.upcoming_meetings}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Open Items</span>
              </div>
              <p className="mt-1 heading-section">{summary.open_action_items}</p>
            </CardContent>
          </Card>
          <Card className={summary.overdue_action_items > 0 ? 'border-destructive' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertCircle className={cn(
                  'h-4 w-4',
                  summary.overdue_action_items > 0 ? 'text-destructive' : 'text-muted-foreground'
                )} />
                <span className={cn(
                  'text-sm',
                  summary.overdue_action_items > 0 ? 'text-destructive' : 'text-muted-foreground'
                )}>Overdue</span>
              </div>
              <p className={cn(
                'mt-1 heading-section',
                summary.overdue_action_items > 0 ? 'text-destructive' : ''
              )}>{summary.overdue_action_items}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'meetings' | 'action-items')}>
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-grid">
          <TabsTrigger value="meetings" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Meetings</span>
            <Badge variant="secondary" className="ml-1">{meetings.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="action-items" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Action Items</span>
            <Badge variant="secondary" className="ml-1">{actionItems.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Meetings Tab */}
        <TabsContent value="meetings" className="mt-4">
          {/* Meeting Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(['all', 'upcoming', 'past', 'attended'] as const).map((filter) => (
              <Button
                key={filter}
                variant={meetingFilter === filter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMeetingFilter(filter)}
              >
                {filter === 'all' && 'All'}
                {filter === 'upcoming' && 'Upcoming'}
                {filter === 'past' && 'Past'}
                {filter === 'attended' && 'Attended'}
              </Button>
            ))}
          </div>

          {/* Loading */}
          {meetingsLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-muted-foreground">Loading meetings...</div>
            </div>
          )}

          {/* Empty State */}
          {!meetingsLoading && filteredMeetings.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="mb-2 heading-subsection">No Meetings Found</h3>
                  <p className="text-muted-foreground">
                    {meetingFilter !== 'all'
                      ? 'Try changing your filter to see more meetings.'
                      : 'Meetings you attend will appear here.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meetings List */}
          {!meetingsLoading && filteredMeetings.length > 0 && (
            <div className="space-y-3">
              {filteredMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  isExpanded={expandedMeetings.has(meeting.id)}
                  onToggle={() => toggleMeeting(meeting.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Action Items Tab */}
        <TabsContent value="action-items" className="mt-4">
          {/* Action Item Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(['all', 'open', 'overdue', 'completed'] as const).map((filter) => (
              <Button
                key={filter}
                variant={actionItemFilter === filter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActionItemFilter(filter)}
              >
                {filter === 'all' && 'All'}
                {filter === 'open' && 'Open'}
                {filter === 'overdue' && 'Overdue'}
                {filter === 'completed' && 'Completed'}
                {filter === 'overdue' && summary && summary.overdue_action_items > 0 && (
                  <Badge variant="destructive" className="ml-1">{summary.overdue_action_items}</Badge>
                )}
              </Button>
            ))}
          </div>

          {/* Loading */}
          {actionItemsLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-muted-foreground">Loading action items...</div>
            </div>
          )}

          {/* Empty State */}
          {!actionItemsLoading && filteredActionItems.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="mb-2 heading-subsection">No Action Items Found</h3>
                  <p className="text-muted-foreground">
                    {actionItemFilter !== 'all'
                      ? 'Try changing your filter to see more action items.'
                      : 'Action items assigned to you will appear here.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Items List */}
          {!actionItemsLoading && filteredActionItems.length > 0 && (
            <div className="space-y-3">
              {filteredActionItems.map((item) => (
                <ActionItemCard
                  key={item.id}
                  item={item}
                  onMarkComplete={handleMarkComplete}
                  isLoading={markComplete.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Meeting Card Component
interface MeetingCardProps {
  meeting: SubcontractorMeeting
  isExpanded: boolean
  onToggle: () => void
}

function MeetingCard({ meeting, isExpanded, onToggle }: MeetingCardProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <CardTitle className="heading-card">{meeting.title}</CardTitle>
                  <CardDescription className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {meeting.project_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatMeetingDate(meeting.scheduled_date)}
                    </span>
                    {meeting.scheduled_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatMeetingTime(meeting.scheduled_time)}
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {meeting.is_virtual && (
                  <Badge variant="outline" className="gap-1">
                    <Video className="h-3 w-3" />
                    Virtual
                  </Badge>
                )}
                <Badge variant={getMeetingStatusBadgeVariant(meeting.status)}>
                  {getMeetingStatusLabel(meeting.status)}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 border-t">
            <div className="grid md:grid-cols-2 gap-6 pt-4">
              {/* Meeting Details */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>Type: {getMeetingTypeLabel(meeting.meeting_type)}</span>
                    </div>
                    {meeting.duration_minutes && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Duration: {formatDuration(meeting.duration_minutes)}</span>
                      </div>
                    )}
                    {meeting.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{meeting.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{meeting.total_attendees} attendees</span>
                      {meeting.subcontractor_attended && (
                        <Badge variant="secondary" className="text-xs">You attended</Badge>
                      )}
                    </div>
                    {meeting.attachments_count > 0 && (
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span>{meeting.attachments_count} attachment(s)</span>
                      </div>
                    )}
                  </div>
                </div>

                {meeting.description && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                    <p className="text-sm">{meeting.description}</p>
                  </div>
                )}
              </div>

              {/* Agenda & Minutes */}
              <div className="space-y-4">
                {meeting.agenda && meeting.agenda.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Agenda</h4>
                    <ul className="text-sm space-y-1">
                      {meeting.agenda.split('\n').filter(line => line.trim().length > 0).map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-muted-foreground">{i + 1}.</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {meeting.minutes_summary && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Minutes Summary</h4>
                    <p className="text-sm">{meeting.minutes_summary}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// Action Item Card Component
interface ActionItemCardProps {
  item: SubcontractorActionItem
  onMarkComplete: (id: string) => void
  isLoading: boolean
}

function ActionItemCard({ item, onMarkComplete, isLoading }: ActionItemCardProps) {
  const isOverdue = isActionItemOverdue(item)
  const canComplete = item.is_assigned_to_subcontractor &&
    (item.status === 'pending' || item.status === 'in_progress')

  return (
    <Card className={cn(isOverdue && 'border-destructive')}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-start gap-3">
              <div className={cn(
                'mt-0.5 p-1.5 rounded-full',
                item.status === 'completed' ? 'bg-success/10' :
                  isOverdue ? 'bg-destructive/10' : 'bg-muted'
              )}>
                {item.status === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : isOverdue ? (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                ) : (
                  <ListTodo className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <p className={cn(
                  'heading-subsection',
                  item.status === 'completed' && 'line-through text-muted-foreground'
                )}>
                  {item.description}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {item.meeting_title}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {item.project_name}
                  </span>
                  {item.due_date && (
                    <span className={cn(
                      'flex items-center gap-1',
                      isOverdue && 'text-destructive font-medium'
                    )}>
                      <Calendar className="h-3 w-3" />
                      Due: {formatMeetingDate(item.due_date)}
                      {isOverdue && ' (Overdue)'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Badge variant={getActionItemPriorityBadgeVariant(item.priority)}>
                {getActionItemPriorityLabel(item.priority)}
              </Badge>
              <Badge variant={getActionItemStatusBadgeVariant(item.status)}>
                {getActionItemStatusLabel(item.status)}
              </Badge>
            </div>
            {canComplete && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMarkComplete(item.id)}
                disabled={isLoading}
                className="gap-1"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Complete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
