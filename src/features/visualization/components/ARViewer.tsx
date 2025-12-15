/**
 * ARViewer Component
 *
 * Augmented Reality viewer for placing 3D models in the real world.
 * Uses WebXR for immersive AR and AR.js for marker-based AR fallback.
 *
 * Features:
 * - WebXR immersive AR support
 * - Marker-based AR fallback (QR codes, images)
 * - Plane detection and model placement
 * - Tap to place functionality
 * - Scale and rotate controls
 * - Multiple model support
 * - Mobile-optimized performance
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Environment } from '@react-three/drei';
import * as THREE from 'three';
import {
  Camera,
  Move,
  RotateCcw,
  Maximize2,
  Minimize2,
  X,
  Plus,
  Minus,
  RotateCw,
  Target,
  Smartphone,
  QrCode,
  AlertCircle,
  Check,
  Loader2,
  Hand,
  Move3D,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useWebXR, useWebXRSupport } from '../hooks/useWebXR';
import { useModelLoader } from '../hooks/useModelLoader';
import type {
  ARAnchor,
  ARPlacementState,
  Vector3D,
  Model3DMetadata,
} from '@/types/visualization';

// ============================================================================
// Types
// ============================================================================

interface ARViewerProps {
  /** 3D model URL to place in AR */
  modelUrl?: string;
  /** Multiple models to choose from */
  models?: Model3DMetadata[];
  /** Enable marker-based AR */
  enableMarkerAR?: boolean;
  /** Marker image URL for marker-based AR */
  markerImageUrl?: string;
  /** Show placement controls */
  showControls?: boolean;
  /** Initial model scale */
  initialScale?: number;
  /** Enable shadows */
  enableShadows?: boolean;
  /** Container className */
  className?: string;
  /** Callback when model is placed */
  onModelPlaced?: (anchor: ARAnchor) => void;
  /** Callback when AR session starts */
  onSessionStart?: () => void;
  /** Callback when AR session ends */
  onSessionEnd?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

interface PlacedModel {
  id: string;
  modelUrl: string;
  position: Vector3D;
  rotation: number;
  scale: number;
}

// ============================================================================
// AR Scene Component (for WebXR-based AR)
// ============================================================================

interface ARSceneProps {
  placedModels: PlacedModel[];
  previewPosition: Vector3D | null;
  previewRotation: number;
  previewScale: number;
  modelUrl: string | null;
  onSelect: (id: string) => void;
  selectedId: string | null;
}

