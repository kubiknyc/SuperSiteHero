/**
 * Permissions Hooks
 * React Query hooks for managing permissions, custom roles, and feature flags
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import type {
  Permission,
  CustomRole,
  CustomRoleWithPermissions,
  UserPermissionOverride,
  UserCustomRole,
  FeatureFlag,
  ResolvedPermission,
  CreateCustomRoleDTO,
  UpdateCustomRoleDTO,
  CreateUserPermissionOverrideDTO,
  AssignCustomRoleDTO,
  UpdateCompanyFeatureFlagDTO,
  DefaultRole,
} from '@/types/permissions';

// Use any type workaround for tables not in generated types yet
const db = supabase as any;

// =============================================
// Query Keys
// =============================================

export const permissionKeys = {
  all: ['permissions'] as const,
  definitions: () => [...permissionKeys.all, 'definitions'] as const,
  user: (userId: string, projectId?: string) =>
    [...permissionKeys.all, 'user', userId, projectId] as const,
  roles: {
    all: ['custom-roles'] as const,
    list: (companyId: string) => [...permissionKeys.roles.all, 'list', companyId] as const,
    detail: (roleId: string) => [...permissionKeys.roles.all, 'detail', roleId] as const,
  },
  overrides: {
    all: ['permission-overrides'] as const,
    user: (userId: string) => [...permissionKeys.overrides.all, 'user', userId] as const,
  },
  features: {
    all: ['feature-flags'] as const,
    definitions: () => [...permissionKeys.features.all, 'definitions'] as const,
    company: (companyId: string) => [...permissionKeys.features.all, 'company', companyId] as const,
  },
};

// =============================================
// Permission Definitions
// =============================================

/**
 * Fetch all permission definitions
 */
export function usePermissionDefinitions() {
  return useQuery({
    queryKey: permissionKeys.definitions(),
    queryFn: async (): Promise<Permission[]> => {
      const { data, error } = await db
        .from('permissions')
        .select('*')
        .order('category')
        .order('display_order');

      if (error) {throw error;}
      return data || [];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (definitions rarely change)
  });
}

// =============================================
// User Permissions
// =============================================

/**
 * Fetch resolved permissions for a user
 */
export function useUserPermissions(userId?: string, projectId?: string) {
  return useQuery({
    queryKey: permissionKeys.user(userId || '', projectId),
    queryFn: async (): Promise<Map<string, ResolvedPermission>> => {
      if (!userId) {return new Map();}

      const { data, error } = await db.rpc('get_user_permissions', {
        p_user_id: userId,
        p_project_id: projectId || null,
      });

      if (error) {throw error;}

      const permMap = new Map<string, ResolvedPermission>();
      (data || []).forEach((row: any) => {
        permMap.set(row.permission_code, {
          permission_code: row.permission_code,
          permission_name: row.permission_name,
          category: row.category,
          granted: row.granted,
          source: row.source,
        });
      });

      return permMap;
    },
    enabled: !!userId,
  });
}

/**
 * Check if current user has a specific permission
 */
export function useHasPermission(permissionCode: string, projectId?: string): boolean {
  const { userProfile } = useAuth();
  const { data: permissions } = useUserPermissions(userProfile?.id, projectId);

  if (!permissions) {return false;}
  const perm = permissions.get(permissionCode);
  return perm?.granted ?? false;
}

/**
 * Hook to check multiple permissions at once
 */
export function usePermissionCheck(projectId?: string) {
  const { userProfile } = useAuth();
  const { data: permissions, isLoading } = useUserPermissions(userProfile?.id, projectId);

  return {
    permissions,
    isLoading,
    hasPermission: (code: string) => {
      if (!permissions) {return false;}
      const perm = permissions.get(code);
      return perm?.granted ?? false;
    },
    hasAnyPermission: (codes: string[]) => {
      if (!permissions) {return false;}
      return codes.some(code => {
        const perm = permissions.get(code);
        return perm?.granted ?? false;
      });
    },
    hasAllPermissions: (codes: string[]) => {
      if (!permissions) {return false;}
      return codes.every(code => {
        const perm = permissions.get(code);
        return perm?.granted ?? false;
      });
    },
  };
}

// =============================================
// Custom Roles
// =============================================

/**
 * Fetch custom roles for the company
 */
export function useCustomRoles() {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: permissionKeys.roles.list(userProfile?.company_id || ''),
    queryFn: async (): Promise<CustomRole[]> => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      const { data, error } = await db
        .from('custom_roles')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('name');

      if (error) {throw error;}
      return data || [];
    },
    enabled: !!userProfile?.company_id,
  });
}

/**
 * Fetch a single custom role with its permissions
 */
