/**
 * Submittal Reminders Panel Component
 *
 * Displays submittals approaching their submit-by dates with
 * reminder levels and quick actions.
 *
 * Features:
 * - List of upcoming reminders
 * - Add/edit/delete reminders
 * - Notification preferences
 * - Snooze functionality
 */

import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { format, addDays } from 'date-fns'
import {
  AlertTriangle,
  Bell,
  BellOff,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Mail,
  Truck,
  Plus,
  Settings,
  Trash2,
  Edit,
  MessageSquare,
  Smartphone,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  useSubmittalsWithReminders,
  useSubmittalReminderStats,
  useRecordSubmittalReminder,
  useSnoozeSubmittalReminder,
  DEFAULT_REMINDER_CONFIG,
  type SubmittalWithReminder,
  type ReminderConfig,
} from '../hooks/useSubmittalReminders'

// ============================================================================
// Types
// ============================================================================

interface SubmittalRemindersPanelProps {
  projectId: string
  workflowTypeId: string
  className?: string
  /** Show full view with settings tab */
  showSettings?: boolean
}

interface NotificationPreferences {
  emailEnabled: boolean
  inAppEnabled: boolean
  pushEnabled: boolean
  reminderDays: number[]
  digestFrequency: 'daily' | 'weekly' | 'none'
}

