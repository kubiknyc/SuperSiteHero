// Report template service - save and load common report configurations
import { supabase } from '@/lib/supabase'
import type { DraftReport, WorkforceEntry, EquipmentEntry } from '../store/offlineReportStore'
import { logger } from '../../../lib/utils/logger';


export interface ReportTemplate {
  id: string
  name: string
  description?: string
  project_id: string
  created_by: string
  created_at: string
  updated_at: string
  // Template data
  weather_defaults?: {
    weather_condition?: string
  }
  workforce_entries?: Omit<WorkforceEntry, 'id'>[]
  equipment_entries?: Omit<EquipmentEntry, 'id'>[]
  default_notes?: {
    work_planned?: string
    observations?: string
  }
}

export interface CreateTemplateInput {
  name: string
  description?: string
  project_id: string
  weather_defaults?: ReportTemplate['weather_defaults']
  workforce_entries?: ReportTemplate['workforce_entries']
  equipment_entries?: ReportTemplate['equipment_entries']
  default_notes?: ReportTemplate['default_notes']
}

// Save current report configuration as a template
// Note: daily_report_templates table may not exist in generated types but exists in database
export async function saveReportTemplate(
  input: CreateTemplateInput,
  userId: string
): Promise<ReportTemplate> {
  const { data, error } = await (supabase as any)
    .from('daily_report_templates')
    .insert({
      name: input.name,
      description: input.description,
      project_id: input.project_id,
      created_by: userId,
      template_data: {
        weather_defaults: input.weather_defaults,
        workforce_entries: input.workforce_entries,
        equipment_entries: input.equipment_entries,
        default_notes: input.default_notes,
      },
    })
    .select()
    .single()

  if (error) {
    // If table doesn't exist, fall back to localStorage
    logger.warn('Template table not found, using localStorage:', error.message)
    return saveTemplateToLocalStorage(input, userId)
  }

  return mapTemplateFromDB(data)
}

// Fallback to localStorage if database table doesn't exist
function saveTemplateToLocalStorage(
  input: CreateTemplateInput,
  userId: string
): ReportTemplate {
  const templates = getTemplatesFromLocalStorage()
  const newTemplate: ReportTemplate = {
    id: crypto.randomUUID(),
    name: input.name,
    description: input.description,
    project_id: input.project_id,
    created_by: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    weather_defaults: input.weather_defaults,
    workforce_entries: input.workforce_entries,
    equipment_entries: input.equipment_entries,
    default_notes: input.default_notes,
  }

  templates.push(newTemplate)
  localStorage.setItem('daily_report_templates', JSON.stringify(templates))
  return newTemplate
}

function getTemplatesFromLocalStorage(): ReportTemplate[] {
  try {
    const stored = localStorage.getItem('daily_report_templates')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Get templates for a project
// Note: daily_report_templates table may not exist in generated types but exists in database
export async function getProjectTemplates(projectId: string): Promise<ReportTemplate[]> {
  const { data, error } = await (supabase as any)
    .from('daily_report_templates')
    .select('*')
    .eq('project_id', projectId)
    .order('name')

  if (error) {
    // Fall back to localStorage
    logger.warn('Using localStorage templates:', error.message)
    return getTemplatesFromLocalStorage().filter((t) => t.project_id === projectId)
  }

  return (data || []).map(mapTemplateFromDB)
}

// Delete a template
// Note: daily_report_templates table may not exist in generated types but exists in database
export async function deleteTemplate(templateId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('daily_report_templates')
    .delete()
    .eq('id', templateId)

  if (error) {
    // Fall back to localStorage
    const templates = getTemplatesFromLocalStorage()
    const filtered = templates.filter((t) => t.id !== templateId)
    localStorage.setItem('daily_report_templates', JSON.stringify(filtered))
    return
  }
}

// Apply template to draft report
export function applyTemplate(
  template: ReportTemplate
): {
  draftUpdates: Partial<DraftReport>
  workforce: WorkforceEntry[]
  equipment: EquipmentEntry[]
} {
  const generateId = () => crypto.randomUUID()

  return {
    draftUpdates: {
      weather_condition: template.weather_defaults?.weather_condition,
      work_planned: template.default_notes?.work_planned,
      observations: template.default_notes?.observations,
    },
    workforce: (template.workforce_entries || []).map((entry) => ({
      ...entry,
      id: generateId(),
    })),
    equipment: (template.equipment_entries || []).map((entry) => ({
      ...entry,
      id: generateId(),
    })),
  }
}

// Create template from current report
export function createTemplateFromReport(
  draft: DraftReport,
  workforce: WorkforceEntry[],
  equipment: EquipmentEntry[],
  name: string,
  description?: string
): CreateTemplateInput {
  return {
    name,
    description,
    project_id: draft.project_id,
    weather_defaults: {
      weather_condition: draft.weather_condition,
    },
    workforce_entries: workforce.map(({ id: _id, ...entry }) => entry),
    equipment_entries: equipment.map(({ id: _id, ...entry }) => entry),
    default_notes: {
      work_planned: draft.work_planned,
      observations: draft.observations,
    },
  }
}

// Helper to map database record to template
function mapTemplateFromDB(record: Record<string, unknown>): ReportTemplate {
  const templateData = (record.template_data || {}) as Record<string, unknown>

  return {
    id: record.id as string,
    name: record.name as string,
    description: record.description as string | undefined,
    project_id: record.project_id as string,
    created_by: record.created_by as string,
    created_at: record.created_at as string,
    updated_at: record.updated_at as string,
    weather_defaults: templateData.weather_defaults as ReportTemplate['weather_defaults'],
    workforce_entries: templateData.workforce_entries as ReportTemplate['workforce_entries'],
    equipment_entries: templateData.equipment_entries as ReportTemplate['equipment_entries'],
    default_notes: templateData.default_notes as ReportTemplate['default_notes'],
  }
}
