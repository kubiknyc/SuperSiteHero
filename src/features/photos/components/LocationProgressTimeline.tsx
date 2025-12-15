/**
 * LocationProgressTimeline Component
 * Shows photos from the same location over time for progress visualization
 */

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Building2,
  Image,
  Play,
  Pause,
  Maximize2,
  Download,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { usePhotoTemplates, useLocationProgressTimeline } from '../hooks/usePhotoTemplates';
import type { PhotoLocationTemplate, ProgressTimelineEntry } from '@/types/photo-templates';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

interface LocationProgressTimelineProps {
  projectId: string;
  templateId?: string;
  className?: string;
}

export function LocationProgressTimeline({
  projectId,
  templateId: initialTemplateId,
  className,
}: LocationProgressTimelineProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(
    initialTemplateId
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: templates } = usePhotoTemplates({ projectId, isActive: true });
  const { data: timeline, isLoading } = useLocationProgressTimeline(
    projectId,
    selectedTemplateId || ''
  );

  // Auto-select first template if none selected
  useEffect(() => {
    if (!selectedTemplateId && templates && templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  // Reset index when template changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [selectedTemplateId]);

  // Auto-play logic
  useEffect(() => {
    if (isPlaying && timeline && timeline.entries.length > 1) {
      playIntervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= timeline.entries.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, timeline]);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (!timeline) {return;}
    setCurrentIndex((prev) => Math.min(timeline.entries.length - 1, prev + 1));
  };

  const togglePlay = () => {
    if (!timeline || timeline.entries.length <= 1) {return;}
    if (currentIndex >= timeline.entries.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const currentEntry = timeline?.entries[currentIndex];

  if (!templates || templates.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Progress Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <Calendar className="mx-auto h-12 w-12 opacity-50" />
            <p className="mt-2">No photo locations configured</p>
            <p className="text-sm">Add photo locations to track progress over time</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Progress Timeline
            </CardTitle>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {timeline && (
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              {timeline.location.building && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {[timeline.location.building, timeline.location.floor, timeline.location.area]
                    .filter(Boolean)
                    .join(' › ')}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Image className="h-3 w-3" />
                {timeline.totalPhotos} photos
              </span>
              {timeline.firstPhoto && timeline.lastPhoto && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(timeline.firstPhoto), 'MMM d')} -{' '}
                  {format(new Date(timeline.lastPhoto), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !timeline || timeline.entries.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Image className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2">No photos taken for this location yet</p>
              <p className="text-sm">Photos will appear here as they are captured</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                {currentEntry && (
                  <>
                    <img
                      src={currentEntry.photoUrl}
                      alt={currentEntry.templateName}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <p className="text-white font-medium">
                        {format(new Date(currentEntry.date), 'MMMM d, yyyy')}
                      </p>
                      {currentEntry.caption && (
                        <p className="text-white/80 text-sm">{currentEntry.caption}</p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute top-2 right-2"
                      onClick={() => setFullscreenOpen(true)}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                    <Badge className="absolute top-2 left-2">
                      {currentIndex + 1} / {timeline.entries.length}
                    </Badge>
                  </>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant={isPlaying ? 'default' : 'outline'}
                    onClick={togglePlay}
                    disabled={timeline.entries.length <= 1}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleNext}
                    disabled={currentIndex >= timeline.entries.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1">
                  <Slider
                    value={[currentIndex]}
                    min={0}
                    max={Math.max(0, timeline.entries.length - 1)}
                    step={1}
                    onValueChange={([value]) => {
                      setCurrentIndex(value);
                      setIsPlaying(false);
                    }}
                  />
                </div>
              </div>

              {/* Thumbnail Strip */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {timeline.entries.map((entry, index) => (
                  <button
                    key={entry.photoId}
                    onClick={() => {
                      setCurrentIndex(index);
                      setIsPlaying(false);
                    }}
                    className={cn(
                      'flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all',
                      index === currentIndex
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    )}
                  >
                    <img
                      src={entry.thumbnailUrl || entry.photoUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fullscreen Dialog */}
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          {currentEntry && (
            <div className="relative w-full h-[90vh]">
              <img
                src={currentEntry.photoUrl}
                alt={currentEntry.templateName}
                className="w-full h-full object-contain bg-black"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                <p className="text-white text-lg font-medium">
                  {currentEntry.templateName}
                </p>
                <p className="text-white/80">
                  {format(new Date(currentEntry.date), 'MMMM d, yyyy')}
                </p>
                {currentEntry.caption && (
                  <p className="text-white/70 mt-1">{currentEntry.caption}</p>
                )}
              </div>

              {/* Navigation */}
              <Button
                size="icon"
                variant="secondary"
                className="absolute left-4 top-1/2 -translate-y-1/2"
                onClick={handlePrev}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="absolute right-4 top-1/2 -translate-y-1/2"
                onClick={handleNext}
                disabled={!timeline || currentIndex >= timeline.entries.length - 1}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>

              <Badge className="absolute top-4 left-4 text-lg px-3 py-1">
                {currentIndex + 1} / {timeline?.entries.length || 0}
              </Badge>

              <a
                href={currentEntry.photoUrl}
                download
                className="absolute top-4 right-4"
              >
                <Button size="icon" variant="secondary">
                  <Download className="h-4 w-4" />
                </Button>
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default LocationProgressTimeline;
