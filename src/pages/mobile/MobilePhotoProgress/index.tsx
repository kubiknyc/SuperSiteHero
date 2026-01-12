/**
 * Mobile Photo Progress Pages
 *
 * Camera-first photo capture and progress tracking for field workers.
 */

import { memo, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Camera,
  Image,
  Upload,
  MapPin,
  Calendar,
  Grid,
  List,
  X,
  Check,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { useSelectedProject } from '../../../hooks/useSelectedProject';
import { useProgressPhotos, useProgressPhoto, useCreateProgressPhoto } from '../../../features/photo-progress/hooks/usePhotoProgress';
import { usePhotoUpload } from '../../../features/photos/hooks/usePhotoUpload';
import { cn } from '../../../lib/utils';
import { format } from 'date-fns';

// Photo gallery/list view
export const MobilePhotoProgressList = memo(function MobilePhotoProgressList() {
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams();
  const { selectedProjectId, selectedProject } = useSelectedProject();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Use route projectId if available, otherwise fall back to selected project
  const projectId = routeProjectId || selectedProjectId;

  // Fetch real photos from the API
  const { data: photos = [], isLoading } = useProgressPhotos({
    projectId: projectId || '',
  });

  // Handle photo click - navigate to detail view
  const handlePhotoClick = useCallback((photoId: string) => {
    const basePath = projectId ? `/projects/${projectId}` : '';
    navigate(`${basePath}/photo-progress/${photoId}`);
  }, [navigate, projectId]);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Photo Progress</h1>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Capture button */}
      <Button
        className="w-full h-14"
        onClick={() => navigate(projectId ? `/projects/${projectId}/photo-progress/capture` : '/photo-progress/capture')}
      >
        <Camera className="h-5 w-5 mr-2" />
        Take New Photo
      </Button>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Photo grid/list */}
      {!isLoading && viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="aspect-square bg-muted rounded-lg overflow-hidden relative cursor-pointer active:scale-95 transition-transform"
              onClick={() => handlePhotoClick(photo.id)}
            >
              {photo.thumbnail_url || photo.photo_url ? (
                <img
                  src={photo.thumbnail_url || photo.photo_url}
                  alt={photo.caption || 'Progress photo'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-white text-xs font-medium truncate">
                  {photo.location_name || photo.caption || 'No location'}
                </p>
                <p className="text-white/70 text-xs">
                  {format(new Date(photo.capture_date), 'MMM d, yyyy')}
                </p>
              </div>
              {photo.is_featured && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                  Featured
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !isLoading ? (
        <div className="space-y-3">
          {photos.map((photo) => (
            <Card
              key={photo.id}
              className="cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => handlePhotoClick(photo.id)}
            >
              <CardContent className="p-3 flex gap-3">
                <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                  {photo.thumbnail_url || photo.photo_url ? (
                    <img
                      src={photo.thumbnail_url || photo.photo_url}
                      alt={photo.caption || 'Progress photo'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {photo.location_name || photo.caption || 'No location'}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {photo.notes || photo.caption || 'No description'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(photo.capture_date), 'MMM d, yyyy')}
                    {photo.is_featured && (
                      <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded">
                        Featured
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Empty state */}
      {!isLoading && photos.length === 0 && (
        <div className="text-center py-12">
          <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No photos yet</h3>
          <p className="text-muted-foreground mb-4">
            Capture your first progress photo
          </p>
        </div>
      )}
    </div>
  );
});

// Camera capture view
export const MobilePhotoCapture = memo(function MobilePhotoCapture() {
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams();
  const { selectedProjectId, selectedProject } = useSelectedProject();

  // Use route projectId if available, otherwise fall back to selected project
  const projectId = routeProjectId || selectedProjectId;
  const companyId = selectedProject?.company_id || '';

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Photo upload hook
  const { uploadPhoto, isUploading } = usePhotoUpload({
    projectId: projectId || '',
    folderPath: 'progress-photos',
  });

  // Create progress photo mutation
  const createProgressPhoto = useCreateProgressPhoto();

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    setDescription('');
    setLocation('');
  };

  const handleSave = async () => {
    if (!capturedFile || !projectId || !companyId) {
      return;
    }

    setIsSaving(true);

    try {
      // Upload the photo to storage
      const uploadResult = await uploadPhoto(capturedFile);

      // Create the progress photo record in the database
      await createProgressPhoto.mutateAsync({
        project_id: projectId,
        company_id: companyId,
        photo_url: uploadResult.fileUrl,
        thumbnail_url: uploadResult.thumbnailUrl,
        original_filename: uploadResult.fileName,
        file_size: uploadResult.fileSize,
        capture_date: new Date().toISOString().split('T')[0],
        caption: location || undefined,
        notes: description || undefined,
        photo_latitude: uploadResult.exifData?.latitude,
        photo_longitude: uploadResult.exifData?.longitude,
        camera_model: uploadResult.exifData?.cameraModel,
      });

      // Navigate back to the list
      navigate(projectId ? `/projects/${projectId}/photo-progress` : '/photo-progress');
    } catch (error) {
      console.error('Failed to save photo:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!capturedImage) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="w-32 h-32 mx-auto bg-muted rounded-full flex items-center justify-center">
            <Camera className="h-16 w-16 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">Take a Photo</h2>
            <p className="text-muted-foreground">
              Capture progress photos directly from your device
            </p>
          </div>
          <div className="space-y-3">
            <Button
              className="w-full h-14"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-5 w-5 mr-2" />
              Open Camera
            </Button>
            <Button
              variant="outline"
              className="w-full h-14"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload from Gallery
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCapture}
            className="hidden"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Preview */}
      <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
        <img
          src={capturedImage}
          alt="Captured"
          className="w-full h-full object-cover"
        />
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2"
          onClick={handleRetake}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="location"
            placeholder="e.g., Building A - Foundation"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="pl-10 h-12"
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe what's shown in the photo..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => navigate(-1)}
          disabled={isSaving || isUploading}
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={handleSave}
          disabled={isSaving || isUploading || !capturedFile}
        >
          {isSaving || isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" />
              Save Photo
            </>
          )}
        </Button>
      </div>
    </div>
  );
});

// Photo detail view
export const MobilePhotoDetail = memo(function MobilePhotoDetail() {
  const navigate = useNavigate();
  const { photoId } = useParams();

  // Fetch the specific photo directly
  const { data: photo, isLoading } = useProgressPhoto(photoId);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!photo) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center p-4">
        <Image className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium text-foreground mb-2">Photo not found</h2>
        <p className="text-muted-foreground mb-4">The photo you're looking for doesn't exist.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Full-width photo */}
      <div className="relative w-full aspect-[4/3] bg-black">
        <img
          src={photo.photo_url}
          alt={photo.caption || 'Progress photo'}
          className="w-full h-full object-contain"
        />
        {/* Back button overlay */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-black/50 hover:bg-black/70 text-white"
          onClick={() => navigate(-1)}
        >
          <X className="h-5 w-5" />
        </Button>
        {photo.is_featured && (
          <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
            Featured
          </div>
        )}
      </div>

      {/* Photo details */}
      <div className="p-4 space-y-4">
        {/* Location */}
        {(photo.location_name || photo.caption) && (
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {photo.location_name || photo.caption}
            </h1>
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(photo.capture_date), 'MMMM d, yyyy')}</span>
          </div>
          {(photo.photo_latitude && photo.photo_longitude) && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>
                {photo.photo_latitude.toFixed(4)}, {photo.photo_longitude.toFixed(4)}
              </span>
            </div>
          )}
        </div>

        {/* Notes/Description */}
        {photo.notes && (
          <div className="space-y-1.5">
            <h2 className="text-sm font-medium text-foreground">Notes</h2>
            <p className="text-sm text-muted-foreground">{photo.notes}</p>
          </div>
        )}

        {/* Weather */}
        {photo.weather_condition && (
          <div className="space-y-1.5">
            <h2 className="text-sm font-medium text-foreground">Weather</h2>
            <p className="text-sm text-muted-foreground capitalize">{photo.weather_condition}</p>
          </div>
        )}

        {/* Camera info */}
        {photo.camera_model && (
          <div className="space-y-1.5">
            <h2 className="text-sm font-medium text-foreground">Camera</h2>
            <p className="text-sm text-muted-foreground">{photo.camera_model}</p>
          </div>
        )}

        {/* Tags */}
        {photo.tags && photo.tags.length > 0 && (
          <div className="space-y-1.5">
            <h2 className="text-sm font-medium text-foreground">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {photo.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default MobilePhotoProgressList;
