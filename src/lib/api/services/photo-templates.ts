/**
 * Photo Templates API Service
 * Handles photo location templates, requirements, and progress series
 *
 * NOTE: Uses type assertions for new tables until migration 089 is applied
 * and Supabase types are regenerated.
 */

import { supabase } from '../../supabase';
import type {
  PhotoLocationTemplate,
  PhotoLocationTemplateInsert,
  PhotoLocationTemplateUpdate,
  PhotoRequirement,
  PhotoRequirementWithTemplate,
  PhotoRequirementFilters,
  PhotoTemplateFilters,
  PhotoProgressSeries,
  PhotoProgressSeriesInsert,
  PhotoCompletionStats,
  DailyPhotoChecklist,
  LocationProgressTimeline,
  GenerateRequirementsResponse,
} from '../../../types/photo-templates';

type AnySupabaseQuery = any;

// Helper to access tables that may not be in the generated types yet
function fromTable(tableName: string): AnySupabaseQuery {
  return (supabase as any).from(tableName);
}

function callRpc(fnName: string, params?: Record<string, unknown>): AnySupabaseQuery {
  return (supabase as any).rpc(fnName, params);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
}

function toCamelCase<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result as T;
}

function transformTemplate(row: Record<string, unknown>): PhotoLocationTemplate {
  return toCamelCase<PhotoLocationTemplate>(row);
}

function transformRequirement(row: Record<string, unknown>): PhotoRequirement {
  const requirement = toCamelCase<PhotoRequirement>(row);
  if (row.template) {
    requirement.template = transformTemplate(row.template as Record<string, unknown>);
  }
  return requirement;
}

// ============================================================================
// PHOTO LOCATION TEMPLATES
// ============================================================================

export async function getPhotoTemplates(
  filters: PhotoTemplateFilters
): Promise<PhotoLocationTemplate[]> {
  let query = fromTable('photo_location_templates')
    .select('*')
    .eq('project_id', filters.projectId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if (filters.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }
  if (filters.isRequired !== undefined) {
    query = query.eq('is_required', filters.isRequired);
  }
  if (filters.frequency) {
    query = query.eq('frequency', filters.frequency);
  }
  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  const { data, error } = await query;
  if (error) {throw error;}
  return ((data as Record<string, unknown>[]) || []).map(transformTemplate);
}

export async function getPhotoTemplate(id: string): Promise<PhotoLocationTemplate | null> {
  const { data, error } = await fromTable('photo_location_templates')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {return null;}
    throw error;
  }
  return transformTemplate(data as Record<string, unknown>);
}

export async function createPhotoTemplate(
  template: PhotoLocationTemplateInsert
): Promise<PhotoLocationTemplate> {
  const { data: user } = await supabase.auth.getUser();

  const insertData = {
    ...toSnakeCase(template as unknown as Record<string, unknown>),
    created_by: user?.user?.id,
  };

  const { data, error } = await fromTable('photo_location_templates')
    .insert(insertData)
    .select()
    .single();

  if (error) {throw error;}
  return transformTemplate(data as Record<string, unknown>);
}

export async function updatePhotoTemplate(
  id: string,
  updates: PhotoLocationTemplateUpdate
): Promise<PhotoLocationTemplate> {
  const { data, error } = await fromTable('photo_location_templates')
    .update(toSnakeCase(updates as unknown as Record<string, unknown>))
    .eq('id', id)
    .select()
    .single();

  if (error) {throw error;}
  return transformTemplate(data as Record<string, unknown>);
}

