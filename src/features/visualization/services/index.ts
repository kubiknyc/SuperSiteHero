/**
 * Visualization Services Index
 *
 * Export all services for AR/VR and 3D visualization.
 */

// IFC/BIM loader service
export {
  IFCLoaderService,
  getIFCLoader,
  disposeIFCLoader,
  getIFCTypeColor,
  getIFCCategory,
  formatIFCPropertyValue,
  calculateIFCBoundingBox,
  IFC_TYPE_COLORS,
  IFC_CATEGORIES,
} from './ifcLoader';
