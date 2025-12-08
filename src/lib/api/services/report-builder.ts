/**
 * Report Builder API Service
 *
 * Provides CRUD operations for report templates, scheduled reports,
 * and generated reports.
 */

import { supabase, supabaseUntyped } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'
import type {
  ReportTemplate,
  ReportTemplateField,
  ReportTemplateFilter,
  ReportTemplateSorting,
  ReportTemplateGrouping,
  ScheduledReport,
  GeneratedReport,
  ReportFieldDefinition,
  CreateReportTemplateDTO,
  UpdateReportTemplateDTO,
  ReportTemplateFieldInput,
  ReportTemplateFilterInput,
  ReportTemplateSortingInput,
  ReportTemplateGroupingInput,
  CreateScheduledReportDTO,
  UpdateScheduledReportDTO,
  GenerateReportDTO,
  ReportTemplateFilters,
  ScheduledReportFilters,
  GeneratedReportFilters,
  ReportDataSource,
} from '@/types/report-builder'

// ============================================================================
// Report Templates
// ============================================================================

/**
 * Get all report templates with optional filters
 */
export async function getReportTemplates(filters: ReportTemplateFilters = {}): Promise<ReportTemplate[]> {
  let query = supabaseUntyped
    .from('report_templates')
    .select(`
      *,
      creator:users!created_by(id, full_name, email)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (filters.company_id) {
    query = query.eq('company_id', filters.company_id)
  }

  if (filters.data_source) {
    query = query.eq('data_source', filters.data_source)
  }

  if (filters.is_shared !== undefined) {
    query = query.eq('is_shared', filters.is_shared)
  }

  if (filters.is_system_template !== undefined) {
    query = query.eq('is_system_template', filters.is_system_template)
  }

  if (filters.created_by) {
    query = query.eq('created_by', filters.created_by)
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) {
    logger.error('[ReportBuilder] Error fetching templates:', error)
    throw error
  }

  return data || []
}

/**
 * Get a single report template by ID
 */
export async function getReportTemplate(id: string): Promise<ReportTemplate | null> {
  const { data, error } = await supabaseUntyped
    .from('report_templates')
    .select(`
      *,
      creator:users!created_by(id, full_name, email),
      fields:report_template_fields(*),
      filters:report_template_filters(*),
      sorting:report_template_sorting(*),
      grouping:report_template_grouping(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    logger.error('[ReportBuilder] Error fetching template:', error)
    throw error
  }

  return data
}

/**
 * Create a new report template
 */
export async function createReportTemplate(input: CreateReportTemplateDTO): Promise<ReportTemplate> {
  const { data: authData } = await supabaseUntyped.auth.getUser()
  const userId = authData?.user?.id

  const { data, error } = await supabaseUntyped
    .from('report_templates')
    .insert({
      company_id: input.company_id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      data_source: input.data_source,
      is_shared: input.is_shared ?? false,
      configuration: input.configuration ?? {},
      default_format: input.default_format ?? 'pdf',
      page_orientation: input.page_orientation ?? 'portrait',
      include_charts: input.include_charts ?? true,
      include_summary: input.include_summary ?? true,
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    logger.error('[ReportBuilder] Error creating template:', error)
    throw error
  }

  return data
}

/**
 * Update a report template
 */
export async function updateReportTemplate(id: string, input: UpdateReportTemplateDTO): Promise<ReportTemplate> {
  const updates: Record<string, unknown> = {}

  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.description !== undefined) updates.description = input.description?.trim() || null
  if (input.is_shared !== undefined) updates.is_shared = input.is_shared
  if (input.configuration !== undefined) updates.configuration = input.configuration
  if (input.default_format !== undefined) updates.default_format = input.default_format
  if (input.page_orientation !== undefined) updates.page_orientation = input.page_orientation
  if (input.include_charts !== undefined) updates.include_charts = input.include_charts
  if (input.include_summary !== undefined) updates.include_summary = input.include_summary

  const { data, error } = await supabaseUntyped
    .from('report_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logger.error('[ReportBuilder] Error updating template:', error)
    throw error
  }

  return data
}

/**
 * Delete a report template (soft delete)
 */
export async function deleteReportTemplate(id: string): Promise<void> {
  const { error } = await supabaseUntyped
    .from('report_templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    logger.error('[ReportBuilder] Error deleting template:', error)
    throw error
  }
}

/**
 * Duplicate a report template
 */
export async function duplicateReportTemplate(id: string, newName: string): Promise<ReportTemplate> {
  // Fetch original template with all related data
  const original = await getReportTemplate(id)
  if (!original) {
    throw new Error('Template not found')
  }

  // Create new template
  const newTemplate = await createReportTemplate({
    company_id: original.company_id,
    name: newName,
    description: original.description,
    data_source: original.data_source,
    is_shared: false,
    configuration: original.configuration,
    default_format: original.default_format,
    page_orientation: original.page_orientation,
    include_charts: original.include_charts,
    include_summary: original.include_summary,
  })

  // Copy fields
  if (original.fields && original.fields.length > 0) {
    await setTemplateFields(newTemplate.id, original.fields.map(f => ({
      field_name: f.field_name,
      display_name: f.display_name,
      field_type: f.field_type,
      display_order: f.display_order,
      column_width: f.column_width,
      is_visible: f.is_visible,
      aggregation: f.aggregation,
      format_string: f.format_string,
    })))
  }

  // Copy filters
  if (original.filters && original.filters.length > 0) {
    await setTemplateFilters(newTemplate.id, original.filters.map(f => ({
      field_name: f.field_name,
      operator: f.operator,
      filter_value: f.filter_value,
      is_relative_date: f.is_relative_date,
      relative_date_value: f.relative_date_value,
      relative_date_unit: f.relative_date_unit,
      filter_group: f.filter_group,
      display_order: f.display_order,
    })))
  }

  // Copy sorting
  if (original.sorting && original.sorting.length > 0) {
    await setTemplateSorting(newTemplate.id, original.sorting.map(s => ({
      field_name: s.field_name,
      direction: s.direction,
      sort_order: s.sort_order,
    })))
  }

  // Copy grouping
  if (original.grouping && original.grouping.length > 0) {
    await setTemplateGrouping(newTemplate.id, original.grouping.map(g => ({
      field_name: g.field_name,
      group_order: g.group_order,
      include_subtotals: g.include_subtotals,
    })))
  }

  return getReportTemplate(newTemplate.id) as Promise<ReportTemplate>
}

// ============================================================================
// Template Fields
// ============================================================================

/**
 * Set template fields (replace all)
 */
export async function setTemplateFields(templateId: string, fields: ReportTemplateFieldInput[]): Promise<ReportTemplateField[]> {
  // Delete existing fields
  await supabaseUntyped
    .from('report_template_fields')
    .delete()
    .eq('template_id', templateId)

  if (fields.length === 0) return []

  // Insert new fields
  const { data, error } = await supabaseUntyped
    .from('report_template_fields')
    .insert(fields.map((f, index) => ({
      template_id: templateId,
      field_name: f.field_name,
      display_name: f.display_name,
      field_type: f.field_type,
      display_order: f.display_order ?? index,
      column_width: f.column_width,
      is_visible: f.is_visible ?? true,
      aggregation: f.aggregation ?? 'none',
      format_string: f.format_string,
    })))
    .select()

  if (error) {
    logger.error('[ReportBuilder] Error setting template fields:', error)
    throw error
  }

  return data || []
}

// ============================================================================
// Template Filters
// ============================================================================

/**
 * Set template filters (replace all)
 */
export async function setTemplateFilters(templateId: string, filters: ReportTemplateFilterInput[]): Promise<ReportTemplateFilter[]> {
  // Delete existing filters
  await supabaseUntyped
    .from('report_template_filters')
    .delete()
    .eq('template_id', templateId)

  if (filters.length === 0) return []

  // Insert new filters
  const { data, error } = await supabaseUntyped
    .from('report_template_filters')
    .insert(filters.map((f, index) => ({
      template_id: templateId,
      field_name: f.field_name,
      operator: f.operator,
      filter_value: f.filter_value,
      is_relative_date: f.is_relative_date ?? false,
      relative_date_value: f.relative_date_value,
      relative_date_unit: f.relative_date_unit,
      filter_group: f.filter_group ?? 0,
      display_order: f.display_order ?? index,
    })))
    .select()

  if (error) {
    logger.error('[ReportBuilder] Error setting template filters:', error)
    throw error
  }

  return data || []
}

// ============================================================================
// Template Sorting
// ============================================================================

/**
 * Set template sorting (replace all)
 */
export async function setTemplateSorting(templateId: string, sorting: ReportTemplateSortingInput[]): Promise<ReportTemplateSorting[]> {
  // Delete existing sorting
  await supabaseUntyped
    .from('report_template_sorting')
    .delete()
    .eq('template_id', templateId)

  if (sorting.length === 0) return []

  // Insert new sorting
  const { data, error } = await supabaseUntyped
    .from('report_template_sorting')
    .insert(sorting.map(s => ({
      template_id: templateId,
      field_name: s.field_name,
      direction: s.direction,
      sort_order: s.sort_order,
    })))
    .select()

  if (error) {
    logger.error('[ReportBuilder] Error setting template sorting:', error)
    throw error
  }

  return data || []
}

// ============================================================================
// Template Grouping
// ============================================================================

/**
 * Set template grouping (replace all)
 */
export async function setTemplateGrouping(templateId: string, grouping: ReportTemplateGroupingInput[]): Promise<ReportTemplateGrouping[]> {
  // Delete existing grouping
  await supabaseUntyped
    .from('report_template_grouping')
    .delete()
    .eq('template_id', templateId)

  if (grouping.length === 0) return []

  // Insert new grouping
  const { data, error } = await supabaseUntyped
    .from('report_template_grouping')
    .insert(grouping.map(g => ({
      template_id: templateId,
      field_name: g.field_name,
      group_order: g.group_order,
      include_subtotals: g.include_subtotals ?? true,
    })))
    .select()

  if (error) {
    logger.error('[ReportBuilder] Error setting template grouping:', error)
    throw error
  }

  return data || []
}

// ============================================================================
// Scheduled Reports
// ============================================================================

/**
 * Get all scheduled reports with optional filters
 */
export async function getScheduledReports(filters: ScheduledReportFilters = {}): Promise<ScheduledReport[]> {
  let query = supabaseUntyped
    .from('scheduled_reports')
    .select(`
      *,
      template:report_templates(id, name, data_source),
      project:projects(id, name),
      creator:users!created_by(id, full_name, email)
    `)
    .order('created_at', { ascending: false })

  if (filters.company_id) {
    query = query.eq('company_id', filters.company_id)
  }

  if (filters.template_id) {
    query = query.eq('template_id', filters.template_id)
  }

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }

  if (filters.frequency) {
    query = query.eq('frequency', filters.frequency)
  }

  const { data, error } = await query

  if (error) {
    logger.error('[ReportBuilder] Error fetching scheduled reports:', error)
    throw error
  }

  return data || []
}

