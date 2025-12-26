/**
 * BIMViewer Component
 *
 * Building Information Model (BIM) viewer for IFC files.
 * Features:
 * - IFC file loading and parsing
 * - Element selection and highlighting
 * - Property panel for selected elements
 * - Type filtering (walls, doors, windows, etc.)
 * - Spatial structure navigation
 * - Section planes
 * - Measurement tools
 * - Hide/Isolate elements
 */

import React, { useRef, useState, useCallback, useEffect, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  Grid,
  PerspectiveCamera,
  Html,
} from '@react-three/drei';
import {
  Loader2,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Target,
  Layers,
  ChevronRight,
  ChevronDown,
  Box,
  Upload,
  X,
  Search,
  Filter,
  Ruler,
  Scissors,
  AlertCircle,
  Building2,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  IFCLoaderService,
  getIFCTypeColor,
  formatIFCPropertyValue,
} from '../services/ifcLoader';
import type {
  IFCModel,
  IFCElement,
  IFCPropertySet,
  IFCSpatialNode,
  IFCTypeInfo,
  BIMViewerState,
} from '@/types/visualization';
import { logger } from '../../../lib/utils/logger';


// ============================================================================
// Types
// ============================================================================

interface BIMViewerProps {
  /** URL of IFC file to load */
  ifcUrl?: string;
  /** Show sidebar with properties and tree */
  showSidebar?: boolean;
  /** Enable element selection */
  enableSelection?: boolean;
  /** Container className */
  className?: string;
  /** Callback when element is selected */
  onElementSelect?: (element: IFCElement | null) => void;
  /** Callback when model is loaded */
  onModelLoad?: (model: IFCModel) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

// ============================================================================
// Scene Component
// ============================================================================

interface BIMSceneProps {
  scene: THREE.Group | null;
  selectedIds: Set<number>;
  hiddenIds: Set<number>;
  highlightedId: number | null;
  onSelect: (id: number | null) => void;
}

function BIMScene({
  scene,
  selectedIds,
  hiddenIds,
  highlightedId,
  onSelect,
}: BIMSceneProps) {
  const { camera, raycaster, pointer } = useThree();
  const sceneRef = useRef<THREE.Group | null>(null);

  // Apply visibility based on hidden IDs
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child.userData.expressID !== undefined) {
          child.visible = !hiddenIds.has(child.userData.expressID);
        }
      });
    }
  }, [scene, hiddenIds]);

  // Handle click for selection
  const handleClick = useCallback(
    (event: any) => {
      if (!scene) {return;}

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const object = intersects[0].object;
        const expressID = object.userData.expressID;
        if (expressID !== undefined) {
          onSelect(expressID);
        }
      } else {
        onSelect(null);
      }
    },
    [scene, camera, raycaster, pointer, onSelect]
  );

  // Highlight effect
  useFrame(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const expressID = child.userData.expressID;
          if (expressID !== undefined) {
            // Apply highlight/selection visual feedback
            const isSelected = selectedIds.has(expressID);
            const isHighlighted = highlightedId === expressID;

            if (child.userData.originalMaterial === undefined) {
              child.userData.originalMaterial = child.material;
            }

            if (isSelected) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.8,
              });
            } else if (isHighlighted) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.8,
              });
            } else if (child.userData.originalMaterial) {
              child.material = child.userData.originalMaterial;
            }
          }
        }
      });
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[30, 30, 30]} fov={50} />
      <OrbitControls makeDefault />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[20, 30, 20]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-20, -10, -20]} intensity={0.3} />

      <Environment preset="city" background={false} />

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
      />

      {scene && (
        <primitive
          ref={sceneRef}
          object={scene}
          onClick={handleClick}
        />
      )}
    </>
  );
}

// ============================================================================
// Spatial Tree Component
// ============================================================================

interface SpatialTreeNodeProps {
  node: IFCSpatialNode;
  level: number;
  onSelect: (id: number) => void;
  selectedId: number | null;
}

