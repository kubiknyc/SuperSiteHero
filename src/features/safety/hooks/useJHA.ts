/**
 * JHA (Job Hazard Analysis) Hook
 *
 * Extends the existing JSA functionality with additional JHA-specific features:
 * - Task breakdown steps with detailed hazard identification
 * - Control measures hierarchy (elimination, substitution, engineering, admin, PPE)
 * - Worker acknowledgment signatures
 * - Template library management
 * - Link to daily reports
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { useToast } from '@/lib/notifications/ToastContext';
import type {
  JobSafetyAnalysis,
  JSAWithDetails,
  JSAHazard,
  JSAAcknowledgment,
  JSATemplate,
  CreateJSADTO,
  UpdateJSADTO,
  CreateJSAHazardDTO,
  CreateJSAAcknowledgmentDTO,
  JSAFilters,
  RiskLevel,
} from '@/types/jsa';

// Use any type workaround for tables not in generated types yet
const db = supabase as any;

// ============================================================================
// Query Keys
// ============================================================================

export const jhaKeys = {
  all: ['jha'] as const,
  lists: (filters?: JSAFilters) => [...jhaKeys.all, 'list', filters] as const,
  detail: (id: string) => [...jhaKeys.all, 'detail', id] as const,
  hazards: (jhaId: string) => [...jhaKeys.all, 'hazards', jhaId] as const,
  acknowledgments: (jhaId: string) => [...jhaKeys.all, 'acknowledgments', jhaId] as const,
  templates: () => [...jhaKeys.all, 'templates'] as const,
  templatesByCategory: (category: string) => [...jhaKeys.all, 'templates', category] as const,
  dailyReportLinks: (jhaId: string) => [...jhaKeys.all, 'daily-report-links', jhaId] as const,
  projectStats: (projectId: string) => [...jhaKeys.all, 'stats', projectId] as const,
  pendingAcknowledgments: (projectId: string) => [...jhaKeys.all, 'pending-acks', projectId] as const,
};

// ============================================================================
// Extended Types
// ============================================================================

export interface JHAWithDailyReports extends JSAWithDetails {
  daily_report_links: DailyReportLink[];
}

export interface DailyReportLink {
  id: string;
  jha_id: string;
  daily_report_id: string;
  linked_at: string;
  linked_by: string;
  daily_report?: {
    id: string;
    report_date: string;
    status: string;
  };
}

export interface JHAStatistics {
  total_jhas: number;
  pending_review: number;
  approved: number;
  in_progress: number;
  completed: number;
  high_risk_count: number;
  critical_risk_count: number;
  avg_hazards_per_jha: number;
  total_acknowledgments: number;
  workers_without_acknowledgment: number;
  completion_rate: number;
}

export interface JHATemplateCategory {
  category: string;
  templates: JSATemplate[];
  count: number;
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch JHAs with optional filters
 */
export function useJHAs(filters?: JSAFilters) {
  return useQuery({
    queryKey: jhaKeys.lists(filters),
    queryFn: async (): Promise<JSAWithDetails[]> => {
      let query = db
        .from('job_safety_analyses')
        .select(`
          *,
          project:projects(id, name, project_number),
          template:jsa_templates(id, name, category),
          hazards:jsa_hazards(count),
          acknowledgments:jsa_acknowledgments(count),
          created_by_user:profiles!job_safety_analyses_created_by_fkey(id, full_name, email),
          supervisor_user:profiles!job_safety_analyses_supervisor_id_fkey(id, full_name, email)
        `)
        .order('scheduled_date', { ascending: false });

      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.supervisorId) {
        query = query.eq('supervisor_id', filters.supervisorId);
      }
      if (filters?.scheduledFrom) {
        query = query.gte('scheduled_date', filters.scheduledFrom);
      }
      if (filters?.scheduledTo) {
        query = query.lte('scheduled_date', filters.scheduledTo);
      }
      if (filters?.riskLevel) {
        // Filter by max hazard risk level
        query = query.eq('max_risk_level', filters.riskLevel);
      }
      if (filters?.search) {
        query = query.or(`
          jsa_number.ilike.%${filters.search}%,
          task_description.ilike.%${filters.search}%,
          work_location.ilike.%${filters.search}%
        `);
      }

      const { data, error } = await query;
      if (error) {throw error;}

      return (data || []).map((jha: any) => ({
        ...jha,
        hazard_count: jha.hazards?.[0]?.count || 0,
        acknowledgment_count: jha.acknowledgments?.[0]?.count || 0,
        hazards: [],
        acknowledgments: [],
        attachments: [],
      }));
    },
  });
}

