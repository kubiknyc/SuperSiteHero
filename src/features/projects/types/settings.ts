// File: /src/features/projects/types/settings.ts
// Type definitions for project settings

export interface ProjectSettings {
  // Financial settings
  contract_value?: number
  budget?: number
  contingency_percent?: number

  // Display preferences
  weather_units?: 'imperial' | 'metric'
  timezone?: string

  // Feature toggles
  enable_daily_reports?: boolean
  enable_punch_lists?: boolean
  enable_inspections?: boolean
  enable_rfis?: boolean
  enable_submittals?: boolean
  enable_change_orders?: boolean
  enable_safety?: boolean
  enable_quality?: boolean
  enable_closeout?: boolean
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  weather_units: 'imperial',
  enable_daily_reports: true,
  enable_punch_lists: true,
  enable_inspections: true,
  enable_rfis: true,
  enable_submittals: true,
  enable_change_orders: true,
  enable_safety: true,
  enable_quality: true,
  enable_closeout: true,
}

export const FEATURE_TOGGLES = [
  { key: 'enable_daily_reports', label: 'Daily Reports', description: 'Track daily field activities' },
  { key: 'enable_punch_lists', label: 'Punch Lists', description: 'Manage punch list items' },
  { key: 'enable_inspections', label: 'Inspections', description: 'Conduct and track inspections' },
  { key: 'enable_rfis', label: 'RFIs', description: 'Request for information tracking' },
  { key: 'enable_submittals', label: 'Submittals', description: 'Submittal workflow management' },
  { key: 'enable_change_orders', label: 'Change Orders', description: 'Track cost and scope changes' },
  { key: 'enable_safety', label: 'Safety', description: 'Safety incidents and observations' },
  { key: 'enable_quality', label: 'Quality Control', description: 'Quality assurance checklists' },
  { key: 'enable_closeout', label: 'Closeout', description: 'Project closeout documentation' },
] as const
