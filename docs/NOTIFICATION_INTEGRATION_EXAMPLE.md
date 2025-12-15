# Notification Service Integration Example

This document provides examples of how to integrate the milestone notification preferences with the existing notification service.

## Overview

The notification preferences system is fully implemented, but the integration with the actual notification sending service is optional. This document shows how to add preference checking when sending notifications.

---

## Option 1: Update Existing Notification Service

### File: `src/lib/api/services/notifications.ts`

Add a method that checks preferences before creating notifications:

```typescript
import { milestoneNotificationPreferencesApi } from './milestone-notification-preferences'
import { MilestoneEventType } from '@/types/milestone-notification-preferences'
import type { NotificationChannel } from '@/types/milestone-notification-preferences'

// Add to the notificationsApi object
export const notificationsApi = {
  // ... existing methods ...

  /**
   * Create a notification with preference checking
   * Only creates the notification if user has enabled it in their preferences
   */
  async createNotificationWithPreferences(
    notification: CreateNotificationDTO,
    eventType: MilestoneEventType,
    projectId?: string | null
  ): Promise<Notification | null> {
    try {
      // Check if user wants in-app notifications for this event
      const shouldSend = await milestoneNotificationPreferencesApi.shouldNotify(
        notification.user_id,
        eventType,
        'in_app', // Channel type - always 'in_app' for database notifications
        projectId
      )

      if (!shouldSend) {
        logger.info('[NotificationsApi] Skipping notification - user preference disabled', {
          userId: notification.user_id,
          eventType,
          projectId,
        })
        return null
      }

      // User wants this notification, create it
      return await this.createNotification(notification)
    } catch (error) {
      logger.error('[NotificationsApi] Error checking preferences:', error)
      // On error, default to creating the notification (fail-safe)
      return await this.createNotification(notification)
    }
  },

  /**
   * Send notifications to multiple users with preference checking
   */
  async createBulkNotificationsWithPreferences(
    notifications: Array<{
      notification: CreateNotificationDTO
      eventType: MilestoneEventType
      projectId?: string | null
    }>
  ): Promise<Notification[]> {
    const results: Notification[] = []

    for (const { notification, eventType, projectId } of notifications) {
      const result = await this.createNotificationWithPreferences(
        notification,
        eventType,
        projectId
      )

      if (result) {
        results.push(result)
      }
    }

    return results
  },
}
```

---

## Option 2: Create a Notification Helper Service

### File: `src/lib/notifications/notificationHelper.ts`

Create a new helper service that wraps both APIs:

```typescript
import { notificationsApi } from '@/lib/api/services/notifications'
import { milestoneNotificationPreferencesApi } from '@/lib/api/services/milestone-notification-preferences'
import type { CreateNotificationDTO } from '@/lib/api/services/notifications'
import type { MilestoneEventType, NotificationChannel } from '@/types/milestone-notification-preferences'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Types
// ============================================================================

export interface NotificationRequest {
  userId: string
  eventType: MilestoneEventType
  projectId?: string | null
  title: string
  message: string
  relatedToId?: string
  relatedToType?: string
}

export interface EmailNotificationRequest extends NotificationRequest {
  emailTemplate?: string
  emailSubject?: string
}

// ============================================================================
// Notification Helper Service
// ============================================================================

export const notificationHelper = {
  /**
   * Send in-app notification with preference checking
   */
  async sendInAppNotification(request: NotificationRequest): Promise<boolean> {
    try {
      // Check if user wants in-app notifications
      const shouldSend = await milestoneNotificationPreferencesApi.shouldNotify(
        request.userId,
        request.eventType,
        'in_app',
        request.projectId
      )

      if (!shouldSend) {
        logger.info('[NotificationHelper] Skipping in-app notification', {
          userId: request.userId,
          eventType: request.eventType,
        })
        return false
      }

      // Create the notification
      await notificationsApi.createNotification({
        user_id: request.userId,
        type: request.eventType,
        title: request.title,
        message: request.message,
        related_to_id: request.relatedToId,
        related_to_type: request.relatedToType,
      })

      return true
    } catch (error) {
      logger.error('[NotificationHelper] Error sending in-app notification:', error)
      return false
    }
  },

  /**
   * Send email notification with preference checking
   */
  async sendEmailNotification(request: EmailNotificationRequest): Promise<boolean> {
    try {
      // Check if user wants email notifications
      const shouldSend = await milestoneNotificationPreferencesApi.shouldNotify(
        request.userId,
        request.eventType,
        'email',
        request.projectId
      )

      if (!shouldSend) {
        logger.info('[NotificationHelper] Skipping email notification', {
          userId: request.userId,
          eventType: request.eventType,
        })
        return false
      }

      // TODO: Integrate with your email service (e.g., SendGrid, AWS SES)
      // await emailService.send({
      //   to: userEmail,
      //   subject: request.emailSubject || request.title,
      //   template: request.emailTemplate,
      //   data: {
      //     title: request.title,
      //     message: request.message,
      //   },
      // })

      logger.info('[NotificationHelper] Email notification sent', {
        userId: request.userId,
        eventType: request.eventType,
      })

      return true
    } catch (error) {
      logger.error('[NotificationHelper] Error sending email notification:', error)
      return false
    }
  },

  /**
   * Send notification via all enabled channels
   */
  async sendMilestoneNotification(request: NotificationRequest): Promise<{
    inApp: boolean
    email: boolean
    sms: boolean
    push: boolean
  }> {
    const results = {
      inApp: false,
      email: false,
      sms: false,
      push: false,
    }

    // Send in-app notification
    results.inApp = await this.sendInAppNotification(request)

    // Send email notification
    results.email = await this.sendEmailNotification(request)

    // TODO: Add SMS and Push when ready
    // results.sms = await this.sendSMSNotification(request)
    // results.push = await this.sendPushNotification(request)

    return results
  },

  /**
   * Send notifications to multiple users
   */
  async sendBulkMilestoneNotifications(
    requests: NotificationRequest[]
  ): Promise<void> {
    const promises = requests.map((request) =>
      this.sendMilestoneNotification(request)
    )

    await Promise.allSettled(promises)
  },
}

export default notificationHelper
```

