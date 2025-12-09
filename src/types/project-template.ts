/**
 * Project Template Types
 *
 * Types for project templates that enable standardized project creation:
 * - Template configuration (settings, features, numbering)
 * - Folder structure templates
 * - Phase/milestone templates
 * - Team role definitions
 * - Checklist and workflow associations
 * - Distribution list configurations
 */

// ============================================================================
// Enums / Union Types
// ============================================================================

/**
 * Template category types matching construction project types
 */
export type TemplateCategory =
  | 'commercial'
  | 'residential'
  | 'industrial'
  | 'renovation'
  | 'civil'
  | 'institutional'
  | 'custom'

/**
 * Template visibility options
 */
export type TemplateVisibility = 'company' | 'private'

/**
 * Custom field types supported in templates
 */
export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'checkbox'

/**
 * Entities that custom fields can apply to
 */
export type CustomFieldTarget =
  | 'project'
  | 'daily_report'
  | 'rfi'
  | 'submittal'
  | 'change_order'
  | 'punch_item'

/**
 * Notification delivery methods
 */
export type NotificationDeliveryMethod = 'email' | 'in_app' | 'push'

/**
 * Distribution list member role
 */
export type DistributionMemberRole = 'to' | 'cc' | 'bcc'

// ============================================================================
// Configuration Types (JSONB)
// ============================================================================

/**
 * Default project settings stored in templates
 */
export interface TemplateDefaultSettings {
  weather_units?: 'imperial' | 'metric'
  timezone?: string

  budget?: {
    tracking_enabled: boolean
    currency: string
    contingency_percentage?: number
  }

  schedule?: {
    working_days: number[] // 0-6, Sunday=0
    holidays?: string[] // ISO date strings
    default_duration_unit: 'hours' | 'days' | 'weeks'
  }

  safety?: {
    require_daily_safety_briefing: boolean
    require_jsa_for_hazardous_work: boolean
    incident_notification_emails?: string[]
  }

  documents?: {
    require_approval_for_upload: boolean
    auto_version_on_edit: boolean
    retention_period_days?: number
  }
}

/**
 * Folder structure definition for document organization
 */
export interface TemplateFolderStructure {
  id: string // Temporary ID for hierarchy reference
  name: string
  description?: string
  parent_id?: string // Reference to parent in same structure
  sort_order: number
  children?: TemplateFolderStructure[]
}

/**
 * Default team role definition
 */
export interface TemplateDefaultRole {
  role_name: string
  project_role: string // 'superintendent', 'project_manager', 'engineer', etc.
  can_edit: boolean
  can_delete: boolean
  can_approve: boolean
  description?: string
  typical_responsibilities?: string[]
}

/**
 * Numbering configuration for various entities
 */
export interface TemplateNumberingConfig {
  rfis?: {
    format: string // e.g., "RFI-{number:3}" produces "RFI-001"
    start_number: number
    prefix?: string
    increment: number
  }
  submittals?: {
    format: string // e.g., "{spec_section}-{number:2}" produces "03300-01"
    use_spec_section: boolean
    start_number: number
  }
  change_orders?: {
    format: string // e.g., "PCO-{number:3}"
    start_number: number
    separate_pco_sequence: boolean // Separate numbering for PCOs vs executed COs
  }
  daily_reports?: {
    format: string // e.g., "DR-{date:YYYYMMDD}"
  }
  transmittals?: {
    format: string // e.g., "TR-{number:4}"
    start_number: number
  }
}

/**
 * Notification rule definition
 */
export interface TemplateNotificationRule {
  event_type: string // 'rfi_created', 'submittal_submitted', etc.
  notify_roles: string[] // ['project_manager', 'superintendent']
  notify_emails?: string[] // External emails
  delivery_method: NotificationDeliveryMethod[]
  delay_minutes?: number // Batch notifications
  conditions?: Record<string, unknown> // Conditional logic
}

/**
 * Feature toggles for projects
 */
