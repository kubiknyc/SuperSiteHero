/**
 * Milestone Notification Settings Component
 *
 * Main settings component for managing client milestone notification preferences.
 * Groups events by category and allows users to customize notification channels.
 */

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { NotificationChannelToggle } from './NotificationChannelToggle'
import { milestoneNotificationPreferencesApi } from '@/lib/api/services/milestone-notification-preferences'
import {
  MilestoneNotificationPreference,
  MilestoneEventType,
  EventCategory,
  NotificationChannel,
  MILESTONE_EVENT_METADATA,
  CATEGORY_METADATA,
  getEventTypesByCategory,
  DEFAULT_MILESTONE_PREFERENCES,
} from '@/types/milestone-notification-preferences'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle2, RotateCcw, Bell, BellOff } from 'lucide-react'
import toast from 'react-hot-toast'

// ============================================================================
// Types
// ============================================================================

export interface MilestoneNotificationSettingsProps {
  /** User ID for the preferences */
  userId: string
  /** Optional project ID for project-specific preferences */
  projectId?: string | null
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function MilestoneNotificationSettings({
  userId,
  projectId,
  className,
}: MilestoneNotificationSettingsProps) {
  const queryClient = useQueryClient()
  const [hasChanges, setHasChanges] = useState(false)
  const [localPreferences, setLocalPreferences] = useState<
    Map<MilestoneEventType, MilestoneNotificationPreference | null>
  >(new Map())

  // Fetch preferences
  const {
    data: preferences = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['milestone-notification-preferences', userId, projectId],
    queryFn: () => milestoneNotificationPreferencesApi.getPreferences(userId, projectId),
  })

  // Initialize local preferences when data loads
  useEffect(() => {
    if (preferences.length > 0) {
      const prefMap = new Map<MilestoneEventType, MilestoneNotificationPreference>()
      preferences.forEach((pref) => {
        prefMap.set(pref.event_type, pref)
      })
      setLocalPreferences(prefMap)
      setHasChanges(false)
    } else if (!isLoading) {
      // Initialize with defaults
      const defaultMap = new Map<MilestoneEventType, MilestoneNotificationPreference | null>()
      Object.keys(MILESTONE_EVENT_METADATA).forEach((eventType) => {
        defaultMap.set(eventType as MilestoneEventType, null)
      })
      setLocalPreferences(defaultMap)
    }
  }, [preferences, isLoading])

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: () => {
      const updates = Array.from(localPreferences.entries())
        .map(([eventType, pref]) => {
          if (!pref) {
            const defaults = DEFAULT_MILESTONE_PREFERENCES[eventType]
            return {
              event_type: eventType,
              ...defaults,
            }
          }
          return {
            event_type: eventType,
            email_enabled: pref.email_enabled,
            in_app_enabled: pref.in_app_enabled,
            sms_enabled: pref.sms_enabled,
            push_enabled: pref.push_enabled,
          }
        })

      return milestoneNotificationPreferencesApi.bulkUpdatePreferences({
        user_id: userId,
        project_id: projectId,
        preferences: updates,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone-notification-preferences'] })
      setHasChanges(false)
      toast.success('Notification preferences saved successfully')
    },
    onError: (error) => {
      toast.error('Failed to save preferences. Please try again.')
      console.error('Failed to save preferences:', error)
    },
  })

  // Reset to defaults mutation
  const resetMutation = useMutation({
    mutationFn: () => milestoneNotificationPreferencesApi.resetToDefaults(userId, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone-notification-preferences'] })
      setHasChanges(false)
      toast.success('Preferences reset to defaults')
    },
    onError: (error) => {
      toast.error('Failed to reset preferences. Please try again.')
      console.error('Failed to reset preferences:', error)
    },
  })

  // Handle channel toggle
  const handleChannelToggle = (
    eventType: MilestoneEventType,
    channel: NotificationChannel,
    enabled: boolean
  ) => {
    setLocalPreferences((prev) => {
      const newMap = new Map(prev)
      const currentPref = newMap.get(eventType)

      if (currentPref) {
        newMap.set(eventType, {
          ...currentPref,
          [`${channel}_enabled`]: enabled,
        })
      } else {
        // Create new preference from defaults
        const defaults = DEFAULT_MILESTONE_PREFERENCES[eventType]
        newMap.set(eventType, {
          id: '',
          user_id: userId,
          project_id: projectId || null,
          event_type: eventType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...defaults,
          [`${channel}_enabled`]: enabled,
        })
      }

      return newMap
    })
    setHasChanges(true)
  }

  // Handle master toggle for event
  const handleEventToggle = (eventType: MilestoneEventType, enabled: boolean) => {
    setLocalPreferences((prev) => {
      const newMap = new Map(prev)
      const currentPref = newMap.get(eventType)
      const metadata = MILESTONE_EVENT_METADATA[eventType]

      if (currentPref) {
        newMap.set(eventType, {
          ...currentPref,
          email_enabled: enabled && metadata.availableChannels.includes('email'),
          in_app_enabled: enabled && metadata.availableChannels.includes('in_app'),
          sms_enabled: false, // Keep SMS/Push off by default
          push_enabled: false,
        })
      } else {
        const defaults = DEFAULT_MILESTONE_PREFERENCES[eventType]
        newMap.set(eventType, {
          id: '',
          user_id: userId,
          project_id: projectId || null,
          event_type: eventType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...defaults,
          email_enabled: enabled && metadata.availableChannels.includes('email'),
          in_app_enabled: enabled && metadata.availableChannels.includes('in_app'),
          sms_enabled: false,
          push_enabled: false,
        })
      }

      return newMap
    })
    setHasChanges(true)
  }

  // Get preference or default
  const getPreference = (eventType: MilestoneEventType) => {
    const pref = localPreferences.get(eventType)
    if (pref) return pref

    // Return defaults
    const defaults = DEFAULT_MILESTONE_PREFERENCES[eventType]
    return {
      id: '',
      user_id: userId,
      project_id: projectId || null,
      event_type: eventType,
      created_at: '',
      updated_at: '',
      ...defaults,
    }
  }

  // Check if any channel is enabled for an event
  const isEventEnabled = (eventType: MilestoneEventType) => {
    const pref = getPreference(eventType)
    return pref.email_enabled || pref.in_app_enabled || pref.sms_enabled || pref.push_enabled
  }

  // Get grouped events by category
  const groupedEvents = React.useMemo(() => {
    const categories = Object.keys(CATEGORY_METADATA) as EventCategory[]
    return categories.map((category) => ({
      category,
      metadata: CATEGORY_METADATA[category],
      eventTypes: getEventTypesByCategory(category),
    }))
  }, [])

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className={cn('border-red-200', className)}>
        <CardContent className="py-8">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load notification preferences. Please try again.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notification Preferences</h2>
          <p className="text-gray-600 mt-1">
            Choose which milestone events you want to be notified about and how you'd like to receive them.
          </p>
        </div>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600" />
              <span>In-App notifications appear in the application</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                SMS/Push coming soon
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Groups */}
      <Accordion type="multiple" defaultValue={groupedEvents.map((g) => g.category)} className="space-y-4">
        {groupedEvents.map(({ category, metadata, eventTypes }) => (
          <AccordionItem key={category} value={category} className="border rounded-lg">
            <AccordionTrigger className="px-6 hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-gray-900">{metadata.label}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{metadata.description}</p>
                </div>
                <Badge variant="secondary" className="ml-4">
                  {eventTypes.filter(isEventEnabled).length} / {eventTypes.length} enabled
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <div className="space-y-3 mt-2">
                {eventTypes.map((eventType) => {
                  const eventMetadata = MILESTONE_EVENT_METADATA[eventType]
                  const pref = getPreference(eventType)
                  const enabled = isEventEnabled(eventType)

                  return (
                    <div
                      key={eventType}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) => handleEventToggle(eventType, checked)}
                          aria-label={`Toggle ${eventMetadata.label}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{eventMetadata.label}</h4>
                            {!enabled && <BellOff className="h-4 w-4 text-gray-400" />}
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {eventMetadata.description}
                          </p>
                        </div>
                      </div>
                      <NotificationChannelToggle
                        enabledChannels={{
                          email: pref.email_enabled,
                          in_app: pref.in_app_enabled,
                          sms: pref.sms_enabled,
                          push: pref.push_enabled,
                        }}
                        availableChannels={eventMetadata.availableChannels}
                        onChange={(channel, isEnabled) =>
                          handleChannelToggle(eventType, channel, isEnabled)
                        }
                        disabled={!enabled}
                      />
                    </div>
                  )
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Action Buttons */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending || bulkUpdateMutation.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <div className="flex items-center gap-3">
              {hasChanges && (
                <span className="text-sm text-amber-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  You have unsaved changes
                </span>
              )}
              <Button
                onClick={() => bulkUpdateMutation.mutate()}
                disabled={!hasChanges || bulkUpdateMutation.isPending}
              >
                {bulkUpdateMutation.isPending ? (
                  <>Saving...</>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