/**
 * Fetch a single JHA with all details
 */
export function useJHA(jhaId: string) {
  return useQuery({
    queryKey: jhaKeys.detail(jhaId),
    queryFn: async (): Promise<JHAWithDailyReports> => {
      const { data, error } = await db
        .from('job_safety_analyses')
        .select(`
          *,
          project:projects(id, name, project_number),
          template:jsa_templates(id, name, category),
          created_by_user:profiles!job_safety_analyses_created_by_fkey(id, full_name, email),
          supervisor_user:profiles!job_safety_analyses_supervisor_id_fkey(id, full_name, email),
          reviewed_by_user:profiles!job_safety_analyses_reviewed_by_fkey(id, full_name, email),
          hazards:jsa_hazards(*),
          acknowledgments:jsa_acknowledgments(*),
          attachments:jsa_attachments(*)
        `)
        .eq('id', jhaId)
        .single();

      if (error) {throw error;}

      // Sort hazards by step number
      if (data.hazards) {
        data.hazards.sort((a: JSAHazard, b: JSAHazard) => a.step_number - b.step_number);
      }

      // Fetch daily report links
      const { data: links } = await db
        .from('jha_daily_report_links')
        .select(`
          *,
          daily_report:daily_reports(id, report_date, status)
        `)
        .eq('jha_id', jhaId);

      return {
        ...data,
        daily_report_links: links || [],
      } as JHAWithDailyReports;
    },
    enabled: !!jhaId,
  });
}

/**
 * Fetch hazards for a JHA with control measures
 */
export function useJHAHazards(jhaId: string) {
  return useQuery({
    queryKey: jhaKeys.hazards(jhaId),
    queryFn: async (): Promise<JSAHazard[]> => {
      const { data, error } = await db
        .from('jsa_hazards')
        .select(`
          *,
          responsible_party_user:profiles!jsa_hazards_responsible_party_id_fkey(id, full_name, email),
          verified_by_user:profiles!jsa_hazards_verified_by_fkey(id, full_name, email)
        `)
        .eq('jsa_id', jhaId)
        .order('step_number');

      if (error) {throw error;}
      return (data || []) as JSAHazard[];
    },
    enabled: !!jhaId,
  });
}

/**
 * Fetch acknowledgments for a JHA
 */
export function useJHAAcknowledgments(jhaId: string) {
  return useQuery({
    queryKey: jhaKeys.acknowledgments(jhaId),
    queryFn: async (): Promise<JSAAcknowledgment[]> => {
      const { data, error } = await db
        .from('jsa_acknowledgments')
        .select(`
          *,
          user:profiles!jsa_acknowledgments_user_id_fkey(id, full_name, email)
        `)
        .eq('jsa_id', jhaId)
        .order('acknowledged_at', { ascending: false });

      if (error) {throw error;}
      return (data || []) as JSAAcknowledgment[];
    },
    enabled: !!jhaId,
  });
}

/**
 * Fetch JHA templates grouped by category
 */
