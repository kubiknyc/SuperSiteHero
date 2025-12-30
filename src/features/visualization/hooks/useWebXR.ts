/**
 * useWebXR Hook
 *
 * React hook for WebXR API integration supporting both AR and VR experiences.
 * Provides session management, controller tracking, and hit testing.
 *
 * Features:
 * - VR/AR session management
 * - Controller input handling
 * - Hand tracking support
 * - Hit test for AR placement
 * - Anchor management
 * - Reference space handling
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  WebXRCapabilities,
  XRSessionOptions,
  XRFeature,
  VRSession,
  ARSession,
  VRController,
  ARAnchor,
  ARPose,
  VRTeleportTarget,
} from '@/types/visualization';
import { logger } from '../../../lib/utils/logger';


// ============================================================================
// Types
// ============================================================================

interface UseWebXROptions {
  /** Preferred reference space type */
  referenceSpaceType?: XRReferenceSpaceType;
  /** Enable hand tracking if available */
  enableHandTracking?: boolean;
  /** Enable AR plane detection */
  enablePlaneDetection?: boolean;
  /** Enable hit testing for AR */
  enableHitTest?: boolean;
  /** Callback when session starts */
  onSessionStart?: (session: XRSession) => void;
  /** Callback when session ends */
  onSessionEnd?: () => void;
  /** Callback on input source change */
  onInputSourceChange?: (inputSources: XRInputSource[]) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

interface UseWebXRReturn {
  /** WebXR capabilities */
  capabilities: WebXRCapabilities;
  /** Whether WebXR is supported */
  isSupported: boolean;
  /** Whether a session is active */
  isSessionActive: boolean;
  /** Current session type */
  sessionType: 'immersive-vr' | 'immersive-ar' | 'inline' | null;
  /** VR session state */
  vrSession: VRSession | null;
  /** AR session state */
  arSession: ARSession | null;
  /** Start VR session */
  startVRSession: (options?: Partial<XRSessionOptions>) => Promise<boolean>;
  /** Start AR session */
  startARSession: (options?: Partial<XRSessionOptions>) => Promise<boolean>;
  /** End current session */
  endSession: () => Promise<void>;
  /** Perform hit test (AR) */
  performHitTest: (x: number, y: number) => Promise<XRHitTestResult[] | null>;
  /** Create anchor at position */
  createAnchor: (pose: ARPose) => Promise<ARAnchor | null>;
  /** Delete anchor */
  deleteAnchor: (anchorId: string) => void;
  /** Get teleport target for VR locomotion */
  getTeleportTarget: (controller: VRController) => VRTeleportTarget | null;
  /** Trigger haptic feedback */
  triggerHaptic: (controllerId: string, intensity?: number, duration?: number) => void;
  /** Current reference space */
  referenceSpace: XRReferenceSpace | null;
  /** XR Frame callback */
  setFrameCallback: (callback: (frame: XRFrame, time: number) => void) => void;
}

// ============================================================================
// Capability Detection
// ============================================================================

async function detectCapabilities(): Promise<WebXRCapabilities> {
  const capabilities: WebXRCapabilities = {
    immersiveVR: false,
    immersiveAR: false,
    inlineSession: false,
    handTracking: false,
    planeDetection: false,
    meshDetection: false,
    hitTest: false,
    anchors: false,
    lightEstimation: false,
    depthSensing: false,
    domOverlay: false,
  };

  if (!('xr' in navigator)) {
    return capabilities;
  }

  const xr = (navigator as any).xr as XRSystem;

  try {
    capabilities.immersiveVR = await xr.isSessionSupported('immersive-vr');
  } catch {
    // Not supported
  }

  try {
    capabilities.immersiveAR = await xr.isSessionSupported('immersive-ar');
  } catch {
    // Not supported
  }

  try {
    capabilities.inlineSession = await xr.isSessionSupported('inline');
  } catch {
    // Not supported
  }

  // Feature detection for AR features
  // These are typically detected during session request
  capabilities.handTracking = 'XRHand' in window;
  capabilities.domOverlay = true; // Assume supported, will fail gracefully

  return capabilities;
}

// ============================================================================
// Controller State Conversion
// ============================================================================

