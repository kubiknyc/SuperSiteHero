/**
 * Photo Location Detail Page
 *
 * Page for viewing a photo location's details, photo history, and actions.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  usePhotoLocation,
  usePhotosForLocation,
  useDeletePhotoLocation,
  useTogglePhotoFeatured,
  useDeleteProgressPhoto,
} from '@/features/photo-progress/hooks';
import { ProgressPhotoCard, BeforeAfterSlider } from '@/features/photo-progress/components';
import { useProject } from '@/features/projects/hooks/useProjects';
import { formatDistanceToNow, format } from 'date-fns';
import {
  MapPin,
  Camera,
  Compass,
  Calendar,
  Edit2,
  Trash2,
  ArrowLeft,
  Building2,
  Layers,
  Image as ImageIcon,
  Play,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  getCaptureFrequencyLabel,
} from '@/types/photo-progress';
import type { ProgressPhotoWithDetails } from '@/types/photo-progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function PhotoLocationDetailPage() {
  const navigate = useNavigate();
  const { projectId, locationId } = useParams<{ projectId: string; locationId: string }>();
  const [activeTab, setActiveTab] = useState('photos');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Fetch data
  const { data: location, isLoading: isLoadingLocation } = usePhotoLocation(locationId);
  const { data: photos = [], isLoading: isLoadingPhotos } = usePhotosForLocation(locationId);
  const { data: project, isLoading: isLoadingProject } = useProject(projectId);

  // Mutations
  const deleteMutation = useDeletePhotoLocation();
  const toggleFeaturedMutation = useTogglePhotoFeatured();
  const deletePhotoMutation = useDeleteProgressPhoto();

  const handleDelete = async () => {
    if (!locationId) {return;}
    try {
      await deleteMutation.mutateAsync(locationId);
      navigate(`/projects/${projectId}/photo-progress?tab=locations`);
    } catch (error) {
      // Error handled by mutation
    }
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

  // Get sorted photos for timelapse
  const sortedPhotos = [...photos].sort(
    (a, b) => new Date(a.capture_date).getTime() - new Date(b.capture_date).getTime()
  );

  const isLoading = isLoadingLocation || isLoadingProject || isLoadingPhotos;
  const isDue = location?.next_capture_date && new Date(location.next_capture_date) <= new Date();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-10 w-10" />
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!location) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Location Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This photo location may have been deleted.
            </p>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                {location.location_code && (
                  <span className="text-sm text-muted-foreground">{location.location_code}</span>
                )}
                <Badge variant={location.is_active ? 'default' : 'secondary'}>
                  {location.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {isDue && (
                  <Badge variant="destructive" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Due for Capture
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-foreground heading-page">
                {location.name}
              </h1>
              <p className="text-muted mt-1">{project?.name || 'Project'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to={`/projects/${projectId}/photo-progress/upload?location=${locationId}`}>
              <Button>
                <Camera className="h-4 w-4 mr-2" />
                Add Photo
              </Button>
            </Link>
            <Link to={`/projects/${projectId}/photo-progress/location/${locationId}/edit`}>
              <Button variant="outline">
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Location</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this photo location? This action cannot be undone.
                    Photos at this location will not be deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Location Details Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {location.description && (
                <div className="col-span-2 md:col-span-4">
                  <p className="text-muted-foreground">{location.description}</p>
                </div>
              )}

              {(location.building || location.floor || location.area) && (
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">
                      {[location.building, location.floor, location.area].filter(Boolean).join(' / ')}
                    </p>
                  </div>
                </div>
              )}

              {location.camera_direction && (
                <div className="flex items-start gap-3">
                  <Compass className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Camera Direction</p>
                    <p className="font-medium capitalize">{location.camera_direction}</p>
                  </div>
                </div>
              )}

              {location.camera_height && (
                <div className="flex items-start gap-3">
                  <Layers className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Camera Height</p>
                    <p className="font-medium capitalize">{location.camera_height.replace('_', ' ')}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Capture Frequency</p>
                  <p className="font-medium">{getCaptureFrequencyLabel(location.capture_frequency)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ImageIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Photo Count</p>
                  <p className="font-medium">{photos.length} photos</p>
                </div>
              </div>

              {location.next_capture_date && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Next Capture</p>
                    <p className={`font-medium ${isDue ? 'text-destructive' : ''}`}>
                      {format(new Date(location.next_capture_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {location.capture_instructions && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm font-medium mb-2">Capture Instructions</p>
                <p className="text-muted-foreground">{location.capture_instructions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs for Photos and Timeline */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="photos" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Photos ({photos.length})
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Play className="h-4 w-4" />
              Timeline View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photos" className="mt-6">
            {photos.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Photos Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload your first photo for this location
                  </p>
                  <Link to={`/projects/${projectId}/photo-progress/upload?location=${locationId}`}>
                    <Button>
                      <Camera className="h-4 w-4 mr-2" />
                      Upload Photo
                    </Button>
                  </Link>
                </CardContent>
              </Card>
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

          <TabsContent value="timeline" className="mt-6">
            {sortedPhotos.length < 2 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Not Enough Photos</h3>
                  <p className="text-muted-foreground">
                    Upload at least 2 photos to view the timeline
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-6">
                  {/* Timeline Slider */}
                  <div className="mb-6">
                    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                      <img
                        src={sortedPhotos[selectedPhotoIndex]?.thumbnail_url || sortedPhotos[selectedPhotoIndex]?.photo_url}
                        alt={`Photo from ${sortedPhotos[selectedPhotoIndex]?.capture_date}`}
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => setSelectedPhotoIndex((prev) => Math.max(0, prev - 1))}
                          disabled={selectedPhotoIndex === 0}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div className="bg-black/60 text-white px-4 py-2 rounded-full">
                          <p className="text-sm font-medium">
                            {format(new Date(sortedPhotos[selectedPhotoIndex]?.capture_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => setSelectedPhotoIndex((prev) => Math.min(sortedPhotos.length - 1, prev + 1))}
                          disabled={selectedPhotoIndex === sortedPhotos.length - 1}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Thumbnail Strip */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {sortedPhotos.map((photo, index) => (
                      <button
                        key={photo.id}
                        onClick={() => setSelectedPhotoIndex(index)}
                        className={`relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                          index === selectedPhotoIndex
                            ? 'border-primary ring-2 ring-primary/30'
                            : 'border-transparent hover:border-muted-foreground/50'
                        }`}
                      >
                        <img
                          src={photo.thumbnail_url || photo.photo_url}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>

                  {/* Range Slider */}
                  <div className="mt-4">
                    <input
                      type="range"
                      min={0}
                      max={sortedPhotos.length - 1}
                      value={selectedPhotoIndex}
                      onChange={(e) => setSelectedPhotoIndex(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{format(new Date(sortedPhotos[0]?.capture_date), 'MMM d, yyyy')}</span>
                      <span>{format(new Date(sortedPhotos[sortedPhotos.length - 1]?.capture_date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

export default PhotoLocationDetailPage;
