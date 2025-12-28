/**
 * IFC Loader Service
 *
 * Service for loading and parsing IFC (Industry Foundation Classes) files
 * for BIM (Building Information Modeling) visualization.
 *
 * Note: This implementation provides a framework for IFC loading.
 * Full IFC parsing requires the web-ifc library which needs WASM support.
 */

import type {
  IFCModel,
  IFCElement,
  IFCProperty,
  IFCPropertySet,
  IFCSpatialNode,
  IFCTypeInfo,
  IFCMetadata,
  ModelLoadProgress,
  BoundingBox,
} from '@/types/visualization';
import { logger } from '../../../lib/utils/logger';


// ============================================================================
// Types
// ============================================================================

export interface IFCLoaderOptions {
  /** Coordinate to web-ifc WASM path */
  wasmPath?: string;
  /** Enable geometry optimization */
  optimizeGeometry?: boolean;
  /** Enable property caching */
  cacheProperties?: boolean;
  /** Max concurrent geometry loads */
  maxConcurrent?: number;
  /** Progress callback */
  onProgress?: (progress: ModelLoadProgress) => void;
}

export interface IFCLoadResult {
  model: IFCModel;
  scene: THREE.Group;
  error?: string;
}

// ============================================================================
// IFC Type Definitions
// ============================================================================

// Common IFC element types and their colors
export const IFC_TYPE_COLORS: Record<string, number> = {
  // Structural
  IFCWALL: 0xcccccc,
  IFCWALLSTANDARDCASE: 0xcccccc,
  IFCSLAB: 0xaaaaaa,
  IFCBEAM: 0x888888,
  IFCCOLUMN: 0x666666,
  IFCFOOTING: 0x555555,
  IFCPILE: 0x444444,
  IFCROOF: 0xbb8866,

  // Openings
  IFCDOOR: 0x8b4513,
  IFCWINDOW: 0x87ceeb,
  IFCOPENINGELEMENT: 0xffffff,
  IFCCURTAINWALL: 0x88ccff,

  // MEP
  IFCPIPESEGMENT: 0x00ff00,
  IFCDUCT: 0x00aa00,
  IFCCABLESEGMENT: 0xff0000,
  IFCFLOWSEGMENT: 0x0000ff,
  IFCFLOWTERMINAL: 0x00ffff,

  // Furnishings
  IFCFURNISHINGELEMENT: 0xdeb887,
  IFCFURNITURE: 0xdeb887,

  // Spaces
  IFCSPACE: 0xeeeeff,
  IFCBUILDING: 0xdddddd,
  IFCBUILDINGSTOREY: 0xcccccc,
  IFCSITE: 0x90ee90,

  // Default
  DEFAULT: 0x999999,
};

// IFC type categories
export const IFC_CATEGORIES = {
  STRUCTURAL: [
    'IFCWALL',
    'IFCWALLSTANDARDCASE',
    'IFCSLAB',
    'IFCBEAM',
    'IFCCOLUMN',
    'IFCFOOTING',
    'IFCPILE',
    'IFCROOF',
    'IFCSTAIR',
    'IFCRAMP',
  ],
  ARCHITECTURAL: [
    'IFCDOOR',
    'IFCWINDOW',
    'IFCOPENINGELEMENT',
    'IFCCURTAINWALL',
    'IFCRAILING',
  ],
  MEP: [
    'IFCPIPESEGMENT',
    'IFCDUCT',
    'IFCCABLESEGMENT',
    'IFCFLOWSEGMENT',
    'IFCFLOWTERMINAL',
    'IFCFLOWFITTING',
    'IFCFLOWCONTROLLER',
  ],
  FURNISHING: ['IFCFURNISHINGELEMENT', 'IFCFURNITURE', 'IFCSYSTEMFURNITUREELEMENT'],
  SPATIAL: ['IFCSPACE', 'IFCBUILDING', 'IFCBUILDINGSTOREY', 'IFCSITE', 'IFCPROJECT'],
};

