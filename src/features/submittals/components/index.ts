// File: /src/features/submittals/components/index.ts
// Central export for all submittal components

// ============================================================
// LEGACY COMPONENTS (workflow_items-based) - DEPRECATED
// For new code, use CreateDedicatedSubmittalDialog instead
// ============================================================
/** @deprecated Use CreateDedicatedSubmittalDialog instead */
export { CreateSubmittalDialog } from './CreateSubmittalDialog'

// ============================================================
// RECOMMENDED: Dedicated Submittal Components
// ============================================================
export { CreateDedicatedSubmittalDialog } from './CreateDedicatedSubmittalDialog'
export { SubmittalsList } from './SubmittalsList'
export { SubmittalStatusBadge } from './SubmittalStatusBadge'

// Lead Time Analytics
export { LeadTimeAnalytics } from './LeadTimeAnalytics'
export { DedicatedSubmittalAnalytics } from './DedicatedSubmittalAnalytics'

// Lead Time Calculator
export { LeadTimeCalculator } from './LeadTimeCalculator'

// Submittal Reminders
export { SubmittalRemindersPanel } from './SubmittalRemindersPanel'
