// File: /src/features/projects/components/AddTeamMemberDialog.tsx
// Dialog for adding a team member to a project

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
import { Loader2, UserPlus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAvailableUsers, useAddTeamMember } from '../hooks/useProjectTeam'
import { PROJECT_ROLES, type CompanyUser } from '../types/team'
import { cn } from '@/lib/utils'

interface AddTeamMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  companyId: string
}

export function AddTeamMemberDialog({
  open,
  onOpenChange,
  projectId,
  companyId,
}: AddTeamMemberDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [projectRole, setProjectRole] = useState<string>('')
  const [canEdit, setCanEdit] = useState(true)
  const [canDelete, setCanDelete] = useState(false)
  const [canApprove, setCanApprove] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: availableUsers = [], isLoading: usersLoading } = useAvailableUsers(
    open ? projectId : undefined,
    open ? companyId : undefined
  )

  const addMember = useAddTeamMember(projectId)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedUserId('')
      setProjectRole('')
      setCanEdit(true)
      setCanDelete(false)
      setCanApprove(false)
      setSearchQuery('')
    }
  }, [open])

  // Filter users by search query
  const filteredUsers = availableUsers.filter(user => {
    if (!searchQuery) return true
    const searchLower = searchQuery.toLowerCase()
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase()
    return (
      fullName.includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    )
  })

  const selectedUser = availableUsers.find(u => u.id === selectedUserId)

  const handleSubmit = async () => {
    if (!selectedUserId) return

    await addMember.mutateAsync({
      user_id: selectedUserId,
      project_role: projectRole || undefined,
      can_edit: canEdit,
      can_delete: canDelete,
      can_approve: canApprove,
    })

    onOpenChange(false)
  }

  const getInitials = (user: CompanyUser) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    return user.email.substring(0, 2).toUpperCase()
  }

  const getDisplayName = (user: CompanyUser) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim()
    }
    return user.email
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Team Member
          </DialogTitle>
          <DialogDescription>
            Select a user from your company to add to this project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Search */}
          <div className="space-y-2">
            <Label>Search Users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* User Selection */}
          <div className="space-y-2">
            <Label>Select User</Label>
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {searchQuery
                  ? 'No users match your search'
                  : 'All company users are already on this project'}
              </div>
            ) : (
              <div className="max-h-[200px] overflow-y-auto border rounded-lg divide-y">
                {filteredUsers.map(user => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors',
                      selectedUserId === user.id && 'bg-primary/10'
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      {user.avatar_url && (
                        <AvatarImage src={user.avatar_url} alt={getDisplayName(user)} />
                      )}
                      <AvatarFallback className="text-sm">
                        {getInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{getDisplayName(user)}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-1 rounded">
                      {user.role?.replace('_', ' ')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Project Role */}
          <div className="space-y-2">
            <Label>Project Role (Optional)</Label>
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
            disabled={!selectedUserId || addMember.isPending}
          >
            {addMember.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Add to Project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddTeamMemberDialog
