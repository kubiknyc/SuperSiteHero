/**
 * AR/VR Site Walkthrough Types
 *
 * Type definitions for 3D visualization, BIM integration, and AR/VR features
 */

import type * as THREE from 'three';

// ============================================================================
// 3D Model Types
// ============================================================================

export interface Model3DMetadata {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  format: 'gltf' | 'glb' | 'obj' | 'fbx' | 'ifc';
  uploadedAt: string;
  uploadedBy: string;
  projectId: string;
  description?: string;
  tags?: string[];
  boundingBox?: BoundingBox;
  centerPoint?: Vector3D;
  triangleCount?: number;
  materialCount?: number;
  textureCount?: number;
  animations?: string[];
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  min: Vector3D;
  max: Vector3D;
}

export interface ModelLoadProgress {
  loaded: number;
  total: number;
  percentage: number;
  stage: 'downloading' | 'parsing' | 'processing' | 'optimizing' | 'complete';
}

export interface ModelViewerState {
  isLoading: boolean;
  error: string | null;
  progress: ModelLoadProgress | null;
  model: THREE.Group | null;
  animations: THREE.AnimationClip[];
  boundingBox: THREE.Box3 | null;
}

export interface CameraState {
  position: Vector3D;
  target: Vector3D;
  zoom: number;
  fov: number;
}

export interface ModelViewerSettings {
  autoRotate: boolean;
  autoRotateSpeed: number;
  enableShadows: boolean;
  enableAmbientOcclusion: boolean;
  backgroundColor: string;
  gridEnabled: boolean;
  axesEnabled: boolean;
  wireframeEnabled: boolean;
  enableZoom: boolean;
  enablePan: boolean;
  enableRotate: boolean;
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
}

// ============================================================================
// BIM/IFC Types
// ============================================================================

export interface IFCElement {
  expressID: number;
  type: string;
  name: string;
  description?: string;
  guid: string;
  properties: IFCProperty[];
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material;
  boundingBox?: BoundingBox;
  children?: IFCElement[];
  parentId?: number;
}

export interface IFCProperty {
  name: string;
  value: string | number | boolean | null;
  type: 'string' | 'number' | 'boolean' | 'reference' | 'null';
  unit?: string;
  propertySetName?: string;
}

export interface IFCPropertySet {
  name: string;
  properties: IFCProperty[];
}

export interface IFCModel {
  id: string;
  name: string;
  fileName: string;
  elements: Map<number, IFCElement>;
  spatialStructure: IFCSpatialNode[];
  propertyCache: Map<number, IFCPropertySet[]>;
  types: IFCTypeInfo[];
  metadata: IFCMetadata;
}

export interface IFCSpatialNode {
  expressID: number;
  type: string;
  name: string;
  children: IFCSpatialNode[];
  level?: number;
}

export interface IFCTypeInfo {
  type: string;
  count: number;
  expressIDs: number[];
  color?: string;
  visible: boolean;
}

export interface IFCMetadata {
  schema: string;
  name: string;
  description?: string;
  author?: string;
  organization?: string;
  preprocessorVersion?: string;
  originatingSystem?: string;
  authorization?: string;
  fileDate?: string;
}

export interface IFCSelection {
  expressID: number;
  element: IFCElement;
  properties: IFCPropertySet[];
}

export interface BIMViewerState {
  isLoading: boolean;
  error: string | null;
  progress: ModelLoadProgress | null;
  model: IFCModel | null;
  selectedElements: Set<number>;
  hiddenElements: Set<number>;
  hiddenTypes: Set<string>;
  isolatedElements: Set<number> | null;
  highlightedElement: number | null;
  sectionPlanes: SectionPlane[];
  measurements: Measurement[];
}

export interface SectionPlane {
  id: string;
  position: Vector3D;
  normal: Vector3D;
  enabled: boolean;
  name?: string;
}

export interface Measurement {
  id: string;
  type: 'distance' | 'area' | 'angle' | 'volume';
  points: Vector3D[];
  value: number;
  unit: string;
  label?: string;
}

// ============================================================================
// AR Types
// ============================================================================

export interface ARSession {
  isSupported: boolean;
  isActive: boolean;
  trackingState: ARTrackingState;
  detectedPlanes: ARPlane[];
  detectedMarkers: ARMarker[];
  anchors: ARAnchor[];
}

export type ARTrackingState = 'not-available' | 'limited' | 'normal';

export interface ARPlane {
  id: string;
  type: 'horizontal' | 'vertical';
  center: Vector3D;
  extent: { width: number; height: number };
  pose: ARPose;
}

export interface ARMarker {
  id: string;
  type: 'qr' | 'image' | 'barcode';
  data?: string;
  pose: ARPose;
  size: { width: number; height: number };
}

export interface ARAnchor {
  id: string;
  pose: ARPose;
  model?: Model3DMetadata;
  scale: number;
  visible: boolean;
}

