// Admin Approval Dashboard
// Interface for company admins to review and approve/reject pending users

import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  User,
  Briefcase,
  Calendar,
  Filter,
  Search,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import {
  usePendingUsers,
  useApproveUser,
  useRejectUser,
} from '@/features/user-management/hooks/usePendingUsers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export function AdminApprovalDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'recent'>('all');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Use real API hooks
  const { data: apiUsers, isLoading } = usePendingUsers();
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

  // Convert API users to component format
  const pendingUsers = (apiUsers || []).map(user => ({
    id: user.id,
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    email: user.email,
    role: user.role,
    requestedAt: user.created_at,
  }));

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const filteredUsers = pendingUsers
    .filter(user => {
      const matchesSearch =
        user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase());

      if (filter === 'recent') {
        const isRecent = new Date().getTime() - new Date(user.requestedAt).getTime() < 24 * 60 * 60 * 1000;
        return matchesSearch && isRecent;
      }

      return matchesSearch;
    });

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F1419] p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#FF6B35] mx-auto mb-4" />
          <p className="text-[#95A5A6] text-lg">Loading pending users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1419] p-6">
      {/* Background elements */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(#2C3E50 1px, transparent 1px),
            linear-gradient(90deg, #2C3E50 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#FFA500] flex items-center justify-center shadow-lg shadow-[#FF6B35]/20">
              <User size={24} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                User Approvals
              </h1>
              <p className="text-[#95A5A6]">Review and manage access requests</p>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-[#1A1A2E]/50 backdrop-blur-sm rounded-xl border border-[#2C3E50]/30 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#95A5A6] text-sm font-semibold uppercase tracking-wide mb-1">
                    Pending Requests
                  </p>
                  <p className="text-3xl font-bold text-white">{pendingUsers.length}</p>
                </div>
                <div className="w-14 h-14 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center">
                  <Clock size={28} className="text-[#FF6B35]" />
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A2E]/50 backdrop-blur-sm rounded-xl border border-[#2C3E50]/30 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#95A5A6] text-sm font-semibold uppercase tracking-wide mb-1">
                    Approved Today
                  </p>
                  <p className="text-3xl font-bold text-white">12</p>
                </div>
                <div className="w-14 h-14 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-green-500" />
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A2E]/50 backdrop-blur-sm rounded-xl border border-[#2C3E50]/30 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#95A5A6] text-sm font-semibold uppercase tracking-wide mb-1">
                    Avg Response Time
                  </p>
                  <p className="text-3xl font-bold text-white">4.2h</p>
                </div>
                <div className="w-14 h-14 rounded-lg bg-[#2C3E50]/30 flex items-center justify-center">
                  <Calendar size={28} className="text-[#95A5A6]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-[#1A1A2E]/80 backdrop-blur-xl rounded-2xl border border-[#2C3E50]/50 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#95A5A6]" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or role..."
                className="w-full pl-12 pr-4 py-3 bg-[#0F1419] border-2 border-[#2C3E50] rounded-xl text-white placeholder-[#95A5A6]/50 focus:border-[#FF6B35] focus:outline-none transition-colors"
              />
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                  filter === 'all'
                    ? 'bg-[#FF6B35] text-white'
                    : 'bg-[#2C3E50]/30 text-[#95A5A6] hover:bg-[#2C3E50]/50'
                }`}
              >
                <Filter size={18} />
                All
              </button>
              <button
                onClick={() => setFilter('recent')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                  filter === 'recent'
                    ? 'bg-[#FF6B35] text-white'
                    : 'bg-[#2C3E50]/30 text-[#95A5A6] hover:bg-[#2C3E50]/50'
                }`}
              >
                Recent
              </button>
            </div>
          </div>
        </div>

        {/* Pending Users List */}
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="bg-[#1A1A2E]/50 backdrop-blur-sm rounded-2xl border border-[#2C3E50]/30 p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-[#2C3E50]/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={40} className="text-[#95A5A6]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">All caught up!</h3>
              <p className="text-[#95A5A6]">No pending approval requests at the moment.</p>
            </div>
          ) : (
            filteredUsers.map((user, index) => (
              <div
                key={user.id}
                className="bg-[#1A1A2E]/80 backdrop-blur-xl rounded-2xl border border-[#2C3E50]/50 overflow-hidden hover:border-[#FF6B35]/30 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    {/* User Info */}
                    <div className="flex items-start gap-4 flex-1">
                      {/* Avatar */}
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#2C3E50] to-[#95A5A6]/20 flex items-center justify-center flex-shrink-0 border-2 border-[#2C3E50]">
                        <span className="text-white text-xl font-bold">
                          {user.firstName[0]}{user.lastName[0]}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-white mb-1">
                          {user.firstName} {user.lastName}
                        </h3>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[#95A5A6]">
                            <Mail size={16} />
                            <span className="text-sm truncate">{user.email}</span>
                          </div>

                          <div className="flex items-center gap-2 text-[#95A5A6]">
                            <Briefcase size={16} />
                            <span className="text-sm">{user.role}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-[#FF6B35]" />
                            <span className="text-sm text-[#FF6B35] font-semibold">
                              Requested {formatTimeAgo(user.requestedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => handleRejectClick(user.id)}
                        disabled={approveUser.isPending || rejectUser.isPending}
                        className="group px-6 py-3 bg-[#2C3E50]/30 hover:bg-red-500/10 border-2 border-[#2C3E50] hover:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed text-[#95A5A6] hover:text-red-400 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-semibold min-w-[140px]"
                      >
                        {rejectUser.isPending ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Rejecting...
                          </>
                        ) : (
                          <>
                            <XCircle size={18} />
                            Reject
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleApprove(user.id)}
                        disabled={approveUser.isPending || rejectUser.isPending}
                        className="px-6 py-3 bg-gradient-to-r from-[#FF6B35] to-[#FFA500] hover:from-[#FF6B35]/90 hover:to-[#FFA500]/90 disabled:from-[#2C3E50] disabled:to-[#2C3E50] disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-semibold shadow-lg shadow-[#FF6B35]/20 min-w-[140px]"
                      >
                        {approveUser.isPending ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={18} />
                            Approve
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Warning for old requests */}
                {new Date().getTime() - new Date(user.requestedAt).getTime() > 24 * 60 * 60 * 1000 && (
                  <div className="bg-amber-500/10 border-t border-amber-500/20 px-6 py-3 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <span className="text-sm text-amber-500 font-semibold">
                      This request has been pending for over 24 hours
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reject User Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-[#1A1A2E] border-[#2C3E50]">
          <DialogHeader>
            <DialogTitle className="text-white">Reject User Registration</DialogTitle>
            <DialogDescription className="text-[#95A5A6]">
              Are you sure you want to reject this user? You can optionally provide a
              reason that will be sent to the user via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="rejection-reason" className="text-sm font-medium text-white">
                Reason for rejection (optional)
              </label>
              <Textarea
                id="rejection-reason"
                placeholder="e.g., Please contact HR to verify your employment status..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="bg-[#0F1419] border-[#2C3E50] text-white placeholder-[#95A5A6]/50"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={handleRejectCancel}
              className="px-6 py-3 bg-[#2C3E50]/30 hover:bg-[#2C3E50]/50 text-[#95A5A6] hover:text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRejectConfirm}
              disabled={rejectUser.isPending}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2"
            >
              {rejectUser.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject User'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
