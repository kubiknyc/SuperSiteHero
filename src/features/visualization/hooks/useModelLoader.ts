/**
 * useModelLoader Hook
 *
 * React hook for loading 3D models (glTF/GLB, OBJ, FBX) with progress tracking,
 * error handling, and automatic optimization.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import type {
  ModelViewerState,
  ModelLoadProgress,
  ModelOptimizationOptions,
} from '@/types/visualization';
import {
  optimizeModel,
  analyzeModel,
} from '@/lib/utils/modelProcessing';

interface UseModelLoaderOptions {
  /** Auto-optimize the model after loading */
  autoOptimize?: boolean;
  /** Optimization options */
  optimizationOptions?: ModelOptimizationOptions;
  /** DRACO decoder path for compressed glTF */
  dracoDecoderPath?: string;
  /** Enable caching */
  enableCache?: boolean;
  /** Maximum texture size */
  maxTextureSize?: number;
  /** Callback when model is loaded */
  onLoad?: (model: THREE.Group) => void;
  /** Callback on progress */
  onProgress?: (progress: ModelLoadProgress) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

interface UseModelLoaderReturn extends ModelViewerState {
  loadModel: (url: string, format?: string) => Promise<THREE.Group | null>;
  unloadModel: () => void;
  getModelStats: () => ReturnType<typeof analyzeModel> | null;
  playAnimation: (name: string) => void;
  stopAnimation: () => void;
  setAnimationTime: (time: number) => void;
}

// Global cache for loaded models
const modelCache = new Map<string, THREE.Group>();

// Singleton loaders
let gltfLoader: GLTFLoader | null = null;
let objLoader: OBJLoader | null = null;
let fbxLoader: FBXLoader | null = null;
let dracoLoader: DRACOLoader | null = null;