export function useJHATemplatesByCategory() {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: jhaKeys.templates(),
    queryFn: async (): Promise<JHATemplateCategory[]> => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      const { data, error } = await db
        .from('jsa_templates')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('is_active', true)
        .order('category')
        .order('name');

      if (error) {throw error;}

      // Group by category
      const categoryMap = new Map<string, JSATemplate[]>();
      (data || []).forEach((template: JSATemplate) => {
        const category = template.category || 'General';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)!.push(template);
      });

      return Array.from(categoryMap.entries()).map(([category, templates]) => ({
        category,
        templates,
        count: templates.length,
      }));
    },
    enabled: !!userProfile?.company_id,
  });
}

/**
 * Fetch JHA statistics for a project
 */
export function useJHAStatistics(projectId: string) {
  return useQuery({
    queryKey: jhaKeys.projectStats(projectId),
    queryFn: async (): Promise<JHAStatistics> => {
      // Get all JHAs for project
      const { data: jhas, error: jhaError } = await db
        .from('job_safety_analyses')
        .select(`
          id,
          status,
          hazards:jsa_hazards(risk_level),
          acknowledgments:jsa_acknowledgments(id)
        `)
        .eq('project_id', projectId);

      if (jhaError) {throw jhaError;}

      const stats: JHAStatistics = {
        total_jhas: jhas?.length || 0,
        pending_review: 0,
        approved: 0,
        in_progress: 0,
        completed: 0,
        high_risk_count: 0,
        critical_risk_count: 0,
        avg_hazards_per_jha: 0,
        total_acknowledgments: 0,
        workers_without_acknowledgment: 0,
        completion_rate: 0,
      };

      let totalHazards = 0;

      (jhas || []).forEach((jha: any) => {
        // Count by status
        switch (jha.status) {
          case 'pending_review':
            stats.pending_review++;
            break;
          case 'approved':
            stats.approved++;
            break;
          case 'in_progress':
            stats.in_progress++;
            break;
          case 'completed':
            stats.completed++;
            break;
        }

        // Count hazards
        const hazards = jha.hazards || [];
        totalHazards += hazards.length;

        // Check for high/critical risk
        hazards.forEach((h: { risk_level: RiskLevel }) => {
          if (h.risk_level === 'high') {stats.high_risk_count++;}
          if (h.risk_level === 'critical') {stats.critical_risk_count++;}
        });

        // Count acknowledgments
        stats.total_acknowledgments += (jha.acknowledgments || []).length;
      });

      stats.avg_hazards_per_jha = stats.total_jhas > 0
        ? Math.round((totalHazards / stats.total_jhas) * 10) / 10
        : 0;
      stats.completion_rate = stats.total_jhas > 0
        ? Math.round((stats.completed / stats.total_jhas) * 100)
        : 0;

      return stats;
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch JHAs with pending acknowledgments
 */
export function usePendingAcknowledgments(projectId: string) {
  return useQuery({
    queryKey: jhaKeys.pendingAcknowledgments(projectId),
    queryFn: async () => {
      const { data, error } = await db
        .from('job_safety_analyses')
        .select(`
          *,
          hazards:jsa_hazards(count),
          acknowledgments:jsa_acknowledgments(count)
        `)
        .eq('project_id', projectId)
        .in('status', ['approved', 'in_progress'])
        .order('scheduled_date');

      if (error) {throw error;}

      // Filter to JHAs where expected workers > acknowledgments
      // This would need to be enhanced with crew size data
      return (data || []).map((jha: any) => ({
        ...jha,
        hazard_count: jha.hazards?.[0]?.count || 0,
        acknowledgment_count: jha.acknowledgments?.[0]?.count || 0,
      }));
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new JHA
 */
export function useCreateJHA() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (dto: CreateJSADTO): Promise<JobSafetyAnalysis> => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      const { data: jha, error: jhaError } = await db
        .from('job_safety_analyses')
        .insert({
          company_id: userProfile.company_id,
          project_id: dto.project_id,
          template_id: dto.template_id || null,
          task_description: dto.task_description,
          work_location: dto.work_location || null,
          equipment_used: dto.equipment_used || null,
          scheduled_date: dto.scheduled_date,
          start_time: dto.start_time || null,
          estimated_duration: dto.estimated_duration || null,
          supervisor_id: dto.supervisor_id || null,
          supervisor_name: dto.supervisor_name || null,
          foreman_name: dto.foreman_name || null,
          contractor_company: dto.contractor_company || null,
          weather_conditions: dto.weather_conditions || null,
          temperature: dto.temperature || null,
          status: 'draft',
          created_by: userProfile.id,
        })
        .select()
        .single();

      if (jhaError) {throw jhaError;}

      // Add hazards if provided
      if (dto.hazards && dto.hazards.length > 0) {
        const hazardInserts = dto.hazards.map((h, index) => ({
          jsa_id: jha.id,
          step_number: h.step_number || index + 1,
          step_description: h.step_description,
          hazard_description: h.hazard_description,
          hazard_type: h.hazard_type || null,
          risk_level: h.risk_level || 'medium',
          probability: h.probability || null,
          severity: h.severity || null,
          elimination_controls: h.elimination_controls || null,
          substitution_controls: h.substitution_controls || null,
          engineering_controls: h.engineering_controls || null,
          administrative_controls: h.administrative_controls || null,
          ppe_required: h.ppe_required || null,
          responsible_party: h.responsible_party || null,
          responsible_party_id: h.responsible_party_id || null,
          notes: h.notes || null,
        }));

        const { error: hazardsError } = await db
          .from('jsa_hazards')
          .insert(hazardInserts);

        if (hazardsError) {throw hazardsError;}
      }

      return jha as JobSafetyAnalysis;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jhaKeys.all });
      showToast({
        type: 'success',
        title: 'JHA Created',
        message: `JHA ${data.jsa_number} has been created.`,
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to create JHA',
      });
    },
  });
}

/**
 * Update a JHA
 */
export function useUpdateJHA() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdateJSADTO & { id: string }): Promise<JobSafetyAnalysis> => {
      const { data, error } = await db
        .from('job_safety_analyses')
        .update(dto)
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}
      return data as JobSafetyAnalysis;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jhaKeys.all });
      queryClient.invalidateQueries({ queryKey: jhaKeys.detail(data.id) });
      showToast({
        type: 'success',
        title: 'JHA Updated',
        message: 'The JHA has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update JHA',
      });
    },
  });
}

