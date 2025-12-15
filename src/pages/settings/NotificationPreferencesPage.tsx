/**
 * Notification Preferences Page
 *
 * Allows users to manage their email and in-app notification preferences.
 */

import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Bell,
  Mail,
  Clock,
  RefreshCw,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useResetNotificationPreferences,
  useEnableAllEmailNotifications,
  useDisableAllEmailNotifications,
  useUpdateQuietHours,
} from '@/features/settings/hooks/useNotificationPreferences'
import {
  type EmailNotificationPreferences,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_DESCRIPTIONS,
} from '@/types/notification-preferences'
import { toast } from 'sonner'
import { useState } from 'react'

export function NotificationPreferencesPage() {
  const { data: preferences, isLoading, error } = useNotificationPreferences()
  const updateMutation = useUpdateNotificationPreferences()
  const resetMutation = useResetNotificationPreferences()
  const enableAllMutation = useEnableAllEmailNotifications()
  const disableAllMutation = useDisableAllEmailNotifications()
  const quietHoursMutation = useUpdateQuietHours()

  const [quietHoursEnabled, setQuietHoursEnabled] = useState(preferences?.quietHours?.enabled ?? false)
  const [quietHoursStart, setQuietHoursStart] = useState(preferences?.quietHours?.start ?? '22:00')
  const [quietHoursEnd, setQuietHoursEnd] = useState(preferences?.quietHours?.end ?? '07:00')

  // Update local state when preferences load
  if (preferences?.quietHours && !quietHoursEnabled && preferences.quietHours.enabled) {
    setQuietHoursEnabled(true)
    setQuietHoursStart(preferences.quietHours.start)
    setQuietHoursEnd(preferences.quietHours.end)
  }

  const handleToggleEmailPreference = async (key: keyof EmailNotificationPreferences) => {
    if (!preferences) {return}

    const newValue = !preferences.email[key]
    await updateMutation.mutateAsync({
      email: {
        ...preferences.email,
        [key]: newValue,
      },
    })
  }

  const handleToggleInApp = async () => {
    if (!preferences) {return}

    await updateMutation.mutateAsync({
      inApp: {
        all: !preferences.inApp.all,
      },
    })
  }

  const handleSaveQuietHours = async () => {
    if (quietHoursEnabled) {
      await quietHoursMutation.mutateAsync({
        enabled: true,
        start: quietHoursStart,
        end: quietHoursEnd,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
    } else {
      await quietHoursMutation.mutateAsync(undefined)
    }
    toast.success('Quiet hours settings saved')
  }

  const handleEnableAll = async () => {
    await enableAllMutation.mutateAsync()
  }

  const handleDisableAll = async () => {
    await disableAllMutation.mutateAsync()
  }

  const handleReset = async () => {
    await resetMutation.mutateAsync()
    setQuietHoursEnabled(false)
    setQuietHoursStart('22:00')
    setQuietHoursEnd('07:00')
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <p className="text-muted-foreground">Failed to load notification preferences</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </AppLayout>
    )
  }

  const emailPreferenceKeys = Object.keys(NOTIFICATION_TYPE_LABELS) as (keyof EmailNotificationPreferences)[]
  const enabledCount = emailPreferenceKeys.filter(key => preferences?.email[key]).length
  const totalCount = emailPreferenceKeys.length

  return (
    <AppLayout>
      <div className="container max-w-4xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notification Preferences</h1>
            <p className="text-muted-foreground">
              Manage how and when you receive notifications
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {enabledCount}/{totalCount} email notifications enabled
          </Badge>
        </div>

        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Email Notifications</CardTitle>
                  <CardDescription>
                    Choose which emails you'd like to receive
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnableAll}
                  disabled={enableAllMutation.isPending}
                >
                  Enable All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisableAll}
                  disabled={disableAllMutation.isPending}
                >
                  Disable All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {emailPreferenceKeys.map((key) => (
              <div
                key={key}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="space-y-0.5">
                  <Label htmlFor={key} className="text-sm font-medium">
                    {NOTIFICATION_TYPE_LABELS[key]}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {NOTIFICATION_TYPE_DESCRIPTIONS[key]}
                  </p>
                </div>
                <Switch
                  id={key}
                  checked={preferences?.email[key] ?? false}
                  onCheckedChange={() => handleToggleEmailPreference(key)}
                  disabled={updateMutation.isPending}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* In-App Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Bell className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle>In-App Notifications</CardTitle>
                <CardDescription>
                  Notifications shown within the application
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-3">
              <div className="space-y-0.5">
                <Label htmlFor="inapp-all" className="text-sm font-medium">
                  Enable In-App Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show notification badges and alerts in the app
                </p>
              </div>
              <Switch
                id="inapp-all"
                checked={preferences?.inApp.all ?? true}
                onCheckedChange={handleToggleInApp}
                disabled={updateMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Quiet Hours</CardTitle>
                <CardDescription>
                  Pause email notifications during specific hours
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3">
              <div className="space-y-0.5">
                <Label htmlFor="quiet-hours" className="text-sm font-medium">
                  Enable Quiet Hours
                </Label>
                <p className="text-sm text-muted-foreground">
                  No email notifications during these hours
                </p>
              </div>
              <Switch
                id="quiet-hours"
                checked={quietHoursEnabled}
                onCheckedChange={setQuietHoursEnabled}
              />
            </div>

            {quietHoursEnabled && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={quietHoursStart}
                      onChange={(e) => setQuietHoursStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">End Time</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={quietHoursEnd}
                      onChange={(e) => setQuietHoursEnd(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
                <Button
                  onClick={handleSaveQuietHours}
                  disabled={quietHoursMutation.isPending}
                  className="w-full"
                >
                  {quietHoursMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Save Quiet Hours
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Reset Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Reset to Defaults</p>
                <p className="text-sm text-muted-foreground">
                  Restore all notification settings to their default values
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

export default NotificationPreferencesPage
