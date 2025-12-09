/**
 * Permission Matrix Component
 * Displays permissions in a grid with checkboxes for each role/permission combination
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertTriangle,
  Shield,
  Building,
  FileText,
  HardHat,
  ClipboardCheck,
  FileStack,
  Receipt,
  Calendar,
  DollarSign,
  Users,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  Permission,
  PermissionCategory,
} from '@/types/permissions';
import { getCategoryLabel } from '@/types/permissions';

interface PermissionMatrixProps {
  permissions: Permission[];
  grantedPermissions: Set<string>; // Set of permission IDs that are granted
  onToggle?: (permissionId: string, granted: boolean) => void;
  disabled?: boolean;
  readOnly?: boolean;
  showCategories?: boolean;
  highlightDangerous?: boolean;
}

const CATEGORY_ICONS: Record<PermissionCategory, React.ElementType> = {
  projects: Building,
  daily_reports: FileText,
  rfis: ClipboardCheck,
  submittals: FileStack,
  change_orders: Receipt,
  documents: FileText,
  safety: HardHat,
  schedule: Calendar,
  financial: DollarSign,
  team: Users,
  admin: Settings,
};

export function PermissionMatrix({
  permissions,
  grantedPermissions,
  onToggle,
  disabled = false,
  readOnly = false,
  showCategories = true,
  highlightDangerous = true,
}: PermissionMatrixProps) {
  // Group permissions by category
  const grouped = React.useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach((perm) => {
      if (!groups[perm.category]) {
        groups[perm.category] = [];
      }
      groups[perm.category].push(perm);
    });

    // Sort permissions within each category
    Object.values(groups).forEach((perms) => {
      perms.sort((a, b) => a.display_order - b.display_order);
    });

    return groups;
  }, [permissions]);

  const categories = Object.keys(grouped) as PermissionCategory[];

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {categories.map((category) => {
          const Icon = CATEGORY_ICONS[category] || Shield;
          const categoryPerms = grouped[category];

          return (
            <Card key={category}>
              {showCategories && (
                <CardHeader className="py-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {getCategoryLabel(category)}
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {categoryPerms.filter((p) => grantedPermissions.has(p.id)).length}/
                      {categoryPerms.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
              )}
              <CardContent className={cn(!showCategories && 'pt-4')}>
                <div className="space-y-2">
                  {categoryPerms.map((perm) => {
                    const isGranted = grantedPermissions.has(perm.id);
                    const isDangerous = perm.is_dangerous && highlightDangerous;

                    return (
                      <div
                        key={perm.id}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-md transition-colors',
                          isDangerous && 'bg-red-50 border border-red-100',
                          !isDangerous && isGranted && 'bg-green-50',
                          !isDangerous && !isGranted && 'hover:bg-muted/50'
                        )}
                      >
                        <Checkbox
                          id={`perm-${perm.id}`}
                          checked={isGranted}
                          onCheckedChange={(checked) => {
                            if (!readOnly && onToggle) {
                              onToggle(perm.id, checked === true);
                            }
                          }}
                          disabled={disabled || readOnly}
                          className={cn(isDangerous && 'border-red-400')}
                        />

                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={`perm-${perm.id}`}
                            className={cn(
                              'flex items-center gap-2 text-sm font-medium cursor-pointer',
                              disabled && 'cursor-not-allowed opacity-60'
                            )}
                          >
                            {perm.name}
                            {isDangerous && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">
                                    This is a dangerous permission. Use with caution.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </label>
                          {perm.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {perm.description}
                            </p>
                          )}
                        </div>

                        {!perm.requires_project_assignment && (
                          <Badge variant="outline" className="text-[10px]">
                            Company-wide
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

/**
 * Loading skeleton for permission matrix
 */
export function PermissionMatrixSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="py-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-4 w-4" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40 mb-1" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default PermissionMatrix;
