/**
 * Quality Control Page
 *
 * Main dashboard for Quality Control with NCRs and Inspections tabs,
 * statistics, filtering, and quick actions.
 */

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SmartLayout } from '@/components/layout/SmartLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  NCRCard,
  InspectionCard,
  QCStatsCards,
  NCRFormDialog,
  InspectionFormDialog,
} from '@/features/quality-control/components';
import {
  useNCRs,
  useInspections,
  useProjectQCStats,
} from '@/features/quality-control/hooks';
import { useMyProjects } from '@/features/projects/hooks/useProjects';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  Plus,
  FileWarning,
  ClipboardCheck,
  Search,
  Filter,
  AlertTriangle,
} from 'lucide-react';
import type { NCRFilters, InspectionFilters, NCRStatus, NCRSeverity, InspectionStatus } from '@/types/quality-control';

export function QualityControlPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: projects, isLoading: isLoadingProjects } = useMyProjects();
  const { userProfile } = useAuth();

  // Get project from URL or default to first project
  const selectedProjectId = searchParams.get('project') || projects?.[0]?.id || '';
  const activeTab = searchParams.get('tab') || 'ncrs';

  // NCR filters
  const [ncrSearch, setNCRSearch] = useState('');
  const [ncrStatus, setNCRStatus] = useState<NCRStatus | 'all'>('all');
  const [ncrSeverity, setNCRSeverity] = useState<NCRSeverity | 'all'>('all');

  // Inspection filters
  const [inspSearch, setInspSearch] = useState('');
  const [inspStatus, setInspStatus] = useState<InspectionStatus | 'all'>('all');

  // Dialog states
  const [showNCRDialog, setShowNCRDialog] = useState(false);
  const [showInspectionDialog, setShowInspectionDialog] = useState(false);

  // Build filter objects
  const ncrFilters: NCRFilters = useMemo(() => ({
    projectId: selectedProjectId,
    status: ncrStatus !== 'all' ? ncrStatus : undefined,
    severity: ncrSeverity !== 'all' ? ncrSeverity : undefined,
    searchTerm: ncrSearch || undefined,
  }), [selectedProjectId, ncrStatus, ncrSeverity, ncrSearch]);

  const inspFilters: InspectionFilters = useMemo(() => ({
    projectId: selectedProjectId,
    status: inspStatus !== 'all' ? inspStatus : undefined,
    searchTerm: inspSearch || undefined,
  }), [selectedProjectId, inspStatus, inspSearch]);

  // Fetch data
  const { data: ncrs = [], isLoading: isLoadingNCRs } = useNCRs(ncrFilters);
  const { data: inspections = [], isLoading: isLoadingInspections } = useInspections(inspFilters);
  const { data: stats } = useProjectQCStats(selectedProjectId);

  const handleProjectChange = useCallback((projectId: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('project', projectId);
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const handleTabChange = useCallback((tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const isLoading = isLoadingProjects || isLoadingNCRs || isLoadingInspections;

  // Show project selector if no project selected
  if (!isLoadingProjects && !selectedProjectId && projects?.length === 0) {
    return (
      <SmartLayout title="Quality Control" subtitle="QC management">
        <div className="p-6">
          <div className="text-center py-12 bg-card rounded-lg border">
            <FileWarning className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="heading-card text-foreground mt-4">
              No Projects Found
            </h3>
            <p className="text-muted mt-2">
              You need to be assigned to a project to view quality control data.
            </p>
          </div>
        </div>
      </SmartLayout>
    );
  }

  return (
    <SmartLayout title="Quality Control" subtitle="QC management">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="heading-page text-foreground">Quality Control</h1>
            <p className="text-muted mt-1">
              Manage NCRs and QC inspections for your projects
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={!selectedProjectId}
              onClick={() => setShowNCRDialog(true)}
            >
              <FileWarning className="h-4 w-4 mr-2" />
              New NCR
            </Button>
            <Button
              disabled={!selectedProjectId}
              onClick={() => setShowInspectionDialog(true)}
            >
              <ClipboardCheck className="h-4 w-4 mr-2" />
              New Inspection
            </Button>
          </div>
        </div>

        {/* Project Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-secondary mb-2">
            Select Project
          </label>
          <Select value={selectedProjectId} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Select a project..." />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProjectId && (
          <>
            {/* Statistics Cards */}
            {stats && <QCStatsCards stats={stats} />}
            {!stats && isLoading && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-6">
              <TabsList className="mb-4">
                <TabsTrigger value="ncrs" className="gap-2">
                  <FileWarning className="h-4 w-4" />
                  NCRs
                  {ncrs.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded-full">
                      {ncrs.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="inspections" className="gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  Inspections
                  {inspections.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded-full">
                      {inspections.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* NCRs Tab */}
              <TabsContent value="ncrs">
                {/* NCR Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex-1 min-w-[200px] max-w-sm">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search NCRs..."
                        value={ncrSearch}
                        onChange={(e) => setNCRSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Select value={ncrStatus} onValueChange={(v) => setNCRStatus(v as NCRStatus | 'all')}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="corrective_action">Corrective Action</SelectItem>
                      <SelectItem value="verification">Verification</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="voided">Voided</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={ncrSeverity} onValueChange={(v) => setNCRSeverity(v as NCRSeverity | 'all')}>
                    <SelectTrigger className="w-[160px]">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="minor">Minor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* NCR Grid */}
                {isLoadingNCRs ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-48" />
                    ))}
                  </div>
                ) : ncrs.length === 0 ? (
                  <div className="text-center py-12 bg-card rounded-lg border">
                    <FileWarning className="h-12 w-12 text-gray-300 mx-auto" />
                    <h3 className="heading-card text-foreground mt-4">No NCRs Found</h3>
                    <p className="text-muted mt-2">
                      {ncrSearch || ncrStatus !== 'all' || ncrSeverity !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Create your first NCR to get started'}
                    </p>
                    {!ncrSearch && ncrStatus === 'all' && ncrSeverity === 'all' && (
                      <Button className="mt-4" onClick={() => setShowNCRDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create NCR
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ncrs.map((ncr) => (
                      <NCRCard key={ncr.id} ncr={ncr} projectId={selectedProjectId} />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Inspections Tab */}
              <TabsContent value="inspections">
                {/* Inspection Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex-1 min-w-[200px] max-w-sm">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search inspections..."
                        value={inspSearch}
                        onChange={(e) => setInspSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Select value={inspStatus} onValueChange={(v) => setInspStatus(v as InspectionStatus | 'all')}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="passed">Passed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="conditional">Conditional</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Inspections Grid */}
                {isLoadingInspections ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-48" />
                    ))}
                  </div>
                ) : inspections.length === 0 ? (
                  <div className="text-center py-12 bg-card rounded-lg border">
                    <ClipboardCheck className="h-12 w-12 text-gray-300 mx-auto" />
                    <h3 className="heading-card text-foreground mt-4">No Inspections Found</h3>
                    <p className="text-muted mt-2">
                      {inspSearch || inspStatus !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Schedule your first inspection to get started'}
                    </p>
                    {!inspSearch && inspStatus === 'all' && (
                      <Button className="mt-4" onClick={() => setShowInspectionDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Schedule Inspection
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inspections.map((inspection) => (
                      <InspectionCard
                        key={inspection.id}
                        inspection={inspection}
                        projectId={selectedProjectId}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* NCR Form Dialog */}
        {selectedProjectId && userProfile?.company_id && (
          <NCRFormDialog
            projectId={selectedProjectId}
            companyId={userProfile.company_id}
            open={showNCRDialog}
            onOpenChange={setShowNCRDialog}
          />
        )}

        {/* Inspection Form Dialog */}
        {selectedProjectId && userProfile?.company_id && (
          <InspectionFormDialog
            projectId={selectedProjectId}
            companyId={userProfile.company_id}
            open={showInspectionDialog}
            onOpenChange={setShowInspectionDialog}
          />
        )}
      </div>
    </SmartLayout>
  );
}

export default QualityControlPage;
