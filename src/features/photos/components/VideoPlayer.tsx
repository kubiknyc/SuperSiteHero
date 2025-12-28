/**
 * VideoPlayer Component
 *
 * Video playback component using Video.js with:
 * - Responsive design
 * - Touch-friendly controls
 * - Poster/thumbnail support
 * - Multiple format support
 * - Playback rate control
 * - Fullscreen support
 *
 * Built for construction site documentation viewing.
 */

import { useRef, useEffect, useCallback, useState } from 'react'
import videojs from 'video.js'
import type Player from 'video.js/dist/types/player'
import 'video.js/dist/video-js.css'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Download,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { formatVideoDuration } from '@/hooks/useVideoRecorder'

export interface VideoPlayerProps {
  /** Video source URL */
  src: string
  /** Video MIME type */
  type?: string
  /** Poster image URL */
  poster?: string
  /** Video title for accessibility */
  title?: string
  /** Auto-play video */
  autoplay?: boolean
  /** Loop video */
  loop?: boolean
  /** Mute video */
  muted?: boolean
  /** Show controls */
  controls?: boolean
  /** Enable download button */
  enableDownload?: boolean
  /** Additional CSS classes */
  className?: string
  /** Called when video starts playing */
  onPlay?: () => void
  /** Called when video is paused */
  onPause?: () => void
  /** Called when video ends */
  onEnded?: () => void
  /** Called when video time updates */
  onTimeUpdate?: (currentTime: number, duration: number) => void
  /** Called on error */
  onError?: (error: Error) => void
  /** Use native controls instead of custom */
  useNativeControls?: boolean
  /** Width constraint */
  width?: number | string
  /** Height constraint */
  height?: number | string
  /** Object fit style */
  objectFit?: 'contain' | 'cover' | 'fill'
}

