// File: /src/features/rfis/components/index.ts
// Central export for all RFI components

// ============================================================
// LEGACY COMPONENTS (workflow_items-based) - DEPRECATED
// For new code, use CreateDedicatedRFIDialog instead
// ============================================================
/** @deprecated Use CreateDedicatedRFIDialog instead */
export { CreateRFIDialog } from './CreateRFIDialog'

// ============================================================
// RECOMMENDED: Dedicated RFI Components
// ============================================================
export { CreateDedicatedRFIDialog } from './CreateDedicatedRFIDialog'
export { CreateRFIFromDrawingDialog, type DrawingContext } from './CreateRFIFromDrawingDialog'
export { RFIsList } from './RFIsList'
export { RFIStatusBadge } from './RFIStatusBadge'
export type { RFIStatus, RFIStatusBadgeProps } from './RFIStatusBadge'
export { RFIPriorityBadge } from './RFIPriorityBadge'
export type { RFIPriority, RFIPriorityBadgeProps } from './RFIPriorityBadge'
export { RFIForm } from './RFIForm'
export type { RFIFormData, RFIFormProps } from './RFIForm'
export { RFICommentThread } from './RFICommentThread'
export type { RFICommentThreadProps } from './RFICommentThread'
export { RFIList } from './RFIList'
export type { RFIListProps } from './RFIList'
export { RFITimeline } from './RFITimeline'
export type { RFITimelineProps } from './RFITimeline'
export { RFIAttachments } from './RFIAttachments'
export type { RFIAttachmentsProps } from './RFIAttachments'
export { RFIAgingAlerts } from './RFIAgingAlerts'
export { RFITrendReport } from './RFITrendReport'
export { RFITrendChart, RFIPriorityChart, RFIAssigneeChart, RFIOnTimeTrendChart } from './RFITrendChart'
export { RFIEscalationPanel } from './RFIEscalationPanel'
export { RFITemplateSelector } from './RFITemplateSelector'
export { RFIResponseTimeline } from './RFIResponseTimeline'
export type { RFIResponseTimelineProps } from './RFIResponseTimeline'
