/**
 * VideoCapture Component
 *
 * Mobile-first video recording component with:
 * - Live camera preview
 * - Recording controls (start/stop/pause)
 * - Camera switching (front/back)
 * - Duration display and limit
 * - Recording indicator
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useVideoRecorder, formatVideoDuration } from '@/hooks/useVideoRecorder'

export interface VideoCaptureProps {
  /** Maximum recording duration in seconds */
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
}

export function VideoCapture({
  maxDuration = 120,
  onRecordingComplete,
  onCancel,
  onError,
  className,
  showCancel = true,
  autoStartPreview = true,
}: VideoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [recordingComplete, setRecordingComplete] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedDuration, setRecordedDuration] = useState(0)

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
    onRecordingComplete: (blob, dur) => {
      setRecordedBlob(blob)
      setRecordedDuration(dur)
      setRecordingComplete(true)
    },
    onError,
  })

  // Attach preview stream to video element
  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream
    }
  }, [previewStream])

  // Auto-start preview on mount
  useEffect(() => {
    if (autoStartPreview && !previewStream && !isInitializing) {
      initializePreview()
    }

    return () => {
      stopPreview()
    }
  }, [autoStartPreview])

  const handleStartRecording = useCallback(async () => {
    if (!previewStream) {
      await initializePreview()
    }
    startRecording()
  }, [previewStream, initializePreview, startRecording])

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
    initializePreview()
  }, [initializePreview])

  const handleCancel = useCallback(() => {
    cancelRecording()
    stopPreview()
    onCancel?.()
  }, [cancelRecording, stopPreview, onCancel])

  // Not supported message
  if (!isSupported) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8', className)}>
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Video Recording Not Supported</h3>
        <p className="text-muted-foreground text-center">
          Your browser does not support video recording.
          Please try using a modern browser like Chrome, Firefox, or Safari.
        </p>
      </div>
    )
  }

  // Permission request screen
  if (hasPermission === false) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8', className)}>
        <Camera className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Camera Access Required</h3>
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
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Retake
            </Button>
            <Button
              size="lg"
              onClick={handleConfirm}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-5 w-5 mr-2" />
              Use Video
            </Button>
          </div>
          <p className="text-white/70 text-center text-sm mt-2">
            Duration: {formatVideoDuration(recordedDuration)}
          </p>
        </div>
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
              isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'
            )}
          />
          <span className="text-white font-mono text-lg">
            {formatVideoDuration(duration)}
          </span>
          {isPaused && (
            <span className="text-yellow-500 text-sm">PAUSED</span>
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

      {/* Cancel button */}
      {showCancel && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="absolute top-4 right-4 text-white hover:bg-white/20"
          disabled={isRecording}
        >
          <X className="h-6 w-6" />
        </Button>
      )}

      {/* Camera switch button */}
      {!isRecording && (
        <Button
          variant="ghost"
          size="icon"
          onClick={switchCamera}
          className="absolute top-4 left-4 text-white hover:bg-white/20"
          disabled={isInitializing}
        >
          <FlipHorizontal2 className="h-6 w-6" />
        </Button>
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
              className="h-12 w-12 text-white hover:bg-white/20"
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
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-white/20 hover:bg-white/30',
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
