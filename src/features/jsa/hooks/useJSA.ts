/**
 * JSA (Job Safety Analysis) Hooks
 * React Query hooks for managing job safety analyses
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import type {
  JobSafetyAnalysis,
  JSAWithDetails,
  JSAHazard,
  JSAAcknowledgment,
  JSAAttachment,
  JSATemplate,
  JSATemplateWithDetails,
  CreateJSADTO,
  UpdateJSADTO,
  CreateJSAHazardDTO,
  UpdateJSAHazardDTO,
  CreateJSAAcknowledgmentDTO,
  CreateJSATemplateDTO,
  JSAFilters,
  JSATemplateFilters,
  JSAStatistics,
} from '@/types/jsa';

// Use any type workaround for tables not in generated types yet
const db = supabase as any;

// Query keys
export const jsaKeys = {
  all: ['jsa'] as const,
  lists: (filters?: JSAFilters) => [...jsaKeys.all, 'list', filters] as const,
  list: (id: string) => [...jsaKeys.all, 'detail', id] as const,
  hazards: (jsaId: string) => [...jsaKeys.all, 'hazards', jsaId] as const,
  acknowledgments: (jsaId: string) => [...jsaKeys.all, 'acknowledgments', jsaId] as const,
  attachments: (jsaId: string) => [...jsaKeys.all, 'attachments', jsaId] as const,
  templates: (filters?: JSATemplateFilters) => [...jsaKeys.all, 'templates', filters] as const,
  template: (id: string) => [...jsaKeys.all, 'template', id] as const,
  stats: (projectId: string) => [...jsaKeys.all, 'stats', projectId] as const,
  nextNumber: (projectId: string) => [...jsaKeys.all, 'next-number', projectId] as const,
};

/**
 * Fetch JSAs with optional filters
 */
export function useJSAs(filters?: JSAFilters) {
  return useQuery({
    queryKey: jsaKeys.lists(filters),
    queryFn: async (): Promise<JSAWithDetails[]> => {
      let query = db
        .from('job_safety_analyses')
        .select(`
          *,
          project:projects(id, name, project_number),
          template:jsa_templates(id, name),
          hazards:jsa_hazards(count),
          acknowledgments:jsa_acknowledgments(count),
          created_by_user:profiles!job_safety_analyses_created_by_fkey(id, full_name, email),
          supervisor_user:profiles!job_safety_analyses_supervisor_id_fkey(id, full_name, email)
        `)
        .order('scheduled_date', { ascending: false });

      // Project filter
      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId);
      }

      // Status filter
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      // Supervisor filter
      if (filters?.supervisorId) {
        query = query.eq('supervisor_id', filters.supervisorId);
      }

      // Date range filters
      if (filters?.scheduledFrom) {
        query = query.gte('scheduled_date', filters.scheduledFrom);
      }
      if (filters?.scheduledTo) {
        query = query.lte('scheduled_date', filters.scheduledTo);
      }

      // Search filter
      if (filters?.search) {
        query = query.or(`
          jsa_number.ilike.%${filters.search}%,
          task_description.ilike.%${filters.search}%,
          work_location.ilike.%${filters.search}%
        `);
      }

      const { data, error } = await query;

      if (error) {throw error;}

      // Transform counts from arrays to numbers
      return (data || []).map((jsa: any) => ({
        ...jsa,
        hazard_count: jsa.hazards?.[0]?.count || 0,
        acknowledgment_count: jsa.acknowledgments?.[0]?.count || 0,
        hazards: [],
        acknowledgments: [],
        attachments: [],
      }));
    },
    enabled: true,
  });
}

/**
 * Fetch a single JSA with all details
 */
export function useJSA(jsaId: string) {
  return useQuery({
    queryKey: jsaKeys.list(jsaId),
    queryFn: async (): Promise<JSAWithDetails> => {
      const { data, error } = await db
        .from('job_safety_analyses')
        .select(`
          *,
          project:projects(id, name, project_number),
          template:jsa_templates(id, name),
          created_by_user:profiles!job_safety_analyses_created_by_fkey(id, full_name, email),
          supervisor_user:profiles!job_safety_analyses_supervisor_id_fkey(id, full_name, email),
          reviewed_by_user:profiles!job_safety_analyses_reviewed_by_fkey(id, full_name, email),
          hazards:jsa_hazards(*),
          acknowledgments:jsa_acknowledgments(*),
          attachments:jsa_attachments(*)
        `)
        .eq('id', jsaId)
        .single();

      if (error) {throw error;}

      // Sort hazards by step number
      if (data.hazards) {
        data.hazards.sort((a: JSAHazard, b: JSAHazard) => a.step_number - b.step_number);
      }

      return data as JSAWithDetails;
    },
    enabled: !!jsaId,
  });
}

/**
 * Fetch hazards for a JSA
 */
export function useJSAHazards(jsaId: string) {
  return useQuery({
    queryKey: jsaKeys.hazards(jsaId),
    queryFn: async (): Promise<JSAHazard[]> => {
      const { data, error } = await db
        .from('jsa_hazards')
        .select('*')
        .eq('jsa_id', jsaId)
        .order('step_number');

      if (error) {throw error;}
      return (data || []) as JSAHazard[];
    },
    enabled: !!jsaId,
  });
}

/**
 * Fetch acknowledgments for a JSA
 */
export function useJSAAcknowledgments(jsaId: string) {
  return useQuery({
    queryKey: jsaKeys.acknowledgments(jsaId),
    queryFn: async (): Promise<JSAAcknowledgment[]> => {
      const { data, error } = await db
        .from('jsa_acknowledgments')
        .select('*')
        .eq('jsa_id', jsaId)
        .order('acknowledged_at', { ascending: false });

      if (error) {throw error;}
      return (data || []) as JSAAcknowledgment[];
    },
    enabled: !!jsaId,
  });
}

/**
 * Fetch JSA templates
 */
export function useJSATemplates(filters?: JSATemplateFilters) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: jsaKeys.templates(filters),
    queryFn: async (): Promise<JSATemplateWithDetails[]> => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      let query = db
        .from('jsa_templates')
        .select(`
          *,
          created_by_user:profiles!jsa_templates_created_by_fkey(id, full_name)
        `)
        .eq('company_id', userProfile.company_id)
        .eq('is_active', filters?.isActive ?? true)
        .order('name');

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {throw error;}
      return (data || []) as JSATemplateWithDetails[];
    },
    enabled: !!userProfile?.company_id,
  });
}

/**
 * Get next JSA number preview
 */
export function useNextJSANumber(projectId: string) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: jsaKeys.nextNumber(projectId),
    queryFn: async (): Promise<string> => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      const { data, error } = await db.rpc('get_next_jsa_number', {
        p_company_id: userProfile.company_id,
        p_project_id: projectId,
      });

      if (error) {throw error;}
      return data as string;
    },
    enabled: !!projectId && !!userProfile?.company_id,
  });
}

/**
 * Get JSA statistics for a project
 */
export function useJSAStatistics(projectId: string) {
  return useQuery({
    queryKey: jsaKeys.stats(projectId),
    queryFn: async (): Promise<JSAStatistics> => {
      const { data, error } = await db.rpc('get_jsa_statistics', {
        p_project_id: projectId,
      });

      if (error) {throw error;}
      return (data?.[0] || {
        total_jsas: 0,
        pending_review: 0,
        approved: 0,
        completed: 0,
        high_risk_count: 0,
        avg_hazards_per_jsa: 0,
        total_acknowledgments: 0,
      }) as JSAStatistics;
    },
    enabled: !!projectId,
  });
}

/**
 * Create a new JSA
 */
export function useCreateJSA() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: async (dto: CreateJSADTO): Promise<JobSafetyAnalysis> => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      // Create the JSA
      const { data: jsa, error: jsaError } = await db
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

      if (jsaError) {throw jsaError;}

      // Add hazards if provided
      if (dto.hazards && dto.hazards.length > 0) {
        const hazardInserts = dto.hazards.map((h, index) => ({
          jsa_id: jsa.id,
          step_number: index + 1,
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

      return jsa as JobSafetyAnalysis;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jsaKeys.all });
      queryClient.invalidateQueries({ queryKey: jsaKeys.nextNumber(data.project_id) });
    },
  });
}

/**
 * Update a JSA
 */
export function useUpdateJSA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...dto
    }: UpdateJSADTO & { id: string }): Promise<JobSafetyAnalysis> => {
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
      queryClient.invalidateQueries({ queryKey: jsaKeys.all });
      queryClient.invalidateQueries({ queryKey: jsaKeys.list(data.id) });
    },
  });
}