/**
 * Add a hazard step to JHA
 */
export function useAddJHAHazard() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (dto: CreateJSAHazardDTO & { jsa_id: string }): Promise<JSAHazard> => {
      // Get current max step number
      const { data: existing } = await db
        .from('jsa_hazards')
        .select('step_number')
        .eq('jsa_id', dto.jsa_id)
        .order('step_number', { ascending: false })
        .limit(1);

      const nextStepNumber = dto.step_number || ((existing?.[0]?.step_number || 0) + 1);

      const { data, error } = await db
        .from('jsa_hazards')
        .insert({
          jsa_id: dto.jsa_id,
          step_number: nextStepNumber,
          step_description: dto.step_description,
          hazard_description: dto.hazard_description,
          hazard_type: dto.hazard_type || null,
          risk_level: dto.risk_level || 'medium',
          probability: dto.probability || null,
          severity: dto.severity || null,
          elimination_controls: dto.elimination_controls || null,
          substitution_controls: dto.substitution_controls || null,
          engineering_controls: dto.engineering_controls || null,
          administrative_controls: dto.administrative_controls || null,
          ppe_required: dto.ppe_required || null,
          responsible_party: dto.responsible_party || null,
          responsible_party_id: dto.responsible_party_id || null,
          notes: dto.notes || null,
        })
        .select()
        .single();

      if (error) {throw error;}
      return data as JSAHazard;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: jhaKeys.hazards(variables.jsa_id) });
      queryClient.invalidateQueries({ queryKey: jhaKeys.detail(variables.jsa_id) });
      showToast({
        type: 'success',
        title: 'Hazard Added',
        message: 'The hazard step has been added.',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to add hazard',
      });
    },
  });
}

