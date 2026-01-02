/**
 * Extended Project Types
 *
 * Comprehensive type definitions for enhanced project management including:
 * - Budget/Contract tracking
 * - Milestone management
 * - Health score calculations
 * - Project type classification
 * - Key stakeholder assignments
 */

import type { Project as BaseProject } from '@/types/database'

// ============================================================================
// Project Type Classification
// ============================================================================

export type ProjectType =
  | 'commercial'
  | 'residential'
  | 'industrial'
  | 'infrastructure'
  | 'healthcare'
  | 'education'
  | 'hospitality'
  | 'retail'
  | 'mixed_use'
  | 'renovation'
  | 'tenant_improvement'
  | 'other'

export interface ProjectTypeConfig {
  type: ProjectType
  label: string
  description: string
  icon: string
  requiredFields: string[]
  defaultFeatures: string[]
}

export const PROJECT_TYPES: ProjectTypeConfig[] = [
  {
    type: 'commercial',
    label: 'Commercial',
    description: 'Office buildings, corporate facilities',
    icon: 'Building2',
    requiredFields: ['contract_value', 'architect'],
    defaultFeatures: ['rfis', 'submittals', 'change_orders', 'daily_reports'],
  },
  {
    type: 'residential',
    label: 'Residential',
    description: 'Single or multi-family housing',
    icon: 'Home',
    requiredFields: ['contract_value'],
    defaultFeatures: ['punch_lists', 'inspections', 'daily_reports'],
  },
  {
    type: 'industrial',
    label: 'Industrial',
    description: 'Manufacturing, warehousing, distribution',
    icon: 'Factory',
    requiredFields: ['contract_value', 'engineer_structural'],
    defaultFeatures: ['safety', 'inspections', 'equipment', 'submittals'],
  },
  {
    type: 'infrastructure',
    label: 'Infrastructure',
    description: 'Roads, bridges, utilities, public works',
    icon: 'Construction',
    requiredFields: ['contract_value', 'owner_representative'],
    defaultFeatures: ['safety', 'daily_reports', 'inspections', 'quality'],
  },
  {
    type: 'healthcare',
    label: 'Healthcare',
    description: 'Hospitals, clinics, medical facilities',
    icon: 'HeartPulse',
    requiredFields: ['contract_value', 'architect', 'engineer_mep'],
    defaultFeatures: ['submittals', 'rfis', 'inspections', 'closeout'],
  },
  {
    type: 'education',
    label: 'Education',
    description: 'Schools, universities, training centers',
    icon: 'GraduationCap',
    requiredFields: ['contract_value', 'architect'],
    defaultFeatures: ['rfis', 'submittals', 'daily_reports', 'safety'],
  },
  {
    type: 'hospitality',
    label: 'Hospitality',
    description: 'Hotels, restaurants, entertainment venues',
    icon: 'Hotel',
    requiredFields: ['contract_value', 'architect'],
    defaultFeatures: ['punch_lists', 'submittals', 'quality'],
  },
  {
    type: 'retail',
    label: 'Retail',
    description: 'Shopping centers, stores, showrooms',
    icon: 'Store',
    requiredFields: ['contract_value'],
    defaultFeatures: ['punch_lists', 'daily_reports', 'photos'],
  },
  {
    type: 'mixed_use',
    label: 'Mixed Use',
    description: 'Combined residential, commercial, retail',
    icon: 'Building',
    requiredFields: ['contract_value', 'architect'],
    defaultFeatures: ['rfis', 'submittals', 'change_orders', 'daily_reports', 'punch_lists'],
  },
  {
    type: 'renovation',
    label: 'Renovation',
    description: 'Building renovations and upgrades',
    icon: 'Hammer',
    requiredFields: ['contract_value'],
    defaultFeatures: ['rfis', 'change_orders', 'daily_reports'],
  },
  {
    type: 'tenant_improvement',
    label: 'Tenant Improvement',
    description: 'Interior build-outs and fit-ups',
    icon: 'Layers',
    requiredFields: ['contract_value'],
    defaultFeatures: ['punch_lists', 'submittals', 'daily_reports'],
  },
  {
    type: 'other',
    label: 'Other',
    description: 'Other project types',
    icon: 'MoreHorizontal',
    requiredFields: [],
    defaultFeatures: ['daily_reports'],
  },
]

// ============================================================================
// Budget & Contract Types
// ============================================================================

