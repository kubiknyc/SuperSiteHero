/**
 * Activity Templates Hook
 *
 * Manages quick-add activity templates for daily reports.
 * Templates are organized by trade/work type and can be
 * created, edited, and deleted per project.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityTemplate {
  id: string;
  project_id: string | null; // null = global template
  company_id: string;
  name: string;
  description: string | null;
  category: ActivityCategory;
  trade: string | null;
  default_hours: number | null;
  default_workers: number | null;
  cost_code: string | null;
  is_active: boolean;
  usage_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ActivityCategory =
  | 'general'
  | 'sitework'
  | 'concrete'
  | 'masonry'
  | 'metals'
  | 'wood_plastics'
  | 'thermal_moisture'
  | 'openings'
  | 'finishes'
  | 'specialties'
  | 'equipment'
  | 'furnishings'
  | 'special_construction'
  | 'conveying'
  | 'plumbing'
  | 'hvac'
  | 'electrical'
  | 'communications'
  | 'safety'
  | 'cleanup';

export const ACTIVITY_CATEGORIES: { value: ActivityCategory; label: string; icon?: string }[] = [
  { value: 'general', label: 'General Work' },
  { value: 'sitework', label: 'Sitework & Earthwork' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'masonry', label: 'Masonry' },
  { value: 'metals', label: 'Metals & Structural Steel' },
  { value: 'wood_plastics', label: 'Wood & Plastics' },
  { value: 'thermal_moisture', label: 'Thermal & Moisture Protection' },
  { value: 'openings', label: 'Doors & Windows' },
  { value: 'finishes', label: 'Finishes' },
  { value: 'specialties', label: 'Specialties' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'furnishings', label: 'Furnishings' },
  { value: 'special_construction', label: 'Special Construction' },
  { value: 'conveying', label: 'Conveying Systems' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'communications', label: 'Communications' },
  { value: 'safety', label: 'Safety & Environmental' },
  { value: 'cleanup', label: 'Cleanup & Closeout' },
];

export interface CreateActivityTemplateInput {
  project_id?: string | null;
  name: string;
  description?: string | null;
  category: ActivityCategory;
  trade?: string | null;
  default_hours?: number | null;
  default_workers?: number | null;
  cost_code?: string | null;
}

export interface UpdateActivityTemplateInput extends Partial<CreateActivityTemplateInput> {
  id: string;
  is_active?: boolean;
}

export interface ActivityTemplateFilters {
  projectId?: string | null;
  category?: ActivityCategory;
  trade?: string;
  searchTerm?: string;
  includeGlobal?: boolean;
  activeOnly?: boolean;
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const activityTemplateKeys = {
  all: ['activity-templates'] as const,
  lists: () => [...activityTemplateKeys.all, 'list'] as const,
  list: (filters: ActivityTemplateFilters) => [...activityTemplateKeys.lists(), filters] as const,
  project: (projectId: string) => [...activityTemplateKeys.all, 'project', projectId] as const,
  detail: (id: string) => [...activityTemplateKeys.all, 'detail', id] as const,
  categories: (projectId?: string) => [...activityTemplateKeys.all, 'categories', projectId] as const,
  popular: (projectId: string) => [...activityTemplateKeys.all, 'popular', projectId] as const,
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch activity templates with filters
 */
export function useActivityTemplates(filters: ActivityTemplateFilters = {}) {
  const {
    projectId,
    category,
    trade,
    searchTerm,
    includeGlobal = true,
    activeOnly = true,
  } = filters;

  return useQuery({
    queryKey: activityTemplateKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('activity_templates')
        .select('*')
        .order('usage_count', { ascending: false })
        .order('name', { ascending: true });

      // Filter by project or include global templates
      if (projectId) {
        if (includeGlobal) {
          query = query.or(`project_id.eq.${projectId},project_id.is.null`);
        } else {
          query = query.eq('project_id', projectId);
        }
      } else if (!includeGlobal) {
        query = query.is('project_id', null);
      }

      // Apply category filter
      if (category) {
        query = query.eq('category', category);
      }

      // Apply trade filter
      if (trade) {
        query = query.eq('trade', trade);
      }

      // Apply search filter
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // Apply active filter
      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {throw error;}
      return data as ActivityTemplate[];
    },
  });
}

/**
 * Fetch templates for a specific project (including global)
 */
