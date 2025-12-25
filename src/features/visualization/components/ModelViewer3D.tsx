/**
 * ModelViewer3D Component
 *
 * Three.js-based 3D model viewer with orbit controls, lighting, and optimization.
 * Supports glTF/GLB, OBJ, and FBX formats.
 *
 * Features:
 * - Orbit controls (rotate, pan, zoom)
 * - Auto-rotate option
 * - Multiple lighting presets
 * - Grid and axes helpers
 * - Wireframe mode
 * - Screenshot capture
 * - Animation playback
 * - Mobile touch gestures
 * - Performance monitoring
 */

import React, { useRef, useEffect, useState, useCallback, Suspense, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  Grid,
  PerspectiveCamera,
  Html,
  useProgress,
  Stats,
} from '@react-three/drei';
import * as THREE from 'three';
import {
  Loader2,
  Maximize2,
  Minimize2,
  RotateCcw,
  Grid3X3,
  Move3D,
  Box,
  Camera,
  Play,
  Pause,
  Settings,
  Sun,
  Moon,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useModelLoader } from '../hooks/useModelLoader';
import type { ModelViewerSettings, CameraState } from '@/types/visualization';

// ============================================================================
// Types
// ============================================================================

interface ModelViewer3DProps {
  /** URL of the 3D model to load */
  modelUrl?: string;
  /** Model format (auto-detected from URL if not provided) */
  format?: 'gltf' | 'glb' | 'obj' | 'fbx';
  /** Initial camera position */
  initialCameraPosition?: [number, number, number];
  /** Initial camera target */
  initialCameraTarget?: [number, number, number];
  /** Viewer settings */
  settings?: Partial<ModelViewerSettings>;
  /** Show controls toolbar */
  showControls?: boolean;
  /** Show performance stats */
  showStats?: boolean;
  /** Container className */
  className?: string;
  /** Callback when model is clicked */
  onModelClick?: (event: THREE.Intersection) => void;
  /** Callback when model is loaded */
  onModelLoad?: (model: THREE.Group) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

// Default settings
const defaultSettings: ModelViewerSettings = {
  autoRotate: false,
  autoRotateSpeed: 1,
  enableShadows: true,
  enableAmbientOcclusion: false,
  backgroundColor: '#1a1a2e',
  gridEnabled: true,
  axesEnabled: false,
  wireframeEnabled: false,
  enableZoom: true,
  enablePan: true,
  enableRotate: true,
  minDistance: 1,
  maxDistance: 1000,
  minPolarAngle: 0,
  maxPolarAngle: Math.PI,
};

// ============================================================================
// Loading Component
// ============================================================================

function LoadingIndicator() {
  const { progress } = useProgress();

  return (
    <Html center>
      <div className="flex flex-col items-center justify-center bg-black/80 rounded-lg p-6 text-white">
        <Loader2 className="h-10 w-10 animate-spin mb-4" />
        <p className="text-sm font-medium">Loading model...</p>
        <p className="text-xs text-disabled mt-1">{Math.round(progress)}%</p>
      </div>
    </Html>
  );
}

// ============================================================================
// Scene Component
// ============================================================================

interface SceneProps {
  model: THREE.Group | null;
  settings: ModelViewerSettings;
  onModelClick?: (event: THREE.Intersection) => void;
}

function Scene({ model, settings, onModelClick }: SceneProps) {
  const { camera, gl, scene } = useThree();
  const controlsRef = useRef<any>(null);
  const modelRef = useRef<THREE.Group | null>(null);

  // Apply wireframe mode
  useEffect(() => {
    if (model) {
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              if ('wireframe' in mat) {
                mat.wireframe = settings.wireframeEnabled;
              }
            });
          } else if ('wireframe' in child.material) {
            child.material.wireframe = settings.wireframeEnabled;
          }
        }
      });
    }
  }, [model, settings.wireframeEnabled]);

  // Apply shadow settings
  useEffect(() => {
    if (model) {
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = settings.enableShadows;
          child.receiveShadow = settings.enableShadows;
        }
      });
    }
    gl.shadowMap.enabled = settings.enableShadows;
  }, [model, settings.enableShadows, gl]);

  // Handle click on model
  const handleClick = useCallback(
    (event: any) => {
      if (onModelClick && event.intersections.length > 0) {
        onModelClick(event.intersections[0]);
      }
    },
    [onModelClick]
  );

  // Auto-rotate animation
  useFrame(() => {
    if (settings.autoRotate && controlsRef.current) {
      controlsRef.current.autoRotate = true;
      controlsRef.current.autoRotateSpeed = settings.autoRotateSpeed;
    } else if (controlsRef.current) {
      controlsRef.current.autoRotate = false;
    }
  });

  return (
    <>
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={50} />

      {/* Controls */}
      <OrbitControls
        ref={controlsRef}
        enableZoom={settings.enableZoom}
        enablePan={settings.enablePan}
        enableRotate={settings.enableRotate}
        minDistance={settings.minDistance}
        maxDistance={settings.maxDistance}
        minPolarAngle={settings.minPolarAngle}
        maxPolarAngle={settings.maxPolarAngle}
        makeDefault
      />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow={settings.enableShadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />
      <hemisphereLight intensity={0.3} />

      {/* Environment */}
      <Environment preset="city" background={false} />

      {/* Grid */}
      {settings.gridEnabled && (
        <Grid
          position={[0, -0.01, 0]}
          args={[100, 100]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#6e6e6e"
          sectionSize={10}
          sectionThickness={1}
          sectionColor="#9d4edd"
          fadeDistance={100}
          fadeStrength={1}
          followCamera={false}
        />
      )}

      {/* Axes helper */}
      {settings.axesEnabled && <axesHelper args={[5]} />}

      {/* Model */}
      {model && (
        <primitive
          ref={modelRef}
          object={model}
          onClick={handleClick}
        />
      )}

      {/* Ground plane for shadows */}
      {settings.enableShadows && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <shadowMaterial opacity={0.3} />
        </mesh>
      )}
    </>
  );
}

