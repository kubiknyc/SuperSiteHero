/**
 * Custom Role Form Dialog
 * Dialog for creating or editing custom roles with permission selection
 */

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  usePermissionDefinitions,
  useCreateCustomRole,
  useUpdateCustomRole,
  useCustomRole,
  useUpdateRolePermissions,
} from '../hooks/usePermissions';
import { PermissionMatrix, PermissionMatrixSkeleton } from './PermissionMatrix';
import { DEFAULT_ROLES, type CustomRole, type DefaultRole } from '@/types/permissions';
import { logger } from '../../../lib/utils/logger';


interface CustomRoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: CustomRole | null;
  onSuccess?: () => void;
}

const ROLE_COLORS = [
  '#6B7280', // Gray
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#84CC16', // Lime
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#EC4899', // Pink
];

export function CustomRoleFormDialog({
  open,
  onOpenChange,
  role,
  onSuccess,
}: CustomRoleFormDialogProps) {
  const isEditing = !!role;

  // Form state
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [color, setColor] = React.useState('#6B7280');
  const [inheritsFrom, setInheritsFrom] = React.useState<DefaultRole | ''>('');
  const [grantedPermissions, setGrantedPermissions] = React.useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = React.useState<'details' | 'permissions'>('details');

  // Queries
  const { data: permissions, isLoading: loadingPermissions } = usePermissionDefinitions();
  const { data: roleData, isLoading: loadingRole } = useCustomRole(role?.id || '');

  // Mutations
  const createMutation = useCreateCustomRole();
  const updateMutation = useUpdateCustomRole();
  const updatePermsMutation = useUpdateRolePermissions();

  const resetForm = React.useCallback(() => {
    setName('');
    setCode('');
    setDescription('');
    setColor('#6B7280');
    setInheritsFrom('');
    setGrantedPermissions(new Set());
    setActiveTab('details');
  }, []);

  // Initialize form when role changes
  React.useEffect(() => {
    if (role && roleData) {
      setName(role.name);
      setCode(role.code);
      setDescription(role.description || '');
      setColor(role.color);
      setInheritsFrom(role.inherits_from || '');

      // Set granted permissions from role data
      const granted = new Set<string>();
      roleData.permissions?.forEach((rp) => {
        if (rp.granted && rp.permission_id) {
          granted.add(rp.permission_id);
        }
      });
      setGrantedPermissions(granted);
    } else if (!role) {
      resetForm();
    }
  }, [role, roleData, open, resetForm]);

  // Auto-generate code from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!isEditing) {
      const generatedCode = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 50);
      setCode(generatedCode);
    }
  };

  const handlePermissionToggle = (permissionId: string, granted: boolean) => {
    setGrantedPermissions((prev) => {
      const next = new Set(prev);
      if (granted) {
        next.add(permissionId);
      } else {
        next.delete(permissionId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (isEditing && role) {
        // Update role details
        await updateMutation.mutateAsync({
          id: role.id,
          name: name.trim(),
          description: description.trim() || undefined,
          color,
        });

        // Update permissions
        const permArray = Array.from(grantedPermissions).map((permId) => ({
          permissionId: permId,
          granted: true,
        }));
        await updatePermsMutation.mutateAsync({
          roleId: role.id,
          permissions: permArray,
        });

        toast.success('Role updated successfully');
      } else {
        // Get permission codes for granted permissions
        const permCodes = permissions
          ?.filter((p) => grantedPermissions.has(p.id))
          .map((p) => p.code) || [];

        await createMutation.mutateAsync({
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          inherits_from: inheritsFrom || undefined,
          permissions: permCodes,
        });

        toast.success('Role created successfully');
      }

      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (_error) {
      toast.error(isEditing ? 'Failed to update role' : 'Failed to create role');
      logger.error('Role form error:', error);
    }
  };

  const isLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    updatePermsMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Custom Role' : 'Create Custom Role'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the role details and permissions'
              : 'Create a new custom role with specific permissions'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="permissions">
              Permissions
              {grantedPermissions.size > 0 && (
                <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                  {grantedPermissions.size}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4 mt-0 px-1">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Quality Manager"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Role Code *</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g., quality_manager"
                  disabled={isLoading || isEditing}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier. Cannot be changed after creation.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this role's responsibilities..."
                  rows={2}
                  disabled={isLoading}
                />
              </div>

              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="inherits">Inherit Permissions From</Label>
                  <Select
                    value={inheritsFrom}
                    onValueChange={(v) => setInheritsFrom(v as DefaultRole | '')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a base role (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {DEFAULT_ROLES.filter(
                        (r) => !['owner', 'subcontractor', 'client'].includes(r.value)
                      ).map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Optionally start with permissions from an existing role
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Role Color
                </Label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-transform',
                        color === c
                          ? 'border-primary scale-110'
                          : 'border-transparent hover:scale-105'
                      )}
                      style={{ backgroundColor: c }}
                      disabled={isLoading}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value="permissions" className="mt-0 px-1">
              {loadingPermissions || (isEditing && loadingRole) ? (
                <PermissionMatrixSkeleton />
              ) : permissions ? (
                <PermissionMatrix
                  permissions={permissions}
                  grantedPermissions={grantedPermissions}
                  onToggle={handlePermissionToggle}
                  disabled={isLoading}
                />
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Failed to load permissions
                </p>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !name.trim() || !code.trim()}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CustomRoleFormDialog;
