/**
 * Video Recorder Hook
 *
 * Records video using MediaRecorder API with support for:
 * - Multiple video formats (webm, mp4)
 * - Configurable quality and resolution
 * - Recording duration limits
 * - Progress tracking
 * - Camera switching (front/back)
 *
 * Designed for mobile-first usage on construction sites.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { logger } from '../lib/utils/logger';


export interface VideoRecorderOptions {
  /** Maximum recording duration in seconds (default: 120) */
  maxDuration?: number
  /** Video MIME type (default: video/webm or video/mp4) */
  mimeType?: string
  /** Video bits per second (default: 2500000 = 2.5 Mbps) */
  videoBitsPerSecond?: number
  /** Audio bits per second (default: 128000 = 128 Kbps) */
  audioBitsPerSecond?: number
  /** Preferred video width */
  videoWidth?: number
  /** Preferred video height */
  videoHeight?: number
  /** Called when recording is complete with the video blob */
  onRecordingComplete?: (blob: Blob, duration: number) => void
  /** Called when an error occurs */
  onError?: (error: Error) => void
  /** Called with current duration during recording */
  onProgress?: (duration: number) => void
}

export interface VideoRecorderState {
  /** Whether we're currently recording */
  isRecording: boolean
  /** Whether recording is paused */
  isPaused: boolean
  /** Recording duration in seconds */
  duration: number
  /** Whether browser supports video recording */
  isSupported: boolean
  /** Error message if recording failed */
  error: string | null
  /** Whether permission is granted */
  hasPermission: boolean | null
  /** Current camera facing mode */
  facingMode: 'user' | 'environment'
  /** Preview stream for live preview */
  previewStream: MediaStream | null
  /** Whether camera is initializing */
  isInitializing: boolean
}

export interface VideoRecorderActions {
  /** Start recording */
  startRecording: () => Promise<void>
  /** Stop recording and get the video blob */
  stopRecording: () => void
  /** Pause recording */
  pauseRecording: () => void
  /** Resume recording */
  resumeRecording: () => void
  /** Cancel recording without saving */
  cancelRecording: () => void
  /** Request camera/microphone permission */
  requestPermission: () => Promise<boolean>
  /** Switch camera (front/back) */
  switchCamera: () => Promise<void>
  /** Initialize camera preview without recording */
  initializePreview: () => Promise<void>
  /** Stop preview */
  stopPreview: () => void
}

// Check if MediaRecorder is supported
const isMediaRecorderSupported = (): boolean => {
  return typeof window !== 'undefined' && 'MediaRecorder' in window
}

// Get supported MIME type for video
const getSupportedVideoMimeType = (): string => {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
    'video/mp4;codecs=h264,aac',
    'video/mp4',
  ]

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }

  return 'video/webm' // Fallback
}

// Get video file extension from MIME type
export function getVideoExtension(mimeType: string): string {
  if (mimeType.includes('mp4')) {return 'mp4'}
  if (mimeType.includes('webm')) {return 'webm'}
  if (mimeType.includes('quicktime')) {return 'mov'}
  return 'webm'
}