export function VideoPlayer({
  src,
  type = 'video/mp4',
  poster,
  title,
  autoplay = false,
  loop = false,
  muted = false,
  controls = true,
  enableDownload = false,
  className,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onError,
  useNativeControls = false,
  width,
  height,
  objectFit = 'contain',
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const playerRef = useRef<Player | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(muted)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null)

  // Initialize Video.js player
  useEffect(() => {
    if (!videoRef.current) {return}

    const player = videojs(videoRef.current, {
      autoplay,
      controls: useNativeControls,
      loop,
      muted,
      poster,
      preload: 'auto',
      responsive: true,
      fluid: true,
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      sources: [{ src, type }],
      html5: {
        vhs: {
          overrideNative: true,
        },
        nativeVideoTracks: false,
        nativeAudioTracks: false,
        nativeTextTracks: false,
      },
    })

    playerRef.current = player

    // Event listeners
    player.on('play', () => {
      setTimeout(() => {
        setIsPlaying(true)
      }, 0)
      onPlay?.()
    })

    player.on('pause', () => {
      setTimeout(() => {
        setIsPlaying(false)
      }, 0)
      onPause?.()
    })

    player.on('ended', () => {
      setTimeout(() => {
        setIsPlaying(false)
      }, 0)
      onEnded?.()
    })

    player.on('timeupdate', () => {
      const current = player.currentTime() || 0
      const dur = player.duration() || 0
      setTimeout(() => {
        setCurrentTime(current)
        setDuration(dur)
      }, 0)
      onTimeUpdate?.(current, dur)
    })

    player.on('loadedmetadata', () => {
      setTimeout(() => {
        setDuration(player.duration() || 0)
        setIsLoading(false)
      }, 0)
    })

    player.on('waiting', () => {
      setTimeout(() => {
        setIsLoading(true)
      }, 0)
    })

    player.on('playing', () => {
      setTimeout(() => {
        setIsLoading(false)
      }, 0)
    })

    player.on('error', () => {
      const error = player.error()
      onError?.(new Error(error?.message || 'Video playback error'))
    })

    player.on('volumechange', () => {
      setTimeout(() => {
        setVolume(player.volume() || 0)
        setIsMuted(player.muted() || false)
      }, 0)
    })

    player.on('ratechange', () => {
      setTimeout(() => {
        setPlaybackRate(player.playbackRate() || 1)
      }, 0)
    })

    // Fullscreen change
    player.on('fullscreenchange', () => {
      setTimeout(() => {
        setIsFullscreen(player.isFullscreen() || false)
      }, 0)
    })

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose()
        playerRef.current = null
      }
    }
  }, [src, type, autoplay, loop, muted, poster, useNativeControls, onPlay, onPause, onEnded, onTimeUpdate, onError])

  // Update source when src changes
  useEffect(() => {
    if (playerRef.current) {
      setTimeout(() => {
        if (playerRef.current) {
          playerRef.current.src({ src, type })
        }
      }, 0)
    }
  }, [src, type])

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current)
    }
    setTimeout(() => {
      setShowControls(true)
    }, 0)

    if (isPlaying) {
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }, [isPlaying])

  useEffect(() => {
    resetControlsTimeout()
    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current)
      }
    }
  }, [isPlaying, resetControlsTimeout])

  // Control handlers
  const togglePlay = useCallback(() => {
    if (!playerRef.current) {return}

    if (isPlaying) {
      playerRef.current.pause()
    } else {
      playerRef.current.play()
    }
  }, [isPlaying])

  const toggleMute = useCallback(() => {
    if (!playerRef.current) {return}
    playerRef.current.muted(!isMuted)
  }, [isMuted])

  const handleVolumeChange = useCallback((value: number[]) => {
    if (!playerRef.current) {return}
    const vol = value[0]
    playerRef.current.volume(vol)
    if (vol > 0 && isMuted) {
      playerRef.current.muted(false)
    }
  }, [isMuted])

  const handleSeek = useCallback((value: number[]) => {
    if (!playerRef.current) {return}
    playerRef.current.currentTime(value[0])
  }, [])

  const handlePlaybackRateChange = useCallback((rate: number) => {
    if (!playerRef.current) {return}
    playerRef.current.playbackRate(rate)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!playerRef.current) {return}

    if (isFullscreen) {
      playerRef.current.exitFullscreen()
    } else {
      playerRef.current.requestFullscreen()
    }
  }, [isFullscreen])

  const handleRestart = useCallback(() => {
    if (!playerRef.current) {return}
    playerRef.current.currentTime(0)
    playerRef.current.play()
  }, [])

  const handleDownload = useCallback(() => {
    const link = document.createElement('a')
    link.href = src
    link.download = title || 'video'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [src, title])

  // If using native controls, render simple video element
  if (useNativeControls) {
    return (
      <div
        className={cn('video-player-container', className)}
        style={{ width, height }}
      >
        <div data-vjs-player>
          <video
            ref={videoRef}
            className={cn(
              'video-js vjs-default-skin vjs-big-play-centered',
              objectFit === 'cover' && 'vjs-fill',
              objectFit === 'contain' && 'vjs-fluid'
            )}
            playsInline
            title={title}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'video-player-container relative bg-black rounded-lg overflow-hidden group',
        className
      )}
      style={{ width, height }}
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
    >
      {/* Video element */}
      <div data-vjs-player className="h-full">
        <video
          ref={videoRef}
          className={cn(
            'video-js vjs-default-skin',
            'w-full h-full',
            objectFit === 'cover' && 'object-cover',
            objectFit === 'contain' && 'object-contain',
            objectFit === 'fill' && 'object-fill'
          )}
          playsInline
          title={title}
          onClick={togglePlay}
        />
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent" />
        </div>
      )}

      {/* Play button overlay (when paused) */}
      {!isPlaying && !isLoading && controls && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
        >
          <div className="w-20 h-20 rounded-full bg-card/90 flex items-center justify-center">
            <Play className="h-10 w-10 text-black ml-1" />
          </div>
        </button>
      )}

      {/* Custom controls */}
      {controls && !useNativeControls && (
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 p-4',
            'bg-gradient-to-t from-black/80 to-transparent',
            'transition-opacity duration-300',
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          {/* Progress bar */}
          <div className="mb-3">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-white/70 text-xs mt-1">
              <span>{formatVideoDuration(Math.floor(currentTime))}</span>
              <span>{formatVideoDuration(Math.floor(duration))}</span>
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="text-white hover:bg-card/20"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>

              {/* Restart */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRestart}
                className="text-white hover:bg-card/20"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:bg-card/20"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-20 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Settings (playback rate) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-card/20"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Playback Speed</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <DropdownMenuItem
                      key={rate}
                      onClick={() => handlePlaybackRateChange(rate)}
                      className={cn(
                        'cursor-pointer',
                        playbackRate === rate && 'bg-accent'
                      )}
                    >
                      {rate === 1 ? 'Normal' : `${rate}x`}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Download */}
              {enableDownload && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDownload}
                  className="text-white hover:bg-card/20"
                >
                  <Download className="h-5 w-5" />
                </Button>
              )}

              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-card/20"
              >
                {isFullscreen ? (
                  <Minimize className="h-5 w-5" />
                ) : (
                  <Maximize className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Simple video player without Video.js (lighter weight)
 */
export function SimpleVideoPlayer({
  src,
  poster,
  className,
  controls = true,
  autoPlay = false,
  loop = false,
  muted = false,
  onPlay,
  onPause,
  onEnded,
}: Omit<VideoPlayerProps, 'type' | 'useNativeControls' | 'enableDownload'>) {
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      controls={controls}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      playsInline
      className={cn('w-full h-full object-contain', className)}
      onPlay={onPlay}
      onPause={onPause}
      onEnded={onEnded}
    />
  )
}

export default VideoPlayer
