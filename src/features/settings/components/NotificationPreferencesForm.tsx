/**
 * Notification Preferences Form Component
 *
 * Allows users to manage their email and in-app notification settings.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Bell, Mail, Moon, RotateCcw, Loader2 } from 'lucide-react'
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useResetNotificationPreferences,
  useEnableAllEmailNotifications,
  useDisableAllEmailNotifications,
  useUpdateQuietHours,
} from '../hooks/useNotificationPreferences'
import {
  type EmailNotificationPreferences,
  type NotificationPreferences,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_DESCRIPTIONS,
} from '@/types/notification-preferences'

// Timezones for quiet hours
const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
]

export function NotificationPreferencesForm() {
  const { data: preferences, isLoading } = useNotificationPreferences()
  const updatePreferences = useUpdateNotificationPreferences()
  const resetPreferences = useResetNotificationPreferences()
  const enableAll = useEnableAllEmailNotifications()
  const disableAll = useDisableAllEmailNotifications()
  const updateQuietHours = useUpdateQuietHours()

  // Local state for quiet hours form
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(
    preferences?.quietHours?.enabled || false
  )
  const [quietHoursStart, setQuietHoursStart] = useState(
    preferences?.quietHours?.start || '22:00'
  )
  const [quietHoursEnd, setQuietHoursEnd] = useState(
    preferences?.quietHours?.end || '07:00'
  )
  const [quietHoursTimezone, setQuietHoursTimezone] = useState(
    preferences?.quietHours?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!preferences) {
    return null
  }

  const handleEmailToggle = (key: keyof EmailNotificationPreferences, value: boolean) => {
    updatePreferences.mutate({
      email: { ...preferences.email, [key]: value },
    })
  }

  const handleInAppToggle = (value: boolean) => {
    updatePreferences.mutate({
      inApp: { all: value },
    })
  }

  const handleQuietHoursSave = () => {
    if (quietHoursEnabled) {
      updateQuietHours.mutate({
        enabled: true,
        start: quietHoursStart,
        end: quietHoursEnd,
        timezone: quietHoursTimezone,
      })
    } else {
      updateQuietHours.mutate(undefined)
    }
  }

  const emailSettings: (keyof EmailNotificationPreferences)[] = [
    'approvalRequests',
    'approvalCompleted',
    'safetyIncidents',
    'rfiAssigned',
    'rfiAnswered',
    'taskAssigned',
    'taskDueReminder',
    'punchItemAssigned',
    'documentComments',
    'dailyDigest',
  ]

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle>Email Notifications</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => enableAll.mutate()}
                disabled={enableAll.isPending}
              >
                Enable All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => disableAll.mutate()}
                disabled={disableAll.isPending}
              >
                Disable All
              </Button>
            </div>
          </div>
          <CardDescription>
            Choose which email notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailSettings.map((key) => (
            <div
              key={key}
              className="flex items-center justify-between py-2"
            >
              <div className="space-y-0.5">
                <Label htmlFor={key} className="text-sm font-medium">
                  {NOTIFICATION_TYPE_LABELS[key]}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {NOTIFICATION_TYPE_DESCRIPTIONS[key]}
                </p>
              </div>
              <Switch
                id={key}
                checked={preferences.email[key]}
                onCheckedChange={(value) => handleEmailToggle(key, value)}
                disabled={updatePreferences.isPending}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>In-App Notifications</CardTitle>
          </div>
          <CardDescription>
            Notifications that appear within the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="inapp-all" className="text-sm font-medium">
                Enable In-App Notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Show notification alerts and badges in the app
              </p>
            </div>
            <Switch
              id="inapp-all"
              checked={preferences.inApp.all}
              onCheckedChange={handleInAppToggle}
              disabled={updatePreferences.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            <CardTitle>Quiet Hours</CardTitle>
          </div>
          <CardDescription>
            Pause email notifications during specific hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="quiet-enabled" className="text-sm font-medium">
                Enable Quiet Hours
              </Label>
              <p className="text-xs text-muted-foreground">
                No email notifications will be sent during quiet hours
              </p>
            </div>
            <Switch
              id="quiet-enabled"
              checked={quietHoursEnabled}
              onCheckedChange={setQuietHoursEnabled}
            />
          </div>

          {quietHoursEnabled && (
            <>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start">Start Time</Label>
                  <input
                    id="quiet-start"
                    type="time"
                    value={quietHoursStart}
                    onChange={(e) => setQuietHoursStart(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-end">End Time</Label>
                  <input
                    id="quiet-end"
                    type="time"
                    value={quietHoursEnd}
                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-timezone">Timezone</Label>
                  <select
                    id="quiet-timezone"
                    value={quietHoursTimezone}
                    onChange={(e) => setQuietHoursTimezone(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                onClick={handleQuietHoursSave}
                disabled={updateQuietHours.isPending}
                className="mt-2"
              >
                {updateQuietHours.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save Quiet Hours
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Reset to Defaults */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                <Label className="text-sm font-medium">Reset to Defaults</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Restore all notification settings to their default values
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => resetPreferences.mutate()}
              disabled={resetPreferences.isPending}
            >
              {resetPreferences.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default NotificationPreferencesForm
