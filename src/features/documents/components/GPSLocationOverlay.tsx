/**
 * GPSLocationOverlay Component
 *
 * Show user's GPS position on site plans with geo-referencing support.
 * Mobile-first design for outdoor/field use.
 *
 * Features:
 * - Show user's GPS position on site plans
 * - Geo-referencing: set 2+ reference points to calibrate
 * - Accuracy indicator
 * - Track movement option
 * - Only for outdoor/site plan documents
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  Navigation,
  Navigation2,
  MapPin,
  Target,
  Crosshair,
  Settings,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  RefreshCw,
  Check,
  X,
  Map,
  Compass,
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh,
  CircleDot,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import type { GeoReference, GPSOverlayState, GPSTrackPoint } from '../types/markup'

// =============================================
// Types
// =============================================

interface GPSLocationOverlayProps {
  /** Document ID */
  documentId: string
  /** Current page number */
  page: number
  /** Container width for coordinate calculation */
  containerWidth: number
  /** Container height for coordinate calculation */
  containerHeight: number
  /** Current zoom level */
  zoom?: number
  /** Existing geo-reference for this document/page */
  geoReference?: GeoReference
  /** Called when geo-reference is updated */
  onGeoReferenceUpdate?: (geoRef: GeoReference) => void
  /** Enable tracking by default */
  enableTracking?: boolean
  /** Show calibration controls */
  showCalibration?: boolean
  /** Called when position changes */
  onPositionChange?: (position: GPSTrackPoint) => void
  /** Optional class name */
  className?: string
}

interface CalibrationPoint {
  pixelX: number
  pixelY: number
  lat: number
  lng: number
  label?: string
}

// =============================================
// Helper Functions
// =============================================

/**
 * Convert GPS coordinates to pixel position using affine transformation
 * Requires at least 2 reference points
 */
function gpsToPixel(
  lat: number,
  lng: number,
  referencePoints: CalibrationPoint[],
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } | null {
  if (referencePoints.length < 2) { return null }

  // Use simple linear interpolation with 2 points
  const p1 = referencePoints[0]
  const p2 = referencePoints[1]

  // Calculate scale and offset
  const dLat = p2.lat - p1.lat
  const dLng = p2.lng - p1.lng
  const dPixelX = p2.pixelX - p1.pixelX
  const dPixelY = p2.pixelY - p1.pixelY

  // Handle case where points are too close
  if (Math.abs(dLat) < 0.0000001 && Math.abs(dLng) < 0.0000001) {
    return null
  }

  // Calculate position using linear interpolation
  let x: number, y: number

  if (Math.abs(dLng) > Math.abs(dLat)) {
    // Primary interpolation on longitude
    const t = (lng - p1.lng) / dLng
    x = p1.pixelX + t * dPixelX
    // For latitude, use aspect ratio correction
    const latScale = dPixelY / dLat
    y = p1.pixelY + (lat - p1.lat) * latScale
  } else {
    // Primary interpolation on latitude
    const t = (lat - p1.lat) / dLat
    y = p1.pixelY + t * dPixelY
    // For longitude, use aspect ratio correction
    const lngScale = dPixelX / dLng
    x = p1.pixelX + (lng - p1.lng) * lngScale
  }

  // Clamp to container bounds
  x = Math.max(0, Math.min(containerWidth, x))
  y = Math.max(0, Math.min(containerHeight, y))

  return { x, y }
}

/**
 * Get accuracy level for display
 */
function getAccuracyLevel(accuracy: number): {
  level: 'high' | 'medium' | 'low' | 'poor'
  icon: typeof SignalHigh
  color: string
  label: string
} {
  if (accuracy <= 5) {
    return { level: 'high', icon: SignalHigh, color: 'text-success dark:text-success', label: 'Excellent' }
  } else if (accuracy <= 15) {
    return { level: 'medium', icon: SignalMedium, color: 'text-warning dark:text-warning', label: 'Good' }
  } else if (accuracy <= 30) {
    return { level: 'low', icon: SignalLow, color: 'text-warning dark:text-warning', label: 'Fair' }
  } else {
    return { level: 'poor', icon: Signal, color: 'text-destructive dark:text-destructive', label: 'Poor' }
  }
}

