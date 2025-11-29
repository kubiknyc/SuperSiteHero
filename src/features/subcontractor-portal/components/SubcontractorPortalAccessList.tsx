/**
 * SubcontractorPortalAccessList Component
 * Shows all subcontractors with portal access for a project
 * Allows GCs to manage permissions and send invitations
 */

import { useState } from 'react'
import { useProjectPortalAccess, useRevokePortalAccess } from '../hooks/useInvitations'
import { InviteSubcontractorDialog } from './InviteSubcontractorDialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  Building2,
  Mail,
  MoreHorizontal,
  Plus,
  Shield,
  ShieldOff,
  UserCheck,
  UserX,
  Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import type { SubcontractorPortalAccessWithRelations } from '@/types/subcontractor-portal'

interface SubcontractorPortalAccessListProps {
  projectId: string
}

function AccessSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}

function getUserDisplayName(user?: { first_name?: string | null; last_name?: string | null; email?: string }): string {
  if (!user) return 'Unknown'
  if (user.first_name || user.last_name) {
    return [user.first_name, user.last_name].filter(Boolean).join(' ')
  }
  return user.email || 'Unknown'
}

export function SubcontractorPortalAccessList({ projectId }: SubcontractorPortalAccessListProps) {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false)
  const [selectedAccess, setSelectedAccess] = useState<SubcontractorPortalAccessWithRelations | null>(null)

  const { data: accessRecords, isLoading, isError } = useProjectPortalAccess(projectId)
  const revokeAccess = useRevokePortalAccess()

  const handleRevokeClick = (access: SubcontractorPortalAccessWithRelations) => {
    setSelectedAccess(access)
    setRevokeConfirmOpen(true)
  }

  const handleRevokeConfirm = () => {
    if (selectedAccess) {
      revokeAccess.mutate(
        { accessId: selectedAccess.id, projectId },
        {
          onSuccess: () => {
            setRevokeConfirmOpen(false)
            setSelectedAccess(null)
          },
        }
      )
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Subcontractor Portal Access
          </CardTitle>
          <CardDescription>
            Manage which subcontractors can access the portal for this project
          </CardDescription>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Invite
        </Button>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <AccessSkeleton />
        ) : isError ? (
          <div className="text-center py-8 text-muted-foreground">
            Failed to load portal access records
          </div>
        ) : !accessRecords || accessRecords.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground mb-4">
              No subcontractors have portal access yet
            </p>
            <Button variant="outline" onClick={() => setInviteDialogOpen(true)}>
              <Mail className="mr-2 h-4 w-4" />
              Send First Invitation
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subcontractor</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invited</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accessRecords.map((access) => (
                <TableRow key={access.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{access.subcontractor?.company_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {access.subcontractor?.trade}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{getUserDisplayName(access.user)}</p>
                      <p className="text-xs text-muted-foreground">{access.user?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {access.is_active ? (
                      access.accepted_at ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                          <UserCheck className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          <Clock className="mr-1 h-3 w-3" />
                          Pending
                        </Badge>
                      )
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-100">
                        <UserX className="mr-1 h-3 w-3" />
                        Revoked
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(access.invited_at), 'MMM d, yyyy')}
                      {access.invited_by_user && (
                        <p className="text-xs">
                          by {getUserDisplayName(access.invited_by_user)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {access.is_active ? (
                          <DropdownMenuItem
                            onClick={() => handleRevokeClick(access)}
                            className="text-destructive"
                          >
                            <ShieldOff className="mr-2 h-4 w-4" />
                            Revoke Access
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem disabled>
                            <Shield className="mr-2 h-4 w-4" />
                            Restore Access
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Invite Dialog */}
      <InviteSubcontractorDialog
        projectId={projectId}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />

      {/* Revoke Confirmation */}
      <AlertDialog open={revokeConfirmOpen} onOpenChange={setRevokeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Portal Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {selectedAccess?.subcontractor?.company_name}'s access to the
              subcontractor portal. They will no longer be able to view or update their
              assigned work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeAccess.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeConfirm}
              disabled={revokeAccess.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeAccess.isPending ? 'Revoking...' : 'Revoke Access'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

export default SubcontractorPortalAccessList
