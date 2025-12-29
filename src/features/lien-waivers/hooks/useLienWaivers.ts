/**
 * Lien Waiver Hooks
 * React Query hooks for lien waiver management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import type {
  LienWaiver,
  LienWaiverWithDetails,
  LienWaiverTemplate,
  LienWaiverRequirement,
  LienWaiverFilters,
  LienWaiverTemplateFilters,
  CreateLienWaiverDTO,
  UpdateLienWaiverDTO,
  CreateLienWaiverTemplateDTO,
  UpdateLienWaiverTemplateDTO,
  CreateLienWaiverRequirementDTO,
  SendWaiverRequestDTO,
  SignWaiverDTO,
  NotarizeWaiverDTO,
  ApproveWaiverDTO,
  RejectWaiverDTO,
  ProjectWaiverSummary,
} from '@/types/lien-waiver';

// Query keys
export const lienWaiverKeys = {
  all: ['lien-waivers'] as const,
  lists: () => [...lienWaiverKeys.all, 'list'] as const,
  list: (filters: LienWaiverFilters) => [...lienWaiverKeys.lists(), filters] as const,
  details: () => [...lienWaiverKeys.all, 'detail'] as const,
  detail: (id: string) => [...lienWaiverKeys.details(), id] as const,
  history: (id: string) => [...lienWaiverKeys.all, 'history', id] as const,
  templates: () => [...lienWaiverKeys.all, 'templates'] as const,
  templateList: (filters: LienWaiverTemplateFilters) => [...lienWaiverKeys.templates(), filters] as const,
  template: (id: string) => [...lienWaiverKeys.templates(), id] as const,
  requirements: () => [...lienWaiverKeys.all, 'requirements'] as const,
  projectRequirements: (projectId: string) => [...lienWaiverKeys.requirements(), projectId] as const,
  summary: (projectId: string) => [...lienWaiverKeys.all, 'summary', projectId] as const,
  missing: (projectId?: string) => [...lienWaiverKeys.all, 'missing', projectId] as const,
};

// =============================================
// QUERIES
// =============================================

/**
 * Get lien waivers with optional filters
 */
