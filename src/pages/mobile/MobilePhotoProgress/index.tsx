/**
 * Mobile Photo Progress Pages
 *
 * Camera-first photo capture and progress tracking for field workers.
 */

import { memo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Camera,
  Image,
  Upload,
  ChevronRight,
  MapPin,
  Calendar,
  Grid,
  List,
  X,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { useSelectedProject } from '../../../hooks/useSelectedProject';
import { cn } from '../../../lib/utils';

// Photo gallery/list view
export const MobilePhotoProgressList = memo(function MobilePhotoProgressList() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Mock data
  const photos = [
    {
      id: '1',
      url: '/placeholder-photo-1.jpg',
      location: 'Building A - Foundation',
      date: '2024-01-15',
      description: 'Concrete pour completed',
    },
    {
      id: '2',
      url: '/placeholder-photo-2.jpg',
      location: 'Building A - Foundation',
      date: '2024-01-15',
      description: 'Rebar installation',
    },
    {
      id: '3',
      url: '/placeholder-photo-3.jpg',
      location: 'Building B - Framing',
      date: '2024-01-14',
      description: 'Wall framing progress',
    },
  ];

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

      {/* Photo grid/list */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="aspect-square bg-muted rounded-lg overflow-hidden relative cursor-pointer"
              onClick={() => {/* TODO: Open photo detail */}}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-white text-xs font-medium truncate">{photo.location}</p>
                <p className="text-white/70 text-xs">{photo.date}</p>
              </div>
              {/* Placeholder for actual image */}
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Image className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {photos.map((photo) => (
            <Card key={photo.id} className="cursor-pointer">
              <CardContent className="p-3 flex gap-3">
                <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  <Image className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{photo.location}</p>
                  <p className="text-sm text-muted-foreground truncate">{photo.description}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {photo.date}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {photos.length === 0 && (
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
  const { projectId } = useParams();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setDescription('');
    setLocation('');
  };

  const handleSave = () => {
    // TODO: Save photo
    navigate(projectId ? `/projects/${projectId}/photo-progress` : '/photo-progress');
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
        <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSave}>
          <Check className="h-4 w-4 mr-1" />
          Save Photo
        </Button>
      </div>
    </div>
  );
});

export default MobilePhotoProgressList;
