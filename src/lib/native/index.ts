/**
 * Native Features Module
 * Unified exports for all native device capabilities
 */

// Platform detection
export {
  isNative,
  isIOS,
  isAndroid,
  isWeb,
  getPlatform,
  isPluginAvailable,
  getDeviceInfo,
  platformConfig,
  getCurrentPlatformConfig,
  type Platform,
} from './platform';

// Camera utilities
export {
  isCameraAvailable,
  requestCameraPermission,
  takePhoto,
  pickPhotos,
  type CapturedPhoto,
  type CameraOptions,
} from './camera';

// React hooks for native features
export {
  useNetwork,
  useCamera,
  useHaptics,
  useShare,
  useGeolocation,
  useKeyboard,
  useAppState,
  useStatusBar,
} from './hooks';
