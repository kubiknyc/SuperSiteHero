/**
 * BidInvitationTable Component
 * Table for managing bid invitations
 */

import { useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Building2,
  CheckCircle2,
  Clock,
  Download,
  Mail,
  MoreHorizontal,
  Send,
  User,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { InvitationStatusBadge } from './BidPackageStatusBadge'
import type { BidInvitationWithDetails } from '@/types/bidding'

interface BidInvitationTableProps {
  invitations: BidInvitationWithDetails[]
  isLoading?: boolean
  onResendInvitation?: (id: string) => void
  onDeleteInvitation?: (id: string) => void
  onBulkResend?: (ids: string[]) => void
  showBulkActions?: boolean
}

export function BidInvitationTable({
  invitations,
  isLoading,
  onResendInvitation,
  onDeleteInvitation,
  onBulkResend,
  showBulkActions = true,
}: BidInvitationTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const filteredInvitations = invitations.filter((inv) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      inv.company_name?.toLowerCase().includes(search) ||
      inv.contact_name?.toLowerCase().includes(search) ||
      inv.contact_email.toLowerCase().includes(search)
    )
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredInvitations.map((inv) => inv.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id])
    } else {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id))
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'declined':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />
      case 'no_response':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Bulk Actions */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search invitations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        {showBulkActions && selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBulkResend?.(selectedIds)}
            >
              <Send className="w-4 h-4 mr-2" />
              Resend Selected
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {showBulkActions && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      filteredInvitations.length > 0 &&
                      selectedIds.length === filteredInvitations.length
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invited</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvitations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showBulkActions ? 7 : 6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No invitations found
                </TableCell>
              </TableRow>
            ) : (
              filteredInvitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  {showBulkActions && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(invitation.id)}
                        onCheckedChange={(checked) =>
                          handleSelectOne(invitation.id, checked as boolean)
                        }
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {invitation.company_name || invitation.subcontractor?.company_name || 'Unknown'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-3 h-3 text-muted-foreground" />
                        {invitation.contact_name || 'No contact name'}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {invitation.contact_email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(invitation.response_status)}
                      <InvitationStatusBadge status={invitation.response_status} />
                    </div>
                    {invitation.responded_at && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(invitation.responded_at))} ago
                      </div>
                    )}
                    {invitation.decline_reason && (
                      <div className="text-xs text-red-600 mt-1">
                        Reason: {invitation.decline_reason}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(invitation.invited_at), 'MMM d, yyyy')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      via {invitation.invitation_method}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {invitation.documents_downloaded_at && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1">
                              <Download className="w-3 h-3 text-green-500" />
                              Documents downloaded
                            </TooltipTrigger>
                            <TooltipContent>
                              {format(new Date(invitation.documents_downloaded_at), 'PPp')}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {invitation.last_portal_access && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last access {formatDistanceToNow(new Date(invitation.last_portal_access))} ago
                        </div>
                      )}
                      {invitation.submission && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="w-3 h-3" />
                          Bid submitted
                        </div>
                      )}
                      {invitation.total_addenda && invitation.total_addenda > 0 && (
                        <div className="flex items-center gap-1">
                          Addenda: {invitation.addenda_acknowledged || 0}/{invitation.total_addenda} acknowledged
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onResendInvitation?.(invitation.id)}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Resend Invitation
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => onDeleteInvitation?.(invitation.id)}
                        >
                          Remove Invitation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{invitations.length} total invitations</span>
        <span className="text-green-600">
          {invitations.filter((i) => i.response_status === 'accepted').length} accepted
        </span>
        <span className="text-red-600">
          {invitations.filter((i) => i.response_status === 'declined').length} declined
        </span>
        <span className="text-yellow-600">
          {invitations.filter((i) => i.response_status === 'pending').length} pending
        </span>
      </div>
    </div>
  )
}
