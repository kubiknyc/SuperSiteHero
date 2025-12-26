/**
 * VideoCapture Component
 *
 * Mobile-first video recording component with:
 * - Live camera preview
 * - Recording controls (start/stop/pause)
 * - Camera switching (front/back)
 * - Duration display and limit
 * - Recording indicator
 * - Quality selection (low/medium/high)
 * - Native Capacitor support for iOS/Android
 *
 * Designed for construction site field use.
 */

import { useRef, useEffect, useCallback, useState } from 'react'
import {
  Video,
  StopCircle,
  Pause,
  Play,
  Camera,
  X,
  RotateCcw,
  FlipHorizontal2,
  AlertCircle,
  Check,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useVideoRecorder, formatVideoDuration } from '@/hooks/useVideoRecorder'
import { Capacitor } from '@capacitor/core'
import { Media } from '@capacitor-community/media'
import { logger } from '../../../lib/utils/logger';


export type VideoQuality = 'low' | 'medium' | 'high'

export interface VideoQualitySettings {
  label: string
  width: number
  height: number
  videoBitsPerSecond: number
  audioBitsPerSecond: number
}

const QUALITY_PRESETS: Record<VideoQuality, VideoQualitySettings> = {
  low: {
    label: 'Low (480p)',
    width: 854,
    height: 480,
    videoBitsPerSecond: 1000000, // 1 Mbps
    audioBitsPerSecond: 64000, // 64 kbps
  },
  medium: {
    label: 'Medium (720p)',
    width: 1280,
    height: 720,
    videoBitsPerSecond: 2500000, // 2.5 Mbps
    audioBitsPerSecond: 128000, // 128 kbps
  },
  high: {
    label: 'High (1080p)',
    width: 1920,
    height: 1080,
    videoBitsPerSecond: 5000000, // 5 Mbps
    audioBitsPerSecond: 192000, // 192 kbps
  },
}

export interface VideoCaptureProps {
  /** Maximum recording duration in seconds (default: 300 = 5 minutes) */
  maxDuration?: number
  /** Called when recording is complete */
  onRecordingComplete: (blob: Blob, duration: number) => void
  /** Called when capture is cancelled */
  onCancel?: () => void
  /** Called on error */
  onError?: (error: Error) => void
  /** Additional CSS classes */
  className?: string
  /** Show cancel button */
  showCancel?: boolean
  /** Auto-start preview on mount */
  autoStartPreview?: boolean
  /** Default video quality */
  defaultQuality?: VideoQuality
  /** Show quality selector */
  showQualitySelector?: boolean
  /** Use native camera on mobile devices */
  preferNativeCapture?: boolean
}

