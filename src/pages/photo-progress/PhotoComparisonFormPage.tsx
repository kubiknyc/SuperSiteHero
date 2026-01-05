/**
 * Photo Comparison Form Page
 *
 * Page for creating and editing photo comparisons (before/after, timelapse, milestone).
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SmartLayout } from '@/components/layout/SmartLayout';
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
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePhotoComparison,
  usePhotoLocations,
  useProgressPhotos,
  useCreatePhotoComparison,
  useUpdatePhotoComparison,
} from '@/features/photo-progress/hooks';
import { useProject } from '@/features/projects/hooks/useProjects';
import { useCompanyId } from '@/hooks/useCompanyId';
import {
  GitCompare,
  Save,
  ArrowLeft,
  MapPin,
  Image as ImageIcon,
  ArrowRight,
} from 'lucide-react';
import {
  ComparisonType,
  getComparisonTypeLabel,
  type CreatePhotoComparisonDTO,
  type UpdatePhotoComparisonDTO,
  type PhotoLocationFilters,
  type ProgressPhotoFilters,
} from '@/types/photo-progress';

export function PhotoComparisonFormPage() {
  const navigate = useNavigate();
  const { projectId, comparisonId } = useParams<{ projectId: string; comparisonId?: string }>();
  const companyId = useCompanyId();
  const isEditing = !!comparisonId && comparisonId !== 'new';

  // Fetch existing comparison if editing
  const { data: existingComparison, isLoading: isLoadingComparison } = usePhotoComparison(
    isEditing ? comparisonId : undefined
  );
  const { data: project, isLoading: isLoadingProject } = useProject(projectId);

  // Fetch locations
  const locationFilters: PhotoLocationFilters = { projectId: projectId || '' };
  const { data: locations = [], isLoading: isLoadingLocations } = usePhotoLocations(locationFilters);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [comparisonType, setComparisonType] = useState<string>(ComparisonType.BEFORE_AFTER);
  const [locationId, setLocationId] = useState('');
  const [beforePhotoId, setBeforePhotoId] = useState('');
  const [afterPhotoId, setAfterPhotoId] = useState('');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  // Fetch photos based on selected location
  const photoFilters: ProgressPhotoFilters = useMemo(() => ({
    projectId: projectId || '',
    locationId: locationId || undefined,
  }), [projectId, locationId]);
  const { data: photos = [], isLoading: isLoadingPhotos } = useProgressPhotos(photoFilters);

  // Mutations
  const createMutation = useCreatePhotoComparison();
  const updateMutation = useUpdatePhotoComparison();

  // Load existing comparison data
  useEffect(() => {
    if (existingComparison) {
      setTitle(existingComparison.title || '');
      setDescription(existingComparison.description || '');
      setComparisonType(existingComparison.comparison_type || ComparisonType.BEFORE_AFTER);
      setLocationId(existingComparison.location_id || '');
      setBeforePhotoId(existingComparison.before_photo_id || '');
      setAfterPhotoId(existingComparison.after_photo_id || '');
      setSelectedPhotoIds(existingComparison.photo_ids || []);
      setStartDate(existingComparison.start_date || '');
      setEndDate(existingComparison.end_date || '');
      setIsPublic(existingComparison.is_public || false);
    }
  }, [existingComparison]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId || !companyId) {return;}

    try {
      const baseDto = {
        title,
        description: description || undefined,
        comparison_type: comparisonType,
        location_id: locationId || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        is_public: isPublic,
      };

      // Add photo IDs based on comparison type
      const photoFields = comparisonType === ComparisonType.BEFORE_AFTER
        ? {
            before_photo_id: beforePhotoId || undefined,
            after_photo_id: afterPhotoId || undefined,
          }
        : {
            photo_ids: selectedPhotoIds.length > 0 ? selectedPhotoIds : undefined,
          };

      if (isEditing && comparisonId) {
        const updateDto: UpdatePhotoComparisonDTO = { ...baseDto, ...photoFields };
        await updateMutation.mutateAsync({ id: comparisonId, dto: updateDto });
      } else {
        const createDto: CreatePhotoComparisonDTO = {
          project_id: projectId,
          company_id: companyId,
          ...baseDto,
          ...photoFields,
        };
        await createMutation.mutateAsync(createDto);
      }

      navigate(`/projects/${projectId}/photo-progress?tab=comparisons`);
    } catch (_error) {
      // Error handled by mutation
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId]
    );
  };

  // Get photo data for preview
  const getPhotoById = (id: string) => photos.find((p) => p.id === id);
  const beforePhoto = getPhotoById(beforePhotoId);
  const afterPhoto = getPhotoById(afterPhotoId);

  const isLoading = isLoadingComparison || isLoadingProject || isLoadingLocations;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <SmartLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </SmartLayout>
    );
  }

  return (
    <SmartLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground heading-page">
              {isEditing ? 'Edit Comparison' : 'New Photo Comparison'}
            </h1>
            <p className="text-muted mt-1">{project?.name || 'Project'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitCompare className="h-5 w-5" />
                Comparison Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Lobby Renovation Progress"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="comparisonType">Comparison Type</Label>
                  <Select value={comparisonType} onValueChange={setComparisonType}>
                    <SelectTrigger id="comparisonType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ComparisonType.BEFORE_AFTER}>
                        {getComparisonTypeLabel(ComparisonType.BEFORE_AFTER)}
                      </SelectItem>
                      <SelectItem value={ComparisonType.TIMELAPSE}>
                        {getComparisonTypeLabel(ComparisonType.TIMELAPSE)}
                      </SelectItem>
                      <SelectItem value={ComparisonType.MILESTONE}>
                        {getComparisonTypeLabel(ComparisonType.MILESTONE)}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="locationId">Location (Optional)</Label>
                  <Select value={locationId} onValueChange={setLocationId}>
                    <SelectTrigger id="locationId">
                      <MapPin className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Locations</SelectItem>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this comparison shows..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label htmlFor="isPublic">Public Sharing</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow sharing via public link
                  </p>
                </div>
                <Switch
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>
            </CardContent>
          </Card>

          {/* Photo Selection - Before/After */}
          {comparisonType === ComparisonType.BEFORE_AFTER && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Select Photos
                </CardTitle>
                <CardDescription>
                  Choose a before and after photo for comparison
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Preview */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-sm font-medium mb-2">Before</p>
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                      {beforePhoto ? (
                        <img
                          src={beforePhoto.thumbnail_url || beforePhoto.photo_url}
                          alt="Before"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">Select a photo below</p>
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium mb-2">After</p>
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                      {afterPhoto ? (
                        <img
                          src={afterPhoto.thumbnail_url || afterPhoto.photo_url}
                          alt="After"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">Select a photo below</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Photo Grid */}
                {isLoadingPhotos ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="aspect-square" />
                    ))}
                  </div>
                ) : photos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No photos available. Upload some photos first.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
                    {photos.map((photo) => (
                      <div key={photo.id} className="space-y-1">
                        <div
                          className={`relative aspect-square rounded-md overflow-hidden cursor-pointer border-2 transition-all ${
                            photo.id === beforePhotoId
                              ? 'border-blue-500 ring-2 ring-blue-500/30'
                              : photo.id === afterPhotoId
                              ? 'border-green-500 ring-2 ring-green-500/30'
                              : 'border-transparent hover:border-muted-foreground/50'
                          }`}
                        >
                          <img
                            src={photo.thumbnail_url || photo.photo_url}
                            alt={photo.caption || 'Photo'}
                            className="w-full h-full object-cover"
                          />
                          {photo.id === beforePhotoId && (
                            <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
                              Before
                            </div>
                          )}
                          {photo.id === afterPhotoId && (
                            <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">
                              After
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant={photo.id === beforePhotoId ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1 text-xs h-6"
                            onClick={() => setBeforePhotoId(photo.id)}
                          >
                            Before
                          </Button>
                          <Button
                            type="button"
                            variant={photo.id === afterPhotoId ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1 text-xs h-6"
                            onClick={() => setAfterPhotoId(photo.id)}
                          >
                            After
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Photo Selection - Timelapse/Milestone */}
          {(comparisonType === ComparisonType.TIMELAPSE || comparisonType === ComparisonType.MILESTONE) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Select Photos
                </CardTitle>
                <CardDescription>
                  Select photos in the order you want them to appear
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Selected Order Preview */}
                {selectedPhotoIds.length > 0 && (
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                    {selectedPhotoIds.map((id, index) => {
                      const photo = getPhotoById(id);
                      if (!photo) {return null;}
                      return (
                        <div key={id} className="flex items-center">
                          <div className="relative w-16 h-16 flex-shrink-0">
                            <img
                              src={photo.thumbnail_url || photo.photo_url}
                              alt={`Photo ${index + 1}`}
                              className="w-full h-full object-cover rounded-md"
                            />
                            <div className="absolute -top-2 -left-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-primary-foreground text-xs font-medium">
                                {index + 1}
                              </span>
                            </div>
                          </div>
                          {index < selectedPhotoIds.length - 1 && (
                            <ArrowRight className="h-4 w-4 text-muted-foreground mx-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Photo Grid */}
                {isLoadingPhotos ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="aspect-square" />
                    ))}
                  </div>
                ) : photos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No photos available. Upload some photos first.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
                    {photos.map((photo) => {
                      const orderIndex = selectedPhotoIds.indexOf(photo.id);
                      const isSelected = orderIndex !== -1;
                      return (
                        <div
                          key={photo.id}
                          className={`relative aspect-square rounded-md overflow-hidden cursor-pointer border-2 transition-all ${
                            isSelected
                              ? 'border-primary ring-2 ring-primary/30'
                              : 'border-transparent hover:border-muted-foreground/50'
                          }`}
                          onClick={() => togglePhotoSelection(photo.id)}
                        >
                          <img
                            src={photo.thumbnail_url || photo.photo_url}
                            alt={photo.caption || 'Photo'}
                            className="w-full h-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-primary-foreground text-xs font-medium">
                                {orderIndex + 1}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
            <Button
              type="submit"
              disabled={
                isSaving ||
                !title.trim() ||
                (comparisonType === ComparisonType.BEFORE_AFTER && (!beforePhotoId || !afterPhotoId)) ||
                ((comparisonType === ComparisonType.TIMELAPSE || comparisonType === ComparisonType.MILESTONE) && selectedPhotoIds.length < 2)
              }
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : isEditing ? 'Update Comparison' : 'Create Comparison'}
            </Button>
          </div>
        </form>
      </div>
    </SmartLayout>
  );
}

export default PhotoComparisonFormPage;