interface CustomReminder {
  id: string
  submittalId: string
  submittalNumber: string | null
  submittalTitle: string
  reminderDate: Date
  message: string
  notificationType: 'email' | 'in_app' | 'both'
  isActive: boolean
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatSubmittalNumber(number: number | null): string {
  return `SUB-${String(number || 0).padStart(4, '0')}`
}

function getReminderBadge(level: SubmittalWithReminder['reminderLevel']) {
  switch (level) {
    case 'overdue':
      return {
        variant: 'destructive' as const,
        className: 'bg-red-600',
        icon: AlertTriangle,
        label: 'Overdue',
      }
    case 'critical':
      return {
        variant: 'destructive' as const,
        className: 'bg-red-500',
        icon: Clock,
        label: 'Critical',
      }
    case 'urgent':
      return {
        variant: 'secondary' as const,
        className: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: Clock,
        label: 'Urgent',
      }
    case 'upcoming':
      return {
        variant: 'secondary' as const,
        className: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: Bell,
        label: 'Due Soon',
      }
    default:
      return {
        variant: 'secondary' as const,
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle2,
        label: 'On Track',
      }
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

interface ReminderItemProps {
  submittal: SubmittalWithReminder
  onSendReminder: (id: string) => void
  onSnooze: (id: string, days: number) => void
  isSending: boolean
}

function ReminderItem({ submittal, onSendReminder, onSnooze, isSending }: ReminderItemProps) {
  const badge = getReminderBadge(submittal.reminderLevel)
  const Icon = badge.icon

  return (
    <div className={cn(
      'p-3 rounded-lg border transition-colors',
      submittal.reminderLevel === 'overdue' && 'bg-red-50 border-red-200',
      submittal.reminderLevel === 'critical' && 'bg-red-50/50 border-red-200',
      submittal.reminderLevel === 'urgent' && 'bg-orange-50 border-orange-200',
      submittal.reminderLevel === 'upcoming' && 'bg-amber-50 border-amber-200'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn(
            'p-2 rounded-lg',
            submittal.reminderLevel === 'overdue' && 'bg-red-100',
            submittal.reminderLevel === 'critical' && 'bg-red-100',
            submittal.reminderLevel === 'urgent' && 'bg-orange-100',
            submittal.reminderLevel === 'upcoming' && 'bg-amber-100'
          )}>
            <Icon className={cn(
              'h-4 w-4',
              submittal.reminderLevel === 'overdue' && 'text-red-700',
              submittal.reminderLevel === 'critical' && 'text-red-600',
              submittal.reminderLevel === 'urgent' && 'text-orange-600',
              submittal.reminderLevel === 'upcoming' && 'text-amber-600'
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link
                to={`/projects/${submittal.projectId}/submittals/${submittal.id}`}
                className="font-semibold text-foreground text-sm hover:text-primary"
              >
                {formatSubmittalNumber(submittal.number)}
              </Link>
              <Badge variant={badge.variant} className={cn('text-xs', badge.className)}>
                {badge.label}
              </Badge>
            </div>
            <p className="text-sm text-secondary truncate mb-1">{submittal.title}</p>
            <p className={cn(
              'text-xs font-medium',
              submittal.reminderLevel === 'overdue' && 'text-red-700',
              submittal.reminderLevel === 'critical' && 'text-red-600',
              submittal.reminderLevel === 'urgent' && 'text-orange-600',
              submittal.reminderLevel === 'upcoming' && 'text-amber-600'
            )}>
              {submittal.reminderMessage}
            </p>
            {submittal.submitByDate && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Submit by: {format(submittal.submitByDate, 'MMM d, yyyy')}</span>
                {submittal.requiredOnSite && (
                  <>
                    <Truck className="h-3 w-3 ml-2" />
                    <span>On-site: {format(submittal.requiredOnSite, 'MMM d')}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onSendReminder(submittal.id)}
                  disabled={isSending}
                >
                  <Mail className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send reminder</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <BellOff className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSnooze(submittal.id, 1)}>
                Snooze 1 day
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(submittal.id, 3)}>
                Snooze 3 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(submittal.id, 7)}>
                Snooze 1 week
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link to={`/projects/${submittal.projectId}/submittals/${submittal.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Notification Preferences Sub-Component
// ============================================================================

interface NotificationPreferencesFormProps {
  preferences: NotificationPreferences
  onChange: (preferences: NotificationPreferences) => void
}

function NotificationPreferencesForm({ preferences, onChange }: NotificationPreferencesFormProps) {
  const handleChange = useCallback((key: keyof NotificationPreferences, value: unknown) => {
    onChange({ ...preferences, [key]: value })
  }, [preferences, onChange])

  return (
    <div className="space-y-6">
      {/* Notification Channels */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground">Notification Channels</h4>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-xs text-muted-foreground">Receive reminder emails</p>
            </div>
          </div>
          <Switch
            id="email-notifications"
            checked={preferences.emailEnabled}
            onCheckedChange={(checked) => handleChange('emailEnabled', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="in-app-notifications">In-App Notifications</Label>
              <p className="text-xs text-muted-foreground">Show notifications in the app</p>
            </div>
          </div>
          <Switch
            id="in-app-notifications"
            checked={preferences.inAppEnabled}
            onCheckedChange={(checked) => handleChange('inAppEnabled', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="push-notifications">Push Notifications</Label>
              <p className="text-xs text-muted-foreground">Mobile push notifications</p>
            </div>
          </div>
          <Switch
            id="push-notifications"
            checked={preferences.pushEnabled}
            onCheckedChange={(checked) => handleChange('pushEnabled', checked)}
          />
        </div>
      </div>

      <Separator />

      {/* Reminder Timing */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground">Reminder Timing</h4>
        <p className="text-xs text-muted-foreground">
          Send reminders at these intervals before the submit-by date
        </p>

        <div className="flex flex-wrap gap-2">
          {[3, 7, 14, 21, 30].map((days) => (
            <Button
              key={days}
              variant={preferences.reminderDays.includes(days) ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                const newDays = preferences.reminderDays.includes(days)
                  ? preferences.reminderDays.filter(d => d !== days)
                  : [...preferences.reminderDays, days].sort((a, b) => a - b)
                handleChange('reminderDays', newDays)
              }}
            >
              {days} days
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Digest Frequency */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground">Digest Summary</h4>
        <p className="text-xs text-muted-foreground">
          Receive a summary of upcoming submittal deadlines
        </p>

        <Select
          value={preferences.digestFrequency}
          onValueChange={(value: NotificationPreferences['digestFrequency']) =>
            handleChange('digestFrequency', value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily digest</SelectItem>
            <SelectItem value="weekly">Weekly digest</SelectItem>
            <SelectItem value="none">No digest</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// ============================================================================
// Add Reminder Dialog Sub-Component
// ============================================================================

interface AddReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  submittals: SubmittalWithReminder[]
  onAdd: (reminder: Omit<CustomReminder, 'id'>) => void
}

function AddReminderDialog({ open, onOpenChange, submittals, onAdd }: AddReminderDialogProps) {
  const [selectedSubmittal, setSelectedSubmittal] = useState<string>('')
  const [reminderDate, setReminderDate] = useState('')
  const [message, setMessage] = useState('')
  const [notificationType, setNotificationType] = useState<'email' | 'in_app' | 'both'>('both')

  const handleSubmit = useCallback(() => {
    const submittal = submittals.find(s => s.id === selectedSubmittal)
    if (!submittal || !reminderDate) return

    onAdd({
      submittalId: selectedSubmittal,
      submittalNumber: submittal.number?.toString() || null,
      submittalTitle: submittal.title,
      reminderDate: new Date(reminderDate),
      message: message || `Reminder: ${submittal.title} is due soon`,
      notificationType,
      isActive: true,
    })

    // Reset form
    setSelectedSubmittal('')
    setReminderDate('')
    setMessage('')
    setNotificationType('both')
    onOpenChange(false)
  }, [selectedSubmittal, reminderDate, message, notificationType, submittals, onAdd, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Custom Reminder</DialogTitle>
          <DialogDescription>
            Create a custom reminder for a specific submittal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Submittal</Label>
            <Select value={selectedSubmittal} onValueChange={setSelectedSubmittal}>
              <SelectTrigger>
                <SelectValue placeholder="Select a submittal" />
              </SelectTrigger>
              <SelectContent>
                {submittals.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {formatSubmittalNumber(s.number)} - {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder-date">Reminder Date</Label>
            <Input
              id="reminder-date"
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder-message">Message (optional)</Label>
            <Input
              id="reminder-message"
              placeholder="Enter a custom reminder message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notification Type</Label>
            <Select value={notificationType} onValueChange={(v: 'email' | 'in_app' | 'both') => setNotificationType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email only</SelectItem>
                <SelectItem value="in_app">In-app only</SelectItem>
                <SelectItem value="both">Email and in-app</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedSubmittal || !reminderDate}>
            Add Reminder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function SubmittalRemindersPanel({
  projectId,
  workflowTypeId,
  className,
  showSettings = false,
}: SubmittalRemindersPanelProps) {
  const { toast } = useToast()
  const { data: submittals, isLoading, error } = useSubmittalsWithReminders(projectId, workflowTypeId)
  const stats = useSubmittalReminderStats(projectId, workflowTypeId)
  const recordReminder = useRecordSubmittalReminder()
  const snoozeReminder = useSnoozeSubmittalReminder()

  // Local state for custom reminders and preferences
  const [customReminders, setCustomReminders] = useState<CustomReminder[]>([])
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailEnabled: true,
    inAppEnabled: true,
    pushEnabled: false,
    reminderDays: [3, 7, 14],
    digestFrequency: 'weekly',
  })
  const [addReminderOpen, setAddReminderOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('reminders')

  const handleSendReminder = async (submittalId: string) => {
    const submittal = submittals?.find(s => s.id === submittalId)
    if (!submittal) return

    try {
      await recordReminder.mutateAsync({
        submittalId,
        reminderType: preferences.emailEnabled && preferences.inAppEnabled ? 'both' :
                      preferences.emailEnabled ? 'email' : 'in_app',
        recipients: submittal.assignees,
      })

      toast({
        title: 'Reminder Sent',
        description: `Reminder recorded for ${formatSubmittalNumber(submittal.number)}`,
      })
    } catch {
      toast({
        title: 'Failed to Send',
        description: 'Could not send the reminder. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleSnooze = async (submittalId: string, days: number) => {
    try {
      await snoozeReminder.mutateAsync({ submittalId, snoozeDays: days })

      toast({
        title: 'Reminder Snoozed',
        description: `Reminder snoozed for ${days} day${days !== 1 ? 's' : ''}`,
      })
    } catch {
      toast({
        title: 'Snooze Failed',
        description: 'Could not snooze the reminder. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleAddReminder = useCallback((reminder: Omit<CustomReminder, 'id'>) => {
    const newReminder: CustomReminder = {
      ...reminder,
      id: crypto.randomUUID(),
    }
    setCustomReminders(prev => [...prev, newReminder])

    toast({
      title: 'Reminder Created',
      description: `Custom reminder added for ${format(reminder.reminderDate, 'MMM d, yyyy')}`,
    })
  }, [toast])

  const handleDeleteReminder = useCallback((reminderId: string) => {
    setCustomReminders(prev => prev.filter(r => r.id !== reminderId))

    toast({
      title: 'Reminder Deleted',
      description: 'Custom reminder has been removed',
    })
  }, [toast])

  const handleToggleReminder = useCallback((reminderId: string) => {
    setCustomReminders(prev => prev.map(r =>
      r.id === reminderId ? { ...r, isActive: !r.isActive } : r
    ))
  }, [])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-5 bg-muted rounded w-48 mb-2" />
            <div className="h-4 bg-muted rounded w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-error mx-auto mb-2" />
          <p className="text-sm text-secondary">Failed to load submittal reminders</p>
        </CardContent>
      </Card>
    )
  }

  const hasReminders = submittals && submittals.length > 0
  const urgentCount = stats.overdue + stats.critical
  const hasCustomReminders = customReminders.length > 0

  // Render content based on showSettings prop
  if (showSettings) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-warning" />
              <CardTitle className="text-lg">Submittal Reminders</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {urgentCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {urgentCount} Urgent
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddReminderOpen(true)}
                disabled={!submittals || submittals.length === 0}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Reminder
              </Button>
            </div>
          </div>
          <CardDescription>
            Manage submittal reminders and notification preferences
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="reminders">
                Reminders
                {hasReminders && (
                  <Badge variant="secondary" className="ml-2 h-5 min-w-[20px]">
                    {submittals.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="custom">
                Custom
                {hasCustomReminders && (
                  <Badge variant="secondary" className="ml-2 h-5 min-w-[20px]">
                    {customReminders.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reminders" className="mt-4">
              {/* Stats Summary */}
              {hasReminders && (
                <>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className={cn(
                      'text-center p-2 rounded-lg',
                      stats.overdue > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted/50'
                    )}>
                      <p className={cn(
                        'text-xl font-bold',
                        stats.overdue > 0 ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'
                      )}>
                        {stats.overdue}
                      </p>
                      <p className="text-xs text-muted-foreground">Overdue</p>
                    </div>
                    <div className={cn(
                      'text-center p-2 rounded-lg',
                      stats.critical > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-muted/50'
                    )}>
                      <p className={cn(
                        'text-xl font-bold',
                        stats.critical > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                      )}>
                        {stats.critical}
                      </p>
                      <p className="text-xs text-muted-foreground">Critical</p>
                    </div>
                    <div className={cn(
                      'text-center p-2 rounded-lg',
                      stats.urgent > 0 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-muted/50'
                    )}>
                      <p className={cn(
                        'text-xl font-bold',
                        stats.urgent > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'
                      )}>
                        {stats.urgent}
                      </p>
                      <p className="text-xs text-muted-foreground">Urgent</p>
                    </div>
                    <div className={cn(
                      'text-center p-2 rounded-lg',
                      stats.upcoming > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-muted/50'
                    )}>
                      <p className={cn(
                        'text-xl font-bold',
                        stats.upcoming > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                      )}>
                        {stats.upcoming}
                      </p>
                      <p className="text-xs text-muted-foreground">Due Soon</p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                </>
              )}

              {/* Reminders List */}
              {hasReminders ? (
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-2">
                    {submittals.map((submittal) => (
                      <ReminderItem
                        key={submittal.id}
                        submittal={submittal}
                        onSendReminder={handleSendReminder}
                        onSnooze={handleSnooze}
                        isSending={recordReminder.isPending}
                      />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
                  <p className="text-secondary font-medium">All Clear!</p>
                  <p className="text-sm text-muted-foreground">
                    No submittals need immediate attention
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="custom" className="mt-4">
              {/* Custom Reminders List */}
              {hasCustomReminders ? (
                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-2">
                    {customReminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className={cn(
                          'p-3 rounded-lg border transition-colors',
                          reminder.isActive ? 'bg-muted/30' : 'bg-muted/10 opacity-60'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-foreground text-sm">
                                {reminder.submittalNumber
                                  ? formatSubmittalNumber(parseInt(reminder.submittalNumber))
                                  : 'Custom'}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {format(reminder.reminderDate, 'MMM d')}
                              </Badge>
                              {!reminder.isActive && (
                                <Badge variant="secondary" className="text-xs">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-secondary truncate mb-1">
                              {reminder.submittalTitle}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {reminder.message}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              {reminder.notificationType === 'email' || reminder.notificationType === 'both' ? (
                                <Mail className="h-3 w-3" />
                              ) : null}
                              {reminder.notificationType === 'in_app' || reminder.notificationType === 'both' ? (
                                <Bell className="h-3 w-3" />
                              ) : null}
                              <span>
                                {reminder.notificationType === 'both'
                                  ? 'Email & In-app'
                                  : reminder.notificationType === 'email'
                                  ? 'Email'
                                  : 'In-app'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleToggleReminder(reminder.id)}
                                  >
                                    {reminder.isActive ? (
                                      <BellOff className="h-4 w-4" />
                                    ) : (
                                      <Bell className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {reminder.isActive ? 'Disable' : 'Enable'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteReminder(reminder.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-secondary font-medium">No Custom Reminders</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create custom reminders for specific submittals
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddReminderOpen(true)}
                    disabled={!submittals || submittals.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Reminder
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings" className="mt-4">
              <NotificationPreferencesForm
                preferences={preferences}
                onChange={setPreferences}
              />

              <div className="mt-6 pt-4 border-t">
                <Button
                  className="w-full"
                  onClick={() => {
                    toast({
                      title: 'Preferences Saved',
                      description: 'Your notification preferences have been updated',
                    })
                  }}
                >
                  Save Preferences
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t">
            <Link to={`/projects/${projectId}/submittals`}>
              <Button variant="outline" size="sm" className="w-full">
                View All Submittals
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>

        {/* Add Reminder Dialog */}
        <AddReminderDialog
          open={addReminderOpen}
          onOpenChange={setAddReminderOpen}
          submittals={submittals || []}
          onAdd={handleAddReminder}
        />
      </Card>
    )
  }

  // Simple view (default)
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-warning" />
            <CardTitle className="text-lg">Submittal Reminders</CardTitle>
          </div>
          {urgentCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {urgentCount} Urgent
            </Badge>
          )}
        </div>
        <CardDescription>
          Submittals approaching or past their submit-by dates
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Stats Summary */}
        {hasReminders && (
          <>
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className={cn(
                'text-center p-2 rounded-lg',
                stats.overdue > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted/50'
              )}>
                <p className={cn(
                  'text-xl font-bold',
                  stats.overdue > 0 ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'
                )}>
                  {stats.overdue}
                </p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
              <div className={cn(
                'text-center p-2 rounded-lg',
                stats.critical > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-muted/50'
              )}>
                <p className={cn(
                  'text-xl font-bold',
                  stats.critical > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                )}>
                  {stats.critical}
                </p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
              <div className={cn(
                'text-center p-2 rounded-lg',
                stats.urgent > 0 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-muted/50'
              )}>
                <p className={cn(
                  'text-xl font-bold',
                  stats.urgent > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'
                )}>
                  {stats.urgent}
                </p>
                <p className="text-xs text-muted-foreground">Urgent</p>
              </div>
              <div className={cn(
                'text-center p-2 rounded-lg',
                stats.upcoming > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-muted/50'
              )}>
                <p className={cn(
                  'text-xl font-bold',
                  stats.upcoming > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                )}>
                  {stats.upcoming}
                </p>
                <p className="text-xs text-muted-foreground">Due Soon</p>
              </div>
            </div>

            <Separator className="my-4" />
          </>
        )}

        {/* Reminders List */}
        {hasReminders ? (
          <ScrollArea className="h-[350px] pr-4">
            <div className="space-y-2">
              {submittals.map((submittal) => (
                <ReminderItem
                  key={submittal.id}
                  submittal={submittal}
                  onSendReminder={handleSendReminder}
                  onSnooze={handleSnooze}
                  isSending={recordReminder.isPending}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
            <p className="text-secondary font-medium">All Clear!</p>
            <p className="text-sm text-muted-foreground">
              No submittals need immediate attention
            </p>
          </div>
        )}

        {/* Footer */}
        {hasReminders && (
          <div className="mt-4 pt-4 border-t">
            <Link to={`/projects/${projectId}/submittals`}>
              <Button variant="outline" size="sm" className="w-full">
                View All Submittals
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SubmittalRemindersPanel