---

## Usage Examples

### Example 1: Project Started Notification

```typescript
// File: src/features/projects/hooks/useProjectActions.ts
import { notificationHelper } from '@/lib/notifications/notificationHelper'

async function startProject(projectId: string) {
  // ... project start logic ...

  // Get project team members
  const teamMembers = await getProjectTeamMembers(projectId)
  const clientUsers = teamMembers.filter((m) => m.role === 'client')

  // Send notifications to all client users
  await notificationHelper.sendBulkMilestoneNotifications(
    clientUsers.map((client) => ({
      userId: client.id,
      eventType: 'project.started',
      projectId,
      title: 'Project Started',
      message: `${project.name} has officially started!`,
      relatedToId: projectId,
      relatedToType: 'project',
    }))
  )
}
```

### Example 2: Payment Application Approved

```typescript
// File: src/features/payment-applications/hooks/useApprovePaymentApplication.ts
import { notificationHelper } from '@/lib/notifications/notificationHelper'

async function approvePaymentApplication(applicationId: string) {
  // ... approval logic ...

  // Notify the client
  await notificationHelper.sendMilestoneNotification({
    userId: paymentApplication.client_id,
    eventType: 'financial.payment_application_approved',
    projectId: paymentApplication.project_id,
    title: 'Payment Application Approved',
    message: `Payment Application #${paymentApplication.number} has been approved for $${paymentApplication.amount}`,
    relatedToId: applicationId,
    relatedToType: 'payment_application',
  })
}
```

### Example 3: RFI Response Received

```typescript
// File: src/features/rfis/hooks/useRFIResponse.ts
import { notificationHelper } from '@/lib/notifications/notificationHelper'

async function submitRFIResponse(rfiId: string, response: string) {
  // ... submit response logic ...

  // Notify the RFI creator
  await notificationHelper.sendMilestoneNotification({
    userId: rfi.created_by,
    eventType: 'communication.rfi_response',
    projectId: rfi.project_id,
    title: 'RFI Response Received',
    message: `Your RFI "${rfi.subject}" has received a response`,
    relatedToId: rfiId,
    relatedToType: 'rfi',
  })
}
```

### Example 4: Inspection Scheduled

```typescript
// File: src/features/inspections/hooks/useScheduleInspection.ts
import { notificationHelper } from '@/lib/notifications/notificationHelper'

async function scheduleInspection(inspectionData: InspectionData) {
  // ... schedule inspection logic ...

  // Notify relevant parties
  const recipients = [
    ...inspectionData.inspectors,
    ...inspectionData.project_managers,
  ]

  await notificationHelper.sendBulkMilestoneNotifications(
    recipients.map((userId) => ({
      userId,
      eventType: 'quality.inspection_scheduled',
      projectId: inspectionData.project_id,
      title: 'Inspection Scheduled',
      message: `${inspectionData.type} inspection scheduled for ${formatDate(inspectionData.scheduled_date)}`,
      relatedToId: inspection.id,
      relatedToType: 'inspection',
    }))
  )
}
```

---

## Migration Strategy

### Phase 1: Parallel Testing (Recommended)
1. Keep existing notification logic
2. Add new preference-aware notifications alongside
3. Log both paths for comparison
4. Monitor adoption and effectiveness

```typescript
async function sendNotification(data: NotificationData) {
  // Old way (keep for now)
  await notificationsApi.createNotification(data)

  // New way (test in parallel)
  await notificationHelper.sendInAppNotification({
    ...data,
    eventType: mapToEventType(data.type),
  })
}
```

### Phase 2: Gradual Rollout
1. Start with low-priority events
2. Monitor error rates and user feedback
3. Gradually expand to all event types

```typescript
const USE_PREFERENCE_CHECKING = {
  'document.uploaded': true,           // Start with low priority
  'schedule.update': true,
  'project.milestone_completed': false, // Keep high priority on old system
  'financial.payment_approved': false,
}

