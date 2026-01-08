/**
 * Daily Reports V2 React Query Hooks
 * Complete hook library for enhanced daily report system
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  dailyReportsV2Api,
  workforceApi,
  equipmentApi,
  delaysApi,
  safetyIncidentsApi,
  inspectionsApi,
  tmWorkApi,
  progressApi,
  deliveriesApi,
  visitorsApi,
  photosApi,
  templatesApi,
  saveReportWithAllData,
} from '@/lib/api/services/daily-reports-v2';
import type {
  DailyReportV2,
  WorkforceEntryV2,
  EquipmentEntryV2,
  DelayEntry,
  SafetyIncident,
  InspectionEntry,
  TMWorkEntry,
  ProgressEntry,
  DeliveryEntryV2,
  VisitorEntryV2,
  PhotoEntryV2,
  DailyReportTemplate,
  CreateDailyReportV2Request,
  SubmitReportRequest,
  ApproveReportRequest,
  RequestChangesRequest,
  CopyFromPreviousDayRequest,
} from '@/types/daily-reports-v2';
import { toast } from 'sonner';
import { STALE_TIMES } from '@/lib/stale-times';

// =============================================
// QUERY KEYS
// =============================================

export const dailyReportV2Keys = {
  all: ['daily-reports-v2'] as const,
  lists: () => [...dailyReportV2Keys.all, 'list'] as const,
  list: (projectId: string, filters?: Record<string, unknown>) =>
    [...dailyReportV2Keys.lists(), projectId, filters] as const,
  details: () => [...dailyReportV2Keys.all, 'detail'] as const,
  detail: (id: string) => [...dailyReportV2Keys.details(), id] as const,
  delays: (reportId: string) => [...dailyReportV2Keys.all, 'delays', reportId] as const,
  projectDelays: (projectId: string, startDate: string, endDate: string) =>
    [...dailyReportV2Keys.all, 'project-delays', projectId, startDate, endDate] as const,
  safetyIncidents: (reportId: string) => [...dailyReportV2Keys.all, 'safety', reportId] as const,
  oshaIncidents: (projectId: string) => [...dailyReportV2Keys.all, 'osha', projectId] as const,
  inspections: (reportId: string) => [...dailyReportV2Keys.all, 'inspections', reportId] as const,
  tmWork: (reportId: string) => [...dailyReportV2Keys.all, 'tm-work', reportId] as const,
  progress: (reportId: string) => [...dailyReportV2Keys.all, 'progress', reportId] as const,
  photos: (reportId: string) => [...dailyReportV2Keys.all, 'photos', reportId] as const,
  templates: (projectId: string) => [...dailyReportV2Keys.all, 'templates', projectId] as const,
};

// =============================================
// REPORTS QUERIES
// =============================================

/**
 * Fetch daily reports for a project
 */
export function useDailyReportsV2(
  projectId: string | undefined,
  options?: {
    startDate?: string;
    endDate?: string;
    status?: string[];
  }
) {
  return useQuery({
    queryKey: dailyReportV2Keys.list(projectId || '', options),
    queryFn: () => dailyReportsV2Api.getProjectReports(projectId!, options),
    enabled: !!projectId,
    staleTime: STALE_TIMES.STANDARD, // 5 minutes
  });
}

/**
 * Fetch a single daily report with all related data
 */
export function useDailyReportV2(reportId: string | undefined) {
  return useQuery({
    queryKey: dailyReportV2Keys.detail(reportId || ''),
    queryFn: () => dailyReportsV2Api.getReportWithRelated(reportId!),
    enabled: !!reportId,
    staleTime: STALE_TIMES.FREQUENT * 4, // ~2 minutes
  });
}

// =============================================
// REPORTS MUTATIONS
// =============================================

/**
 * Create a new daily report
 */
export function useCreateDailyReportV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateDailyReportV2Request) =>
      dailyReportsV2Api.createReport(request),
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.lists() });
      toast.success('Daily report created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create daily report');
    },
  });
}

/**
 * Update daily report
 */
export function useUpdateDailyReportV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<DailyReportV2> }) =>
      dailyReportsV2Api.updateReport(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update daily report');
    },
  });
}

/**
 * Submit report for approval
 */
export function useSubmitReportV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SubmitReportRequest) =>
      dailyReportsV2Api.submitReport(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.lists() });
      toast.success('Daily report submitted for approval');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit daily report');
    },
  });
}

/**
 * Approve report
 */
export function useApproveReportV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ApproveReportRequest) =>
      dailyReportsV2Api.approveReport(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.lists() });
      toast.success('Daily report approved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve daily report');
    },
  });
}

/**
 * Request changes on report
 */
