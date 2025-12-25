/**
 * Report Sharing API Service
 *
 * Provides CRUD operations for report sharing functionality:
 * - Create, update, delete report shares
 * - Get shared report by public token (for public viewer)
 * - List all shares for a report
 */

import { supabaseUntyped } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'
import type {
  SharedReport,
  CreateReportShareDTO,
  UpdateReportShareDTO,
  PublicSharedReportData,
} from '@/types/report-builder'

// ============================================================================
// Get Operations
// ============================================================================

/**
 * Get all shares for a specific report template
 */
export async function getReportShares(reportTemplateId: string): Promise<SharedReport[]> {
  const { data, error } = await supabaseUntyped
    .from('shared_reports')
    .select(`
      *,
      creator:users!created_by(id, full_name, email),
      report_template:report_templates!report_template_id(id, name, data_source)
    `)
    .eq('report_template_id', reportTemplateId)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('[ReportSharing] Error fetching report shares:', error)
    throw error
  }

  return data || []
}

/**
 * Get a single shared report by ID
 */
export async function getReportShare(shareId: string): Promise<SharedReport | null> {
  const { data, error } = await supabaseUntyped
    .from('shared_reports')
    .select(`
      *,
      creator:users!created_by(id, full_name, email),
      report_template:report_templates!report_template_id(id, name, data_source, configuration)
    `)
    .eq('id', shareId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {return null}
    logger.error('[ReportSharing] Error fetching share:', error)
    throw error
  }

  return data
}

/**
 * Get shared report by public token (for public viewer)
 * This uses a database function that also tracks view counts
 */
export async function getSharedReportByToken(token: string): Promise<PublicSharedReportData | null> {
  const { data, error } = await supabaseUntyped
    .rpc('get_shared_report_by_token', { p_token: token })

  if (error) {
    logger.error('[ReportSharing] Error fetching shared report by token:', error)
    throw error
  }

  if (!data || data.length === 0) {
    return null
  }

  // Transform the flat data into our expected shape
  const row = data[0]
  return {
    id: row.id,
    reportTemplateId: row.report_template_id,
    publicToken: row.public_token,
    isPublic: row.is_public,
    allowedUsers: row.allowed_users,
    expiresAt: row.expires_at,
    allowExport: row.allow_export,
    showBranding: row.show_branding,
    customMessage: row.custom_message,
    companyId: row.company_id,
    createdAt: row.created_at,
    viewCount: row.view_count,
    template: {
      id: row.report_template_id,
      name: row.template_name,
      description: row.template_description,
      dataSource: row.template_data_source,
      configuration: row.template_configuration,
      defaultFormat: row.template_default_format,
      pageOrientation: row.template_page_orientation,
      includeCharts: row.template_include_charts,
      includeSummary: row.template_include_summary,
    },
    company: {
      id: row.company_id,
      name: row.company_name,
      logoUrl: row.company_logo_url,
    },
  }
}

/**
 * Get all shared reports for the current user's company
 */
export async function getCompanySharedReports(companyId: string): Promise<SharedReport[]> {
  const { data, error } = await supabaseUntyped
    .from('shared_reports')
    .select(`
      *,
      creator:users!created_by(id, full_name, email),
      report_template:report_templates!report_template_id(id, name, data_source)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('[ReportSharing] Error fetching company shares:', error)
    throw error
  }

  return data || []
}

// ============================================================================
// Create/Update/Delete Operations
// ============================================================================

/**
 * Create a new report share
 */
export async function createReportShare(input: CreateReportShareDTO): Promise<SharedReport> {
  const { data: authData } = await supabaseUntyped.auth.getUser()
  const userId = authData?.user?.id

  const { data, error } = await supabaseUntyped
    .from('shared_reports')
    .insert({
      report_template_id: input.reportTemplateId,
      company_id: input.companyId,
      is_public: input.isPublic ?? true,
      allowed_users: input.allowedUsers ?? null,
      expires_at: input.expiresAt ?? null,
      allow_export: input.allowExport ?? true,
      show_branding: input.showBranding ?? true,
      custom_message: input.customMessage ?? null,
      created_by: userId,
    })
    .select(`
      *,
      creator:users!created_by(id, full_name, email),
      report_template:report_templates!report_template_id(id, name, data_source)
    `)
    .single()

  if (error) {
    logger.error('[ReportSharing] Error creating share:', error)
    throw error
  }

  return data
}

/**
 * Update an existing report share
 */
export async function updateReportShare(
  shareId: string,
  input: UpdateReportShareDTO
): Promise<SharedReport> {
  const updates: Record<string, unknown> = {}

  if (input.isPublic !== undefined) {updates.is_public = input.isPublic}
  if (input.allowedUsers !== undefined) {updates.allowed_users = input.allowedUsers}
  if (input.expiresAt !== undefined) {updates.expires_at = input.expiresAt}
  if (input.allowExport !== undefined) {updates.allow_export = input.allowExport}
  if (input.showBranding !== undefined) {updates.show_branding = input.showBranding}
  if (input.customMessage !== undefined) {updates.custom_message = input.customMessage}

  const { data, error } = await supabaseUntyped
    .from('shared_reports')
    .update(updates)
    .eq('id', shareId)
    .select(`
      *,
      creator:users!created_by(id, full_name, email),
      report_template:report_templates!report_template_id(id, name, data_source)
    `)
    .single()

  if (error) {
    logger.error('[ReportSharing] Error updating share:', error)
    throw error
  }

  return data
}

/**
 * Delete a report share
 */
export async function deleteReportShare(shareId: string): Promise<void> {
  const { error } = await supabaseUntyped
    .from('shared_reports')
    .delete()
    .eq('id', shareId)

  if (error) {
    logger.error('[ReportSharing] Error deleting share:', error)
    throw error
  }
}

/**
 * Regenerate the public token for a share (for security)
 */
export async function regenerateShareToken(shareId: string): Promise<string> {
  const { data, error } = await supabaseUntyped
    .rpc('regenerate_share_token', { p_share_id: shareId })

  if (error) {
    logger.error('[ReportSharing] Error regenerating token:', error)
    throw error
  }

  return data
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate the public URL for a shared report
 */
export function getShareUrl(token: string): string {
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : import.meta.env.VITE_APP_URL || 'https://app.supersitehero.com'
  return `${baseUrl}/reports/public/${token}`
}

/**
 * Generate the embed code for a shared report
 */
export function getEmbedCode(token: string, width = '100%', height = '600px'): string {
  const url = getShareUrl(token)
  return `<iframe src="${url}" width="${width}" height="${height}" frameborder="0" allowfullscreen></iframe>`
}

/**
 * Check if a share is expired
 */
export function isShareExpired(share: SharedReport): boolean {
  if (!share.expires_at) {return false}
  return new Date(share.expires_at) < new Date()
}

/**
 * Check if a user has access to a share
 */
export function userHasAccess(share: SharedReport, userId: string | null): boolean {
  // Public shares are accessible to everyone
  if (share.is_public) {return true}

  // Non-public shares require a valid user ID
  if (!userId) {return false}

  // Check if user is in the allowed users list
  return share.allowed_users?.includes(userId) ?? false
}

// ============================================================================
// Export API object
// ============================================================================

export const reportSharingApi = {
  // Get operations
  getReportShares,
  getReportShare,
  getSharedReportByToken,
  getCompanySharedReports,

  // Mutations
  createReportShare,
  updateReportShare,
  deleteReportShare,
  regenerateShareToken,

  // Helpers
  getShareUrl,
  getEmbedCode,
  isShareExpired,
  userHasAccess,
}
