/**
 * Project Templates Feature
 *
 * Provides project template management functionality:
 * - Template CRUD operations
 * - Template application to projects
 * - Phase management
 * - Default folder structures by category
 */

// Hooks
export * from './hooks'

// Components
export * from './components'

// Re-export types for convenience
export type {
  ProjectTemplate,
  ProjectTemplateWithDetails,
  ProjectTemplatePhase,
  ProjectTemplateChecklist,
  ProjectTemplateWorkflow,
  ProjectTemplateDistributionList,
  CreateProjectTemplateInput,
  UpdateProjectTemplateInput,
  CreateTemplateFromProjectInput,
  ProjectTemplateFilters,
  ApplyTemplateResult,
  TemplateCategory,
  TemplateVisibility,
  TemplateDefaultSettings,
  TemplateFolderStructure,
  TemplateDefaultRole,
  TemplateNumberingConfig,
  TemplateNotificationRule,
  TemplateEnabledFeatures,
  TemplateCustomField,
} from '@/types/project-template'

// Re-export constants
export {
  TEMPLATE_CATEGORIES,
  DEFAULT_FOLDER_STRUCTURES,
  DEFAULT_PHASES,
  DEFAULT_FEATURES,
  getTemplateCategoryConfig,
} from '@/types/project-template'

// Re-export API service
export { projectTemplatesApi } from '@/lib/api/services/project-templates'
