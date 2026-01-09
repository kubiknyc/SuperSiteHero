/**
 * Triggers Index
 * Export all event triggers for background processing
 */

// Import all handlers to register them
import './document-uploaded'
import './rfi-created'
import './report-submitted'
import './inspection-result'

// Export subscription functions
export {
  subscribeToDocumentUploads,
  documentUploadedHandler,
} from './document-uploaded'

export {
  subscribeToRFICreation,
  rfiCreatedHandler,
} from './rfi-created'

export {
  subscribeToReportSubmissions,
  reportSubmittedHandler,
} from './report-submitted'

export {
  subscribeToInspectionResults,
  inspectionResultHandler,
} from './inspection-result'

/**
 * Initialize all realtime subscriptions for a company
 */
export function initializeAllTriggers(companyId: string): () => void {
  const unsubscribers = [
    subscribeToDocumentUploads(companyId),
    subscribeToRFICreation(companyId),
    subscribeToReportSubmissions(companyId),
    subscribeToInspectionResults(companyId),
  ]

  // Return cleanup function
  return () => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe()
    }
  }
}

// Note: Default export removed to avoid circular dependency issues
// All functions are available via named exports above
