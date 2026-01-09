/**
 * Background Processing Module
 * Exports for task queue processing, scheduling, and event triggers
 */

// ============================================================================
// Core Processing
// ============================================================================

export {
  TaskQueueProcessor,
  taskProcessor,
  registerTaskHandler,
  getTaskHandler,
} from './processor'

export type { TaskQueueConfig, TaskQueueState, RateLimitConfig } from './processor'

// ============================================================================
// Scheduling
// ============================================================================

export {
  TaskScheduler,
  taskScheduler,
} from './scheduler'

export type { ScheduledJob, ScheduleConfig } from './scheduler'

// ============================================================================
// Event Triggers
// ============================================================================

export {
  documentUploadedHandler,
  subscribeToDocumentUploads,
} from './triggers/document-uploaded'

export type {
  DocumentUploadedInput,
  DocumentProcessingOutput,
} from './triggers/document-uploaded'

export {
  rfiCreatedHandler,
  subscribeToRFICreation,
} from './triggers/rfi-created'

export type {
  RFICreatedInput,
  RFIProcessingOutput,
} from './triggers/rfi-created'

export {
  reportSubmittedHandler,
  subscribeToReportSubmissions,
} from './triggers/report-submitted'

export type {
  ReportSubmittedInput,
  ReportProcessingOutput,
} from './triggers/report-submitted'

export {
  inspectionResultHandler,
  subscribeToInspectionResults,
} from './triggers/inspection-result'

export type {
  InspectionResultInput,
  InspectionProcessingOutput,
} from './triggers/inspection-result'

// ============================================================================
// Trigger Index
// ============================================================================

export { initializeAllTriggers } from './triggers'
