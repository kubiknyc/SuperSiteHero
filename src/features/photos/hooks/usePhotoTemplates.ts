/**
 * React Query Hooks for Photo Templates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPhotoTemplates,
  getPhotoTemplate,
  createPhotoTemplate,
  updatePhotoTemplate,
  deletePhotoTemplate,
  reorderPhotoTemplates,
  getPhotoRequirements,
  getPhotoRequirement,
  generateDailyRequirements,
  completePhotoRequirement,
  skipPhotoRequirement,
  reviewPhotoRequirement,
  getPhotoCompletionStats,
  getDailyPhotoChecklist,
  getProgressSeries,
  createProgressSeries,
  addPhotoToSeries,
  getLocationProgressTimeline,
  markOverdueRequirements,
  duplicateTemplate,
  bulkCreateTemplates,
} from '../../../lib/api/services/photo-templates';
import type {
  PhotoLocationTemplateInsert,
  PhotoLocationTemplateUpdate,
  PhotoRequirementFilters,
  PhotoTemplateFilters,
  PhotoProgressSeriesInsert,
} from '../../../types/photo-templates';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const photoTemplateKeys = {
  all: ['photo-templates'] as const,
  lists: () => [...photoTemplateKeys.all, 'list'] as const,
  list: (filters: PhotoTemplateFilters) => [...photoTemplateKeys.lists(), filters] as const,
  details: () => [...photoTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...photoTemplateKeys.details(), id] as const,
};

export const photoRequirementKeys = {
  all: ['photo-requirements'] as const,
  lists: () => [...photoRequirementKeys.all, 'list'] as const,
  list: (filters: PhotoRequirementFilters) => [...photoRequirementKeys.lists(), filters] as const,
  details: () => [...photoRequirementKeys.all, 'detail'] as const,
  detail: (id: string) => [...photoRequirementKeys.details(), id] as const,
  checklist: (projectId: string, date: string) =>
    [...photoRequirementKeys.all, 'checklist', projectId, date] as const,
  stats: (projectId: string, startDate: string, endDate: string) =>
    [...photoRequirementKeys.all, 'stats', projectId, startDate, endDate] as const,
};

export const photoProgressKeys = {
  all: ['photo-progress'] as const,
  series: (projectId: string) => [...photoProgressKeys.all, 'series', projectId] as const,
  timeline: (projectId: string, templateId: string) =>
    [...photoProgressKeys.all, 'timeline', projectId, templateId] as const,
};

// ============================================================================
// TEMPLATE HOOKS
// ============================================================================

export function usePhotoTemplates(filters: PhotoTemplateFilters) {
  return useQuery({
    queryKey: photoTemplateKeys.list(filters),
    queryFn: () => getPhotoTemplates(filters),
    enabled: !!filters.projectId,
  });
}

export function usePhotoTemplate(id: string | undefined) {
  return useQuery({
    queryKey: photoTemplateKeys.detail(id || ''),
    queryFn: () => getPhotoTemplate(id!),
    enabled: !!id,
  });
}

export function useCreatePhotoTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (template: PhotoLocationTemplateInsert) => createPhotoTemplate(template),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: photoTemplateKeys.lists() });
      queryClient.setQueryData(photoTemplateKeys.detail(data.id), data);
    },
  });
}

export function useUpdatePhotoTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: PhotoLocationTemplateUpdate }) =>
      updatePhotoTemplate(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: photoTemplateKeys.lists() });
      queryClient.setQueryData(photoTemplateKeys.detail(data.id), data);
    },
  });
}

export function useDeletePhotoTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePhotoTemplate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: photoTemplateKeys.lists() });
      queryClient.removeQueries({ queryKey: photoTemplateKeys.detail(id) });
    },
  });
}

export function useReorderPhotoTemplates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, templateIds }: { projectId: string; templateIds: string[] }) =>
      reorderPhotoTemplates(projectId, templateIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoTemplateKeys.lists() });
    },
  });
}

export function useDuplicatePhotoTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, newName }: { templateId: string; newName: string }) =>
      duplicateTemplate(templateId, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoTemplateKeys.lists() });
    },
  });
}

export function useBulkCreatePhotoTemplates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templates: PhotoLocationTemplateInsert[]) => bulkCreateTemplates(templates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoTemplateKeys.lists() });
    },
  });
}

// ============================================================================
// REQUIREMENT HOOKS
// ============================================================================

export function usePhotoRequirements(filters: PhotoRequirementFilters) {
  return useQuery({
    queryKey: photoRequirementKeys.list(filters),
    queryFn: () => getPhotoRequirements(filters),
    enabled: !!filters.projectId,
  });
}

export function usePhotoRequirement(id: string | undefined) {
  return useQuery({
    queryKey: photoRequirementKeys.detail(id || ''),
    queryFn: () => getPhotoRequirement(id!),
    enabled: !!id,
  });
}

export function useDailyPhotoChecklist(projectId: string, date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: photoRequirementKeys.checklist(projectId, targetDate),
    queryFn: () => getDailyPhotoChecklist(projectId, targetDate),
    enabled: !!projectId,
  });
}

export function usePhotoCompletionStats(
  projectId: string,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: photoRequirementKeys.stats(projectId, startDate, endDate),
    queryFn: () => getPhotoCompletionStats(projectId, startDate, endDate),
    enabled: !!projectId && !!startDate && !!endDate,
  });
}

export function useGenerateDailyRequirements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, date }: { projectId: string; date?: string }) =>
      generateDailyRequirements(projectId, date),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: photoRequirementKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: [...photoRequirementKeys.all, 'checklist', projectId],
      });
    },
  });
}

export function useCompletePhotoRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requirementId, photoId }: { requirementId: string; photoId: string }) =>
      completePhotoRequirement(requirementId, photoId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: photoRequirementKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: [...photoRequirementKeys.all, 'checklist'],
      });
      queryClient.invalidateQueries({
        queryKey: [...photoRequirementKeys.all, 'stats'],
      });
      queryClient.setQueryData(photoRequirementKeys.detail(data.id), data);
    },
  });
}

export function useSkipPhotoRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requirementId, reason }: { requirementId: string; reason: string }) =>
      skipPhotoRequirement(requirementId, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: photoRequirementKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: [...photoRequirementKeys.all, 'checklist'],
      });
      queryClient.setQueryData(photoRequirementKeys.detail(data.id), data);
    },
  });
}

export function useReviewPhotoRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requirementId,
      reviewStatus,
      notes,
    }: {
      requirementId: string;
      reviewStatus: 'approved' | 'rejected' | 'needs_retake';
      notes?: string;
    }) => reviewPhotoRequirement(requirementId, reviewStatus, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: photoRequirementKeys.lists() });
      queryClient.setQueryData(photoRequirementKeys.detail(data.id), data);
    },
  });
}

export function useMarkOverdueRequirements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markOverdueRequirements(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoRequirementKeys.all });
    },
  });
}

// ============================================================================
// PROGRESS SERIES HOOKS
// ============================================================================

export function useProgressSeries(projectId: string) {
  return useQuery({
    queryKey: photoProgressKeys.series(projectId),
    queryFn: () => getProgressSeries(projectId),
    enabled: !!projectId,
  });
}

export function useLocationProgressTimeline(projectId: string, templateId: string) {
  return useQuery({
    queryKey: photoProgressKeys.timeline(projectId, templateId),
    queryFn: () => getLocationProgressTimeline(projectId, templateId),
    enabled: !!projectId && !!templateId,
  });
}

export function useCreateProgressSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (series: PhotoProgressSeriesInsert) => createProgressSeries(series),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: photoProgressKeys.series(data.projectId),
      });
    },
  });
}

export function useAddPhotoToSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seriesId, photoId }: { seriesId: string; photoId: string }) =>
      addPhotoToSeries(seriesId, photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.all });
    },
  });
}
