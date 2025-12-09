/**
 * Custom Role Card Component
 * Displays a custom role with actions
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Users, Shield, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CustomRole } from '@/types/permissions';
import { formatRole } from '@/types/permissions';
import { formatDistanceToNow } from 'date-fns';

interface CustomRoleCardProps {
  role: CustomRole;
  userCount?: number;
  onEdit?: (role: CustomRole) => void;
  onDuplicate?: (role: CustomRole) => void;
  onDelete?: (role: CustomRole) => void;
  onViewPermissions?: (role: CustomRole) => void;
}

export function CustomRoleCard({
  role,
  userCount = 0,
  onEdit,
  onDuplicate,
  onDelete,
  onViewPermissions,
}: CustomRoleCardProps) {
  return (
    <Card className={cn(
      'hover:shadow-md transition-shadow',
      !role.is_active && 'opacity-60'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Color indicator */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${role.color}20` }}
          >
            <Shield
              className="h-5 w-5"
              style={{ color: role.color }}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base truncate">{role.name}</h3>
              {!role.is_active && (
                <Badge variant="secondary" className="text-xs">Inactive</Badge>
              )}
            </div>

            {role.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                {role.description}
              </p>
            )}

            <div className="flex items-center gap-4 flex-wrap">
              <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {role.code}
              </code>

              {role.inherits_from && (
                <span className="text-xs text-muted-foreground">
                  Inherits from: <span className="font-medium">{formatRole(role.inherits_from)}</span>
                </span>
              )}

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{userCount} user{userCount !== 1 ? 's' : ''}</span>
              </div>

              {role.updated_at && (
                <span className="text-xs text-muted-foreground">
                  Updated {formatDistanceToNow(new Date(role.updated_at), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewPermissions && (
                <DropdownMenuItem onClick={() => onViewPermissions(role)}>
                  <Shield className="h-4 w-4 mr-2" />
                  View Permissions
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(role)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(role)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {onDelete && role.can_be_deleted && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(role)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

export default CustomRoleCard;