export function VideoCapture({
  maxDuration = 300, // 5 minutes default
  onRecordingComplete,
  onCancel,
  onError,
  className,
  showCancel = true,
  autoStartPreview = true,
  defaultQuality = 'medium',
  showQualitySelector = true,
  preferNativeCapture = true,
}: VideoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [recordingComplete, setRecordingComplete] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedDuration, setRecordedDuration] = useState(0)
  const [quality, setQuality] = useState<VideoQuality>(defaultQuality)
  const [isNativeCapture, setIsNativeCapture] = useState(false)

  const qualitySettings = QUALITY_PRESETS[quality]
  const isNativePlatform = Capacitor.isNativePlatform()

  const {
    isRecording,
    isPaused,
    duration,
    isSupported,
    error,
    hasPermission,
    facingMode,
    previewStream,
    isInitializing,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    requestPermission,
    switchCamera,
    initializePreview,
    stopPreview,
  } = useVideoRecorder({
    maxDuration,
    videoWidth: qualitySettings.width,
    videoHeight: qualitySettings.height,
    videoBitsPerSecond: qualitySettings.videoBitsPerSecond,
    audioBitsPerSecond: qualitySettings.audioBitsPerSecond,
    onRecordingComplete: (blob, dur) => {
      setRecordedBlob(blob)
      setRecordedDuration(dur)
      setRecordingComplete(true)
    },
    onError,
  })

  // Check if we should use native capture
  useEffect(() => {
    if (isNativePlatform && preferNativeCapture) {
      setIsNativeCapture(true)
    }
  }, [isNativePlatform, preferNativeCapture])

  // Attach preview stream to video element
  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream
    }
  }, [previewStream])

  // Auto-start preview on mount (only for web)
  useEffect(() => {
    if (autoStartPreview && !previewStream && !isInitializing && !isNativeCapture) {
      initializePreview()
    }

    return () => {
      if (!isNativeCapture) {
        stopPreview()
      }
    }
  }, [autoStartPreview, isNativeCapture])

  // Handle native video capture (iOS/Android)
  const handleNativeCapture = useCallback(async () => {
    try {
      // Use Capacitor Media plugin for native video capture
      const result = await Media.createMedia({
        type: 'video',
      })

      if (result.path) {
        // Fetch the video file and convert to blob
        const response = await fetch(result.path)
        const blob = await response.blob()

        // Get duration from video
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.src = result.path

        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => {
            setRecordedDuration(Math.round(video.duration))
            resolve()
          }
        })

        setRecordedBlob(blob)
        setRecordingComplete(true)
      }
    } catch (err) {
      logger.error('Native video capture failed:', err)
      // Fall back to web capture
      setIsNativeCapture(false)
      if (autoStartPreview) {
        initializePreview()
      }
      onError?.(err instanceof Error ? err : new Error('Native video capture failed'))
    }
  }, [autoStartPreview, initializePreview, onError])

  const handleStartRecording = useCallback(async () => {
    if (isNativeCapture) {
      await handleNativeCapture()
    } else {
      if (!previewStream) {
        await initializePreview()
      }
      startRecording()
    }
  }, [isNativeCapture, previewStream, initializePreview, startRecording, handleNativeCapture])

  const handleStopRecording = useCallback(() => {
    stopRecording()
  }, [stopRecording])

  const handleConfirm = useCallback(() => {
    if (recordedBlob) {
      onRecordingComplete(recordedBlob, recordedDuration)
    }
  }, [recordedBlob, recordedDuration, onRecordingComplete])

  const handleRetry = useCallback(() => {
    setRecordingComplete(false)
    setRecordedBlob(null)
    setRecordedDuration(0)
    if (!isNativeCapture) {
      initializePreview()
    }
  }, [initializePreview, isNativeCapture])

  const handleCancel = useCallback(() => {
    cancelRecording()
    if (!isNativeCapture) {
      stopPreview()
    }
    onCancel?.()
  }, [cancelRecording, stopPreview, onCancel, isNativeCapture])

  const handleQualityChange = useCallback((newQuality: VideoQuality) => {
    if (!isRecording) {
      setQuality(newQuality)
      // Reinitialize preview with new quality
      if (previewStream && !isNativeCapture) {
        stopPreview()
        setTimeout(() => initializePreview(), 100)
      }
    }
  }, [isRecording, previewStream, isNativeCapture, stopPreview, initializePreview])

  // Not supported message
  if (!isSupported && !isNativeCapture) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8', className)}>
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2 heading-subsection">Video Recording Not Supported</h3>
        <p className="text-muted-foreground text-center">
          Your browser does not support video recording.
          Please try using a modern browser like Chrome, Firefox, or Safari.
        </p>
      </div>
    )
  }

  // Permission request screen (web only)
  if (!isNativeCapture && hasPermission === false) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8', className)}>
        <Camera className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2 heading-subsection">Camera Access Required</h3>
        <p className="text-muted-foreground text-center mb-4">
          Please allow access to your camera and microphone to record videos.
        </p>
        <Button onClick={requestPermission}>
          Allow Camera Access
        </Button>
        {error && (
          <p className="text-destructive text-sm mt-4">{error}</p>
        )}
      </div>
    )
  }

  // Recording complete - show preview and confirm
  if (recordingComplete && recordedBlob) {
    const previewUrl = URL.createObjectURL(recordedBlob)

    return (
      <div className={cn('relative bg-black rounded-lg overflow-hidden', className)}>
        <video
          src={previewUrl}
          className="w-full h-full object-cover"
          controls
          playsInline
        />

        {/* Confirm/Retry buttons */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handleRetry}
              className="bg-card/10 border-white/20 text-white hover:bg-card/20"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Retake
            </Button>
            <Button
              size="lg"
              onClick={handleConfirm}
              className="bg-success hover:bg-green-700"
            >
              <Check className="h-5 w-5 mr-2" />
              Use Video
            </Button>
          </div>
          <p className="text-white/70 text-center text-sm mt-2">
            Duration: {formatVideoDuration(recordedDuration)}
            {recordedBlob && (
              <span className="ml-2">
                ({(recordedBlob.size / (1024 * 1024)).toFixed(1)} MB)
              </span>
            )}
          </p>
        </div>
      </div>
    )
  }

  // Native capture mode - show capture button
  if (isNativeCapture && !recordingComplete) {
    return (
      <div className={cn('relative bg-black rounded-lg overflow-hidden flex flex-col items-center justify-center min-h-[400px]', className)}>
        <Video className="h-16 w-16 text-white/60 mb-6" />
        <h3 className="text-white text-lg font-semibold mb-2 heading-subsection">Record Video</h3>
        <p className="text-white/60 text-center mb-6 px-4">
          Tap the button below to open your camera and record a video
        </p>

        {/* Quality selector for native */}
        {showQualitySelector && (
          <div className="mb-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-card/10 border-white/20 text-white hover:bg-card/20">
                  <Settings className="h-4 w-4 mr-2" />
                  {QUALITY_PRESETS[quality].label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Video Quality</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.keys(QUALITY_PRESETS) as VideoQuality[]).map((q) => (
                  <DropdownMenuItem
                    key={q}
                    onClick={() => handleQualityChange(q)}
                    className={cn(quality === q && 'bg-accent')}
                  >
                    {QUALITY_PRESETS[q].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <button
          onClick={handleStartRecording}
          className="w-20 h-20 rounded-full bg-red-500 hover:bg-error flex items-center justify-center border-4 border-white transition-colors"
        >
          <Video className="h-8 w-8 text-white" />
        </button>

        <p className="text-white/50 text-sm mt-4">
          Max duration: {formatVideoDuration(maxDuration)}
        </p>

        {/* Cancel button */}
        {showCancel && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="absolute top-4 right-4 text-white hover:bg-card/20"
          >
            <X className="h-6 w-6" />
          </Button>
        )}

        {/* Switch to web capture */}
        <Button
          variant="link"
          className="text-white/50 hover:text-white mt-4"
          onClick={() => {
            setIsNativeCapture(false)
            initializePreview()
          }}
        >
          Use in-browser recording instead
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('relative bg-black rounded-lg overflow-hidden', className)}>
      {/* Video preview */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={cn(
          'w-full h-full object-cover',
          facingMode === 'user' && 'scale-x-[-1]' // Mirror front camera
        )}
      />

      {/* Loading overlay */}
      {isInitializing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-white border-t-transparent" />
            <p className="text-white mt-2">Initializing camera...</p>
          </div>
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div
            className={cn(
              'w-3 h-3 rounded-full',
              isPaused ? 'bg-warning' : 'bg-red-500 animate-pulse'
            )}
          />
          <span className="text-white font-mono text-lg">
            {formatVideoDuration(duration)}
          </span>
          {isPaused && (
            <span className="text-warning text-sm">PAUSED</span>
          )}
        </div>
      )}

      {/* Max duration warning */}
      {isRecording && duration >= maxDuration - 10 && (
        <div className="absolute top-4 right-4 bg-orange-500/90 px-3 py-1 rounded-full">
          <span className="text-white text-sm font-medium">
            {maxDuration - duration}s remaining
          </span>
        </div>
      )}

      {/* Top controls (when not recording) */}
      {!isRecording && (
        <div className="absolute top-4 left-4 right-4 flex justify-between">
          {/* Camera switch button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={switchCamera}
            className="text-white hover:bg-card/20"
            disabled={isInitializing}
          >
            <FlipHorizontal2 className="h-6 w-6" />
          </Button>

          <div className="flex items-center gap-2">
            {/* Quality selector */}
            {showQualitySelector && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-card/20"
                    disabled={isInitializing || isRecording}
                  >
                    <Settings className="h-6 w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Video Quality</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(Object.keys(QUALITY_PRESETS) as VideoQuality[]).map((q) => (
                    <DropdownMenuItem
                      key={q}
                      onClick={() => handleQualityChange(q)}
                      className={cn(quality === q && 'bg-accent')}
                    >
                      {QUALITY_PRESETS[q].label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Cancel button */}
            {showCancel && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                className="text-white hover:bg-card/20"
                disabled={isRecording}
              >
                <X className="h-6 w-6" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Quality badge (when recording) */}
      {isRecording && !isPaused && showQualitySelector && (
        <div className="absolute top-14 left-4 px-2 py-1 bg-black/50 rounded text-white text-xs">
          {QUALITY_PRESETS[quality].label}
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex justify-center items-center gap-6">
          {/* Pause/Resume button (only when recording) */}
          {isRecording && (
            <Button
              variant="ghost"
              size="icon"
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="h-12 w-12 text-white hover:bg-card/20"
            >
              {isPaused ? (
                <Play className="h-6 w-6" />
              ) : (
                <Pause className="h-6 w-6" />
              )}
            </Button>
          )}

          {/* Main record/stop button */}
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={isInitializing}
            className={cn(
              'relative w-20 h-20 rounded-full transition-all',
              'flex items-center justify-center',
              'border-4 border-white',
              isRecording
                ? 'bg-red-500 hover:bg-error'
                : 'bg-card/20 hover:bg-card/30',
              isInitializing && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isRecording ? (
              <StopCircle className="h-10 w-10 text-white" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-red-500" />
            )}
          </button>

          {/* Spacer for symmetry */}
          {isRecording && <div className="w-12" />}
        </div>

        {/* Duration info */}
        {!isRecording && (
          <p className="text-white/70 text-center text-sm mt-4">
            Tap to start recording (max {formatVideoDuration(maxDuration)})
          </p>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="absolute bottom-24 left-4 right-4 bg-destructive/90 text-white p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoCapture
