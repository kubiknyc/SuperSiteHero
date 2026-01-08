/**
 * Subcontractor Safety Compliance Hooks
 * Hooks for viewing safety data and compliance (P1-4 Feature)
 */

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { subcontractorPortalApi } from '@/lib/api/services/subcontractor-portal'
import type {
  SubcontractorSafetyIncident,
  SubcontractorCorrectiveAction,
  SubcontractorToolboxTalk,
  SubcontractorSafetyMetrics,
  SafetyComplianceSummary,
  SafetyIncidentSeverity,
  SafetyIncidentStatus,
} from '@/types/subcontractor-portal'

// =============================================
// QUERY KEYS
// =============================================

export const safetyKeys = {
  all: ['subcontractor', 'safety'] as const,
  incidents: () => [...safetyKeys.all, 'incidents'] as const,
  correctiveActions: () => [...safetyKeys.all, 'corrective-actions'] as const,
  toolboxTalks: () => [...safetyKeys.all, 'toolbox-talks'] as const,
  metrics: () => [...safetyKeys.all, 'metrics'] as const,
  summary: () => [...safetyKeys.all, 'summary'] as const,
}

// =============================================
// QUERY HOOKS
// =============================================

/**
 * Fetch safety incidents for the current subcontractor's projects
 */