export async function deletePhotoTemplate(id: string): Promise<void> {
  const { error } = await fromTable('photo_location_templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {throw error;}
}

export async function reorderPhotoTemplates(
  projectId: string,
  templateIds: string[]
): Promise<void> {
  const updates = templateIds.map((id, index) => ({
    id,
    sort_order: index,
  }));

  for (const update of updates) {
    const { error } = await fromTable('photo_location_templates')
      .update({ sort_order: update.sort_order })
      .eq('id', update.id)
      .eq('project_id', projectId);

    if (error) {throw error;}
  }
}

// ============================================================================
// PHOTO REQUIREMENTS
// ============================================================================

export async function getPhotoRequirements(
  filters: PhotoRequirementFilters
): Promise<PhotoRequirement[] | PhotoRequirementWithTemplate[]> {
  const selectQuery = filters.includeTemplate
    ? '*, template:photo_location_templates(*)'
    : '*';

  let query = fromTable('photo_requirements')
    .select(selectQuery)
    .eq('project_id', filters.projectId)
    .order('due_date', { ascending: true });

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }
  if (filters.templateId) {
    query = query.eq('template_id', filters.templateId);
  }
  if (filters.startDate) {
    query = query.gte('due_date', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('due_date', filters.endDate);
  }

  const { data, error } = await query;
  if (error) {throw error;}
  return ((data as Record<string, unknown>[]) || []).map(transformRequirement);
}

export async function getPhotoRequirement(id: string): Promise<PhotoRequirementWithTemplate | null> {
  const { data, error } = await fromTable('photo_requirements')
    .select('*, template:photo_location_templates(*)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {return null;}
    throw error;
  }
  return transformRequirement(data as Record<string, unknown>) as PhotoRequirementWithTemplate;
}

export async function generateDailyRequirements(
  projectId: string,
  date?: string
): Promise<GenerateRequirementsResponse> {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const { data, error } = await callRpc('generate_photo_requirements', {
    p_project_id: projectId,
    p_date: targetDate,
  });

  if (error) {throw error;}
  return {
    generated: (data as number) || 0,
    date: targetDate,
  };
}

export async function completePhotoRequirement(
  requirementId: string,
  photoId: string
): Promise<PhotoRequirement> {
  const { data: user } = await supabase.auth.getUser();

  const { error } = await callRpc('complete_photo_requirement', {
    p_requirement_id: requirementId,
    p_photo_id: photoId,
    p_user_id: user?.user?.id,
  });

  if (error) {throw error;}

  // Fetch updated requirement
  const requirement = await getPhotoRequirement(requirementId);
  if (!requirement) {throw new Error('Requirement not found after completion');}

  return requirement;
}

export async function skipPhotoRequirement(
  requirementId: string,
  reason: string
): Promise<PhotoRequirement> {
  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await fromTable('photo_requirements')
    .update({
      status: 'skipped',
      skip_reason: reason,
      skipped_by: user?.user?.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requirementId)
    .select()
    .single();

  if (error) {throw error;}
  return transformRequirement(data as Record<string, unknown>);
}

export async function reviewPhotoRequirement(
  requirementId: string,
  reviewStatus: 'approved' | 'rejected' | 'needs_retake',
  notes?: string
): Promise<PhotoRequirement> {
  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await fromTable('photo_requirements')
    .update({
      review_status: reviewStatus,
      reviewed_by: user?.user?.id,
      reviewed_at: new Date().toISOString(),
      review_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requirementId)
    .select()
    .single();

  if (error) {throw error;}
  return transformRequirement(data as Record<string, unknown>);
}

// ============================================================================
// STATISTICS
// ============================================================================

export async function getPhotoCompletionStats(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<PhotoCompletionStats> {
  const { data, error } = await callRpc('get_photo_completion_stats', {
    p_project_id: projectId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {throw error;}

  const rows = data as Array<{
    total_required: number;
    completed: number;
    missed: number;
    pending: number;
    completion_rate: number;
  }> | null;

  const row = rows?.[0] || {
    total_required: 0,
    completed: 0,
    missed: 0,
    pending: 0,
    completion_rate: 0,
  };

  return {
    totalRequired: row.total_required,
    completed: row.completed,
    missed: row.missed,
    pending: row.pending,
    completionRate: row.completion_rate,
  };
}

export async function getDailyPhotoChecklist(
  projectId: string,
  date?: string
): Promise<DailyPhotoChecklist> {
  const targetDate = date || new Date().toISOString().split('T')[0];

  // First ensure requirements are generated for this date
  await generateDailyRequirements(projectId, targetDate);

  // Get requirements for the day
  const requirements = (await getPhotoRequirements({
    projectId,
    startDate: targetDate,
    endDate: targetDate,
    includeTemplate: true,
  })) as PhotoRequirementWithTemplate[];

  const today = new Date().toISOString().split('T')[0];
  const stats = {
    total: requirements.length,
    completed: requirements.filter((r) => r.status === 'completed').length,
    pending: requirements.filter((r) => r.status === 'pending').length,
    overdue: requirements.filter(
      (r) => r.status === 'pending' && r.dueDate < today
    ).length,
  };

  return {
    date: targetDate,
    projectId,
    requirements,
    stats,
  };
}

// ============================================================================
// PHOTO PROGRESS SERIES
// ============================================================================

export async function getProgressSeries(projectId: string): Promise<PhotoProgressSeries[]> {
  const { data, error } = await fromTable('photo_progress_series')
    .select('*')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {throw error;}
  return ((data as Record<string, unknown>[]) || []).map((row) => toCamelCase<PhotoProgressSeries>(row));
}

export async function createProgressSeries(
  series: PhotoProgressSeriesInsert
): Promise<PhotoProgressSeries> {
  const { data: user } = await supabase.auth.getUser();

  const insertData = {
    ...toSnakeCase(series as unknown as Record<string, unknown>),
    created_by: user?.user?.id,
  };

  const { data, error } = await fromTable('photo_progress_series')
    .insert(insertData)
    .select()
    .single();

  if (error) {throw error;}
  return toCamelCase<PhotoProgressSeries>(data as Record<string, unknown>);
}

export async function addPhotoToSeries(seriesId: string, photoId: string): Promise<void> {
  const { data: series } = await fromTable('photo_progress_series')
    .select('photo_ids')
    .eq('id', seriesId)
    .single();

  if (!series) {throw new Error('Series not found');}

  const seriesData = series as { photo_ids?: string[] };
  const photoIds = [...(seriesData.photo_ids || []), photoId];

  const { error } = await fromTable('photo_progress_series')
    .update({ photo_ids: photoIds })
    .eq('id', seriesId);

  if (error) {throw error;}
}

export async function getLocationProgressTimeline(
  projectId: string,
  templateId: string
): Promise<LocationProgressTimeline> {
  // Get template info
  const template = await getPhotoTemplate(templateId);
  if (!template) {throw new Error('Template not found');}

  // Get all completed requirements for this template
  const requirements = (await getPhotoRequirements({
    projectId,
    templateId,
    status: 'completed',
    includeTemplate: false,
  })) as PhotoRequirement[];

  // Get photo details for each completed requirement
  const photoIds = requirements.flatMap((r) => r.completedPhotoIds);

  let entries: {
    date: string;
    photoId: string;
    photoUrl: string;
    thumbnailUrl?: string;
    caption?: string;
    templateName: string;
  }[] = [];

  if (photoIds.length > 0) {
    const { data: photos } = await supabase
      .from('photos')
      .select('id, file_url, thumbnail_url, caption, captured_at, created_at')
      .in('id', photoIds)
      .order('captured_at', { ascending: true });

    entries =
      photos?.filter((photo) => (photo.captured_at || photo.created_at) !== null).map((photo) => ({
        date: (photo.captured_at || photo.created_at) as string,
        photoId: photo.id,
        photoUrl: photo.file_url,
        thumbnailUrl: photo.thumbnail_url ?? undefined,
        caption: photo.caption ?? undefined,
        templateName: template.name,
      })) || [];
  }

  return {
    templateId,
    templateName: template.name,
    location: {
      building: template.building,
      floor: template.floor,
      area: template.area,
    },
    entries,
    firstPhoto: entries[0]?.date,
    lastPhoto: entries[entries.length - 1]?.date,
    totalPhotos: entries.length,
  };
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export async function markOverdueRequirements(): Promise<number> {
  const { data, error } = await callRpc('mark_overdue_photo_requirements');
  if (error) {throw error;}
  return (data as number) || 0;
}

export async function duplicateTemplate(
  templateId: string,
  newName: string
): Promise<PhotoLocationTemplate> {
  const original = await getPhotoTemplate(templateId);
  if (!original) {throw new Error('Template not found');}

  const { id, createdAt, updatedAt, createdBy, deletedAt, ...rest } = original;

  return createPhotoTemplate({
    ...rest,
    name: newName,
  } as PhotoLocationTemplateInsert);
}

export async function bulkCreateTemplates(
  templates: PhotoLocationTemplateInsert[]
): Promise<PhotoLocationTemplate[]> {
  const { data: user } = await supabase.auth.getUser();

  const insertData = templates.map((template) => ({
    ...toSnakeCase(template as unknown as Record<string, unknown>),
    created_by: user?.user?.id,
  }));

  const { data, error } = await fromTable('photo_location_templates')
    .insert(insertData)
    .select();

  if (error) {throw error;}
  return ((data as Record<string, unknown>[]) || []).map(transformTemplate);
}