/**
 * Submit JSA for review
 */
export function useSubmitJSAForReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jsaId: string): Promise<JobSafetyAnalysis> => {
      const { data, error } = await db
        .from('job_safety_analyses')
        .update({ status: 'pending_review' })
        .eq('id', jsaId)
        .eq('status', 'draft')
        .select()
        .single();

      if (error) {throw error;}
      return data as JobSafetyAnalysis;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jsaKeys.all });
      queryClient.invalidateQueries({ queryKey: jsaKeys.list(data.id) });
    },
  });
}

/**
 * Approve a JSA
 */
export function useApproveJSA() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: async ({
      jsaId,
      notes,
    }: {
      jsaId: string;
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
        .eq('id', jsaId)
        .eq('status', 'pending_review')
        .select()
        .single();

      if (error) {throw error;}
      return data as JobSafetyAnalysis;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jsaKeys.all });
      queryClient.invalidateQueries({ queryKey: jsaKeys.list(data.id) });
    },
  });
}

/**
 * Start work (change status to in_progress)
 */
export function useStartJSAWork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jsaId: string): Promise<JobSafetyAnalysis> => {
      const { data, error } = await db
        .from('job_safety_analyses')
        .update({ status: 'in_progress' })
        .eq('id', jsaId)
        .eq('status', 'approved')
        .select()
        .single();

      if (error) {throw error;}
      return data as JobSafetyAnalysis;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jsaKeys.all });
      queryClient.invalidateQueries({ queryKey: jsaKeys.list(data.id) });
    },
  });
}

/**
 * Complete a JSA
 */
export function useCompleteJSA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jsaId,
      notes,
    }: {
      jsaId: string;
      notes?: string;
    }): Promise<JobSafetyAnalysis> => {
      const { data, error } = await db
        .from('job_safety_analyses')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString().split('T')[0],
          completion_notes: notes || null,
        })
        .eq('id', jsaId)
        .eq('status', 'in_progress')
        .select()
        .single();

      if (error) {throw error;}
      return data as JobSafetyAnalysis;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jsaKeys.all });
      queryClient.invalidateQueries({ queryKey: jsaKeys.list(data.id) });
    },
  });
}

/**
 * Cancel a JSA
 */
export function useCancelJSA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jsaId: string): Promise<JobSafetyAnalysis> => {
      const { data, error } = await db
        .from('job_safety_analyses')
        .update({ status: 'cancelled' })
        .eq('id', jsaId)
        .select()
        .single();

      if (error) {throw error;}
      return data as JobSafetyAnalysis;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: jsaKeys.all });
      queryClient.invalidateQueries({ queryKey: jsaKeys.list(data.id) });
    },
  });
}

/**
 * Delete a JSA (drafts only)
 */
export function useDeleteJSA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await db
        .from('job_safety_analyses')
        .delete()
        .eq('id', id)
        .eq('status', 'draft');

      if (error) {throw error;}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jsaKeys.all });
    },
  });
}

/**
 * Add a hazard to a JSA
 */
export function useAddJSAHazard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateJSAHazardDTO & { jsa_id: string }): Promise<JSAHazard> => {
      const { data, error } = await db
        .from('jsa_hazards')
        .insert({
          jsa_id: dto.jsa_id,
          step_number: dto.step_number || null, // Auto-generate if not provided
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
      queryClient.invalidateQueries({ queryKey: jsaKeys.hazards(variables.jsa_id) });
      queryClient.invalidateQueries({ queryKey: jsaKeys.list(variables.jsa_id) });
    },
  });
}

/**
 * Update a hazard
 */
export function useUpdateJSAHazard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      jsa_id: _jsa_id,
      ...dto
    }: UpdateJSAHazardDTO & { id: string; jsa_id: string }): Promise<JSAHazard> => {
      const { data, error } = await db
        .from('jsa_hazards')
        .update(dto)
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}
      return data as JSAHazard;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: jsaKeys.hazards(variables.jsa_id) });
      queryClient.invalidateQueries({ queryKey: jsaKeys.list(variables.jsa_id) });
    },
  });
}

/**
 * Verify hazard controls
 */
