/**
 * Distribution Lists Hooks
 * React Query hooks for managing distribution lists
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import type {
  DistributionList,
  DistributionListWithCount,
  DistributionListWithMembers,
  DistributionListMember,
  DistributionListMemberWithUser,
  CreateDistributionListDTO,
  UpdateDistributionListDTO,
  CreateDistributionListMemberDTO,
  UpdateDistributionListMemberDTO,
  DistributionListFilters,
  ExpandedRecipient,
} from '@/types/distribution-list';

// Use any type workaround for tables not in generated types yet
const db = supabase as any;

// Query keys
export const distributionListKeys = {
  all: ['distribution-lists'] as const,
  lists: (filters?: DistributionListFilters) => [...distributionListKeys.all, 'list', filters] as const,
  list: (id: string) => [...distributionListKeys.all, 'detail', id] as const,
  members: (_listId: string) => [...distributionListKeys.all, 'members', _listId] as const,
  forProject: (projectId: string, listType?: string) =>
    [...distributionListKeys.all, 'project', projectId, listType] as const,
  expand: (listIds: string[], userIds: string[]) =>
    [...distributionListKeys.all, 'expand', listIds, userIds] as const,
};

/**
 * Fetch distribution lists with optional filters
 */
export function useDistributionLists(filters?: DistributionListFilters) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: distributionListKeys.lists(filters),
    queryFn: async (): Promise<DistributionListWithCount[]> => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      let query = db
        .from('distribution_lists')
        .select(`
          *,
          members:distribution_list_members(count)
        `)
        .eq('company_id', userProfile.company_id)
        .order('name');

      // Active filter
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      } else {
        // Default to active only
        query = query.eq('is_active', true);
      }

      // Project filter
      if (filters?.projectId) {
        // Include both project-specific and company-wide lists
        query = query.or(`project_id.eq.${filters.projectId},project_id.is.null`);
      } else if (filters?.projectId === null) {
        // Company-wide only
        query = query.is('project_id', null);
      }

      // List type filter
      if (filters?.listType) {
        query = query.eq('list_type', filters.listType);
      }

      // Default filter
      if (filters?.isDefault !== undefined) {
        query = query.eq('is_default', filters.isDefault);
      }

      // Search filter
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {throw error;}

      // Transform counts from arrays to numbers
      return (data || []).map((list: any) => ({
        ...list,
        member_count: list.members?.[0]?.count || 0,
      }));
    },
    enabled: !!userProfile?.company_id,
  });
}

/**
 * Fetch distribution lists for a specific project (including company-wide)
 */
export function useProjectDistributionLists(projectId: string, listType?: string) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: distributionListKeys.forProject(projectId, listType),
    queryFn: async (): Promise<DistributionListWithCount[]> => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      let query = db
        .from('distribution_lists')
        .select(`
          *,
          members:distribution_list_members(count)
        `)
        .eq('company_id', userProfile.company_id)
        .eq('is_active', true)
        .or(`project_id.eq.${projectId},project_id.is.null`)
        .order('is_default', { ascending: false })
        .order('name');

      if (listType) {
        query = query.or(`list_type.eq.${listType},list_type.eq.general`);
      }

      const { data, error } = await query;

      if (error) {throw error;}

      return (data || []).map((list: any) => ({
        ...list,
        member_count: list.members?.[0]?.count || 0,
      }));
    },
    enabled: !!projectId && !!userProfile?.company_id,
  });
}

/**
 * Fetch a single distribution list with all details
 */
export function useDistributionList(listId: string) {
  return useQuery({
    queryKey: distributionListKeys.list(listId),
    queryFn: async (): Promise<DistributionListWithMembers> => {
      const { data, error } = await db
        .from('distribution_lists')
        .select(`
          *,
          members:distribution_list_members(
            *,
            user:profiles!distribution_list_members_user_id_fkey(
              id, full_name, email, avatar_url
            )
          ),
          created_by_user:profiles!distribution_lists_created_by_fkey(
            id, full_name, email
          ),
          project:projects(id, name)
        `)
        .eq('id', listId)
        .single();

      if (error) {throw error;}
      return data as DistributionListWithMembers;
    },
    enabled: !!listId,
  });
}

/**
 * Fetch members of a distribution list
 */
export function useDistributionListMembers(listId: string) {
  return useQuery({
    queryKey: distributionListKeys.members(listId),
    queryFn: async (): Promise<DistributionListMemberWithUser[]> => {
      const { data, error } = await db
        .from('distribution_list_members')
        .select(`
          *,
          user:profiles!distribution_list_members_user_id_fkey(
            id, full_name, email, avatar_url
          )
        `)
        .eq('list_id', listId)
        .order('member_role')
        .order('created_at');

      if (error) {throw error;}
      return (data || []) as DistributionListMemberWithUser[];
    },
    enabled: !!listId,
  });
}

/**
 * Expand distribution lists and ad-hoc users into recipients
 */
export function useExpandDistribution(listIds: string[], userIds: string[]) {
  return useQuery({
    queryKey: distributionListKeys.expand(listIds, userIds),
    queryFn: async (): Promise<ExpandedRecipient[]> => {
      const { data, error } = await db.rpc('expand_distribution', {
        p_list_ids: listIds,
        p_additional_user_ids: userIds,
      });

      if (error) {throw error;}

      return (data || []).map((r: any) => ({
        user_id: r.user_id,
        email: r.email,
        name: r.name,
        source: r.source,
        is_internal: r.user_id !== null,
      }));
    },
    enabled: listIds.length > 0 || userIds.length > 0,
  });
}

