// File: /src/pages/lien-waivers/LienWaiversPage.tsx
// Lien Waivers list page with project filtering and status overview

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import {
  useLienWaivers,
  useProjectWaiverSummary,
} from '@/features/lien-waivers/hooks/useLienWaivers';
import {
  LienWaiverStatusBadge,
  LienWaiverTypeBadge,
  CreateLienWaiverDialog,
  WaiverComplianceCard,
} from '@/features/lien-waivers/components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect as Select } from '@/components/ui/select';
import {
  Plus,
  AlertCircle,
  Loader2,
  Search,
  FileCheck,
  Building2,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LIEN_WAIVER_STATUSES,
  LIEN_WAIVER_TYPES,
  formatWaiverAmount,
  isWaiverOverdue,
  getDaysUntilDue,
  type LienWaiverStatus,
  type LienWaiverWithDetails,
} from '@/types/lien-waiver';

export function LienWaiversPage() {
  const navigate = useNavigate();
  const { selectedProjectId, setSelectedProjectId, projects, isLoading: projectsLoading } = useSelectedProject();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LienWaiverStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Fetch data
  const { data: waivers, isLoading: waiversLoading, error } = useLienWaivers({
    projectId: selectedProjectId || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    waiverType: typeFilter !== 'all' ? typeFilter as any : undefined,
  });

  const summary = useProjectWaiverSummary(selectedProjectId);

  // Filter waivers
  const filteredWaivers = useMemo(() => {
    if (!waivers) {return [];}

    return waivers.filter((waiver) => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        waiver.waiver_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        waiver.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        waiver.subcontractor?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [waivers, searchTerm]);

  // Group by status for quick stats
  const statusCounts = useMemo(() => {
    if (!waivers) {return {};}
    return waivers.reduce((acc, waiver) => {
      acc[waiver.status] = (acc[waiver.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [waivers]);

  const renderWaiverCard = (waiver: LienWaiverWithDetails) => {
    const isOverdue = isWaiverOverdue(waiver);
    const daysUntilDue = waiver.due_date ? getDaysUntilDue(waiver.due_date) : null;

    return (
      <div
        key={waiver.id}
        className={cn(
          'py-4 px-4 hover:bg-surface cursor-pointer rounded-lg transition-colors border-b last:border-b-0',
          isOverdue && 'bg-error-light hover:bg-error-light'
        )}
        onClick={() => navigate(`/lien-waivers/${waiver.id}`)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-semibold text-lg">{waiver.waiver_number}</span>
              <LienWaiverStatusBadge status={waiver.status} />
              <LienWaiverTypeBadge type={waiver.waiver_type} />
              {isOverdue && (
                <Badge className="bg-error-light text-error-dark">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Overdue
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {/* Vendor/Sub */}
              <div>
                <span className="text-muted">Vendor:</span>
                <p className="font-medium">
                  {waiver.subcontractor?.company_name || waiver.vendor_name || 'N/A'}
                </p>
              </div>

              {/* Amount */}
              <div>
                <span className="text-muted">Amount:</span>
                <p className="font-medium text-success-dark">
                  {formatWaiverAmount(waiver.payment_amount)}
                </p>
              </div>

              {/* Through Date */}
              <div>
                <span className="text-muted">Through:</span>
                <p className="font-medium">
                  {format(new Date(waiver.through_date), 'MMM d, yyyy')}
                </p>
              </div>

              {/* Due Date */}
              <div>
                <span className="text-muted">Due:</span>
                <p className={cn('font-medium', isOverdue && 'text-error')}>
                  {waiver.due_date ? (
                    <>
                      {format(new Date(waiver.due_date), 'MMM d, yyyy')}
                      {daysUntilDue !== null && !isOverdue && daysUntilDue <= 7 && (
                        <span className="text-warning ml-1">({daysUntilDue}d)</span>
                      )}
                    </>
                  ) : (
                    'Not set'
                  )}
                </p>
              </div>
            </div>

            {/* Status-specific info */}
            {waiver.status === 'sent' && waiver.sent_at && (
              <div className="mt-2 text-sm text-primary flex items-center gap-1">
                <Send className="h-4 w-4" />
                Sent: {format(new Date(waiver.sent_at), 'MMM d, yyyy')}
                {waiver.sent_to_email && ` to ${waiver.sent_to_email}`}
              </div>
            )}

            {waiver.status === 'approved' && waiver.approved_at && (
              <div className="mt-2 text-sm text-success flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Approved: {format(new Date(waiver.approved_at), 'MMM d, yyyy')}
              </div>
            )}

            {waiver.status === 'rejected' && waiver.rejection_reason && (
              <div className="mt-2 text-sm text-error">
                Rejection: {waiver.rejection_reason}
              </div>
            )}
          </div>

          <ChevronRight className="h-5 w-5 text-disabled mt-2" />
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 heading-page">
              <FileCheck className="h-7 w-7 text-primary" />
              Lien Waivers
            </h1>
            <p className="text-secondary mt-1">
              Manage lien waiver requests and compliance
            </p>
          </div>

          {selectedProjectId && (
            <CreateLienWaiverDialog
              projectId={selectedProjectId}
              trigger={
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Request Waiver
                </Button>
              }
            />
          )}
        </div>

        {/* Project Selector */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="project-select" className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4" />
                  Select Project
                </Label>
                <Select
                  id="project-select"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={projectsLoading}
                >
                  <option value="">Select a project...</option>
                  {projects?.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Summary */}
        {selectedProjectId && summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <WaiverComplianceCard summary={summary} className="md:col-span-2" />

            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {LIEN_WAIVER_STATUSES.slice(0, 6).map((status) => (
                  <div key={status.value} className="flex justify-between text-sm">
                    <span className="text-secondary">{status.label}</span>
                    <Badge variant="outline">{statusCounts[status.value] || 0}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        {selectedProjectId && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-disabled" />
                    <Input
                      type="text"
                      placeholder="Search waivers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="w-full md:w-48">
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as LienWaiverStatus | 'all')}
                  >
                    <option value="all">All Statuses</option>
                    {LIEN_WAIVER_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label} ({statusCounts[status.value] || 0})
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Type Filter */}
                <div className="w-full md:w-48">
                  <Select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    {LIEN_WAIVER_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Waivers List */}
        {!selectedProjectId ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2 heading-subsection">Select a Project</h3>
              <p className="text-muted">
                Choose a project above to view and manage lien waivers
              </p>
            </CardContent>
          </Card>
        ) : waiversLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-disabled mb-4" />
              <p className="text-muted">Loading lien waivers...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-red-200 bg-error-light">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-8 w-8 mx-auto text-error mb-4" />
              <h3 className="text-lg font-medium text-red-800 mb-2 heading-subsection">Error Loading Waivers</h3>
              <p className="text-error">{error.message}</p>
            </CardContent>
          </Card>
        ) : filteredWaivers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileCheck className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2 heading-subsection">No Lien Waivers</h3>
              <p className="text-muted mb-4">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'No waivers match your filters'
                  : 'Create your first waiver request to start tracking'}
              </p>
              <CreateLienWaiverDialog
                projectId={selectedProjectId}
                trigger={
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Request Waiver
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Lien Waivers ({filteredWaivers.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {filteredWaivers.map(renderWaiverCard)}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

export default LienWaiversPage;
