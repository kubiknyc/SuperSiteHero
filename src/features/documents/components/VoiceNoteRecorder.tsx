/**
 * VoiceNoteRecorder Component
 *
 * Record audio annotations attached to markups with transcription support.
 * Mobile-first design optimized for field use.
 *
 * Features:
 * - Record audio annotations attached to markups
 * - Playback controls on markup
 * - Transcription support using Web Speech API
 * - Visual indicator for markups with voice notes
 * - Duration display
 * - Download audio option
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Trash2,
  Download,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle,
  FileAudio,
  Clock,
  Check,
  X,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
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
import type { VoiceNote, VoiceNoteRecordingState } from '../types/markup'

// =============================================
// Types
// =============================================

interface VoiceNoteRecorderProps {
  /** Markup ID to attach voice note to */
  markupId: string
  /** Existing voice notes for this markup */
  voiceNotes?: VoiceNote[]
  /** Called when a voice note is recorded */
  onRecord?: (audioBlob: Blob, duration: number, transcription?: string) => void
  /** Called when a voice note is deleted */
  onDelete?: (voiceNoteId: string) => void
  /** Called when transcription is requested */
  onTranscribe?: (voiceNoteId: string) => void
  /** Read-only mode */
  readOnly?: boolean
  /** Compact mode for inline display */
  compact?: boolean
  /** Optional class name */
  className?: string
}

interface VoiceNotePlayerProps {
  voiceNote: VoiceNote
  onDelete?: () => void
  onTranscribe?: () => void
  readOnly?: boolean
  compact?: boolean
}

// =============================================
// Helper Functions
// =============================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// =============================================
// Audio Visualizer Component
// =============================================

interface AudioVisualizerProps {
  audioLevel: number
  isRecording: boolean
}

function AudioVisualizer({ audioLevel, isRecording }: AudioVisualizerProps) {
  const bars = 12
  const normalizedLevel = Math.min(audioLevel / 128, 1) // Normalize 0-128 to 0-1

  return (
    <div className="flex items-end justify-center gap-0.5 h-8">
      {Array.from({ length: bars }).map((_, i) => {
        // Create a wave-like pattern
        const baseHeight = Math.sin((i / bars) * Math.PI) * 0.5 + 0.5
        const animatedHeight = isRecording
          ? baseHeight * normalizedLevel + 0.1
          : 0.1

        return (
          <div
            key={i}
            className={cn(
              'w-1 rounded-full transition-all duration-75',
              isRecording ? 'bg-red-500' : 'bg-gray-300'
            )}
            style={{
              height: `${animatedHeight * 100}%`,
              minHeight: '4px',
            }}
          />
        )
      })}
    </div>
  )
}

// =============================================
// Voice Note Player Component
// =============================================