/**
 * Add worker acknowledgment with signature
 */
export function useAddJHAAcknowledgment() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (dto: CreateJSAAcknowledgmentDTO): Promise<JSAAcknowledgment> => {
      const { data, error } = await db
        .from('jsa_acknowledgments')
        .insert({
          jsa_id: dto.jsa_id,
          user_id: dto.user_id || null,
          worker_name: dto.worker_name,
          worker_company: dto.worker_company || null,
          worker_trade: dto.worker_trade || null,
          worker_badge_number: dto.worker_badge_number || null,
          signature_data: dto.signature_data || null,
          understands_hazards: dto.understands_hazards ?? true,
          has_questions: dto.has_questions ?? false,
          questions_notes: dto.questions_notes || null,
        })
        .select()
        .single();

      if (error) {throw error;}
      return data as JSAAcknowledgment;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: jhaKeys.acknowledgments(variables.jsa_id) });
      queryClient.invalidateQueries({ queryKey: jhaKeys.detail(variables.jsa_id) });
      showToast({
        type: 'success',
        title: 'Acknowledgment Recorded',
        message: `${data.worker_name} has acknowledged the JHA.`,
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to record acknowledgment',
      });
    },
  });
}

/**
 * Bulk add worker acknowledgments
 */
export function useBulkAddAcknowledgments() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      jsa_id,
      acknowledgments,
    }: {
      jsa_id: string;
      acknowledgments: Omit<CreateJSAAcknowledgmentDTO, 'jsa_id'>[];
    }): Promise<JSAAcknowledgment[]> => {
      const inserts = acknowledgments.map((ack) => ({
        jsa_id,
        user_id: ack.user_id || null,
        worker_name: ack.worker_name,
        worker_company: ack.worker_company || null,
        worker_trade: ack.worker_trade || null,
        worker_badge_number: ack.worker_badge_number || null,
        signature_data: ack.signature_data || null,
        understands_hazards: ack.understands_hazards ?? true,
        has_questions: ack.has_questions ?? false,
        questions_notes: ack.questions_notes || null,
      }));

      const { data, error } = await db
        .from('jsa_acknowledgments')
        .insert(inserts)
        .select();

      if (error) {throw error;}
      return data as JSAAcknowledgment[];
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: jhaKeys.acknowledgments(variables.jsa_id) });
      queryClient.invalidateQueries({ queryKey: jhaKeys.detail(variables.jsa_id) });
      showToast({
        type: 'success',
        title: 'Acknowledgments Recorded',
        message: `${data.length} workers have acknowledged the JHA.`,
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to record acknowledgments',
      });
    },
  });
}

/**
 * Link JHA to daily report
 */
export function useLinkJHAToDailyReport() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      jha_id,
      daily_report_id,
    }: {
      jha_id: string;
      daily_report_id: string;
    }): Promise<DailyReportLink> => {
      const { data, error } = await db
        .from('jha_daily_report_links')
        .insert({
          jha_id,
          daily_report_id,
          linked_by: userProfile?.id,
        })
        .select()
        .single();

      if (error) {throw error;}
      return data as DailyReportLink;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: jhaKeys.detail(variables.jha_id) });
      queryClient.invalidateQueries({ queryKey: jhaKeys.dailyReportLinks(variables.jha_id) });
      showToast({
        type: 'success',
        title: 'JHA Linked',
        message: 'JHA has been linked to the daily report.',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to link JHA to daily report',
      });
    },
  });
}

/**
 * Apply template to JHA
 */