export interface ProjectBudget {
  originalContractValue: number | null
  currentContractValue: number | null
  originalBudget: number | null
  currentBudget: number | null
  contingencyAmount: number | null
  contingencyUsed: number | null
  contingencyRemaining: number | null
  spentToDate: number | null
  budgetRemaining: number | null
  percentComplete: number | null
  budgetVariance: number | null
  budgetPercentUsed: number | null
}

export interface ContractValue {
  id: string
  projectId: string
  originalValue: number
  currentValue: number
  approvedChangeOrders: number
  pendingChangeOrders: number
  lastUpdated: string
}

// ============================================================================
// Milestone Types
// ============================================================================

export type MilestoneType =
  | 'design_complete'
  | 'permits_obtained'
  | 'ground_breaking'
  | 'foundation_complete'
  | 'structure_complete'
  | 'rough_in_complete'
  | 'mep_complete'
  | 'finishes_complete'
  | 'substantial_completion'
  | 'final_completion'
  | 'turnover'
  | 'warranty_start'
  | 'warranty_end'
  | 'custom'

export type MilestoneStatus = 'upcoming' | 'achieved' | 'missed' | 'at_risk'

export interface ProjectMilestone {
  id: string
  projectId: string
  name: string
  description?: string | null
  milestoneType: MilestoneType
  targetDate: string
  actualDate?: string | null
  status: MilestoneStatus
  sortOrder: number
  notifyBeforeDays: number
  notifiedAt?: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface MilestoneWithDetails extends ProjectMilestone {
  daysUntilTarget: number | null
  daysOverdue: number | null
  isOverdue: boolean
}

export const MILESTONE_TYPES: Array<{
  type: MilestoneType
  label: string
  defaultNotifyDays: number
}> = [
  { type: 'design_complete', label: 'Design Complete', defaultNotifyDays: 14 },
  { type: 'permits_obtained', label: 'Permits Obtained', defaultNotifyDays: 7 },
  { type: 'ground_breaking', label: 'Ground Breaking', defaultNotifyDays: 7 },
  { type: 'foundation_complete', label: 'Foundation Complete', defaultNotifyDays: 14 },
  { type: 'structure_complete', label: 'Structure Complete', defaultNotifyDays: 14 },
  { type: 'rough_in_complete', label: 'Rough-In Complete', defaultNotifyDays: 7 },
  { type: 'mep_complete', label: 'MEP Complete', defaultNotifyDays: 14 },
  { type: 'finishes_complete', label: 'Finishes Complete', defaultNotifyDays: 14 },
  { type: 'substantial_completion', label: 'Substantial Completion', defaultNotifyDays: 30 },
  { type: 'final_completion', label: 'Final Completion', defaultNotifyDays: 14 },
  { type: 'turnover', label: 'Turnover', defaultNotifyDays: 7 },
  { type: 'warranty_start', label: 'Warranty Start', defaultNotifyDays: 7 },
  { type: 'warranty_end', label: 'Warranty End', defaultNotifyDays: 30 },
  { type: 'custom', label: 'Custom Milestone', defaultNotifyDays: 7 },
]

// ============================================================================
// Health Score Types
// ============================================================================

export type HealthStatus = 'healthy' | 'at_risk' | 'critical'

export interface HealthScoreCategory {
  name: string
  score: number
  weight: number
  status: HealthStatus
  details: string
}

export interface ProjectHealthScore {
  overallScore: number
  status: HealthStatus
  trend: 'improving' | 'stable' | 'declining'
  lastCalculated: string
  categories: {
    budget: HealthScoreCategory
    schedule: HealthScoreCategory
    rfi: HealthScoreCategory
    changeOrder: HealthScoreCategory
    punchList: HealthScoreCategory
    safety: HealthScoreCategory
  }
}

export interface HealthScoreHistory {
  id: string
  projectId: string
  score: number
  status: HealthStatus
  categoryScores: Record<string, number>
  recordedAt: string
}

// ============================================================================
// Stakeholder Types
// ============================================================================

export type StakeholderRole =
  | 'owner'
  | 'owner_representative'
  | 'architect'
  | 'engineer_structural'
  | 'engineer_mep'
  | 'engineer_civil'
  | 'engineer_geotechnical'
  | 'general_contractor'
  | 'construction_manager'
  | 'project_manager'
  | 'superintendent'
  | 'inspector'
  | 'expediter'
  | 'safety_manager'
  | 'other'

export interface ProjectStakeholder {
  id: string
  projectId: string
  role: StakeholderRole
  companyName: string
  contactName: string
  email?: string | null
  phone?: string | null
  contactId?: string | null
  isPrimary: boolean
  notes?: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export const STAKEHOLDER_ROLES: Array<{
  role: StakeholderRole
  label: string
  description: string
  allowMultiple: boolean
}> = [
  { role: 'owner', label: 'Owner', description: 'Property or project owner', allowMultiple: false },
  { role: 'owner_representative', label: 'Owner Representative', description: 'Represents the owner', allowMultiple: true },
  { role: 'architect', label: 'Architect', description: 'Project architect of record', allowMultiple: false },
  { role: 'engineer_structural', label: 'Structural Engineer', description: 'Structural engineering firm', allowMultiple: false },
  { role: 'engineer_mep', label: 'MEP Engineer', description: 'Mechanical, Electrical, Plumbing engineering', allowMultiple: false },
  { role: 'engineer_civil', label: 'Civil Engineer', description: 'Civil/site engineering firm', allowMultiple: false },
  { role: 'engineer_geotechnical', label: 'Geotechnical Engineer', description: 'Soil and foundation engineering', allowMultiple: false },
  { role: 'general_contractor', label: 'General Contractor', description: 'Prime contractor for the project', allowMultiple: false },
  { role: 'construction_manager', label: 'Construction Manager', description: 'Construction management firm', allowMultiple: false },
  { role: 'project_manager', label: 'Project Manager', description: 'Internal project manager', allowMultiple: true },
  { role: 'superintendent', label: 'Superintendent', description: 'Field superintendent', allowMultiple: true },
  { role: 'inspector', label: 'Inspector', description: 'Building or code inspector', allowMultiple: true },
  { role: 'expediter', label: 'Expediter', description: 'Materials/submittal expediter', allowMultiple: true },
  { role: 'safety_manager', label: 'Safety Manager', description: 'Safety and compliance officer', allowMultiple: true },
  { role: 'other', label: 'Other', description: 'Other stakeholder role', allowMultiple: true },
]

// ============================================================================
// Extended Project Type
// ============================================================================

export interface ExtendedProject extends BaseProject {
  // Budget fields
  originalContractValue?: number | null
  currentContractValue?: number | null
  originalBudget?: number | null
  spentToDate?: number | null
  contingencyAmount?: number | null
  contingencyUsed?: number | null
  percentComplete?: number | null

