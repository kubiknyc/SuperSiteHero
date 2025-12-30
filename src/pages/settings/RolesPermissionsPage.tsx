/**
 * Roles & Permissions Settings Page
 * Manage custom roles, default role permissions, and feature flags
 */

import * as React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Search,
  Shield,
  AlertCircle,
  Loader2,
  Sparkles,
  Lock,
  FlaskConical,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  useCustomRoles,
  useDeleteCustomRole,
  useFeatureFlagDefinitions,
  useCompanyFeatureFlags,
  useUpdateCompanyFeatureFlag,
  useDefaultRolePermissions,
} from '@/features/permissions/hooks/usePermissions';
import {
  CustomRoleCard,
  CustomRoleFormDialog,
  PermissionMatrix,
  PermissionMatrixSkeleton,
} from '@/features/permissions/components';
import { DEFAULT_ROLES, formatRole, type CustomRole, type DefaultRole } from '@/types/permissions';

export function RolesPermissionsPage() {
  const { userProfile } = useAuth();
  const isOwner = userProfile?.role === 'owner';
  const isAdmin = userProfile?.role === 'admin' || isOwner;

  // State
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'custom' | 'default' | 'features'>('custom');
  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<CustomRole | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [roleToDelete, setRoleToDelete] = React.useState<CustomRole | null>(null);
  const [selectedDefaultRole, setSelectedDefaultRole] = React.useState<DefaultRole>('project_manager');

  // Queries
  const { data: customRoles, isLoading: loadingRoles } = useCustomRoles();
  const { data: featureFlags, isLoading: loadingFlags } = useFeatureFlagDefinitions();
  const { data: companyFlags } = useCompanyFeatureFlags();
  const { data: defaultRolePerms, isLoading: loadingDefaultPerms } =
    useDefaultRolePermissions(selectedDefaultRole);

  // Mutations
  const deleteMutation = useDeleteCustomRole();
  const updateFeatureMutation = useUpdateCompanyFeatureFlag();

  // Filter custom roles
  const filteredRoles = React.useMemo(() => {
    if (!customRoles) {return [];}
    if (!searchQuery.trim()) {return customRoles;}

    const query = searchQuery.toLowerCase();
    return customRoles.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.code.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query)
    );
  }, [customRoles, searchQuery]);

  // Handlers
  const handleEdit = (role: CustomRole) => {
    setEditingRole(role);
    setFormDialogOpen(true);
  };

  const handleDeleteClick = (role: CustomRole) => {
    setRoleToDelete(role);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) {return;}

    try {
      await deleteMutation.mutateAsync(roleToDelete.id);
      toast.success('Role deleted successfully');
      setDeleteConfirmOpen(false);
      setRoleToDelete(null);
    } catch {
      toast.error('Failed to delete role');
    }
  };

  const handleFormClose = () => {
    setFormDialogOpen(false);
    setEditingRole(null);
  };

  const handleFeatureToggle = async (featureCode: string, enabled: boolean) => {
    try {
      await updateFeatureMutation.mutateAsync({
        feature_code: featureCode,
        enabled,
      });
      toast.success(`Feature ${enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update feature');
    }
  };

  // Not authorized
  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="container max-w-5xl py-6">
          <div className="text-center py-12">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              You don't have permission to manage roles
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-5xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold heading-page">Roles & Permissions</h1>
            <p className="text-muted-foreground">
              Manage custom roles, permissions, and feature access
            </p>
          </div>
          {activeTab === 'custom' && (
            <Button onClick={() => setFormDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Role
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="custom">
              <Shield className="h-4 w-4 mr-2" />
              Custom Roles
              {customRoles && (
                <Badge variant="secondary" className="ml-2">
                  {customRoles.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="default">
              <Shield className="h-4 w-4 mr-2" />
              Default Roles
            </TabsTrigger>
            {isOwner && (
              <TabsTrigger value="features">
                <Sparkles className="h-4 w-4 mr-2" />
                Feature Flags
              </TabsTrigger>
            )}
          </TabsList>

          {/* Custom Roles Tab */}
          <TabsContent value="custom" className="mt-6 space-y-4">
            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search custom roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Role List */}
            {loadingRoles ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-surface">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-1 heading-subsection">No custom roles</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {searchQuery
                    ? 'Try adjusting your search'
                    : 'Create custom roles to define specific permissions'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setFormDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Role
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRoles.map((role) => (
                  <CustomRoleCard
                    key={role.id}
                    role={role}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Default Roles Tab */}
          <TabsContent value="default" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">View Default Role Permissions</CardTitle>
                <CardDescription>
                  See which permissions are granted to each default role
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-6">
                  {DEFAULT_ROLES.filter(
                    (r) => !['subcontractor', 'client'].includes(r.value)
                  ).map((role) => (
                    <Button
                      key={role.value}
                      variant={selectedDefaultRole === role.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedDefaultRole(role.value)}
                    >
                      {role.label}
                    </Button>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4 heading-card">
                    Permissions for {formatRole(selectedDefaultRole)}
                  </h4>
                  {loadingDefaultPerms ? (
                    <PermissionMatrixSkeleton />
                  ) : defaultRolePerms ? (
                    <PermissionMatrix
                      permissions={defaultRolePerms}
                      grantedPermissions={new Set(defaultRolePerms.map((p) => p.id))}
                      readOnly
                    />
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No permissions data available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="p-4 bg-warning-light border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800 font-medium">
                    Default roles cannot be modified
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Create custom roles if you need different permission sets. Custom roles
                    can inherit from default roles as a starting point.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Feature Flags Tab */}
          {isOwner && (
            <TabsContent value="features" className="mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Feature Flags</CardTitle>
                  <CardDescription>
                    Enable or disable features for your organization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingFlags ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {featureFlags?.map((flag) => {
                        const isEnabled = companyFlags?.get(flag.code) ?? flag.default_enabled;

                        return (
                          <div
                            key={flag.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{flag.name}</span>
                                {flag.is_beta && (
                                  <Badge variant="secondary" className="text-xs">
                                    <FlaskConical className="h-3 w-3 mr-1" />
                                    Beta
                                  </Badge>
                                )}
                              </div>
                              {flag.description && (
                                <p className="text-sm text-muted-foreground">
                                  {flag.description}
                                </p>
                              )}
                            </div>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) =>
                                handleFeatureToggle(flag.code, checked)
                              }
                              disabled={updateFeatureMutation.isPending}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Form Dialog */}
        <CustomRoleFormDialog
          open={formDialogOpen}
          onOpenChange={handleFormClose}
          role={editingRole}
          onSuccess={handleFormClose}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Custom Role</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{roleToDelete?.name}"? Users assigned
                this role will lose its permissions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-error hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}

export default RolesPermissionsPage;
