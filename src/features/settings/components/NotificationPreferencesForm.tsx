/**
 * Notification Preferences Form Component
 *
 * Allows users to manage their email, in-app, and push notification settings.
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Bell,
  Mail,
  Moon,
  RotateCcw,
  Loader2,
  Smartphone,
  Volume2,
  Vibrate,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useResetNotificationPreferences,
  useEnableAllEmailNotifications,
  useDisableAllEmailNotifications,
  useUpdateQuietHours,
} from '../hooks/useNotificationPreferences'
import { usePushNotifications } from '../hooks/usePushNotifications'
import {
  type EmailNotificationPreferences,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_DESCRIPTIONS,
} from '@/types/notification-preferences'
import {
  type PushNotificationPreferences,
  PUSH_TYPE_LABELS,
  PUSH_TYPE_DESCRIPTIONS,
  DEFAULT_PUSH_PREFERENCES,
} from '@/types/push-notifications'

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

  // Push notification hooks
  const {
    isSupported: pushSupported,
    permissionState,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush,
    pushPreferences,
    updatePushPreferences,
    testNotification,
  } = usePushNotifications()

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

  // Local state for push notification preferences
  const [localPushPrefs, setLocalPushPrefs] = useState<PushNotificationPreferences>(
    pushPreferences || DEFAULT_PUSH_PREFERENCES
  )

  // Sync local push prefs when data loads
  useEffect(() => {
    if (pushPreferences) {
      setLocalPushPrefs(pushPreferences)
    }
  }, [pushPreferences])

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

  // Push notification handlers
  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      await subscribeToPush()
    } else {
      await unsubscribeFromPush()
    }
  }

  const handlePushTypeToggle = (
    key: keyof PushNotificationPreferences['types'],
    value: boolean
  ) => {
    const newPrefs = {
      ...localPushPrefs,
      types: { ...localPushPrefs.types, [key]: value },
    }
    setLocalPushPrefs(newPrefs)
    updatePushPreferences(newPrefs)
  }

  const handleSoundToggle = (enabled: boolean) => {
    const newPrefs = {
      ...localPushPrefs,
      sound: { ...localPushPrefs.sound, enabled },
    }
    setLocalPushPrefs(newPrefs)
    updatePushPreferences(newPrefs)
  }

  const handleSoundVolume = (volume: number[]) => {
    const newPrefs = {
      ...localPushPrefs,
      sound: { ...localPushPrefs.sound, volume: volume[0] },
    }
    setLocalPushPrefs(newPrefs)
    updatePushPreferences(newPrefs)
  }

  const handleVibrationToggle = (enabled: boolean) => {
    const newPrefs = {
      ...localPushPrefs,
      vibration: { ...localPushPrefs.vibration, enabled },
    }
    setLocalPushPrefs(newPrefs)
    updatePushPreferences(newPrefs)
  }

  const handleVibrationPattern = (pattern: PushNotificationPreferences['vibration']['pattern']) => {
    const newPrefs = {
      ...localPushPrefs,
      vibration: { ...localPushPrefs.vibration, pattern },
    }
    setLocalPushPrefs(newPrefs)
    updatePushPreferences(newPrefs)
  }

  const handlePushQuietHoursToggle = (enabled: boolean) => {
    const newPrefs = {
      ...localPushPrefs,
      quietHours: { ...localPushPrefs.quietHours, enabled },
    }
    setLocalPushPrefs(newPrefs)
    updatePushPreferences(newPrefs)
  }

  const handlePushQuietHoursChange = (
    field: 'start' | 'end' | 'timezone' | 'allowCritical',
    value: string | boolean
  ) => {
    const newPrefs = {
      ...localPushPrefs,
      quietHours: { ...localPushPrefs.quietHours, [field]: value },
    }
    setLocalPushPrefs(newPrefs)
    updatePushPreferences(newPrefs)
  }

  const getPushPermissionBadge = () => {
    switch (permissionState) {
      case 'granted':
        return (
          <Badge variant="default" className="bg-success-light text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Enabled
          </Badge>
        )
      case 'denied':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Blocked
          </Badge>
        )
      case 'default':
        return (
          <Badge variant="secondary">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Not Set
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            Not Supported
          </Badge>
        )
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

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              <CardTitle>Push Notifications</CardTitle>
            </div>
            {getPushPermissionBadge()}
          </div>
          <CardDescription>
            Receive notifications even when the app is closed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!pushSupported && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Push notifications are not supported in this browser. Try using Chrome, Firefox, or Edge.
              </AlertDescription>
            </Alert>
          )}

          {pushSupported && permissionState === 'denied' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Push notifications are blocked. Please enable them in your browser settings to receive notifications.
              </AlertDescription>
            </Alert>
          )}

          {pushSupported && permissionState !== 'denied' && (
            <>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="push-enabled" className="text-sm font-medium">
                    Enable Push Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified on your device even when the browser is closed
                  </p>
                </div>
                <Switch
                  id="push-enabled"
                  checked={pushSubscribed}
                  onCheckedChange={handlePushToggle}
                  disabled={pushLoading}
                />
              </div>

              {pushSubscribed && (
                <>
                  <Separator />

                  {/* Notification Type Toggles */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium heading-card">Notification Types</h4>
                    {(Object.keys(PUSH_TYPE_LABELS) as Array<keyof typeof PUSH_TYPE_LABELS>).map(
                      (key) => (
                        <div key={key} className="flex items-center justify-between py-1">
                          <div className="space-y-0.5">
                            <Label htmlFor={`push-${key}`} className="text-sm">
                              {PUSH_TYPE_LABELS[key]}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {PUSH_TYPE_DESCRIPTIONS[key]}
                            </p>
                          </div>
                          <Switch
                            id={`push-${key}`}
                            checked={localPushPrefs.types[key]}
                            onCheckedChange={(value) => handlePushTypeToggle(key, value)}
                            disabled={key === 'safetyIncidents'} // Safety incidents always on
                          />
                        </div>
                      )
                    )}
                  </div>

                  <Separator />

                  {/* Sound Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      <h4 className="text-sm font-medium heading-card">Sound</h4>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <div className="space-y-0.5">
                        <Label htmlFor="push-sound" className="text-sm">
                          Notification Sound
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Play a sound when notifications arrive
                        </p>
                      </div>
                      <Switch
                        id="push-sound"
                        checked={localPushPrefs.sound.enabled}
                        onCheckedChange={handleSoundToggle}
                      />
                    </div>
                    {localPushPrefs.sound.enabled && (
                      <div className="space-y-2">
                        <Label className="text-sm">Volume</Label>
                        <Slider
                          value={[localPushPrefs.sound.volume]}
                          onValueChange={handleSoundVolume}
                          max={100}
                          step={10}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                          {localPushPrefs.sound.volume}%
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Vibration Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Vibrate className="h-4 w-4" />
                      <h4 className="text-sm font-medium heading-card">Vibration</h4>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <div className="space-y-0.5">
                        <Label htmlFor="push-vibrate" className="text-sm">
                          Vibrate on Notification
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Vibrate device when notifications arrive (mobile only)
                        </p>
                      </div>
                      <Switch
                        id="push-vibrate"
                        checked={localPushPrefs.vibration.enabled}
                        onCheckedChange={handleVibrationToggle}
                      />
                    </div>
                    {localPushPrefs.vibration.enabled && (
                      <div className="space-y-2">
                        <Label className="text-sm">Vibration Pattern</Label>
                        <div className="flex gap-2">
                          {(['short', 'medium', 'long'] as const).map((pattern) => (
                            <Button
                              key={pattern}
                              variant={
                                localPushPrefs.vibration.pattern === pattern
                                  ? 'default'
                                  : 'outline'
                              }
                              size="sm"
                              onClick={() => handleVibrationPattern(pattern)}
                            >
                              {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Push Quiet Hours */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      <h4 className="text-sm font-medium heading-card">Push Quiet Hours</h4>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <div className="space-y-0.5">
                        <Label htmlFor="push-quiet" className="text-sm">
                          Enable Quiet Hours for Push
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Silence push notifications during specific hours
                        </p>
                      </div>
                      <Switch
                        id="push-quiet"
                        checked={localPushPrefs.quietHours.enabled}
                        onCheckedChange={handlePushQuietHoursToggle}
                      />
                    </div>
                    {localPushPrefs.quietHours.enabled && (
                      <>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor="push-quiet-start">Start Time</Label>
                            <input
                              id="push-quiet-start"
                              type="time"
                              value={localPushPrefs.quietHours.start}
                              onChange={(e) =>
                                handlePushQuietHoursChange('start', e.target.value)
                              }
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="push-quiet-end">End Time</Label>
                            <input
                              id="push-quiet-end"
                              type="time"
                              value={localPushPrefs.quietHours.end}
                              onChange={(e) =>
                                handlePushQuietHoursChange('end', e.target.value)
                              }
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="push-quiet-tz">Timezone</Label>
                            <select
                              id="push-quiet-tz"
                              value={localPushPrefs.quietHours.timezone}
                              onChange={(e) =>
                                handlePushQuietHoursChange('timezone', e.target.value)
                              }
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                              {COMMON_TIMEZONES.map((tz) => (
                                <option key={tz.value} value={tz.value}>
                                  {tz.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <div className="space-y-0.5">
                            <Label htmlFor="push-quiet-critical" className="text-sm">
                              Allow Critical Alerts
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Safety incidents will still notify during quiet hours
                            </p>
                          </div>
                          <Switch
                            id="push-quiet-critical"
                            checked={localPushPrefs.quietHours.allowCritical}
                            onCheckedChange={(value) =>
                              handlePushQuietHoursChange('allowCritical', value)
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <Separator />

                  {/* Test Notification */}
                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Test Notification</Label>
                      <p className="text-xs text-muted-foreground">
                        Send a test push notification to verify setup
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testNotification()}
                      disabled={pushLoading}
                    >
                      {pushLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Send Test
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
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
