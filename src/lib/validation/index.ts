// File: /src/lib/validation/index.ts
// Central export for all validation utilities

// Schemas
export {
  emailSchema,
  passwordSchema,
  statusSchema,
  projectCreateSchema,
  projectUpdateSchema,
  dailyReportCreateSchema,
  dailyReportUpdateSchema,
  changeOrderCreateSchema,
  changeOrderUpdateSchema,
  changeOrderCommentSchema,
  workflowItemCreateSchema,
  workflowItemUpdateSchema,
  validateArray,
} from './schemas'

export type {
  ProjectCreateInput,
  ProjectUpdateInput,
  DailyReportCreateInput,
  DailyReportUpdateInput,
  ChangeOrderCreateInput,
  ChangeOrderUpdateInput,
  ChangeOrderCommentInput,
  WorkflowItemCreateInput,
  WorkflowItemUpdateInput,
} from './schemas'

// Hooks
export { useFormValidation, useFieldValidation } from './useFormValidation'
export type { FieldError, ValidationResult, UseFormValidationOptions } from './useFormValidation'

// Utilities
export {
  validateAndCall,
  createValidatedAPI,
  mergeErrors,
  hasErrors,
  getFirstError,
  formatValidationErrors,
} from './validateAndCall'
