/**
 * Calendar Integration Hooks
 *
 * Unified exports for calendar integration (Outlook, Google Calendar, etc.)
 */

// Outlook Calendar Integration
export * from './useOutlookCalendar'

// Re-export common types
export type { OutlookEntityType, OutlookSyncStatus, OutlookSyncDirection } from '@/types/outlook-calendar'
