// Device detection and context exports
export {
  type DeviceMode,
  detectDeviceMode,
  getDeviceMode,
  setDeviceModeOverride,
  clearDeviceModeOverride,
  hasDeviceModeOverride,
  redetectDeviceMode,
} from './detection';

export {
  type Orientation,
  type DeviceContextValue,
  DeviceProvider,
  useDevice,
  useIsMobileMode,
  useIsDesktopMode,
  useResponsiveLayout,
} from './DeviceContext';

export {
  isDesktopOnlyRoute,
  mapUrlToDeviceMode,
  getMobileUrl,
  getDesktopUrl,
  normalizeUrlForDevice,
} from './urlMapping';