export function useSubcontractorSafetyIncidents() {
  const { user } = useAuth()

  return useQuery({
    queryKey: safetyKeys.incidents(),
    queryFn: () => subcontractorPortalApi.getSafetyIncidents(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch corrective actions for the current subcontractor
 */
export function useSubcontractorCorrectiveActions() {
  const { user } = useAuth()

  return useQuery({
    queryKey: safetyKeys.correctiveActions(),
    queryFn: () => subcontractorPortalApi.getCorrectiveActions(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch toolbox talks/safety training for the current subcontractor's projects
 */
export function useSubcontractorToolboxTalks() {
  const { user } = useAuth()

  return useQuery({
    queryKey: safetyKeys.toolboxTalks(),
    queryFn: () => subcontractorPortalApi.getToolboxTalks(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch safety metrics for the current subcontractor
 */
export function useSubcontractorSafetyMetrics() {
  const { user } = useAuth()

  return useQuery({
    queryKey: safetyKeys.metrics(),
    queryFn: () => subcontractorPortalApi.getSafetyMetrics(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch safety compliance summary for dashboard
 */
export function useSafetyComplianceSummary() {
  const { user } = useAuth()

  return useQuery({
    queryKey: safetyKeys.summary(),
    queryFn: () => subcontractorPortalApi.getSafetyComplianceSummary(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Get severity badge variant
 */
export function getSeverityBadgeVariant(severity: SafetyIncidentSeverity): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (severity) {
    case 'near_miss':
      return 'outline'
    case 'first_aid':
      return 'secondary'
    case 'medical_treatment':
      return 'default'
    case 'lost_time':
    case 'fatality':
      return 'destructive'
    default:
      return 'outline'
  }
}

/**
 * Get severity label
 */
export function getSeverityLabel(severity: SafetyIncidentSeverity): string {
  const labels: Record<SafetyIncidentSeverity, string> = {
    near_miss: 'Near Miss',
    first_aid: 'First Aid',
    medical_treatment: 'Medical Treatment',
    lost_time: 'Lost Time',
    fatality: 'Fatality',
  }
  return labels[severity] || severity
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: SafetyIncidentSeverity): string {
  switch (severity) {
    case 'near_miss':
      return 'text-blue-600'
    case 'first_aid':
      return 'text-yellow-600'
    case 'medical_treatment':
      return 'text-orange-600'
    case 'lost_time':
      return 'text-red-600'
    case 'fatality':
      return 'text-red-800'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Get incident status badge variant
 */
export function getIncidentStatusBadgeVariant(status: SafetyIncidentStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'reported':
      return 'outline'
    case 'under_investigation':
      return 'secondary'
    case 'corrective_actions':
      return 'default'
    case 'closed':
      return 'outline'
    default:
      return 'outline'
  }
}

/**
 * Get incident status label
 */
export function getIncidentStatusLabel(status: SafetyIncidentStatus): string {
  const labels: Record<SafetyIncidentStatus, string> = {
    reported: 'Reported',
    under_investigation: 'Under Investigation',
    corrective_actions: 'Corrective Actions',
    closed: 'Closed',
  }
  return labels[status] || status
}

/**
 * Get corrective action status variant
 */
export function getActionStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'pending':
      return 'outline'
    case 'in_progress':
      return 'secondary'
    case 'completed':
      return 'default'
    case 'verified':
      return 'default'
    default:
      return 'outline'
  }
}

/**
 * Get corrective action status label
 */
export function getActionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    verified: 'Verified',
  }
  return labels[status] || status
}

/**
 * Get priority badge variant
 */
export function getPriorityBadgeVariant(priority: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (priority) {
    case 'low':
      return 'outline'
    case 'medium':
      return 'secondary'
    case 'high':
      return 'default'
    case 'critical':
      return 'destructive'
    default:
      return 'outline'
  }
}

/**
 * Get priority label
 */
export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  }
  return labels[priority] || priority
}

/**
 * Get compliance score color
 */
export function getComplianceScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600'
  if (score >= 70) return 'text-yellow-600'
  if (score >= 50) return 'text-orange-600'
  return 'text-red-600'
}

/**
 * Get compliance score background color
 */
export function getComplianceScoreBgColor(score: number): string {
  if (score >= 90) return 'bg-green-100'
  if (score >= 70) return 'bg-yellow-100'
  if (score >= 50) return 'bg-orange-100'
  return 'bg-red-100'
}

/**
 * Get compliance score label
 */
export function getComplianceScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Fair'
  return 'Needs Improvement'
}

/**
 * Format date for display
 */
export function formatSafetyDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format days count for display
 */
export function formatDaysSince(days: number | null): string {
  if (days === null) return '-'
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  return `${days} days`
}

/**
 * Filter incidents by status
 */
export function filterIncidentsByStatus(
  incidents: SubcontractorSafetyIncident[],
  filter: 'all' | 'open' | 'closed' | 'recordable'
): SubcontractorSafetyIncident[] {
  switch (filter) {
    case 'open':
      return incidents.filter(i => i.status !== 'closed')
    case 'closed':
      return incidents.filter(i => i.status === 'closed')
    case 'recordable':
      return incidents.filter(i => i.is_osha_recordable)
    default:
      return incidents
  }
}

/**
 * Filter corrective actions by status
 */
export function filterActionsByStatus(
  actions: SubcontractorCorrectiveAction[],
  filter: 'all' | 'open' | 'overdue' | 'completed'
): SubcontractorCorrectiveAction[] {
  switch (filter) {
    case 'open':
      return actions.filter(a => a.status === 'pending' || a.status === 'in_progress')
    case 'overdue':
      return actions.filter(a => a.is_overdue)
    case 'completed':
      return actions.filter(a => a.status === 'completed' || a.status === 'verified')
    default:
      return actions
  }
}

/**
 * Group incidents by project
 */
export function groupIncidentsByProject(
  incidents: SubcontractorSafetyIncident[]
): Record<string, SubcontractorSafetyIncident[]> {
  return incidents.reduce((acc, incident) => {
    const key = incident.project_id
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(incident)
    return acc
  }, {} as Record<string, SubcontractorSafetyIncident[]>)
}

// Re-export types for convenience
export type {
  SubcontractorSafetyIncident,
  SubcontractorCorrectiveAction,
  SubcontractorToolboxTalk,
  SubcontractorSafetyMetrics,
  SafetyComplianceSummary,
  SafetyIncidentSeverity,
  SafetyIncidentStatus,
}
