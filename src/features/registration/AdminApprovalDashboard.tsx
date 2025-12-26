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
  Loader2,
  UserCheck,
  TrendingUp,
  Sparkles
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
    if (!selectedUserId) {return;}

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

    if (diffHours < 1) {return 'Just now';}
    if (diffHours < 24) {return `${diffHours}h ago`;}
    if (diffDays === 1) {return 'Yesterday';}
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
      <>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&family=DM+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        <div className="min-h-screen bg-[#FAF5F0] p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D4622A] to-[#B8541F] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#D4622A]/30 animate-pulse">
              <Loader2 className="h-10 w-10 text-white animate-spin" strokeWidth={2.5} />
            </div>
            <p
              className="text-[#6B5D52] text-lg font-semibold"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Loading pending users...
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&family=DM+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div className="min-h-screen bg-[#FAF5F0] p-6">
        {/* Warm gradient backgrounds */}
        <div className="fixed inset-0 bg-gradient-to-br from-[#D4622A]/5 via-transparent to-[#8B4513]/5 pointer-events-none" />
        <div className="fixed top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-[#D4622A]/10 to-transparent blur-3xl pointer-events-none" />

        {/* Floating decorative elements */}
        <div className="fixed top-20 left-10 w-32 h-32 rounded-full bg-[#D4622A]/10 blur-2xl animate-float" />
        <div className="fixed bottom-20 right-10 w-40 h-40 rounded-full bg-[#8B4513]/10 blur-2xl animate-float-delayed" />

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Header */}
          <div className="mb-10 animate-fade-in-up">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4622A] to-[#B8541F] flex items-center justify-center shadow-xl shadow-[#D4622A]/30">
                <UserCheck size={32} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1
                  className="text-4xl md:text-5xl font-bold text-[#2C2C2C] tracking-tight"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  User Approvals
                </h1>
                <p
                  className="text-[#6B5D52] text-lg mt-1"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Review and manage access requests
                </p>
              </div>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
              <div
                className="bg-white/95 backdrop-blur-xl rounded-2xl border border-[#D4622A]/10 p-6 shadow-lg shadow-[#D4622A]/5 animate-fade-in-up"
                style={{ animationDelay: '0.1s' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-[#6B5D52] text-sm font-bold uppercase tracking-wider mb-2"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Pending Requests
                    </p>
                    <p
                      className="text-4xl font-bold text-[#2C2C2C]"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {pendingUsers.length}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#D4622A]/20 to-[#B8541F]/10 flex items-center justify-center">
                    <Clock size={28} className="text-[#D4622A]" strokeWidth={2} />
                  </div>
                </div>
              </div>

              <div
                className="bg-white/95 backdrop-blur-xl rounded-2xl border border-[#D4622A]/10 p-6 shadow-lg shadow-[#D4622A]/5 animate-fade-in-up"
                style={{ animationDelay: '0.2s' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-[#6B5D52] text-sm font-bold uppercase tracking-wider mb-2"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Approved Today
                    </p>
                    <p
                      className="text-4xl font-bold text-[#2C2C2C]"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      12
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 size={28} className="text-emerald-600" strokeWidth={2} />
                  </div>
                </div>
              </div>

              <div
                className="bg-white/95 backdrop-blur-xl rounded-2xl border border-[#D4622A]/10 p-6 shadow-lg shadow-[#D4622A]/5 animate-fade-in-up"
                style={{ animationDelay: '0.3s' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-[#6B5D52] text-sm font-bold uppercase tracking-wider mb-2"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Avg Response Time
                    </p>
                    <p
                      className="text-4xl font-bold text-[#2C2C2C]"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      4.2h
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <TrendingUp size={28} className="text-amber-600" strokeWidth={2} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div
            className="bg-white/95 backdrop-blur-xl rounded-2xl border border-[#D4622A]/10 p-6 mb-8 shadow-lg shadow-[#D4622A]/5 animate-fade-in-up"
            style={{ animationDelay: '0.4s' }}
          >
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B5D52]" size={20} strokeWidth={2.5} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or role..."
                  className="w-full pl-12 pr-4 py-3.5 bg-[#FAF5F0] border-2 border-[#E0D5C7] rounded-xl text-[#2C2C2C] placeholder-[#6B5D52]/50 focus:border-[#D4622A] focus:outline-none transition-colors shadow-sm"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
              </div>

              {/* Filter */}
              <div className="flex gap-3">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-6 py-3.5 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 shadow-sm ${
                    filter === 'all'
                      ? 'bg-gradient-to-r from-[#D4622A] to-[#B8541F] text-white shadow-lg shadow-[#D4622A]/30'
                      : 'bg-white border-2 border-[#E0D5C7] text-[#6B5D52] hover:border-[#D4622A]/30'
                  }`}
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <Filter size={18} strokeWidth={2.5} />
                  All
                </button>
                <button
                  onClick={() => setFilter('recent')}
                  className={`px-6 py-3.5 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 shadow-sm ${
                    filter === 'recent'
                      ? 'bg-gradient-to-r from-[#D4622A] to-[#B8541F] text-white shadow-lg shadow-[#D4622A]/30'
                      : 'bg-white border-2 border-[#E0D5C7] text-[#6B5D52] hover:border-[#D4622A]/30'
                  }`}
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <Sparkles size={18} strokeWidth={2.5} />
                  Recent
                </button>
              </div>
            </div>
          </div>

          {/* Pending Users List */}
          <div className="space-y-5">
            {filteredUsers.length === 0 ? (
              <div
                className="bg-white/95 backdrop-blur-xl rounded-2xl border border-[#D4622A]/10 p-16 text-center shadow-lg shadow-[#D4622A]/5 animate-fade-in-up"
                style={{ animationDelay: '0.5s' }}
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#D4622A]/10 to-[#B8541F]/5 flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <CheckCircle2 size={48} className="text-[#D4622A]" strokeWidth={2} />
                </div>
                <h3
                  className="text-2xl font-bold text-[#2C2C2C] mb-3"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  All caught up!
                </h3>
                <p
                  className="text-[#6B5D52] text-lg"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  No pending approval requests at the moment.
                </p>
              </div>
            ) : (
              filteredUsers.map((user, index) => (
                <div
                  key={user.id}
                  className="bg-white/95 backdrop-blur-xl rounded-2xl border border-[#D4622A]/10 overflow-hidden hover:border-[#D4622A]/30 hover:shadow-xl hover:shadow-[#D4622A]/10 transition-all duration-300 animate-slide-up shadow-lg shadow-[#D4622A]/5"
                  style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                >
                  <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      {/* User Info */}
                      <div className="flex items-start gap-5 flex-1">
                        {/* Avatar */}
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#D4622A] to-[#B8541F] flex items-center justify-center flex-shrink-0 border-2 border-[#D4622A]/20 shadow-lg shadow-[#D4622A]/20">
                          <span
                            className="text-white text-xl font-bold"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                          >
                            {user.firstName[0]}{user.lastName[0]}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <h3
                            className="text-2xl font-bold text-[#2C2C2C] mb-3"
                            style={{ fontFamily: "'Playfair Display', serif" }}
                          >
                            {user.firstName} {user.lastName}
                          </h3>

                          <div className="space-y-2.5">
                            <div
                              className="flex items-center gap-2.5 text-[#6B5D52]"
                              style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                              <Mail size={18} strokeWidth={2} />
                              <span className="truncate">{user.email}</span>
                            </div>

                            <div
                              className="flex items-center gap-2.5 text-[#6B5D52]"
                              style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                              <Briefcase size={18} strokeWidth={2} />
                              <span>{user.role}</span>
                            </div>

                            <div
                              className="flex items-center gap-2.5"
                              style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                              <Clock size={18} className="text-[#D4622A]" strokeWidth={2} />
                              <span className="text-[#D4622A] font-bold">
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
                          className="group px-8 py-4 bg-white hover:bg-red-50 border-2 border-[#E0D5C7] hover:border-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-[#6B5D52] hover:text-red-600 rounded-xl transition-all duration-300 flex items-center justify-center gap-2.5 font-bold min-w-[160px] shadow-sm hover:shadow-md"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {rejectUser.isPending ? (
                            <>
                              <Loader2 size={20} className="animate-spin" strokeWidth={2.5} />
                              Rejecting...
                            </>
                          ) : (
                            <>
                              <XCircle size={20} strokeWidth={2.5} />
                              Reject
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleApprove(user.id)}
                          disabled={approveUser.isPending || rejectUser.isPending}
                          className="px-8 py-4 bg-gradient-to-r from-[#D4622A] to-[#B8541F] hover:from-[#B8541F] hover:to-[#D4622A] disabled:from-[#E0D5C7] disabled:to-[#E0D5C7] disabled:cursor-not-allowed text-white rounded-xl transition-all duration-300 flex items-center justify-center gap-2.5 font-bold shadow-xl shadow-[#D4622A]/30 hover:shadow-2xl hover:shadow-[#D4622A]/40 min-w-[160px]"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {approveUser.isPending ? (
                            <>
                              <Loader2 size={20} className="animate-spin" strokeWidth={2.5} />
                              Approving...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={20} strokeWidth={2.5} />
                              Approve
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Warning for old requests */}
                  {new Date().getTime() - new Date(user.requestedAt).getTime() > 24 * 60 * 60 * 1000 && (
                    <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border-t border-amber-200 px-6 md:px-8 py-4 flex items-center gap-3">
                      <AlertTriangle size={18} className="text-amber-600" strokeWidth={2.5} />
                      <span
                        className="text-amber-700 font-bold"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        This request has been pending for over 24 hours
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* CSS Animations */}
        <style>{`
          @keyframes fade-in-up {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

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

          @keyframes float {
            0%, 100% {
              transform: translate(0, 0);
            }
            50% {
              transform: translate(20px, -20px);
            }
          }

          @keyframes float-delayed {
            0%, 100% {
              transform: translate(0, 0);
            }
            50% {
              transform: translate(-20px, 20px);
            }
          }

          .animate-fade-in-up {
            animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
          }

          .animate-slide-up {
            animation: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
            opacity: 0;
          }

          .animate-float {
            animation: float 8s ease-in-out infinite;
          }

          .animate-float-delayed {
            animation: float-delayed 8s ease-in-out infinite;
            animation-delay: 2s;
          }
        `}</style>
      </div>

      {/* Reject User Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-white border-[#E0D5C7] shadow-2xl shadow-[#D4622A]/20">
          <DialogHeader>
            <DialogTitle
              className="text-[#2C2C2C] text-2xl font-bold"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Reject User Registration
            </DialogTitle>
            <DialogDescription
              className="text-[#6B5D52] text-base mt-2"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Are you sure you want to reject this user? You can optionally provide a
              reason that will be sent to the user via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <label
                htmlFor="rejection-reason"
                className="text-sm font-bold text-[#2C2C2C]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Reason for rejection (optional)
              </label>
              <Textarea
                id="rejection-reason"
                placeholder="e.g., Please contact HR to verify your employment status..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="bg-[#FAF5F0] border-2 border-[#E0D5C7] text-[#2C2C2C] placeholder-[#6B5D52]/50 focus:border-[#D4622A] rounded-xl"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={handleRejectCancel}
              className="px-6 py-3 bg-white hover:bg-[#FAF5F0] border-2 border-[#E0D5C7] text-[#6B5D52] hover:text-[#2C2C2C] hover:border-[#D4622A]/30 rounded-xl transition-all duration-200 font-bold"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Cancel
            </button>
            <button
              onClick={handleRejectConfirm}
              disabled={rejectUser.isPending}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2 font-bold shadow-lg"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
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
    </>
  );
}
