/**
 * React Query hooks for Drawing Register
 *
 * Provides hooks for:
 * - Fetching drawings (list, single, with revisions)
 * - Managing revisions
 * - Drawing sets
 * - Transmittal history
 * - Markups
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { drawingsApi } from '@/lib/api/services/drawings';
import type {
  Drawing,
  DrawingInsert,
  DrawingUpdate,
  DrawingRevision,
  DrawingRevisionInsert,
  DrawingRevisionUpdate,
  DrawingSet,
  DrawingSetInsert,
  DrawingSetItemInsert,
  DrawingTransmittalInsert,
  DrawingMarkup,
  DrawingMarkupInsert,
  DrawingMarkupUpdate,
  DrawingFilters,
  DrawingDiscipline,
} from '@/types/drawing';

// ============================================================================
// Query Keys
// ============================================================================

export const drawingKeys = {
  all: ['drawings'] as const,
  lists: () => [...drawingKeys.all, 'list'] as const,
  list: (projectId: string, filters?: Partial<DrawingFilters>) =>
    [...drawingKeys.lists(), projectId, filters] as const,
  details: () => [...drawingKeys.all, 'detail'] as const,
  detail: (id: string) => [...drawingKeys.details(), id] as const,
  withRevisions: (id: string) => [...drawingKeys.detail(id), 'revisions'] as const,
  register: (projectId: string) => [...drawingKeys.all, 'register', projectId] as const,
  byDiscipline: (projectId: string) => [...drawingKeys.all, 'by-discipline', projectId] as const,
  revisions: (drawingId: string) => [...drawingKeys.all, 'revisions', drawingId] as const,
  revisionHistory: (drawingId: string) => [...drawingKeys.all, 'revision-history', drawingId] as const,
  sets: (projectId: string) => [...drawingKeys.all, 'sets', projectId] as const,
  set: (id: string) => [...drawingKeys.all, 'set', id] as const,
  transmittals: (drawingId: string) => [...drawingKeys.all, 'transmittals', drawingId] as const,
  markups: (revisionId: string) => [...drawingKeys.all, 'markups', revisionId] as const,
};

// ============================================================================
// Drawing Query Hooks
// ============================================================================

/**
 * Fetch all drawings for a project with optional filters
 */