/**
 * Get a single scheduled report
 */
export async function getScheduledReport(id: string): Promise<ScheduledReport | null> {
  const { data, error } = await supabaseUntyped
    .from('scheduled_reports')
    .select(`
      *,
      template:report_templates(id, name, data_source),
      project:projects(id, name),
      creator:users!created_by(id, full_name, email)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    logger.error('[ReportBuilder] Error fetching scheduled report:', error)
    throw error
  }

  return data
}

/**
 * Create a scheduled report
 */
export async function createScheduledReport(input: CreateScheduledReportDTO): Promise<ScheduledReport> {
  const { data: authData } = await supabaseUntyped.auth.getUser()
  const userId = authData?.user?.id

  const { data, error } = await supabaseUntyped
    .from('scheduled_reports')
    .insert({
      template_id: input.template_id,
      company_id: input.company_id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      frequency: input.frequency,
      day_of_week: input.day_of_week,
      day_of_month: input.day_of_month,
      time_of_day: input.time_of_day ?? '08:00:00',
      timezone: input.timezone ?? 'America/New_York',
      output_format: input.output_format ?? 'pdf',
      recipients: input.recipients,
      email_subject: input.email_subject,
      email_body: input.email_body,
      project_id: input.project_id,
      is_active: input.is_active ?? true,
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    logger.error('[ReportBuilder] Error creating scheduled report:', error)
    throw error
  }

  return data
}

/**
 * Update a scheduled report
 */
export async function updateScheduledReport(id: string, input: UpdateScheduledReportDTO): Promise<ScheduledReport> {
  const updates: Record<string, unknown> = {}

  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.description !== undefined) updates.description = input.description?.trim() || null
  if (input.frequency !== undefined) updates.frequency = input.frequency
  if (input.day_of_week !== undefined) updates.day_of_week = input.day_of_week
  if (input.day_of_month !== undefined) updates.day_of_month = input.day_of_month
  if (input.time_of_day !== undefined) updates.time_of_day = input.time_of_day
  if (input.timezone !== undefined) updates.timezone = input.timezone
  if (input.output_format !== undefined) updates.output_format = input.output_format
  if (input.recipients !== undefined) updates.recipients = input.recipients
  if (input.email_subject !== undefined) updates.email_subject = input.email_subject
  if (input.email_body !== undefined) updates.email_body = input.email_body
  if (input.project_id !== undefined) updates.project_id = input.project_id
  if (input.is_active !== undefined) updates.is_active = input.is_active

  const { data, error } = await supabaseUntyped
    .from('scheduled_reports')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logger.error('[ReportBuilder] Error updating scheduled report:', error)
    throw error
  }

  return data
}

/**
 * Delete a scheduled report
 */
export async function deleteScheduledReport(id: string): Promise<void> {
  const { error } = await supabaseUntyped
    .from('scheduled_reports')
    .delete()
    .eq('id', id)

  if (error) {
    logger.error('[ReportBuilder] Error deleting scheduled report:', error)
    throw error
  }
}

/**
 * Toggle scheduled report active status
 */
export async function toggleScheduledReportActive(id: string, isActive: boolean): Promise<ScheduledReport> {
  return updateScheduledReport(id, { is_active: isActive })
}

// ============================================================================
// Generated Reports
// ============================================================================

/**
 * Get all generated reports with optional filters
 */
export async function getGeneratedReports(filters: GeneratedReportFilters = {}): Promise<GeneratedReport[]> {
  let query = supabaseUntyped
    .from('generated_reports')
    .select(`
      *,
      template:report_templates(id, name),
      project:projects(id, name),
      generator:users!generated_by(id, full_name, email)
    `)
    .order('created_at', { ascending: false })

  if (filters.company_id) {
    query = query.eq('company_id', filters.company_id)
  }

  if (filters.template_id) {
    query = query.eq('template_id', filters.template_id)
  }

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.data_source) {
    query = query.eq('data_source', filters.data_source)
  }

  if (filters.generated_by) {
    query = query.eq('generated_by', filters.generated_by)
  }

  if (filters.is_scheduled !== undefined) {
    query = query.eq('is_scheduled', filters.is_scheduled)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from)
  }

  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to)
  }

  const { data, error } = await query.limit(100)

  if (error) {
    logger.error('[ReportBuilder] Error fetching generated reports:', error)
    throw error
  }

  return data || []
}

/**
 * Get a single generated report
 */
export async function getGeneratedReport(id: string): Promise<GeneratedReport | null> {
  const { data, error } = await supabaseUntyped
    .from('generated_reports')
    .select(`
      *,
      template:report_templates(id, name),
      project:projects(id, name),
      generator:users!generated_by(id, full_name, email)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    logger.error('[ReportBuilder] Error fetching generated report:', error)
    throw error
  }

  return data
}

