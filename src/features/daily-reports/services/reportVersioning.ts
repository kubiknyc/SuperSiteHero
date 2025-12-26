// Report versioning and audit trail service
import { supabase } from '@/lib/supabase'
import { logger } from '../../../lib/utils/logger';


export interface ReportVersion {
  id: string
  report_id: string
  version_number: number
  changed_by: string
  changed_by_name?: string
  changed_at: string
  change_type: 'created' | 'updated' | 'submitted' | 'approved' | 'rejected'
  change_summary: string
  previous_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
}

export interface AuditEntry {
  id: string
  timestamp: string
  user_name: string
  action: string
  details: string
  field_changes?: Array<{
    field: string
    old_value: unknown
    new_value: unknown
  }>
}

// Create a version entry when report is modified
// Note: daily_report_versions table may not exist in generated types but exists in database
export async function createReportVersion(
  reportId: string,
  userId: string,
  changeType: ReportVersion['change_type'],
  changeSummary: string,
  previousData?: Record<string, unknown>,
  newData?: Record<string, unknown>
): Promise<void> {
  // Get current version number
  const { data: existingVersions } = await (supabase as any)
    .from('daily_report_versions')
    .select('version_number')
    .eq('report_id', reportId)
    .order('version_number', { ascending: false })
    .limit(1)

  const nextVersion = existingVersions?.[0]?.version_number
    ? (existingVersions[0].version_number as number) + 1
    : 1

  const { error } = await (supabase as any)
    .from('daily_report_versions')
    .insert({
      report_id: reportId,
      version_number: nextVersion,
      changed_by: userId,
      change_type: changeType,
      change_summary: changeSummary,
      previous_data: previousData,
      new_data: newData,
    })

  if (error) {
    // Fall back to localStorage if table doesn't exist
    logger.warn('Version table not found, using localStorage:', error.message)
    saveVersionToLocalStorage(reportId, userId, changeType, changeSummary, nextVersion, previousData, newData)
  }
}

// Fallback localStorage storage
function saveVersionToLocalStorage(
  reportId: string,
  userId: string,
  changeType: ReportVersion['change_type'],
  changeSummary: string,
  versionNumber: number,
  previousData?: Record<string, unknown>,
  newData?: Record<string, unknown>
): void {
  const versions = getVersionsFromLocalStorage(reportId)
  versions.push({
    id: crypto.randomUUID(),
    report_id: reportId,
    version_number: versionNumber,
    changed_by: userId,
    changed_at: new Date().toISOString(),
    change_type: changeType,
    change_summary: changeSummary,
    previous_data: previousData,
    new_data: newData,
  })
  localStorage.setItem(`report_versions_${reportId}`, JSON.stringify(versions))
}

function getVersionsFromLocalStorage(reportId: string): ReportVersion[] {
  try {
    const stored = localStorage.getItem(`report_versions_${reportId}`)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Get version history for a report
// Note: daily_report_versions table may not exist in generated types but exists in database
export async function getReportVersionHistory(reportId: string): Promise<ReportVersion[]> {
  const { data, error } = await (supabase as any)
    .from('daily_report_versions')
    .select(`
      *,
      user:users(full_name)
    `)
    .eq('report_id', reportId)
    .order('version_number', { ascending: false })

  if (error) {
    logger.warn('Using localStorage versions:', error.message)
    return getVersionsFromLocalStorage(reportId)
  }

  return (data || []).map((v: Record<string, unknown>) => ({
    id: v.id as string,
    report_id: v.report_id as string,
    version_number: v.version_number as number,
    changed_by: v.changed_by as string,
    changed_by_name: (v.user as Record<string, unknown>)?.full_name as string | undefined,
    changed_at: v.changed_at as string,
    change_type: v.change_type as ReportVersion['change_type'],
    change_summary: v.change_summary as string,
    previous_data: v.previous_data as Record<string, unknown> | undefined,
    new_data: v.new_data as Record<string, unknown> | undefined,
  }))
}

// Compare two versions and get field-level changes
export function compareVersions(
  oldData: Record<string, unknown> | undefined,
  newData: Record<string, unknown> | undefined
): Array<{ field: string; old_value: unknown; new_value: unknown }> {
  if (!oldData && !newData) {return []}

  const changes: Array<{ field: string; old_value: unknown; new_value: unknown }> = []
  const allKeys = new Set([
    ...Object.keys(oldData || {}),
    ...Object.keys(newData || {}),
  ])

  const ignoredFields = ['id', 'created_at', 'updated_at', 'version']

  allKeys.forEach((key) => {
    if (ignoredFields.includes(key)) {return}

    const oldValue = oldData?.[key]
    const newValue = newData?.[key]

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field: formatFieldName(key),
        old_value: oldValue,
        new_value: newValue,
      })
    }
  })

  return changes
}

// Format field name for display
function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

// Get audit trail formatted for display
export function formatAuditTrail(versions: ReportVersion[]): AuditEntry[] {
  return versions.map((v) => {
    const fieldChanges = v.previous_data || v.new_data
      ? compareVersions(v.previous_data, v.new_data)
      : undefined

    return {
      id: v.id,
      timestamp: v.changed_at,
      user_name: v.changed_by_name || 'Unknown User',
      action: formatChangeType(v.change_type),
      details: v.change_summary,
      field_changes: fieldChanges,
    }
  })
}

function formatChangeType(type: ReportVersion['change_type']): string {
  const labels: Record<ReportVersion['change_type'], string> = {
    created: 'Created Report',
    updated: 'Updated Report',
    submitted: 'Submitted for Approval',
    approved: 'Approved Report',
    rejected: 'Rejected Report',
  }
  return labels[type]
}

// Wrapper to track changes on report save
export async function trackReportChange(
  reportId: string,
  userId: string,
  previousData: Record<string, unknown> | undefined,
  newData: Record<string, unknown>,
  isNew: boolean
): Promise<void> {
  const changeType = isNew ? 'created' : 'updated'
  const changes = isNew ? [] : compareVersions(previousData, newData)
  const changeSummary = isNew
    ? 'Initial report creation'
    : changes.length > 0
      ? `Updated: ${changes.map((c) => c.field).join(', ')}`
      : 'No significant changes'

  await createReportVersion(reportId, userId, changeType, changeSummary, previousData, newData)
}

// Track status changes specifically
export async function trackStatusChange(
  reportId: string,
  userId: string,
  newStatus: string,
  previousStatus?: string
): Promise<void> {
  let changeType: ReportVersion['change_type'] = 'updated'
  let changeSummary = `Status changed from ${previousStatus || 'draft'} to ${newStatus}`

  if (newStatus === 'submitted') {
    changeType = 'submitted'
    changeSummary = 'Report submitted for approval'
  } else if (newStatus === 'approved') {
    changeType = 'approved'
    changeSummary = 'Report approved'
  } else if (newStatus === 'rejected') {
    changeType = 'rejected'
    changeSummary = 'Report rejected'
  }

  await createReportVersion(reportId, userId, changeType, changeSummary)
}
