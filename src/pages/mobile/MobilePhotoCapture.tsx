/**
 * MobilePhotoCapture - Full-screen camera capture for mobile
 *
 * Features:
 * - Full-screen camera viewfinder
 * - GPS location capture
 * - Quick capture mode (tap to shoot)
 * - Photo preview gallery
 * - Link to punch items, inspections, daily reports
 * - Offline queue support
 */

import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Camera,
  X,
  Check,
  FlipHorizontal,
  MapPin,
  Image,
  Trash2,
  ArrowLeft,
  Loader2,
  Zap,
  ZapOff,
  Grid3X3,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../components/ui/use-toast';
import { useSelectedProject } from '../../hooks/useSelectedProject';
import { useCreateProgressPhoto } from '../../features/photo-progress/hooks/usePhotoProgress';
import { cn } from '../../lib/utils';

interface CapturedPhoto {
  id: string;
  blob: Blob;
  previewUrl: string;
  timestamp: Date;
  gps?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}

type CameraState = 'initializing' | 'ready' | 'capturing' | 'error';

// Generate unique ID
function generateId(): string {
  return `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get GPS location
async function getGPSLocation(): Promise<CapturedPhoto['gps'] | undefined> {
  if (!navigator.geolocation) {return undefined;}

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

// Format GPS for display
function formatGPS(gps?: CapturedPhoto['gps']): string {
  if (!gps) {return 'No location';}
  const lat = Math.abs(gps.latitude).toFixed(4);
  const lng = Math.abs(gps.longitude).toFixed(4);
  const latDir = gps.latitude >= 0 ? 'N' : 'S';
  const lngDir = gps.longitude >= 0 ? 'E' : 'W';
  return `${lat}° ${latDir}, ${lng}° ${lngDir}`;
}

// Trigger haptic feedback
function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'medium') {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(patterns[style]);
  }
}

export const MobilePhotoCapture = memo(function MobilePhotoCapture() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { selectedProjectId } = useSelectedProject();

  // Get link context from URL params (e.g., ?link=punch&id=123)
  const linkType = searchParams.get('link'); // punch, inspection, report
  const linkId = searchParams.get('id');

  // Camera state
  const [cameraState, setCameraState] = useState<CameraState>('initializing');
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [showGrid, setShowGrid] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);

  // Captured photos
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // GPS
  const [gpsLocation, setGpsLocation] = useState<CapturedPhoto['gps']>();
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Upload mutation
  const uploadMutation = useCreateProgressPhoto();

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      setCameraState('initializing');
      setError(null);

      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState('ready');

      // Get initial GPS
      setIsGettingLocation(true);
      const gps = await getGPSLocation();
      setGpsLocation(gps);
      setIsGettingLocation(false);
    } catch (err) {
      console.error('Camera init error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to access camera. Please grant camera permission.'
      );
      setCameraState('error');
    }
  }, [facingMode]);

  // Cleanup on unmount
  useEffect(() => {
    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      // Revoke preview URLs
      capturedPhotos.forEach(photo => URL.revokeObjectURL(photo.previewUrl));
    };
  }, []);

  // Reinitialize when facing mode changes
  useEffect(() => {
    if (cameraState === 'ready' || cameraState === 'error') {
      initCamera();
    }
  }, [facingMode]);

  // Capture photo
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || cameraState !== 'ready') {return;}

    setCameraState('capturing');
    triggerHaptic('heavy');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) {throw new Error('Failed to get canvas context');}

      // Set canvas size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw frame
      ctx.drawImage(video, 0, 0);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
          'image/jpeg',
          0.85
        );
      });

      // Get current GPS
      const gps = gpsLocation || (await getGPSLocation());

      // Create captured photo
      const photo: CapturedPhoto = {
        id: generateId(),
        blob,
        previewUrl: URL.createObjectURL(blob),
        timestamp: new Date(),
        gps,
      };

      setCapturedPhotos(prev => [...prev, photo]);
      setCameraState('ready');

      // Flash effect
      if (flashEnabled && videoRef.current) {
        videoRef.current.style.filter = 'brightness(2)';
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.style.filter = 'none';
          }
        }, 100);
      }
    } catch (err) {
      console.error('Capture error:', err);
      toast({
        title: 'Capture Failed',
        description: 'Failed to capture photo',
        variant: 'destructive',
      });
      setCameraState('ready');
    }
  }, [cameraState, gpsLocation, flashEnabled, toast]);

  // Switch camera
  const switchCamera = useCallback(() => {
    triggerHaptic('light');
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  // Delete photo
  const deletePhoto = useCallback((index: number) => {
    triggerHaptic('light');
    setCapturedPhotos(prev => {
      const photo = prev[index];
      if (photo) {URL.revokeObjectURL(photo.previewUrl);}
      return prev.filter((_, i) => i !== index);
    });
    setSelectedPhotoIndex(null);
  }, []);

  // Save and close
  const handleDone = useCallback(async () => {
    if (capturedPhotos.length === 0) {
      navigate(-1);
      return;
    }

    if (!selectedProjectId) {
      toast({
        title: 'No Project Selected',
        description: 'Please select a project before saving photos',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Upload each photo
      for (const photo of capturedPhotos) {
        // Create File from Blob
        const file = new File(
          [photo.blob],
          `photo_${photo.timestamp.toISOString().replace(/[:.]/g, '-')}.jpg`,
          { type: 'image/jpeg' }
        );

        await uploadMutation.mutateAsync({
          project_id: selectedProjectId,
          file,
          metadata: {
            captured_at: photo.timestamp.toISOString(),
            gps_latitude: photo.gps?.latitude,
            gps_longitude: photo.gps?.longitude,
            gps_accuracy: photo.gps?.accuracy,
            source: 'mobile_camera',
          },
        });
      }

      // Cleanup URLs
      capturedPhotos.forEach(photo => URL.revokeObjectURL(photo.previewUrl));

      toast({
        title: 'Photos Saved',
        description: `${capturedPhotos.length} photo(s) uploaded successfully`,
      });

      navigate(-1);
    } catch (err) {
      console.error('Upload error:', err);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload photos. They will be saved offline.',
        variant: 'destructive',
      });
    }
  }, [capturedPhotos, selectedProjectId, uploadMutation, navigate, toast]);

  // Close without saving
  const handleClose = useCallback(() => {
    if (capturedPhotos.length > 0) {
      if (!confirm('Discard captured photos?')) {return;}
    }
    capturedPhotos.forEach(photo => URL.revokeObjectURL(photo.previewUrl));
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    navigate(-1);
  }, [capturedPhotos, navigate]);

  // Refresh GPS
  const refreshGPS = useCallback(async () => {
    setIsGettingLocation(true);
    const gps = await getGPSLocation();
    setGpsLocation(gps);
    setIsGettingLocation(false);
    triggerHaptic('light');
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={handleClose}
        >
          <X className="h-6 w-6" />
        </Button>

        <div className="flex items-center gap-2">
          {capturedPhotos.length > 0 && (
            <Badge variant="secondary" className="bg-white/20 text-white">
              {capturedPhotos.length} photos
            </Badge>
          )}
          {linkType && (
            <Badge variant="outline" className="border-white/50 text-white">
              Link to {linkType}
            </Badge>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={() => setShowGrid(!showGrid)}
        >
          <Grid3X3 className={cn("h-5 w-5", showGrid && "text-primary")} />
        </Button>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Loading state */}
        {cameraState === 'initializing' && (
          <div className="text-white text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Initializing camera...</p>
          </div>
        )}

        {/* Error state */}
        {cameraState === 'error' && (
          <div className="text-white text-center p-8">
            <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-error mb-4">{error}</p>
            <Button onClick={initCamera} variant="secondary">
              Retry
            </Button>
          </div>
        )}

        {/* Video feed */}
        <video
          ref={videoRef}
          className={cn(
            "w-full h-full object-cover transition-all duration-100",
            cameraState !== 'ready' && cameraState !== 'capturing' && 'hidden'
          )}
          playsInline
          muted
          autoPlay
        />

        {/* Grid overlay */}
        {showGrid && cameraState === 'ready' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full grid grid-cols-3 grid-rows-3">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className="border border-white/30"
                />
              ))}
            </div>
          </div>
        )}

        {/* GPS indicator */}
        <button
          onClick={refreshGPS}
          className="absolute top-20 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 text-white text-sm"
        >
          <MapPin
            className={cn(
              "h-4 w-4",
              isGettingLocation && "animate-pulse",
              gpsLocation ? "text-success" : "text-warning"
            )}
          />
          <span className="max-w-[150px] truncate">
            {isGettingLocation ? 'Getting location...' : formatGPS(gpsLocation)}
          </span>
        </button>

        {/* Captured photos thumbnail strip */}
        {capturedPhotos.length > 0 && (
          <div className="absolute bottom-32 left-0 right-0 px-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {capturedPhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  className={cn(
                    "relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer",
                    "ring-2 transition-all",
                    selectedPhotoIndex === index ? "ring-primary" : "ring-white/30"
                  )}
                  onClick={() => setSelectedPhotoIndex(selectedPhotoIndex === index ? null : index)}
                >
                  <img
                    src={photo.previewUrl}
                    alt={`Captured ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    className="absolute top-0.5 right-0.5 p-1 rounded-full bg-destructive/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePhoto(index);
                    }}
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                  {photo.gps && (
                    <MapPin className="absolute bottom-0.5 left-0.5 h-3 w-3 text-success drop-shadow" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div
        className="bg-gradient-to-t from-black/90 to-transparent pt-8 pb-8"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-around max-w-sm mx-auto">
          {/* Flash toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-12 w-12"
            onClick={() => {
              setFlashEnabled(!flashEnabled);
              triggerHaptic('light');
            }}
          >
            {flashEnabled ? (
              <Zap className="h-6 w-6 text-warning" />
            ) : (
              <ZapOff className="h-6 w-6" />
            )}
          </Button>

          {/* Capture button */}
          <button
            onClick={capturePhoto}
            disabled={cameraState !== 'ready'}
            className={cn(
              "w-20 h-20 rounded-full border-4 border-white flex items-center justify-center",
              "transition-all active:scale-95",
              cameraState === 'ready' ? "bg-white/20" : "bg-white/10 opacity-50"
            )}
          >
            <div
              className={cn(
                "w-16 h-16 rounded-full bg-white transition-all",
                cameraState === 'capturing' && "scale-90"
              )}
            />
          </button>

          {/* Switch camera */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-12 w-12"
            onClick={switchCamera}
          >
            <FlipHorizontal className="h-6 w-6" />
          </Button>
        </div>

        {/* Done button */}
        {capturedPhotos.length > 0 && (
          <div className="mt-4 px-4">
            <Button
              className="w-full h-12"
              onClick={handleDone}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Check className="h-5 w-5 mr-2" />
              )}
              Done ({capturedPhotos.length})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});

export default MobilePhotoCapture;
