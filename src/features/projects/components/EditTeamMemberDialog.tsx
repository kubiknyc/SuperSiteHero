// File: /src/features/projects/components/EditTeamMemberDialog.tsx
// Dialog for editing a team member's role and permissions

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Loader2, UserCog } from 'lucide-react'
import { useUpdateTeamMember } from '../hooks/useProjectTeam'
import { PROJECT_ROLES, type ProjectTeamMember } from '../types/team'

interface EditTeamMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  member: ProjectTeamMember | null
}

export function EditTeamMemberDialog({
  open,
  onOpenChange,
  projectId,
  member,
}: EditTeamMemberDialogProps) {
  const [projectRole, setProjectRole] = useState<string>('')
  const [canEdit, setCanEdit] = useState(true)
  const [canDelete, setCanDelete] = useState(false)
  const [canApprove, setCanApprove] = useState(false)

  const updateMember = useUpdateTeamMember(projectId)

  // Populate form with current values when dialog opens
  useEffect(() => {
    if (open && member) {
      setProjectRole(member.project_role || '')
      setCanEdit(member.can_edit)
      setCanDelete(member.can_delete)
      setCanApprove(member.can_approve)
    }
  }, [open, member])

  if (!member || !member.user) {return null}

  const user = member.user

  // Get user display name
  const displayName = user.first_name || user.last_name
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
    : user.email

  // Get initials for avatar
  const initials = user.first_name && user.last_name
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : user.email.substring(0, 2).toUpperCase()

  const handleSubmit = async () => {
    await updateMember.mutateAsync({
      membershipId: member.id,
      input: {
        project_role: projectRole || undefined,
        can_edit: canEdit,
        can_delete: canDelete,
        can_approve: canApprove,
      },
    })

    onOpenChange(false)
  }

  // Check if there are any changes
  const hasChanges =
    projectRole !== (member.project_role || '') ||
    canEdit !== member.can_edit ||
    canDelete !== member.can_delete ||
    canApprove !== member.can_approve

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Edit Team Member
          </DialogTitle>
          <DialogDescription>
            Update role and permissions for this team member.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Info (Read-only) */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
            <Avatar className="h-12 w-12">
              {user.avatar_url && (
                <AvatarImage src={user.avatar_url} alt={displayName} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{displayName}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Project Role */}
          <div className="space-y-2">
            <Label>Project Role</Label>
            <Select value={projectRole} onValueChange={setProjectRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role..." />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_ROLES.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Permissions */}
          <div className="space-y-3">
            <Label>Permissions</Label>
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Can Edit</p>
                  <p className="text-xs text-muted-foreground">
                    Create and modify project data
                  </p>
                </div>
                <Checkbox
                  checked={canEdit}
                  onCheckedChange={(checked) => setCanEdit(checked === true)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Can Delete</p>
                  <p className="text-xs text-muted-foreground">
                    Delete project items and data
                  </p>
                </div>
                <Checkbox
                  checked={canDelete}
                  onCheckedChange={(checked) => setCanDelete(checked === true)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Can Approve</p>
                  <p className="text-xs text-muted-foreground">
                    Approve documents, RFIs, and submittals
                  </p>
                </div>
                <Checkbox
                  checked={canApprove}
                  onCheckedChange={(checked) => setCanApprove(checked === true)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanges || updateMember.isPending}
          >
            {updateMember.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditTeamMemberDialog
