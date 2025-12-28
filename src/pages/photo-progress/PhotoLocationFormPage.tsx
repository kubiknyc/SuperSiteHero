/**
 * Photo Location Form Page
 *
 * Page for creating and editing photo capture locations.
 */

import { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePhotoLocation,
  useCreatePhotoLocation,
  useUpdatePhotoLocation,
} from '@/features/photo-progress/hooks';
import { useProject } from '@/features/projects/hooks/useProjects';
import { useCompanyId } from '@/hooks/useCompanyId';
import {
  MapPin,
  Camera,
  Compass,
  Save,
  ArrowLeft,
  Building2,
  Layers,
  Map,
} from 'lucide-react';
import {
  CaptureFrequency,
  CameraDirection,
  CameraHeight,
  getCaptureFrequencyLabel,
} from '@/types/photo-progress';
import type { CreatePhotoLocationDTO, UpdatePhotoLocationDTO } from '@/types/photo-progress';

export function PhotoLocationFormPage() {
  const navigate = useNavigate();
  const { projectId, locationId } = useParams<{ projectId: string; locationId?: string }>();
  const companyId = useCompanyId();
  const isEditing = !!locationId && locationId !== 'new';

  // Fetch existing location if editing
  const { data: existingLocation, isLoading: isLoadingLocation } = usePhotoLocation(
    isEditing ? locationId : undefined
  );
  const { data: project, isLoading: isLoadingProject } = useProject(projectId);

  // Mutations
  const createMutation = useCreatePhotoLocation();
  const updateMutation = useUpdatePhotoLocation();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locationCode, setLocationCode] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [area, setArea] = useState('');
  const [cameraDirection, setCameraDirection] = useState<string>('');
  const [cameraHeight, setCameraHeight] = useState<string>('');
  const [captureFrequency, setCaptureFrequency] = useState<string>(CaptureFrequency.WEEKLY);
  const [captureInstructions, setCaptureInstructions] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);

  // Load existing location data when editing
  useEffect(() => {
    if (existingLocation) {
      setName(existingLocation.name || '');
      setDescription(existingLocation.description || '');
      setLocationCode(existingLocation.location_code || '');
      setBuilding(existingLocation.building || '');
      setFloor(existingLocation.floor || '');
      setArea(existingLocation.area || '');
      setCameraDirection(existingLocation.camera_direction || '');
      setCameraHeight(existingLocation.camera_height || '');
      setCaptureFrequency(existingLocation.capture_frequency || CaptureFrequency.WEEKLY);
      setCaptureInstructions(existingLocation.capture_instructions || '');
      setIsActive(existingLocation.is_active);
      setLatitude(existingLocation.latitude || undefined);
      setLongitude(existingLocation.longitude || undefined);
    }
  }, [existingLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId || !companyId) {return;}

    try {
      if (isEditing && locationId) {
        const updateDto: UpdatePhotoLocationDTO = {
          name,
          description: description || undefined,
          location_code: locationCode || undefined,
          building: building || undefined,
          floor: floor || undefined,
          area: area || undefined,
          camera_direction: cameraDirection || undefined,
          camera_height: cameraHeight || undefined,
          capture_frequency: captureFrequency,
          capture_instructions: captureInstructions || undefined,
          is_active: isActive,
          latitude,
          longitude,
        };

        await updateMutation.mutateAsync({ id: locationId, dto: updateDto });
      } else {
        const createDto: CreatePhotoLocationDTO = {
          project_id: projectId,
          company_id: companyId,
          name,
          description: description || undefined,
          location_code: locationCode || undefined,
          building: building || undefined,
          floor: floor || undefined,
          area: area || undefined,
          camera_direction: cameraDirection || undefined,
          camera_height: cameraHeight || undefined,
          capture_frequency: captureFrequency,
          capture_instructions: captureInstructions || undefined,
          latitude,
          longitude,
        };

        await createMutation.mutateAsync(createDto);
      }

      navigate(`/projects/${projectId}/photo-progress?tab=locations`);
    } catch (_error) {
      // Error handled by mutation
    }
  };

  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
        },
        (_error) => {
          console.error('Error getting location:', _error);
        }
      );
    }
  };

  const isLoading = isLoadingLocation || isLoadingProject;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-3xl mx-auto">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground heading-page">
              {isEditing ? 'Edit Location' : 'New Photo Location'}
            </h1>
            <p className="text-muted mt-1">
              {project?.name || 'Project'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Name and describe this photo capture location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="name">Location Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Front Entrance View"
                    required
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="locationCode">Location Code</Label>
                  <Input
                    id="locationCode"
                    value={locationCode}
                    onChange={(e) => setLocationCode(e.target.value)}
                    placeholder="e.g., PP-001"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this location captures..."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isActive">Active Location</Label>
                  <p className="text-sm text-muted-foreground">
                    Inactive locations won't appear in capture reminders
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </CardContent>
          </Card>

          {/* Physical Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Physical Location
              </CardTitle>
              <CardDescription>
                Specify where this photo point is located
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="building">Building</Label>
                  <Input
                    id="building"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    placeholder="e.g., Building A"
                  />
                </div>
                <div>
                  <Label htmlFor="floor">Floor</Label>
                  <Input
                    id="floor"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="e.g., 3rd Floor"
                  />
                </div>
                <div>
                  <Label htmlFor="area">Area</Label>
                  <Input
                    id="area"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g., Lobby"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={latitude ?? ''}
                    onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="e.g., 40.7128"
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={longitude ?? ''}
                    onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="e.g., -74.0060"
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGetCurrentLocation}
              >
                <Map className="h-4 w-4 mr-2" />
                Use Current Location
              </Button>
            </CardContent>
          </Card>

          {/* Camera Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Camera Settings
              </CardTitle>
              <CardDescription>
                Define camera orientation and capture schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cameraDirection">Camera Direction</Label>
                  <Select value={cameraDirection} onValueChange={setCameraDirection}>
                    <SelectTrigger id="cameraDirection">
                      <Compass className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Select direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CameraDirection.NORTH}>North</SelectItem>
                      <SelectItem value={CameraDirection.SOUTH}>South</SelectItem>
                      <SelectItem value={CameraDirection.EAST}>East</SelectItem>
                      <SelectItem value={CameraDirection.WEST}>West</SelectItem>
                      <SelectItem value={CameraDirection.UP}>Up</SelectItem>
                      <SelectItem value={CameraDirection.DOWN}>Down</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cameraHeight">Camera Height</Label>
                  <Select value={cameraHeight} onValueChange={setCameraHeight}>
                    <SelectTrigger id="cameraHeight">
                      <Layers className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Select height" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CameraHeight.GROUND}>Ground Level</SelectItem>
                      <SelectItem value={CameraHeight.EYE_LEVEL}>Eye Level</SelectItem>
                      <SelectItem value={CameraHeight.ELEVATED}>Elevated</SelectItem>
                      <SelectItem value={CameraHeight.AERIAL}>Aerial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="captureFrequency">Capture Frequency *</Label>
                <Select value={captureFrequency} onValueChange={setCaptureFrequency}>
                  <SelectTrigger id="captureFrequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CaptureFrequency.DAILY}>
                      {getCaptureFrequencyLabel(CaptureFrequency.DAILY)}
                    </SelectItem>
                    <SelectItem value={CaptureFrequency.WEEKLY}>
                      {getCaptureFrequencyLabel(CaptureFrequency.WEEKLY)}
                    </SelectItem>
                    <SelectItem value={CaptureFrequency.BIWEEKLY}>
                      {getCaptureFrequencyLabel(CaptureFrequency.BIWEEKLY)}
                    </SelectItem>
                    <SelectItem value={CaptureFrequency.MONTHLY}>
                      {getCaptureFrequencyLabel(CaptureFrequency.MONTHLY)}
                    </SelectItem>
                    <SelectItem value={CaptureFrequency.MILESTONE}>
                      {getCaptureFrequencyLabel(CaptureFrequency.MILESTONE)}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="captureInstructions">Capture Instructions</Label>
                <Textarea
                  id="captureInstructions"
                  value={captureInstructions}
                  onChange={(e) => setCaptureInstructions(e.target.value)}
                  placeholder="Instructions for capturing photos at this location..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : isEditing ? 'Update Location' : 'Create Location'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

export default PhotoLocationFormPage;
