// File: /src/features/projects/components/TeamMemberCard.tsx
// Card component displaying a project team member

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MoreHorizontal, Pencil, Trash2, Mail, Phone, ShieldCheck, PenLine, Trash, Check } from 'lucide-react'
import type { ProjectTeamMember } from '../types/team'
import { PROJECT_ROLES } from '../types/team'
import { cn } from '@/lib/utils'

interface TeamMemberCardProps {
  member: ProjectTeamMember
  onEdit: (member: ProjectTeamMember) => void
  onRemove: (member: ProjectTeamMember) => void
  isRemoving?: boolean
  canManage?: boolean
}

export function TeamMemberCard({
  member,
  onEdit,
  onRemove,
  isRemoving = false,
  canManage = false,
}: TeamMemberCardProps) {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)

  const user = member.user
  if (!user) return null

  // Get user display name
  const displayName = user.first_name || user.last_name
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
    : user.email

  // Get initials for avatar
  const initials = user.first_name && user.last_name
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : user.email.substring(0, 2).toUpperCase()

  // Get project role label
  const roleLabel = member.project_role
    ? PROJECT_ROLES.find(r => r.value === member.project_role)?.label || member.project_role
    : 'Team Member'

  // Build permissions list
  const permissions = []
  if (member.can_edit) permissions.push('Edit')
  if (member.can_delete) permissions.push('Delete')
  if (member.can_approve) permissions.push('Approve')

  const handleRemoveConfirm = () => {
    onRemove(member)
    setShowRemoveDialog(false)
  }

  return (
    <>
      <Card className={cn(
        'transition-all',
        isRemoving && 'opacity-50'
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <Avatar className="h-12 w-12 border">
              {user.avatar_url && (
                <AvatarImage src={user.avatar_url} alt={displayName} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold truncate">{displayName}</h4>
                <Badge variant="outline" className="capitalize text-xs">
                  {roleLabel}
                </Badge>
              </div>

              <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-muted-foreground">
                <a
                  href={`mailto:${user.email}`}
                  className="flex items-center gap-1 hover:text-primary truncate"
                >
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{user.email}</span>
                </a>
                {user.phone && (
                  <a
                    href={`tel:${user.phone}`}
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{user.phone}</span>
                  </a>
                )}
              </div>

              {/* Permissions badges */}
              {permissions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {member.can_edit && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <PenLine className="h-3 w-3" />
                      Can Edit
                    </Badge>
                  )}
                  {member.can_delete && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Trash className="h-3 w-3" />
                      Can Delete
                    </Badge>
                  )}
                  {member.can_approve && (
                    <Badge variant="secondary" className="text-xs gap-1 text-success">
                      <Check className="h-3 w-3" />
                      Can Approve
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={isRemoving}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(member)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Role & Permissions
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowRemoveDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove from Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Remove confirmation dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{displayName}</strong> from this project?
              They will no longer have access to project data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default TeamMemberCard
