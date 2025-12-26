/**
 * Template Service - Save and apply workforce/equipment templates
 * Enables quick data entry by reusing common configurations
 */

import { supabase } from '@/lib/supabase';
import type {
  DailyReportTemplate,
  WorkforceEntryV2,
  EquipmentEntryV2,
} from '@/types/daily-reports-v2';
import { logger } from '../../../lib/utils/logger';


/**
 * Get all templates for a project
 */
export async function getTemplatesForProject(projectId: string): Promise<DailyReportTemplate[]> {
  const { data, error } = await (supabase as any)
    .from('daily_report_templates')
    .select('*')
    .or(`project_id.eq.${projectId},is_global.eq.true`)
    .order('name');

  if (error) {
    logger.error('Failed to fetch templates:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single template by ID
 */
export async function getTemplate(templateId: string): Promise<DailyReportTemplate | null> {
  const { data, error } = await (supabase as any)
    .from('daily_report_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    logger.error('Failed to fetch template:', error);
    return null;
  }

  return data;
}

/**
 * Create a new template
 */
export async function createTemplate(
  template: Omit<DailyReportTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<DailyReportTemplate> {
  const { data, error } = await (supabase as any)
    .from('daily_report_templates')
    .insert(template)
    .select()
    .single();

  if (error) {
    logger.error('Failed to create template:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing template
 */
export async function updateTemplate(
  templateId: string,
  updates: Partial<Omit<DailyReportTemplate, 'id' | 'created_at' | 'created_by'>>
): Promise<DailyReportTemplate> {
  const { data, error } = await (supabase as any)
    .from('daily_report_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update template:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a template
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('daily_report_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    logger.error('Failed to delete template:', error);
    throw error;
  }
}

/**
 * Create template from current report data
 */
export async function createTemplateFromReport(
  name: string,
  projectId: string,
  workforce: WorkforceEntryV2[],
  equipment: EquipmentEntryV2[],
  isGlobal: boolean = false
): Promise<DailyReportTemplate> {
  // Strip IDs and daily_report_id from entries for template
  const workforceData = workforce.map((w) => ({
    entry_type: w.entry_type,
    company_name: w.company_name,
    team_name: w.team_name,
    trade: w.trade,
    worker_count: w.worker_count,
    hours_worked: w.hours_worked,
    work_area: w.work_area,
    cost_code: w.cost_code,
  }));

  const equipmentData = equipment.map((e) => ({
    equipment_type: e.equipment_type,
    equipment_id: e.equipment_id,
    owner_type: e.owner_type,
    hours_used: e.hours_used,
    operator_name: e.operator_name,
    work_area: e.work_area,
    cost_code: e.cost_code,
  }));

  return createTemplate({
    name,
    project_id: projectId,
    is_default: isGlobal,
    workforce_template: workforceData,
    equipment_template: equipmentData,
  } as any);
}

/**
 * Apply template to get workforce and equipment entries
 */
export function applyTemplate(template: DailyReportTemplate): {
  workforce: Partial<WorkforceEntryV2>[];
  equipment: Partial<EquipmentEntryV2>[];
} {
  const workforce = (template.workforce_template || []).map((w: Partial<WorkforceEntryV2>) => ({
    entry_type: w.entry_type || 'company_crew',
    company_name: w.company_name,
    team_name: w.team_name,
    trade: w.trade,
    worker_count: w.worker_count,
    hours_worked: w.hours_worked || 8,
    work_area: w.work_area,
    cost_code: w.cost_code,
  }));

  const equipment = (template.equipment_template || []).map((e: Partial<EquipmentEntryV2>) => ({
    equipment_type: e.equipment_type,
    equipment_id: e.equipment_id,
    owner_type: e.owner_type || 'owned',
    hours_used: e.hours_used || 8,
    operator_name: e.operator_name,
    work_area: e.work_area,
    cost_code: e.cost_code,
  }));

  return { workforce, equipment };
}

/**
 * Get suggested templates based on recent usage
 */
export async function getSuggestedTemplates(
  projectId: string,
  limit: number = 5
): Promise<DailyReportTemplate[]> {
  // Get templates ordered by last used date
  const { data, error } = await (supabase as any)
    .from('daily_report_templates')
    .select('*')
    .or(`project_id.eq.${projectId},is_default.eq.true`)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Failed to fetch suggested templates:', error);
    return [];
  }

  return data || [];
}

/**
 * Copy workforce data from previous day's report
 */
export async function getWorkforceFromPreviousDay(
  projectId: string,
  currentDate: string
): Promise<Partial<WorkforceEntryV2>[]> {
  // Get the previous day's date
  const prevDate = new Date(currentDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = prevDate.toISOString().split('T')[0];

  // Find the previous day's report
  const { data: report, error: reportError } = await (supabase
    .from('daily_reports') as any)
    .select('id')
    .eq('project_id', projectId)
    .eq('report_date', prevDateStr)
    .single();

  if (reportError || !report) {
    return [];
  }

  // Get workforce entries from that report
  const { data: workforce, error: workforceError } = await (supabase
    .from('daily_report_workforce') as any)
    .select('*')
    .eq('daily_report_id', report.id);

  if (workforceError || !workforce) {
    return [];
  }

  // Return entries without IDs
  return workforce.map((w: Record<string, unknown>) => ({
    entry_type: (w.entry_type as string) || 'company_crew',
    company_name: w.company_name as string | undefined,
    team_name: w.team_name as string | undefined,
    trade: w.trade as string | undefined,
    worker_count: w.worker_count as number | undefined,
    hours_worked: (w.hours_worked as number) || 8,
    work_area: w.work_area as string | undefined,
    cost_code: w.cost_code as string | undefined,
    phase_code: w.phase_code as string | undefined,
    foreman_name: w.foreman_name as string | undefined,
  }));
}

/**
 * Copy equipment data from previous day's report
 */
export async function getEquipmentFromPreviousDay(
  projectId: string,
  currentDate: string
): Promise<Partial<EquipmentEntryV2>[]> {
  // Get the previous day's date
  const prevDate = new Date(currentDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = prevDate.toISOString().split('T')[0];

  // Find the previous day's report
  const { data: report, error: reportError } = await (supabase
    .from('daily_reports') as any)
    .select('id')
    .eq('project_id', projectId)
    .eq('report_date', prevDateStr)
    .single();

  if (reportError || !report) {
    return [];
  }

  // Get equipment entries from that report
  const { data: equipment, error: equipmentError } = await (supabase
    .from('daily_report_equipment') as any)
    .select('*')
    .eq('daily_report_id', report.id);

  if (equipmentError || !equipment) {
    return [];
  }

  // Return entries without IDs
  return equipment.map((e: Record<string, unknown>) => ({
    equipment_type: e.equipment_type as string | undefined,
    equipment_id: e.equipment_id as string | undefined,
    owner_type: (e.owner_type as string) || 'owned',
    rental_company: e.rental_company as string | undefined,
    hours_used: (e.hours_used as number) || 8,
    operator_name: e.operator_name as string | undefined,
    work_area: e.work_area as string | undefined,
    cost_code: e.cost_code as string | undefined,
  }));
}

/**
 * Get all data from previous day's report
 */
export async function copyFromPreviousDay(
  projectId: string,
  currentDate: string
): Promise<{
  workforce: Partial<WorkforceEntryV2>[];
  equipment: Partial<EquipmentEntryV2>[];
} | null> {
  const [workforce, equipment] = await Promise.all([
    getWorkforceFromPreviousDay(projectId, currentDate),
    getEquipmentFromPreviousDay(projectId, currentDate),
  ]);

  if (workforce.length === 0 && equipment.length === 0) {
    return null;
  }

  return { workforce, equipment };
}
