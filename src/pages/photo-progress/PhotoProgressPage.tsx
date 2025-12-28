/**
 * Photo Progress Page
 *
 * Main dashboard for Photo Progress with locations, photos, comparisons,
 * and reports tabs, statistics, filtering, and quick actions.
 */

import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
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
  PhotoProgressStatsCards,
  PhotoLocationCard,
  ProgressPhotoCard,
  PhotoComparisonCard,
  PhotoReportCard,
} from '@/features/photo-progress/components';
import {
  usePhotoLocations,
  useProgressPhotos,
  usePhotoComparisons,
  usePhotoReports,
  usePhotoProgressStats,
  useTogglePhotoFeatured,
  useDeleteProgressPhoto,
} from '@/features/photo-progress/hooks';
import { useMyProjects } from '@/features/projects/hooks/useProjects';
import {
  Plus,
  MapPin,
  Image,
  GitCompare,
  FileText,
  Search,
  Filter,
  Camera,
  Calendar,
} from 'lucide-react';
import type {
  PhotoLocationFilters,
  ProgressPhotoFilters,
  PhotoComparisonFilters,
  PhotoReportFilters,
  CaptureFrequency,
  ComparisonType,
  PhotoReportStatus,
  ProgressPhotoWithDetails,
} from '@/types/photo-progress';