export function useProjectActivityTemplates(projectId: string | undefined) {
  return useActivityTemplates({
    projectId: projectId || undefined,
    includeGlobal: true,
    activeOnly: true,
  });
}

/**
 * Fetch a single template by ID
 */
export function useActivityTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: activityTemplateKeys.detail(templateId || ''),
    queryFn: async () => {
      if (!templateId) {throw new Error('Template ID required');}

      const { data, error } = await supabase
        .from('activity_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) {throw error;}
      return data as ActivityTemplate;
    },
    enabled: !!templateId,
  });
}

/**
 * Fetch categories with template counts
 */
export function useActivityTemplateCategories(projectId?: string) {
  return useQuery({
    queryKey: activityTemplateKeys.categories(projectId),
    queryFn: async () => {
      let query = supabase
        .from('activity_templates')
        .select('category')
        .eq('is_active', true);

      if (projectId) {
        query = query.or(`project_id.eq.${projectId},project_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {throw error;}

      // Count templates per category
      const categoryCounts: Record<ActivityCategory, number> = {} as Record<ActivityCategory, number>;
      for (const item of (data || [])) {
        const cat = item.category as ActivityCategory;
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }

      return ACTIVITY_CATEGORIES.map(cat => ({
        ...cat,
        count: categoryCounts[cat.value] || 0,
      }));
    },
  });
}

/**
 * Fetch most popular templates (by usage count)
 */
export function usePopularActivityTemplates(projectId: string, limit = 10) {
  return useQuery({
    queryKey: activityTemplateKeys.popular(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_templates')
        .select('*')
        .or(`project_id.eq.${projectId},project_id.is.null`)
        .eq('is_active', true)
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) {throw error;}
      return data as ActivityTemplate[];
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new activity template
 */
export function useCreateActivityTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateActivityTemplateInput & { company_id: string; created_by: string }) => {
      const { data, error } = await supabase
        .from('activity_templates')
        .insert({
          ...input,
          is_active: true,
          usage_count: 0,
        })
        .select()
        .single();

      if (error) {throw error;}
      return data as ActivityTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: activityTemplateKeys.all });
      if (data.project_id) {
        queryClient.invalidateQueries({ queryKey: activityTemplateKeys.project(data.project_id) });
      }
    },
  });
}

/**
 * Update an existing activity template
 */
export function useUpdateActivityTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateActivityTemplateInput) => {
      const { data, error } = await supabase
        .from('activity_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}
      return data as ActivityTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: activityTemplateKeys.all });
      queryClient.invalidateQueries({ queryKey: activityTemplateKeys.detail(data.id) });
    },
  });
}

/**
 * Delete an activity template
 */
export function useDeleteActivityTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('activity_templates')
        .delete()
        .eq('id', templateId);

      if (error) {throw error;}
      return templateId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityTemplateKeys.all });
    },
  });
}

/**
 * Increment usage count when template is used
 */
export function useIncrementTemplateUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data, error } = await supabase.rpc('increment_template_usage', {
        p_template_id: templateId,
      });

      if (error) {
        // Fallback: direct update if RPC doesn't exist
        const { error: updateError } = await supabase
          .from('activity_templates')
          .update({ usage_count: supabase.rpc('increment', { x: 1 }) as any })
          .eq('id', templateId);

        if (updateError) {throw updateError;}
      }

      return data;
    },
    onSuccess: () => {
      // Silently refresh popular templates
      queryClient.invalidateQueries({ queryKey: activityTemplateKeys.all });
    },
  });
}

/**
 * Apply a template to create work performed entry
 */
export function useApplyActivityTemplate() {
  const incrementUsage = useIncrementTemplateUsage();

  return useMutation({
    mutationFn: async ({
      template,
      reportId,
      customizations,
    }: {
      template: ActivityTemplate;
      reportId: string;
      customizations?: {
        description?: string;
        hours?: number;
        workers?: number;
      };
    }) => {
      // Increment usage count
      incrementUsage.mutate(template.id);

      // Create work performed entry from template
      const { data, error } = await supabase
        .from('daily_report_work_performed')
        .insert({
          daily_report_id: reportId,
          description: customizations?.description || template.description || template.name,
          hours: customizations?.hours || template.default_hours || 0,
          workers: customizations?.workers || template.default_workers || 0,
          cost_code: template.cost_code,
          trade: template.trade,
        })
        .select()
        .single();

      if (error) {throw error;}
      return data;
    },
  });
}

export default useActivityTemplates;
