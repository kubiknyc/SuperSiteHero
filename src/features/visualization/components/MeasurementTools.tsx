/**
 * MeasurementTools Component
 *
 * Tools for measuring distances, areas, and angles in 3D models.
 * Features:
 * - Point-to-point distance measurement
 * - Multi-point area measurement
 * - Angle measurement between surfaces
 * - Snap to vertices/edges
 * - Unit conversion (metric/imperial)
 * - Export measurements
 */

import React, { useState, useCallback, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import {
  Ruler,
  Square,
  Triangle,
  Trash2,
  Download,
  Eye,
  EyeOff,
  X,
  Copy,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Measurement, Vector3D } from '@/types/visualization';

// ============================================================================
// Types
// ============================================================================

interface MeasurementToolsProps {
  /** Currently active measurement type */
  activeTool: MeasurementType | null;
  /** Callback when tool changes */
  onToolChange: (tool: MeasurementType | null) => void;
  /** Existing measurements */
  measurements: Measurement[];
  /** Callback when measurements change */
  onMeasurementsChange: (measurements: Measurement[]) => void;
  /** Snap to vertices */
  snapToVertex?: boolean;
  /** Snap to edges */
  snapToEdge?: boolean;
  /** Show controls UI */
  showControls?: boolean;
  /** Container className */
  className?: string;
}

export type MeasurementType = 'distance' | 'area' | 'angle';

type UnitSystem = 'metric' | 'imperial';

interface MeasurementPoint {
  position: Vector3D;
  meshId?: string;
  vertexIndex?: number;
}

// Unit conversion
const METER_TO_FEET = 3.28084;
const SQ_METER_TO_SQ_FEET = 10.7639;

// ============================================================================
// 3D Measurement Renderer
// ============================================================================

interface MeasurementRendererProps {
  measurement: Measurement;
  isActive: boolean;
  unitSystem: UnitSystem;
  onSelect: () => void;
}

function MeasurementRenderer({
  measurement,
  isActive,
  unitSystem,
  onSelect,
}: MeasurementRendererProps) {
  const color = isActive ? '#00ff00' : '#ffff00';
  const lineWidth = isActive ? 3 : 2;

  // Format value based on type and unit system
  const formatValue = () => {
    let value = measurement.value;
    let unit = measurement.unit;

    if (unitSystem === 'imperial') {
      if (measurement.type === 'distance') {
        value = value * METER_TO_FEET;
        unit = 'ft';
      } else if (measurement.type === 'area') {
        value = value * SQ_METER_TO_SQ_FEET;
        unit = 'ft2';
      }
    }

    if (measurement.type === 'angle') {
      return `${value.toFixed(1)}deg`;
    }

    return `${value.toFixed(2)} ${unit}`;
  };

  // Calculate label position (midpoint for distance, centroid for area)
  const getLabelPosition = (): [number, number, number] => {
    if (measurement.points.length === 0) {return [0, 0, 0];}

    const centroid = measurement.points.reduce(
      (acc, p) => ({
        x: acc.x + p.x / measurement.points.length,
        y: acc.y + p.y / measurement.points.length,
        z: acc.z + p.z / measurement.points.length,
      }),
      { x: 0, y: 0, z: 0 }
    );

    return [centroid.x, centroid.y + 0.2, centroid.z];
  };

  return (
    <group onClick={onSelect}>
      {/* Distance line */}
      {measurement.type === 'distance' && measurement.points.length >= 2 && (
        <>
          <Line
            points={measurement.points.map((p) => [p.x, p.y, p.z])}
            color={color}
            lineWidth={lineWidth}
            dashed={false}
          />
          {/* End point markers */}
          {measurement.points.map((point, index) => (
            <mesh key={index} position={[point.x, point.y, point.z]}>
              <sphereGeometry args={[0.05, 16, 16]} />
              <meshBasicMaterial color={color} />
            </mesh>
          ))}
        </>
      )}

      {/* Area polygon */}
      {measurement.type === 'area' && measurement.points.length >= 3 && (
        <>
          <Line
            points={[
              ...measurement.points.map((p) => [p.x, p.y, p.z] as [number, number, number]),
              [measurement.points[0].x, measurement.points[0].y, measurement.points[0].z],
            ]}
            color={color}
            lineWidth={lineWidth}
          />
          {/* Filled polygon */}
          <mesh>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={measurement.points.length}
                array={new Float32Array(
                  measurement.points.flatMap((p) => [p.x, p.y, p.z])
                )}
                itemSize={3}
              />
            </bufferGeometry>
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.2}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}

      {/* Angle visualization */}
      {measurement.type === 'angle' && measurement.points.length >= 3 && (
        <>
          <Line
            points={measurement.points.map((p) => [p.x, p.y, p.z])}
            color={color}
            lineWidth={lineWidth}
          />
          {/* Arc */}
          <mesh position={[measurement.points[1].x, measurement.points[1].y, measurement.points[1].z]}>
            <torusGeometry args={[0.3, 0.02, 8, 16, (measurement.value * Math.PI) / 180]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </>
      )}

      {/* Value label */}
      <Html position={getLabelPosition()} center>
        <div
          className={cn(
            'px-2 py-1 rounded text-xs font-medium whitespace-nowrap backdrop-blur-sm',
            isActive ? 'bg-success text-white' : 'bg-yellow-600 text-white'
          )}
        >
          {measurement.label || formatValue()}
        </div>
      </Html>
    </group>
  );
}

// ============================================================================
// Preview Point Component
// ============================================================================

interface PreviewPointProps {
  position: Vector3D;
  isSnapped: boolean;
}

function PreviewPoint({ position, isSnapped }: PreviewPointProps) {
  return (
    <mesh position={[position.x, position.y, position.z]}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshBasicMaterial
        color={isSnapped ? '#00ffff' : '#ffffff'}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

// ============================================================================
// Measurement Scene Component
// ============================================================================

interface MeasurementSceneProps {
  measurements: Measurement[];
  activeMeasurementId: string | null;
  currentPoints: MeasurementPoint[];
  previewPoint: MeasurementPoint | null;
  activeTool: MeasurementType | null;
  unitSystem: UnitSystem;
  onPointClick: (point: MeasurementPoint) => void;
  onMeasurementSelect: (id: string) => void;
}

export function MeasurementScene({
  measurements,
  activeMeasurementId,
  currentPoints,
  previewPoint,
  activeTool,
  unitSystem,
  _onPointClick,
  onMeasurementSelect,
}: MeasurementSceneProps) {
  const { camera, raycaster, scene } = useThree();
  const _planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

  // Handle pointer move for preview point
  useFrame(({ pointer }) => {
    if (!activeTool) {return;}

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0 && intersects[0].point) {
      // Update preview point (would need to be lifted to parent state)
    }
  });

  return (
    <group>
      {/* Rendered measurements */}
      {measurements.map((measurement) => (
        <MeasurementRenderer
          key={measurement.id}
          measurement={measurement}
          isActive={measurement.id === activeMeasurementId}
          unitSystem={unitSystem}
          onSelect={() => onMeasurementSelect(measurement.id)}
        />
      ))}

      {/* Current measurement in progress */}
      {currentPoints.length > 0 && (
        <>
          {currentPoints.map((point, index) => (
            <mesh key={index} position={[point.position.x, point.position.y, point.position.z]}>
              <sphereGeometry args={[0.06, 16, 16]} />
              <meshBasicMaterial color="#00ff00" />
            </mesh>
          ))}
          {currentPoints.length > 1 && (
            <Line
              points={currentPoints.map((p) => [p.position.x, p.position.y, p.position.z])}
              color="#00ff00"
              lineWidth={2}
              dashed
            />
          )}
        </>
      )}

      {/* Preview point */}
      {previewPoint && (
        <PreviewPoint
          position={previewPoint.position}
          isSnapped={!!previewPoint.vertexIndex}
        />
      )}
    </group>
  );
}

// ============================================================================
// Measurement Tools UI Component
// ============================================================================

export function MeasurementTools({
  activeTool,
  onToolChange,
  measurements,
  onMeasurementsChange,
  snapToVertex = true,
  snapToEdge = false,
  showControls = true,
  className,
}: MeasurementToolsProps) {
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [snapSettings, setSnapSettings] = useState({
    vertex: snapToVertex,
    edge: snapToEdge,
  });

  // Delete selected measurement
  const handleDelete = useCallback(() => {
    if (selectedMeasurementId) {
      onMeasurementsChange(measurements.filter((m) => m.id !== selectedMeasurementId));
      setSelectedMeasurementId(null);
    }
  }, [selectedMeasurementId, measurements, onMeasurementsChange]);

  // Clear all measurements
  const handleClearAll = useCallback(() => {
    onMeasurementsChange([]);
    setSelectedMeasurementId(null);
  }, [onMeasurementsChange]);

  // Export measurements
  const handleExport = useCallback(() => {
    const data = measurements.map((m) => ({
      id: m.id,
      type: m.type,
      value: m.value,
      unit: m.unit,
      label: m.label,
      points: m.points,
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `measurements-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [measurements]);

  // Copy selected measurement value
  const handleCopy = useCallback(async () => {
    const measurement = measurements.find((m) => m.id === selectedMeasurementId);
    if (measurement) {
      let value = measurement.value;
      let unit = measurement.unit;

      if (unitSystem === 'imperial') {
        if (measurement.type === 'distance') {
          value = value * METER_TO_FEET;
          unit = 'ft';
        } else if (measurement.type === 'area') {
          value = value * SQ_METER_TO_SQ_FEET;
          unit = 'ft2';
        }
      }

      await navigator.clipboard.writeText(`${value.toFixed(2)} ${unit}`);
    }
  }, [selectedMeasurementId, measurements, unitSystem]);

  if (!showControls) {return null;}

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Tool buttons */}
      <div className="flex items-center gap-1 bg-black/60 rounded-lg p-1 backdrop-blur-sm">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 text-white hover:bg-card/20',
                  activeTool === 'distance' && 'bg-primary/50'
                )}
                onClick={() => onToolChange(activeTool === 'distance' ? null : 'distance')}
              >
                <Ruler className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Measure Distance</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 text-white hover:bg-card/20',
                  activeTool === 'area' && 'bg-primary/50'
                )}
                onClick={() => onToolChange(activeTool === 'area' ? null : 'area')}
              >
                <Square className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Measure Area</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 text-white hover:bg-card/20',
                  activeTool === 'angle' && 'bg-primary/50'
                )}
                onClick={() => onToolChange(activeTool === 'angle' ? null : 'angle')}
              >
                <Triangle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Measure Angle</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-card/30 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-card/20"
                onClick={() => setShowMeasurements(!showMeasurements)}
              >
                {showMeasurements ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {showMeasurements ? 'Hide Measurements' : 'Show Measurements'}
            </TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-card/20"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <div className="p-2 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Unit System</Label>
                  <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v as UnitSystem)}>
                    <SelectTrigger className="w-24 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="metric">Metric</SelectItem>
                      <SelectItem value="imperial">Imperial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs">Snap to Vertex</Label>
                  <Switch
                    checked={snapSettings.vertex}
                    onCheckedChange={(checked) =>
                      setSnapSettings((s) => ({ ...s, vertex: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs">Snap to Edge</Label>
                  <Switch
                    checked={snapSettings.edge}
                    onCheckedChange={(checked) =>
                      setSnapSettings((s) => ({ ...s, edge: checked }))
                    }
                  />
                </div>
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleExport} disabled={measurements.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export Measurements
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleClearAll}
                disabled={measurements.length === 0}
                className="text-error"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipProvider>
      </div>

      {/* Active tool indicator */}
      {activeTool && (
        <div className="flex items-center gap-2 bg-primary/80 rounded-lg px-3 py-1.5 text-white text-sm backdrop-blur-sm">
          {activeTool === 'distance' && <Ruler className="h-4 w-4" />}
          {activeTool === 'area' && <Square className="h-4 w-4" />}
          {activeTool === 'angle' && <Triangle className="h-4 w-4" />}
          <span className="capitalize">{activeTool} Mode</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 ml-auto hover:bg-card/20"
            onClick={() => onToolChange(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Measurements list */}
      {measurements.length > 0 && showMeasurements && (
        <div className="bg-black/60 rounded-lg p-2 backdrop-blur-sm max-h-48 overflow-y-auto">
          <div className="text-white text-xs font-medium mb-2">
            Measurements ({measurements.length})
          </div>
          <div className="space-y-1">
            {measurements.map((m) => {
              let displayValue = m.value;
              let displayUnit = m.unit;

              if (unitSystem === 'imperial') {
                if (m.type === 'distance') {
                  displayValue = m.value * METER_TO_FEET;
                  displayUnit = 'ft';
                } else if (m.type === 'area') {
                  displayValue = m.value * SQ_METER_TO_SQ_FEET;
                  displayUnit = 'ft2';
                }
              }

              return (
                <div
                  key={m.id}
                  className={cn(
                    'flex items-center justify-between px-2 py-1 rounded cursor-pointer',
                    selectedMeasurementId === m.id
                      ? 'bg-primary/50'
                      : 'hover:bg-card/10'
                  )}
                  onClick={() => setSelectedMeasurementId(m.id)}
                >
                  <div className="flex items-center gap-2 text-white">
                    {m.type === 'distance' && <Ruler className="h-3 w-3" />}
                    {m.type === 'area' && <Square className="h-3 w-3" />}
                    {m.type === 'angle' && <Triangle className="h-3 w-3" />}
                    <span className="text-xs">
                      {m.label || `${m.type} ${measurements.indexOf(m) + 1}`}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {displayValue.toFixed(2)} {displayUnit}
                  </Badge>
                </div>
              );
            })}
          </div>

          {/* Actions for selected measurement */}
          {selectedMeasurementId && (
            <div className="flex gap-1 mt-2 pt-2 border-t border-white/20">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-white hover:bg-card/20 flex-1"
                onClick={handleCopy}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-red-400 hover:bg-red-500/20 flex-1"
                onClick={handleDelete}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {activeTool && (
        <div className="text-white/60 text-xs px-2">
          {activeTool === 'distance' && 'Click two points to measure distance'}
          {activeTool === 'area' && 'Click 3+ points, then double-click to finish'}
          {activeTool === 'angle' && 'Click three points to measure angle'}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Measurement Calculation Utilities
// ============================================================================

/**
 * Calculate distance between two points
 */
export function calculateDistance(p1: Vector3D, p2: Vector3D): number {
  return Math.sqrt(
    Math.pow(p2.x - p1.x, 2) +
    Math.pow(p2.y - p1.y, 2) +
    Math.pow(p2.z - p1.z, 2)
  );
}

/**
 * Calculate area of a polygon defined by points
 */
export function calculatePolygonArea(points: Vector3D[]): number {
  if (points.length < 3) {return 0;}

  // Use Shoelace formula for 2D projection (assuming points are roughly coplanar)
  // For 3D, we'd need to project onto the best-fit plane
  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].z;
    area -= points[j].x * points[i].z;
  }

  return Math.abs(area) / 2;
}

/**
 * Calculate angle between three points (angle at middle point)
 */
export function calculateAngle(p1: Vector3D, p2: Vector3D, p3: Vector3D): number {
  const v1 = {
    x: p1.x - p2.x,
    y: p1.y - p2.y,
    z: p1.z - p2.z,
  };

  const v2 = {
    x: p3.x - p2.x,
    y: p3.y - p2.y,
    z: p3.z - p2.z,
  };

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

  const cosAngle = dot / (mag1 * mag2);
  const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

  return (angle * 180) / Math.PI;
}

/**
 * Create a new measurement from points
 */
export function createMeasurement(
  type: MeasurementType,
  points: Vector3D[]
): Measurement | null {
  if (type === 'distance' && points.length !== 2) {return null;}
  if (type === 'area' && points.length < 3) {return null;}
  if (type === 'angle' && points.length !== 3) {return null;}

  let value: number;
  let unit: string;

  switch (type) {
    case 'distance':
      value = calculateDistance(points[0], points[1]);
      unit = 'm';
      break;
    case 'area':
      value = calculatePolygonArea(points);
      unit = 'm2';
      break;
    case 'angle':
      value = calculateAngle(points[0], points[1], points[2]);
      unit = 'deg';
      break;
    default:
      return null;
  }

  return {
    id: `measurement-${Date.now()}`,
    type,
    points,
    value,
    unit,
  };
}

export default MeasurementTools;
