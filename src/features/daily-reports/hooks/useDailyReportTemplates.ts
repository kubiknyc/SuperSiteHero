/**
 * Daily Report Templates Hooks
 *
 * React Query hooks for managing daily report templates with support for:
 * - CRUD operations
 * - Template sharing (personal, project, company)
 * - Import/Export functionality
 * - Usage tracking
 */

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { dailyReportTemplatesApi } from '@/lib/api/services/daily-report-templates';
import type {
  DailyReportTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CopyTemplateRequest,
  TemplateFilters,
  TemplateScope,
} from '@/types/daily-reports-v2';

// =============================================
// QUERY KEYS
// =============================================

export const templateKeys = {
  all: ['daily-report-templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (filters?: TemplateFilters) => [...templateKeys.lists(), filters] as const,
  project: (projectId: string) => [...templateKeys.all, 'project', projectId] as const,
  company: (companyId: string) => [...templateKeys.all, 'company', companyId] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateKeys.details(), id] as const,
  stats: (id: string) => [...templateKeys.all, 'stats', id] as const,
  popular: () => [...templateKeys.all, 'popular'] as const,
  recent: () => [...templateKeys.all, 'recent'] as const,
  tags: () => [...templateKeys.all, 'tags'] as const,
};

// =============================================
// QUERY HOOKS
// =============================================

/**
 * Fetch all accessible templates with optional filters
 */
