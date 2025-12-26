/**
 * Three.js Lazy Loader
 *
 * Dynamically imports Three.js library only when needed for 3D visualization features.
 * This reduces the main bundle size by ~600KB+ and improves initial page load performance.
 *
 * Usage:
 * ```typescript
 * import { loadThree, loadGLTFLoader } from '@/features/visualization/utils/threeLoader'
 *
 * const THREE = await loadThree()
 * const scene = new THREE.Scene()
 * ```
 */

type ThreeModule = typeof import('three')
type GLTFLoaderModule = typeof import('three/examples/jsm/loaders/GLTFLoader.js')
type DRACOLoaderModule = typeof import('three/examples/jsm/loaders/DRACOLoader.js')
type OBJLoaderModule = typeof import('three/examples/jsm/loaders/OBJLoader.js')
type FBXLoaderModule = typeof import('three/examples/jsm/loaders/FBXLoader.js')
type MTLLoaderModule = typeof import('three/examples/jsm/loaders/MTLLoader.js')
type OrbitControlsModule = typeof import('three/examples/jsm/controls/OrbitControls.js')

// Singleton caches for loaded modules
let threeCache: ThreeModule | null = null
let gltfLoaderCache: GLTFLoaderModule | null = null
let dracoLoaderCache: DRACOLoaderModule | null = null
let objLoaderCache: OBJLoaderModule | null = null
let fbxLoaderCache: FBXLoaderModule | null = null
let mtlLoaderCache: MTLLoaderModule | null = null
let orbitControlsCache: OrbitControlsModule | null = null

/**
 * Load the main Three.js library
 * Cached after first load to avoid redundant imports
 */
export async function loadThree(): Promise<ThreeModule> {
  if (!threeCache) {
    threeCache = await import('three')
  }
  return threeCache
}

/**
 * Load GLTF loader for loading .gltf and .glb 3D models
 */
export async function loadGLTFLoader(): Promise<GLTFLoaderModule> {
  if (!gltfLoaderCache) {
    gltfLoaderCache = await import('three/examples/jsm/loaders/GLTFLoader.js')
  }
  return gltfLoaderCache
}

/**
 * Load DRACO loader for compressed geometry
 * Used with GLTF models that have Draco compression
 */
export async function loadDRACOLoader(): Promise<DRACOLoaderModule> {
  if (!dracoLoaderCache) {
    dracoLoaderCache = await import('three/examples/jsm/loaders/DRACOLoader.js')
  }
  return dracoLoaderCache
}

/**
 * Load OBJ loader for loading .obj 3D models
 */
export async function loadOBJLoader(): Promise<OBJLoaderModule> {
  if (!objLoaderCache) {
    objLoaderCache = await import('three/examples/jsm/loaders/OBJLoader.js')
  }
  return objLoaderCache
}

/**
 * Load FBX loader for loading .fbx 3D models
 */
export async function loadFBXLoader(): Promise<FBXLoaderModule> {
  if (!fbxLoaderCache) {
    fbxLoaderCache = await import('three/examples/jsm/loaders/FBXLoader.js')
  }
  return fbxLoaderCache
}

/**
 * Load MTL loader for loading .mtl material files (used with OBJ)
 */
export async function loadMTLLoader(): Promise<MTLLoaderModule> {
  if (!mtlLoaderCache) {
    mtlLoaderCache = await import('three/examples/jsm/loaders/MTLLoader.js')
  }
  return mtlLoaderCache
}

/**
 * Load OrbitControls for camera control
 */
export async function loadOrbitControls(): Promise<OrbitControlsModule> {
  if (!orbitControlsCache) {
    orbitControlsCache = await import('three/examples/jsm/controls/OrbitControls.js')
  }
  return orbitControlsCache
}

/**
 * Preload all commonly used Three.js modules
 * Useful for preloading when entering 3D visualization sections
 */
export async function preloadThreeModules(): Promise<void> {
  await Promise.all([
    loadThree(),
    loadGLTFLoader(),
    loadDRACOLoader(),
    loadOrbitControls(),
  ])
}

/**
 * Clear all caches (useful for testing or memory management)
 */
export function clearThreeCache(): void {
  threeCache = null
  gltfLoaderCache = null
  dracoLoaderCache = null
  objLoaderCache = null
  fbxLoaderCache = null
  mtlLoaderCache = null
  orbitControlsCache = null
}
