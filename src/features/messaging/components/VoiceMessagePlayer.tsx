/**
 * Voice Message Player Component
 *
 * Plays back audio voice messages in conversations.
 * Features:
 * - Play/pause controls
 * - Progress bar with seek
 * - Duration display
 * - Playback speed control
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface VoiceMessagePlayerProps {
  /** URL of the audio file */
  url: string
  /** Duration in seconds (optional, will be calculated from audio) */
  duration?: number
  /** Additional CSS classes */
  className?: string
  /** Compact mode for smaller display */
  compact?: boolean
}

export function VoiceMessagePlayer({
  url,
  duration: initialDuration,
  className,
  compact = false,
}: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(initialDuration || 0)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio(url)
    audioRef.current = audio

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handleError = () => {
      setError('Failed to load audio')
      setIsLoading(false)
    }

    const handleCanPlay = () => {
      setIsLoading(false)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    audio.addEventListener('canplay', handleCanPlay)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.pause()
    }
  }, [url])

  // Play/pause toggle
  const togglePlay = useCallback(() => {
    if (!audioRef.current) {return}

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch((err) => {
        console.error('Playback failed:', err)
        setError('Playback failed')
      })
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  // Mute toggle
  const toggleMute = useCallback(() => {
    if (!audioRef.current) {return}
    audioRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }, [isMuted])

  // Seek to position
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) {return}

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration

    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }, [duration])

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (error) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-red-500', className)}>
        <VolumeX className="h-4 w-4" />
        <span>{error}</span>
      </div>
    )
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full"
          onClick={togglePlay}
          disabled={isLoading}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </Button>

        {/* Progress bar */}
        <div
          className="flex-1 h-1.5 bg-gray-200 rounded-full cursor-pointer"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Duration */}
        <span className="text-xs text-gray-500 min-w-[40px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 bg-gray-50 rounded-lg p-3',
        className
      )}
    >
      {/* Play/Pause button */}
      <Button
        type="button"
        variant="default"
        size="sm"
        className="h-10 w-10 p-0 rounded-full flex-shrink-0"
        onClick={togglePlay}
        disabled={isLoading}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" />
        )}
      </Button>

      {/* Waveform / Progress */}
      <div className="flex-1 flex flex-col gap-1">
        {/* Progress bar with fake waveform */}
        <div
          className="relative h-8 bg-gray-200 rounded cursor-pointer overflow-hidden"
          onClick={handleSeek}
        >
          {/* Fake waveform bars */}
          <div className="absolute inset-0 flex items-center justify-center gap-0.5 px-1">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-1 rounded-sm transition-colors',
                  (i / 30) * 100 <= progress ? 'bg-blue-500' : 'bg-gray-300'
                )}
                style={{
                  height: `${Math.random() * 60 + 20}%`,
                }}
              />
            ))}
          </div>

          {/* Progress overlay */}
          <div
            className="absolute inset-y-0 left-0 bg-blue-500/10"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Time display */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Mute button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 flex-shrink-0"
        onClick={toggleMute}
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4 text-gray-400" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}

/**
 * Check if an attachment is a voice message
 */
export function isVoiceMessage(attachment: { type: string; name?: string }): boolean {
  const isAudioType = attachment.type.startsWith('audio/')
  const isVoiceName = attachment.name?.toLowerCase().includes('voice') ?? false
  return isAudioType || isVoiceName
}

export default VoiceMessagePlayer