/**
 * Create a generated report record (when generating a report)
 */
export async function createGeneratedReport(input: GenerateReportDTO & { report_name: string }): Promise<GeneratedReport> {
  const { data: authData } = await supabaseUntyped.auth.getUser()
  const userId = authData?.user?.id

  const { data, error } = await supabaseUntyped
    .from('generated_reports')
    .insert({
      template_id: input.template_id,
      company_id: input.company_id,
      report_name: input.report_name,
      data_source: input.data_source,
      generated_by: userId,
      is_scheduled: false,
      output_format: input.output_format,
      project_id: input.project_id,
      date_from: input.date_from,
      date_to: input.date_to,
      filters_applied: {
        fields: input.fields,
        filters: input.filters,
        sorting: input.sorting,
        grouping: input.grouping,
      },
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    logger.error('[ReportBuilder] Error creating generated report:', error)
    throw error
  }

  return data
}

/**
 * Update generated report status and file info
 */
export async function updateGeneratedReportStatus(
  id: string,
  status: 'generating' | 'completed' | 'failed',
  details?: {
    file_url?: string
    file_size_bytes?: number
    row_count?: number
    execution_time_ms?: number
    error_message?: string
  }
): Promise<GeneratedReport> {
  const { data, error } = await supabaseUntyped
    .from('generated_reports')
    .update({
      status,
      ...details,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logger.error('[ReportBuilder] Error updating generated report:', error)
    throw error
  }

  return data
}

// ============================================================================
// Field Definitions
// ============================================================================

/**
 * Get all field definitions for a data source
 */
export async function getFieldDefinitions(dataSource: ReportDataSource): Promise<ReportFieldDefinition[]> {
  const { data, error } = await supabaseUntyped
    .from('report_field_definitions')
    .select('*')
    .eq('data_source', dataSource)
    .order('display_order', { ascending: true })

  if (error) {
    logger.error('[ReportBuilder] Error fetching field definitions:', error)
    throw error
  }

  return data || []
}

/**
 * Get all field definitions for multiple data sources
 */
export async function getAllFieldDefinitions(): Promise<Record<ReportDataSource, ReportFieldDefinition[]>> {
  const { data, error } = await supabaseUntyped
    .from('report_field_definitions')
    .select('*')
    .order('data_source', { ascending: true })
    .order('display_order', { ascending: true })

  if (error) {
    logger.error('[ReportBuilder] Error fetching all field definitions:', error)
    throw error
  }

  // Group by data source
  const grouped: Record<ReportDataSource, ReportFieldDefinition[]> = {} as Record<ReportDataSource, ReportFieldDefinition[]>
  for (const field of data || []) {
    if (!grouped[field.data_source as ReportDataSource]) {
      grouped[field.data_source as ReportDataSource] = []
    }
    grouped[field.data_source as ReportDataSource].push(field)
  }

  return grouped
}

/**
 * Get default fields for a data source
 */
export async function getDefaultFields(dataSource: ReportDataSource): Promise<ReportFieldDefinition[]> {
  const { data, error } = await supabaseUntyped
    .from('report_field_definitions')
    .select('*')
    .eq('data_source', dataSource)
    .eq('is_default', true)
    .order('display_order', { ascending: true })

  if (error) {
    logger.error('[ReportBuilder] Error fetching default fields:', error)
    throw error
  }

  return data || []
}

// ============================================================================
// Export API object
// ============================================================================

export const reportBuilderApi = {
  // Templates
  getReportTemplates,
  getReportTemplate,
  createReportTemplate,
  updateReportTemplate,
  deleteReportTemplate,
  duplicateReportTemplate,

  // Template config
  setTemplateFields,
  setTemplateFilters,
  setTemplateSorting,
  setTemplateGrouping,

  // Scheduled reports
  getScheduledReports,
  getScheduledReport,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  toggleScheduledReportActive,

  // Generated reports
  getGeneratedReports,
  getGeneratedReport,
  createGeneratedReport,
  updateGeneratedReportStatus,

  // Field definitions
  getFieldDefinitions,
  getAllFieldDefinitions,
  getDefaultFields,
}
