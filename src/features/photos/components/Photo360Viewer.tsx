/**
 * Photo360Viewer Component
 *
 * Immersive panoramic photo viewer with gyroscope controls for construction site documentation.
 * Features:
 * - Full 360 panoramic viewing using photo-sphere-viewer
 * - Gyroscope control for mobile devices
 * - Touch/mouse controls (pan, zoom)
 * - Fullscreen mode
 * - Reset view button
 * - Loading states and error handling
 * - Responsive container
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin';
import '@photo-sphere-viewer/core/index.css';
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  Smartphone,
  MousePointer,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Photo360ViewerProps {
  /** URL of the 360 photo to display */
  photoUrl: string;
  /** Enable auto-rotation when idle */
  autoRotate?: boolean;
  /** Auto-rotation speed in RPM (revolutions per minute) */
  autoRotateSpeed?: string;
  /** Initial heading angle in degrees */
  defaultHeading?: number;
  /** Initial pitch angle in degrees */
  defaultPitch?: number;
  /** Minimum zoom level (0-100) */
  minZoom?: number;
  /** Maximum zoom level (0-100) */
  maxZoom?: number;
  /** Container class name */
  className?: string;
  /** Caption to display */
  caption?: string;
  /** Callback when viewer is ready */
  onReady?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export function Photo360Viewer({
  photoUrl,
  autoRotate = false,
  autoRotateSpeed = '0.2rpm',
  defaultHeading = 0,
  defaultPitch = 0,
  minZoom = 30,
  maxZoom = 100,
  className,
  caption,
  onReady,
  onError,
}: Photo360ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gyroscopeEnabled, setGyroscopeEnabled] = useState(false);
  const [gyroscopeSupported, setGyroscopeSupported] = useState(false);

  // Initialize viewer
  useEffect(() => {
    if (!containerRef.current || !photoUrl) return;

    setIsLoading(true);
    setError(null);

    let viewer: Viewer | null = null;

    const initViewer = async () => {
      try {
        // Create viewer instance
        viewer = new Viewer({
          container: containerRef.current!,
          panorama: photoUrl,
          loadingTxt: 'Loading panorama...',
          defaultYaw: (defaultHeading * Math.PI) / 180,
          defaultPitch: (defaultPitch * Math.PI) / 180,
          minFov: 100 - maxZoom,
          maxFov: 100 - minZoom,
          navbar: false,
          touchmoveTwoFingers: false,
          mousewheelCtrlKey: false,
          plugins: [
            [
              GyroscopePlugin,
              {
                touchmove: true,
                absolutePosition: false,
                moveMode: 'smooth',
              },
            ],
          ],
        });

        // Handle ready event
        viewer.addEventListener('ready', () => {
          setIsLoading(false);
          const gyroPlugin = viewer?.getPlugin<GyroscopePlugin>(GyroscopePlugin);
          setGyroscopeSupported(gyroPlugin?.isSupported() ?? false);
          onReady?.();

          // Enable auto-rotate if specified
          if (autoRotate && viewer) {
            // Use type assertion for the autoRotate method which may vary by version
            (viewer as unknown as { startAutoRotate?: (opts: { speed: string }) => void })
              .startAutoRotate?.({ speed: autoRotateSpeed });
          }
        });

        viewerRef.current = viewer;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load panorama';
        setError(errorMessage);
        setIsLoading(false);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    };

    initViewer();

    // Cleanup
    return () => {
      if (viewer) {
        viewer.destroy();
        viewerRef.current = null;
      }
    };
  }, [photoUrl, defaultHeading, defaultPitch, minZoom, maxZoom, autoRotate, autoRotateSpeed, onReady, onError]);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  // Reset view to initial position
  const resetView = useCallback(() => {
    if (!viewerRef.current) return;

    viewerRef.current.animate({
      yaw: (defaultHeading * Math.PI) / 180,
      pitch: (defaultPitch * Math.PI) / 180,
      zoom: 50,
      speed: '2rpm',
    });
  }, [defaultHeading, defaultPitch]);

  // Toggle gyroscope
  const toggleGyroscope = useCallback(async () => {
    if (!viewerRef.current) return;

    const gyroPlugin = viewerRef.current.getPlugin<GyroscopePlugin>(GyroscopePlugin);
    if (!gyroPlugin) return;

    try {
      if (gyroscopeEnabled) {
        gyroPlugin.stop();
        setGyroscopeEnabled(false);
      } else {
        await gyroPlugin.start();
        setGyroscopeEnabled(true);
      }
    } catch (err) {
      console.error('Gyroscope error:', err);
      // Gyroscope may require user gesture or permission
      setGyroscopeSupported(false);
    }
  }, [gyroscopeEnabled]);

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          'relative w-full h-full min-h-[300px] bg-gray-900 flex flex-col items-center justify-center text-white',
          className
        )}
      >
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <p className="text-lg font-medium mb-2">Failed to Load Panorama</p>
        <p className="text-sm text-gray-400 max-w-md text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className={cn('relative w-full h-full min-h-[300px]', className)}>
      {/* Viewer container */}
      <div
        ref={containerRef}
        className={cn(
          'w-full h-full bg-black rounded-lg overflow-hidden',
          isFullscreen && 'rounded-none'
        )}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg">
          <Loader2 className="h-10 w-10 text-white animate-spin mb-4" />
          <p className="text-white text-sm">Loading panorama...</p>
        </div>
      )}

      {/* Controls overlay */}
      {!isLoading && !error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-lg p-2 backdrop-blur-sm">
          {/* Gyroscope toggle (mobile only) */}
          {gyroscopeSupported && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'text-white hover:bg-white/20 h-9 w-9',
                gyroscopeEnabled && 'bg-primary/30'
              )}
              onClick={toggleGyroscope}
              title={gyroscopeEnabled ? 'Disable gyroscope' : 'Enable gyroscope'}
            >
              {gyroscopeEnabled ? (
                <Smartphone className="h-4 w-4" />
              ) : (
                <MousePointer className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Reset view */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-9 w-9"
            onClick={resetView}
            title="Reset view"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          {/* Fullscreen toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-9 w-9"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {/* 360 badge */}
      <div className="absolute top-4 left-4 px-2 py-1 bg-black/60 rounded text-white text-xs font-medium backdrop-blur-sm">
        360
      </div>

      {/* Gyroscope hint (show briefly on mobile) */}
      {gyroscopeSupported && !gyroscopeEnabled && !isLoading && (
        <div className="absolute top-4 right-4 px-2 py-1 bg-black/60 rounded text-white text-xs backdrop-blur-sm animate-pulse">
          Tip: Enable gyroscope for immersive view
        </div>
      )}

      {/* Caption */}
      {caption && !isFullscreen && (
        <div className="absolute bottom-16 left-4 right-4 text-center">
          <p className="text-white text-sm bg-black/60 px-3 py-1.5 rounded inline-block backdrop-blur-sm">
            {caption}
          </p>
        </div>
      )}
    </div>
  );
}

export default Photo360Viewer;