function VoiceNotePlayer({
  voiceNote,
  onDelete,
  onTranscribe,
  readOnly,
  compact,
}: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)

  const progress = voiceNote.duration > 0 ? (currentTime / voiceNote.duration) * 100 : 0

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {return}

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [])

  const togglePlay = useCallback(() => {
    if (!audioRef.current) {return}

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
  }, [isPlaying])

  const handleSeek = useCallback((value: number[]) => {
    if (!audioRef.current) {return}
    const newTime = (value[0] / 100) * voiceNote.duration
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }, [voiceNote.duration])

  const skipBackward = useCallback(() => {
    if (!audioRef.current) {return}
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5)
  }, [])

  const skipForward = useCallback(() => {
    if (!audioRef.current) {return}
    audioRef.current.currentTime = Math.min(
      voiceNote.duration,
      audioRef.current.currentTime + 5
    )
  }, [voiceNote.duration])

  const toggleMute = useCallback(() => {
    if (!audioRef.current) {return}
    audioRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }, [isMuted])

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={togglePlay}
              className={cn(
                'p-1.5 rounded-full transition-colors',
                isPlaying
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              )}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{formatDuration(voiceNote.duration)} voice note</p>
          </TooltipContent>
        </Tooltip>
        <audio ref={audioRef} src={voiceNote.audioUrl} preload="metadata" />
      </TooltipProvider>
    )
  }

  return (
    <div className="bg-muted/50 rounded-lg p-3 space-y-3">
      <audio ref={audioRef} src={voiceNote.audioUrl} preload="metadata" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileAudio className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Voice Note</span>
          {voiceNote.transcription && (
            <Badge variant="secondary" className="text-xs">
              Transcribed
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!readOnly && onTranscribe && !voiceNote.transcription && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={onTranscribe}
            >
              Transcribe
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 px-2" asChild>
            <a href={voiceNote.audioUrl} download={voiceNote.fileName || 'voice-note.webm'}>
              <Download className="w-3.5 h-3.5" />
            </a>
          </Button>
          {!readOnly && onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={skipBackward}
        >
          <SkipBack className="w-4 h-4" />
        </Button>

        <Button
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={skipForward}
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <Slider
          value={[progress]}
          max={100}
          step={0.1}
          onValueChange={handleSeek}
          className="cursor-pointer"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(voiceNote.duration)}</span>
        </div>
      </div>

      {/* Volume control */}
      <div className="flex items-center justify-between">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={toggleMute}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </Button>
        <span className="text-xs text-muted-foreground">
          {formatDate(voiceNote.createdAt)}
        </span>
      </div>

      {/* Transcription */}
      {voiceNote.transcription && (
        <div className="pt-2 border-t">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="text-sm text-primary hover:underline"
          >
            {showTranscript ? 'Hide' : 'Show'} transcription
          </button>
          {showTranscript && (
            <p className="mt-2 text-sm text-muted-foreground italic">
              "{voiceNote.transcription}"
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================
// Recording Dialog Component
// =============================================

interface RecordingDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (audioBlob: Blob, duration: number, transcription?: string) => void
}

function RecordingDialog({ isOpen, onClose, onSave }: RecordingDialogProps) {
  const [state, setState] = useState<VoiceNoteRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0,
  })
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [transcription, setTranscription] = useState<string>('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<any>(null)

  const MAX_DURATION = 300 // 5 minutes max

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setAudioBlob(null)
      setPreviewUrl(null)
      setTranscription('')
      setError(null)
      setState({
        isRecording: false,
        isPaused: false,
        duration: 0,
        audioLevel: 0,
      })
    }
  }, [isOpen])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      audioChunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Set up audio analysis for visualization
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        setPreviewUrl(URL.createObjectURL(blob))

        // Cleanup
        stream.getTracks().forEach((track) => track.stop())
        audioContext.close()
      }

      mediaRecorder.start(100) // Collect data every 100ms

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setState((prev) => {
          if (prev.duration >= MAX_DURATION) {
            stopRecording()
            return prev
          }
          return { ...prev, duration: prev.duration + 1 }
        })
      }, 1000)

      // Start audio level visualization
      const updateAudioLevel = () => {
        if (!analyserRef.current) {return}

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length

        setState((prev) => ({ ...prev, audioLevel: average }))
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
      }
      updateAudioLevel()

      // Try to start speech recognition for live transcription
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition =
          (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'

        recognition.onresult = (event: any) => {
          let finalTranscript = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript
            }
          }
          if (finalTranscript) {
            setTranscription((prev) => prev + ' ' + finalTranscript)
          }
        }

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error)
        }

        try {
          recognition.start()
          recognitionRef.current = recognition
          setIsTranscribing(true)
        } catch (e) {
          console.warn('Could not start speech recognition:', e)
        }
      }

      setState((prev) => ({ ...prev, isRecording: true }))
    } catch (err) {
      console.error('Failed to start recording:', err)
      setError('Could not access microphone. Please check permissions.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    // Stop duration counter
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    // Stop audio visualization
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
      setIsTranscribing(false)
    }

    setState((prev) => ({ ...prev, isRecording: false, isPaused: false }))
  }, [])

  const handleSave = useCallback(() => {
    if (!audioBlob) {return}

    onSave(
      audioBlob,
      state.duration,
      transcription.trim() || undefined
    )
    onClose()
  }, [audioBlob, state.duration, transcription, onSave, onClose])

  const handleDiscard = useCallback(() => {
    stopRecording()
    setAudioBlob(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setTranscription('')
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioLevel: 0,
    })
  }, [previewUrl, stopRecording])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Voice Note
          </DialogTitle>
          <DialogDescription>
            Record an audio annotation for this markup
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Recording visualization */}
          <div className="flex flex-col items-center gap-4">
            {/* Record button */}
            <button
              onClick={state.isRecording ? stopRecording : startRecording}
              disabled={!!audioBlob}
              className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center transition-all',
                'focus:outline-none focus:ring-4 focus:ring-offset-2',
                state.isRecording
                  ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500/50 animate-pulse'
                  : audioBlob
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90 focus:ring-primary/50'
              )}
            >
              {state.isRecording ? (
                <Square className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </button>

            {/* Audio visualizer */}
            {state.isRecording && (
              <AudioVisualizer
                audioLevel={state.audioLevel}
                isRecording={state.isRecording}
              />
            )}

            {/* Duration display */}
            <div className="flex items-center gap-2 text-lg font-mono">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span
                className={cn(
                  state.isRecording && 'text-red-500'
                )}
              >
                {formatDuration(state.duration)}
              </span>
              <span className="text-sm text-muted-foreground">
                / {formatDuration(MAX_DURATION)}
              </span>
            </div>

            {/* Transcription indicator */}
            {isTranscribing && (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Transcribing...
              </Badge>
            )}
          </div>

          {/* Preview player */}
          {previewUrl && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Preview</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDiscard}
                  className="h-7 text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Discard
                </Button>
              </div>
              <audio src={previewUrl} controls className="w-full" />
            </div>
          )}

          {/* Live transcription */}
          {transcription && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">Transcription</span>
                {isTranscribing && (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
              </div>
              <p className="text-sm text-muted-foreground italic">
                "{transcription.trim()}"
              </p>
            </div>
          )}

          {/* Instructions */}
          {!state.isRecording && !audioBlob && (
            <p className="text-sm text-center text-muted-foreground">
              Tap the microphone to start recording.
              {('webkitSpeechRecognition' in window ||
                'SpeechRecognition' in window) &&
                ' Speech will be transcribed automatically.'}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!audioBlob}
          >
            <Check className="w-4 h-4 mr-2" />
            Save Voice Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================
// Main Component
// =============================================

export function VoiceNoteRecorder({
  markupId,
  voiceNotes = [],
  onRecord,
  onDelete,
  onTranscribe,
  readOnly = false,
  compact = false,
  className,
}: VoiceNoteRecorderProps) {
  const [showRecordDialog, setShowRecordDialog] = useState(false)

  const handleRecord = useCallback(
    (audioBlob: Blob, duration: number, transcription?: string) => {
      if (onRecord) {
        onRecord(audioBlob, duration, transcription)
      }
    },
    [onRecord]
  )

  const hasVoiceNotes = voiceNotes.length > 0

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {/* Show existing voice notes */}
        {voiceNotes.map((note) => (
          <VoiceNotePlayer
            key={note.id}
            voiceNote={note}
            onDelete={onDelete ? () => onDelete(note.id) : undefined}
            readOnly={readOnly}
            compact
          />
        ))}

        {/* Add voice note button */}
        {!readOnly && onRecord && (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowRecordDialog(true)}
                    className="p-1.5 rounded-full bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add voice note</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <RecordingDialog
              isOpen={showRecordDialog}
              onClose={() => setShowRecordDialog(false)}
              onSave={handleRecord}
            />
          </>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Voice Notes</span>
          {hasVoiceNotes && (
            <Badge variant="secondary" className="text-xs">
              {voiceNotes.length}
            </Badge>
          )}
        </div>
        {!readOnly && onRecord && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRecordDialog(true)}
          >
            <Mic className="w-3.5 h-3.5 mr-1" />
            Record
          </Button>
        )}
      </div>

      {/* Voice notes list */}
      {hasVoiceNotes ? (
        <div className="space-y-2">
          {voiceNotes.map((note) => (
            <VoiceNotePlayer
              key={note.id}
              voiceNote={note}
              onDelete={onDelete ? () => onDelete(note.id) : undefined}
              onTranscribe={onTranscribe ? () => onTranscribe(note.id) : undefined}
              readOnly={readOnly}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <MicOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No voice notes</p>
          {!readOnly && onRecord && (
            <p className="text-xs mt-1">
              Click Record to add a voice annotation
            </p>
          )}
        </div>
      )}

      {/* Recording dialog */}
      <RecordingDialog
        isOpen={showRecordDialog}
        onClose={() => setShowRecordDialog(false)}
        onSave={handleRecord}
      />
    </div>
  )
}

// =============================================
// Voice Note Indicator (for markup overlays)
// =============================================

interface VoiceNoteIndicatorProps {
  voiceNotes: VoiceNote[]
  onClick?: () => void
  className?: string
}

export function VoiceNoteIndicator({
  voiceNotes,
  onClick,
  className,
}: VoiceNoteIndicatorProps) {
  if (voiceNotes.length === 0) {return null}

  const totalDuration = voiceNotes.reduce((acc, note) => acc + note.duration, 0)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full',
              'bg-primary/10 text-primary hover:bg-primary/20 transition-colors',
              className
            )}
          >
            <Volume2 className="w-3 h-3" />
            <span className="text-xs font-medium">
              {voiceNotes.length > 1 ? `${voiceNotes.length}` : formatDuration(totalDuration)}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {voiceNotes.length} voice note{voiceNotes.length !== 1 ? 's' : ''} (
            {formatDuration(totalDuration)} total)
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default VoiceNoteRecorder
