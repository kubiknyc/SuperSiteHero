/**
 * Inspections Feature Index
 *
 * Central export for all inspection feature modules.
 */

// Types - export explicitly to avoid conflicts
export type {
  Inspection,
  InspectionInsert,
  InspectionUpdate,
  CreateInspectionInput,
  UpdateInspectionInput,
  InspectionType,
  InspectionResult,
  InspectionStatus,
  InspectionFilters,
  RecordInspectionResultInput,
  InspectionWithRelations,
  InspectionStats,
} from './types'

export {
  INSPECTION_TYPE_CONFIG,
  INSPECTION_RESULT_CONFIG,
  INSPECTION_STATUS_CONFIG,
} from './types'

// Hooks
export * from './hooks'

// Components - re-export from components index
export {
  InspectionStatusBadge,
  InspectionTypeBadge,
  InspectionCard,
  InspectionFilters as InspectionFiltersComponent,
  InspectionForm,
  InspectionResultDialog,
} from './components'

// Utilities
export * from './utils/failedInspectionWorkflow'