export function PhotoProgressPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: projects, isLoading: isLoadingProjects } = useMyProjects();

  // Get project from URL or default to first project
  const selectedProjectId = searchParams.get('project') || projects?.[0]?.id || '';
  const activeTab = searchParams.get('tab') || 'locations';

  // Location filters
  const [locationSearch, setLocationSearch] = useState('');
  const [locationFrequency, setLocationFrequency] = useState<CaptureFrequency | 'all'>('all');

  // Photo filters
  const [photoSearch, setPhotoSearch] = useState('');
  const [photoFeatured, setPhotoFeatured] = useState<'all' | 'featured'>('all');

  // Comparison filters
  const [comparisonSearch, setComparisonSearch] = useState('');
  const [comparisonType, setComparisonType] = useState<ComparisonType | 'all'>('all');

  // Report filters
  const [reportSearch, setReportSearch] = useState('');
  const [reportStatus, setReportStatus] = useState<PhotoReportStatus | 'all'>('all');

  // Build filter objects
  const locationFilters: PhotoLocationFilters = useMemo(() => ({
    projectId: selectedProjectId,
    captureFrequency: locationFrequency !== 'all' ? locationFrequency : undefined,
    search: locationSearch || undefined,
  }), [selectedProjectId, locationFrequency, locationSearch]);

  const photoFilters: ProgressPhotoFilters = useMemo(() => ({
    projectId: selectedProjectId,
    isFeatured: photoFeatured === 'featured' ? true : undefined,
    search: photoSearch || undefined,
  }), [selectedProjectId, photoFeatured, photoSearch]);

  const comparisonFilters: PhotoComparisonFilters = useMemo(() => ({
    projectId: selectedProjectId,
    comparisonType: comparisonType !== 'all' ? comparisonType : undefined,
    search: comparisonSearch || undefined,
  }), [selectedProjectId, comparisonType, comparisonSearch]);

  const reportFilters: PhotoReportFilters = useMemo(() => ({
    projectId: selectedProjectId,
    status: reportStatus !== 'all' ? reportStatus : undefined,
    search: reportSearch || undefined,
  }), [selectedProjectId, reportStatus, reportSearch]);

  // Fetch data
  const { data: locations = [], isLoading: isLoadingLocations } = usePhotoLocations(locationFilters);
  const { data: photos = [], isLoading: isLoadingPhotos } = useProgressPhotos(photoFilters);
  const { data: comparisons = [], isLoading: isLoadingComparisons } = usePhotoComparisons(comparisonFilters);
  const { data: reports = [], isLoading: isLoadingReports } = usePhotoReports(reportFilters);
  const { data: stats } = usePhotoProgressStats(selectedProjectId);

  // Mutations
  const toggleFeaturedMutation = useTogglePhotoFeatured();
  const deletePhotoMutation = useDeleteProgressPhoto();

  const handleProjectChange = (projectId: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('project', projectId);
    setSearchParams(newParams);
  };

  const handleTabChange = (tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams);
  };

  const handleToggleFeatured = (id: string) => {
    toggleFeaturedMutation.mutate(id);
  };

  const handleDeletePhoto = (id: string) => {
    if (confirm('Are you sure you want to delete this photo?')) {
      deletePhotoMutation.mutate(id);
    }
  };

  const handleViewPhoto = (photo: ProgressPhotoWithDetails) => {
    window.open(photo.photo_url, '_blank');
  };

  const isLoading = isLoadingProjects || isLoadingLocations || isLoadingPhotos || isLoadingComparisons || isLoadingReports;

  // Show project selector if no project selected
  if (!isLoadingProjects && !selectedProjectId && projects?.length === 0) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12 bg-card rounded-lg border">
            <Camera className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="text-lg font-medium text-foreground mt-4 heading-subsection">
              No Projects Found
            </h3>
            <p className="text-muted mt-2">
              You need to be assigned to a project to view photo progress data.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground heading-page">Photo Progress</h1>
            <p className="text-muted mt-1">
              Track visual project progress with time-lapse photo comparisons
            </p>
          </div>
          <div className="flex gap-2">
            <Link to={`/projects/${selectedProjectId}/photo-progress/location/new`}>
              <Button variant="outline" disabled={!selectedProjectId}>
                <MapPin className="h-4 w-4 mr-2" />
                New Location
              </Button>
            </Link>
            <Link to={`/projects/${selectedProjectId}/photo-progress/upload`}>
              <Button disabled={!selectedProjectId}>
                <Camera className="h-4 w-4 mr-2" />
                Upload Photos
              </Button>
            </Link>
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
            {stats && <PhotoProgressStatsCards stats={stats} />}
            {!stats && isLoading && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-6">
              <TabsList className="mb-4">
                <TabsTrigger value="locations" className="gap-2">
                  <MapPin className="h-4 w-4" />
                  Locations
                  {locations.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded-full">
                      {locations.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="photos" className="gap-2">
                  <Image className="h-4 w-4" />
                  Photos
                  {photos.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded-full">
                      {photos.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="comparisons" className="gap-2">
                  <GitCompare className="h-4 w-4" />
                  Comparisons
                  {comparisons.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded-full">
                      {comparisons.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="reports" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Reports
                  {reports.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded-full">
                      {reports.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Locations Tab */}
              <TabsContent value="locations">
                {/* Location Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex-1 min-w-[200px] max-w-sm">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search locations..."
                        value={locationSearch}
                        onChange={(e) => setLocationSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Select value={locationFrequency} onValueChange={(v) => setLocationFrequency(v as CaptureFrequency | 'all')}>
                    <SelectTrigger className="w-[180px]">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Frequencies</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="milestone">At Milestones</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Locations Grid */}
                {isLoadingLocations ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-80" />
                    ))}
                  </div>
                ) : locations.length === 0 ? (
                  <div className="text-center py-12 bg-card rounded-lg border">
                    <MapPin className="h-12 w-12 text-gray-300 mx-auto" />
                    <h3 className="text-lg font-medium text-foreground mt-4">No Locations Found</h3>
                    <p className="text-muted mt-2">
                      {locationSearch || locationFrequency !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Create your first camera location to get started'}
                    </p>
                    {!locationSearch && locationFrequency === 'all' && (
                      <Link to={`/projects/${selectedProjectId}/photo-progress/location/new`}>
                        <Button className="mt-4">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Location
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {locations.map((location) => (
                      <PhotoLocationCard key={location.id} location={location} projectId={selectedProjectId} />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Photos Tab */}
              <TabsContent value="photos">
                {/* Photo Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex-1 min-w-[200px] max-w-sm">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search photos..."
                        value={photoSearch}
                        onChange={(e) => setPhotoSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Select value={photoFeatured} onValueChange={(v) => setPhotoFeatured(v as 'all' | 'featured')}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Photos</SelectItem>
                      <SelectItem value="featured">Featured Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Photos Grid */}
                {isLoadingPhotos ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="aspect-[4/3]" />
                    ))}
                  </div>
                ) : photos.length === 0 ? (
                  <div className="text-center py-12 bg-card rounded-lg border">
                    <Image className="h-12 w-12 text-gray-300 mx-auto" />
                    <h3 className="text-lg font-medium text-foreground mt-4">No Photos Found</h3>
                    <p className="text-muted mt-2">
                      {photoSearch || photoFeatured !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Upload your first progress photos to get started'}
                    </p>
                    {!photoSearch && photoFeatured === 'all' && (
                      <Link to={`/projects/${selectedProjectId}/photo-progress/upload`}>
                        <Button className="mt-4">
                          <Camera className="h-4 w-4 mr-2" />
                          Upload Photos
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {photos.map((photo) => (
                      <ProgressPhotoCard
                        key={photo.id}
                        photo={photo}
                        onToggleFeatured={handleToggleFeatured}
                        onDelete={handleDeletePhoto}
                        onView={handleViewPhoto}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Comparisons Tab */}
              <TabsContent value="comparisons">
                {/* Comparison Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex-1 min-w-[200px] max-w-sm">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search comparisons..."
                        value={comparisonSearch}
                        onChange={(e) => setComparisonSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Select value={comparisonType} onValueChange={(v) => setComparisonType(v as ComparisonType | 'all')}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="before_after">Before & After</SelectItem>
                      <SelectItem value="timelapse">Timelapse</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                    </SelectContent>
                  </Select>
                  <Link to={`/projects/${selectedProjectId}/photo-progress/comparison/new`}>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Comparison
                    </Button>
                  </Link>
                </div>

                {/* Comparisons Grid */}
                {isLoadingComparisons ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-64" />
                    ))}
                  </div>
                ) : comparisons.length === 0 ? (
                  <div className="text-center py-12 bg-card rounded-lg border">
                    <GitCompare className="h-12 w-12 text-gray-300 mx-auto" />
                    <h3 className="text-lg font-medium text-foreground mt-4">No Comparisons Found</h3>
                    <p className="text-muted mt-2">
                      {comparisonSearch || comparisonType !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Create your first photo comparison to get started'}
                    </p>
                    {!comparisonSearch && comparisonType === 'all' && (
                      <Link to={`/projects/${selectedProjectId}/photo-progress/comparison/new`}>
                        <Button className="mt-4">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Comparison
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {comparisons.map((comparison) => (
                      <PhotoComparisonCard
                        key={comparison.id}
                        comparison={comparison}
                        projectId={selectedProjectId}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Reports Tab */}
              <TabsContent value="reports">
                {/* Report Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex-1 min-w-[200px] max-w-sm">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search reports..."
                        value={reportSearch}
                        onChange={(e) => setReportSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Select value={reportStatus} onValueChange={(v) => setReportStatus(v as PhotoReportStatus | 'all')}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="review">In Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="distributed">Distributed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Link to={`/projects/${selectedProjectId}/photo-progress/report/new`}>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Report
                    </Button>
                  </Link>
                </div>

                {/* Reports Grid */}
                {isLoadingReports ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-48" />
                    ))}
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-12 bg-card rounded-lg border">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto" />
                    <h3 className="text-lg font-medium text-foreground mt-4">No Reports Found</h3>
                    <p className="text-muted mt-2">
                      {reportSearch || reportStatus !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Create your first photo progress report to get started'}
                    </p>
                    {!reportSearch && reportStatus === 'all' && (
                      <Link to={`/projects/${selectedProjectId}/photo-progress/report/new`}>
                        <Button className="mt-4">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Report
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reports.map((report) => (
                      <PhotoReportCard
                        key={report.id}
                        report={report}
                        projectId={selectedProjectId}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default PhotoProgressPage;