export interface TemplateEnabledFeatures {
  daily_reports?: boolean
  documents?: boolean
  workflows?: boolean
  tasks?: boolean
  checklists?: boolean
  punch_lists?: boolean
  safety?: boolean
  inspections?: boolean
  material_tracking?: boolean
  photos?: boolean
  takeoff?: boolean
  cost_tracking?: boolean
  equipment_tracking?: boolean
  time_tracking?: boolean
  qr_codes?: boolean
  gantt_schedule?: boolean
  weather_logs?: boolean
  transmittals?: boolean
  meeting_minutes?: boolean
  permits?: boolean
  notices?: boolean
  closeout?: boolean
  client_portal?: boolean
  subcontractor_portal?: boolean
}

/**
 * Custom field definition
 */
export interface TemplateCustomField {
  id: string
  field_name: string
  field_type: CustomFieldType
  label: string
  description?: string
  required: boolean
  default_value?: unknown
  options?: string[] // For select/multiselect
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
  apply_to: CustomFieldTarget
}

/**
 * Distribution list member configuration
 */
export interface TemplateDistributionMember {
  role?: string // e.g., 'project_manager', 'superintendent'
  email?: string // Hardcoded email
  member_role: DistributionMemberRole
}

// ============================================================================
// Core Domain Types
// ============================================================================

/**
 * Project template - main entity
 */
export interface ProjectTemplate {
  id: string
  company_id: string

  // Template Info
  name: string
  description: string | null
  category: TemplateCategory | null
  tags: string[] | null

  // Visibility
  visibility: TemplateVisibility
  is_system_template: boolean
  is_active: boolean

  // UI
  icon: string | null
  color: string | null

  // Configuration
  default_settings: TemplateDefaultSettings
  folder_structure: TemplateFolderStructure[]
  default_roles: TemplateDefaultRole[]
  numbering_config: TemplateNumberingConfig
  notification_rules: TemplateNotificationRule[]
  enabled_features: TemplateEnabledFeatures
  custom_fields: TemplateCustomField[]

  // Statistics
  usage_count: number
  last_used_at: string | null

  // Metadata
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

/**
 * Phase/milestone template
 */
export interface ProjectTemplatePhase {
  id: string
  template_id: string
  name: string
  description: string | null
  phase_order: number
  estimated_duration_days: number | null
  depends_on_phase_id: string | null
  created_at: string
}

/**
 * Checklist template association
 */
export interface ProjectTemplateChecklist {
  id: string
  template_id: string
  checklist_template_id: string
  is_required: boolean
  auto_create: boolean
  trigger_phase: string | null
  created_at: string
}

/**
 * Approval workflow association
 */
export interface ProjectTemplateWorkflow {
  id: string
  template_id: string
  workflow_id: string
  workflow_type: string
  is_default: boolean
  created_at: string
}

/**
 * Distribution list template
 */
export interface ProjectTemplateDistributionList {
  id: string
  template_id: string
  list_name: string
  list_type: string
  is_default: boolean
  members: TemplateDistributionMember[]
  created_at: string
}

// ============================================================================
// Extended Types (with joins)
// ============================================================================

/**
 * Template with all related data
 */
export interface ProjectTemplateWithDetails extends ProjectTemplate {
  phases: ProjectTemplatePhase[]
  checklists: (ProjectTemplateChecklist & {
    checklist_template?: {
      id: string
      name: string
      category: string | null
    }
  })[]
  workflows: (ProjectTemplateWorkflow & {
    workflow?: {
      id: string
      name: string
      workflow_type: string
    }
  })[]
  distribution_lists: ProjectTemplateDistributionList[]
  created_by_user?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
  }
}

/**
 * Template with usage statistics
 */
export interface ProjectTemplateWithStats extends ProjectTemplate {
  recent_projects?: Array<{
    id: string
    name: string
    created_at: string
  }>
}

// ============================================================================
// Input Types (for creating/updating)
// ============================================================================

/**
 * Input for creating a new template
 */
export interface CreateProjectTemplateInput {
  company_id: string
  name: string
  description?: string | null
  category?: TemplateCategory | null
  tags?: string[] | null
  visibility?: TemplateVisibility
  icon?: string | null
  color?: string | null