export function useVerifyHazardControls() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: async ({
      hazardId,
      jsaId: _jsaId,
    }: {
      hazardId: string;
      jsaId: string;
    }): Promise<JSAHazard> => {
      const { data, error } = await db
        .from('jsa_hazards')
        .update({
          controls_verified: true,
          verified_by: userProfile?.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', hazardId)
        .select()
        .single();

      if (error) {throw error;}
      return data as JSAHazard;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: jsaKeys.hazards(variables.jsaId) });
      queryClient.invalidateQueries({ queryKey: jsaKeys.list(variables.jsaId) });
    },
  });
}

/**
 * Remove a hazard from a JSA
 */
export function useRemoveJSAHazard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      hazardId,
      jsaId: _jsaId,
    }: {
      hazardId: string;
      jsaId: string;
    }): Promise<void> => {
      const { error } = await db
        .from('jsa_hazards')
        .delete()
        .eq('id', hazardId);

      if (error) {throw error;}
    },
    onSuccess: (_, { jsaId }) => {
      queryClient.invalidateQueries({ queryKey: jsaKeys.hazards(jsaId) });
      queryClient.invalidateQueries({ queryKey: jsaKeys.list(jsaId) });
    },
  });
}

/**
 * Add an acknowledgment to a JSA
 */
export function useAddJSAAcknowledgment() {
  const queryClient = useQueryClient();

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: jsaKeys.acknowledgments(variables.jsa_id) });
      queryClient.invalidateQueries({ queryKey: jsaKeys.list(variables.jsa_id) });
    },
  });
}

/**
 * Remove an acknowledgment
 */
export function useRemoveJSAAcknowledgment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      acknowledgmentId,
      jsaId: _jsaId,
    }: {
      acknowledgmentId: string;
      jsaId: string;
    }): Promise<void> => {
      const { error } = await db
        .from('jsa_acknowledgments')
        .delete()
        .eq('id', acknowledgmentId);

      if (error) {throw error;}
    },
    onSuccess: (_, { jsaId }) => {
      queryClient.invalidateQueries({ queryKey: jsaKeys.acknowledgments(jsaId) });
      queryClient.invalidateQueries({ queryKey: jsaKeys.list(jsaId) });
    },
  });
}

/**
 * Create a JSA template
 */
export function useCreateJSATemplate() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: async (dto: CreateJSATemplateDTO): Promise<JSATemplate> => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      const { data, error } = await db
        .from('jsa_templates')
        .insert({
          company_id: userProfile.company_id,
          name: dto.name,
          description: dto.description || null,
          category: dto.category || null,
          work_type: dto.work_type || null,
          default_hazards: dto.default_hazards || [],
          required_training: dto.required_training || null,
          osha_standards: dto.osha_standards || null,
          other_references: dto.other_references || null,
          created_by: userProfile.id,
        })
        .select()
        .single();

      if (error) {throw error;}
      return data as JSATemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jsaKeys.templates() });
    },
  });
}

/**
 * Upload attachment to a JSA
 */
export function useUploadJSAAttachment() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: async ({
      jsaId,
      file,
      attachmentType,
      description,
    }: {
      jsaId: string;
      file: File;
      attachmentType?: string;
      description?: string;
    }): Promise<JSAAttachment> => {
      // Upload file to storage
      const filePath = `jsa/${jsaId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {throw uploadError;}

      // Create attachment record
      const { data, error } = await db
        .from('jsa_attachments')
        .insert({
          jsa_id: jsaId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          attachment_type: attachmentType || null,
          uploaded_by: userProfile?.id,
          description: description || null,
        })
        .select()
        .single();

      if (error) {throw error;}
      return data as JSAAttachment;
    },
    onSuccess: (_, { jsaId }) => {
      queryClient.invalidateQueries({ queryKey: jsaKeys.attachments(jsaId) });
      queryClient.invalidateQueries({ queryKey: jsaKeys.list(jsaId) });
    },
  });
}

/**
 * Delete an attachment
 */
export function useDeleteJSAAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attachmentId,
      jsaId: _jsaId,
      filePath,
    }: {
      attachmentId: string;
      jsaId: string;
      filePath: string;
    }): Promise<void> => {
      // Delete from storage
      await supabase.storage.from('documents').remove([filePath]);

      // Delete record
      const { error } = await db
        .from('jsa_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) {throw error;}
    },
    onSuccess: (_, { jsaId }) => {
      queryClient.invalidateQueries({ queryKey: jsaKeys.attachments(jsaId) });
      queryClient.invalidateQueries({ queryKey: jsaKeys.list(jsaId) });
    },
  });
}