export interface ARPose {
  position: Vector3D;
  orientation: Quaternion;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface ARViewerSettings {
  planeDetection: boolean;
  markerDetection: boolean;
  lightEstimation: boolean;
  occlusionEnabled: boolean;
  shadowsEnabled: boolean;
  snapToPlane: boolean;
  showPlaneOverlay: boolean;
  showPointCloud: boolean;
}

export interface ARPlacementState {
  isPlacing: boolean;
  previewPosition: Vector3D | null;
  previewRotation: number;
  previewScale: number;
  targetPlane: ARPlane | null;
}

// ============================================================================
// VR Types
// ============================================================================

export interface VRSession {
  isSupported: boolean;
  isActive: boolean;
  headsetType: VRHeadsetType | null;
  controllers: VRController[];
  boundarySize: { width: number; depth: number } | null;
}

export type VRHeadsetType =
  | 'quest'
  | 'quest2'
  | 'quest-pro'
  | 'quest3'
  | 'rift'
  | 'rift-s'
  | 'vive'
  | 'vive-pro'
  | 'index'
  | 'wmr'
  | 'pico'
  | 'unknown';

export interface VRController {
  id: string;
  hand: 'left' | 'right' | 'none';
  isConnected: boolean;
  pose: ARPose;
  buttons: VRButtonState[];
  axes: number[];
  hapticActuator: boolean;
}

export interface VRButtonState {
  name: string;
  pressed: boolean;
  touched: boolean;
  value: number;
}

export interface VRWalkthroughSettings {
  locomotionMode: 'teleport' | 'smooth' | 'arm-swing';
  movementSpeed: number;
  snapTurnAngle: number;
  smoothTurnSpeed: number;
  comfortVignette: boolean;
  vignetteIntensity: number;
  handTrackingEnabled: boolean;
  showControllerModels: boolean;
  roomScale: boolean;
  seatedMode: boolean;
}

export interface VRTeleportTarget {
  position: Vector3D;
  normal: Vector3D;
  isValid: boolean;
  surface: 'floor' | 'platform' | 'invalid';
}

export interface VRNavigationState {
  currentPosition: Vector3D;
  currentRotation: number;
  teleportTarget: VRTeleportTarget | null;
  isMoving: boolean;
  isTeleporting: boolean;
}

// ============================================================================
// 360 Photo to VR Types
// ============================================================================

export interface Photo360Data {
  id: string;
  url: string;
  thumbnailUrl?: string;
  name: string;
  location?: Vector3D;
  heading?: number;
  pitch?: number;
  capturedAt: string;
  projectId: string;
  tags?: string[];
  linkedPhotos?: LinkedPhoto360[];
}

export interface LinkedPhoto360 {
  photoId: string;
  position: { yaw: number; pitch: number };
  label?: string;
}

export interface VRTourNode {
  id: string;
  photo: Photo360Data;
  connections: VRTourConnection[];
  annotations: VRAnnotation[];
  position?: Vector3D;
}

export interface VRTourConnection {
  targetNodeId: string;
  yaw: number;
  pitch: number;
  label?: string;
  icon?: string;
}

export interface VRAnnotation {
  id: string;
  type: 'text' | 'image' | 'video' | 'link' | 'model';
  position: { yaw: number; pitch: number };
  content: string;
  title?: string;
  scale?: number;
}

export interface VRTour {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  nodes: VRTourNode[];
  startNodeId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// WebXR Types
// ============================================================================

export interface WebXRCapabilities {
  immersiveVR: boolean;
  immersiveAR: boolean;
  inlineSession: boolean;
  handTracking: boolean;
  planeDetection: boolean;
  meshDetection: boolean;
  hitTest: boolean;
  anchors: boolean;
  lightEstimation: boolean;
  depthSensing: boolean;
  domOverlay: boolean;
}

export interface XRSessionOptions {
  mode: 'immersive-vr' | 'immersive-ar' | 'inline';
  requiredFeatures?: XRFeature[];
  optionalFeatures?: XRFeature[];
  domOverlay?: HTMLElement;
}

export type XRFeature =
  | 'local'
  | 'local-floor'
  | 'bounded-floor'
  | 'unbounded'
  | 'viewer'
  | 'hand-tracking'
  | 'plane-detection'
  | 'mesh-detection'
  | 'hit-test'
  | 'anchors'
  | 'light-estimation'
  | 'depth-sensing'
  | 'dom-overlay'
  | 'layers';

// ============================================================================
// Performance & Optimization Types
// ============================================================================

export interface ModelOptimizationOptions {
  targetTriangleCount?: number;
  mergeGeometries?: boolean;
  generateLODs?: boolean;
  lodLevels?: number[];
  compressTextures?: boolean;
  maxTextureSize?: number;
  simplifyMaterials?: boolean;
  removeHiddenGeometry?: boolean;
  centerModel?: boolean;
  normalizeScale?: boolean;
  targetScale?: number;
}

export interface LODLevel {
  distance: number;
  object: THREE.Object3D;
  triangleCount: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  triangleCount: number;
  drawCalls: number;
  textureMemory: number;
  geometryMemory: number;
  totalMemory: number;
}

export interface RenderQualitySettings {
  pixelRatio: number;
  shadowMapSize: number;
  antialias: boolean;
  toneMapping: THREE.ToneMapping;
  exposure: number;
  maxLights: number;
  enablePostProcessing: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

export interface Model3DClickEvent {
  object: THREE.Object3D;
  point: Vector3D;
  normal: Vector3D;
  distance: number;
  face?: THREE.Face;
  faceIndex?: number;
}

export interface IFCClickEvent extends Model3DClickEvent {
  expressID: number;
  element: IFCElement;
}

export interface ARHitTestEvent {
  position: Vector3D;
  normal: Vector3D;
  plane?: ARPlane;
}

export interface VRSelectEvent {
  controller: VRController;
  target: THREE.Object3D | null;
  point: Vector3D | null;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface Model3DUploadResponse {
  success: boolean;
  model?: Model3DMetadata;
  error?: string;
  processingStatus?: 'pending' | 'processing' | 'complete' | 'failed';
}

export interface Model3DListResponse {
  models: Model3DMetadata[];
  total: number;
  page: number;
  pageSize: number;
}