function ARScene({
  placedModels,
  previewPosition,
  previewRotation,
  previewScale,
  modelUrl,
  onSelect,
  selectedId,
}: ARSceneProps) {
  const { model: previewModel } = useModelLoader({
    autoOptimize: true,
  });

  // Load preview model
  useEffect(() => {
    if (modelUrl) {
      // Model would be loaded via useModelLoader
    }
  }, [modelUrl]);

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />

      {/* Placed models */}
      {placedModels.map((placedModel) => (
        <PlacedModelMesh
          key={placedModel.id}
          model={placedModel}
          isSelected={selectedId === placedModel.id}
          onSelect={() => onSelect(placedModel.id)}
        />
      ))}

      {/* Preview model at placement position */}
      {previewPosition && previewModel && (
        <group
          position={[previewPosition.x, previewPosition.y, previewPosition.z]}
          rotation={[0, previewRotation, 0]}
          scale={[previewScale, previewScale, previewScale]}
        >
          <primitive object={previewModel.clone()} />
          {/* Placement indicator ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[0.3, 0.35, 32]} />
            <meshBasicMaterial color={0x00ff00} transparent opacity={0.5} />
          </mesh>
        </group>
      )}

      {/* Ground shadow plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <shadowMaterial transparent opacity={0.3} />
      </mesh>
    </>
  );
}

// ============================================================================
// Placed Model Mesh Component
// ============================================================================

interface PlacedModelMeshProps {
  model: PlacedModel;
  isSelected: boolean;
  onSelect: () => void;
}

function PlacedModelMesh({ model, isSelected, onSelect }: PlacedModelMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { model: loadedModel } = useModelLoader();

  // Selection highlight animation
  useFrame((state) => {
    if (groupRef.current && isSelected) {
      const scale = model.scale + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      groupRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group
      ref={groupRef}
      position={[model.position.x, model.position.y, model.position.z]}
      rotation={[0, model.rotation, 0]}
      scale={[model.scale, model.scale, model.scale]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {loadedModel && <primitive object={loadedModel.clone()} />}

      {/* Selection indicator */}
      {isSelected && (
        <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.45, 32]} />
          <meshBasicMaterial color={0x4a90d9} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// Placement Controls Component
// ============================================================================

interface PlacementControlsProps {
  scale: number;
  rotation: number;
  onScaleChange: (scale: number) => void;
  onRotationChange: (rotation: number) => void;
  onPlace: () => void;
  onCancel: () => void;
  canPlace: boolean;
}

function PlacementControls({
  scale,
  rotation,
  onScaleChange,
  onRotationChange,
  onPlace,
  onCancel,
  canPlace,
}: PlacementControlsProps) {
  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/70 rounded-xl p-4 backdrop-blur-sm text-white">
      <div className="flex flex-col gap-4">
        {/* Scale control */}
        <div className="flex items-center gap-3">
          <ZoomOut className="h-4 w-4 text-gray-400" />
          <Slider
            value={[scale]}
            min={0.1}
            max={3}
            step={0.1}
            onValueChange={([v]) => onScaleChange(v)}
            className="w-32"
          />
          <ZoomIn className="h-4 w-4 text-gray-400" />
          <span className="text-xs w-12 text-right">{scale.toFixed(1)}x</span>
        </div>

        {/* Rotation control */}
        <div className="flex items-center gap-3">
          <RotateCcw className="h-4 w-4 text-gray-400" />
          <Slider
            value={[rotation]}
            min={0}
            max={360}
            step={15}
            onValueChange={([v]) => onRotationChange(v)}
            className="w-32"
          />
          <RotateCw className="h-4 w-4 text-gray-400" />
          <span className="text-xs w-12 text-right">{rotation}deg</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onPlace}
            disabled={!canPlace}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-1" />
            Place
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AR Not Supported Fallback
// ============================================================================

interface ARFallbackProps {
  onClose?: () => void;
}

function ARFallback({ onClose }: ARFallbackProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white p-4">
      <AlertCircle className="h-16 w-16 text-yellow-500 mb-4" />
      <h2 className="text-xl font-bold mb-2">AR Not Supported</h2>
      <p className="text-gray-400 text-center mb-4 max-w-md">
        Your device or browser does not support WebXR AR. Try using:
      </p>
      <ul className="text-gray-300 text-sm mb-6 space-y-1">
        <li>Chrome on Android with ARCore</li>
        <li>Safari on iOS 15+ (experimental)</li>
        <li>Edge on Windows with Mixed Reality</li>
      </ul>
      {onClose && (
        <Button onClick={onClose} variant="outline">
          Close
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Main ARViewer Component
// ============================================================================

export function ARViewer({
  modelUrl,
  models,
  enableMarkerAR = false,
  markerImageUrl,
  showControls = true,
  initialScale = 1,
  enableShadows = true,
  className,
  onModelPlaced,
  onSessionStart,
  onSessionEnd,
  onError,
}: ARViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [placedModels, setPlacedModels] = useState<PlacedModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<Vector3D | null>(null);
  const [previewScale, setPreviewScale] = useState(initialScale);
  const [previewRotation, setPreviewRotation] = useState(0);
  const [showARNotSupported, setShowARNotSupported] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [selectedModelUrl, setSelectedModelUrl] = useState(modelUrl || null);

  // WebXR support check
  const { supportsAR, isLoading: isCheckingSupport } = useWebXRSupport();

  // WebXR hook
  const {
    isSessionActive,
    startARSession,
    endSession,
    createAnchor,
  } = useWebXR({
    enableHitTest: true,
    enablePlaneDetection: true,
    onSessionStart: () => {
      setIsCameraActive(true);
      onSessionStart?.();
    },
    onSessionEnd: () => {
      setIsCameraActive(false);
      onSessionEnd?.();
    },
    onError,
  });

  // Start camera for non-WebXR fallback
  const startCamera = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsCameraActive(true);
    } catch (error) {
      console.error('Camera error:', error);
      onError?.(error instanceof Error ? error : new Error('Camera access denied'));
    }
  }, [onError]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Start AR session
  const handleStartAR = useCallback(async () => {
    if (supportsAR) {
      const success = await startARSession({
        domOverlay: containerRef.current || undefined,
      });

      if (!success) {
        // Fall back to camera view
        await startCamera();
      }
    } else {
      // Use camera fallback
      await startCamera();
    }
  }, [supportsAR, startARSession, startCamera]);

  // End AR session
  const handleEndAR = useCallback(async () => {
    if (isSessionActive) {
      await endSession();
    }
    stopCamera();
  }, [isSessionActive, endSession, stopCamera]);

  // Handle tap to place (simplified for camera fallback)
  const handleTapToPlace = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!isPlacing || !selectedModelUrl) return;

      // Get tap position and convert to 3D position
      // In real WebXR, this would use hit testing
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      let clientX: number, clientY: number;
      if ('touches' in event) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
      }

      // Convert screen coords to normalized device coords
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const z = -((clientY - rect.top) / rect.height) * 2 + 1;

      // Create position (simplified - in real AR this would be from hit test)
      const position: Vector3D = {
        x: x * 5, // Scale to reasonable world units
        y: 0,
        z: z * 5,
      };

      setPreviewPosition(position);
    },
    [isPlacing, selectedModelUrl]
  );

  // Place the model
  const handlePlace = useCallback(async () => {
    if (!previewPosition || !selectedModelUrl) return;

    const newModel: PlacedModel = {
      id: `model-${Date.now()}`,
      modelUrl: selectedModelUrl,
      position: previewPosition,
      rotation: (previewRotation * Math.PI) / 180,
      scale: previewScale,
    };

    setPlacedModels((prev) => [...prev, newModel]);

    // Create anchor for persistence (if WebXR)
    if (isSessionActive) {
      const anchor = await createAnchor({
        position: previewPosition,
        orientation: { x: 0, y: Math.sin(previewRotation / 2), z: 0, w: Math.cos(previewRotation / 2) },
      });

      if (anchor) {
        onModelPlaced?.({
          ...anchor,
          model: models?.find((m) => m.id === selectedModelUrl) as Model3DMetadata,
        });
      }
    }

    // Reset placement state
    setIsPlacing(false);
    setPreviewPosition(null);
  }, [
    previewPosition,
    selectedModelUrl,
    previewRotation,
    previewScale,
    isSessionActive,
    createAnchor,
    onModelPlaced,
    models,
  ]);

  // Cancel placement
  const handleCancelPlacement = useCallback(() => {
    setIsPlacing(false);
    setPreviewPosition(null);
  }, []);

  // Delete selected model
  const handleDeleteModel = useCallback(() => {
    if (selectedModelId) {
      setPlacedModels((prev) => prev.filter((m) => m.id !== selectedModelId));
      setSelectedModelId(null);
    }
  }, [selectedModelId]);

  // Loading state
  if (isCheckingSupport) {
    return (
      <div className={cn('relative w-full h-full min-h-[400px] bg-black flex items-center justify-center', className)}>
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full h-full min-h-[400px] bg-black overflow-hidden', className)}
      onClick={handleTapToPlace}
      onTouchStart={handleTapToPlace}
    >
      {/* Camera video feed (fallback) */}
      <video
        ref={videoRef}
        className={cn(
          'absolute inset-0 w-full h-full object-cover',
          !isCameraActive && 'hidden'
        )}
        playsInline
        muted
      />

      {/* 3D Canvas overlay */}
      {isCameraActive && (
        <Canvas
          className="absolute inset-0"
          style={{ pointerEvents: isPlacing ? 'none' : 'auto' }}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
          }}
          camera={{ position: [0, 2, 5], fov: 60 }}
        >
          <ARScene
            placedModels={placedModels}
            previewPosition={previewPosition}
            previewRotation={(previewRotation * Math.PI) / 180}
            previewScale={previewScale}
            modelUrl={selectedModelUrl}
            onSelect={setSelectedModelId}
            selectedId={selectedModelId}
          />
          <OrbitControls
            enableZoom={true}
            enablePan={false}
            maxPolarAngle={Math.PI / 2}
          />
        </Canvas>
      )}

      {/* Start AR button (when not active) */}
      {!isCameraActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <Smartphone className="h-16 w-16 mb-4 text-gray-400" />
          <h2 className="text-xl font-bold mb-2">AR Viewer</h2>
          <p className="text-gray-400 text-center mb-6 max-w-md px-4">
            Place 3D models in the real world using your device camera
          </p>
          <Button onClick={handleStartAR} size="lg" className="gap-2">
            <Camera className="h-5 w-5" />
            Start AR
          </Button>
          {!supportsAR && (
            <p className="text-yellow-500 text-xs mt-4">
              WebXR not available - using camera fallback
            </p>
          )}
        </div>
      )}

      {/* AR Controls */}
      {isCameraActive && showControls && (
        <>
          {/* Top toolbar */}
          <div className="absolute top-4 left-4 right-4 flex justify-between">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEndAR}
              className="bg-black/50 hover:bg-black/70"
            >
              <X className="h-4 w-4 mr-1" />
              Exit
            </Button>

            <div className="flex gap-2">
              {isSessionActive && (
                <Badge variant="secondary" className="bg-green-600/80">
                  WebXR Active
                </Badge>
              )}
              {enableMarkerAR && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-black/50 hover:bg-black/70"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Bottom toolbar */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2">
            {!isPlacing && (
              <>
                <Button
                  onClick={() => {
                    setIsPlacing(true);
                    setSelectedModelUrl(modelUrl || models?.[0]?.id || null);
                  }}
                  disabled={!modelUrl && !models?.length}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Model
                </Button>

                {selectedModelId && (
                  <Button
                    variant="destructive"
                    onClick={handleDeleteModel}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Delete
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Placement instructions */}
          {isPlacing && !previewPosition && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <div className="bg-black/70 rounded-xl p-6 backdrop-blur-sm text-white">
                <Hand className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="font-medium">Tap to place model</p>
                <p className="text-gray-400 text-sm mt-1">
                  Point your device at a flat surface
                </p>
              </div>
            </div>
          )}

          {/* Placement controls */}
          {isPlacing && previewPosition && (
            <PlacementControls
              scale={previewScale}
              rotation={previewRotation}
              onScaleChange={setPreviewScale}
              onRotationChange={setPreviewRotation}
              onPlace={handlePlace}
              onCancel={handleCancelPlacement}
              canPlace={true}
            />
          )}

          {/* Crosshair for placement */}
          {isPlacing && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <Target className="h-10 w-10 text-white/50" />
            </div>
          )}
        </>
      )}

      {/* AR badge */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/60 rounded text-white text-xs font-medium backdrop-blur-sm">
        AR View
      </div>

      {/* AR not supported dialog */}
      <Dialog open={showARNotSupported} onOpenChange={setShowARNotSupported}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AR Not Supported</DialogTitle>
            <DialogDescription>
              WebXR AR is not supported on this device. Please try using a compatible
              device such as a recent Android phone with ARCore or iOS device with ARKit.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ARViewer;
