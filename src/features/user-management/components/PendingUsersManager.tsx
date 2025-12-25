/**
 * Pending Users Manager Component
 *
 * Admin interface for approving or rejecting pending user registrations
 */

import { useState } from 'react';
import {
  usePendingUsers,
  useApproveUser,
  useRejectUser,
} from '../hooks/usePendingUsers';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, Loader2, UserCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function PendingUsersManager() {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: pendingUsers, isLoading, error } = usePendingUsers();
  const approveUser = useApproveUser();
  const rejectUser = useRejectUser();

  const handleApprove = async (userId: string) => {
    await approveUser.mutateAsync(userId);
  };

  const handleRejectClick = (userId: string) => {
    setSelectedUserId(userId);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedUserId) return;

    await rejectUser.mutateAsync({
      userId: selectedUserId,
      reason: rejectionReason.trim() || undefined,
    });

    setRejectDialogOpen(false);
    setSelectedUserId(null);
    setRejectionReason('');
  };

  const handleRejectCancel = () => {
    setRejectDialogOpen(false);
    setSelectedUserId(null);
    setRejectionReason('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load pending users. Please try again.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingCount = pendingUsers?.length || 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Pending User Approvals
              </CardTitle>
              <CardDescription>
                Review and approve new users joining your company
              </CardDescription>
            </div>
            {pendingCount > 0 && (
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {pendingCount} pending
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingCount === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No pending users</p>
              <p className="text-sm">All user registrations have been reviewed</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers?.map((user) => {
                    const displayName =
                      user.first_name || user.last_name
                        ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                        : 'No name provided';

                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{displayName}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(user.created_at), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(user.id)}
                              disabled={approveUser.isPending || rejectUser.isPending}
                            >
                              {approveUser.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                              <span className="ml-2">Approve</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectClick(user.id)}
                              disabled={approveUser.isPending || rejectUser.isPending}
                            >
                              {rejectUser.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                              <span className="ml-2">Reject</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject User Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject User Registration</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this user? You can optionally provide a
              reason that will be sent to the user via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="rejection-reason" className="text-sm font-medium">
                Reason for rejection (optional)
              </label>
              <Textarea
                id="rejection-reason"
                placeholder="e.g., Please contact HR to verify your employment status..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleRejectCancel}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectUser.isPending}
            >
              {rejectUser.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Reject User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