function SpatialTreeNode({ node, level, onSelect, selectedId }: SpatialTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.expressID;

  const getIcon = () => {
    switch (node.type) {
      case 'IFCPROJECT':
        return <Box className="h-4 w-4" />;
      case 'IFCSITE':
        return <Building2 className="h-4 w-4" />;
      case 'IFCBUILDING':
        return <Building2 className="h-4 w-4" />;
      case 'IFCBUILDINGSTOREY':
        return <Layers className="h-4 w-4" />;
      case 'IFCSPACE':
        return <Home className="h-4 w-4" />;
      default:
        return <Box className="h-4 w-4" />;
    }
  };

  return (
    <div>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={cn(
            'flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer hover:bg-accent',
            isSelected && 'bg-accent'
          )}
          style={{ paddingLeft: `${level * 12 + 4}px` }}
          onClick={() => onSelect(node.expressID)}
        >
          {hasChildren ? (
            <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                {isOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <span className="w-4" />
          )}
          {getIcon()}
          <span className="text-sm truncate">{node.name}</span>
          {node.level !== undefined && (
            <Badge variant="secondary" className="ml-auto text-xs">
              L{node.level}
            </Badge>
          )}
        </div>
        {hasChildren && (
          <CollapsibleContent>
            {node.children.map((child) => (
              <SpatialTreeNode
                key={child.expressID}
                node={child}
                level={level + 1}
                onSelect={onSelect}
                selectedId={selectedId}
              />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

// ============================================================================
// Properties Panel Component
// ============================================================================

interface PropertiesPanelProps {
  propertySets: IFCPropertySet[];
  elementType?: string;
}

function PropertiesPanel({ propertySets, elementType }: PropertiesPanelProps) {
  if (propertySets.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Select an element to view properties
      </div>
    );
  }

  return (
    <div className="p-2">
      {elementType && (
        <div className="mb-3">
          <Badge
            variant="outline"
            style={{
              borderColor: `#${getIFCTypeColor(elementType).toString(16).padStart(6, '0')}`,
            }}
          >
            {elementType}
          </Badge>
        </div>
      )}

      {propertySets.map((pset, index) => (
        <Collapsible key={index} defaultOpen={index === 0}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-accent rounded-md">
            <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
            <span className="font-medium text-sm">{pset.name}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-6 space-y-1 py-2">
              {pset.properties.map((prop, propIndex) => (
                <div key={propIndex} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{prop.name}</span>
                  <span className="font-medium">{formatIFCPropertyValue(prop)}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

// ============================================================================
// Type Filter Component
// ============================================================================

interface TypeFilterProps {
  types: IFCTypeInfo[];
  onToggleType: (type: string) => void;
}

function TypeFilter({ types, onToggleType }: TypeFilterProps) {
  if (types.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        No element types found
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1">
      {types.map((typeInfo) => (
        <div
          key={typeInfo.type}
          className="flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer"
          onClick={() => onToggleType(typeInfo.type)}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{
                backgroundColor: typeInfo.color || `#${getIFCTypeColor(typeInfo.type).toString(16).padStart(6, '0')}`,
              }}
            />
            <span className="text-sm">{typeInfo.type.replace('IFC', '')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {typeInfo.count}
            </Badge>
            {typeInfo.visible ? (
              <Eye className="h-4 w-4 text-muted-foreground" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main BIMViewer Component
// ============================================================================

export function BIMViewer({
  ifcUrl,
  showSidebar = true,
  enableSelection = true,
  className,
  onElementSelect,
  onModelLoad,
  onError,
}: BIMViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<IFCLoaderService | null>(null);

  const [state, setState] = useState<BIMViewerState>({
    isLoading: false,
    error: null,
    progress: null,
    model: null,
    selectedElements: new Set(),
    hiddenElements: new Set(),
    hiddenTypes: new Set(),
    isolatedElements: null,
    highlightedElement: null,
    sectionPlanes: [],
    measurements: [],
  });

  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tree' | 'types' | 'properties'>('tree');
  const [spatialTree, setSpatialTree] = useState<IFCSpatialNode[]>([]);
  const [types, setTypes] = useState<IFCTypeInfo[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<IFCPropertySet[]>([]);
  const [selectedType, setSelectedType] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize loader
  useEffect(() => {
    loaderRef.current = new IFCLoaderService({
      onProgress: (progress) => {
        setState((prev) => ({ ...prev, progress }));
      },
    });

    return () => {
      loaderRef.current?.dispose();
    };
  }, []);

  // Load IFC file
  useEffect(() => {
    if (!ifcUrl || !loaderRef.current) {return;}

    const loadIFC = async () => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const result = await loaderRef.current!.loadFromUrl(ifcUrl);

        if (result.error) {
          throw new Error(result.error);
        }

        setScene(result.scene);
        setSpatialTree(loaderRef.current!.getSpatialStructure());
        setTypes(result.model.types);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          model: result.model,
        }));

        onModelLoad?.(result.model);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to load IFC');
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err.message,
        }));
        onError?.(err);
      }
    };

    loadIFC();
  }, [ifcUrl, onModelLoad, onError]);

  // Handle element selection
  const handleSelect = useCallback(
    async (expressID: number | null) => {
      if (!enableSelection) {return;}

      if (expressID === null) {
        setState((prev) => ({
          ...prev,
          selectedElements: new Set(),
          highlightedElement: null,
        }));
        setSelectedProperties([]);
        setSelectedType(undefined);
        onElementSelect?.(null);
        return;
      }

      const newSelected = new Set([expressID]);
      setState((prev) => ({
        ...prev,
        selectedElements: newSelected,
        highlightedElement: expressID,
      }));

      // Fetch properties
      if (loaderRef.current) {
        const props = await loaderRef.current.getElementProperties(expressID);
        setSelectedProperties(props);

        const element = loaderRef.current.getElement(expressID);
        setSelectedType(element?.type);
        onElementSelect?.(element || null);
      }
    },
    [enableSelection, onElementSelect]
  );

  // Handle type visibility toggle
  const handleToggleType = useCallback((type: string) => {
    setTypes((prev) =>
      prev.map((t) =>
        t.type === type ? { ...t, visible: !t.visible } : t
      )
    );

    setState((prev) => {
      const newHiddenTypes = new Set(prev.hiddenTypes);
      if (newHiddenTypes.has(type)) {
        newHiddenTypes.delete(type);
      } else {
        newHiddenTypes.add(type);
      }
      return { ...prev, hiddenTypes: newHiddenTypes };
    });
  }, []);

  // Handle tree node selection
  const handleTreeSelect = useCallback((expressID: number) => {
    handleSelect(expressID);
  }, [handleSelect]);

  // Handle file upload
  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !loaderRef.current) {return;}

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const result = await loaderRef.current.loadFromFile(file);

        if (result.error) {
          throw new Error(result.error);
        }

        setScene(result.scene);
        setSpatialTree(loaderRef.current.getSpatialStructure());
        setTypes(result.model.types);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          model: result.model,
        }));

        onModelLoad?.(result.model);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to load IFC');
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err.message,
        }));
        onError?.(err);
      }

      // Reset input
      event.target.value = '';
    },
    [onModelLoad, onError]
  );

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

  // Error state
  if (state.error && !state.model) {
    return (
      <div
        className={cn(
          'relative w-full h-full min-h-[500px] bg-background flex flex-col items-center justify-center text-white rounded-lg',
          className
        )}
      >
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <p className="text-lg font-medium mb-2">Failed to Load BIM Model</p>
        <p className="text-sm text-disabled max-w-md text-center">{state.error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex w-full h-full min-h-[500px] bg-background rounded-lg overflow-hidden',
        isFullscreen && 'rounded-none',
        className
      )}
    >
      {/* Main 3D View */}
      <div className="flex-1 relative">
        <Canvas
          shadows
          gl={{
            antialias: true,
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance',
          }}
          dpr={[1, 2]}
        >
          <Suspense
            fallback={
              <Html center>
                <div className="flex flex-col items-center justify-center bg-black/80 rounded-lg p-6 text-white">
                  <Loader2 className="h-10 w-10 animate-spin mb-4" />
                  <p className="text-sm">Loading BIM model...</p>
                  {state.progress && (
                    <p className="text-xs text-disabled mt-1">
                      {state.progress.stage} - {state.progress.percentage}%
                    </p>
                  )}
                </div>
              </Html>
            }
          >
            <BIMScene
              scene={scene}
              selectedIds={state.selectedElements}
              hiddenIds={state.hiddenElements}
              highlightedId={state.highlightedElement}
              onSelect={handleSelect}
            />
          </Suspense>
        </Canvas>

        {/* Loading overlay */}
        {state.isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <Loader2 className="h-10 w-10 text-white animate-spin mb-4" />
            <p className="text-white text-sm">Loading BIM model...</p>
            {state.progress && (
              <p className="text-disabled text-xs mt-1">
                {state.progress.stage} - {state.progress.percentage}%
              </p>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="absolute top-4 left-4 flex gap-2">
          <label>
            <input
              type="file"
              accept=".ifc"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button variant="secondary" size="sm" asChild className="cursor-pointer">
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Load IFC
              </span>
            </Button>
          </label>
        </div>

        {/* Controls */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={handleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* BIM badge */}
        <div className="absolute top-4 right-4 px-2 py-1 bg-black/60 rounded text-white text-xs font-medium backdrop-blur-sm">
          BIM Viewer
        </div>

        {/* No model placeholder */}
        {!ifcUrl && !state.model && !state.isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 pointer-events-none">
            <Building2 className="h-16 w-16 mb-4" />
            <p className="text-lg font-medium">No BIM model loaded</p>
            <p className="text-sm">Upload an IFC file to view</p>
          </div>
        )}
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-background border-l flex flex-col">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium',
                activeTab === 'tree' && 'border-b-2 border-primary'
              )}
              onClick={() => setActiveTab('tree')}
            >
              Structure
            </button>
            <button
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium',
                activeTab === 'types' && 'border-b-2 border-primary'
              )}
              onClick={() => setActiveTab('types')}
            >
              Types
            </button>
            <button
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium',
                activeTab === 'properties' && 'border-b-2 border-primary'
              )}
              onClick={() => setActiveTab('properties')}
            >
              Properties
            </button>
          </div>

          {/* Search */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            {activeTab === 'tree' && (
              <div className="p-2">
                {spatialTree.map((node) => (
                  <SpatialTreeNode
                    key={node.expressID}
                    node={node}
                    level={0}
                    onSelect={handleTreeSelect}
                    selectedId={
                      state.selectedElements.size === 1
                        ? Array.from(state.selectedElements)[0]
                        : null
                    }
                  />
                ))}
              </div>
            )}

            {activeTab === 'types' && (
              <TypeFilter types={types} onToggleType={handleToggleType} />
            )}

            {activeTab === 'properties' && (
              <PropertiesPanel
                propertySets={selectedProperties}
                elementType={selectedType}
              />
            )}
          </ScrollArea>

          {/* Model info */}
          {state.model && (
            <div className="p-3 border-t text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Schema:</span>
                <span>{state.model.metadata.schema}</span>
              </div>
              <div className="flex justify-between">
                <span>Elements:</span>
                <span>{state.model.elements.size}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BIMViewer;
