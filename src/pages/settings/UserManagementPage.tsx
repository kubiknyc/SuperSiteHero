/**
 * User Management Page
 *
 * Allows company owners/admins to manage team members,
 * invite new users, and control access.
 */

import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  Users,
  UserPlus,
  MoreHorizontal,
  Shield,
  UserX,
  UserCheck,
  Loader2,
} from 'lucide-react'
import {
  useCompanyUsers,
  useUpdateUserRole,
  useToggleUserActive,
} from '@/features/company-settings/hooks/useCompanyUsers'
import { USER_ROLES, type UserRole } from '@/lib/api/services/company-users'
import { InviteUserDialog } from '@/features/company-settings/components/InviteUserDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'

export function UserManagementPage() {
  const { data: users, isLoading, error } = useCompanyUsers()
  const updateRoleMutation = useUpdateUserRole()
  const toggleActiveMutation = useToggleUserActive()
  const { userProfile } = useAuth()

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [deactivateUserId, setDeactivateUserId] = useState<string | null>(null)

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    await updateRoleMutation.mutateAsync({ userId, role: newRole })
  }

  const handleToggleActive = async (userId: string, currentlyActive: boolean) => {
    if (currentlyActive) {
      // Show confirmation dialog for deactivation
      setDeactivateUserId(userId)
    } else {
      // Activate immediately
      await toggleActiveMutation.mutateAsync({ userId, isActive: true })
    }
  }

  const confirmDeactivate = async () => {
    if (deactivateUserId) {
      await toggleActiveMutation.mutateAsync({ userId: deactivateUserId, isActive: false })
      setDeactivateUserId(null)
    }
  }

  const getInitials = (firstName?: string | null, lastName?: string | null, email?: string | null) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (firstName) {
      return firstName.slice(0, 2).toUpperCase()
    }
    if (email) {
      return email.slice(0, 2).toUpperCase()
    }
    return '??'
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default'
      case 'admin':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container max-w-6xl py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-72 mt-2" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="container max-w-6xl py-6">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Failed to load users</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="container max-w-6xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold heading-page">User Management</h1>
            <p className="text-muted-foreground">
              Manage team members and control access
            </p>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-100">
                <Users className="h-5 w-5 text-info" />
              </div>
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  {users?.length || 0} user{users?.length !== 1 ? 's' : ''} in your organization
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {users && users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const isCurrentUser = user.id === userProfile?.id
                    const isOwner = user.role === 'owner'
                    const canModify = !isCurrentUser && !isOwner

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                              {getInitials(user.first_name, user.last_name, user.email)}
                            </div>
                            <div>
                              <div className="font-medium">
                                {user.first_name && user.last_name
                                  ? `${user.first_name} ${user.last_name}`
                                  : user.email}
                                {isCurrentUser && (
                                  <span className="text-muted-foreground ml-2">(you)</span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {canModify ? (
                            <Select
                              value={user.role || 'worker'}
                              onValueChange={(v) => handleRoleChange(user.id, v as UserRole)}
                              disabled={updateRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-[160px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {USER_ROLES.filter(r => r.value !== 'owner').map((r) => (
                                  <SelectItem key={r.value} value={r.value}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={getRoleBadgeVariant(user.role || 'worker')}>
                              {USER_ROLES.find(r => r.value === user.role)?.label || user.role}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.is_active ? 'default' : 'secondary'}
                            className={user.is_active ? 'bg-success-light text-green-800' : ''}
                          >
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {canModify && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {user.is_active ? (
                                  <DropdownMenuItem
                                    onClick={() => handleToggleActive(user.id, true)}
                                    className="text-destructive"
                                  >
                                    <UserX className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleToggleActive(user.id, false)}
                                  >
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Activate
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No team members yet</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setInviteDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite your first user
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invite Dialog */}
        <InviteUserDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
        />

        {/* Deactivate Confirmation Dialog */}
        <AlertDialog
          open={!!deactivateUserId}
          onOpenChange={(open) => !open && setDeactivateUserId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate User</AlertDialogTitle>
              <AlertDialogDescription>
                This user will no longer be able to access the system. You can
                reactivate them at any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeactivate}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {toggleActiveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserX className="h-4 w-4 mr-2" />
                )}
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  )
}

export default UserManagementPage
