/**
 * Notification Channel Toggle Component
 *
 * Multi-select component for notification channels with icons.
 * Allows users to select which channels they want to receive notifications on.
 */

import React from 'react'
import { Mail, Bell, MessageSquare, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationChannel } from '@/types/milestone-notification-preferences'

// ============================================================================
// Types
// ============================================================================

export interface NotificationChannelToggleProps {
  /** Currently enabled channels */
  enabledChannels: {
    email: boolean
    in_app: boolean
    sms: boolean
    push: boolean
  }
  /** Available channels for this event type */
  availableChannels: NotificationChannel[]
  /** Callback when channels change */
  onChange: (channel: NotificationChannel, enabled: boolean) => void
  /** Whether the component is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// Channel Configuration
// ============================================================================

const CHANNEL_CONFIG: Record<
  NotificationChannel,
  {
    icon: React.ComponentType<{ className?: string }>
    label: string
    description: string
  }
> = {
  email: {
    icon: Mail,
    label: 'Email',
    description: 'Receive notifications via email',
  },
  in_app: {
    icon: Bell,
    label: 'In-App',
    description: 'Receive notifications in the application',
  },
  sms: {
    icon: MessageSquare,
    label: 'SMS',
    description: 'Receive notifications via text message',
  },
  push: {
    icon: Smartphone,
    label: 'Push',
    description: 'Receive push notifications on mobile',
  },
}

// ============================================================================
// Component
// ============================================================================

export function NotificationChannelToggle({
  enabledChannels,
  availableChannels,
  onChange,
  disabled = false,
  className,
}: NotificationChannelToggleProps) {
  const handleChannelToggle = (channel: NotificationChannel) => {
    if (disabled || !availableChannels.includes(channel)) {
      return
    }

    const channelKey = `${channel}_enabled` as keyof typeof enabledChannels
    const currentValue = enabledChannels[channelKey]
    onChange(channel, !currentValue)
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {(['email', 'in_app', 'sms', 'push'] as NotificationChannel[]).map((channel) => {
        const config = CHANNEL_CONFIG[channel]
        const Icon = config.icon
        const isAvailable = availableChannels.includes(channel)
        const channelKey = `${channel}_enabled` as keyof typeof enabledChannels
        const isEnabled = enabledChannels[channelKey]

        return (
          <button
            key={channel}
            type="button"
            onClick={() => handleChannelToggle(channel)}
            disabled={disabled || !isAvailable}
            title={isAvailable ? config.description : `${config.label} not available`}
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-md border transition-all',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              isEnabled && isAvailable
                ? 'bg-blue-50 border-blue-500 text-primary-hover'
                : 'bg-surface border-input text-disabled',
              isAvailable && !disabled
                ? 'hover:border-blue-400 cursor-pointer'
                : 'opacity-50 cursor-not-allowed',
              disabled && 'opacity-40'
            )}
            aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${config.label} notifications`}
            aria-pressed={isEnabled}
          >
            <Icon className="w-5 h-5" />
          </button>
        )
      })}
    </div>
  )
}

// ============================================================================
// Channel Toggle with Labels
// ============================================================================

export interface NotificationChannelToggleWithLabelsProps
  extends NotificationChannelToggleProps {
  /** Show labels next to icons */
  showLabels?: boolean
  /** Layout direction */
  layout?: 'horizontal' | 'vertical'
}

export function NotificationChannelToggleWithLabels({
  enabledChannels,
  availableChannels,
  onChange,
  disabled = false,
  showLabels = true,
  layout = 'horizontal',
  className,
}: NotificationChannelToggleWithLabelsProps) {
  const handleChannelToggle = (channel: NotificationChannel) => {
    if (disabled || !availableChannels.includes(channel)) {
      return
    }

    const channelKey = `${channel}_enabled` as keyof typeof enabledChannels
    const currentValue = enabledChannels[channelKey]
    onChange(channel, !currentValue)
  }

  return (
    <div
      className={cn(
        'flex gap-3',
        layout === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        className
      )}
    >
      {(['email', 'in_app', 'sms', 'push'] as NotificationChannel[]).map((channel) => {
        const config = CHANNEL_CONFIG[channel]
        const Icon = config.icon
        const isAvailable = availableChannels.includes(channel)
        const channelKey = `${channel}_enabled` as keyof typeof enabledChannels
        const isEnabled = enabledChannels[channelKey]

        if (!isAvailable) {
          return null
        }

        return (
          <button
            key={channel}
            type="button"
            onClick={() => handleChannelToggle(channel)}
            disabled={disabled}
            title={config.description}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md border transition-all',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              isEnabled
                ? 'bg-blue-50 border-blue-500 text-primary-hover'
                : 'bg-surface border-input text-secondary',
              !disabled ? 'hover:border-blue-400 cursor-pointer' : 'opacity-40 cursor-not-allowed'
            )}
            aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${config.label} notifications`}
            aria-pressed={isEnabled}
          >
            <Icon className="w-4 h-4" />
            {showLabels && <span className="text-sm font-medium">{config.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
