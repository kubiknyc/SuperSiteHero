/**
 * Distribution List Form Dialog
 * Dialog for creating or editing distribution lists with member management
 */

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { logger } from '@/lib/utils/logger'
import {
  Loader2,
  Plus,
  X,
  Users,
  Mail,
  UserPlus,
  Trash2,
  Search,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  useCreateDistributionList,
  useUpdateDistributionList,
  useDistributionListMembers,
  useAddDistributionListMember,
  useRemoveDistributionListMember,
} from '../hooks/useDistributionLists'
import { useCompanyUsers } from '@/features/company-settings/hooks/useCompanyUsers'
import type {
  DistributionList,
  DistributionListMemberWithUser,
  CreateDistributionListDTO,
  CreateDistributionListMemberDTO,
  DistributionListType,
  MemberRole,
} from '@/types/distribution-list'
import {
  DISTRIBUTION_LIST_TYPES,
  MEMBER_ROLES,
  getMemberDisplayName,
  getMemberEmail,
} from '@/types/distribution-list'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface DistributionListFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  list?: DistributionList | null
  projectId?: string | null
  onSuccess?: () => void
}

export function DistributionListFormDialog({
  open,
  onOpenChange,
  list,
  projectId,
  onSuccess,
}: DistributionListFormDialogProps) {
  const isEditing = !!list
  const { userProfile } = useAuth()

  // Form state
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [listType, setListType] = React.useState<DistributionListType>('general')
  const [isDefault, setIsDefault] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<'details' | 'members'>('details')

  // New member state
  const [searchQuery, setSearchQuery] = React.useState('')
  const [newExternalEmail, setNewExternalEmail] = React.useState('')
  const [newExternalName, setNewExternalName] = React.useState('')
  const [newMemberRole, setNewMemberRole] = React.useState<MemberRole>('cc')
  const [pendingMembers, setPendingMembers] = React.useState<CreateDistributionListMemberDTO[]>([])

  // Queries and mutations
  const { data: existingMembers, isLoading: loadingMembers } = useDistributionListMembers(list?.id || '')
  const { data: companyUsers, isLoading: loadingUsers } = useCompanyUsers()
  const createMutation = useCreateDistributionList()
  const updateMutation = useUpdateDistributionList()
  const addMemberMutation = useAddDistributionListMember()
  const removeMemberMutation = useRemoveDistributionListMember()

  // Define resetForm before using it in useEffect
  const resetForm = () => {
    setName('')
    setDescription('')
    setListType('general')
    setIsDefault(false)
    setPendingMembers([])
    setSearchQuery('')
    setNewExternalEmail('')
    setNewExternalName('')
    setNewMemberRole('cc')
    setActiveTab('details')
  }

  // Initialize form when list changes
  React.useEffect(() => {
    if (list) {
      setName(list.name)
      setDescription(list.description || '')
      setListType(list.list_type as DistributionListType)
      setIsDefault(list.is_default)
      setActiveTab('details')
    } else {
      resetForm()
    }
  }, [list, open])

  // Filter users not already members
  const availableUsers = React.useMemo(() => {
    if (!companyUsers) {return []}

    const existingUserIds = new Set([
      ...(existingMembers || []).filter(m => m.user_id).map(m => m.user_id),
      ...pendingMembers.filter(m => m.user_id).map(m => m.user_id),
    ])

    let users = companyUsers.filter(u => !existingUserIds.has(u.id))

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      users = users.filter(u =>
        u.full_name?.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      )
    }

    return users.slice(0, 10) // Limit for performance
  }, [companyUsers, existingMembers, pendingMembers, searchQuery])

  // Add internal user
  const handleAddUser = (userId: string) => {
    const user = companyUsers?.find(u => u.id === userId)
    if (!user) {return}

    setPendingMembers(prev => [
      ...prev,
      {
        user_id: userId,
        member_role: newMemberRole,
        notify_email: true,
        notify_in_app: true,
      },
    ])
    setSearchQuery('')
  }

  // Add external contact
  const handleAddExternal = () => {
    if (!newExternalEmail.trim()) {return}

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newExternalEmail.trim())) {
      toast.error('Please enter a valid email address')
      return
    }

    // Check duplicates
    const emailLower = newExternalEmail.trim().toLowerCase()
    const isDuplicate =
      pendingMembers.some(m => m.external_email?.toLowerCase() === emailLower) ||
      existingMembers?.some(m => m.external_email?.toLowerCase() === emailLower)

    if (isDuplicate) {
      toast.error('This email is already in the list')
      return
    }

    setPendingMembers(prev => [
      ...prev,
      {
        external_email: newExternalEmail.trim(),
        external_name: newExternalName.trim() || undefined,
        member_role: newMemberRole,
        notify_email: true,
        notify_in_app: false,
      },
    ])

    setNewExternalEmail('')
    setNewExternalName('')
  }

  // Remove pending member
  const removePendingMember = (index: number) => {
    setPendingMembers(prev => prev.filter((_, i) => i !== index))
  }

  // Remove existing member
  const handleRemoveExistingMember = async (memberId: string) => {
    if (!list) {return}

    try {
      await removeMemberMutation.mutateAsync({ memberId, listId: list.id })
      toast.success('Member removed')
    } catch {
      toast.error('Failed to remove member')
    }
  }

  // Submit handler
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter a list name')
      return
    }

    try {
      if (isEditing && list) {
        // Update list details
        await updateMutation.mutateAsync({
          id: list.id,
          name: name.trim(),
          description: description.trim() || undefined,
          list_type: listType,
          is_default: isDefault,
        })

        // Add pending members
        for (const member of pendingMembers) {
          await addMemberMutation.mutateAsync({
            list_id: list.id,
            ...member,
          })
        }

        toast.success('Distribution list updated')
      } else {
        // Create new list with members
        const dto: CreateDistributionListDTO = {
          name: name.trim(),
          description: description.trim() || undefined,
          project_id: projectId || undefined,
          list_type: listType,
          is_default: isDefault,
          members: pendingMembers,
        }

        await createMutation.mutateAsync(dto)
        toast.success('Distribution list created')
      }

      onOpenChange(false)
      resetForm()
      onSuccess?.()
    } catch (_error) {
      toast.error(isEditing ? 'Failed to update list' : 'Failed to create list')
      logger.error('Distribution list error:', _error)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending || addMemberMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Distribution List' : 'Create Distribution List'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the list details and manage members'
              : 'Create a reusable list of recipients for notifications'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">
              Details
            </TabsTrigger>
            <TabsTrigger value="members">
              Members
              {(pendingMembers.length > 0 || (existingMembers?.length ?? 0) > 0) && (
                <Badge variant="secondary" className="ml-2">
                  {(existingMembers?.length ?? 0) + pendingMembers.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4 mt-0 px-1">
              <div className="space-y-2">
                <Label htmlFor="name">List Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Project Managers, Safety Team"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this list's purpose..."
                  rows={2}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="listType">List Type</Label>
                <Select value={listType} onValueChange={(v) => setListType(v as DistributionListType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTRIBUTION_LIST_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Lists can be filtered by type when selecting recipients
                </p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="isDefault">Set as Default</Label>
                  <p className="text-xs text-muted-foreground">
                    Auto-select this list for new {listType === 'general' ? 'items' : listType + 's'}
                  </p>
                </div>
                <Switch
                  id="isDefault"
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                  disabled={isLoading}
                />
              </div>

              {projectId && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    This list will be project-specific and only visible within this project.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members" className="space-y-4 mt-0 px-1">
              {/* Add Member Section */}
              <div className="space-y-3 p-4 bg-surface rounded-lg border">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Add Members</Label>
                  <Select value={newMemberRole} onValueChange={(v) => setNewMemberRole(v as MemberRole)}>
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEMBER_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search internal users */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search team members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    disabled={isLoading}
                  />
                </div>

                {/* Search results */}
                {searchQuery && availableUsers.length > 0 && (
                  <div className="border rounded-md bg-card divide-y max-h-32 overflow-auto">
                    {availableUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleAddUser(user.id)}
                        className="w-full flex items-center gap-2 p-2 text-left hover:bg-surface"
                      >
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.full_name || user.email}</span>
                        <span className="text-xs text-muted-foreground">({user.email})</span>
                      </button>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Add external */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Or add external contact</Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={newExternalEmail}
                      onChange={(e) => setNewExternalEmail(e.target.value)}
                      className="flex-1"
                      disabled={isLoading}
                    />
                    <Input
                      placeholder="Name (optional)"
                      value={newExternalName}
                      onChange={(e) => setNewExternalName(e.target.value)}
                      className="flex-1"
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddExternal}
                      disabled={isLoading || !newExternalEmail.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Existing Members */}
              {isEditing && existingMembers && existingMembers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Current Members</Label>
                  <div className="border rounded-lg divide-y">
                    {existingMembers.map((member) => (
                      <MemberRow
                        key={member.id}
                        member={member}
                        onRemove={() => handleRemoveExistingMember(member.id)}
                        isRemoving={removeMemberMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Members */}
              {pendingMembers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {isEditing ? 'New Members to Add' : 'Members'}
                  </Label>
                  <div className="border rounded-lg divide-y">
                    {pendingMembers.map((member, index) => (
                      <PendingMemberRow
                        key={index}
                        member={member}
                        users={companyUsers}
                        onRemove={() => removePendingMember(index)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {pendingMembers.length === 0 && (!existingMembers || existingMembers.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No members added yet</p>
                  <p className="text-xs">Search for team members or add external contacts above</p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !name.trim()}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create List'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Member row component
function MemberRow({
  member,
  onRemove,
  isRemoving,
}: {
  member: DistributionListMemberWithUser
  onRemove: () => void
  isRemoving: boolean
}) {
  const isInternal = !!member.user_id

  return (
    <div className="flex items-center gap-3 p-3">
      <div className={cn(
        'h-8 w-8 rounded-full flex items-center justify-center',
        isInternal ? 'bg-info-light' : 'bg-success-light'
      )}>
        {isInternal ? (
          <Users className="h-4 w-4 text-primary" />
        ) : (
          <Mail className="h-4 w-4 text-success" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{getMemberDisplayName(member)}</p>
        <p className="text-xs text-muted-foreground truncate">{getMemberEmail(member)}</p>
      </div>
      <Badge variant="outline" className="text-xs">
        {member.member_role.toUpperCase()}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-error"
        onClick={onRemove}
        disabled={isRemoving}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Pending member row
function PendingMemberRow({
  member,
  users,
  onRemove,
}: {
  member: CreateDistributionListMemberDTO
  users?: { id: string; full_name: string | null; email: string }[]
  onRemove: () => void
}) {
  const isInternal = !!member.user_id
  const user = isInternal ? users?.find(u => u.id === member.user_id) : null

  return (
    <div className="flex items-center gap-3 p-3 bg-warning-light">
      <div className={cn(
        'h-8 w-8 rounded-full flex items-center justify-center',
        isInternal ? 'bg-info-light' : 'bg-success-light'
      )}>
        {isInternal ? (
          <Users className="h-4 w-4 text-primary" />
        ) : (
          <Mail className="h-4 w-4 text-success" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {isInternal ? (user?.full_name || user?.email) : (member.external_name || member.external_email)}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {isInternal ? user?.email : member.external_email}
        </p>
      </div>
      <Badge variant="outline" className="text-xs bg-warning-light">
        {member.member_role?.toUpperCase() || 'CC'}
      </Badge>
      <Badge variant="secondary" className="text-xs">New</Badge>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-error"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default DistributionListFormDialog
