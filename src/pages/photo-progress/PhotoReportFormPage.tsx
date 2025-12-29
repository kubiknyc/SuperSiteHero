/**
 * Photo Report Form Page
 *
 * Page for creating and editing photo progress reports.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePhotoReport,
  usePhotoLocations,
  useProgressPhotos,
  usePhotoComparisons,
  useCreatePhotoReport,
  useUpdatePhotoReport,
} from '@/features/photo-progress/hooks';
import { useProject } from '@/features/projects/hooks/useProjects';
import { useCompanyId } from '@/hooks/useCompanyId';
import { format, startOfMonth } from 'date-fns';
import {
  FileText,
  Save,
  ArrowLeft,
  Calendar,
  MapPin,
  Image as ImageIcon,
  GitCompare,
  FileBarChart,
} from 'lucide-react';
import { PhotoReportType } from '@/types/photo-progress';
import type {
  CreatePhotoReportDTO,
  UpdatePhotoReportDTO,
  PhotoLocationFilters,
  ProgressPhotoFilters,
  PhotoComparisonFilters,
} from '@/types/photo-progress';

export function PhotoReportFormPage() {
  const navigate = useNavigate();
  const { projectId, reportId } = useParams<{ projectId: string; reportId?: string }>();
  const companyId = useCompanyId();
  const isEditing = !!reportId && reportId !== 'new';

  // Fetch existing report if editing
  const { data: existingReport, isLoading: isLoadingReport } = usePhotoReport(
    isEditing ? reportId : undefined
  );
  const { data: project, isLoading: isLoadingProject } = useProject(projectId);

  // Fetch available data for selection
  const locationFilters: PhotoLocationFilters = { projectId: projectId || '' };
  const { data: locations = [], isLoading: isLoadingLocations } = usePhotoLocations(locationFilters);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reportType, setReportType] = useState<string>(PhotoReportType.PROGRESS);
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [progressNotes, setProgressNotes] = useState('');
  const [issuesNoted, setIssuesNoted] = useState('');
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [selectedComparisonIds, setSelectedComparisonIds] = useState<string[]>([]);

  // Fetch photos for the period
  const photoFilters: ProgressPhotoFilters = useMemo(() => ({
    projectId: projectId || '',
    startDate: periodStart,
    endDate: periodEnd,
  }), [projectId, periodStart, periodEnd]);
  const { data: photos = [], isLoading: isLoadingPhotos } = useProgressPhotos(photoFilters);

  // Fetch comparisons
  const comparisonFilters: PhotoComparisonFilters = { projectId: projectId || '' };
  const { data: comparisons = [], isLoading: isLoadingComparisons } = usePhotoComparisons(comparisonFilters);

  // Mutations
  const createMutation = useCreatePhotoReport();
  const updateMutation = useUpdatePhotoReport();

  // Load existing report data
  useEffect(() => {
    if (existingReport) {
      setTitle(existingReport.title || '');
      setDescription(existingReport.description || '');
      setReportType(existingReport.report_type || PhotoReportType.PROGRESS);
      setPeriodStart(existingReport.period_start || format(startOfMonth(new Date()), 'yyyy-MM-dd'));
      setPeriodEnd(existingReport.period_end || format(new Date(), 'yyyy-MM-dd'));
      setExecutiveSummary(existingReport.executive_summary || '');
      setProgressNotes(existingReport.progress_notes || '');
      setIssuesNoted(existingReport.issues_noted || '');
      setSelectedLocationIds(existingReport.location_ids || []);
      setSelectedPhotoIds(existingReport.photo_ids || []);
      setSelectedComparisonIds(existingReport.comparison_ids || []);
    }
  }, [existingReport]);

  // Auto-generate title based on type and period
  useEffect(() => {
    if (!isEditing && !title) {
      const month = format(new Date(periodEnd), 'MMMM yyyy');
      switch (reportType) {
        case PhotoReportType.MONTHLY:
          setTitle(`Monthly Photo Report - ${month}`);
          break;
        case PhotoReportType.MILESTONE:
          setTitle(`Milestone Photo Report - ${month}`);
          break;
        case PhotoReportType.FINAL:
          setTitle(`Final Photo Report - ${project?.name || ''}`);
          break;
        default:
          setTitle(`Progress Photo Report - ${format(new Date(periodStart), 'MMM d')} to ${format(new Date(periodEnd), 'MMM d, yyyy')}`);
      }
    }
  }, [reportType, periodStart, periodEnd, project?.name, isEditing, title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId || !companyId) {return;}

    try {
      if (isEditing && reportId) {
        const updateDto: UpdatePhotoReportDTO = {
          title,
          description: description || undefined,
          report_type: reportType,
          period_start: periodStart,
          period_end: periodEnd,
          executive_summary: executiveSummary || undefined,
          progress_notes: progressNotes || undefined,
          issues_noted: issuesNoted || undefined,
          location_ids: selectedLocationIds.length > 0 ? selectedLocationIds : undefined,
          photo_ids: selectedPhotoIds.length > 0 ? selectedPhotoIds : undefined,
          comparison_ids: selectedComparisonIds.length > 0 ? selectedComparisonIds : undefined,
        };

        await updateMutation.mutateAsync({ id: reportId, dto: updateDto });
      } else {
        const createDto: CreatePhotoReportDTO = {
          project_id: projectId,
          company_id: companyId,
          title,
          description: description || undefined,
          report_type: reportType,
          period_start: periodStart,
          period_end: periodEnd,
          executive_summary: executiveSummary || undefined,
          progress_notes: progressNotes || undefined,
          issues_noted: issuesNoted || undefined,
          location_ids: selectedLocationIds.length > 0 ? selectedLocationIds : undefined,
          photo_ids: selectedPhotoIds.length > 0 ? selectedPhotoIds : undefined,
          comparison_ids: selectedComparisonIds.length > 0 ? selectedComparisonIds : undefined,
        };

        await createMutation.mutateAsync(createDto);
      }

      navigate(`/projects/${projectId}/photo-progress?tab=reports`);
    } catch (_error) {
      // Error handled by mutation
    }
  };

  const toggleLocation = (locationId: string) => {
    setSelectedLocationIds((prev) =>
      prev.includes(locationId)
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId]
    );
  };

  const togglePhoto = (photoId: string) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId]
    );
  };

  const toggleComparison = (comparisonId: string) => {
    setSelectedComparisonIds((prev) =>
      prev.includes(comparisonId)
        ? prev.filter((id) => id !== comparisonId)
        : [...prev, comparisonId]
    );
  };

  const selectAllPhotos = () => {
    setSelectedPhotoIds(photos.map((p) => p.id));
  };

  const clearAllPhotos = () => {
    setSelectedPhotoIds([]);
  };

  const isLoading = isLoadingReport || isLoadingProject || isLoadingLocations;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground heading-page">
              {isEditing ? 'Edit Report' : 'New Photo Report'}
            </h1>
            <p className="text-muted mt-1">{project?.name || 'Project'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Report Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="title">Report Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter report title..."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="reportType">Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger id="reportType">
                      <FileBarChart className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PhotoReportType.PROGRESS}>Progress Report</SelectItem>
                      <SelectItem value={PhotoReportType.MILESTONE}>Milestone Report</SelectItem>
                      <SelectItem value={PhotoReportType.MONTHLY}>Monthly Report</SelectItem>
                      <SelectItem value={PhotoReportType.FINAL}>Final Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this report..."
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Period Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Report Period
              </CardTitle>
              <CardDescription>
                Select the date range this report covers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="periodStart">Period Start *</Label>
                  <Input
                    id="periodStart"
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="periodEnd">Period End *</Label>
                  <Input
                    id="periodEnd"
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Locations Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Included Locations
                <Badge variant="secondary" className="ml-2">
                  {selectedLocationIds.length} selected
                </Badge>
              </CardTitle>
              <CardDescription>
                Select which locations to include in this report
              </CardDescription>
            </CardHeader>
            <CardContent>
              {locations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No locations available
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {locations.map((location) => (
                    <div
                      key={location.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedLocationIds.includes(location.id)
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleLocation(location.id)}
                    >
                      <Checkbox
                        checked={selectedLocationIds.includes(location.id)}
                        onCheckedChange={() => toggleLocation(location.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{location.name}</p>
                        {location.location_code && (
                          <p className="text-xs text-muted-foreground">{location.location_code}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Photos Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Included Photos
                    <Badge variant="secondary" className="ml-2">
                      {selectedPhotoIds.length} selected
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Photos from the selected period
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllPhotos}
                    disabled={photos.length === 0}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearAllPhotos}
                    disabled={selectedPhotoIds.length === 0}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingPhotos ? (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {[...Array(12)].map((_, i) => (
                    <Skeleton key={i} className="aspect-square" />
                  ))}
                </div>
              ) : photos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No photos found for this period
                </p>
              ) : (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className={`relative aspect-square rounded-md overflow-hidden cursor-pointer border-2 transition-all ${
                        selectedPhotoIds.includes(photo.id)
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-transparent hover:border-muted-foreground/50'
                      }`}
                      onClick={() => togglePhoto(photo.id)}
                    >
                      <img
                        src={photo.thumbnail_url || photo.photo_url}
                        alt={photo.caption || 'Progress photo'}
                        className="w-full h-full object-cover"
                      />
                      {selectedPhotoIds.includes(photo.id) && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-primary-foreground text-xs">
                            {selectedPhotoIds.indexOf(photo.id) + 1}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comparisons Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitCompare className="h-5 w-5" />
                Included Comparisons
                <Badge variant="secondary" className="ml-2">
                  {selectedComparisonIds.length} selected
                </Badge>
              </CardTitle>
              <CardDescription>
                Select before/after comparisons to include
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingComparisons ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : comparisons.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No comparisons available
                </p>
              ) : (
                <div className="space-y-2">
                  {comparisons.map((comparison) => (
                    <div
                      key={comparison.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedComparisonIds.includes(comparison.id)
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleComparison(comparison.id)}
                    >
                      <Checkbox
                        checked={selectedComparisonIds.includes(comparison.id)}
                        onCheckedChange={() => toggleComparison(comparison.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{comparison.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {comparison.comparison_type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report Content */}
          <Card>
            <CardHeader>
              <CardTitle>Report Content</CardTitle>
              <CardDescription>
                Add narrative content to the report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="executiveSummary">Executive Summary</Label>
                <Textarea
                  id="executiveSummary"
                  value={executiveSummary}
                  onChange={(e) => setExecutiveSummary(e.target.value)}
                  placeholder="High-level summary of progress during this period..."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="progressNotes">Progress Notes</Label>
                <Textarea
                  id="progressNotes"
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  placeholder="Detailed notes on work completed..."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="issuesNoted">Issues Noted</Label>
                <Textarea
                  id="issuesNoted"
                  value={issuesNoted}
                  onChange={(e) => setIssuesNoted(e.target.value)}
                  placeholder="Any issues or concerns observed..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !title.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : isEditing ? 'Update Report' : 'Create Report'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

export default PhotoReportFormPage;