export function useDrawings(projectId: string | undefined, filters?: Partial<DrawingFilters>) {
  return useQuery({
    queryKey: drawingKeys.list(projectId || '', filters),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');
      return drawingsApi.getDrawings({ projectId, ...filters });
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch drawings filtered by discipline
 */
export function useDrawingsByDiscipline(
  projectId: string | undefined,
  discipline: DrawingDiscipline | undefined
) {
  return useDrawings(projectId, discipline ? { discipline } : undefined);
}

/**
 * Fetch only IFC (Issued for Construction) drawings
 */
export function useIFCDrawings(projectId: string | undefined) {
  return useDrawings(projectId, { isIssuedForConstruction: true });
}

/**
 * Fetch a single drawing
 */
export function useDrawing(drawingId: string | undefined) {
  return useQuery({
    queryKey: drawingKeys.detail(drawingId || ''),
    queryFn: async () => {
      if (!drawingId) throw new Error('Drawing ID required');
      return drawingsApi.getDrawing(drawingId);
    },
    enabled: !!drawingId,
  });
}

/**
 * Fetch a drawing with all its revisions
 */
export function useDrawingWithRevisions(drawingId: string | undefined) {
  return useQuery({
    queryKey: drawingKeys.withRevisions(drawingId || ''),
    queryFn: async () => {
      if (!drawingId) throw new Error('Drawing ID required');
      return drawingsApi.getDrawingWithRevisions(drawingId);
    },
    enabled: !!drawingId,
  });
}

/**
 * Fetch drawing register summary for a project
 */
export function useDrawingRegister(projectId: string | undefined) {
  return useQuery({
    queryKey: drawingKeys.register(projectId || ''),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');
      return drawingsApi.getDrawingRegister(projectId);
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch drawings summary by discipline
 */
export function useDrawingsByDisciplineSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: drawingKeys.byDiscipline(projectId || ''),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');
      return drawingsApi.getDrawingsByDiscipline(projectId);
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// Revision Query Hooks
// ============================================================================

/**
 * Fetch all revisions for a drawing
 */
export function useDrawingRevisions(drawingId: string | undefined) {
  return useQuery({
    queryKey: drawingKeys.revisions(drawingId || ''),
    queryFn: async () => {
      if (!drawingId) throw new Error('Drawing ID required');
      return drawingsApi.getDrawingRevisions(drawingId);
    },
    enabled: !!drawingId,
  });
}

/**
 * Fetch revision history for a drawing (via RPC function)
 */
export function useRevisionHistory(drawingId: string | undefined) {
  return useQuery({
    queryKey: drawingKeys.revisionHistory(drawingId || ''),
    queryFn: async () => {
      if (!drawingId) throw new Error('Drawing ID required');
      return drawingsApi.getRevisionHistory(drawingId);
    },
    enabled: !!drawingId,
  });
}

/**
 * Fetch current revision for a drawing
 */
export function useCurrentRevision(drawingId: string | undefined) {
  return useQuery({
    queryKey: [...drawingKeys.revisions(drawingId || ''), 'current'],
    queryFn: async () => {
      if (!drawingId) throw new Error('Drawing ID required');
      return drawingsApi.getCurrentRevision(drawingId);
    },
    enabled: !!drawingId,
  });
}

// ============================================================================
// Drawing Set Query Hooks
// ============================================================================

/**
 * Fetch all drawing sets for a project
 */
export function useDrawingSets(projectId: string | undefined) {
  return useQuery({
    queryKey: drawingKeys.sets(projectId || ''),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');
      return drawingsApi.getDrawingSets(projectId);
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch a single drawing set with its items
 */
export function useDrawingSet(setId: string | undefined) {
  return useQuery({
    queryKey: drawingKeys.set(setId || ''),
    queryFn: async () => {
      if (!setId) throw new Error('Set ID required');
      return drawingsApi.getDrawingSet(setId);
    },
    enabled: !!setId,
  });
}

// ============================================================================
// Transmittal Query Hooks
// ============================================================================

/**
 * Fetch transmittal history for a drawing
 */
export function useDrawingTransmittals(drawingId: string | undefined) {
  return useQuery({
    queryKey: drawingKeys.transmittals(drawingId || ''),
    queryFn: async () => {
      if (!drawingId) throw new Error('Drawing ID required');
      return drawingsApi.getDrawingTransmittals(drawingId);
    },
    enabled: !!drawingId,
  });
}

// ============================================================================
// Markup Query Hooks
// ============================================================================

/**
 * Fetch markups for a revision
 */
export function useDrawingMarkups(revisionId: string | undefined, status?: string) {
  return useQuery({
    queryKey: [...drawingKeys.markups(revisionId || ''), status],
    queryFn: async () => {
      if (!revisionId) throw new Error('Revision ID required');
      return drawingsApi.getDrawingMarkups(revisionId, status);
    },
    enabled: !!revisionId,
  });
}

// ============================================================================
// Drawing Mutation Hooks
// ============================================================================

/**
 * Create a new drawing
 */
export function useCreateDrawing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DrawingInsert) => drawingsApi.createDrawing(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: drawingKeys.register(data.projectId) });
      queryClient.invalidateQueries({ queryKey: drawingKeys.byDiscipline(data.projectId) });
    },
  });
}

/**
 * Update a drawing
 */
export function useUpdateDrawing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: DrawingUpdate }) =>
      drawingsApi.updateDrawing(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: drawingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: drawingKeys.register(data.projectId) });
    },
  });
}

/**
 * Delete a drawing (soft delete)
 */
export function useDeleteDrawing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (drawingId: string) => drawingsApi.deleteDrawing(drawingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.all });
    },
  });
}

/**
 * Mark drawing as Issued for Construction
 */
export function useMarkDrawingIFC() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ifcDate }: { id: string; ifcDate?: string }) =>
      drawingsApi.markDrawingIFC(id, ifcDate),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: drawingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: drawingKeys.register(data.projectId) });
    },
  });
}

/**
 * Bulk create drawings
 */
export function useBulkCreateDrawings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (drawings: DrawingInsert[]) => drawingsApi.bulkCreateDrawings(drawings),
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: drawingKeys.lists() });
        queryClient.invalidateQueries({ queryKey: drawingKeys.register(data[0].projectId) });
      }
    },
  });
}