/**
 * Format coordinates for display
 */
function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lngDir = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lng).toFixed(6)}° ${lngDir}`
}

// =============================================
// Position Marker Component
// =============================================

interface PositionMarkerProps {
  x: number
  y: number
  accuracy: number
  heading?: number
  isTracking: boolean
  scale: number
}

function PositionMarker({
  x,
  y,
  accuracy,
  heading,
  isTracking,
  scale,
}: PositionMarkerProps) {
  // Calculate accuracy circle radius in pixels (rough approximation)
  const accuracyRadius = Math.min(accuracy * 2, 100) / scale

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Accuracy circle */}
      <div
        className={cn(
          'absolute rounded-full opacity-20',
          isTracking ? 'bg-primary' : 'bg-muted-foreground dark:bg-muted-foreground'
        )}
        style={{
          width: accuracyRadius * 2,
          height: accuracyRadius * 2,
          left: -accuracyRadius,
          top: -accuracyRadius,
        }}
      />

      {/* Direction indicator */}
      {heading !== undefined && (
        <div
          className="absolute w-0 h-0"
          style={{
            left: 0,
            top: -20,
            transform: `rotate(${heading}deg)`,
            transformOrigin: 'center 20px',
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '16px solid #1a3a99',
          }}
        />
      )}

      {/* Center dot */}
      <div
        className={cn(
          'relative w-6 h-6 rounded-full flex items-center justify-center',
          'shadow-lg border-2 border-white dark:border-gray-800',
          isTracking ? 'bg-primary' : 'bg-muted-foreground dark:bg-muted-foreground'
        )}
      >
        <div className="w-2 h-2 rounded-full bg-white" />
      </div>

      {/* Pulsing animation when tracking */}
      {isTracking && (
        <div
          className="absolute inset-0 w-6 h-6 rounded-full bg-primary animate-ping opacity-75"
          style={{ animationDuration: '2s' }}
        />
      )}
    </div>
  )
}

// =============================================
// Calibration Dialog Component
// =============================================

interface CalibrationDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (points: CalibrationPoint[]) => void
  existingPoints?: CalibrationPoint[]
  documentId: string
  page: number
}

function CalibrationDialog({
  isOpen,
  onClose,
  onSave,
  existingPoints = [],
  documentId,
  page,
}: CalibrationDialogProps) {
  const [points, setPoints] = useState<CalibrationPoint[]>(existingPoints)
  const [currentPoint, setCurrentPoint] = useState<Partial<CalibrationPoint>>({})
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'intro' | 'point1' | 'point2' | 'confirm'>('intro')

  useEffect(() => {
    if (isOpen) {
      setPoints(existingPoints)
      setCurrentPoint({})
      setStep(existingPoints.length >= 2 ? 'confirm' : 'intro')
      setError(null)
    }
  }, [isOpen, existingPoints])

  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setIsGettingLocation(true)
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        })
      })

      setCurrentPoint((prev) => ({
        ...prev,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }))
    } catch (err: any) {
      if (err.code === 1) {
        setError('Location permission denied. Please enable location access.')
      } else if (err.code === 2) {
        setError('Location unavailable. Please try again outdoors.')
      } else if (err.code === 3) {
        setError('Location request timed out. Please try again.')
      } else {
        setError('Failed to get location. Please try again.')
      }
    } finally {
      setIsGettingLocation(false)
    }
  }, [])

  const handleAddPoint = useCallback(() => {
    if (
      currentPoint.pixelX === undefined ||
      currentPoint.pixelY === undefined ||
      currentPoint.lat === undefined ||
      currentPoint.lng === undefined
    ) {
      setError('Please set both pixel position and GPS coordinates')
      return
    }

    const newPoint: CalibrationPoint = {
      pixelX: currentPoint.pixelX,
      pixelY: currentPoint.pixelY,
      lat: currentPoint.lat,
      lng: currentPoint.lng,
      label: currentPoint.label || `Point ${points.length + 1}`,
    }

    setPoints((prev) => [...prev, newPoint])
    setCurrentPoint({})

    if (points.length === 0) {
      setStep('point2')
    } else {
      setStep('confirm')
    }
  }, [currentPoint, points.length])

  const handleSave = useCallback(() => {
    if (points.length < 2) {
      setError('At least 2 reference points are required')
      return
    }
    onSave(points)
    onClose()
  }, [points, onSave, onClose])

  const handleRemovePoint = useCallback((index: number) => {
    setPoints((prev) => prev.filter((_, i) => i !== index))
    if (points.length <= 2) {
      setStep('point1')
    }
  }, [points.length])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Map className="w-5 h-5" />
            Geo-Reference Calibration
          </DialogTitle>
          <DialogDescription>
            Set reference points to align GPS coordinates with this drawing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'intro' && (
            <div className="space-y-4 text-center py-4">
              <Target className="w-12 h-12 mx-auto text-primary" />
              <div>
                <h3 className="font-medium mb-2">Calibrate This Drawing</h3>
                <p className="text-sm text-muted-foreground">
                  To show your GPS position on this drawing, you need to mark at least
                  2 reference points that you can identify both on the drawing and in
                  real life (e.g., building corners, survey markers).
                </p>
              </div>
              <Button onClick={() => setStep('point1')}>
                <MapPin className="w-4 h-4 mr-2" />
                Start Calibration
              </Button>
            </div>
          )}

          {(step === 'point1' || step === 'point2') && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">
                  Reference Point {points.length + 1}
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Stand at a known location on site and enter its pixel position on
                  the drawing.
                </p>

                {/* Pixel position inputs */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="pixel-x">Pixel X</Label>
                    <Input
                      id="pixel-x"
                      type="number"
                      placeholder="e.g., 500"
                      value={currentPoint.pixelX || ''}
                      onChange={(e) =>
                        setCurrentPoint((prev) => ({
                          ...prev,
                          pixelX: parseFloat(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pixel-y">Pixel Y</Label>
                    <Input
                      id="pixel-y"
                      type="number"
                      placeholder="e.g., 300"
                      value={currentPoint.pixelY || ''}
                      onChange={(e) =>
                        setCurrentPoint((prev) => ({
                          ...prev,
                          pixelY: parseFloat(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>

                {/* GPS coordinates */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <Label>GPS Coordinates</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={getCurrentLocation}
                      disabled={isGettingLocation}
                    >
                      {isGettingLocation ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Navigation className="w-4 h-4 mr-2" />
                      )}
                      Get Current Location
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lat">Latitude</Label>
                      <Input
                        id="lat"
                        type="number"
                        step="0.000001"
                        placeholder="e.g., 40.712776"
                        value={currentPoint.lat || ''}
                        onChange={(e) =>
                          setCurrentPoint((prev) => ({
                            ...prev,
                            lat: parseFloat(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lng">Longitude</Label>
                      <Input
                        id="lng"
                        type="number"
                        step="0.000001"
                        placeholder="e.g., -74.005974"
                        value={currentPoint.lng || ''}
                        onChange={(e) =>
                          setCurrentPoint((prev) => ({
                            ...prev,
                            lng: parseFloat(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Label */}
                <div className="space-y-2">
                  <Label htmlFor="point-label">Label (optional)</Label>
                  <Input
                    id="point-label"
                    placeholder="e.g., NE corner of building"
                    value={currentPoint.label || ''}
                    onChange={(e) =>
                      setCurrentPoint((prev) => ({
                        ...prev,
                        label: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <Button
                onClick={handleAddPoint}
                disabled={
                  !currentPoint.pixelX ||
                  !currentPoint.pixelY ||
                  !currentPoint.lat ||
                  !currentPoint.lng
                }
                className="w-full"
              >
                <Check className="w-4 h-4 mr-2" />
                Add Reference Point
              </Button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-success/10 dark:bg-success/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-success dark:text-success mb-2">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Calibration Ready</span>
                </div>
                <p className="text-sm text-success dark:text-success">
                  {points.length} reference points set. GPS tracking is now available.
                </p>
              </div>

              {/* Reference points list */}
              <div className="space-y-2">
                <Label>Reference Points</Label>
                {points.map((point, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {point.label || `Point ${index + 1}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Pixel: ({point.pixelX}, {point.pixelY}) |{' '}
                        {formatCoordinates(point.lat, point.lng)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemovePoint(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={() => setStep('point1')}
                className="w-full"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Add Another Point
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {step === 'confirm' && (
            <Button onClick={handleSave}>
              <Check className="w-4 h-4 mr-2" />
              Save Calibration
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================
// Main Component
// =============================================

export function GPSLocationOverlay({
  documentId,
  page,
  containerWidth,
  containerHeight,
  zoom = 100,
  geoReference,
  onGeoReferenceUpdate,
  enableTracking = false,
  showCalibration = true,
  onPositionChange,
  className,
}: GPSLocationOverlayProps) {
  const [state, setState] = useState<GPSOverlayState>({
    isTracking: enableTracking,
  })
  const [showCalibrationDialog, setShowCalibrationDialog] = useState(false)
  const [trackHistory, setTrackHistory] = useState<GPSTrackPoint[]>([])

  const watchIdRef = useRef<number | null>(null)
  const scale = zoom / 100

  const isCalibrated = useMemo(() => {
    return geoReference && geoReference.referencePoints.length >= 2
  }, [geoReference])

  // Start/stop GPS tracking
  useEffect(() => {
    if (!state.isTracking || !isCalibrated) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }

    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, error: 'Geolocation not supported' }))
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading, speed } = position.coords

        // Convert GPS to pixel position
        const pixelPos = geoReference
          ? gpsToPixel(
            latitude,
            longitude,
            geoReference.referencePoints,
            containerWidth,
            containerHeight
          )
          : null

        const newState: GPSOverlayState = {
          isTracking: true,
          currentPosition: {
            lat: latitude,
            lng: longitude,
            accuracy,
            heading: heading ?? undefined,
            speed: speed ?? undefined,
          },
          pixelPosition: pixelPos ?? undefined,
          lastUpdated: new Date().toISOString(),
        }

        setState(newState)

        // Track history
        const trackPoint: GPSTrackPoint = {
          lat: latitude,
          lng: longitude,
          timestamp: new Date().toISOString(),
          accuracy,
          pixelX: pixelPos?.x,
          pixelY: pixelPos?.y,
        }

        setTrackHistory((prev) => [...prev.slice(-99), trackPoint])

        if (onPositionChange) {
          onPositionChange(trackPoint)
        }
      },
      (error) => {
        let errorMessage = 'Failed to get location'
        if (error.code === 1) { errorMessage = 'Location permission denied' }
        if (error.code === 2) { errorMessage = 'Location unavailable' }
        if (error.code === 3) { errorMessage = 'Location request timed out' }

        setState((prev) => ({ ...prev, error: errorMessage }))
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [
    state.isTracking,
    isCalibrated,
    geoReference,
    containerWidth,
    containerHeight,
    onPositionChange,
  ])

  const handleToggleTracking = useCallback(() => {
    setState((prev) => ({ ...prev, isTracking: !prev.isTracking, error: undefined }))
  }, [])

  const handleCalibrationSave = useCallback(
    (points: CalibrationPoint[]) => {
      if (onGeoReferenceUpdate) {
        onGeoReferenceUpdate({
          documentId,
          page,
          referencePoints: points,
          calibratedAt: new Date().toISOString(),
        })
      }
    },
    [documentId, page, onGeoReferenceUpdate]
  )

  const accuracyInfo = useMemo(() => {
    if (!state.currentPosition?.accuracy) { return null }
    return getAccuracyLevel(state.currentPosition.accuracy)
  }, [state.currentPosition?.accuracy])

  return (
    <div className={cn('absolute inset-0 pointer-events-none', className)}>
      {/* Position marker */}
      {state.isTracking && state.pixelPosition && (
        <PositionMarker
          x={state.pixelPosition.x * scale}
          y={state.pixelPosition.y * scale}
          accuracy={state.currentPosition?.accuracy || 0}
          heading={state.currentPosition?.heading}
          isTracking={state.isTracking}
          scale={scale}
        />
      )}

      {/* Track path (optional - can show movement history) */}
      {trackHistory.length > 1 && (
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        >
          <polyline
            points={trackHistory
              .filter((p) => p.pixelX !== undefined && p.pixelY !== undefined)
              .map((p) => `${(p.pixelX || 0) * scale},${(p.pixelY || 0) * scale}`)
              .join(' ')}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeOpacity="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 left-4 pointer-events-auto z-30">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className={cn(
                'shadow-lg gap-2',
                state.isTracking && 'bg-info hover:bg-info/90 text-info-foreground dark:bg-info dark:hover:bg-info/90 dark:text-info-foreground'
              )}
            >
              <Navigation2
                className={cn(
                  'w-4 h-4',
                  state.isTracking && 'animate-pulse'
                )}
              />
              <span className="text-xs">
                {state.isTracking ? 'Tracking' : 'GPS'}
              </span>
              {accuracyInfo && (
                <accuracyInfo.icon className={cn('w-3 h-3', accuracyInfo.color)} />
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-72" align="start" side="top">
            <div className="space-y-4">
              <div className="font-medium text-sm flex items-center justify-between">
                <span>GPS Location</span>
                {isCalibrated && (
                  <Badge variant="outline" className="text-xs">
                    Calibrated
                  </Badge>
                )}
              </div>

              {/* Error message */}
              {state.error && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {state.error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Calibration status */}
              {!isCalibrated && (
                <Alert className="py-2">
                  <Map className="h-4 w-4" />
                  <AlertTitle className="text-sm">Not Calibrated</AlertTitle>
                  <AlertDescription className="text-xs">
                    Set reference points to show GPS position on drawing.
                  </AlertDescription>
                </Alert>
              )}

              {/* Current position */}
              {state.currentPosition && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Coordinates</span>
                    <span className="font-mono text-xs">
                      {formatCoordinates(
                        state.currentPosition.lat,
                        state.currentPosition.lng
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Accuracy</span>
                    <span className="flex items-center gap-1">
                      {accuracyInfo && (
                        <>
                          <accuracyInfo.icon
                            className={cn('w-4 h-4', accuracyInfo.color)}
                          />
                          <span>{accuracyInfo.label}</span>
                        </>
                      )}
                      <span className="text-xs text-muted-foreground">
                        ({Math.round(state.currentPosition.accuracy)}m)
                      </span>
                    </span>
                  </div>
                  {state.currentPosition.heading !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Heading</span>
                      <span className="flex items-center gap-1">
                        <Compass className="w-4 h-4" />
                        {Math.round(state.currentPosition.heading)}°
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Tracking toggle */}
              {isCalibrated && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <CircleDot className="w-4 h-4 text-primary" />
                    <Label htmlFor="tracking">Live Tracking</Label>
                  </div>
                  <Switch
                    id="tracking"
                    checked={state.isTracking}
                    onCheckedChange={handleToggleTracking}
                  />
                </div>
              )}

              {/* Clear track history */}
              {trackHistory.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setTrackHistory([])}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Clear Track History
                </Button>
              )}

              {/* Calibration button */}
              {showCalibration && onGeoReferenceUpdate && (
                <Button
                  variant={isCalibrated ? 'outline' : 'default'}
                  size="sm"
                  className="w-full"
                  onClick={() => setShowCalibrationDialog(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {isCalibrated ? 'Recalibrate' : 'Set Reference Points'}
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Calibration dialog */}
      {showCalibration && onGeoReferenceUpdate && (
        <CalibrationDialog
          isOpen={showCalibrationDialog}
          onClose={() => setShowCalibrationDialog(false)}
          onSave={handleCalibrationSave}
          existingPoints={geoReference?.referencePoints}
          documentId={documentId}
          page={page}
        />
      )}
    </div>
  )
}

export default GPSLocationOverlay
