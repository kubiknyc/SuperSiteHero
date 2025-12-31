// File: /src/features/projects/types/team.ts
// Type definitions for project team management

export interface ProjectTeamMember {
  id: string
  project_id: string
  user_id: string
  project_role: string | null
  can_edit: boolean
  can_delete: boolean
  can_approve: boolean
  assigned_at: string
  assigned_by: string | null
  user: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
    avatar_url: string | null
    role: string
    phone: string | null
    company?: {
      id: string
      name: string
    } | null
  } | null
}

export interface AddTeamMemberInput {
  user_id: string
  project_role?: string
  can_edit?: boolean
  can_delete?: boolean
  can_approve?: boolean
}

export interface UpdateTeamMemberInput {
  project_role?: string
  can_edit?: boolean
  can_delete?: boolean
  can_approve?: boolean
}

// Common project roles in construction
export const PROJECT_ROLES = [
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'superintendent', label: 'Superintendent' },
  { value: 'assistant_superintendent', label: 'Assistant Superintendent' },
  { value: 'foreman', label: 'Foreman' },
  { value: 'safety_manager', label: 'Safety Manager' },
  { value: 'quality_manager', label: 'Quality Manager' },
  { value: 'project_engineer', label: 'Project Engineer' },
  { value: 'field_engineer', label: 'Field Engineer' },
  { value: 'estimator', label: 'Estimator' },
  { value: 'scheduler', label: 'Scheduler' },
  { value: 'document_controller', label: 'Document Controller' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'client_representative', label: 'Client Representative' },
  { value: 'architect', label: 'Architect' },
  { value: 'owner_representative', label: "Owner's Representative" },
  { value: 'other', label: 'Other' },
] as const

export type ProjectRole = typeof PROJECT_ROLES[number]['value']

export interface CompanyUser {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  avatar_url: string | null
  role: string
}