/**
 * Bulk mark drawings as IFC
 */
export function useBulkMarkIFC() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ drawingIds, ifcDate }: { drawingIds: string[]; ifcDate?: string }) =>
      drawingsApi.bulkMarkIFC(drawingIds, ifcDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.all });
    },
  });
}

/**
 * Duplicate a drawing
 */
export function useDuplicateDrawing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ drawingId, newNumber }: { drawingId: string; newNumber: string }) =>
      drawingsApi.duplicateDrawing(drawingId, newNumber),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: drawingKeys.register(data.projectId) });
    },
  });
}

// ============================================================================
// Revision Mutation Hooks
// ============================================================================

/**
 * Create a new revision
 */
export function useCreateRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DrawingRevisionInsert) => drawingsApi.createRevision(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.revisions(data.drawingId) });
      queryClient.invalidateQueries({ queryKey: drawingKeys.detail(data.drawingId) });
      queryClient.invalidateQueries({ queryKey: drawingKeys.revisionHistory(data.drawingId) });
    },
  });
}

/**
 * Update a revision
 */
export function useUpdateRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, drawingId, updates }: { id: string; drawingId: string; updates: DrawingRevisionUpdate }) =>
      drawingsApi.updateRevision(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.revisions(variables.drawingId) });
      queryClient.invalidateQueries({ queryKey: drawingKeys.detail(variables.drawingId) });
    },
  });
}

/**
 * Set a revision as current
 */
export function useSetCurrentRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ revisionId, drawingId }: { revisionId: string; drawingId: string }) =>
      drawingsApi.setCurrentRevision(revisionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.revisions(variables.drawingId) });
      queryClient.invalidateQueries({ queryKey: drawingKeys.detail(variables.drawingId) });
    },
  });
}

// ============================================================================
// Drawing Set Mutation Hooks
// ============================================================================

/**
 * Create a new drawing set
 */
export function useCreateDrawingSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DrawingSetInsert) => drawingsApi.createDrawingSet(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.sets(data.projectId) });
    },
  });
}

/**
 * Add drawing to a set
 */
export function useAddDrawingToSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DrawingSetItemInsert) => drawingsApi.addDrawingToSet(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.set(variables.drawingSetId) });
    },
  });
}

/**
 * Remove drawing from a set
 */
export function useRemoveDrawingFromSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ setId, drawingId }: { setId: string; drawingId: string }) =>
      drawingsApi.removeDrawingFromSet(setId, drawingId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.set(variables.setId) });
    },
  });
}

/**
 * Set a drawing set as current
 */
export function useSetCurrentDrawingSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ setId, projectId }: { setId: string; projectId: string }) =>
      drawingsApi.setCurrentDrawingSet(setId, projectId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.sets(variables.projectId) });
    },
  });
}

// ============================================================================
// Transmittal Mutation Hooks
// ============================================================================

/**
 * Create a drawing transmittal record
 */
export function useCreateDrawingTransmittal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DrawingTransmittalInsert) => drawingsApi.createDrawingTransmittal(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.transmittals(data.drawingId) });
    },
  });
}

/**
 * Acknowledge receipt of a transmittal
 */
export function useAcknowledgeTransmittal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, drawingId, acknowledgedBy }: { id: string; drawingId: string; acknowledgedBy: string }) =>
      drawingsApi.acknowledgeDrawingTransmittal(id, acknowledgedBy),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.transmittals(variables.drawingId) });
    },
  });
}

// ============================================================================
// Markup Mutation Hooks
// ============================================================================

/**
 * Create a markup on a drawing revision
 */
export function useCreateDrawingMarkup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DrawingMarkupInsert) => drawingsApi.createDrawingMarkup(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.markups(data.revisionId) });
    },
  });
}

/**
 * Update a markup
 */
export function useUpdateDrawingMarkup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, revisionId, updates }: { id: string; revisionId: string; updates: DrawingMarkupUpdate }) =>
      drawingsApi.updateDrawingMarkup(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.markups(variables.revisionId) });
    },
  });
}

/**
 * Resolve a markup
 */
export function useResolveDrawingMarkup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, revisionId, notes }: { id: string; revisionId: string; notes?: string }) =>
      drawingsApi.resolveDrawingMarkup(id, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.markups(variables.revisionId) });
    },
  });
}