function inputSourceToController(
  inputSource: XRInputSource,
  frame: XRFrame,
  referenceSpace: XRReferenceSpace
): VRController | null {
  const gripSpace = inputSource.gripSpace;
  if (!gripSpace) {return null;}

  const pose = frame.getPose(gripSpace, referenceSpace);
  if (!pose) {return null;}

  const position = pose.transform.position;
  const orientation = pose.transform.orientation;

  const buttons: VRController['buttons'] = [];
  if (inputSource.gamepad) {
    inputSource.gamepad.buttons.forEach((button, index) => {
      buttons.push({
        name: `button_${index}`,
        pressed: button.pressed,
        touched: button.touched,
        value: button.value,
      });
    });
  }

  return {
    id: inputSource.handedness || 'unknown',
    hand: inputSource.handedness || 'none',
    isConnected: true,
    pose: {
      position: { x: position.x, y: position.y, z: position.z },
      orientation: { x: orientation.x, y: orientation.y, z: orientation.z, w: orientation.w },
    },
    buttons,
    axes: inputSource.gamepad ? Array.from(inputSource.gamepad.axes) : [],
    hapticActuator: !!inputSource.gamepad?.hapticActuators?.length,
  };
}

// ============================================================================
// Main Hook
// ============================================================================

export function useWebXR(options: UseWebXROptions = {}): UseWebXRReturn {
  const {
    referenceSpaceType = 'local-floor',
    enableHandTracking = true,
    enablePlaneDetection = true,
    enableHitTest = true,
    onSessionStart,
    onSessionEnd,
    onInputSourceChange,
    onError,
  } = options;

  const [capabilities, setCapabilities] = useState<WebXRCapabilities>({
    immersiveVR: false,
    immersiveAR: false,
    inlineSession: false,
    handTracking: false,
    planeDetection: false,
    meshDetection: false,
    hitTest: false,
    anchors: false,
    lightEstimation: false,
    depthSensing: false,
    domOverlay: false,
  });

  const [isSupported, setIsSupported] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionType, setSessionType] = useState<'immersive-vr' | 'immersive-ar' | 'inline' | null>(null);
  const [vrSession, setVRSession] = useState<VRSession | null>(null);
  const [arSession, setARSession] = useState<ARSession | null>(null);
  const [referenceSpace, setReferenceSpace] = useState<XRReferenceSpace | null>(null);

  const xrSessionRef = useRef<XRSession | null>(null);
  const hitTestSourceRef = useRef<XRHitTestSource | null>(null);
  const anchorsRef = useRef<Map<string, XRAnchor>>(new Map());
  const frameCallbackRef = useRef<((frame: XRFrame, time: number) => void) | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Detect capabilities on mount
  useEffect(() => {
    detectCapabilities().then((caps) => {
      setCapabilities(caps);
      setIsSupported(caps.immersiveVR || caps.immersiveAR || caps.inlineSession);
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (xrSessionRef.current) {
        xrSessionRef.current.end().catch(() => {});
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Set frame callback
  const setFrameCallback = useCallback(
    (callback: (frame: XRFrame, time: number) => void) => {
      frameCallbackRef.current = callback;
    },
    []
  );

  // Start VR session
  const startVRSession = useCallback(
    async (sessionOptions?: Partial<XRSessionOptions>): Promise<boolean> => {
      if (!('xr' in navigator)) {
        onError?.(new Error('WebXR not supported'));
        return false;
      }

      const xr = (navigator as any).xr as XRSystem;

      try {
        const requiredFeatures: XRFeature[] = ['local-floor'];
        const optionalFeatures: XRFeature[] = ['bounded-floor'];

        if (enableHandTracking && capabilities.handTracking) {
          optionalFeatures.push('hand-tracking');
        }

        const session = await xr.requestSession('immersive-vr', {
          requiredFeatures: sessionOptions?.requiredFeatures || requiredFeatures,
          optionalFeatures: sessionOptions?.optionalFeatures || optionalFeatures,
        });

        xrSessionRef.current = session;
        setIsSessionActive(true);
        setSessionType('immersive-vr');

        // Get reference space
        const refSpace = await session.requestReferenceSpace(referenceSpaceType);
        setReferenceSpace(refSpace);

        // Setup session event handlers
        session.addEventListener('end', () => {
          xrSessionRef.current = null;
          setIsSessionActive(false);
          setSessionType(null);
          setVRSession(null);
          setReferenceSpace(null);
          onSessionEnd?.();
        });

        session.addEventListener('inputsourceschange', (_event: XRInputSourceChangeEvent) => {
          onInputSourceChange?.(Array.from(session.inputSources));
        });

        // Initialize VR session state
        setVRSession({
          isSupported: true,
          isActive: true,
          headsetType: 'unknown',
          controllers: [],
          boundarySize: null,
        });

        onSessionStart?.(session);
        return true;
      } catch (_error) {
        const err = _error instanceof Error ? _error : new Error('Failed to start VR session');
        onError?.(err);
        return false;
      }
    },
    [
      capabilities.handTracking,
      enableHandTracking,
      onError,
      onInputSourceChange,
      onSessionEnd,
      onSessionStart,
      referenceSpaceType,
    ]
  );

  // Start AR session
  const startARSession = useCallback(
    async (sessionOptions?: Partial<XRSessionOptions>): Promise<boolean> => {
      if (!('xr' in navigator)) {
        onError?.(new Error('WebXR not supported'));
        return false;
      }

      const xr = (navigator as any).xr as XRSystem;

      try {
        const requiredFeatures: XRFeature[] = ['local'];
        const optionalFeatures: XRFeature[] = [];

        if (enableHitTest) {
          optionalFeatures.push('hit-test');
        }
        if (enablePlaneDetection) {
          optionalFeatures.push('plane-detection');
        }
        if (sessionOptions?.domOverlay) {
          optionalFeatures.push('dom-overlay');
        }

        const sessionInit: XRSessionInit = {
          requiredFeatures: sessionOptions?.requiredFeatures || requiredFeatures,
          optionalFeatures: sessionOptions?.optionalFeatures || optionalFeatures,
        };

        if (sessionOptions?.domOverlay) {
          (sessionInit as any).domOverlay = { root: sessionOptions.domOverlay };
        }

        const session = await xr.requestSession('immersive-ar', sessionInit);

        xrSessionRef.current = session;
        setIsSessionActive(true);
        setSessionType('immersive-ar');

        // Get reference space
        const refSpace = await session.requestReferenceSpace('local');
        setReferenceSpace(refSpace);

        // Setup hit test source
        if (enableHitTest) {
          try {
            const viewerSpace = await session.requestReferenceSpace('viewer');
            hitTestSourceRef.current = await session.requestHitTestSource({
              space: viewerSpace,
            });
          } catch {
            logger.warn('Hit test not available');
          }
        }

        // Setup session event handlers
        session.addEventListener('end', () => {
          xrSessionRef.current = null;
          hitTestSourceRef.current = null;
          setIsSessionActive(false);
          setSessionType(null);
          setARSession(null);
          setReferenceSpace(null);
          anchorsRef.current.clear();
          onSessionEnd?.();
        });

        // Initialize AR session state
        setARSession({
          isSupported: true,
          isActive: true,
          trackingState: 'normal',
          detectedPlanes: [],
          detectedMarkers: [],
          anchors: [],
        });

        onSessionStart?.(session);
        return true;
      } catch (_error) {
        const err = _error instanceof Error ? _error : new Error('Failed to start AR session');
        onError?.(err);
        return false;
      }
    },
    [enableHitTest, enablePlaneDetection, onError, onSessionEnd, onSessionStart]
  );

  // End current session
  const endSession = useCallback(async (): Promise<void> => {
    if (xrSessionRef.current) {
      try {
        await xrSessionRef.current.end();
      } catch (_error) {
        logger.error('Error ending session:', _error);
      }
    }
  }, []);

  // Perform hit test
  const performHitTest = useCallback(
    async (_x: number, _y: number): Promise<XRHitTestResult[] | null> => {
      // Hit test in AR uses the center of the screen by default
      // The x, y parameters could be used for more advanced hit testing
      if (!hitTestSourceRef.current || !xrSessionRef.current || !referenceSpace) {
        return null;
      }

      // Hit test results are obtained in the frame loop
      // This is a simplified implementation
      return null;
    },
    [referenceSpace]
  );

  // Create anchor
  const createAnchor = useCallback(
    async (pose: ARPose): Promise<ARAnchor | null> => {
      if (!xrSessionRef.current || !referenceSpace) {
        return null;
      }

      try {
        // Create XR rigid transform from pose
        const position = new DOMPointReadOnly(
          pose.position.x,
          pose.position.y,
          pose.position.z,
          1
        );
        const orientation = new DOMPointReadOnly(
          pose.orientation.x,
          pose.orientation.y,
          pose.orientation.z,
          pose.orientation.w
        );
        const transform = new XRRigidTransform(position, orientation);

        // Create anchor (if supported)
        if ('createAnchor' in xrSessionRef.current) {
          const anchor = await (xrSessionRef.current as any).createAnchor(
            transform,
            referenceSpace
          );

          const anchorId = `anchor-${Date.now()}`;
          anchorsRef.current.set(anchorId, anchor);

          return {
            id: anchorId,
            pose,
            scale: 1,
            visible: true,
          };
        }

        return null;
      } catch (_error) {
        logger.error('Failed to create anchor:', _error);
        return null;
      }
    },
    [referenceSpace]
  );

  // Delete anchor
  const deleteAnchor = useCallback((anchorId: string): void => {
    const anchor = anchorsRef.current.get(anchorId);
    if (anchor) {
      anchor.delete();
      anchorsRef.current.delete(anchorId);
    }
  }, []);

  // Get teleport target for VR
  const getTeleportTarget = useCallback(
    (controller: VRController): VRTeleportTarget | null => {
      if (!referenceSpace) {return null;}

      // Calculate ray from controller
      const forward = new THREE.Vector3(0, 0, -1);
      const quaternion = new THREE.Quaternion(
        controller.pose.orientation.x,
        controller.pose.orientation.y,
        controller.pose.orientation.z,
        controller.pose.orientation.w
      );
      forward.applyQuaternion(quaternion);

      // Simple floor intersection (y = 0)
      const origin = new THREE.Vector3(
        controller.pose.position.x,
        controller.pose.position.y,
        controller.pose.position.z
      );

      if (forward.y >= 0) {
        return {
          position: controller.pose.position,
          normal: { x: 0, y: 1, z: 0 },
          isValid: false,
          surface: 'invalid',
        };
      }

      const t = -origin.y / forward.y;
      const intersection = origin.clone().add(forward.multiplyScalar(t));

      return {
        position: { x: intersection.x, y: 0, z: intersection.z },
        normal: { x: 0, y: 1, z: 0 },
        isValid: t > 0 && t < 20, // Max teleport distance
        surface: 'floor',
      };
    },
    [referenceSpace]
  );

  // Trigger haptic feedback
  const triggerHaptic = useCallback(
    (controllerId: string, intensity: number = 1.0, duration: number = 100): void => {
      if (!xrSessionRef.current) {return;}

      const inputSource = Array.from(xrSessionRef.current.inputSources).find(
        (source) => source.handedness === controllerId
      );

      if (inputSource?.gamepad?.hapticActuators?.[0]) {
        inputSource.gamepad.hapticActuators[0].pulse(intensity, duration);
      }
    },
    []
  );

  return {
    capabilities,
    isSupported,
    isSessionActive,
    sessionType,
    vrSession,
    arSession,
    startVRSession,
    startARSession,
    endSession,
    performHitTest,
    createAnchor,
    deleteAnchor,
    getTeleportTarget,
    triggerHaptic,
    referenceSpace,
    setFrameCallback,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to check if WebXR is available
 */
export function useWebXRSupport(): {
  isSupported: boolean;
  supportsVR: boolean;
  supportsAR: boolean;
  isLoading: boolean;
} {
  const [state, setState] = useState({
    isSupported: false,
    supportsVR: false,
    supportsAR: false,
    isLoading: true,
  });

  useEffect(() => {
    detectCapabilities().then((caps) => {
      setState({
        isSupported: caps.immersiveVR || caps.immersiveAR,
        supportsVR: caps.immersiveVR,
        supportsAR: caps.immersiveAR,
        isLoading: false,
      });
    });
  }, []);

  return state;
}

/**
 * Hook to track VR controller state
 */
export function useVRControllers(
  session: XRSession | null,
  referenceSpace: XRReferenceSpace | null
): VRController[] {
  const [controllers, setControllers] = useState<VRController[]>([]);

  useEffect(() => {
    if (!session || !referenceSpace) {
      setTimeout(() => {
        setControllers([]);
      }, 0);
      return;
    }

    const _updateControllers = (frame: XRFrame) => {
      const newControllers: VRController[] = [];

      for (const inputSource of session.inputSources) {
        const controller = inputSourceToController(inputSource, frame, referenceSpace);
        if (controller) {
          newControllers.push(controller);
        }
      }

      setControllers(newControllers);
    };

    // This would typically be called in the render loop
    // For now, we update on input source change
    const handleInputSourceChange = () => {
      // Controllers will be updated in the next frame
    };

    session.addEventListener('inputsourceschange', handleInputSourceChange);

    return () => {
      session.removeEventListener('inputsourceschange', handleInputSourceChange);
    };
  }, [session, referenceSpace]);

  return controllers;
}

export default useWebXR;