export function useRequestChangesV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RequestChangesRequest) =>
      dailyReportsV2Api.requestChanges(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.lists() });
      toast.success('Changes requested');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to request changes');
    },
  });
}

/**
 * Lock report (after approval)
 */
export function useLockReportV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) =>
      dailyReportsV2Api.lockReport(reportId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.lists() });
      toast.success('Daily report locked');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to lock daily report');
    },
  });
}

/**
 * Delete report
 */
export function useDeleteDailyReportV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => dailyReportsV2Api.deleteReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.lists() });
      toast.success('Daily report deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete daily report');
    },
  });
}

/**
 * Copy from previous day
 */
export function useCopyFromPreviousDay() {
  return useMutation({
    mutationFn: (request: CopyFromPreviousDayRequest) =>
      dailyReportsV2Api.copyFromPreviousDay(request),
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to copy from previous day');
    },
  });
}

/**
 * Save report with all related data
 */
export function useSaveReportWithAllData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reportId,
      data,
    }: {
      reportId: string;
      data: Parameters<typeof saveReportWithAllData>[1];
    }) => saveReportWithAllData(reportId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.detail(variables.reportId) });
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.lists() });
      toast.success('Report saved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save report');
    },
  });
}

// =============================================
// DELAYS HOOKS
// =============================================

export function useDelays(reportId: string | undefined) {
  return useQuery({
    queryKey: dailyReportV2Keys.delays(reportId || ''),
    queryFn: () => delaysApi.getByReportId(reportId!),
    enabled: !!reportId,
  });
}

export function useProjectDelays(
  projectId: string | undefined,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: dailyReportV2Keys.projectDelays(projectId || '', startDate, endDate),
    queryFn: () => delaysApi.getProjectDelays(projectId!, startDate, endDate),
    enabled: !!projectId,
  });
}

export function useUpsertDelays() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entries: DelayEntry[]) => delaysApi.upsert(entries),
    onSuccess: (data) => {
      if (data[0]?.daily_report_id) {
        queryClient.invalidateQueries({
          queryKey: dailyReportV2Keys.delays(data[0].daily_report_id),
        });
      }
    },
  });
}

export function useDeleteDelay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => delaysApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.all });
    },
  });
}

// =============================================
// SAFETY INCIDENTS HOOKS
// =============================================

export function useSafetyIncidents(reportId: string | undefined) {
  return useQuery({
    queryKey: dailyReportV2Keys.safetyIncidents(reportId || ''),
    queryFn: () => safetyIncidentsApi.getByReportId(reportId!),
    enabled: !!reportId,
  });
}

export function useOshaIncidents(projectId: string | undefined) {
  return useQuery({
    queryKey: dailyReportV2Keys.oshaIncidents(projectId || ''),
    queryFn: () => safetyIncidentsApi.getOshaIncidents(projectId!),
    enabled: !!projectId,
  });
}

export function useUpsertSafetyIncidents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entries: SafetyIncident[]) => safetyIncidentsApi.upsert(entries),
    onSuccess: (data) => {
      if (data[0]?.daily_report_id) {
        queryClient.invalidateQueries({
          queryKey: dailyReportV2Keys.safetyIncidents(data[0].daily_report_id),
        });
      }
    },
  });
}

export function useDeleteSafetyIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => safetyIncidentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.all });
    },
  });
}

// =============================================
// INSPECTIONS HOOKS
// =============================================

export function useInspections(reportId: string | undefined) {
  return useQuery({
    queryKey: dailyReportV2Keys.inspections(reportId || ''),
    queryFn: () => inspectionsApi.getByReportId(reportId!),
    enabled: !!reportId,
  });
}

export function useUpsertInspections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entries: InspectionEntry[]) => inspectionsApi.upsert(entries),
    onSuccess: (data) => {
      if (data[0]?.daily_report_id) {
        queryClient.invalidateQueries({
          queryKey: dailyReportV2Keys.inspections(data[0].daily_report_id),
        });
      }
    },
  });
}

export function useDeleteInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => inspectionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.all });
    },
  });
}

// =============================================
// T&M WORK HOOKS
// =============================================

export function useTMWork(reportId: string | undefined) {
  return useQuery({
    queryKey: dailyReportV2Keys.tmWork(reportId || ''),
    queryFn: () => tmWorkApi.getByReportId(reportId!),
    enabled: !!reportId,
  });
}

export function useUpsertTMWork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entries: TMWorkEntry[]) => tmWorkApi.upsert(entries),
    onSuccess: (data) => {
      if (data[0]?.daily_report_id) {
        queryClient.invalidateQueries({
          queryKey: dailyReportV2Keys.tmWork(data[0].daily_report_id),
        });
      }
    },
  });
}

