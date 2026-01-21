/**
 * PhotosSection - Photo documentation with categorization
 * Supports upload, GPS metadata, and linking to other entries
 *
 * Mobile UX Features:
 * - Long-press context menu (replaces hover actions)
 * - Multi-select mode with bulk category assignment
 * - Swipeable lightbox for photo viewing
 * - Touch-friendly 48px+ targets
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Trash2,
  Pencil,
  Image,
  Upload,
  MapPin,
  Tag,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Navigation,
  MapPinOff,
  X,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckSquare,
  Square,
  FolderOpen,
  ZoomIn,
} from 'lucide-react';
import { useDailyReportStoreV2 } from '../../store/dailyReportStoreV2';
import { usePhotoUploadManager, type ProcessedPhoto } from '../../hooks/usePhotoUploadManager';
import { useGeolocation, formatCoordinates } from '../../hooks/useGeolocation';
import { BatchUploadProgress } from './BatchUploadProgress';
import type { PhotoEntryV2, PhotoCategory } from '@/types/daily-reports-v2';
import { cn } from '@/lib/utils';

const PHOTO_CATEGORIES: { value: PhotoCategory; label: string; color: string }[] = [
  { value: 'progress', label: 'Progress', color: 'bg-info-light dark:bg-info/20 text-info-dark dark:text-info' },
  { value: 'safety', label: 'Safety', color: 'bg-error-light dark:bg-error/20 text-error-dark dark:text-error' },
  { value: 'quality', label: 'Quality', color: 'bg-success-light dark:bg-success/20 text-success-dark dark:text-success' },
  { value: 'delivery', label: 'Delivery', color: 'bg-warning-light dark:bg-warning/20 text-warning-dark dark:text-warning' },
  { value: 'weather', label: 'Weather', color: 'bg-info-light dark:bg-info/20 text-info-dark dark:text-info' },
  { value: 'issue', label: 'Issue', color: 'bg-warning-light dark:bg-warning/20 text-warning-dark dark:text-warning' },
  { value: 'inspection', label: 'Inspection', color: 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary' },
  { value: 'general', label: 'General', color: 'bg-muted text-muted-foreground' },
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
  const [_pendingPhotos, setPendingPhotos] = useState<Map<string, ProcessedPhoto>>(new Map());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<PhotoEntryV2 | null>(null);
  const [formData, setFormData] = useState<Partial<PhotoEntryV2>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoGpsEnabled, setAutoGpsEnabled] = useState(true); // Auto-capture GPS for photos without EXIF GPS

  // Mobile UX state
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [bulkCategoryDialogOpen, setBulkCategoryDialogOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LONG_PRESS_DURATION = 500; // ms

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
    if (!files || files.length === 0) { return; }

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

  const handleDeleteClick = useCallback((id: string) => {
    setPhotoToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (photoToDelete) {
      removePhoto(photoToDelete);
      setPhotoToDelete(null);
      setDeleteDialogOpen(false);
    }
  }, [photoToDelete, removePhoto]);

  // =============================================
  // Mobile UX Handlers
  // =============================================

  // Toggle photo selection
  const togglePhotoSelection = useCallback((photoId: string) => {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  }, []);

  // Select all photos
  const selectAllPhotos = useCallback(() => {
    setSelectedPhotos(new Set(photos.map((p) => p.id)));
  }, [photos]);

  // Clear selection and exit multi-select mode
  const exitMultiSelectMode = useCallback(() => {
    setMultiSelectMode(false);
    setSelectedPhotos(new Set());
  }, []);

  // Delete selected photos
  const deleteSelectedPhotos = useCallback(() => {
    selectedPhotos.forEach((id) => removePhoto(id));
    toast.success(`Deleted ${selectedPhotos.size} photo${selectedPhotos.size > 1 ? 's' : ''}`);
    exitMultiSelectMode();
  }, [selectedPhotos, removePhoto, exitMultiSelectMode]);

  // Bulk category update
  const handleBulkCategoryChange = useCallback((category: PhotoCategory) => {
    selectedPhotos.forEach((id) => updatePhoto(id, { category }));
    toast.success(`Updated ${selectedPhotos.size} photo${selectedPhotos.size > 1 ? 's' : ''} to ${category}`);
    setBulkCategoryDialogOpen(false);
    exitMultiSelectMode();
  }, [selectedPhotos, updatePhoto, exitMultiSelectMode]);

  // Long-press detection for touch devices
  const handleTouchStart = useCallback((e: React.TouchEvent, photoId: string) => {
    const touch = e.touches[0];
    setTouchStartTime(Date.now());
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });

    longPressTimeoutRef.current = setTimeout(() => {
      // Vibrate if supported (haptic feedback)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      // Enter multi-select mode and select this photo
      setMultiSelectMode(true);
      setSelectedPhotos(new Set([photoId]));
    }, LONG_PRESS_DURATION);
  }, [LONG_PRESS_DURATION]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos) { return; }

    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.x);
    const dy = Math.abs(touch.clientY - touchStartPos.y);

    // Cancel long-press if finger moved more than 10px
    if (dx > 10 || dy > 10) {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    }
  }, [touchStartPos]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    setTouchStartPos(null);
  }, []);

  // Lightbox navigation
  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  const nextPhoto = useCallback(() => {
    setLightboxIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const prevPhoto = useCallback(() => {
    setLightboxIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  // Swipe handling for lightbox
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);

  const handleLightboxTouchStart = useCallback((e: React.TouchEvent) => {
    setSwipeStartX(e.touches[0].clientX);
  }, []);

  const handleLightboxTouchEnd = useCallback((e: React.TouchEvent) => {
    if (swipeStartX === null) { return; }

    const endX = e.changedTouches[0].clientX;
    const diff = swipeStartX - endX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextPhoto();
      } else {
        prevPhoto();
      }
    }
    setSwipeStartX(null);
  }, [swipeStartX, nextPhoto, prevPhoto]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <Card>
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between p-4 hover:bg-surface transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
              <Camera className="h-5 w-5 text-primary" />
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
            <ChevronUp className="h-5 w-5 text-disabled" />
          ) : (
            <ChevronDown className="h-5 w-5 text-disabled" />
          )}
        </button>

        {expanded && (
          <CardContent className="border-t p-0">
            {/* Upload Area */}
            <div className="p-4 bg-surface border-b">
              {/* GPS Status Bar */}
              {gpsSupported && (
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Switch
                        id="auto-gps"
                        checked={autoGpsEnabled}
                        onCheckedChange={setAutoGpsEnabled}
                        className="data-[state=checked]:bg-success"
                        aria-label="Toggle auto GPS"
                      />
                      <Label htmlFor="auto-gps" className="text-sm text-secondary cursor-pointer">
                        Auto GPS
                      </Label>
                    </div>
                    {autoGpsEnabled && (
                      <div className="flex items-center gap-1 text-xs" role="status" aria-live="polite">
                        {isGpsLoading ? (
                          <span className="text-primary flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Getting location...
                          </span>
                        ) : currentPosition ? (
                          <span className="text-success flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {formatCoordinates(currentPosition.latitude, currentPosition.longitude, 4)}
                          </span>
                        ) : gpsError ? (
                          <span className="text-error flex items-center gap-1">
                            <MapPinOff className="h-3 w-3" />
                            Location unavailable
                          </span>
                        ) : permissionStatus === 'denied' ? (
                          <span className="text-warning flex items-center gap-1">
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
                      aria-label="Get current location"
                    >
                      <Navigation className="h-3 w-3 mr-1" />
                      Get Location
                    </Button>
                  )}
                </div>
              )}

              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isProcessing || isUploading
                    ? 'border-primary/30 bg-primary/5 cursor-wait'
                    : 'border-input hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
                  }`}
                onClick={() => !isProcessing && !isUploading && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Upload photos"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    !isProcessing && !isUploading && fileInputRef.current?.click();
                  }
                }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-8 w-8 mx-auto mb-2 text-primary animate-spin" />
                    <p className="text-sm text-primary">Processing photos...</p>
                    <p className="text-xs text-primary/70">Compressing and extracting metadata</p>
                  </>
                ) : isUploading ? (
                  <>
                    <Loader2 className="h-8 w-8 mx-auto mb-2 text-primary animate-spin" />
                    <p className="text-sm text-primary">Uploading photos...</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-disabled" />
                    <p className="text-sm text-secondary">Click to upload photos</p>
                    <p className="text-xs text-disabled">or drag and drop</p>
                    {autoGpsEnabled && currentPosition && (
                      <p className="text-xs text-success mt-1 flex items-center justify-center gap-1">
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

            {/* Multi-select toolbar */}
            {multiSelectMode && (
              <div className="p-3 bg-primary/10 border-b flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={exitMultiSelectMode}
                    className="h-9 w-9 p-0"
                    aria-label="Cancel selection"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  <span className="text-sm font-medium">
                    {selectedPhotos.size} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllPhotos}
                    className="h-9 text-xs"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkCategoryDialogOpen(true)}
                    disabled={selectedPhotos.size === 0}
                    className="h-9 text-xs"
                  >
                    <FolderOpen className="h-4 w-4 mr-1" />
                    Category
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={deleteSelectedPhotos}
                    disabled={selectedPhotos.size === 0}
                    className="h-9 text-xs"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            )}

            {/* Photo Grid */}
            {photos.length > 0 && (
              <div className="p-4">
                {!multiSelectMode && (
                  <p className="text-xs text-muted-foreground mb-3 md:hidden">
                    Long-press a photo to select multiple
                  </p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {photos.map((photo, index) => {
                    const catInfo = getCategoryInfo(photo.category);
                    const progress = uploadProgress[photo.id];
                    const isPending = photo.upload_status === 'pending';
                    const isFailed = photo.upload_status === 'failed' || progress?.status === 'failed';
                    const isCurrentlyUploading = progress?.status === 'uploading' || progress?.status === 'compressing';
                    const isSelected = selectedPhotos.has(photo.id);

                    return (
                      <div
                        key={photo.id}
                        className={cn(
                          'relative group rounded-lg overflow-hidden border transition-all',
                          isFailed ? 'border-error/50' : isPending ? 'border-warning/50' : 'border-border',
                          isSelected && 'ring-2 ring-primary ring-offset-2',
                          multiSelectMode && 'cursor-pointer'
                        )}
                        onTouchStart={(e) => !multiSelectMode && handleTouchStart(e, photo.id)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onClick={() => {
                          if (multiSelectMode) {
                            togglePhotoSelection(photo.id);
                          }
                        }}
                      >
                        <img
                          src={photo.thumbnail_url || photo.file_url}
                          alt={photo.caption || 'Photo'}
                          className="w-full h-32 object-cover"
                        />

                        {/* Selection checkbox (multi-select mode) */}
                        {multiSelectMode && (
                          <div className="absolute top-2 left-2 z-20">
                            <div
                              className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center',
                                isSelected ? 'bg-primary text-primary-foreground' : 'bg-white/90 text-muted-foreground border'
                              )}
                            >
                              {isSelected ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2" />
                              )}
                            </div>
                          </div>
                        )}

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
                                <Upload className="h-5 w-5 text-warning mb-1" />
                                <span className="text-xs text-warning">Pending upload</span>
                              </>
                            )}
                            {isFailed && (
                              <>
                                <AlertCircle className="h-5 w-5 text-error mb-1" />
                                <span className="text-xs text-error">Upload failed</span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Success Indicator */}
                        {photo.upload_status === 'uploaded' && progress?.status === 'uploaded' && !multiSelectMode && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="h-4 w-4 text-success bg-card rounded-full" />
                          </div>
                        )}

                        {/* Desktop: Overlay for actions on hover */}
                        {!multiSelectMode && (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors hidden md:block">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <button
                                type="button"
                                onClick={() => openLightbox(index)}
                                className="p-2 bg-card rounded shadow hover:bg-blue-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
                                aria-label="View photo"
                              >
                                <ZoomIn className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEdit(photo)}
                                className="p-2 bg-card rounded shadow hover:bg-blue-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
                                aria-label="Edit photo"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(photo.id)}
                                className="p-2 bg-card rounded shadow hover:bg-error-light min-h-[36px] min-w-[36px] flex items-center justify-center"
                                aria-label="Delete photo"
                              >
                                <Trash2 className="h-4 w-4 text-error" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Mobile: Context menu button */}
                        {!multiSelectMode && (
                          <div className="absolute top-2 right-2 md:hidden">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="p-2 bg-black/50 rounded-full min-h-[36px] min-w-[36px] flex items-center justify-center"
                                  aria-label="Photo options"
                                >
                                  <MoreVertical className="h-4 w-4 text-white" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openLightbox(index)}>
                                  <ZoomIn className="h-4 w-4 mr-2" />
                                  View Full Size
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(photo)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setMultiSelectMode(true);
                                  setSelectedPhotos(new Set([photo.id]));
                                }}>
                                  <CheckSquare className="h-4 w-4 mr-2" />
                                  Select Multiple
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteClick(photo.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}

                        {/* Category Badge */}
                        <div className="absolute bottom-2 left-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${catInfo.color}`}>
                            {catInfo.label}
                          </span>
                        </div>

                        {/* GPS Indicator */}
                        {photo.gps_latitude && photo.gps_longitude && !multiSelectMode && (
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
              <div className="p-8 text-center text-muted">
                <Image className="h-8 w-8 mx-auto mb-2 text-disabled" />
                <p>No photos added.</p>
                <p className="text-sm">Upload photos to document work.</p>
              </div>
            )}

            {/* Summary by Category */}
            {photos.length > 0 && stats.byCategory.length > 0 && (
              <div className="p-4 bg-muted border-t">
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
              <div className="p-3 bg-muted rounded-lg text-sm">
                <div className="flex items-center gap-2 text-secondary">
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
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted bg-surface">
                        Delays
                      </div>
                      {delays.map((delay) => (
                        <SelectItem key={`delay:${delay.id}`} value={`delay:${delay.id}`}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-warning" />
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
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted bg-surface">
                        Safety Incidents
                      </div>
                      {safetyIncidents.map((incident) => (
                        <SelectItem key={`safety_incident:${incident.id}`} value={`safety_incident:${incident.id}`}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-error" />
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
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted bg-surface">
                        Inspections
                      </div>
                      {inspections.map((inspection) => (
                        <SelectItem key={`inspection:${inspection.id}`} value={`inspection:${inspection.id}`}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            {inspection.inspection_type} - {inspection.result || 'Pending'}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}

                  {/* Deliveries */}
                  {deliveries.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted bg-surface">
                        Deliveries
                      </div>
                      {deliveries.map((delivery) => (
                        <SelectItem key={`delivery:${delivery.id}`} value={`delivery:${delivery.id}`}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-warning" />
                            {delivery.material_description?.substring(0, 40) || 'Delivery'}
                            {delivery.material_description && delivery.material_description.length > 40 && '...'}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted">
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this photo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPhotoToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Category Dialog */}
      <Dialog open={bulkCategoryDialogOpen} onOpenChange={setBulkCategoryDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Update category for {selectedPhotos.size} photo{selectedPhotos.size > 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-2 gap-2 py-4">
            {PHOTO_CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                variant="outline"
                className={cn('justify-start h-12', cat.color)}
                onClick={() => handleBulkCategoryChange(cat.value)}
              >
                <span className={`w-3 h-3 rounded-full mr-2 ${cat.color.split(' ')[0]}`} />
                {cat.label}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkCategoryDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Swipeable Lightbox */}
      {lightboxOpen && photos.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black"
          onTouchStart={handleLightboxTouchStart}
          onTouchEnd={handleLightboxTouchEnd}
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <span className="text-white text-sm">
              {lightboxIndex + 1} / {photos.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(photos[lightboxIndex])}
                className="text-white hover:bg-white/20 h-10 w-10"
                aria-label="Edit photo"
              >
                <Pencil className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeLightbox}
                className="text-white hover:bg-white/20 h-10 w-10"
                aria-label="Close lightbox"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Main image */}
          <div className="absolute inset-0 flex items-center justify-center p-4 pt-16 pb-24">
            <img
              src={photos[lightboxIndex]?.file_url || photos[lightboxIndex]?.thumbnail_url}
              alt={photos[lightboxIndex]?.caption || 'Photo'}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Navigation buttons (desktop) */}
          <div className="absolute inset-y-0 left-0 hidden md:flex items-center p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevPhoto}
              disabled={photos.length <= 1}
              className="text-white hover:bg-white/20 h-12 w-12"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          </div>
          <div className="absolute inset-y-0 right-0 hidden md:flex items-center p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={nextPhoto}
              disabled={photos.length <= 1}
              className="text-white hover:bg-white/20 h-12 w-12"
              aria-label="Next photo"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </div>

          {/* Footer with photo info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {photos[lightboxIndex]?.caption && (
                  <p className="text-white text-sm mb-1">{photos[lightboxIndex].caption}</p>
                )}
                <div className="flex items-center gap-2">
                  <Badge className={getCategoryInfo(photos[lightboxIndex]?.category).color}>
                    {getCategoryInfo(photos[lightboxIndex]?.category).label}
                  </Badge>
                  {photos[lightboxIndex]?.gps_latitude && photos[lightboxIndex]?.gps_longitude && (
                    <span className="text-white/70 text-xs flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      GPS
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Swipe hint (mobile only) */}
            <p className="text-white/50 text-xs text-center mt-2 md:hidden">
              Swipe left or right to navigate
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default PhotosSection;