export function useTemplates(filters?: TemplateFilters) {
  return useQuery({
    queryKey: templateKeys.list(filters),
    queryFn: () => dailyReportTemplatesApi.getTemplates(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch templates for a specific project
 */
export function useProjectTemplates(projectId: string | undefined) {
  return useQuery({
    queryKey: templateKeys.project(projectId || ''),
    queryFn: () => dailyReportTemplatesApi.getProjectTemplates(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch company-wide templates
 */
export function useCompanyTemplates(companyId: string | undefined) {
  return useQuery({
    queryKey: templateKeys.company(companyId || ''),
    queryFn: () => dailyReportTemplatesApi.getCompanyTemplates(companyId!),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch a single template by ID
 */
export function useTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: templateKeys.detail(templateId || ''),
    queryFn: () => dailyReportTemplatesApi.getTemplate(templateId!),
    enabled: !!templateId,
  });
}

/**
 * Fetch template with additional statistics
 */
export function useTemplateWithStats(templateId: string | undefined) {
  return useQuery({
    queryKey: templateKeys.stats(templateId || ''),
    queryFn: () => dailyReportTemplatesApi.getTemplateWithStats(templateId!),
    enabled: !!templateId,
  });
}

/**
 * Fetch popular templates
 */
export function usePopularTemplates(limit: number = 10) {
  return useQuery({
    queryKey: templateKeys.popular(),
    queryFn: () => dailyReportTemplatesApi.getPopularTemplates(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch recently used templates
 */
export function useRecentTemplates(limit: number = 5) {
  return useQuery({
    queryKey: templateKeys.recent(),
    queryFn: () => dailyReportTemplatesApi.getRecentTemplates(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch all template tags
 */
export function useTemplateTags() {
  return useQuery({
    queryKey: templateKeys.tags(),
    queryFn: () => dailyReportTemplatesApi.getAllTags(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Search templates
 */
export function useTemplateSearch(query: string) {
  return useQuery({
    queryKey: [...templateKeys.all, 'search', query],
    queryFn: () => dailyReportTemplatesApi.searchTemplates(query),
    enabled: query.length >= 2,
    staleTime: 60 * 1000, // 1 minute
  });
}

// =============================================
// MUTATION HOOKS
// =============================================

/**
 * Create a new template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateTemplateRequest) =>
      dailyReportTemplatesApi.createTemplate(request),
    onSuccess: (data: DailyReportTemplate) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      if (data.project_id) {
        queryClient.invalidateQueries({
          queryKey: templateKeys.project(data.project_id),
        });
      }
      if (data.company_id) {
        queryClient.invalidateQueries({
          queryKey: templateKeys.company(data.company_id),
        });
      }
      toast.success('Template created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create template');
    },
  });
}

/**
 * Create template from an existing report
 */
export function useCreateTemplateFromReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reportId,
      templateInfo,
    }: {
      reportId: string;
      templateInfo: {
        name: string;
        description?: string;
        scope: TemplateScope;
        category?: string;
        tags?: string[];
        includeWorkforce?: boolean;
        includeEquipment?: boolean;
        includeWeather?: boolean;
        includeNotes?: boolean;
      };
    }) => dailyReportTemplatesApi.createTemplateFromReport(reportId, templateInfo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      toast.success('Template created from report');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create template from report');
    },
  });
}

/**
 * Update an existing template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      updates,
    }: {
      templateId: string;
      updates: UpdateTemplateRequest;
    }) => dailyReportTemplatesApi.updateTemplate(templateId, updates),
    onSuccess: (data: DailyReportTemplate) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      toast.success('Template updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update template');
    },
  });
}

/**
 * Delete a template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) =>
      dailyReportTemplatesApi.deleteTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
      toast.success('Template deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete template');
    },
  });
}

/**
 * Copy a template to another scope/project/company
 */
export function useCopyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CopyTemplateRequest) =>
      dailyReportTemplatesApi.copyTemplate(request),
    onSuccess: (data: DailyReportTemplate) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      if (data.project_id) {
        queryClient.invalidateQueries({
          queryKey: templateKeys.project(data.project_id),
        });
      }
      if (data.company_id) {
        queryClient.invalidateQueries({
          queryKey: templateKeys.company(data.company_id),
        });
      }
      toast.success('Template copied successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to copy template');
    },
  });
}

/**
 * Apply a template to get report data
 */
export function useApplyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) =>
      dailyReportTemplatesApi.applyTemplate(templateId),
    onSuccess: () => {
      // Invalidate recent templates as usage has been recorded
      queryClient.invalidateQueries({ queryKey: templateKeys.recent() });
      queryClient.invalidateQueries({ queryKey: templateKeys.popular() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to apply template');
    },
  });
}

/**
 * Export template as JSON
 */
export function useExportTemplate() {
  return useMutation({
    mutationFn: (templateId: string) =>
      dailyReportTemplatesApi.exportTemplate(templateId),
    onSuccess: (jsonData: string, templateId: string) => {
      // Create and download file
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template-${templateId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Template exported successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to export template');
    },
  });
}

/**
 * Import template from JSON
 */
export function useImportTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      jsonData,
      options,
    }: {
      jsonData: string;
      options: {
        name?: string;
        scope: TemplateScope;
        project_id?: string;
        company_id?: string;
      };
    }) => dailyReportTemplatesApi.importTemplate(jsonData, options),
    onSuccess: (data: DailyReportTemplate) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      if (data.project_id) {
        queryClient.invalidateQueries({
          queryKey: templateKeys.project(data.project_id),
        });
      }
      if (data.company_id) {
        queryClient.invalidateQueries({
          queryKey: templateKeys.company(data.company_id),
        });
      }
      toast.success('Template imported successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import template');
    },
  });
}

// =============================================
// UTILITY HOOKS
// =============================================

/**
 * Hook for template filtering state management
 */
export function useTemplateFilters(initialFilters?: TemplateFilters) {
  const [filters, setFilters] = React.useState<TemplateFilters>(
    initialFilters || {}
  );

  const updateFilter = React.useCallback(
    <K extends keyof TemplateFilters>(key: K, value: TemplateFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const clearFilters = React.useCallback(() => {
    setFilters({});
  }, []);

  const hasFilters = React.useMemo(() => {
    return Object.values(filters).some(
      (v) => v !== undefined && v !== '' && (!Array.isArray(v) || v.length > 0)
    );
  }, [filters]);

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    hasFilters,
  };
}
