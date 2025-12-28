/**
 * VRWalkthrough Component
 *
 * Virtual Reality walkthrough experience for construction sites and 3D models.
 * Supports WebXR VR headsets and 360 photo tours.
 *
 * Features:
 * - WebXR VR session management
 * - Teleport locomotion
 * - Smooth locomotion (optional)
 * - Controller interaction
 * - 360 photo panorama tours
 * - Hotspots and annotations
 * - Comfort vignette
 * - Cross-platform support
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  Sky,
  Html,
  useTexture,
  Sphere,
  PerspectiveCamera,
} from '@react-three/drei';
import {
  Maximize2,
  Minimize2,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Settings,
  Glasses,
  Eye,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Info,
  Navigation,
  Move,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useWebXR, useWebXRSupport } from '../hooks/useWebXR';
import type {
  VRTour,
  VRTourNode,
  VRAnnotation,
  Photo360Data,
  VRWalkthroughSettings,
  Vector3D,
} from '@/types/visualization';
import { logger } from '../../../lib/utils/logger';


// ============================================================================
// Types
// ============================================================================

interface VRWalkthroughProps {
  /** 3D model URL for walkthrough */
  modelUrl?: string;
  /** VR Tour data for 360 photo tours */
  tour?: VRTour;
  /** Single 360 photo URL */
  photo360Url?: string;
  /** Array of 360 photos for slideshow */
  photos?: Photo360Data[];
  /** Show navigation controls */
  showControls?: boolean;
  /** Show minimap */
  showMinimap?: boolean;
  /** Walkthrough settings */
  settings?: Partial<VRWalkthroughSettings>;
  /** Container className */
  className?: string;
  /** Callback when VR session starts */
  onSessionStart?: () => void;
  /** Callback when VR session ends */
  onSessionEnd?: () => void;
  /** Callback when node changes in tour */
  onNodeChange?: (node: VRTourNode) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

const defaultSettings: VRWalkthroughSettings = {
  locomotionMode: 'teleport',
  movementSpeed: 3,
  snapTurnAngle: 45,
  smoothTurnSpeed: 60,
  comfortVignette: true,
  vignetteIntensity: 0.5,
  handTrackingEnabled: true,
  showControllerModels: true,
  roomScale: true,
  seatedMode: false,
};

// ============================================================================
// 360 Panorama Component
// ============================================================================

interface Panorama360Props {
  imageUrl: string;
  hotspots?: VRAnnotation[];
  onHotspotClick?: (hotspot: VRAnnotation) => void;
}

function Panorama360({ imageUrl, hotspots, onHotspotClick }: Panorama360Props) {
  const texture = useTexture(imageUrl);
  const sphereRef = useRef<THREE.Mesh>(null);

  // Configure texture - Three.js requires direct mutation of texture properties
  useEffect(() => {
    if (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
    }
  }, [texture]);

  return (
    <group>
      {/* Inverted sphere for inside-out panorama */}
      <Sphere ref={sphereRef} args={[500, 64, 32]} scale={[-1, 1, 1]}>
        <meshBasicMaterial map={texture} side={THREE.BackSide} />
      </Sphere>

      {/* Hotspots */}
      {hotspots?.map((hotspot) => {
        // Convert yaw/pitch to 3D position
        const yawRad = (hotspot.position.yaw * Math.PI) / 180;
        const pitchRad = (hotspot.position.pitch * Math.PI) / 180;
        const distance = 10;

        const x = distance * Math.cos(pitchRad) * Math.sin(yawRad);
        const y = distance * Math.sin(pitchRad);
        const z = distance * Math.cos(pitchRad) * Math.cos(yawRad);

        return (
          <HotspotMarker
            key={hotspot.id}
            position={[x, y, z]}
            hotspot={hotspot}
            onClick={() => onHotspotClick?.(hotspot)}
          />
        );
      })}
    </group>
  );
}

// ============================================================================
// Hotspot Marker Component
// ============================================================================

interface HotspotMarkerProps {
  position: [number, number, number];
  hotspot: VRAnnotation;
  onClick: () => void;
}

