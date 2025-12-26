/**
 * TouchPhotoGallery Component
 *
 * A touch-optimized photo gallery with:
 * - Pinch-to-zoom support
 * - Swipe between photos
 * - Double-tap to zoom
 * - Pull-down to close
 */

import * as React from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  useSwipe,
  usePinch,
  useDoubleTap,
  triggerHapticFeedback,
  isTouchDevice,
} from '@/lib/utils/touchGestures';
import { Button } from '@/components/ui/button';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Share2,
  RotateCw,
} from 'lucide-react';
import { logger } from '../../../lib/utils/logger';


export interface GalleryPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface TouchPhotoGalleryProps {
  photos: GalleryPhoto[];
  /** Initial photo index to display */
  initialIndex?: number;
  /** Whether the gallery is open */
  isOpen: boolean;
  /** Callback when gallery is closed */
  onClose: () => void;
  /** Callback when photo changes */
  onPhotoChange?: (index: number, photo: GalleryPhoto) => void;
  /** Show photo counter */
  showCounter?: boolean;
  /** Show thumbnails strip */
  showThumbnails?: boolean;
  /** Allow download */
  allowDownload?: boolean;
  /** Allow sharing */
  allowShare?: boolean;
  /** Custom className */
  className?: string;
}

export function TouchPhotoGallery({
  photos,
  initialIndex = 0,
  isOpen,
  onClose,
  onPhotoChange,
  showCounter = true,
  showThumbnails = true,
  allowDownload = true,
  allowShare = false,
  className,
}: TouchPhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsZoomed(false);
    }
  }, [isOpen, initialIndex]);

  // Current photo
  const currentPhoto = photos[currentIndex];

  // Navigation
  const goToNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsZoomed(false);
      setIsLoading(true);
      triggerHapticFeedback('light');
      onPhotoChange?.(currentIndex + 1, photos[currentIndex + 1]);
    }
  }, [currentIndex, photos, onPhotoChange]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsZoomed(false);
      setIsLoading(true);
      triggerHapticFeedback('light');
      onPhotoChange?.(currentIndex - 1, photos[currentIndex - 1]);
    }
  }, [currentIndex, photos, onPhotoChange]);

  const goToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < photos.length) {
        setCurrentIndex(index);
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setIsZoomed(false);
        setIsLoading(true);
        onPhotoChange?.(index, photos[index]);
      }
    },
    [photos, onPhotoChange]
  );

  // Swipe handling for navigation
  const { handlers: swipeHandlers } = useSwipe<HTMLDivElement>({
    onSwipeLeft: () => {
      if (!isZoomed) {goToNext();}
    },
    onSwipeRight: () => {
      if (!isZoomed) {goToPrevious();}
    },
    onSwipeDown: (event) => {
      if (!isZoomed && event.deltaY > 100) {
        onClose();
      }
    },
    threshold: 50,
    enabled: isOpen,
  });

  // Pinch-to-zoom
  const { handlers: pinchHandlers, scale: pinchScale } = usePinch<HTMLDivElement>({
    onPinch: (event) => {
      setScale(event.scale);
      setIsZoomed(event.scale > 1.1);
    },
    minScale: 0.5,
    maxScale: 4,
    enabled: isOpen,
  });

  // Double-tap to zoom
  const { handlers: doubleTapHandlers } = useDoubleTap<HTMLDivElement>(
    (x, y) => {
      if (isZoomed) {
        // Reset zoom
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setIsZoomed(false);
      } else {
        // Zoom in to 2x centered on tap point
        setScale(2);
        setIsZoomed(true);
        // Calculate position to center on tap point
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          setPosition({
            x: (centerX - x) * 0.5,
            y: (centerY - y) * 0.5,
          });
        }
      }
      triggerHapticFeedback('light');
    },
    300
  );

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(4, prev + 0.5));
    setIsZoomed(true);
    triggerHapticFeedback('light');
  }, []);

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(1, scale - 0.5);
    setScale(newScale);
    if (newScale <= 1) {
      setPosition({ x: 0, y: 0 });
      setIsZoomed(false);
    }
    triggerHapticFeedback('light');
  }, [scale]);

  const handleResetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsZoomed(false);
  }, []);

  // Download handler
  const handleDownload = useCallback(async () => {
    if (!currentPhoto) {return;}

    try {
      const response = await fetch(currentPhoto.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentPhoto.caption || `photo-${currentPhoto.id}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      triggerHapticFeedback('medium');
    } catch (error) {
      logger.error('Failed to download photo:', error);
    }
  }, [currentPhoto]);

  // Share handler
  const handleShare = useCallback(async () => {
    if (!currentPhoto || !navigator.share) {return;}

    try {
      await navigator.share({
        title: currentPhoto.caption || 'Photo',
        url: currentPhoto.url,
      });
    } catch (error) {
      logger.error('Failed to share photo:', error);
    }
  }, [currentPhoto]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) {return;}

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case '0':
          handleResetZoom();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToNext, goToPrevious, onClose, handleZoomIn, handleZoomOut, handleResetZoom]);

  // Prevent body scroll when gallery is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !currentPhoto) {return null;}

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-black/95 flex flex-col',
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Photo gallery"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-card/20"
        >
          <X className="h-6 w-6" />
        </Button>

        {showCounter && (
          <span className="text-sm">
            {currentIndex + 1} / {photos.length}
          </span>
        )}

        <div className="flex items-center gap-2">
          {allowDownload && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="text-white hover:bg-card/20"
            >
              <Download className="h-5 w-5" />
            </Button>
          )}
          {allowShare && navigator.share && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="text-white hover:bg-card/20"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Image Area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden touch-none"
        {...swipeHandlers}
        {...pinchHandlers}
        {...doubleTapHandlers}
      >
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Image */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-transform duration-200',
            isZoomed && 'cursor-move'
          )}
          style={{
            transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
          }}
        >
          <img
            ref={imageRef}
            src={currentPhoto.url}
            alt={currentPhoto.caption || ''}
            className="max-w-full max-h-full object-contain select-none"
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
            draggable={false}
          />
        </div>

        {/* Navigation Arrows (desktop) */}
        {!isTouchDevice() && (
          <>
            {currentIndex > 0 && (
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            {currentIndex < photos.length - 1 && (
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </>
        )}

        {/* Zoom Controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-full px-3 py-2">
          <button
            onClick={handleZoomOut}
            disabled={scale <= 1}
            className="p-2 text-white hover:bg-card/20 rounded-full disabled:opacity-50 touch-manipulation"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <span className="text-white text-sm min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={scale >= 4}
            className="p-2 text-white hover:bg-card/20 rounded-full disabled:opacity-50 touch-manipulation"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          {isZoomed && (
            <button
              onClick={handleResetZoom}
              className="p-2 text-white hover:bg-card/20 rounded-full touch-manipulation"
            >
              <RotateCw className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Caption */}
      {currentPhoto.caption && (
        <div className="p-4 text-white text-center bg-black/50">
          <p className="text-sm">{currentPhoto.caption}</p>
        </div>
      )}

      {/* Thumbnails Strip */}
      {showThumbnails && photos.length > 1 && (
        <div className="p-4 bg-black/50 overflow-x-auto">
          <div className="flex gap-2 justify-center min-w-max">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => goToIndex(index)}
                className={cn(
                  'w-16 h-16 rounded-lg overflow-hidden border-2 transition-all touch-manipulation',
                  'min-w-[64px] min-h-[64px]', // Touch-friendly size
                  index === currentIndex
                    ? 'border-white opacity-100'
                    : 'border-transparent opacity-60 hover:opacity-80'
                )}
              >
                <img
                  src={photo.thumbnailUrl || photo.url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Touch instructions (first time) */}
      {isTouchDevice() && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/50 text-xs text-center pointer-events-none">
          <p>Swipe left/right to navigate</p>
          <p>Pinch or double-tap to zoom</p>
          <p>Pull down to close</p>
        </div>
      )}
    </div>
  );
}

export default TouchPhotoGallery;
