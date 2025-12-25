/**
 * 3D Model Processing Utilities
 *
 * Functions for optimizing, processing, and transforming 3D models
 * for efficient rendering in web-based viewers.
 */

import * as THREE from 'three';
import type {
  ModelOptimizationOptions,
  LODLevel,
  BoundingBox,
  Vector3D,
  PerformanceMetrics,
} from '@/types/visualization';

// ============================================================================
// Model Analysis
// ============================================================================

/**
 * Analyze a 3D model and return its statistics
 */
export function analyzeModel(object: THREE.Object3D): {
  triangleCount: number;
  vertexCount: number;
  materialCount: number;
  textureCount: number;
  boundingBox: BoundingBox;
  center: Vector3D;
  size: Vector3D;
} {
  let triangleCount = 0;
  let vertexCount = 0;
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geometry = child.geometry;
      if (geometry.index) {
        triangleCount += geometry.index.count / 3;
      } else if (geometry.attributes.position) {
        triangleCount += geometry.attributes.position.count / 3;
      }
      if (geometry.attributes.position) {
        vertexCount += geometry.attributes.position.count;
      }

      // Collect materials
      const meshMaterials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      meshMaterials.forEach((mat) => {
        materials.add(mat);
        // Collect textures from material
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (mat.map) {textures.add(mat.map);}
          if (mat.normalMap) {textures.add(mat.normalMap);}
          if (mat.roughnessMap) {textures.add(mat.roughnessMap);}
          if (mat.metalnessMap) {textures.add(mat.metalnessMap);}
          if (mat.aoMap) {textures.add(mat.aoMap);}
          if (mat.emissiveMap) {textures.add(mat.emissiveMap);}
        }
      });
    }
  });

  // Calculate bounding box
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  return {
    triangleCount,
    vertexCount,
    materialCount: materials.size,
    textureCount: textures.size,
    boundingBox: {
      min: { x: box.min.x, y: box.min.y, z: box.min.z },
      max: { x: box.max.x, y: box.max.y, z: box.max.z },
    },
    center: { x: center.x, y: center.y, z: center.z },
    size: { x: size.x, y: size.y, z: size.z },
  };
}

// ============================================================================
// Model Optimization
// ============================================================================

/**
 * Optimize a 3D model for web rendering
 */
export function optimizeModel(
  object: THREE.Object3D,
  options: ModelOptimizationOptions = {}
): THREE.Object3D {
  const {
    mergeGeometries = true,
    simplifyMaterials = true,
    centerModel = true,
    normalizeScale = true,
    targetScale = 10,
    removeHiddenGeometry = true,
  } = options;

  // Clone to avoid modifying original
  const optimized = object.clone(true);

  // Center the model
  if (centerModel) {
    centerModelAtOrigin(optimized);
  }

  // Normalize scale
  if (normalizeScale) {
    normalizeModelScale(optimized, targetScale);
  }

  // Remove hidden/invisible geometry
  if (removeHiddenGeometry) {
    removeInvisibleObjects(optimized);
  }

  // Merge geometries where possible
  if (mergeGeometries) {
    mergeModelGeometries(optimized);
  }

  // Simplify materials
  if (simplifyMaterials) {
    simplifyModelMaterials(optimized);
  }

  // Update matrix
  optimized.updateMatrixWorld(true);

  return optimized;
}

/**
 * Center model at origin
 */
export function centerModelAtOrigin(object: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  box.getCenter(center);

  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.position.sub(center);
    }
  });
}

/**
 * Normalize model scale to fit within target size
 */
export function normalizeModelScale(
  object: THREE.Object3D,
  targetSize: number = 10
): void {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);

  const maxDimension = Math.max(size.x, size.y, size.z);
  if (maxDimension > 0) {
    const scale = targetSize / maxDimension;
    object.scale.multiplyScalar(scale);
  }
}

/**
 * Remove invisible objects from the scene
 */
export function removeInvisibleObjects(object: THREE.Object3D): void {
  const toRemove: THREE.Object3D[] = [];

  object.traverse((child) => {
    if (!child.visible || (child instanceof THREE.Mesh && !child.geometry)) {
      toRemove.push(child);
    }
  });

  toRemove.forEach((obj) => {
    obj.parent?.remove(obj);
  });
}

/**
 * Merge geometries with the same material
 */
export function mergeModelGeometries(object: THREE.Object3D): void {
  // Group meshes by material
  const meshesByMaterial = new Map<THREE.Material, THREE.Mesh[]>();

  object.traverse((child) => {
    if (child instanceof THREE.Mesh && !Array.isArray(child.material)) {
      const existing = meshesByMaterial.get(child.material) || [];
      existing.push(child);
      meshesByMaterial.set(child.material, existing);
    }
  });

  // Merge groups with more than one mesh
  meshesByMaterial.forEach((meshes, material) => {
    if (meshes.length > 1 && meshes.length < 100) {
      // Limit to prevent huge merges
      try {
        const geometries = meshes.map((mesh) => {
          const geometry = mesh.geometry.clone();
          mesh.updateMatrixWorld();
          geometry.applyMatrix4(mesh.matrixWorld);
          return geometry;
        });

        // Use BufferGeometryUtils for merging if available
        // For now, skip actual merging as it requires the utils import
        // This is a placeholder for the merge operation
      } catch (error) {
        console.warn('Failed to merge geometries:', error);
      }
    }
  });
}

