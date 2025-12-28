/**
 * CollaboratorIndicator Component
 * Shows active collaborators in a markup session with their current actions
 */

import { useMemo } from 'react';
import { Users, Pencil, MousePointer, Move, Type } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { CollaboratorInfo, CollaboratorAction } from '@/lib/realtime/markup-sync-types';

interface CollaboratorIndicatorProps {
  collaborators: CollaboratorInfo[];
  className?: string;
  maxVisible?: number;
  showActions?: boolean;
}

/**
 * Get icon for collaborator action
 */
function getActionIcon(action: CollaboratorAction) {
  switch (action) {
    case 'drawing':
      return <Pencil className="h-3 w-3" />;
    case 'selecting':
      return <MousePointer className="h-3 w-3" />;
    case 'transforming':
      return <Move className="h-3 w-3" />;
    case 'typing':
      return <Type className="h-3 w-3" />;
    default:
      return null;
  }
}

/**
 * Get label for collaborator action
 */
function getActionLabel(action: CollaboratorAction): string {
  switch (action) {
    case 'drawing':
      return 'Drawing';
    case 'selecting':
      return 'Selecting';
    case 'transforming':
      return 'Moving';
    case 'typing':
      return 'Typing';
    default:
      return 'Viewing';
  }
}

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Single collaborator avatar with action indicator
 */
function CollaboratorAvatar({
  collaborator,
  showAction = true,
}: {
  collaborator: CollaboratorInfo;
  showAction?: boolean;
}) {
  const isActive = collaborator.currentAction !== 'idle';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <Avatar
              className={cn(
                'h-8 w-8 border-2 transition-all',
                isActive && 'ring-2 ring-offset-1'
              )}
              style={{
                borderColor: collaborator.color,
                ringColor: isActive ? collaborator.color : undefined,
              }}
            >
              <AvatarImage src={collaborator.avatarUrl} alt={collaborator.name} />
              <AvatarFallback
                className="text-xs font-medium"
                style={{ backgroundColor: `${collaborator.color}20` }}
              >
                {getInitials(collaborator.name)}
              </AvatarFallback>
            </Avatar>

            {/* Action indicator */}
            {showAction && isActive && (
              <div
                className="absolute -bottom-1 -right-1 rounded-full p-0.5 bg-background border"
                style={{ borderColor: collaborator.color, color: collaborator.color }}
              >
                {getActionIcon(collaborator.currentAction)}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="p-2">
          <div className="flex flex-col gap-1">
            <span className="font-medium">{collaborator.name}</span>
            <span className="text-xs text-muted-foreground">
              {getActionLabel(collaborator.currentAction)}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Main collaborator indicator component
 */
export function CollaboratorIndicator({
  collaborators,
  className,
  maxVisible = 3,
  showActions = true,
}: CollaboratorIndicatorProps) {
  // Sort collaborators: active users first, then by name
  const sortedCollaborators = useMemo(() => {
    return [...collaborators].sort((a, b) => {
      const aActive = a.currentAction !== 'idle';
      const bActive = b.currentAction !== 'idle';
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [collaborators]);

  const visibleCollaborators = sortedCollaborators.slice(0, maxVisible);
  const hiddenCount = sortedCollaborators.length - maxVisible;

  if (collaborators.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Collaborating label */}
      <Badge variant="secondary" className="flex items-center gap-1 text-xs">
        <Users className="h-3 w-3" />
        <span>{collaborators.length} collaborating</span>
      </Badge>

      {/* Avatar stack */}
      <div className="flex -space-x-2">
        {visibleCollaborators.map((collaborator) => (
          <CollaboratorAvatar
            key={collaborator.id}
            collaborator={collaborator}
            showAction={showActions}
          />
        ))}

        {/* Overflow indicator */}
        {hiddenCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border-2 border-background text-xs font-medium">
                  +{hiddenCount}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="p-2">
                <div className="flex flex-col gap-1">
                  {sortedCollaborators.slice(maxVisible).map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-sm">{c.name}</span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}

/**
 * Compact version for smaller spaces
 */
export function CollaboratorIndicatorCompact({
  collaborators,
  className,
}: {
  collaborators: CollaboratorInfo[];
  className?: string;
}) {
  if (collaborators.length === 0) {
    return null;
  }

  const activeCount = collaborators.filter((c) => c.currentAction !== 'idle').length;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn('flex items-center gap-1 cursor-default', className)}
          >
            <Users className="h-3 w-3" />
            <span>{collaborators.length}</span>
            {activeCount > 0 && (
              <span className="flex items-center gap-0.5 text-primary">
                <Pencil className="h-2.5 w-2.5" />
                {activeCount}
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="p-2">
          <div className="flex flex-col gap-1">
            <span className="font-medium text-xs mb-1">
              {collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''}
            </span>
            {collaborators.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                <span>{c.name}</span>
                <span className="text-xs text-muted-foreground">
                  {getActionLabel(c.currentAction)}
                </span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default CollaboratorIndicator;
