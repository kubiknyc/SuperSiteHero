/**
 * Photo Lightbox Component
 *
 * Fullscreen photo viewer with navigation, zoom, and download support.
 */

import { useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  RotateCw,
  MapPin,
  Calendar,
  Star,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LightboxPhoto {
  id: string;
  photo_url: string;
  thumbnail_url?: string | null;
  captured_at?: string | null;
  notes?: string | null;
  location_name?: string | null;
  weather_condition?: string | null;
  is_featured?: boolean;
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PhotoLightbox({
  photos,
  initialIndex = 0,
  open,
  onOpenChange,
}: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setRotation(0);
    }
  }, [open, initialIndex]);

  const currentPhoto = photos[currentIndex];
  const hasMultiple = photos.length > 1;

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
    setZoom(1);
    setRotation(0);
  }, [photos.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
    setZoom(1);
    setRotation(0);
  }, [photos.length]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleResetView = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleDownload = async () => {
    if (!currentPhoto) return;

    try {
      const response = await fetch(currentPhoto.photo_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `photo-${currentPhoto.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (_error) {
      // Fallback: open in new tab
      window.open(currentPhoto.photo_url, '_blank');
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'Escape':
          onOpenChange(false);
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case 'r':
          handleRotate();
          break;
        case '0':
          handleResetView();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, goToPrevious, goToNext, onOpenChange]);

  if (!currentPhoto) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-none">
        <VisuallyHidden>
          <DialogTitle>Photo Viewer</DialogTitle>
        </VisuallyHidden>
        
        {/* Top toolbar */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            {/* Photo info */}
            <div className="flex items-center gap-3 text-white">
              {currentPhoto.location_name && (
                <div className="flex items-center gap-1 text-sm">
                  <MapPin className="h-4 w-4" />
                  {currentPhoto.location_name}
                </div>
              )}
              {currentPhoto.captured_at && (
                <div className="flex items-center gap-1 text-sm">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(currentPhoto.captured_at), 'MMM d, yyyy h:mm a')}
                </div>
              )}
              {currentPhoto.is_featured && (
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                  <Star className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
              {currentPhoto.weather_condition && (
                <Badge variant="secondary" className="capitalize">
                  {currentPhoto.weather_condition}
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                className="text-white hover:bg-white/20"
                title="Zoom out (-)"
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <span className="text-white text-sm w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                className="text-white hover:bg-white/20"
                title="Zoom in (+)"
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRotate}
                className="text-white hover:bg-white/20"
                title="Rotate (R)"
              >
                <RotateCw className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleResetView}
                className="text-white hover:bg-white/20"
                title="Reset view (0)"
              >
                <Maximize2 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="text-white hover:bg-white/20"
                title="Download"
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/20 ml-2"
                title="Close (Esc)"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main image */}
        <div className="flex items-center justify-center w-full h-full overflow-hidden">
          <div
            className="transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
          >
            <img
              src={currentPhoto.photo_url}
              alt={currentPhoto.notes || 'Progress photo'}
              className="max-w-full max-h-[85vh] object-contain select-none"
              draggable={false}
            />
          </div>
        </div>

        {/* Navigation arrows */}
        {hasMultiple && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        {/* Bottom info bar */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            {/* Notes */}
            <div className="flex-1 max-w-2xl">
              {currentPhoto.notes && (
                <p className="text-sm text-white/80 line-clamp-2">
                  {currentPhoto.notes}
                </p>
              )}
            </div>

            {/* Counter and thumbnails */}
            {hasMultiple && (
              <div className="flex items-center gap-4">
                <span className="text-sm">
                  {currentIndex + 1} / {photos.length}
                </span>
                
                {/* Thumbnail strip */}
                <div className="flex gap-1 max-w-xs overflow-x-auto">
                  {photos.slice(
                    Math.max(0, currentIndex - 3),
                    Math.min(photos.length, currentIndex + 4)
                  ).map((photo, i) => {
                    const actualIndex = Math.max(0, currentIndex - 3) + i;
                    return (
                      <button
                        key={photo.id}
                        onClick={() => setCurrentIndex(actualIndex)}
                        className={cn(
                          'w-12 h-12 rounded overflow-hidden flex-shrink-0 border-2 transition-all',
                          actualIndex === currentIndex
                            ? 'border-white'
                            : 'border-transparent opacity-50 hover:opacity-100'
                        )}
                      >
                        <img
                          src={photo.thumbnail_url || photo.photo_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PhotoLightbox;