export function useDeleteTMWork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tmWorkApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.all });
    },
  });
}

// =============================================
// PROGRESS HOOKS
// =============================================

export function useProgress(reportId: string | undefined) {
  return useQuery({
    queryKey: dailyReportV2Keys.progress(reportId || ''),
    queryFn: () => progressApi.getByReportId(reportId!),
    enabled: !!reportId,
  });
}

export function useUpsertProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entries: ProgressEntry[]) => progressApi.upsert(entries),
    onSuccess: (data) => {
      if (data[0]?.daily_report_id) {
        queryClient.invalidateQueries({
          queryKey: dailyReportV2Keys.progress(data[0].daily_report_id),
        });
      }
    },
  });
}

export function useDeleteProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => progressApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.all });
    },
  });
}

// =============================================
// PHOTOS HOOKS
// =============================================

export function usePhotos(reportId: string | undefined) {
  return useQuery({
    queryKey: dailyReportV2Keys.photos(reportId || ''),
    queryFn: () => photosApi.getByReportId(reportId!),
    enabled: !!reportId,
  });
}

export function useUpsertPhotos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entries: PhotoEntryV2[]) => photosApi.upsert(entries),
    onSuccess: (data) => {
      if (data[0]?.daily_report_id) {
        queryClient.invalidateQueries({
          queryKey: dailyReportV2Keys.photos(data[0].daily_report_id),
        });
      }
    },
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => photosApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.all });
    },
  });
}

export function useUpdatePhotoStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PhotoEntryV2['upload_status'] }) =>
      photosApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.all });
    },
  });
}

// =============================================
// WORKFORCE HOOKS
// =============================================

export function useUpsertWorkforce() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entries: WorkforceEntryV2[]) => workforceApi.upsert(entries),
    onSuccess: (data) => {
      if (data[0]?.daily_report_id) {
        queryClient.invalidateQueries({
          queryKey: dailyReportV2Keys.detail(data[0].daily_report_id),
        });
      }
    },
  });
}

export function useDeleteWorkforce() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workforceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.all });
    },
  });
}

// =============================================
// EQUIPMENT HOOKS
// =============================================

export function useUpsertEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entries: EquipmentEntryV2[]) => equipmentApi.upsert(entries),
    onSuccess: (data) => {
      if (data[0]?.daily_report_id) {
        queryClient.invalidateQueries({
          queryKey: dailyReportV2Keys.detail(data[0].daily_report_id),
        });
      }
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => equipmentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.all });
    },
  });
}

// =============================================
// DELIVERIES HOOKS
// =============================================

export function useUpsertDeliveries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entries: DeliveryEntryV2[]) => deliveriesApi.upsert(entries),
    onSuccess: (data) => {
      if (data[0]?.daily_report_id) {
        queryClient.invalidateQueries({
          queryKey: dailyReportV2Keys.detail(data[0].daily_report_id),
        });
      }
    },
  });
}

export function useDeleteDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deliveriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.all });
    },
  });
}

// =============================================
// VISITORS HOOKS
// =============================================

export function useUpsertVisitors() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entries: VisitorEntryV2[]) => visitorsApi.upsert(entries),
    onSuccess: (data) => {
      if (data[0]?.daily_report_id) {
        queryClient.invalidateQueries({
          queryKey: dailyReportV2Keys.detail(data[0].daily_report_id),
        });
      }
    },
  });
}

export function useDeleteVisitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => visitorsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.all });
    },
  });
}

// =============================================
// TEMPLATES HOOKS
// =============================================

export function useTemplates(projectId: string | undefined) {
  return useQuery({
    queryKey: dailyReportV2Keys.templates(projectId || ''),
    queryFn: () => templatesApi.getForProject(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (template: Omit<DailyReportTemplate, 'id' | 'created_at' | 'updated_at'>) =>
      templatesApi.create(template),
    onSuccess: (data) => {
      if (data.project_id) {
        queryClient.invalidateQueries({
          queryKey: dailyReportV2Keys.templates(data.project_id),
        });
      }
      toast.success('Template created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create template');
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<DailyReportTemplate> }) =>
      templatesApi.update(id, updates),
    onSuccess: (data) => {
      if (data.project_id) {
        queryClient.invalidateQueries({
          queryKey: dailyReportV2Keys.templates(data.project_id),
        });
      }
      toast.success('Template updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update template');
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyReportV2Keys.all });
      toast.success('Template deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete template');
    },
  });
}

// =============================================
// CONVENIENCE ALIASES
// =============================================

/**
 * Alias for useSaveReportWithAllData for backward compatibility
 */
export const useSaveDailyReportV2 = useSaveReportWithAllData;