export function useCustomRole(roleId: string) {
  return useQuery({
    queryKey: permissionKeys.roles.detail(roleId),
    queryFn: async (): Promise<CustomRoleWithPermissions> => {
      const { data, error } = await db
        .from('custom_roles')
        .select(`
          *,
          permissions:role_permissions(
            *,
            permission:permissions(*)
          )
        `)
        .eq('id', roleId)
        .single();

      if (error) {throw error;}
      return data as CustomRoleWithPermissions;
    },
    enabled: !!roleId,
  });
}

/**
 * Create a custom role
 */
export function useCreateCustomRole() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: async (dto: CreateCustomRoleDTO): Promise<CustomRole> => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      // Create the role
      const { data: role, error: roleError } = await db
        .from('custom_roles')
        .insert({
          company_id: userProfile.company_id,
          code: dto.code,
          name: dto.name,
          description: dto.description || null,
          color: dto.color || '#6B7280',
          inherits_from: dto.inherits_from || null,
          created_by: userProfile.id,
        })
        .select()
        .single();

      if (roleError) {throw roleError;}

      // Add permissions if specified
      if (dto.permissions && dto.permissions.length > 0) {
        // Get permission IDs for the codes
        const { data: perms } = await db
          .from('permissions')
          .select('id, code')
          .in('code', dto.permissions);

        if (perms && perms.length > 0) {
          const rolePerms = perms.map((p: any) => ({
            custom_role_id: role.id,
            permission_id: p.id,
            granted: true,
          }));

          await db.from('role_permissions').insert(rolePerms);
        }
      }

      return role as CustomRole;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.roles.all });
    },
  });
}

/**
 * Update a custom role
 */
export function useUpdateCustomRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdateCustomRoleDTO & { id: string }): Promise<CustomRole> => {
      const { data, error } = await db
        .from('custom_roles')
        .update(dto)
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}
      return data as CustomRole;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.roles.all });
      queryClient.invalidateQueries({ queryKey: permissionKeys.roles.detail(data.id) });
    },
  });
}

/**
 * Delete a custom role
 */
export function useDeleteCustomRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await db
        .from('custom_roles')
        .delete()
        .eq('id', id);

      if (error) {throw error;}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.roles.all });
    },
  });
}

/**
 * Update permissions for a custom role
 */
export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roleId,
      permissions,
    }: {
      roleId: string;
      permissions: { permissionId: string; granted: boolean }[];
    }): Promise<void> => {
      // Delete existing permissions for this role
      await db
        .from('role_permissions')
        .delete()
        .eq('custom_role_id', roleId);

      // Insert new permissions
      if (permissions.length > 0) {
        const rolePerms = permissions.map((p) => ({
          custom_role_id: roleId,
          permission_id: p.permissionId,
          granted: p.granted,
        }));

        const { error } = await db.from('role_permissions').insert(rolePerms);
        if (error) {throw error;}
      }
    },
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.roles.detail(roleId) });
      queryClient.invalidateQueries({ queryKey: permissionKeys.all });
    },
  });
}

// =============================================
// User Permission Overrides
// =============================================

/**
 * Fetch permission overrides for a user
 */
export function useUserPermissionOverrides(userId: string) {
  return useQuery({
    queryKey: permissionKeys.overrides.user(userId),
    queryFn: async (): Promise<UserPermissionOverride[]> => {
      const { data, error } = await db
        .from('user_permission_overrides')
        .select(`
          *,
          permission:permissions(*)
        `)
        .eq('user_id', userId)
        .order('granted_at', { ascending: false });

      if (error) {throw error;}
      return (data || []) as UserPermissionOverride[];
    },
    enabled: !!userId,
  });
}

/**
 * Create a permission override
 */
export function useCreatePermissionOverride() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: async (dto: CreateUserPermissionOverrideDTO): Promise<UserPermissionOverride> => {
      // Get permission ID from code
      const { data: perm } = await db
        .from('permissions')
        .select('id')
        .eq('code', dto.permission_code)
        .single();

      if (!perm) {throw new Error('Permission not found');}

      const { data, error } = await db
        .from('user_permission_overrides')
        .insert({
          user_id: dto.user_id,
          permission_id: perm.id,
          override_type: dto.override_type,
          project_id: dto.project_id || null,
          reason: dto.reason || null,
          expires_at: dto.expires_at || null,
          granted_by: userProfile?.id,
        })
        .select()
        .single();

      if (error) {throw error;}
      return data as UserPermissionOverride;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.overrides.user(data.user_id) });
      queryClient.invalidateQueries({ queryKey: permissionKeys.user(data.user_id, data.project_id || undefined) });
    },
  });
}

/**
 * Delete a permission override
 */