  // Configuration
  default_settings?: TemplateDefaultSettings
  folder_structure?: TemplateFolderStructure[]
  default_roles?: TemplateDefaultRole[]
  numbering_config?: TemplateNumberingConfig
  notification_rules?: TemplateNotificationRule[]
  enabled_features?: TemplateEnabledFeatures
  custom_fields?: TemplateCustomField[]

  // Associations
  phases?: CreateTemplatePhaseInput[]
  checklist_template_ids?: string[]
  workflow_associations?: Array<{
    workflow_id: string
    workflow_type: string
  }>
}

/**
 * Input for creating a template phase
 */
export interface CreateTemplatePhaseInput {
  name: string
  description?: string | null
  estimated_duration_days?: number | null
}

/**
 * Input for updating an existing template
 */
export interface UpdateProjectTemplateInput {
  name?: string
  description?: string | null
  category?: TemplateCategory | null
  tags?: string[] | null
  visibility?: TemplateVisibility
  icon?: string | null
  color?: string | null
  is_active?: boolean

  // Configuration
  default_settings?: TemplateDefaultSettings
  folder_structure?: TemplateFolderStructure[]
  default_roles?: TemplateDefaultRole[]
  numbering_config?: TemplateNumberingConfig
  notification_rules?: TemplateNotificationRule[]
  enabled_features?: TemplateEnabledFeatures
  custom_fields?: TemplateCustomField[]
}

/**
 * Input for creating a template from an existing project
 */
export interface CreateTemplateFromProjectInput {
  project_id: string
  name: string
  description?: string | null
  category?: TemplateCategory | null
  visibility?: TemplateVisibility
  include_folder_structure?: boolean
  include_team_roles?: boolean
  include_workflows?: boolean
  include_checklists?: boolean
  include_settings?: boolean
}

// ============================================================================
// Filter / Query Types
// ============================================================================

/**
 * Filters for querying templates
 */