async function sendNotification(eventType: string, data: NotificationData) {
  if (USE_PREFERENCE_CHECKING[eventType]) {
    return await notificationHelper.sendMilestoneNotification(data)
  } else {
    return await notificationsApi.createNotification(data)
  }
}
```

### Phase 3: Full Migration
1. Update all notification sending code
2. Remove old notification logic
3. Monitor and optimize

---

## Testing Integration

### Unit Test Example

```typescript
// File: src/lib/notifications/notificationHelper.test.ts
import { describe, it, expect, vi } from 'vitest'
import { notificationHelper } from './notificationHelper'
import { milestoneNotificationPreferencesApi } from '@/lib/api/services/milestone-notification-preferences'
import { notificationsApi } from '@/lib/api/services/notifications'

vi.mock('@/lib/api/services/milestone-notification-preferences')
vi.mock('@/lib/api/services/notifications')

describe('notificationHelper', () => {
  it('should send notification when preference is enabled', async () => {
    vi.mocked(milestoneNotificationPreferencesApi.shouldNotify).mockResolvedValue(true)
    vi.mocked(notificationsApi.createNotification).mockResolvedValue({} as any)

    const result = await notificationHelper.sendInAppNotification({
      userId: 'user-123',
      eventType: 'project.started',
      title: 'Project Started',
      message: 'Your project has started',
    })

    expect(result).toBe(true)
    expect(notificationsApi.createNotification).toHaveBeenCalled()
  })

  it('should not send notification when preference is disabled', async () => {
    vi.mocked(milestoneNotificationPreferencesApi.shouldNotify).mockResolvedValue(false)

    const result = await notificationHelper.sendInAppNotification({
      userId: 'user-123',
      eventType: 'document.uploaded',
      title: 'Document Uploaded',
      message: 'A document was uploaded',
    })

    expect(result).toBe(false)
    expect(notificationsApi.createNotification).not.toHaveBeenCalled()
  })
})
```

---

## Performance Considerations

### Caching Preferences
For high-volume notifications, consider caching preferences:

```typescript
import { LRUCache } from 'lru-cache'

const preferenceCache = new LRUCache<string, boolean>({
  max: 1000,
  ttl: 1000 * 60 * 5, // 5 minutes
})

async function shouldNotifyWithCache(
  userId: string,
  eventType: MilestoneEventType,
  channel: NotificationChannel,
  projectId?: string | null
): Promise<boolean> {
  const cacheKey = `${userId}:${projectId || 'global'}:${eventType}:${channel}`

  // Check cache
  const cached = preferenceCache.get(cacheKey)
  if (cached !== undefined) {
    return cached
  }

  // Fetch from database
  const result = await milestoneNotificationPreferencesApi.shouldNotify(
    userId,
    eventType,
    channel,
    projectId
  )

  // Store in cache
  preferenceCache.set(cacheKey, result)

  return result
}
```

### Batch Processing
For bulk notifications, process in batches:

```typescript
async function sendBulkNotifications(notifications: NotificationRequest[]) {
  const BATCH_SIZE = 50

  for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
    const batch = notifications.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map((notification) =>
        notificationHelper.sendMilestoneNotification(notification)
      )
    )

    // Small delay between batches to avoid overwhelming the database
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}
```

---

## Monitoring & Analytics

### Track Notification Effectiveness

```typescript
// File: src/lib/analytics/notificationAnalytics.ts
export const notificationAnalytics = {
  trackNotificationSent(
    eventType: MilestoneEventType,
    channel: NotificationChannel,
    sent: boolean
  ) {
    // Track with your analytics service
    analytics.track('Notification Sent', {
      event_type: eventType,
      channel,
      sent,
      timestamp: new Date().toISOString(),
    })
  },

  trackNotificationClicked(notificationId: string) {
    analytics.track('Notification Clicked', {
      notification_id: notificationId,
      timestamp: new Date().toISOString(),
    })
  },

  async getNotificationMetrics() {
    // Query metrics from your analytics service
    return {
      sent: 1000,
      delivered: 980,
      clicked: 450,
      clickRate: 45.9,
    }
  },
}
```

---

## Summary

This integration is **optional** but **recommended** for the best user experience. The notification preferences system is fully functional and ready to use. You can:

1. **Start Simple**: Just use the preferences UI without integration
2. **Gradual Integration**: Add preference checking to new notifications
3. **Full Integration**: Update all notification code to check preferences

**The choice is yours based on your timeline and priorities!**