export function useApplyJHATemplate() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      jha_id,
      template_id,
    }: {
      jha_id: string;
      template_id: string;
    }): Promise<void> => {
      // Get template with hazards
      const { data: template, error: templateError } = await db
        .from('jsa_templates')
        .select('*')
        .eq('id', template_id)
        .single();

      if (templateError) {throw templateError;}

      // Update JHA with template reference
      const { error: updateError } = await db
        .from('job_safety_analyses')
        .update({ template_id })
        .eq('id', jha_id);

      if (updateError) {throw updateError;}

      // Add default hazards from template
      if (template.default_hazards && template.default_hazards.length > 0) {
        const hazardInserts = template.default_hazards.map((h: any, index: number) => ({
          jsa_id: jha_id,
          step_number: index + 1,
          step_description: '',
          hazard_description: h.hazard,
          risk_level: h.risk_level || 'medium',
          ppe_required: h.ppe || [],
          administrative_controls: h.controls?.join('\n') || null,
        }));

        const { error: hazardsError } = await db
          .from('jsa_hazards')
          .insert(hazardInserts);

        if (hazardsError) {throw hazardsError;}
      }

      // Increment template usage count
      await db
        .from('jsa_templates')
        .update({ usage_count: (template.usage_count || 0) + 1 })
        .eq('id', template_id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: jhaKeys.detail(variables.jha_id) });
      queryClient.invalidateQueries({ queryKey: jhaKeys.hazards(variables.jha_id) });
      queryClient.invalidateQueries({ queryKey: jhaKeys.templates() });
      showToast({
        type: 'success',
        title: 'Template Applied',
        message: 'Template hazards have been added to the JHA.',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to apply template',
      });
    },
  });
}

/**
 * Submit JHA for review
 */
export function useSubmitJHAForReview() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (jhaId: string): Promise<JobSafetyAnalysis> => {
      const { data, error } = await db
        .from('job_safety_analyses')
        .update({ status: 'pending_review' })
        .eq('id', jhaId)
        .eq('status', 'draft')
        .select()
        .single();

      if (error) {throw error;}
      return data as JobSafetyAnalysis;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jhaKeys.all });
      queryClient.invalidateQueries({ queryKey: jhaKeys.detail(data.id) });
      showToast({
        type: 'success',
        title: 'JHA Submitted',
        message: `JHA ${data.jsa_number} has been submitted for review.`,
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to submit JHA for review',
      });
    },
  });
}

/**
 * Approve JHA
 */
export function useApproveJHA() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      jhaId,
      notes,
    }: {
      jhaId: string;
      notes?: string;
    }): Promise<JobSafetyAnalysis> => {
      const { data, error } = await db
        .from('job_safety_analyses')
        .update({
          status: 'approved',
          reviewed_by: userProfile?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
        })
        .eq('id', jhaId)
        .eq('status', 'pending_review')
        .select()
        .single();

      if (error) {throw error;}
      return data as JobSafetyAnalysis;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jhaKeys.all });
      queryClient.invalidateQueries({ queryKey: jhaKeys.detail(data.id) });
      showToast({
        type: 'success',
        title: 'JHA Approved',
        message: `JHA ${data.jsa_number} has been approved.`,
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to approve JHA',
      });
    },
  });
}

/**
 * Complete JHA
 */
export function useCompleteJHA() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      jhaId,
      notes,
    }: {
      jhaId: string;
      notes?: string;
    }): Promise<JobSafetyAnalysis> => {
      const { data, error } = await db
        .from('job_safety_analyses')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString().split('T')[0],
          completion_notes: notes || null,
        })
        .eq('id', jhaId)
        .eq('status', 'in_progress')
        .select()
        .single();

      if (error) {throw error;}
      return data as JobSafetyAnalysis;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jhaKeys.all });
      queryClient.invalidateQueries({ queryKey: jhaKeys.detail(data.id) });
      showToast({
        type: 'success',
        title: 'JHA Completed',
        message: `JHA ${data.jsa_number} has been marked as completed.`,
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to complete JHA',
      });
    },
  });
}
