/**
 * PhotosSection - Photo documentation with categorization
 * Supports upload, GPS metadata, and linking to other entries
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
} from 'lucide-react';
import { useDailyReportStoreV2 } from '../../store/dailyReportStoreV2';
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<PhotoEntryV2 | null>(null);
  const [formData, setFormData] = useState<Partial<PhotoEntryV2>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;

        // Create new photo entry
        const newPhoto: PhotoEntryV2 = {
          id: crypto.randomUUID(),
          daily_report_id: draftReport?.id || '',
          file_url: dataUrl,
          category: 'general',
          upload_status: 'uploaded',
          created_at: new Date().toISOString(),
          taken_at: new Date().toISOString(),
        };

        addPhoto(newPhoto);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [draftReport?.id, addPhoto]);

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
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">Click to upload photos</p>
                <p className="text-xs text-gray-400">or drag and drop</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Photo Grid */}
            {photos.length > 0 && (
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {photos.map((photo) => {
                    const catInfo = getCategoryInfo(photo.category);
                    return (
                      <div
                        key={photo.id}
                        className="relative group rounded-lg overflow-hidden border"
                      >
                        <img
                          src={photo.thumbnail_url || photo.file_url}
                          alt={photo.caption || 'Photo'}
                          className="w-full h-32 object-cover"
                        />

                        {/* Overlay */}
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
