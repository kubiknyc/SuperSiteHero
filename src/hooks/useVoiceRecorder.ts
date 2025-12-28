/**
 * Voice Recorder Hook
 *
 * Records audio messages for playback in the messaging system.
 * Uses MediaRecorder API for efficient audio capture.
 *
 * Features:
 * - Max recording duration (configurable, default 2 minutes)
 * - Audio level visualization
 * - Recording state management
 * - Blob output for upload to Supabase Storage
 */

import { useState, useRef, useCallback, useEffect } from 'react'

export interface VoiceRecorderOptions {
  /** Maximum recording duration in seconds (default: 120) */
  maxDuration?: number
  /** Audio MIME type (default: audio/webm) */
  mimeType?: string
  /** Called when recording is complete with the audio blob */
  onRecordingComplete?: (blob: Blob, duration: number) => void
  /** Called when an error occurs */
  onError?: (error: Error) => void
  /** Called with audio level (0-1) during recording */
  onAudioLevel?: (level: number) => void
}

export interface VoiceRecorderState {
  /** Whether we're currently recording */
  isRecording: boolean
  /** Recording duration in seconds */
  duration: number
  /** Whether browser supports audio recording */
  isSupported: boolean
  /** Current audio level (0-1) for visualization */
  audioLevel: number
  /** Error message if recording failed */
  error: string | null
  /** Whether permission is granted */
  hasPermission: boolean | null
}

export interface VoiceRecorderActions {
  /** Start recording */
  startRecording: () => Promise<void>
  /** Stop recording and get the audio blob */
  stopRecording: () => void
  /** Cancel recording without saving */
  cancelRecording: () => void
  /** Request microphone permission */
  requestPermission: () => Promise<boolean>
}

// Check if MediaRecorder is supported
const isMediaRecorderSupported = (): boolean => {
  return typeof window !== 'undefined' && 'MediaRecorder' in window
}

// Get supported MIME type
const getSupportedMimeType = (): string => {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }

  return 'audio/webm' // Fallback
}

export function useVoiceRecorder(
  options: VoiceRecorderOptions = {}
): VoiceRecorderState & VoiceRecorderActions {
  const {
    maxDuration = 120,
    mimeType = getSupportedMimeType(),
    onRecordingComplete,
    onError,
    onAudioLevel,
  } = options

  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const isSupported = isMediaRecorderSupported()

  // Clean up resources
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    analyserRef.current = null
    mediaRecorderRef.current = null
    audioChunksRef.current = []
  }, [])

  // Request microphone permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Audio recording not supported in this browser')
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      setHasPermission(true)
      setError(null)
      return true
    } catch (err) {
      setHasPermission(false)
      const errorMessage =
        err instanceof Error ? err.message : 'Microphone permission denied'
      setError(errorMessage)
      onError?.(new Error(errorMessage))
      return false
    }
  }, [isSupported, onError])

  // Analyze audio level for visualization - use ref to avoid circular dependency
  const analyzeAudioLevelRef = useRef<() => void>()

  useEffect(() => {
    analyzeAudioLevelRef.current = () => {
      if (!analyserRef.current) {return}

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(dataArray)

      // Calculate average level
      const sum = dataArray.reduce((acc, val) => acc + val, 0)
      const average = sum / dataArray.length / 255 // Normalize to 0-1

      setAudioLevel(average)
      onAudioLevel?.(average)

      animationFrameRef.current = requestAnimationFrame(() => analyzeAudioLevelRef.current?.())
    }
  }, [onAudioLevel])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Audio recording not supported')
      return
    }

    if (isRecording) {return}

    try {
      setError(null)
      audioChunksRef.current = []

      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      streamRef.current = stream
      setHasPermission(true)

      // Set up audio analyzer for level visualization
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const recordingDuration = Math.floor(
          (Date.now() - startTimeRef.current) / 1000
        )

        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
          onRecordingComplete?.(audioBlob, recordingDuration)
        }

        cleanup()
        setIsRecording(false)
        setDuration(0)
        setAudioLevel(0)
      }

      recorder.onerror = (_event) => {
        const errorMessage = 'Recording error occurred'
        setError(errorMessage)
        onError?.(new Error(errorMessage))
        cleanup()
        setIsRecording(false)
      }

      // Start recording
      recorder.start(100) // Collect data every 100ms
      startTimeRef.current = Date.now()
      setIsRecording(true)

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDuration(elapsed)

        // Auto-stop at max duration
        if (elapsed >= maxDuration) {
          stopRecording()
        }
      }, 1000)

      // Start audio level analysis
      animationFrameRef.current = requestAnimationFrame(() => analyzeAudioLevelRef.current?.())
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
    mimeType,
    maxDuration,
    onRecordingComplete,
    onError,
    cleanup,
    stopRecording,
  ])

  // Cancel recording without saving
  const cancelRecording = useCallback(() => {
    audioChunksRef.current = []
    cleanup()
    setIsRecording(false)
    setDuration(0)
    setAudioLevel(0)
  }, [cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    // State
    isRecording,
    duration,
    isSupported,
    audioLevel,
    error,
    hasPermission,
    // Actions
    startRecording,
    stopRecording,
    cancelRecording,
    requestPermission,
  }
}

/**
 * Format recording duration for display
 */
export function formatRecordingDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default useVoiceRecorder