/**
 * Simplify materials to basic PBR
 */
export function simplifyModelMaterials(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      materials.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          // Reduce texture resolution if needed
          if (mat.map && mat.map.image) {
            const img = mat.map.image;
            if (img.width > 2048 || img.height > 2048) {
              mat.map.minFilter = THREE.LinearFilter;
              mat.map.generateMipmaps = false;
            }
          }
          // Disable expensive features if not needed
          mat.flatShading = false;
        }
      });
    }
  });
}

// ============================================================================
// LOD Generation
// ============================================================================

/**
 * Generate LOD levels for a model
 */
export function generateLODLevels(
  object: THREE.Object3D,
  levels: number[] = [0, 50, 100, 200]
): LODLevel[] {
  const lodLevels: LODLevel[] = [];
  const stats = analyzeModel(object);

  // Level 0: Original
  lodLevels.push({
    distance: levels[0],
    object: object.clone(true),
    triangleCount: stats.triangleCount,
  });

  // Generate simplified versions
  for (let i = 1; i < levels.length; i++) {
    const ratio = 1 - i * 0.25; // 75%, 50%, 25% of original
    const simplified = simplifyGeometry(object.clone(true), ratio);
    const simplifiedStats = analyzeModel(simplified);

    lodLevels.push({
      distance: levels[i],
      object: simplified,
      triangleCount: simplifiedStats.triangleCount,
    });
  }

  return lodLevels;
}

/**
 * Simplify geometry by reducing vertices
 */
function simplifyGeometry(object: THREE.Object3D, ratio: number): THREE.Object3D {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geometry = child.geometry;
      // Basic simplification: skip every nth vertex
      // In production, use a proper simplification algorithm
      if (geometry.index && ratio < 1) {
        const indices = geometry.index.array;
        const newIndices = [];
        const step = Math.ceil(1 / ratio);

        for (let i = 0; i < indices.length; i += step * 3) {
          if (i + 2 < indices.length) {
            newIndices.push(indices[i], indices[i + 1], indices[i + 2]);
          }
        }

        geometry.setIndex(newIndices);
      }
    }
  });

  return object;
}

/**
 * Create a THREE.LOD object from LOD levels
 */
export function createLODObject(levels: LODLevel[]): THREE.LOD {
  const lod = new THREE.LOD();

  levels.forEach((level) => {
    lod.addLevel(level.object, level.distance);
  });

  return lod;
}

// ============================================================================
// Texture Optimization
// ============================================================================

/**
 * Compress/resize textures for mobile performance
 */
export async function optimizeTextures(
  object: THREE.Object3D,
  maxSize: number = 1024
): Promise<void> {
  const textures = new Set<THREE.Texture>();

  // Collect all textures
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      materials.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (mat.map) {textures.add(mat.map);}
          if (mat.normalMap) {textures.add(mat.normalMap);}
          if (mat.roughnessMap) {textures.add(mat.roughnessMap);}
          if (mat.metalnessMap) {textures.add(mat.metalnessMap);}
        }
      });
    }
  });

  // Resize textures
  for (const texture of textures) {
    if (texture.image && (texture.image.width > maxSize || texture.image.height > maxSize)) {
      await resizeTexture(texture, maxSize);
    }
  }
}

/**
 * Resize a single texture
 */
async function resizeTexture(
  texture: THREE.Texture,
  maxSize: number
): Promise<void> {
  const image = texture.image;
  if (!image) {return;}

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {return;}

  // Calculate new dimensions
  let width = image.width;
  let height = image.height;

  if (width > maxSize || height > maxSize) {
    if (width > height) {
      height = (height / width) * maxSize;
      width = maxSize;
    } else {
      width = (width / height) * maxSize;
      height = maxSize;
    }
  }

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(image, 0, 0, width, height);
  texture.image = canvas;
  texture.needsUpdate = true;
}

// ============================================================================
// Performance Monitoring
// ============================================================================

/**
 * Create a performance monitor for the renderer
 */
export function createPerformanceMonitor(
  renderer: THREE.WebGLRenderer
): {
  update: () => void;
  getMetrics: () => PerformanceMetrics;
  reset: () => void;
} {
  let frameCount = 0;
  let lastTime = performance.now();
  let fps = 60;
  let frameTime = 16.67;

  return {
    update() {
      frameCount++;
      const now = performance.now();
      const delta = now - lastTime;

      if (delta >= 1000) {
        fps = (frameCount * 1000) / delta;
        frameTime = delta / frameCount;
        frameCount = 0;
        lastTime = now;
      }
    },

    getMetrics(): PerformanceMetrics {
      const info = renderer.info;
      return {
        fps: Math.round(fps),
        frameTime: Math.round(frameTime * 100) / 100,
        triangleCount: info.render.triangles,
        drawCalls: info.render.calls,
        textureMemory: info.memory.textures,
        geometryMemory: info.memory.geometries,
        totalMemory: info.memory.textures + info.memory.geometries,
      };
    },

    reset() {
      frameCount = 0;
      lastTime = performance.now();
      fps = 60;
      frameTime = 16.67;
    },
  };
}

// ============================================================================
// Material Utilities
// ============================================================================

/**
 * Create a standard construction material
 */
export function createConstructionMaterial(
  type: 'concrete' | 'steel' | 'wood' | 'glass' | 'brick' | 'default'
): THREE.MeshStandardMaterial {
  const materials: Record<string, THREE.MeshStandardMaterialParameters> = {
    concrete: {
      color: 0x808080,
      roughness: 0.9,
      metalness: 0.0,
    },
    steel: {
      color: 0x8899aa,
      roughness: 0.3,
      metalness: 0.9,
    },
    wood: {
      color: 0x8b4513,
      roughness: 0.8,
      metalness: 0.0,
    },
    glass: {
      color: 0x88ccff,
      roughness: 0.1,
      metalness: 0.0,
      transparent: true,
      opacity: 0.3,
    },
    brick: {
      color: 0x8b4513,
      roughness: 0.85,
      metalness: 0.0,
    },
    default: {
      color: 0xcccccc,
      roughness: 0.5,
      metalness: 0.0,
    },
  };

  return new THREE.MeshStandardMaterial(materials[type] || materials.default);
}

/**
 * Create a highlight material for selection
 */
export function createHighlightMaterial(
  color: number = 0x00ff00,
  opacity: number = 0.5
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: false,
  });
}

/**
 * Create a wireframe material
 */
export function createWireframeMaterial(
  color: number = 0x000000
): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color,
    linewidth: 1,
  });
}

// ============================================================================
// Geometry Utilities
// ============================================================================

/**
 * Create a floor grid
 */
export function createFloorGrid(
  size: number = 100,
  divisions: number = 100,
  color1: number = 0x444444,
  color2: number = 0x888888
): THREE.GridHelper {
  return new THREE.GridHelper(size, divisions, color1, color2);
}

/**
 * Create axes helper
 */
export function createAxesHelper(size: number = 5): THREE.AxesHelper {
  return new THREE.AxesHelper(size);
}

/**
 * Create a bounding box helper
 */
export function createBoundingBoxHelper(
  object: THREE.Object3D,
  color: number = 0xffff00
): THREE.BoxHelper {
  return new THREE.BoxHelper(object, color);
}

// ============================================================================
// Coordinate Conversion
// ============================================================================

/**
 * Convert screen coordinates to world coordinates
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  camera: THREE.Camera,
  targetZ: number = 0
): Vector3D {
  const vector = new THREE.Vector3(screenX, screenY, 0.5);
  vector.unproject(camera);

  if (camera instanceof THREE.PerspectiveCamera) {
    const dir = vector.sub(camera.position).normalize();
    const distance = (targetZ - camera.position.z) / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));
    return { x: pos.x, y: pos.y, z: pos.z };
  }

  return { x: vector.x, y: vector.y, z: targetZ };
}

/**
 * Convert world coordinates to screen coordinates
 */
export function worldToScreen(
  worldPos: Vector3D,
  camera: THREE.Camera,
  width: number,
  height: number
): { x: number; y: number } {
  const vector = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
  vector.project(camera);

  return {
    x: ((vector.x + 1) / 2) * width,
    y: ((-vector.y + 1) / 2) * height,
  };
}

// ============================================================================
// Raycasting Utilities
// ============================================================================

/**
 * Perform raycast from screen position
 */
export function raycastFromScreen(
  screenX: number,
  screenY: number,
  camera: THREE.Camera,
  objects: THREE.Object3D[],
  recursive: boolean = true
): THREE.Intersection[] {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(screenX, screenY);

  raycaster.setFromCamera(mouse, camera);

  return raycaster.intersectObjects(objects, recursive);
}

/**
 * Get all visible meshes in a scene
 */
export function getVisibleMeshes(scene: THREE.Scene): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];

  scene.traverse((child) => {
    if (child instanceof THREE.Mesh && child.visible) {
      meshes.push(child);
    }
  });

  return meshes;
}

// ============================================================================
// Export utilities
// ============================================================================

export const ModelProcessing = {
  analyzeModel,
  optimizeModel,
  centerModelAtOrigin,
  normalizeModelScale,
  generateLODLevels,
  createLODObject,
  optimizeTextures,
  createPerformanceMonitor,
  createConstructionMaterial,
  createHighlightMaterial,
  createWireframeMaterial,
  createFloorGrid,
  createAxesHelper,
  createBoundingBoxHelper,
  screenToWorld,
  worldToScreen,
  raycastFromScreen,
  getVisibleMeshes,
};

export default ModelProcessing;