export interface ProjectTemplateFilters {
  category?: TemplateCategory | null
  is_active?: boolean
  search?: string
  tags?: string[]
  created_by?: string
  visibility?: TemplateVisibility
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of applying a template to a project
 */
export interface ApplyTemplateResult {
  success: boolean
  project_id: string
  template_id: string
  folders_created: number
  workflows_assigned: number
  checklists_created: number
  phases_created: number
  errors: string[]
}

// ============================================================================
// UI Helper Types & Constants
// ============================================================================

/**
 * Template category display configuration
 */
export interface TemplateCategoryConfig {
  value: TemplateCategory
  label: string
  icon: string
  description: string
}

/**
 * Category configuration for UI
 */
export const TEMPLATE_CATEGORIES: TemplateCategoryConfig[] = [
  {
    value: 'commercial',
    label: 'Commercial',
    icon: 'Building2',
    description: 'Office buildings, retail centers, warehouses',
  },
  {
    value: 'residential',
    label: 'Residential',
    icon: 'Home',
    description: 'Single-family, multi-family, townhomes',
  },
  {
    value: 'industrial',
    label: 'Industrial',
    icon: 'Factory',
    description: 'Manufacturing, distribution, process plants',
  },
  {
    value: 'renovation',
    label: 'Renovation',
    icon: 'Hammer',
    description: 'Interior fit-outs, tenant improvements',
  },
  {
    value: 'civil',
    label: 'Civil/Infrastructure',
    icon: 'Route',
    description: 'Roads, bridges, utilities, site development',
  },
  {
    value: 'institutional',
    label: 'Institutional',
    icon: 'School',
    description: 'Schools, hospitals, government buildings',
  },
  {
    value: 'custom',
    label: 'Custom',
    icon: 'Settings',
    description: 'Custom project type',
  },
]

/**
 * Get category config by value
 */
export function getTemplateCategoryConfig(
  category: TemplateCategory | null
): TemplateCategoryConfig | undefined {
  if (!category) return undefined
  return TEMPLATE_CATEGORIES.find((c) => c.value === category)
}

/**
 * Default folder structures by category
 */
export const DEFAULT_FOLDER_STRUCTURES: Record<TemplateCategory, TemplateFolderStructure[]> = {
  commercial: [
    {
      id: '1',
      name: '01 - Drawings',
      sort_order: 1,
      children: [
        { id: '1.1', name: 'Architectural', parent_id: '1', sort_order: 1 },
        { id: '1.2', name: 'Structural', parent_id: '1', sort_order: 2 },
        { id: '1.3', name: 'Mechanical', parent_id: '1', sort_order: 3 },
        { id: '1.4', name: 'Electrical', parent_id: '1', sort_order: 4 },
        { id: '1.5', name: 'Plumbing', parent_id: '1', sort_order: 5 },
        { id: '1.6', name: 'Fire Protection', parent_id: '1', sort_order: 6 },
      ],
    },
    { id: '2', name: '02 - Specifications', sort_order: 2 },
    { id: '3', name: '03 - Submittals', sort_order: 3 },
    { id: '4', name: '04 - RFIs', sort_order: 4 },
    { id: '5', name: '05 - Change Orders', sort_order: 5 },
    { id: '6', name: '06 - Meeting Minutes', sort_order: 6 },
    { id: '7', name: '07 - Daily Reports', sort_order: 7 },
    { id: '8', name: '08 - Photos', sort_order: 8 },
    {
      id: '9',
      name: '09 - Closeout',
      sort_order: 9,
      children: [
        { id: '9.1', name: 'As-Builts', parent_id: '9', sort_order: 1 },
        { id: '9.2', name: 'O&M Manuals', parent_id: '9', sort_order: 2 },
        { id: '9.3', name: 'Warranties', parent_id: '9', sort_order: 3 },
        { id: '9.4', name: 'Training Materials', parent_id: '9', sort_order: 4 },
      ],
    },
  ],
  residential: [
    { id: '1', name: '01 - Plans & Drawings', sort_order: 1 },
    { id: '2', name: '02 - Permits', sort_order: 2 },
    { id: '3', name: '03 - Selections & Finishes', sort_order: 3 },
    { id: '4', name: '04 - Change Orders', sort_order: 4 },
    { id: '5', name: '05 - Photos', sort_order: 5 },
    { id: '6', name: '06 - Warranty Documents', sort_order: 6 },
    { id: '7', name: '07 - Homeowner Manual', sort_order: 7 },
  ],
  industrial: [
    {
      id: '1',
      name: '01 - Drawings',
      sort_order: 1,
      children: [
        { id: '1.1', name: 'Civil', parent_id: '1', sort_order: 1 },
        { id: '1.2', name: 'Architectural', parent_id: '1', sort_order: 2 },
        { id: '1.3', name: 'Structural', parent_id: '1', sort_order: 3 },
        { id: '1.4', name: 'Process', parent_id: '1', sort_order: 4 },
        { id: '1.5', name: 'MEP', parent_id: '1', sort_order: 5 },
      ],
    },
    { id: '2', name: '02 - Specifications', sort_order: 2 },
    { id: '3', name: '03 - Submittals', sort_order: 3 },
    { id: '4', name: '04 - RFIs', sort_order: 4 },
    { id: '5', name: '05 - Change Orders', sort_order: 5 },
    { id: '6', name: '06 - Equipment Documentation', sort_order: 6 },
    { id: '7', name: '07 - Commissioning', sort_order: 7 },
    { id: '8', name: '08 - Safety & Permits', sort_order: 8 },
    { id: '9', name: '09 - Closeout', sort_order: 9 },
  ],
  renovation: [
    { id: '1', name: '01 - Existing Conditions', sort_order: 1 },
    { id: '2', name: '02 - Drawings', sort_order: 2 },
    { id: '3', name: '03 - Specs & Selections', sort_order: 3 },
    { id: '4', name: '04 - RFIs', sort_order: 4 },
    { id: '5', name: '05 - Change Orders', sort_order: 5 },
    { id: '6', name: '06 - Photos', sort_order: 6 },
    { id: '7', name: '07 - Permits', sort_order: 7 },
    { id: '8', name: '08 - Closeout', sort_order: 8 },
  ],
  civil: [
    {
      id: '1',
      name: '01 - Drawings',
      sort_order: 1,
      children: [
        { id: '1.1', name: 'Survey', parent_id: '1', sort_order: 1 },
        { id: '1.2', name: 'Grading', parent_id: '1', sort_order: 2 },
        { id: '1.3', name: 'Utilities', parent_id: '1', sort_order: 3 },
        { id: '1.4', name: 'Roadway', parent_id: '1', sort_order: 4 },
        { id: '1.5', name: 'Drainage', parent_id: '1', sort_order: 5 },
      ],
    },
    { id: '2', name: '02 - Geotechnical', sort_order: 2 },
    { id: '3', name: '03 - Specifications', sort_order: 3 },
    { id: '4', name: '04 - Submittals', sort_order: 4 },
    { id: '5', name: '05 - RFIs', sort_order: 5 },
    { id: '6', name: '06 - Change Orders', sort_order: 6 },
    { id: '7', name: '07 - Testing & Inspection', sort_order: 7 },
    { id: '8', name: '08 - As-Builts', sort_order: 8 },
  ],
  institutional: [
    {
      id: '1',
      name: '01 - Drawings',
      sort_order: 1,
      children: [
        { id: '1.1', name: 'Architectural', parent_id: '1', sort_order: 1 },
        { id: '1.2', name: 'Structural', parent_id: '1', sort_order: 2 },
        { id: '1.3', name: 'MEP', parent_id: '1', sort_order: 3 },
        { id: '1.4', name: 'Fire & Life Safety', parent_id: '1', sort_order: 4 },
      ],
    },
    { id: '2', name: '02 - Specifications', sort_order: 2 },
    { id: '3', name: '03 - Submittals', sort_order: 3 },
    { id: '4', name: '04 - RFIs', sort_order: 4 },
    { id: '5', name: '05 - Change Orders', sort_order: 5 },
    { id: '6', name: '06 - Meeting Minutes', sort_order: 6 },
    { id: '7', name: '07 - Permits & Compliance', sort_order: 7 },
    { id: '8', name: '08 - Closeout & Commissioning', sort_order: 8 },
  ],
  custom: [
    { id: '1', name: 'Documents', sort_order: 1 },
    { id: '2', name: 'Photos', sort_order: 2 },
  ],
}

/**
 * Default phases by category
 */
export const DEFAULT_PHASES: Record<TemplateCategory, CreateTemplatePhaseInput[]> = {
  commercial: [
    { name: 'Pre-Construction', estimated_duration_days: 30 },
    { name: 'Mobilization', estimated_duration_days: 14 },
    { name: 'Sitework & Foundations', estimated_duration_days: 60 },
    { name: 'Structural', estimated_duration_days: 90 },
    { name: 'Envelope', estimated_duration_days: 45 },
    { name: 'Rough-In MEP', estimated_duration_days: 60 },
    { name: 'Interior Finishes', estimated_duration_days: 45 },
    { name: 'Final MEP & Trim', estimated_duration_days: 30 },
    { name: 'Substantial Completion', estimated_duration_days: 14 },
    { name: 'Punch List & Closeout', estimated_duration_days: 30 },
  ],
  residential: [
    { name: 'Site Prep & Foundation', estimated_duration_days: 21 },
    { name: 'Framing', estimated_duration_days: 14 },
    { name: 'Rough-In (Electrical, Plumbing, HVAC)', estimated_duration_days: 10 },
    { name: 'Insulation & Drywall', estimated_duration_days: 14 },
    { name: 'Interior Finishes', estimated_duration_days: 21 },
    { name: 'Exterior Finishes', estimated_duration_days: 14 },
    { name: 'Final Inspection & Closeout', estimated_duration_days: 7 },
  ],
  industrial: [
    { name: 'Site Preparation', estimated_duration_days: 30 },
    { name: 'Foundation & Slab', estimated_duration_days: 45 },
    { name: 'Structural Steel', estimated_duration_days: 60 },
    { name: 'Envelope', estimated_duration_days: 30 },
    { name: 'Process Equipment', estimated_duration_days: 45 },
    { name: 'MEP Systems', estimated_duration_days: 30 },
    { name: 'Commissioning', estimated_duration_days: 21 },
    { name: 'Closeout', estimated_duration_days: 14 },
  ],
  renovation: [
    { name: 'Demolition', estimated_duration_days: 14 },
    { name: 'Structural Work', estimated_duration_days: 21 },
    { name: 'Rough-In', estimated_duration_days: 14 },
    { name: 'Finishes', estimated_duration_days: 21 },
    { name: 'Final Inspection', estimated_duration_days: 7 },
  ],
  civil: [
    { name: 'Mobilization', estimated_duration_days: 14 },
    { name: 'Clearing & Grubbing', estimated_duration_days: 14 },
    { name: 'Earthwork', estimated_duration_days: 45 },
    { name: 'Utilities', estimated_duration_days: 60 },
    { name: 'Base & Subbase', estimated_duration_days: 30 },
    { name: 'Paving', estimated_duration_days: 21 },
    { name: 'Final Grading & Landscaping', estimated_duration_days: 21 },
    { name: 'Closeout', estimated_duration_days: 14 },
  ],
  institutional: [
    { name: 'Pre-Construction', estimated_duration_days: 45 },
    { name: 'Site Work', estimated_duration_days: 45 },
    { name: 'Foundation', estimated_duration_days: 30 },
    { name: 'Structure', estimated_duration_days: 90 },
    { name: 'Envelope', estimated_duration_days: 45 },
    { name: 'Interior Systems', estimated_duration_days: 90 },
    { name: 'Finishes', estimated_duration_days: 60 },
    { name: 'Commissioning', estimated_duration_days: 30 },
    { name: 'Closeout', estimated_duration_days: 30 },
  ],
  custom: [],
}

/**
 * Default enabled features by category
 */
export const DEFAULT_FEATURES: Record<TemplateCategory, TemplateEnabledFeatures> = {
  commercial: {
    daily_reports: true,
    documents: true,
    workflows: true,
    tasks: true,
    checklists: true,
    punch_lists: true,
    safety: true,
    inspections: true,
    material_tracking: true,
    photos: true,
    takeoff: true,
    cost_tracking: true,
    equipment_tracking: true,
    transmittals: true,
    meeting_minutes: true,
    closeout: true,
    subcontractor_portal: true,
  },
  residential: {
    daily_reports: true,
    documents: true,
    workflows: true,
    punch_lists: true,
    safety: true,
    photos: true,
    cost_tracking: true,
    client_portal: true,
    subcontractor_portal: true,
  },
  industrial: {
    daily_reports: true,
    documents: true,
    workflows: true,
    tasks: true,
    checklists: true,
    punch_lists: true,
    safety: true,
    inspections: true,
    material_tracking: true,
    photos: true,
    takeoff: true,
    cost_tracking: true,
    equipment_tracking: true,
    transmittals: true,
    permits: true,
    closeout: true,
    subcontractor_portal: true,
  },
  renovation: {
    daily_reports: true,
    documents: true,
    workflows: true,
    punch_lists: true,
    safety: true,
    photos: true,
    cost_tracking: true,
    permits: true,
    client_portal: true,
  },
  civil: {
    daily_reports: true,
    documents: true,
    workflows: true,
    tasks: true,
    checklists: true,
    safety: true,
    inspections: true,
    photos: true,
    takeoff: true,
    cost_tracking: true,
    equipment_tracking: true,
    permits: true,
  },
  institutional: {
    daily_reports: true,
    documents: true,
    workflows: true,
    tasks: true,
    checklists: true,
    punch_lists: true,
    safety: true,
    inspections: true,
    material_tracking: true,
    photos: true,
    takeoff: true,
    cost_tracking: true,
    transmittals: true,
    meeting_minutes: true,
    permits: true,
    closeout: true,
    subcontractor_portal: true,
  },
  custom: {
    daily_reports: true,
    documents: true,
    photos: true,
  },
}
