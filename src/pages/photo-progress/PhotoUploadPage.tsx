/**
 * Photo Upload Page
 *
 * Page for uploading progress photos with metadata and optional location assignment.
 */

import { useState, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePhotoLocations,
  useCreateProgressPhotos,
} from '@/features/photo-progress/hooks';
import { useProject } from '@/features/projects/hooks/useProjects';
import { useCompanyId } from '@/hooks/useCompanyId';
import { uploadFile } from '@/lib/storage/upload';
import { format } from 'date-fns';
import {
  Camera,
  Upload,
  X,
  ArrowLeft,
  Image as ImageIcon,
  MapPin,
  Calendar,
  Cloud,
  Thermometer,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  WeatherCondition,
  getWeatherConditionLabel,
  type CreateProgressPhotoDTO,
  type PhotoLocationFilters,
} from '@/types/photo-progress';

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  caption: string;
  locationId: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  photoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export function PhotoUploadPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const preselectedLocationId = searchParams.get('location') || '';
  const companyId = useCompanyId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch project and locations
  const { data: project, isLoading: isLoadingProject } = useProject(projectId);
  const locationFilters: PhotoLocationFilters = { projectId: projectId || '' };
  const { data: locations = [], isLoading: isLoadingLocations } = usePhotoLocations(locationFilters);

  // Upload mutation
  const createPhotosMutation = useCreateProgressPhotos();

  // Form state
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [captureDate, setCaptureDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weatherCondition, setWeatherCondition] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [defaultLocationId, setDefaultLocationId] = useState(preselectedLocationId);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) {return;}

    const newFiles: UploadedFile[] = Array.from(selectedFiles).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      caption: '',
      locationId: defaultLocationId,
      status: 'pending' as const,
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [defaultLocationId]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;

    const newFiles: UploadedFile[] = Array.from(droppedFiles)
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview: URL.createObjectURL(file),
        caption: '',
        locationId: defaultLocationId,
        status: 'pending' as const,
        progress: 0,
      }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, [defaultLocationId]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const updateFileCaption = (id: string, caption: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, caption } : f))
    );
  };

  const updateFileLocation = (id: string, locationId: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, locationId } : f))
    );
  };

  const handleUpload = async () => {
    if (!projectId || !companyId || files.length === 0) {return;}

    setIsUploading(true);

    try {
      // Upload each file to storage
      const uploadedPhotos: CreateProgressPhotoDTO[] = [];

      for (const fileData of files) {
        try {
          // Update status to uploading
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileData.id ? { ...f, status: 'uploading' as const, progress: 0 } : f
            )
          );

          // Upload to storage
          const photoUrl = await uploadFile(fileData.file, {
            bucket: 'progress-photos',
            path: `${projectId}/${captureDate}`,
            onProgress: (progress) => {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === fileData.id ? { ...f, progress } : f
                )
              );
            },
          });

          // Create photo DTO
          const photoDto: CreateProgressPhotoDTO = {
            project_id: projectId,
            company_id: companyId,
            photo_url: photoUrl,
            original_filename: fileData.file.name,
            file_size: fileData.file.size,
            capture_date: captureDate,
            location_id: fileData.locationId || undefined,
            caption: fileData.caption || undefined,
            notes: notes || undefined,
            weather_condition: weatherCondition || undefined,
            temperature: temperature ? parseFloat(temperature) : undefined,
          };

          uploadedPhotos.push(photoDto);

          // Update status to success
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileData.id
                ? { ...f, status: 'success' as const, progress: 100, photoUrl }
                : f
            )
          );
        } catch (_error) {
          // Update status to error
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileData.id
                ? { ...f, status: 'error' as const, error: 'Failed to upload' }
                : f
            )
          );
        }
      }

      // Create photo records in database
      if (uploadedPhotos.length > 0) {
        await createPhotosMutation.mutateAsync(uploadedPhotos);
      }

      // Navigate back after a short delay to show success
      setTimeout(() => {
        navigate(`/projects/${projectId}/photo-progress?tab=photos`);
      }, 1500);
    } catch (_error) {
      console.error('Upload error:', _error);
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading = isLoadingProject || isLoadingLocations;
  const hasFilesToUpload = files.length > 0;
  const allUploaded = files.every((f) => f.status === 'success');
  const hasErrors = files.some((f) => f.status === 'error');

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
              Upload Progress Photos
            </h1>
            <p className="text-muted mt-1">{project?.name || 'Project'}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Common Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Photo Details
              </CardTitle>
              <CardDescription>
                Common settings applied to all uploaded photos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="captureDate">Capture Date *</Label>
                  <Input
                    id="captureDate"
                    type="date"
                    value={captureDate}
                    onChange={(e) => setCaptureDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="defaultLocation">Default Location</Label>
                  <Select value={defaultLocationId} onValueChange={setDefaultLocationId}>
                    <SelectTrigger id="defaultLocation">
                      <MapPin className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Location</SelectItem>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="weatherCondition">Weather</Label>
                  <Select value={weatherCondition} onValueChange={setWeatherCondition}>
                    <SelectTrigger id="weatherCondition">
                      <Cloud className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Select weather" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Not specified</SelectItem>
                      {Object.values(WeatherCondition).map((condition) => (
                        <SelectItem key={condition} value={condition}>
                          {getWeatherConditionLabel(condition)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="temperature">Temperature</Label>
                  <div className="relative">
                    <Thermometer className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="temperature"
                      type="number"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="72"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes about these photos..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Drop Zone */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Select Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">
                  Drop photos here or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports JPG, PNG, HEIC formats
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>

          {/* Selected Files */}
          {hasFilesToUpload && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Selected Photos ({files.length})
                  </CardTitle>
                  {allUploaded && (
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      All Uploaded
                    </Badge>
                  )}
                  {hasErrors && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Some Failed
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {files.map((fileData) => (
                    <div
                      key={fileData.id}
                      className="flex gap-4 p-4 border rounded-lg bg-card"
                    >
                      {/* Preview */}
                      <div className="relative w-24 h-24 flex-shrink-0">
                        <img
                          src={fileData.preview}
                          alt={fileData.file.name}
                          className="w-full h-full object-cover rounded-md"
                        />
                        {fileData.status === 'success' && (
                          <div className="absolute inset-0 bg-green-500/20 rounded-md flex items-center justify-center">
                            <Check className="h-8 w-8 text-green-600" />
                          </div>
                        )}
                        {fileData.status === 'error' && (
                          <div className="absolute inset-0 bg-red-500/20 rounded-md flex items-center justify-center">
                            <AlertCircle className="h-8 w-8 text-red-600" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm truncate max-w-xs">
                              {fileData.file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          {fileData.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFile(fileData.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {fileData.status === 'pending' && (
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Caption (optional)"
                              value={fileData.caption}
                              onChange={(e) => updateFileCaption(fileData.id, e.target.value)}
                              className="text-sm"
                            />
                            <Select
                              value={fileData.locationId}
                              onValueChange={(v) => updateFileLocation(fileData.id, v)}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue placeholder="Location" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">No Location</SelectItem>
                                {locations.map((loc) => (
                                  <SelectItem key={loc.id} value={loc.id}>
                                    {loc.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {fileData.status === 'uploading' && (
                          <Progress value={fileData.progress} className="h-2" />
                        )}

                        {fileData.status === 'error' && (
                          <p className="text-sm text-red-600">{fileData.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!hasFilesToUpload || isUploading || allUploaded}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading
                ? 'Uploading...'
                : allUploaded
                ? 'Done'
                : `Upload ${files.length} Photo${files.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default PhotoUploadPage;