function HotspotMarker({ position, hotspot, onClick }: HotspotMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  // Pulsing animation
  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      meshRef.current.scale.setScalar(isHovered ? scale * 1.3 : scale);
    }
  });

  // Always face camera
  useFrame(({ camera }) => {
    if (meshRef.current) {
      meshRef.current.lookAt(camera.position);
    }
  });

  const getColor = () => {
    switch (hotspot.type) {
      case 'link':
        return 0x4a90d9;
      case 'text':
        return 0xffc107;
      case 'image':
        return 0x28a745;
      case 'video':
        return 0xdc3545;
      default:
        return 0xffffff;
    }
  };

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
      >
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial
          color={getColor()}
          transparent
          opacity={isHovered ? 0.9 : 0.7}
        />
      </mesh>

      {/* Inner icon */}
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[0.2, 32]} />
        <meshBasicMaterial color={0xffffff} />
      </mesh>

      {/* Label on hover */}
      {isHovered && hotspot.title && (
        <Html center position={[0, 0.8, 0]}>
          <div className="bg-black/80 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap backdrop-blur-sm">
            {hotspot.title}
          </div>
        </Html>
      )}
    </group>
  );
}

// ============================================================================
// Tour Navigation Component
// ============================================================================

interface TourNavigationProps {
  nodes: VRTourNode[];
  currentNodeId: string;
  onNavigate: (nodeId: string) => void;
}