export function useLienWaivers(filters: LienWaiverFilters = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: lienWaiverKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('lien_waivers' as any)
        .select(`
          *,
          project:projects(id, name, project_number),
          subcontractor:subcontractors(id, company_name, contact_name, contact_email),
          payment_application:payment_applications(id, application_number, current_payment_due)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.waiverType) {
        query = query.eq('waiver_type', filters.waiverType);
      }
      if (filters.subcontractorId) {
        query = query.eq('subcontractor_id', filters.subcontractorId);
      }
      if (filters.paymentApplicationId) {
        query = query.eq('payment_application_id', filters.paymentApplicationId);
      }
      if (filters.dueDateFrom) {
        query = query.gte('due_date', filters.dueDateFrom);
      }
      if (filters.dueDateTo) {
        query = query.lte('due_date', filters.dueDateTo);
      }

      const { data, error } = await query;
      if (error) {throw error;}
      return data as unknown as LienWaiverWithDetails[];
    },
    enabled: !!user,
  });
}

/**
 * Get single lien waiver by ID
 */
export function useLienWaiver(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: lienWaiverKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lien_waivers' as any)
        .select(`
          *,
          project:projects(id, name, project_number),
          subcontractor:subcontractors(id, company_name, contact_name, contact_email),
          payment_application:payment_applications(id, application_number, current_payment_due),
          template:lien_waiver_templates(id, name, state_code),
          created_by_user:users!created_by(id, full_name, email),
          approved_by_user:users!approved_by(id, full_name, email)
        `)
        .eq('id', id)
        .single();

      if (error) {throw error;}
      return data as unknown as LienWaiverWithDetails;
    },
    enabled: !!id && !!user,
  });
}

/**
 * Get lien waiver history
 */
export function useLienWaiverHistory(waiverId: string) {
  return useQuery({
    queryKey: lienWaiverKeys.history(waiverId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lien_waiver_history' as any)
        .select(`
          *,
          changed_by_user:users!changed_by(id, full_name, email)
        `)
        .eq('lien_waiver_id', waiverId)
        .order('changed_at', { ascending: false });

      if (error) {throw error;}
      return data as unknown as LienWaiverHistory[];
    },
    enabled: !!waiverId,
  });
}

/**
 * Get lien waiver templates
 */
export function useLienWaiverTemplates(filters: LienWaiverTemplateFilters = {}) {
  return useQuery({
    queryKey: lienWaiverKeys.templateList(filters),
    queryFn: async () => {
      let query = supabase
        .from('lien_waiver_templates' as any)
        .select('*')
        .order('state_code')
        .order('waiver_type');

      if (filters.stateCode) {
        query = query.eq('state_code', filters.stateCode);
      }
      if (filters.waiverType) {
        query = query.eq('waiver_type', filters.waiverType);
      }
      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      const { data, error } = await query;
      if (error) {throw error;}
      return data as unknown as LienWaiverTemplate[];
    },
  });
}

/**
 * Get single template by ID
 */
export function useLienWaiverTemplate(id: string) {
  return useQuery({
    queryKey: lienWaiverKeys.template(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lien_waiver_templates' as any)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {throw error;}
      return data as unknown as LienWaiverTemplate;
    },
    enabled: !!id,
  });
}

/**
 * Get lien waiver requirements for a project
 */
export function useLienWaiverRequirements(projectId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: lienWaiverKeys.projectRequirements(projectId || 'company'),
    queryFn: async () => {
      let query = supabase
        .from('lien_waiver_requirements' as any)
        .select('*')
        .eq('is_active', true);

      if (projectId) {
        query = query.or(`project_id.eq.${projectId},project_id.is.null`);
      }

      const { data, error } = await query;
      if (error) {throw error;}
      return data as unknown as LienWaiverRequirement[];
    },
    enabled: !!user,
  });
}

/**
 * Get project waiver summary
 */
export function useProjectWaiverSummary(projectId: string) {
  const { data: waivers } = useLienWaivers({ projectId });

  const summary: ProjectWaiverSummary = {
    total_waivers: waivers?.length || 0,
    pending_count: waivers?.filter(w => w.status === 'pending' || w.status === 'sent').length || 0,
    received_count: waivers?.filter(w => w.status === 'received' || w.status === 'under_review').length || 0,
    approved_count: waivers?.filter(w => w.status === 'approved').length || 0,
    missing_count: 0, // Would need separate query
    overdue_count: waivers?.filter(w => {
      if (!w.due_date) {return false;}
      if (w.status === 'approved' || w.status === 'void') {return false;}
      return new Date(w.due_date) < new Date();
    }).length || 0,
    total_waived_amount: waivers?.filter(w => w.status === 'approved').reduce((sum, w) => sum + (w.payment_amount || 0), 0) || 0,
  };

  return summary;
}

// =============================================
// MUTATIONS
// =============================================

/**
 * Create lien waiver
 */
export function useCreateLienWaiver() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (dto: CreateLienWaiverDTO) => {
      // Get next waiver number
      const { data: numberData } = await supabase.rpc('get_next_waiver_number' as any, {
        p_project_id: dto.project_id,
      });

      const waiver = {
        ...dto,
        waiver_number: numberData || `LW-${Date.now()}`,
        company_id: user?.user_metadata?.company_id,
        created_by: user?.id,
        status: 'pending',
      };

      const { data, error } = await supabase
        .from('lien_waivers' as any)
        .insert(waiver)
        .select()
        .single();

      if (error) {throw error;}

      // Log creation in history
      await supabase.from('lien_waiver_history' as any).insert({
        lien_waiver_id: (data as any).id,
        action: 'created',
        notes: `Waiver created for ${dto.vendor_name || 'vendor'}`,
        changed_by: user?.id,
      });

      return data as unknown as LienWaiver;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.lists() });
      if (variables.project_id) {
        queryClient.invalidateQueries({ queryKey: lienWaiverKeys.summary(variables.project_id) });
      }
    },
  });
}

/**
 * Update lien waiver
 */
export function useUpdateLienWaiver() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdateLienWaiverDTO & { id: string }) => {
      const { data, error } = await supabase
        .from('lien_waivers' as any)
        .update(dto)
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}
      return data as unknown as LienWaiver;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.lists() });
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.detail(data.id) });
    },
  });
}

/**
 * Delete (soft) lien waiver
 */
export function useDeleteLienWaiver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lien_waivers' as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {throw error;}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.lists() });
    },
  });
}

/**
 * Send waiver request
 */
export function useSendWaiverRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...dto }: SendWaiverRequestDTO & { id: string }) => {
      const { data, error } = await supabase
        .from('lien_waivers' as any)
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_to_email: dto.sent_to_email,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}

      // Log in history
      await supabase.from('lien_waiver_history' as any).insert({
        lien_waiver_id: id,
        action: 'sent',
        notes: `Waiver request sent to ${dto.sent_to_email}`,
        changed_by: user?.id,
      });

      return data as unknown as LienWaiver;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.lists() });
    },
  });
}

/**
 * Mark waiver as received
 */
export function useMarkWaiverReceived() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('lien_waivers' as any)
        .update({
          status: 'received',
          received_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}

      await supabase.from('lien_waiver_history' as any).insert({
        lien_waiver_id: id,
        action: 'received',
        changed_by: user?.id,
      });

      return data as unknown as LienWaiver;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.lists() });
    },
  });
}

/**
 * Sign waiver
 */
export function useSignWaiver() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...dto }: SignWaiverDTO & { id: string }) => {
      const { data, error } = await supabase
        .from('lien_waivers' as any)
        .update({
          ...dto,
          signed_at: new Date().toISOString(),
          status: 'under_review',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}
      return data as unknown as LienWaiver;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.lists() });
    },
  });
}

/**
 * Notarize waiver
 */
export function useNotarizeWaiver() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...dto }: NotarizeWaiverDTO & { id: string }) => {
      const { data, error } = await supabase
        .from('lien_waivers' as any)
        .update({
          ...dto,
          notarized_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}
      return data as unknown as LienWaiver;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.lists() });
    },
  });
}

/**
 * Approve waiver
 */
export function useApproveWaiver() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...dto }: ApproveWaiverDTO & { id: string }) => {
      const { data, error } = await supabase
        .from('lien_waivers' as any)
        .update({
          status: 'approved',
          review_notes: dto.review_notes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}
      return data as unknown as LienWaiver;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.lists() });
    },
  });
}

/**
 * Reject waiver
 */
export function useRejectWaiver() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...dto }: RejectWaiverDTO & { id: string }) => {
      const { data, error } = await supabase
        .from('lien_waivers' as any)
        .update({
          status: 'rejected',
          rejection_reason: dto.rejection_reason,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}
      return data as unknown as LienWaiver;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.lists() });
    },
  });
}

/**
 * Void waiver
 */
export function useVoidWaiver() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase
        .from('lien_waivers' as any)
        .update({
          status: 'void',
          notes: reason,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}

      await supabase.from('lien_waiver_history' as any).insert({
        lien_waiver_id: id,
        action: 'voided',
        notes: reason,
        changed_by: user?.id,
      });

      return data as unknown as LienWaiver;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.lists() });
    },
  });
}

// =============================================
// TEMPLATE MUTATIONS
// =============================================

/**
 * Create lien waiver template
 */
export function useCreateLienWaiverTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (dto: CreateLienWaiverTemplateDTO) => {
      const template = {
        ...dto,
        company_id: user?.user_metadata?.company_id,
        created_by: user?.id,
      };

      const { data, error } = await supabase
        .from('lien_waiver_templates' as any)
        .insert(template)
        .select()
        .single();

      if (error) {throw error;}
      return data as unknown as LienWaiverTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.templates() });
    },
  });
}

/**
 * Update lien waiver template
 */
export function useUpdateLienWaiverTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdateLienWaiverTemplateDTO & { id: string }) => {
      const { data, error } = await supabase
        .from('lien_waiver_templates' as any)
        .update(dto)
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}
      return data as unknown as LienWaiverTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.templates() });
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.template(data.id) });
    },
  });
}

// =============================================
// REQUIREMENT MUTATIONS
// =============================================

/**
 * Create lien waiver requirement
 */
export function useCreateLienWaiverRequirement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (dto: CreateLienWaiverRequirementDTO) => {
      const requirement = {
        ...dto,
        company_id: user?.user_metadata?.company_id,
        created_by: user?.id,
      };

      const { data, error } = await supabase
        .from('lien_waiver_requirements' as any)
        .insert(requirement)
        .select()
        .single();

      if (error) {throw error;}
      return data as unknown as LienWaiverRequirement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.requirements() });
    },
  });
}

// =============================================
// UTILITY HOOKS
// =============================================

/**
 * Render template with data
 */
export function useRenderWaiverTemplate() {
  return useMutation({
    mutationFn: async ({ templateId, data }: { templateId: string; data: Record<string, string> }) => {
      const { data: template, error } = await supabase
        .from('lien_waiver_templates' as any)
        .select('template_content')
        .eq('id', templateId)
        .single();

      if (error) {throw error;}

      // Replace placeholders
      let content = (template as any).template_content;
      Object.entries(data).forEach(([key, value]) => {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
      });

      return content;
    },
  });
}