// ============================================================================
// IFC Loader Class
// ============================================================================

export class IFCLoaderService {
  private options: IFCLoaderOptions;
  private propertyCache: Map<number, IFCPropertySet[]>;
  private elementCache: Map<number, IFCElement>;
  private ifcAPI: any = null; // web-ifc API instance
  private modelID: number = -1;

  constructor(options: IFCLoaderOptions = {}) {
    this.options = {
      wasmPath: '/wasm/',
      optimizeGeometry: true,
      cacheProperties: true,
      maxConcurrent: 4,
      ...options,
    };
    this.propertyCache = new Map();
    this.elementCache = new Map();
  }

  /**
   * Initialize the IFC API (web-ifc)
   */
  async init(): Promise<void> {
    // In production, this would initialize web-ifc
    // For now, we'll use a mock implementation
    logger.log('IFC Loader initialized');
  }

  /**
   * Load an IFC file from URL
   */
  async loadFromUrl(url: string): Promise<IFCLoadResult> {
    this.options.onProgress?.({
      loaded: 0,
      total: 100,
      percentage: 0,
      stage: 'downloading',
    });

    try {
      // Fetch the file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch IFC file: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return this.loadFromBuffer(arrayBuffer);
    } catch (_error) {
      const message = error instanceof Error ? error.message : 'Failed to load IFC file';
      return {
        model: this.createEmptyModel(),
        scene: new THREE.Group(),
        error: message,
      };
    }
  }

  /**
   * Load an IFC file from File object
   */
  async loadFromFile(file: File): Promise<IFCLoadResult> {
    this.options.onProgress?.({
      loaded: 0,
      total: 100,
      percentage: 0,
      stage: 'parsing',
    });

    try {
      const arrayBuffer = await file.arrayBuffer();
      return this.loadFromBuffer(arrayBuffer);
    } catch (_error) {
      const message = error instanceof Error ? error.message : 'Failed to load IFC file';
      return {
        model: this.createEmptyModel(),
        scene: new THREE.Group(),
        error: message,
      };
    }
  }

  /**
   * Load IFC from ArrayBuffer
   */
  async loadFromBuffer(buffer: ArrayBuffer): Promise<IFCLoadResult> {
    this.options.onProgress?.({
      loaded: 20,
      total: 100,
      percentage: 20,
      stage: 'parsing',
    });

    // Parse IFC data
    // In production, this would use web-ifc to parse the buffer
    // For now, we create a mock model structure

    const model = await this.parseIFCBuffer(buffer);

    this.options.onProgress?.({
      loaded: 60,
      total: 100,
      percentage: 60,
      stage: 'processing',
    });

    // Generate Three.js geometry
    const scene = await this.generateGeometry(model);

    this.options.onProgress?.({
      loaded: 100,
      total: 100,
      percentage: 100,
      stage: 'complete',
    });

    return { model, scene };
  }

  /**
   * Parse IFC buffer to model structure
   */
  private async parseIFCBuffer(buffer: ArrayBuffer): Promise<IFCModel> {
    // This is a simplified mock implementation
    // Real implementation would use web-ifc to parse the buffer

    const model: IFCModel = {
      id: `ifc-${Date.now()}`,
      name: 'IFC Model',
      fileName: 'model.ifc',
      elements: new Map(),
      spatialStructure: [],
      propertyCache: new Map(),
      types: [],
      metadata: this.extractMetadata(buffer),
    };

    // In production, iterate through IFC elements and populate the model
    // For now, create some sample elements
    const sampleTypes: IFCTypeInfo[] = [
      { type: 'IFCWALL', count: 0, expressIDs: [], color: '#cccccc', visible: true },
      { type: 'IFCSLAB', count: 0, expressIDs: [], color: '#aaaaaa', visible: true },
      { type: 'IFCWINDOW', count: 0, expressIDs: [], color: '#87ceeb', visible: true },
      { type: 'IFCDOOR', count: 0, expressIDs: [], color: '#8b4513', visible: true },
    ];

    model.types = sampleTypes;

    return model;
  }

