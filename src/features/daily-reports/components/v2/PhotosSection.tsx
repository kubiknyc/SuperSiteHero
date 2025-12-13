/**
 * PhotosSection - Photo documentation with categorization
 * Supports upload, GPS metadata, and linking to other entries
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Pencil,
  Image,
  Upload,
  MapPin,
  Tag,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Navigation,
  MapPinOff,
} from 'lucide-react';
import { useDailyReportStoreV2 } from '../../store/dailyReportStoreV2';
import { usePhotoUploadManager, type ProcessedPhoto } from '../../hooks/usePhotoUploadManager';
import { useGeolocation, formatCoordinates } from '../../hooks/useGeolocation';
import { BatchUploadProgress } from './BatchUploadProgress';
import type { PhotoEntryV2, PhotoCategory } from '@/types/daily-reports-v2';

const PHOTO_CATEGORIES: { value: PhotoCategory; label: string; color: string }[] = [
  { value: 'progress', label: 'Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'safety', label: 'Safety', color: 'bg-red-100 text-red-700' },
  { value: 'quality', label: 'Quality', color: 'bg-green-100 text-green-700' },
  { value: 'delivery', label: 'Delivery', color: 'bg-orange-100 text-orange-700' },
  { value: 'weather', label: 'Weather', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'issue', label: 'Issue', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'inspection', label: 'Inspection', color: 'bg-purple-100 text-purple-700' },
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-700' },
];

interface PhotosSectionProps {
  expanded: boolean;
  onToggle: () => void;
}

export function PhotosSection({ expanded, onToggle }: PhotosSectionProps) {
  const photos = useDailyReportStoreV2((state) => state.photos);
  const addPhoto = useDailyReportStoreV2((state) => state.addPhoto);
  const updatePhoto = useDailyReportStoreV2((state) => state.updatePhoto);
  const removePhoto = useDailyReportStoreV2((state) => state.removePhoto);
  const draftReport = useDailyReportStoreV2((state) => state.draftReport);

  // For photo linking
  const delays = useDailyReportStoreV2((state) => state.delays);
  const safetyIncidents = useDailyReportStoreV2((state) => state.safetyIncidents);
  const inspections = useDailyReportStoreV2((state) => state.inspections);
  const deliveries = useDailyReportStoreV2((state) => state.deliveries);

  // Photo upload manager
  const { uploadProgress, processPhoto, isUploading, clearProgress } = usePhotoUploadManager();

  // GPS capture
  const {
    position: currentPosition,
    error: gpsError,
    isLoading: isGpsLoading,
    isSupported: gpsSupported,
    permissionStatus,
    getCurrentPosition,
  } = useGeolocation();

  // Track pending processed photos (before actual upload)
  const [pendingPhotos, setPendingPhotos] = useState<Map<string, ProcessedPhoto>>(new Map());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<PhotoEntryV2 | null>(null);
  const [formData, setFormData] = useState<Partial<PhotoEntryV2>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoGpsEnabled, setAutoGpsEnabled] = useState(true); // Auto-capture GPS for photos without EXIF GPS

  // Pre-fetch GPS when section is expanded and auto-GPS is enabled
  useEffect(() => {
    if (expanded && autoGpsEnabled && gpsSupported && !currentPosition && permissionStatus !== 'denied') {
      getCurrentPosition();
    }
  }, [expanded, autoGpsEnabled, gpsSupported, currentPosition, permissionStatus, getCurrentPosition]);

  const stats = useMemo(() => {
    const byCategory = PHOTO_CATEGORIES.map((cat) => ({
      ...cat,
      count: photos.filter((p) => p.category === cat.value).length,
    })).filter((c) => c.count > 0);
    return { total: photos.length, byCategory };
  }, [photos]);

  const getCategoryInfo = (category: PhotoCategory) => {
    return PHOTO_CATEGORIES.find((c) => c.value === category) || PHOTO_CATEGORIES[7];
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);

    // Get current GPS position if auto-GPS is enabled and we don't have one cached
    let fallbackGps: { latitude: number; longitude: number } | null = null;
    if (autoGpsEnabled && gpsSupported) {
      if (currentPosition) {
        fallbackGps = { latitude: currentPosition.latitude, longitude: currentPosition.longitude };
      } else {
        // Try to get position now
        const pos = await getCurrentPosition();
        if (pos) {
          fallbackGps = { latitude: pos.latitude, longitude: pos.longitude };
        }
      }
    }

    try {
      for (const file of Array.from(files)) {
        const photoId = crypto.randomUUID();

        try {
          // Process photo (compress, extract GPS/EXIF, generate thumbnail)
          const processed = await processPhoto(file, photoId);

          // Store the processed photo for later upload
          setPendingPhotos((prev) => new Map(prev).set(photoId, processed));

          // Create a temporary data URL for preview
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;

            // Use EXIF GPS if available, otherwise fall back to real-time GPS
            const hasExifGps = processed.gpsLatitude !== undefined && processed.gpsLongitude !== undefined;
            const gpsLatitude = hasExifGps ? processed.gpsLatitude : fallbackGps?.latitude;
            const gpsLongitude = hasExifGps ? processed.gpsLongitude : fallbackGps?.longitude;

            // Create photo entry with pending status
            const newPhoto: PhotoEntryV2 = {
              id: photoId,
              daily_report_id: draftReport?.id || '',
              file_url: processed.thumbnailDataUrl || dataUrl,
              thumbnail_url: processed.thumbnailDataUrl,
              category: 'general',
              upload_status: 'pending',
              gps_latitude: gpsLatitude,
              gps_longitude: gpsLongitude,
              taken_at: processed.takenAt || new Date().toISOString(),
              created_at: new Date().toISOString(),
            };

            addPhoto(newPhoto);

            // Show toast if GPS was added from device location
            if (!hasExifGps && gpsLatitude && gpsLongitude) {
              toast.success('GPS location added from device');
            }
          };
          reader.readAsDataURL(processed.compressedFile || file);
        } catch (error: any) {
          toast.error(`Failed to process ${file.name}: ${error.message}`);
        }
      }
    } finally {
      setIsProcessing(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [draftReport?.id, addPhoto, processPhoto, autoGpsEnabled, gpsSupported, currentPosition, getCurrentPosition]);

  const handleEdit = useCallback((photo: PhotoEntryV2) => {
    setFormData({ ...photo });
    setEditingPhoto(photo);
    setPreviewUrl(photo.file_url);
    setDialogOpen(true);
  }, []);

  const handleFormChange = useCallback((updates: Partial<PhotoEntryV2>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSave = useCallback(() => {
    if (editingPhoto) {
      updatePhoto(editingPhoto.id, formData);
    }
    setDialogOpen(false);
    setFormData({});
    setEditingPhoto(null);
    setPreviewUrl(null);
  }, [editingPhoto, formData, updatePhoto]);

  const handleCancel = useCallback(() => {
    setDialogOpen(false);
    setFormData({});
    setEditingPhoto(null);
    setPreviewUrl(null);
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (confirm('Delete this photo?')) {
      removePhoto(id);
    }
  }, [removePhoto]);

  return (
    <>
      <Card>
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Camera className="h-5 w-5 text-pink-600" />
            </div>
            <div className="text-left">
              <CardTitle className="text-base flex items-center gap-2">
                Photos
                {photos.length > 0 && (
                  <Badge variant="secondary">{photos.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {photos.length > 0
                  ? stats.byCategory.map((c) => `${c.count} ${c.label.toLowerCase()}`).join(', ')
                  : 'Document progress with photos'}
              </CardDescription>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {expanded && (
          <CardContent className="border-t p-0">
            {/* Upload Area */}
            <div className="p-4 bg-gray-50 border-b">
              {/* GPS Status Bar */}
              {gpsSupported && (
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Switch
                        id="auto-gps"
                        checked={autoGpsEnabled}
                        onCheckedChange={setAutoGpsEnabled}
                        className="data-[state=checked]:bg-green-500"
                      />
                      <Label htmlFor="auto-gps" className="text-sm text-gray-600 cursor-pointer">
                        Auto GPS
                      </Label>
                    </div>
                    {autoGpsEnabled && (
                      <div className="flex items-center gap-1 text-xs">
                        {isGpsLoading ? (
                          <span className="text-blue-500 flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Getting location...
                          </span>
                        ) : currentPosition ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {formatCoordinates(currentPosition.latitude, currentPosition.longitude, 4)}
                          </span>
                        ) : gpsError ? (
                          <span className="text-red-500 flex items-center gap-1">
                            <MapPinOff className="h-3 w-3" />
                            Location unavailable
                          </span>
                        ) : permissionStatus === 'denied' ? (
                          <span className="text-amber-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Permission denied
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                  {autoGpsEnabled && !currentPosition && !isGpsLoading && permissionStatus !== 'denied' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => getCurrentPosition()}
                      className="h-7 text-xs"
                    >
                      <Navigation className="h-3 w-3 mr-1" />
                      Get Location
                    </Button>
                  )}
                </div>
              )}

              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isProcessing || isUploading
                    ? 'border-blue-300 bg-blue-50 cursor-wait'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                }`}
                onClick={() => !isProcessing && !isUploading && fileInputRef.current?.click()}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-8 w-8 mx-auto mb-2 text-blue-500 animate-spin" />
                    <p className="text-sm text-blue-600">Processing photos...</p>
                    <p className="text-xs text-blue-400">Compressing and extracting metadata</p>
                  </>
                ) : isUploading ? (
                  <>
                    <Loader2 className="h-8 w-8 mx-auto mb-2 text-blue-500 animate-spin" />
                    <p className="text-sm text-blue-600">Uploading photos...</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Click to upload photos</p>
                    <p className="text-xs text-gray-400">or drag and drop</p>
                    {autoGpsEnabled && currentPosition && (
                      <p className="text-xs text-green-500 mt-1 flex items-center justify-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Location will be added to photos
                      </p>
                    )}
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                disabled={isProcessing || isUploading}
              />

              {/* Batch Upload Progress Indicator */}
              {Object.keys(uploadProgress).length > 0 && (
                <BatchUploadProgress
                  uploadProgress={uploadProgress}
                  isUploading={isUploading}
                  onDismiss={clearProgress}
                  className="mt-3"
                />
              )}
            </div>

            {/* Photo Grid */}
            {photos.length > 0 && (
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {photos.map((photo) => {
                    const catInfo = getCategoryInfo(photo.category);
                    const progress = uploadProgress[photo.id];
                    const isPending = photo.upload_status === 'pending';
                    const isFailed = photo.upload_status === 'failed' || progress?.status === 'failed';
                    const isCurrentlyUploading = progress?.status === 'uploading' || progress?.status === 'compressing';

                    return (
                      <div
                        key={photo.id}
                        className={`relative group rounded-lg overflow-hidden border ${
                          isFailed ? 'border-red-300' : isPending ? 'border-yellow-300' : ''
                        }`}
                      >
                        <img
                          src={photo.thumbnail_url || photo.file_url}
                          alt={photo.caption || 'Photo'}
                          className="w-full h-32 object-cover"
                        />

                        {/* Upload Status Overlay */}
                        {(isPending || isCurrentlyUploading || isFailed) && (
                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                            {isCurrentlyUploading && (
                              <>
                                <Loader2 className="h-6 w-6 text-white animate-spin mb-2" />
                                <span className="text-xs text-white">
                                  {progress?.progress || 0}%
                                </span>
                              </>
                            )}
                            {isPending && !isCurrentlyUploading && (
                              <>
                                <Upload className="h-5 w-5 text-yellow-400 mb-1" />
                                <span className="text-xs text-yellow-400">Pending upload</span>
                              </>
                            )}
                            {isFailed && (
                              <>
                                <AlertCircle className="h-5 w-5 text-red-400 mb-1" />
                                <span className="text-xs text-red-400">Upload failed</span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Success Indicator */}
                        {photo.upload_status === 'uploaded' && progress?.status === 'uploaded' && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 bg-white rounded-full" />
                          </div>
                        )}

                        {/* Overlay for actions */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(photo)}
                              className="p-1.5 bg-white rounded shadow hover:bg-blue-50"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(photo.id)}
                              className="p-1.5 bg-white rounded shadow hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </button>
                          </div>
                        </div>

                        {/* Category Badge */}
                        <div className="absolute bottom-2 left-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${catInfo.color}`}>
                            {catInfo.label}
                          </span>
                        </div>

                        {/* GPS Indicator */}
                        {photo.gps_latitude && photo.gps_longitude && (
                          <div className="absolute top-2 left-2">
                            <MapPin className="h-4 w-4 text-white drop-shadow" />
                          </div>
                        )}

                        {/* Linked Indicator */}
                        {photo.linked_to_type && photo.linked_to_id && (
                          <div className="absolute bottom-2 right-2">
                            <Tag className="h-4 w-4 text-white drop-shadow" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {photos.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Image className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No photos added.</p>
                <p className="text-sm">Upload photos to document work.</p>
              </div>
            )}

            {/* Summary by Category */}
            {photos.length > 0 && stats.byCategory.length > 0 && (
              <div className="p-4 bg-gray-100 border-t">
                <div className="flex flex-wrap gap-2">
                  {stats.byCategory.map((cat) => (
                    <Badge key={cat.value} variant="secondary" className={cat.color}>
                      {cat.count} {cat.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Photo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Preview */}
            {previewUrl && (
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-48 object-cover"
                />
              </div>
            )}

            {/* Caption */}
            <div className="space-y-2">
              <Label>Caption</Label>
              <Input
                value={formData.caption || ''}
                onChange={(e) => handleFormChange({ caption: e.target.value })}
                placeholder="Describe this photo..."
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category || 'general'}
                onValueChange={(value) => handleFormChange({ category: value as PhotoCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHOTO_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${cat.color.split(' ')[0]}`} />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Work Area */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Work Area</Label>
                <Input
                  value={formData.work_area || ''}
                  onChange={(e) => handleFormChange({ work_area: e.target.value })}
                  placeholder="e.g., 3rd Floor"
                />
              </div>
              <div className="space-y-2">
                <Label>Cost Code</Label>
                <Input
                  value={formData.cost_code || ''}
                  onChange={(e) => handleFormChange({ cost_code: e.target.value })}
                  placeholder="e.g., 03-100"
                />
              </div>
            </div>

            {/* GPS Info (read-only) */}
            {(formData.gps_latitude || formData.gps_longitude) && (
              <div className="p-3 bg-gray-100 rounded-lg text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {formData.gps_latitude?.toFixed(6)}, {formData.gps_longitude?.toFixed(6)}
                  </span>
                </div>
              </div>
            )}

            {/* Link to Entry */}
            <div className="space-y-2">
              <Label>Link to Entry (Optional)</Label>
              <Select
                value={formData.linked_to_type && formData.linked_to_id
                  ? `${formData.linked_to_type}:${formData.linked_to_id}`
                  : 'none'
                }
                onValueChange={(value) => {
                  if (value === 'none') {
                    handleFormChange({ linked_to_type: undefined, linked_to_id: undefined });
                  } else {
                    const [type, id] = value.split(':');
                    handleFormChange({ linked_to_type: type, linked_to_id: id });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Not linked" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not linked</SelectItem>

                  {/* Delays */}
                  {delays.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                        Delays
                      </div>
                      {delays.map((delay) => (
                        <SelectItem key={`delay:${delay.id}`} value={`delay:${delay.id}`}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            {delay.delay_type} - {delay.description?.substring(0, 30) || 'Delay'}
                            {delay.description && delay.description.length > 30 && '...'}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}

                  {/* Safety Incidents */}
                  {safetyIncidents.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                        Safety Incidents
                      </div>
                      {safetyIncidents.map((incident) => (
                        <SelectItem key={`safety_incident:${incident.id}`} value={`safety_incident:${incident.id}`}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            {incident.incident_type} - {incident.description?.substring(0, 30) || 'Incident'}
                            {incident.description && incident.description.length > 30 && '...'}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}

                  {/* Inspections */}
                  {inspections.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                        Inspections
                      </div>
                      {inspections.map((inspection) => (
                        <SelectItem key={`inspection:${inspection.id}`} value={`inspection:${inspection.id}`}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            {inspection.inspection_type} - {inspection.result || 'Pending'}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}

                  {/* Deliveries */}
                  {deliveries.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                        Deliveries
                      </div>
                      {deliveries.map((delivery) => (
                        <SelectItem key={`delivery:${delivery.id}`} value={`delivery:${delivery.id}`}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                            {delivery.material_description?.substring(0, 40) || 'Delivery'}
                            {delivery.material_description && delivery.material_description.length > 40 && '...'}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Link this photo to a delay, safety incident, inspection, or delivery for documentation
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PhotosSection;