function TourNavigation({ nodes, currentNodeId, onNavigate }: TourNavigationProps) {
  const currentIndex = nodes.findIndex((n) => n.id === currentNodeId);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onNavigate(nodes[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < nodes.length - 1) {
      onNavigate(nodes[currentIndex + 1].id);
    }
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-lg p-2 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="icon"
        className="text-white hover:bg-card/20 h-9 w-9"
        onClick={handlePrevious}
        disabled={currentIndex <= 0}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div className="text-white text-sm px-3">
        {currentIndex + 1} / {nodes.length}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="text-white hover:bg-card/20 h-9 w-9"
        onClick={handleNext}
        disabled={currentIndex >= nodes.length - 1}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

// ============================================================================
// VR Controls Component
// ============================================================================

interface VRControlsProps {
  settings: VRWalkthroughSettings;
  onSettingsChange: (settings: Partial<VRWalkthroughSettings>) => void;
  isVRSupported: boolean;
  isVRActive: boolean;
  onStartVR: () => void;
  onEndVR: () => void;
  onFullscreen: () => void;
  isFullscreen: boolean;
}

function VRControls({
  settings,
  onSettingsChange,
  isVRSupported,
  isVRActive,
  onStartVR,
  onEndVR,
  onFullscreen,
  isFullscreen,
}: VRControlsProps) {
  return (
    <div className="absolute top-4 right-4 flex gap-2">
      {/* Settings dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="bg-black/50 hover:bg-black/70">
            <Settings className="h-4 w-4 text-white" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>VR Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <div className="p-2 space-y-4">
            {/* Locomotion mode */}
            <div className="space-y-2">
              <Label className="text-xs">Locomotion Mode</Label>
              <div className="flex gap-2">
                <Button
                  variant={settings.locomotionMode === 'teleport' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSettingsChange({ locomotionMode: 'teleport' })}
                  className="flex-1"
                >
                  Teleport
                </Button>
                <Button
                  variant={settings.locomotionMode === 'smooth' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSettingsChange({ locomotionMode: 'smooth' })}
                  className="flex-1"
                >
                  Smooth
                </Button>
              </div>
            </div>

            {/* Movement speed */}
            <div className="space-y-2">
              <Label className="text-xs">Movement Speed</Label>
              <Slider
                value={[settings.movementSpeed]}
                min={1}
                max={10}
                step={0.5}
                onValueChange={([v]) => onSettingsChange({ movementSpeed: v })}
              />
            </div>

            {/* Comfort vignette */}
            <div className="flex items-center justify-between">
              <Label className="text-xs">Comfort Vignette</Label>
              <Switch
                checked={settings.comfortVignette}
                onCheckedChange={(checked) =>
                  onSettingsChange({ comfortVignette: checked })
                }
              />
            </div>

            {/* Seated mode */}
            <div className="flex items-center justify-between">
              <Label className="text-xs">Seated Mode</Label>
              <Switch
                checked={settings.seatedMode}
                onCheckedChange={(checked) =>
                  onSettingsChange({ seatedMode: checked })
                }
              />
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* VR button */}
      {isVRSupported && (
        <Button
          variant="secondary"
          size="sm"
          onClick={isVRActive ? onEndVR : onStartVR}
          className={cn(
            'bg-black/50 hover:bg-black/70 text-white',
            isVRActive && 'bg-primary/80 hover:bg-primary-hover/80'
          )}
        >
          <Glasses className="h-4 w-4 mr-2" />
          {isVRActive ? 'Exit VR' : 'Enter VR'}
        </Button>
      )}

      {/* Fullscreen button */}
      <Button
        variant="secondary"
        size="icon"
        onClick={onFullscreen}
        className="bg-black/50 hover:bg-black/70"
      >
        {isFullscreen ? (
          <Minimize2 className="h-4 w-4 text-white" />
        ) : (
          <Maximize2 className="h-4 w-4 text-white" />
        )}
      </Button>
    </div>
  );
}

// ============================================================================
// Main VRWalkthrough Component
// ============================================================================

export function VRWalkthrough({
  modelUrl,
  tour,
  photo360Url,
  photos,
  showControls = true,
  showMinimap = false,
  settings: initialSettings,
  className,
  onSessionStart,
  onSessionEnd,
  onNodeChange,
  onError,
}: VRWalkthroughProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<VRWalkthroughSettings>({
    ...defaultSettings,
    ...initialSettings,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(
    tour?.startNodeId || photos?.[0]?.id || null
  );
  const [activeHotspot, setActiveHotspot] = useState<VRAnnotation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // WebXR support
  const { supportsVR, isLoading: isCheckingVR } = useWebXRSupport();

  // WebXR hook
  const {
    isSessionActive: isVRActive,
    startVRSession,
    endSession: endVRSession,
  } = useWebXR({
    onSessionStart,
    onSessionEnd,
    onError,
  });

  // Get current 360 image URL
  const currentImageUrl = useMemo(() => {
    if (photo360Url) {return photo360Url;}
    if (tour && currentNodeId) {
      const node = tour.nodes.find((n) => n.id === currentNodeId);
      return node?.photo.url;
    }
    if (photos && currentNodeId) {
      const photo = photos.find((p) => p.id === currentNodeId);
      return photo?.url;
    }
    return null;
  }, [photo360Url, tour, currentNodeId, photos]);

  // Get current node
  const currentNode = useMemo(() => {
    if (tour && currentNodeId) {
      return tour.nodes.find((n) => n.id === currentNodeId);
    }
    return null;
  }, [tour, currentNodeId]);

  // Handle settings change
  const handleSettingsChange = useCallback(
    (newSettings: Partial<VRWalkthroughSettings>) => {
      setSettings((prev) => ({ ...prev, ...newSettings }));
    },
    []
  );

  // Handle node navigation
  const handleNavigate = useCallback(
    (nodeId: string) => {
      setCurrentNodeId(nodeId);
      const node = tour?.nodes.find((n) => n.id === nodeId);
      if (node) {
        onNodeChange?.(node);
      }
    },
    [tour, onNodeChange]
  );

  // Handle hotspot click
  const handleHotspotClick = useCallback(
    (hotspot: VRAnnotation) => {
      if (hotspot.type === 'link' && hotspot.content) {
        // Navigate to linked node
        handleNavigate(hotspot.content);
      } else {
        // Show hotspot content
        setActiveHotspot(hotspot);
      }
    },
    [handleNavigate]
  );

  // Start VR session
  const handleStartVR = useCallback(async () => {
    const success = await startVRSession();
    if (!success) {
      onError?.(new Error('Failed to start VR session'));
    }
  }, [startVRSession, onError]);

  // Fullscreen toggle
  const handleFullscreen = useCallback(async () => {
    if (!containerRef.current) {return;}

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      logger.error('Fullscreen error:', err);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle image load
  useEffect(() => {
    if (currentImageUrl) {
      setTimeout(() => {
        setIsLoading(true);
      }, 0);
      const img = new Image();
      img.onload = () => setTimeout(() => setIsLoading(false), 0);
      img.onerror = () => {
        setTimeout(() => {
          setIsLoading(false);
        }, 0);
        onError?.(new Error('Failed to load panorama image'));
      };
      img.src = currentImageUrl;
    }
  }, [currentImageUrl, onError]);

  // No content state
  if (!currentImageUrl && !modelUrl) {
    return (
      <div
        className={cn(
          'relative w-full h-full min-h-[400px] bg-background flex flex-col items-center justify-center text-white rounded-lg',
          className
        )}
      >
        <Eye className="h-16 w-16 mb-4 text-secondary" />
        <p className="text-lg font-medium">No Content</p>
        <p className="text-sm text-disabled mt-1">
          Provide a tour, 360 photo, or 3D model to start
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full min-h-[400px] bg-black overflow-hidden rounded-lg',
        isFullscreen && 'rounded-none',
        className
      )}
    >
      {/* 3D Canvas */}
      <Canvas
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        camera={{ position: [0, 0, 0.1], fov: 75 }}
      >
        {/* Panorama or 3D scene */}
        {currentImageUrl && (
          <Panorama360
            imageUrl={currentImageUrl}
            hotspots={currentNode?.annotations}
            onHotspotClick={handleHotspotClick}
          />
        )}

        {/* Controls */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          rotateSpeed={-0.5}
          target={[0, 0, 0]}
        />
      </Canvas>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
          <Loader2 className="h-10 w-10 text-white animate-spin mb-4" />
          <p className="text-white text-sm">Loading panorama...</p>
        </div>
      )}

      {/* VR Controls */}
      {showControls && !isLoading && (
        <VRControls
          settings={settings}
          onSettingsChange={handleSettingsChange}
          isVRSupported={supportsVR}
          isVRActive={isVRActive}
          onStartVR={handleStartVR}
          onEndVR={endVRSession}
          onFullscreen={handleFullscreen}
          isFullscreen={isFullscreen}
        />
      )}

      {/* Tour navigation */}
      {(tour || photos) && showControls && !isLoading && (
        <TourNavigation
          nodes={tour?.nodes || photos?.map((p) => ({ id: p.id, photo: p } as VRTourNode)) || []}
          currentNodeId={currentNodeId || ''}
          onNavigate={handleNavigate}
        />
      )}

      {/* Current location info */}
      {currentNode && (
        <div className="absolute top-4 left-4 bg-black/60 rounded-lg p-3 backdrop-blur-sm text-white max-w-xs">
          <h3 className="font-medium text-sm heading-subsection">{currentNode.photo.name}</h3>
          {currentNode.photo.tags && (
            <div className="flex flex-wrap gap-1 mt-1">
              {currentNode.photo.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-card/20 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hotspot content dialog */}
      <Dialog
        open={activeHotspot !== null && activeHotspot.type !== 'link'}
        onOpenChange={(open) => !open && setActiveHotspot(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeHotspot?.title || 'Information'}</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {activeHotspot?.type === 'text' && (
              <p className="text-sm text-muted-foreground">
                {activeHotspot.content}
              </p>
            )}
            {activeHotspot?.type === 'image' && activeHotspot.content && (
              <img
                src={activeHotspot.content}
                alt={activeHotspot.title}
                className="w-full rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* VR badge */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/60 rounded text-white text-xs font-medium backdrop-blur-sm flex items-center gap-1">
        <Eye className="h-3 w-3" />
        VR Walkthrough
      </div>

      {/* Help overlay */}
      <div className="absolute bottom-16 left-4 text-white/60 text-xs">
        <p>Click and drag to look around</p>
        {supportsVR && <p>Put on VR headset for immersive experience</p>}
      </div>
    </div>
  );
}

export default VRWalkthrough;
