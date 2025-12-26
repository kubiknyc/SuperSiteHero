/**
 * Recording Playback Component
 * Video/audio player with custom controls and transcription sync
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Loader2,
  AlertCircle,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useRecordingUrl } from '../hooks/useMeetingRecordings';
import type { MeetingRecording } from '@/types/meeting-recordings';
import { logger } from '../../../lib/utils/logger';


interface RecordingPlaybackProps {
  recording: MeetingRecording;
  onTimeUpdate?: (currentTime: number) => void;
  seekToTime?: number | null;
  className?: string;
}

export function RecordingPlayback({
  recording,
  onTimeUpdate,
  seekToTime,
  className = '',
}: RecordingPlaybackProps) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  const { data: signedUrl, isLoading: isLoadingUrl, error: urlError } = useRecordingUrl(recording);

  const isVideo = recording.recording_type === 'video' || recording.recording_type === 'screen';

  // Handle seek from external component
  useEffect(() => {
    if (seekToTime !== null && seekToTime !== undefined && mediaRef.current) {
      mediaRef.current.currentTime = seekToTime / 1000; // Convert ms to seconds
      if (!isPlaying) {
        mediaRef.current.play();
        setIsPlaying(true);
      }
    }
  }, [seekToTime, isPlaying]);

  // Media event handlers
  const handleLoadedMetadata = useCallback(() => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration);
      setIsLoading(false);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (mediaRef.current) {
      const time = mediaRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time * 1000); // Convert to ms
    }
  }, [onTimeUpdate]);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);
  const handleEnded = useCallback(() => setIsPlaying(false), []);
  const handleError = useCallback(() => {
    setError('Failed to load media');
    setIsLoading(false);
  }, []);

  const handleWaiting = useCallback(() => setIsLoading(true), []);
  const handleCanPlay = useCallback(() => setIsLoading(false), []);

  // Control handlers
  const togglePlayPause = () => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play();
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = value[0];
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (mediaRef.current) {
      const newVolume = value[0];
      mediaRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (mediaRef.current) {
      mediaRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const skip = (seconds: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = Math.max(
        0,
        Math.min(mediaRef.current.currentTime + seconds, duration)
      );
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) {return;}

    if (!isFullscreen) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        logger.error('Fullscreen not supported');
      }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handlePlaybackRateChange = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];

    if (mediaRef.current) {
      mediaRef.current.playbackRate = newRate;
    }
    setPlaybackRate(newRate);
  };

  const handleDownload = async () => {
    if (!signedUrl) {return;}

    try {
      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = recording.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Download failed:', err);
    }
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) {return '0:00';}
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (isLoadingUrl) {
    return (
      <Card className={className}>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-disabled" />
        </CardContent>
      </Card>
    );
  }

  if (urlError || error) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="flex items-center gap-2 text-error">
            <AlertCircle className="h-5 w-5" />
            <span>{error || 'Failed to load recording'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const MediaElement = isVideo ? 'video' : 'audio';

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Recording Playback
            <Badge variant="outline" className="text-xs">
              {recording.recording_type}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleDownload} className="gap-1">
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div ref={containerRef} className="relative bg-black rounded-lg overflow-hidden">
          {/* Video/Audio Element */}
          {isVideo ? (
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              src={signedUrl}
              className="w-full aspect-video"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handleEnded}
              onError={handleError}
              onWaiting={handleWaiting}
              onCanPlay={handleCanPlay}
              playsInline
            />
          ) : (
            <div className="w-full py-12 px-8 flex items-center justify-center">
              <audio
                ref={mediaRef as React.RefObject<HTMLAudioElement>}
                src={signedUrl}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={handleEnded}
                onError={handleError}
                onWaiting={handleWaiting}
                onCanPlay={handleCanPlay}
              />
              {/* Audio visualization placeholder */}
              <div className="flex items-center gap-1">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 bg-blue-500 rounded-full transition-all duration-150 ${
                      isPlaying ? 'animate-pulse' : ''
                    }`}
                    style={{
                      height: isPlaying ? `${15 + Math.random() * 25}px` : '15px',
                      animationDelay: `${i * 80}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}

          {/* Large Play Button Overlay (video only) */}
          {isVideo && !isPlaying && !isLoading && (
            <button
              onClick={togglePlayPause}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-card/90 flex items-center justify-center">
                <Play className="h-8 w-8 text-foreground ml-1" />
              </div>
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => skip(-10)} title="Back 10s">
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlayPause}
              className="h-10 w-10 p-0"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>

            <Button variant="ghost" size="sm" onClick={() => skip(10)} title="Forward 10s">
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Playback Speed */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlaybackRateChange}
              className="text-xs font-mono"
              title="Playback speed"
            >
              {playbackRate}x
            </Button>

            {/* Volume */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={toggleMute}>
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="w-20"
              />
            </div>

            {/* Fullscreen (video only) */}
            {isVideo && (
              <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Duration Info */}
        {recording.duration_seconds && (
          <p className="text-xs text-muted text-center">
            Total Duration: {formatTime(recording.duration_seconds)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