/**
 * Create a new distribution list
 */
export function useCreateDistributionList() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: async (dto: CreateDistributionListDTO): Promise<DistributionList> => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      // Create the list
      const { data: list, error: listError } = await db
        .from('distribution_lists')
        .insert({
          company_id: userProfile.company_id,
          project_id: dto.project_id || null,
          name: dto.name,
          description: dto.description || null,
          list_type: dto.list_type || 'general',
          is_default: dto.is_default || false,
          created_by: userProfile.id,
        })
        .select()
        .single();

      if (listError) {throw listError;}

      // Add members if provided
      if (dto.members && dto.members.length > 0) {
        const memberInserts = dto.members.map(m => ({
          list_id: list.id,
          user_id: m.user_id || null,
          external_email: m.external_email || null,
          external_name: m.external_name || null,
          external_company: m.external_company || null,
          member_role: m.member_role || 'cc',
          notify_email: m.notify_email ?? true,
          notify_in_app: m.notify_in_app ?? true,
          added_by: userProfile.id,
        }));

        const { error: membersError } = await db
          .from('distribution_list_members')
          .insert(memberInserts);

        if (membersError) {throw membersError;}
      }

      return list as DistributionList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: distributionListKeys.all });
    },
  });
}

/**
 * Update a distribution list
 */
export function useUpdateDistributionList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...dto
    }: UpdateDistributionListDTO & { id: string }): Promise<DistributionList> => {
      const { data, error } = await db
        .from('distribution_lists')
        .update(dto)
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}
      return data as DistributionList;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: distributionListKeys.all });
      queryClient.invalidateQueries({ queryKey: distributionListKeys.list(data.id) });
    },
  });
}

/**
 * Delete a distribution list
 */
export function useDeleteDistributionList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await db
        .from('distribution_lists')
        .delete()
        .eq('id', id);

      if (error) {throw error;}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: distributionListKeys.all });
    },
  });
}

/**
 * Add a member to a distribution list
 */
export function useAddDistributionListMember() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: async (
      dto: CreateDistributionListMemberDTO & { list_id: string }
    ): Promise<DistributionListMember> => {
      const { data, error } = await db
        .from('distribution_list_members')
        .insert({
          list_id: dto.list_id,
          user_id: dto.user_id || null,
          external_email: dto.external_email || null,
          external_name: dto.external_name || null,
          external_company: dto.external_company || null,
          member_role: dto.member_role || 'cc',
          notify_email: dto.notify_email ?? true,
          notify_in_app: dto.notify_in_app ?? true,
          added_by: userProfile?.id,
        })
        .select()
        .single();

      if (error) {throw error;}
      return data as DistributionListMember;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: distributionListKeys.members(variables.list_id) });
      queryClient.invalidateQueries({ queryKey: distributionListKeys.list(variables.list_id) });
      queryClient.invalidateQueries({ queryKey: distributionListKeys.all });
    },
  });
}

/**
 * Update a distribution list member
 */
export function useUpdateDistributionListMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      listId: _listId,
      ...dto
    }: UpdateDistributionListMemberDTO & { id: string; listId: string }): Promise<DistributionListMember> => {
      const { data, error } = await db
        .from('distribution_list_members')
        .update(dto)
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}
      return data as DistributionListMember;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: distributionListKeys.members(variables.listId) });
      queryClient.invalidateQueries({ queryKey: distributionListKeys.list(variables.listId) });
    },
  });
}

/**
 * Remove a member from a distribution list
 */
export function useRemoveDistributionListMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      listId: _listId,
    }: {
      memberId: string;
      listId: string;
    }): Promise<void> => {
      const { error } = await db
        .from('distribution_list_members')
        .delete()
        .eq('id', memberId);

      if (error) {throw error;}
    },
    onSuccess: (_, { listId }) => {
      queryClient.invalidateQueries({ queryKey: distributionListKeys.members(listId) });
      queryClient.invalidateQueries({ queryKey: distributionListKeys.list(listId) });
      queryClient.invalidateQueries({ queryKey: distributionListKeys.all });
    },
  });
}

/**
 * Get default distribution list for a project and type
 */
export function useDefaultDistributionList(projectId: string, listType: string) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: [...distributionListKeys.forProject(projectId, listType), 'default'],
    queryFn: async (): Promise<DistributionListWithMembers | null> => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      // Try project-specific default first
      const { data: projectDefault } = await db
        .from('distribution_lists')
        .select(`
          *,
          members:distribution_list_members(
            *,
            user:profiles!distribution_list_members_user_id_fkey(
              id, full_name, email, avatar_url
            )
          )
        `)
        .eq('company_id', userProfile.company_id)
        .eq('project_id', projectId)
        .eq('list_type', listType)
        .eq('is_default', true)
        .eq('is_active', true)
        .maybeSingle();

      if (projectDefault) {return projectDefault as DistributionListWithMembers;}

      // Fall back to company-wide default
      const { data: companyDefault } = await db
        .from('distribution_lists')
        .select(`
          *,
          members:distribution_list_members(
            *,
            user:profiles!distribution_list_members_user_id_fkey(
              id, full_name, email, avatar_url
            )
          )
        `)
        .eq('company_id', userProfile.company_id)
        .is('project_id', null)
        .eq('list_type', listType)
        .eq('is_default', true)
        .eq('is_active', true)
        .maybeSingle();

      return companyDefault as DistributionListWithMembers | null;
    },
    enabled: !!projectId && !!listType && !!userProfile?.company_id,
  });
}
