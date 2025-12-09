/**
 * Drawing Register API Service
 * Handles drawings, revisions, sets, and transmittal history
 *
 * NOTE: Uses type assertions for new tables until migration 091 is applied
 * and Supabase types are regenerated.
 */

import { supabase } from '../../supabase';
import type {
  Drawing,
  DrawingInsert,
  DrawingUpdate,
  DrawingRevision,
  DrawingRevisionInsert,
  DrawingRevisionUpdate,
  DrawingSet,
  DrawingSetInsert,
  DrawingSetItem,
  DrawingSetItemInsert,
  DrawingTransmittal,
  DrawingTransmittalInsert,
  DrawingMarkup,
  DrawingMarkupInsert,
  DrawingMarkupUpdate,
  DrawingFilters,
  DrawingRegisterEntry,
  DisciplineSummary,
  RevisionHistoryEntry,
} from '../../../types/drawing';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseQuery = any;

// Helper to access tables that may not be in the generated types yet
function fromTable(tableName: string): AnySupabaseQuery {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from(tableName);
}

function callRpc(fnName: string, params?: Record<string, unknown>): AnySupabaseQuery {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

function transformDrawing(row: Record<string, unknown>): Drawing {
  return toCamelCase<Drawing>(row);
}

function transformRevision(row: Record<string, unknown>): DrawingRevision {
  return toCamelCase<DrawingRevision>(row);
}

function transformSet(row: Record<string, unknown>): DrawingSet {
  const set = toCamelCase<DrawingSet>(row);
  if (row.items && Array.isArray(row.items)) {
    set.items = (row.items as Record<string, unknown>[]).map((item) => toCamelCase<DrawingSetItem>(item));
  }
  return set;
}

// ============================================================================
// DRAWINGS
// ============================================================================

export async function getDrawings(filters: DrawingFilters): Promise<Drawing[]> {
  let query = fromTable('drawings')
    .select('*')
    .eq('project_id', filters.projectId)
    .is('deleted_at', null)
    .order('discipline', { ascending: true })
    .order('drawing_number', { ascending: true });

  if (filters.discipline) {
    query = query.eq('discipline', filters.discipline);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.isIssuedForConstruction !== undefined) {
    query = query.eq('is_issued_for_construction', filters.isIssuedForConstruction);
  }
  if (filters.specSection) {
    query = query.eq('spec_section', filters.specSection);
  }
  if (filters.search) {
    query = query.or(`drawing_number.ilike.%${filters.search}%,title.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data as Record<string, unknown>[]) || []).map(transformDrawing);
}

export async function getDrawing(id: string): Promise<Drawing | null> {
  const { data, error } = await fromTable('drawings')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return transformDrawing(data as Record<string, unknown>);
}

export async function getDrawingWithRevisions(id: string): Promise<Drawing & { revisions: DrawingRevision[] }> {
  const [drawing, revisions] = await Promise.all([
    getDrawing(id),
    getDrawingRevisions(id),
  ]);

  if (!drawing) throw new Error('Drawing not found');

  return {
    ...drawing,
    revisions,
  };
}

export async function createDrawing(drawing: DrawingInsert): Promise<Drawing> {
  const { data: user } = await supabase.auth.getUser();

  const insertData = {
    ...toSnakeCase(drawing as unknown as Record<string, unknown>),
    created_by: user?.user?.id,
  };

  const { data, error } = await fromTable('drawings')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return transformDrawing(data as Record<string, unknown>);
}

export async function updateDrawing(id: string, updates: DrawingUpdate): Promise<Drawing> {
  const { data, error } = await fromTable('drawings')
    .update(toSnakeCase(updates as unknown as Record<string, unknown>))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return transformDrawing(data as Record<string, unknown>);
}

export async function deleteDrawing(id: string): Promise<void> {
  const { error } = await fromTable('drawings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function markDrawingIFC(id: string, ifcDate?: string): Promise<Drawing> {
  const { data, error } = await fromTable('drawings')
    .update({
      is_issued_for_construction: true,
      ifc_date: ifcDate || new Date().toISOString().split('T')[0],
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return transformDrawing(data as Record<string, unknown>);
}

// ============================================================================
// DRAWING REVISIONS
// ============================================================================

export async function getDrawingRevisions(drawingId: string): Promise<DrawingRevision[]> {
  const { data, error } = await fromTable('drawing_revisions')
    .select('*, created_by_user:users(full_name)')
    .eq('drawing_id', drawingId)
    .order('revision_date', { ascending: false })
    .order('revision', { ascending: false });

  if (error) throw error;

  return ((data as Record<string, unknown>[]) || []).map((row) => {
    const revision = transformRevision(row);
    if (row.created_by_user) {
      const userData = row.created_by_user as { full_name?: string };
      revision.createdByName = userData.full_name;
    }
    return revision;
  });
}

export async function getCurrentRevision(drawingId: string): Promise<DrawingRevision | null> {
  const { data, error } = await fromTable('drawing_revisions')
    .select('*')
    .eq('drawing_id', drawingId)
    .eq('is_current', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return transformRevision(data as Record<string, unknown>);
}

export async function createRevision(revision: DrawingRevisionInsert): Promise<DrawingRevision> {
  const { data: user } = await supabase.auth.getUser();

  const insertData = {
    ...toSnakeCase(revision as unknown as Record<string, unknown>),
    created_by: user?.user?.id,
    is_current: revision.isCurrent ?? true, // New revisions are current by default
  };

  const { data, error } = await fromTable('drawing_revisions')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return transformRevision(data as Record<string, unknown>);
}

export async function updateRevision(id: string, updates: DrawingRevisionUpdate): Promise<DrawingRevision> {
  const { data, error } = await fromTable('drawing_revisions')
    .update(toSnakeCase(updates as unknown as Record<string, unknown>))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return transformRevision(data as Record<string, unknown>);
}

export async function setCurrentRevision(revisionId: string): Promise<DrawingRevision> {
  const { data, error } = await fromTable('drawing_revisions')
    .update({ is_current: true })
    .eq('id', revisionId)
    .select()
    .single();

  if (error) throw error;
  return transformRevision(data as Record<string, unknown>);
}

// ============================================================================
// DRAWING SETS
// ============================================================================

export async function getDrawingSets(projectId: string): Promise<DrawingSet[]> {
  const { data, error } = await fromTable('drawing_sets')
    .select('*')
    .eq('project_id', projectId)
    .order('set_date', { ascending: false });

  if (error) throw error;
  return ((data as Record<string, unknown>[]) || []).map(transformSet);
}

export async function getDrawingSet(id: string): Promise<DrawingSet | null> {
  const { data, error } = await fromTable('drawing_sets')
    .select(`
      *,
      items:drawing_set_items(
        *,
        drawing:drawings(*),
        revision:drawing_revisions(*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return transformSet(data as Record<string, unknown>);
}

export async function createDrawingSet(set: DrawingSetInsert): Promise<DrawingSet> {
  const { data: user } = await supabase.auth.getUser();

  const insertData = {
    ...toSnakeCase(set as unknown as Record<string, unknown>),
    created_by: user?.user?.id,
  };

  const { data, error } = await fromTable('drawing_sets')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return transformSet(data as Record<string, unknown>);
}

export async function addDrawingToSet(item: DrawingSetItemInsert): Promise<DrawingSetItem> {
  const { data: user } = await supabase.auth.getUser();

  const insertData = {
    ...toSnakeCase(item as unknown as Record<string, unknown>),
    added_by: user?.user?.id,
  };

  const { data, error } = await fromTable('drawing_set_items')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase<DrawingSetItem>(data as Record<string, unknown>);
}

export async function removeDrawingFromSet(setId: string, drawingId: string): Promise<void> {
  const { error } = await fromTable('drawing_set_items')
    .delete()
    .eq('drawing_set_id', setId)
    .eq('drawing_id', drawingId);

  if (error) throw error;
}

export async function setCurrentDrawingSet(setId: string, projectId: string): Promise<void> {
  // First, mark all sets as not current
  await fromTable('drawing_sets')
    .update({ is_current: false })
    .eq('project_id', projectId);

  // Then mark the specified set as current
  const { error } = await fromTable('drawing_sets')
    .update({ is_current: true })
    .eq('id', setId);

  if (error) throw error;
}

// ============================================================================
// DRAWING TRANSMITTALS
// ============================================================================

export async function getDrawingTransmittals(drawingId: string): Promise<DrawingTransmittal[]> {
  const { data, error } = await fromTable('drawing_transmittals')
    .select('*')
    .eq('drawing_id', drawingId)
    .order('transmittal_date', { ascending: false });

  if (error) throw error;
  return ((data as Record<string, unknown>[]) || []).map((row) => toCamelCase<DrawingTransmittal>(row));
}

export async function createDrawingTransmittal(transmittal: DrawingTransmittalInsert): Promise<DrawingTransmittal> {
  const { data: user } = await supabase.auth.getUser();

  const insertData = {
    ...toSnakeCase(transmittal as unknown as Record<string, unknown>),
    created_by: user?.user?.id,
  };

  const { data, error } = await fromTable('drawing_transmittals')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase<DrawingTransmittal>(data as Record<string, unknown>);
}

export async function acknowledgeDrawingTransmittal(id: string, acknowledgedBy: string): Promise<DrawingTransmittal> {
  const { data, error } = await fromTable('drawing_transmittals')
    .update({
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: acknowledgedBy,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase<DrawingTransmittal>(data as Record<string, unknown>);
}

// ============================================================================
// DRAWING MARKUPS
// ============================================================================

export async function getDrawingMarkups(revisionId: string, status?: string): Promise<DrawingMarkup[]> {
  let query = fromTable('drawing_markups')
    .select('*')
    .eq('revision_id', revisionId)
    .order('created_at', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data as Record<string, unknown>[]) || []).map((row) => toCamelCase<DrawingMarkup>(row));
}

export async function createDrawingMarkup(markup: DrawingMarkupInsert): Promise<DrawingMarkup> {
  const { data: user } = await supabase.auth.getUser();

  const insertData = {
    ...toSnakeCase(markup as unknown as Record<string, unknown>),
    created_by: user?.user?.id,
  };

  const { data, error } = await fromTable('drawing_markups')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase<DrawingMarkup>(data as Record<string, unknown>);
}

export async function updateDrawingMarkup(id: string, updates: DrawingMarkupUpdate): Promise<DrawingMarkup> {
  const { data, error } = await fromTable('drawing_markups')
    .update(toSnakeCase(updates as unknown as Record<string, unknown>))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase<DrawingMarkup>(data as Record<string, unknown>);
}

export async function resolveDrawingMarkup(id: string, notes?: string): Promise<DrawingMarkup> {
  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await fromTable('drawing_markups')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: user?.user?.id,
      resolution_notes: notes,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase<DrawingMarkup>(data as Record<string, unknown>);
}

// ============================================================================
// STATISTICS & REPORTING
// ============================================================================

export async function getDrawingRegister(projectId: string): Promise<DrawingRegisterEntry[]> {
  const { data, error } = await callRpc('get_project_drawing_register', {
    p_project_id: projectId,
  });

  if (error) throw error;

  return ((data as Record<string, unknown>[]) || []).map((row) => ({
    id: row.id as string,
    drawingNumber: row.drawing_number as string,
    title: row.title as string,
    discipline: row.discipline as DrawingRegisterEntry['discipline'],
    currentRevision: row.current_revision as string | undefined,
    currentRevisionDate: row.current_revision_date as string | undefined,
    status: row.status as DrawingRegisterEntry['status'],
    isIssuedForConstruction: row.is_issued_for_construction as boolean,
    revisionCount: row.revision_count as number,
    lastTransmittalDate: row.last_transmittal_date as string | undefined,
  }));
}

export async function getDrawingsByDiscipline(projectId: string): Promise<DisciplineSummary[]> {
  const { data, error } = await callRpc('get_drawings_by_discipline', {
    p_project_id: projectId,
  });

  if (error) throw error;

  return ((data as Record<string, unknown>[]) || []).map((row) => ({
    discipline: row.discipline as DisciplineSummary['discipline'],
    totalDrawings: row.total_drawings as number,
    ifcDrawings: row.ifc_drawings as number,
    latestRevisionDate: row.latest_revision_date as string | undefined,
  }));
}

export async function getRevisionHistory(drawingId: string): Promise<RevisionHistoryEntry[]> {
  const { data, error } = await callRpc('get_drawing_revision_history', {
    p_drawing_id: drawingId,
  });

  if (error) throw error;

  return ((data as Record<string, unknown>[]) || []).map((row) => ({
    revision: row.revision as string,
    revisionDate: row.revision_date as string,
    revisionDescription: row.revision_description as string | undefined,
    revisionType: row.revision_type as RevisionHistoryEntry['revisionType'],
    isCurrent: row.is_current as boolean,
    isSuperseded: row.is_superseded as boolean,
    fileUrl: row.file_url as string | undefined,
    createdByName: row.created_by_name as string | undefined,
  }));
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export async function bulkCreateDrawings(drawings: DrawingInsert[]): Promise<Drawing[]> {
  const { data: user } = await supabase.auth.getUser();

  const insertData = drawings.map((drawing) => ({
    ...toSnakeCase(drawing as unknown as Record<string, unknown>),
    created_by: user?.user?.id,
  }));

  const { data, error } = await fromTable('drawings')
    .insert(insertData)
    .select();

  if (error) throw error;
  return ((data as Record<string, unknown>[]) || []).map(transformDrawing);
}

export async function bulkMarkIFC(drawingIds: string[], ifcDate?: string): Promise<void> {
  const { error } = await fromTable('drawings')
    .update({
      is_issued_for_construction: true,
      ifc_date: ifcDate || new Date().toISOString().split('T')[0],
    })
    .in('id', drawingIds);

  if (error) throw error;
}

export async function duplicateDrawing(drawingId: string, newNumber: string): Promise<Drawing> {
  const original = await getDrawing(drawingId);
  if (!original) throw new Error('Drawing not found');

  const { id, createdAt, updatedAt, createdBy, deletedAt, currentRevision, currentRevisionId, currentRevisionDate, ...rest } = original;

  return createDrawing({
    ...rest,
    drawingNumber: newNumber,
    status: 'active',
    isIssuedForConstruction: false,
  });
}

// Export the API object for convenience
export const drawingsApi = {
  // Drawings
  getDrawings,
  getDrawing,
  getDrawingWithRevisions,
  createDrawing,
  updateDrawing,
  deleteDrawing,
  markDrawingIFC,
  bulkCreateDrawings,
  bulkMarkIFC,
  duplicateDrawing,

  // Revisions
  getDrawingRevisions,
  getCurrentRevision,
  createRevision,
  updateRevision,
  setCurrentRevision,

  // Sets
  getDrawingSets,
  getDrawingSet,
  createDrawingSet,
  addDrawingToSet,
  removeDrawingFromSet,
  setCurrentDrawingSet,

  // Transmittals
  getDrawingTransmittals,
  createDrawingTransmittal,
  acknowledgeDrawingTransmittal,

  // Markups
  getDrawingMarkups,
  createDrawingMarkup,
  updateDrawingMarkup,
  resolveDrawingMarkup,

  // Statistics
  getDrawingRegister,
  getDrawingsByDiscipline,
  getRevisionHistory,
};