// ============================================================================
// Controls Toolbar
// ============================================================================

interface ControlsToolbarProps {
  settings: ModelViewerSettings;
  onSettingsChange: (settings: Partial<ModelViewerSettings>) => void;
  onReset: () => void;
  onScreenshot: () => void;
  onFullscreen: () => void;
  isFullscreen: boolean;
  animations: THREE.AnimationClip[];
  isPlaying: boolean;
  onPlayAnimation: (name: string) => void;
  onStopAnimation: () => void;
}

function ControlsToolbar({
  settings,
  onSettingsChange,
  onReset,
  onScreenshot,
  onFullscreen,
  isFullscreen,
  animations,
  isPlaying,
  onPlayAnimation,
  onStopAnimation,
}: ControlsToolbarProps) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-lg p-2 backdrop-blur-sm">
      {/* Auto-rotate toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'text-white hover:bg-card/20 h-9 w-9',
          settings.autoRotate && 'bg-primary/30'
        )}
        onClick={() => onSettingsChange({ autoRotate: !settings.autoRotate })}
        title="Auto-rotate"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>

      {/* Grid toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'text-white hover:bg-card/20 h-9 w-9',
          settings.gridEnabled && 'bg-primary/30'
        )}
        onClick={() => onSettingsChange({ gridEnabled: !settings.gridEnabled })}
        title="Toggle grid"
      >
        <Grid3X3 className="h-4 w-4" />
      </Button>

      {/* Axes toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'text-white hover:bg-card/20 h-9 w-9',
          settings.axesEnabled && 'bg-primary/30'
        )}
        onClick={() => onSettingsChange({ axesEnabled: !settings.axesEnabled })}
        title="Toggle axes"
      >
        <Move3D className="h-4 w-4" />
      </Button>

      {/* Wireframe toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'text-white hover:bg-card/20 h-9 w-9',
          settings.wireframeEnabled && 'bg-primary/30'
        )}
        onClick={() => onSettingsChange({ wireframeEnabled: !settings.wireframeEnabled })}
        title="Toggle wireframe"
      >
        <Box className="h-4 w-4" />
      </Button>

      {/* Shadows toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'text-white hover:bg-card/20 h-9 w-9',
          settings.enableShadows && 'bg-primary/30'
        )}
        onClick={() => onSettingsChange({ enableShadows: !settings.enableShadows })}
        title="Toggle shadows"
      >
        {settings.enableShadows ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>

      <div className="w-px h-6 bg-card/30" />

      {/* Animation controls */}
      {animations.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-card/20 h-9 w-9"
              title="Animations"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            <DropdownMenuLabel>Animations</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {animations.map((anim) => (
              <DropdownMenuItem
                key={anim.name}
                onClick={() => onPlayAnimation(anim.name)}
              >
                {anim.name || 'Unnamed Animation'}
              </DropdownMenuItem>
            ))}
            {isPlaying && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onStopAnimation}>
                  Stop Animation
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Screenshot */}
      <Button
        variant="ghost"
        size="icon"
        className="text-white hover:bg-card/20 h-9 w-9"
        onClick={onScreenshot}
        title="Screenshot"
      >
        <Camera className="h-4 w-4" />
      </Button>

      {/* Reset view */}
      <Button
        variant="ghost"
        size="icon"
        className="text-white hover:bg-card/20 h-9 w-9"
        onClick={onReset}
        title="Reset view"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>

      {/* Fullscreen */}
      <Button
        variant="ghost"
        size="icon"
        className="text-white hover:bg-card/20 h-9 w-9"
        onClick={onFullscreen}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ModelViewer3D({
  modelUrl,
  format,
  initialCameraPosition = [10, 10, 10],
  initialCameraTarget = [0, 0, 0],
  settings: initialSettings,
  showControls = true,
  showStats = false,
  className,
  onModelClick,
  onModelLoad,
  onError,
}: ModelViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [settings, setSettings] = useState<ModelViewerSettings>({
    ...defaultSettings,
    ...initialSettings,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Model loader hook
  const {
    isLoading,
    error,
    model,
    animations,
    loadModel,
    playAnimation,
    stopAnimation,
  } = useModelLoader({
    autoOptimize: true,
    onLoad: onModelLoad,
    onError,
  });

  // Load model when URL changes
  useEffect(() => {
    if (modelUrl) {
      loadModel(modelUrl, format);
    }
  }, [modelUrl, format, loadModel]);

  // Handle settings change
  const handleSettingsChange = useCallback(
    (newSettings: Partial<ModelViewerSettings>) => {
      setSettings((prev) => ({ ...prev, ...newSettings }));
    },
    []
  );

  // Reset view
  const handleReset = useCallback(() => {
    // Reset to initial settings
    setSettings((prev) => ({
      ...prev,
      autoRotate: false,
    }));
  }, []);

  // Screenshot
  const handleScreenshot = useCallback(() => {
    if (!canvasRef.current) {return;}

    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `model-screenshot-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, []);

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
      console.error('Fullscreen error:', err);
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

  // Animation controls
  const handlePlayAnimation = useCallback(
    (name: string) => {
      playAnimation(name);
      setIsPlaying(true);
    },
    [playAnimation]
  );

  const handleStopAnimation = useCallback(() => {
    stopAnimation();
    setIsPlaying(false);
  }, [stopAnimation]);

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          'relative w-full h-full min-h-[400px] bg-background flex flex-col items-center justify-center text-white rounded-lg',
          className
        )}
      >
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <p className="text-lg font-medium mb-2">Failed to Load Model</p>
        <p className="text-sm text-disabled max-w-md text-center">{error}</p>
        {modelUrl && (
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => loadModel(modelUrl, format)}
          >
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full min-h-[400px] rounded-lg overflow-hidden',
        isFullscreen && 'rounded-none',
        className
      )}
      style={{ backgroundColor: settings.backgroundColor }}
    >
      <Canvas
        ref={canvasRef as any}
        shadows={settings.enableShadows}
        gl={{
          antialias: true,
          preserveDrawingBuffer: true, // Required for screenshots
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        camera={{
          position: initialCameraPosition,
          fov: 50,
          near: 0.1,
          far: 2000,
        }}
      >
        <Suspense fallback={<LoadingIndicator />}>
          <Scene
            model={model}
            settings={settings}
            onModelClick={onModelClick}
          />
        </Suspense>
        {showStats && <Stats />}
      </Canvas>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
          <Loader2 className="h-10 w-10 text-white animate-spin mb-4" />
          <p className="text-white text-sm">Loading 3D model...</p>
        </div>
      )}

      {/* Controls toolbar */}
      {showControls && !isLoading && model && (
        <ControlsToolbar
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onReset={handleReset}
          onScreenshot={handleScreenshot}
          onFullscreen={handleFullscreen}
          isFullscreen={isFullscreen}
          animations={animations}
          isPlaying={isPlaying}
          onPlayAnimation={handlePlayAnimation}
          onStopAnimation={handleStopAnimation}
        />
      )}

      {/* Model info badge */}
      {model && !isLoading && (
        <div className="absolute top-4 left-4 px-2 py-1 bg-black/60 rounded text-white text-xs font-medium backdrop-blur-sm">
          3D Model
        </div>
      )}

      {/* No model placeholder */}
      {!modelUrl && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60">
          <Box className="h-16 w-16 mb-4" />
          <p className="text-lg font-medium">No model loaded</p>
          <p className="text-sm">Provide a model URL to view</p>
        </div>
      )}
    </div>
  );
}

export default ModelViewer3D;
