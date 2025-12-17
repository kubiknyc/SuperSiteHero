/**
 * Visualization Feature Index
 *
 * Phase 5: AR/VR Site Walkthroughs
 *
 * This feature provides comprehensive 3D visualization, BIM integration,
 * and AR/VR capabilities for construction site management.
 *
 * Features:
 * - 3D Model Viewer with glTF/GLB, OBJ, FBX support
 * - BIM/IFC viewer with property inspection
 * - Augmented Reality for on-site model placement
 * - Virtual Reality walkthroughs and 360 photo tours
 * - WebXR support for VR headsets
 * - Mobile-optimized performance
 * - Measurement tools for distance, area, and angles
 * - VR Tour creation and editing
 */

// Components
export * from './components';
export { VRTourEditor } from './components/VRTourEditor';

// Hooks
export * from './hooks';

// Services
export * from './services';
export {
  modelsService,
  vrToursService,
  arSessionsService,
} from './services/visualizationService';

// Re-export types
export type {
  Model3DMetadata,
  ModelViewerSettings,
  ModelLoadProgress,
  IFCModel,
  IFCElement,
  IFCProperty,
  IFCPropertySet,
  BIMViewerState,
  ARSession,
  VRSession,
  VRTour,
  VRTourNode,
  VRTourConnection,
  VRAnnotation,
  Photo360Data,
  WebXRCapabilities,
  Vector3D,
  BoundingBox,
  Measurement,
} from '@/types/visualization';