export function useVideoRecorder(
  options: VideoRecorderOptions = {}
): VideoRecorderState & VideoRecorderActions {
  const {
    maxDuration = 120,
    mimeType = getSupportedVideoMimeType(),
    videoBitsPerSecond = 2500000,
    audioBitsPerSecond = 128000,
    videoWidth = 1920,
    videoHeight = 1080,
    onRecordingComplete,
    onError,
    onProgress,
  } = options

  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const videoChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedDurationRef = useRef<number>(0)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const isSupported = isMediaRecorderSupported()

  // Clean up resources
  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    setPreviewStream(null)
    mediaRecorderRef.current = null
    videoChunksRef.current = []
    pausedDurationRef.current = 0
  }, [])

  // Get video constraints
  const getVideoConstraints = useCallback(() => {
    return {
      video: {
        facingMode,
        width: { ideal: videoWidth },
        height: { ideal: videoHeight },
        frameRate: { ideal: 30, max: 60 },
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    }
  }, [facingMode, videoWidth, videoHeight])

  // Request camera/microphone permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Video recording not supported in this browser')
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(getVideoConstraints())
      stream.getTracks().forEach((track) => track.stop())
      setHasPermission(true)
      setError(null)
      return true
    } catch (err) {
      setHasPermission(false)
      const errorMessage =
        err instanceof Error ? err.message : 'Camera/microphone permission denied'
      setError(errorMessage)
      onError?.(new Error(errorMessage))
      return false
    }
  }, [isSupported, getVideoConstraints, onError])

  // Initialize camera preview
  const initializePreview = useCallback(async () => {
    if (!isSupported) {
      setError('Video recording not supported')
      return
    }

    setIsInitializing(true)
    setError(null)

    try {
      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      const stream = await navigator.mediaDevices.getUserMedia(getVideoConstraints())
      streamRef.current = stream
      setPreviewStream(stream)
      setHasPermission(true)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to initialize camera'
      setError(errorMessage)
      onError?.(new Error(errorMessage))
      setHasPermission(false)
    } finally {
      setIsInitializing(false)
    }
  }, [isSupported, getVideoConstraints, onError])

  // Stop preview
  const stopPreview = useCallback(() => {
    if (streamRef.current && !isRecording) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setPreviewStream(null)
    }
  }, [isRecording])

  // Switch camera
  const switchCamera = useCallback(async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newFacingMode)

    // If preview is active, reinitialize with new camera
    if (previewStream) {
      // Stop current stream
      previewStream.getTracks().forEach((track) => track.stop())

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          ...getVideoConstraints(),
          video: {
            ...getVideoConstraints().video,
            facingMode: newFacingMode,
          },
        })
        streamRef.current = stream
        setPreviewStream(stream)

        // If recording, need to update MediaRecorder
        if (isRecording && mediaRecorderRef.current) {
          // Note: Switching camera during recording is complex
          // For simplicity, we'll stop and restart
          logger.warn('Camera switch during recording may cause issues')
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to switch camera'
        setError(errorMessage)
        onError?.(new Error(errorMessage))
      }
    }
  }, [facingMode, previewStream, getVideoConstraints, isRecording, onError])

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Video recording not supported')
      return
    }

    if (isRecording) {return}

    try {
      setError(null)
      videoChunksRef.current = []

      // Use existing stream or create new one
      let stream = streamRef.current
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia(getVideoConstraints())
        streamRef.current = stream
        setPreviewStream(stream)
      }

      setHasPermission(true)

      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond,
        audioBitsPerSecond,
      })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const recordingDuration = Math.floor(
          (Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000
        )

        if (videoChunksRef.current.length > 0) {
          const videoBlob = new Blob(videoChunksRef.current, { type: mimeType })
          onRecordingComplete?.(videoBlob, recordingDuration)
        }

        // Don't cleanup stream - keep preview active
        mediaRecorderRef.current = null
        videoChunksRef.current = []
        pausedDurationRef.current = 0

        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current)
          durationIntervalRef.current = null
        }

        setIsRecording(false)
        setIsPaused(false)
        setDuration(0)
      }

      recorder.onerror = () => {
        const errorMessage = 'Recording error occurred'
        setError(errorMessage)
        onError?.(new Error(errorMessage))
        cleanup()
        setIsRecording(false)
        setIsPaused(false)
      }

      // Start recording
      recorder.start(1000) // Collect data every second
      startTimeRef.current = Date.now()
      pausedDurationRef.current = 0
      setIsRecording(true)
      setIsPaused(false)

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        if (!isPaused) {
          const elapsed = Math.floor(
            (Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000
          )
          setDuration(elapsed)
          onProgress?.(elapsed)

          // Auto-stop at max duration
          if (elapsed >= maxDuration) {
            stopRecording()
          }
        }
      }, 1000)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to start recording'
      setError(errorMessage)
      onError?.(new Error(errorMessage))
      setHasPermission(false)
    }
  }, [
    isSupported,
    isRecording,
    isPaused,
    mimeType,
    videoBitsPerSecond,
    audioBitsPerSecond,
    maxDuration,
    getVideoConstraints,
    onRecordingComplete,
    onError,
    onProgress,
    cleanup,
  ])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
  }, [isRecording])

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      pausedDurationRef.current -= Date.now() // Store pause start time
    }
  }, [isRecording, isPaused])

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume()
      pausedDurationRef.current += Date.now() // Calculate paused duration
      setIsPaused(false)
    }
  }, [isRecording, isPaused])

  // Cancel recording without saving
  const cancelRecording = useCallback(() => {
    videoChunksRef.current = []

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    setIsRecording(false)
    setIsPaused(false)
    setDuration(0)
    pausedDurationRef.current = 0
  }, [isRecording])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    // State
    isRecording,
    isPaused,
    duration,
    isSupported,
    error,
    hasPermission,
    facingMode,
    previewStream,
    isInitializing,
    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    requestPermission,
    switchCamera,
    initializePreview,
    stopPreview,
  }
}

/**
 * Format recording duration for display
 */
export function formatVideoDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format video duration from milliseconds
 */
export function formatVideoDurationMs(ms: number): string {
  return formatVideoDuration(Math.floor(ms / 1000))
}

export default useVideoRecorder