function getGLTFLoader(dracoPath?: string): GLTFLoader {
  if (!gltfLoader) {
    gltfLoader = new GLTFLoader();

    // Initialize DRACO loader for compressed models
    if (!dracoLoader) {
      dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(dracoPath || 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      dracoLoader.setDecoderConfig({ type: 'js' });
    }
    gltfLoader.setDRACOLoader(dracoLoader);
  }
  return gltfLoader;
}

function getOBJLoader(): OBJLoader {
  if (!objLoader) {
    objLoader = new OBJLoader();
  }
  return objLoader;
}

function getFBXLoader(): FBXLoader {
  if (!fbxLoader) {
    fbxLoader = new FBXLoader();
  }
  return fbxLoader;
}

export function useModelLoader(
  options: UseModelLoaderOptions = {}
): UseModelLoaderReturn {
  const {
    autoOptimize = true,
    optimizationOptions = {},
    dracoDecoderPath,
    enableCache = true,
    maxTextureSize = 2048,
    onLoad,
    onProgress,
    onError,
  } = options;

  const [state, setState] = useState<ModelViewerState>({
    isLoading: false,
    error: null,
    progress: null,
    model: null,
    animations: [],
    boundingBox: null,
  });

  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
      }
    };
  }, []);

  // Detect format from URL
  const detectFormat = useCallback((url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase().split('?')[0];
    switch (extension) {
      case 'gltf':
      case 'glb':
        return 'gltf';
      case 'obj':
        return 'obj';
      case 'fbx':
        return 'fbx';
      default:
        return 'gltf'; // Default to glTF
    }
  }, []);

  // Update progress
  const updateProgress = useCallback(
    (loaded: number, total: number, stage: ModelLoadProgress['stage']) => {
      const progress: ModelLoadProgress = {
        loaded,
        total,
        percentage: total > 0 ? Math.round((loaded / total) * 100) : 0,
        stage,
      };
      setState((prev) => ({ ...prev, progress }));
      onProgress?.(progress);
    },
    [onProgress]
  );

  // Load glTF/GLB model
  const loadGLTF = useCallback(
    async (url: string): Promise<{ model: THREE.Group; animations: THREE.AnimationClip[] }> => {
      const loader = getGLTFLoader(dracoDecoderPath);

      return new Promise((resolve, reject) => {
        loader.load(
          url,
          (gltf: GLTF) => {
            resolve({
              model: gltf.scene,
              animations: gltf.animations || [],
            });
          },
          (progress) => {
            updateProgress(progress.loaded, progress.total, 'downloading');
          },
          (error) => {
            reject(new Error(`Failed to load glTF: ${error}`));
          }
        );
      });
    },
    [dracoDecoderPath, updateProgress]
  );

  // Load OBJ model
  const loadOBJ = useCallback(
    async (url: string, mtlUrl?: string): Promise<{ model: THREE.Group; animations: THREE.AnimationClip[] }> => {
      const loader = getOBJLoader();

      // Load MTL if provided
      if (mtlUrl) {
        const mtlLoader = new MTLLoader();
        const materials = await new Promise<MTLLoader.MaterialCreator>((resolve, reject) => {
          mtlLoader.load(
            mtlUrl,
            resolve,
            undefined,
            reject
          );
        });
        materials.preload();
        loader.setMaterials(materials);
      }

      return new Promise((resolve, reject) => {
        loader.load(
          url,
          (obj) => {
            resolve({
              model: obj as THREE.Group,
              animations: [],
            });
          },
          (progress) => {
            updateProgress(progress.loaded, progress.total, 'downloading');
          },
          (error) => {
            reject(new Error(`Failed to load OBJ: ${error}`));
          }
        );
      });
    },
    [updateProgress]
  );

  // Load FBX model
  const loadFBX = useCallback(
    async (url: string): Promise<{ model: THREE.Group; animations: THREE.AnimationClip[] }> => {
      const loader = getFBXLoader();

      return new Promise((resolve, reject) => {
        loader.load(
          url,
          (fbx) => {
            resolve({
              model: fbx as THREE.Group,
              animations: fbx.animations || [],
            });
          },
          (progress) => {
            updateProgress(progress.loaded, progress.total, 'downloading');
          },
          (error) => {
            reject(new Error(`Failed to load FBX: ${error}`));
          }
        );
      });
    },
    [updateProgress]
  );

  // Main load function
  const loadModel = useCallback(
    async (url: string, format?: string): Promise<THREE.Group | null> => {
      // Check cache first
      if (enableCache && modelCache.has(url)) {
        const cachedModel = modelCache.get(url)!.clone(true);
        setState({
          isLoading: false,
          error: null,
          progress: { loaded: 100, total: 100, percentage: 100, stage: 'complete' },
          model: cachedModel,
          animations: [],
          boundingBox: new THREE.Box3().setFromObject(cachedModel),
        });
        onLoad?.(cachedModel);
        return cachedModel;
      }

      setState({
        isLoading: true,
        error: null,
        progress: { loaded: 0, total: 100, percentage: 0, stage: 'downloading' },
        model: null,
        animations: [],
        boundingBox: null,
      });

      try {
        const detectedFormat = format || detectFormat(url);
        let result: { model: THREE.Group; animations: THREE.AnimationClip[] };

        // Load based on format
        switch (detectedFormat) {
          case 'gltf':
          case 'glb':
            result = await loadGLTF(url);
            break;
          case 'obj':
            result = await loadOBJ(url);
            break;
          case 'fbx':
            result = await loadFBX(url);
            break;
          default:
            throw new Error(`Unsupported format: ${detectedFormat}`);
        }

        updateProgress(100, 100, 'processing');

        let { model } = result;
        const { animations } = result;

        // Optimize model if enabled
        if (autoOptimize) {
          updateProgress(100, 100, 'optimizing');
          model = optimizeModel(model, {
            ...optimizationOptions,
            compressTextures: true,
            maxTextureSize,
          }) as THREE.Group;
        }

        // Calculate bounding box
        const boundingBox = new THREE.Box3().setFromObject(model);

        // Cache the model
        if (enableCache) {
          modelCache.set(url, model.clone(true));
        }

        // Setup animation mixer
        if (animations.length > 0) {
          mixerRef.current = new THREE.AnimationMixer(model);
        }

        updateProgress(100, 100, 'complete');

        setState({
          isLoading: false,
          error: null,
          progress: { loaded: 100, total: 100, percentage: 100, stage: 'complete' },
          model,
          animations,
          boundingBox,
        });

        onLoad?.(model);
        return model;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load model';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          progress: null,
        }));
        onError?.(error instanceof Error ? error : new Error(errorMessage));
        return null;
      }
    },
    [
      autoOptimize,
      detectFormat,
      enableCache,
      loadFBX,
      loadGLTF,
      loadOBJ,
      maxTextureSize,
      onError,
      onLoad,
      optimizationOptions,
      updateProgress,
    ]
  );

  // Unload model
  const unloadModel = useCallback(() => {
    if (state.model) {
      // Dispose geometries and materials
      state.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];
          materials.forEach((mat) => {
            if (mat instanceof THREE.Material) {
              mat.dispose();
            }
          });
        }
      });
    }

    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setState({
      isLoading: false,
      error: null,
      progress: null,
      model: null,
      animations: [],
      boundingBox: null,
    });
  }, [state.model]);

  // Get model statistics
  const getModelStats = useCallback(() => {
    if (!state.model) return null;
    return analyzeModel(state.model);
  }, [state.model]);

  // Animation controls
  const playAnimation = useCallback(
    (name: string) => {
      if (!mixerRef.current || !state.model) return;

      const clip = state.animations.find((a) => a.name === name);
      if (!clip) {
        console.warn(`Animation "${name}" not found`);
        return;
      }

      // Stop current animation
      if (currentActionRef.current) {
        currentActionRef.current.stop();
      }

      // Play new animation
      const action = mixerRef.current.clipAction(clip);
      action.reset();
      action.play();
      currentActionRef.current = action;

      // Start animation loop
      const animate = () => {
        if (mixerRef.current) {
          const delta = clockRef.current.getDelta();
          mixerRef.current.update(delta);
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };

      clockRef.current.start();
      animate();
    },
    [state.animations, state.model]
  );

  const stopAnimation = useCallback(() => {
    if (currentActionRef.current) {
      currentActionRef.current.stop();
      currentActionRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    clockRef.current.stop();
  }, []);

  const setAnimationTime = useCallback(
    (time: number) => {
      if (mixerRef.current) {
        mixerRef.current.setTime(time);
      }
    },
    []
  );

  return {
    ...state,
    loadModel,
    unloadModel,
    getModelStats,
    playAnimation,
    stopAnimation,
    setAnimationTime,
  };
}

// Utility to clear the model cache
export function clearModelCache(): void {
  modelCache.forEach((model) => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        materials.forEach((mat) => mat.dispose());
      }
    });
  });
  modelCache.clear();
}

// Utility to preload models
export async function preloadModels(
  urls: string[],
  options?: UseModelLoaderOptions
): Promise<void> {
  const loader = getGLTFLoader(options?.dracoDecoderPath);

  await Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          if (modelCache.has(url)) {
            resolve();
            return;
          }

          loader.load(
            url,
            (gltf) => {
              modelCache.set(url, gltf.scene);
              resolve();
            },
            undefined,
            () => resolve() // Resolve even on error to not block other loads
          );
        })
    )
  );
}

export default useModelLoader;
