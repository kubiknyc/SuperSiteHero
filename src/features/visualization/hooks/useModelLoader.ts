/**
 * useModelLoader Hook
 *
 * React hook for loading 3D models (glTF/GLB, OBJ, FBX) with progress tracking,
 * error handling, and automatic optimization.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type * as THREE from 'three';
import {
  loadThree,
  loadGLTFLoader,
  loadDRACOLoader,
  loadOBJLoader,
  loadFBXLoader,
  loadMTLLoader,
} from '../utils/threeLoader';
import type {
  ModelViewerState,
  ModelLoadProgress,
  ModelOptimizationOptions,
} from '@/types/visualization';
import {
  optimizeModel,
  analyzeModel,
} from '@/lib/utils/modelProcessing';
import { logger } from '../../../lib/utils/logger';

// ============================================================================
// Type Definitions for Model Loading
// ============================================================================

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
  loadModel: (url: string, format?: string) => Promise<any | null>;
  unloadModel: () => void;
  getModelStats: () => ReturnType<typeof analyzeModel> | null;
  playAnimation: (name: string) => void;
  stopAnimation: () => void;
  setAnimationTime: (time: number) => void;
}

// Global cache for loaded models
const modelCache = new Map<string, any>();

// Singleton loaders (initialized lazily)
let gltfLoader: any = null;
let objLoader: any = null;
let fbxLoader: any = null;
let dracoLoader: any = null;

async function getGLTFLoader(dracoPath?: string): Promise<any> {
  if (!gltfLoader) {
    const { GLTFLoader } = await loadGLTFLoader();
    gltfLoader = new GLTFLoader();

    // Initialize DRACO loader for compressed models
    if (!dracoLoader) {
      const { DRACOLoader } = await loadDRACOLoader();
      dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(dracoPath || 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      dracoLoader.setDecoderConfig({ type: 'js' });
    }
    gltfLoader.setDRACOLoader(dracoLoader);
  }
  return gltfLoader;
}

async function getOBJLoader(): Promise<any> {
  if (!objLoader) {
    const { OBJLoader } = await loadOBJLoader();
    objLoader = new OBJLoader();
  }
  return objLoader;
}

async function getFBXLoader(): Promise<any> {
  if (!fbxLoader) {
    const { FBXLoader } = await loadFBXLoader();
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

  const mixerRef = useRef<any | null>(null);
  const currentActionRef = useRef<any | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const clockRef = useRef<any>(null);

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
    async (url: string): Promise<{ model: any; animations: any[] }> => {
      const loader = await getGLTFLoader(dracoDecoderPath);

      return new Promise((resolve, reject) => {
        loader.load(
          url,
          (gltf: any) => {
            resolve({
              model: gltf.scene,
              animations: gltf.animations || [],
            });
          },
          (progress: any) => {
            updateProgress(progress.loaded, progress.total, 'downloading');
          },
          (error: any) => {
            reject(new Error(`Failed to load glTF: ${error}`));
          }
        );
      });
    },
    [dracoDecoderPath, updateProgress]
  );

  // Load OBJ model
  const loadOBJ = useCallback(
    async (url: string, mtlUrl?: string): Promise<{ model: any; animations: any[] }> => {
      const loader = await getOBJLoader();

      // Load MTL if provided
      if (mtlUrl) {
        const { MTLLoader } = await loadMTLLoader();
        const mtlLoader = new MTLLoader();
        const materials = await new Promise<any>((resolve, reject) => {
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
          (obj: any) => {
            resolve({
              model: obj,
              animations: [],
            });
          },
          (progress: any) => {
            updateProgress(progress.loaded, progress.total, 'downloading');
          },
          (error: any) => {
            reject(new Error(`Failed to load OBJ: ${error}`));
          }
        );
      });
    },
    [updateProgress]
  );

  // Load FBX model
  const loadFBX = useCallback(
    async (url: string): Promise<{ model: any; animations: any[] }> => {
      const loader = await getFBXLoader();

      return new Promise((resolve, reject) => {
        loader.load(
          url,
          (fbx: any) => {
            resolve({
              model: fbx,
              animations: fbx.animations || [],
            });
          },
          (progress: any) => {
            updateProgress(progress.loaded, progress.total, 'downloading');
          },
          (error: any) => {
            reject(new Error(`Failed to load FBX: ${error}`));
          }
        );
      });
    },
    [updateProgress]
  );

  // Main load function
  const loadModel = useCallback(
    async (url: string, format?: string): Promise<any | null> => {
      // Load THREE.js library
      const THREE = await loadThree();

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
        let result: { model: any; animations: any[] };

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
          });
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
      } catch (_error) {
        const errorMessage = _error instanceof Error ? _error.message : 'Failed to load model';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          progress: null,
        }));
        onError?.(_error instanceof Error ? _error : new Error(errorMessage));
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
  const unloadModel = useCallback(async () => {
    if (state.model) {
      // Load THREE for type checking
      const THREE = await loadThree();

      // Dispose geometries and materials
      state.model.traverse((child: any) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];
          materials.forEach((mat: any) => {
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
    if (!state.model) {return null;}
    return analyzeModel(state.model);
  }, [state.model]);

  // Animation controls
  const playAnimation = useCallback(
    async (name: string) => {
      if (!mixerRef.current || !state.model) {return;}

      const clip = state.animations.find((a: any) => a.name === name);
      if (!clip) {
        logger.warn(`Animation "${name}" not found`);
        return;
      }

      // Initialize clock if needed
      if (!clockRef.current) {
        const THREE = await loadThree();
        clockRef.current = new THREE.Clock();
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
export async function clearModelCache(): Promise<void> {
  const THREE = await loadThree();
  modelCache.forEach((model) => {
    model.traverse((child: any) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        materials.forEach((mat: any) => mat.dispose());
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
  const loader = await getGLTFLoader(options?.dracoDecoderPath);

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
            (gltf: any) => {
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