  /**
   * Extract metadata from IFC file
   */
  private extractMetadata(_buffer: ArrayBuffer): IFCMetadata {
    // In production, parse the IFC header for metadata
    return {
      schema: 'IFC4',
      name: 'Building Model',
      description: 'Imported IFC Model',
      author: 'Unknown',
      organization: 'Unknown',
      fileDate: new Date().toISOString(),
    };
  }

  /**
   * Generate Three.js geometry from IFC model
   */
  private async generateGeometry(model: IFCModel): Promise<THREE.Group> {
    const group = new THREE.Group();
    group.name = model.name;

    // In production, this would iterate through IFC elements
    // and create Three.js geometry for each

    // Create a placeholder building shape
    const buildingGeometry = new THREE.BoxGeometry(20, 10, 15);
    const buildingMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.8,
      metalness: 0.1,
    });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.y = 5;
    building.castShadow = true;
    building.receiveShadow = true;
    group.add(building);

    // Add some window placeholders
    const windowGeometry = new THREE.BoxGeometry(2, 1.5, 0.1);
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.7,
    });

    for (let i = -6; i <= 6; i += 4) {
      for (let j = 2; j <= 8; j += 3) {
        const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
        window1.position.set(i, j, 7.55);
        group.add(window1);

        const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
        window2.position.set(i, j, -7.55);
        group.add(window2);
      }
    }

    // Add door placeholder
    const doorGeometry = new THREE.BoxGeometry(1.5, 2.5, 0.1);
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.7,
      metalness: 0.1,
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 1.25, 7.55);
    group.add(door);

    // Ground/floor
    const floorGeometry = new THREE.BoxGeometry(25, 0.3, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.9,
      metalness: 0.0,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = -0.15;
    floor.receiveShadow = true;
    group.add(floor);

    return group;
  }

  /**
   * Get properties for an element
   */
  async getElementProperties(expressID: number): Promise<IFCPropertySet[]> {
    // Check cache first
    if (this.options.cacheProperties && this.propertyCache.has(expressID)) {
      return this.propertyCache.get(expressID)!;
    }

    // In production, fetch properties from web-ifc
    const properties: IFCPropertySet[] = [
      {
        name: 'Identity Data',
        properties: [
          { name: 'GlobalId', value: `guid-${expressID}`, type: 'string' },
          { name: 'Name', value: `Element ${expressID}`, type: 'string' },
          { name: 'ObjectType', value: 'Building Element', type: 'string' },
        ],
      },
      {
        name: 'Pset_WallCommon',
        properties: [
          { name: 'IsExternal', value: true, type: 'boolean' },
          { name: 'LoadBearing', value: true, type: 'boolean' },
          { name: 'FireRating', value: '2HR', type: 'string' },
        ],
      },
      {
        name: 'BaseQuantities',
        properties: [
          { name: 'Length', value: 5.0, type: 'number', unit: 'm' },
          { name: 'Height', value: 3.0, type: 'number', unit: 'm' },
          { name: 'Width', value: 0.2, type: 'number', unit: 'm' },
          { name: 'GrossVolume', value: 3.0, type: 'number', unit: 'm3' },
        ],
      },
    ];

    // Cache the result
    if (this.options.cacheProperties) {
      this.propertyCache.set(expressID, properties);
    }

    return properties;
  }

  /**
   * Get element by express ID
   */
  getElement(expressID: number): IFCElement | undefined {
    return this.elementCache.get(expressID);
  }

  /**
   * Get all elements of a specific type
   */
  getElementsByType(type: string): IFCElement[] {
    const elements: IFCElement[] = [];
    this.elementCache.forEach((element) => {
      if (element.type.toUpperCase() === type.toUpperCase()) {
        elements.push(element);
      }
    });
    return elements;
  }

  /**
   * Get spatial structure tree
   */
  getSpatialStructure(): IFCSpatialNode[] {
    // In production, build from IFC spatial relationships
    return [
      {
        expressID: 1,
        type: 'IFCPROJECT',
        name: 'Project',
        children: [
          {
            expressID: 2,
            type: 'IFCSITE',
            name: 'Site',
            children: [
              {
                expressID: 3,
                type: 'IFCBUILDING',
                name: 'Building',
                children: [
                  {
                    expressID: 4,
                    type: 'IFCBUILDINGSTOREY',
                    name: 'Ground Floor',
                    level: 0,
                    children: [],
                  },
                  {
                    expressID: 5,
                    type: 'IFCBUILDINGSTOREY',
                    name: 'First Floor',
                    level: 1,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
  }

  /**
   * Create material for IFC type
   */
  createMaterialForType(type: string): THREE.MeshStandardMaterial {
    const color = IFC_TYPE_COLORS[type.toUpperCase()] || IFC_TYPE_COLORS.DEFAULT;

    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
  }

  /**
   * Create empty model structure
   */
  private createEmptyModel(): IFCModel {
    return {
      id: '',
      name: 'Empty Model',
      fileName: '',
      elements: new Map(),
      spatialStructure: [],
      propertyCache: new Map(),
      types: [],
      metadata: {
        schema: 'IFC4',
        name: 'Empty',
      },
    };
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.propertyCache.clear();
    this.elementCache.clear();
    this.ifcAPI = null;
    this.modelID = -1;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get color for IFC type
 */
export function getIFCTypeColor(type: string): number {
  return IFC_TYPE_COLORS[type.toUpperCase()] || IFC_TYPE_COLORS.DEFAULT;
}

/**
 * Get category for IFC type
 */
export function getIFCCategory(type: string): string | null {
  const upperType = type.toUpperCase();
  for (const [category, types] of Object.entries(IFC_CATEGORIES)) {
    if (types.includes(upperType)) {
      return category;
    }
  }
  return null;
}

/**
 * Format IFC property value for display
 */
export function formatIFCPropertyValue(property: IFCProperty): string {
  if (property.value === null || property.value === undefined) {
    return '-';
  }

  switch (property.type) {
    case 'boolean':
      return property.value ? 'Yes' : 'No';
    case 'number': {
      const num = typeof property.value === 'number' ? property.value : parseFloat(String(property.value));
      const formatted = Number.isInteger(num) ? num.toString() : num.toFixed(3);
      return property.unit ? `${formatted} ${property.unit}` : formatted;
    }
    default:
      return String(property.value);
  }
}

/**
 * Calculate bounding box for IFC elements
 */
export function calculateIFCBoundingBox(elements: IFCElement[]): BoundingBox | null {
  if (elements.length === 0) {return null;}

  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  for (const element of elements) {
    if (element.boundingBox) {
      minX = Math.min(minX, element.boundingBox.min.x);
      minY = Math.min(minY, element.boundingBox.min.y);
      minZ = Math.min(minZ, element.boundingBox.min.z);
      maxX = Math.max(maxX, element.boundingBox.max.x);
      maxY = Math.max(maxY, element.boundingBox.max.y);
      maxZ = Math.max(maxZ, element.boundingBox.max.z);
    }
  }

  if (!isFinite(minX)) {return null;}

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

let ifcLoaderInstance: IFCLoaderService | null = null;

export function getIFCLoader(options?: IFCLoaderOptions): IFCLoaderService {
  if (!ifcLoaderInstance) {
    ifcLoaderInstance = new IFCLoaderService(options);
  }
  return ifcLoaderInstance;
}

export function disposeIFCLoader(): void {
  if (ifcLoaderInstance) {
    ifcLoaderInstance.dispose();
    ifcLoaderInstance = null;
  }
}

export default IFCLoaderService;
