/**
 * Visualization Hooks Index
 *
 * Export all hooks for AR/VR and 3D visualization.
 */

// Model loading hook
export { useModelLoader, clearModelCache, preloadModels } from './useModelLoader';
export type { default as UseModelLoaderReturn } from './useModelLoader';

// WebXR hook
export {
  useWebXR,
  useWebXRSupport,
  useVRControllers,
} from './useWebXR';
export type { default as UseWebXRReturn } from './useWebXR';