  // Health score
  healthScore?: number | null
  healthStatus?: HealthStatus | null

  // Schedule
  baselineStartDate?: string | null
  baselineEndDate?: string | null
  scheduleVarianceDays?: number | null

  // Classification
  projectType?: ProjectType | null

  // Hero image
  heroImageUrl?: string | null
}

export interface ProjectWithDetails extends ExtendedProject {
  milestones?: MilestoneWithDetails[]
  stakeholders?: ProjectStakeholder[]
  healthData?: ProjectHealthScore
  budgetData?: ProjectBudget
}

// ============================================================================
// Form/Input Types
// ============================================================================

export interface CreateMilestoneInput {
  projectId: string
  name: string
  description?: string
  milestoneType: MilestoneType
  targetDate: string
  notifyBeforeDays?: number
}

export interface UpdateMilestoneInput {
  name?: string
  description?: string
  targetDate?: string
  actualDate?: string | null
  status?: MilestoneStatus
  notifyBeforeDays?: number
  sortOrder?: number
}

export interface CreateStakeholderInput {
  projectId: string
  role: StakeholderRole
  companyName: string
  contactName: string
  email?: string
  phone?: string
  contactId?: string
  isPrimary?: boolean
  notes?: string
}

export interface UpdateStakeholderInput {
  role?: StakeholderRole
  companyName?: string
  contactName?: string
  email?: string
  phone?: string
  contactId?: string
  isPrimary?: boolean
  notes?: string
}

export interface ProjectBudgetUpdateInput {
  originalContractValue?: number
  currentContractValue?: number
  originalBudget?: number
  budget?: number
  contingencyAmount?: number
  contingencyUsed?: number
  spentToDate?: number
  percentComplete?: number
}

// ============================================================================
// Filter Types
// ============================================================================

export interface MilestoneFilters {
  projectId?: string
  status?: MilestoneStatus[]
  milestoneType?: MilestoneType[]
  dateRange?: {
    start: string
    end: string
  }
}

export interface StakeholderFilters {
  projectId?: string
  role?: StakeholderRole[]
  isPrimary?: boolean
}

export interface ProjectFilters {
  projectType?: ProjectType[]
  status?: string[]
  healthStatus?: HealthStatus[]
  dateRange?: {
    start: string
    end: string
  }
}