export function useDeletePermissionOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; userId: string }): Promise<void> => {
      const { error } = await db
        .from('user_permission_overrides')
        .delete()
        .eq('id', id);

      if (error) {throw error;}
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.overrides.user(userId) });
      queryClient.invalidateQueries({ queryKey: permissionKeys.user(userId, undefined) });
    },
  });
}

// =============================================
// User Custom Role Assignments
// =============================================

/**
 * Assign a custom role to a user
 */
export function useAssignCustomRole() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: async (dto: AssignCustomRoleDTO): Promise<UserCustomRole> => {
      const { data, error } = await db
        .from('user_custom_roles')
        .insert({
          user_id: dto.user_id,
          custom_role_id: dto.custom_role_id,
          project_id: dto.project_id || null,
          assigned_by: userProfile?.id,
        })
        .select()
        .single();

      if (error) {throw error;}
      return data as UserCustomRole;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.user(data.user_id, data.project_id || undefined) });
    },
  });
}

/**
 * Remove a custom role from a user
 */
export function useRemoveCustomRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; userId: string }): Promise<void> => {
      const { error } = await db
        .from('user_custom_roles')
        .delete()
        .eq('id', id);

      if (error) {throw error;}
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.user(userId, undefined) });
    },
  });
}

// =============================================
// Feature Flags
// =============================================

/**
 * Fetch all feature flag definitions
 */
export function useFeatureFlagDefinitions() {
  return useQuery({
    queryKey: permissionKeys.features.definitions(),
    queryFn: async (): Promise<FeatureFlag[]> => {
      const { data, error } = await db
        .from('feature_flags')
        .select('*')
        .order('category')
        .order('name');

      if (error) {throw error;}
      return data || [];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}

/**
 * Fetch company feature flag settings
 */
export function useCompanyFeatureFlags() {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: permissionKeys.features.company(userProfile?.company_id || ''),
    queryFn: async (): Promise<Map<string, boolean>> => {
      if (!userProfile?.company_id) {return new Map();}

      // Get all flags with company overrides
      const { data: flags } = await db
        .from('feature_flags')
        .select(`
          code,
          default_enabled,
          company_settings:company_feature_flags!left(
            enabled,
            expires_at
          )
        `)
        .eq('company_settings.company_id', userProfile.company_id);

      const flagMap = new Map<string, boolean>();
      (flags || []).forEach((flag: any) => {
        const companyOverride = flag.company_settings?.[0];
        const isExpired = companyOverride?.expires_at && new Date(companyOverride.expires_at) < new Date();

        if (companyOverride && !isExpired) {
          flagMap.set(flag.code, companyOverride.enabled);
        } else {
          flagMap.set(flag.code, flag.default_enabled);
        }
      });

      return flagMap;
    },
    enabled: !!userProfile?.company_id,
  });
}

/**
 * Check if a feature is enabled
 */
export function useFeatureFlag(featureCode: string): boolean {
  const { data: flags } = useCompanyFeatureFlags();
  return flags?.get(featureCode) ?? false;
}

/**
 * Update company feature flag
 */
export function useUpdateCompanyFeatureFlag() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: async (dto: UpdateCompanyFeatureFlagDTO): Promise<void> => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      // Get flag ID
      const { data: flag } = await db
        .from('feature_flags')
        .select('id')
        .eq('code', dto.feature_code)
        .single();

      if (!flag) {throw new Error('Feature flag not found');}

      // Upsert the company setting
      const { error } = await db
        .from('company_feature_flags')
        .upsert({
          company_id: userProfile.company_id,
          feature_flag_id: flag.id,
          enabled: dto.enabled,
          notes: dto.notes || null,
          expires_at: dto.expires_at || null,
          enabled_by: userProfile.id,
          enabled_at: new Date().toISOString(),
        }, {
          onConflict: 'company_id,feature_flag_id',
        });

      if (error) {throw error;}
    },
    onSuccess: () => {
      if (userProfile?.company_id) {
        queryClient.invalidateQueries({
          queryKey: permissionKeys.features.company(userProfile.company_id),
        });
      }
    },
  });
}

// =============================================
// Default Role Permissions
// =============================================

/**
 * Fetch permissions for a default role
 */
export function useDefaultRolePermissions(role: DefaultRole) {
  return useQuery({
    queryKey: [...permissionKeys.all, 'default-role', role],
    queryFn: async (): Promise<Permission[]> => {
      const { data, error } = await db
        .from('role_permissions')
        .select(`
          permission:permissions(*)
        `)
        .eq('default_role', role)
        .eq('granted', true);

      if (error) {throw error;}
      return (data || []).map((rp: any) => rp.permission).filter(Boolean);
    },
  });
}
