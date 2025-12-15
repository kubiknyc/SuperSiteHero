/**
 * Meeting Recorder Component
 * UI for recording meetings with audio/video/screen capture
 * Features pause/resume, preview, and upload progress
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Video,
  Monitor,
  Play,
  Pause,
  Square,
  X,
  Loader2,
  AlertCircle,
  Upload,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMeetingRecorder } from '../hooks/useMeetingRecorder';
import type { RecordingType, MeetingRecording } from '@/types/meeting-recordings';

interface MeetingRecorderProps {
  meetingId: string;
  projectId: string;
  companyId: string;
  onRecordingComplete?: (recording: MeetingRecording) => void;
}

const RECORDING_TYPES: { value: RecordingType; label: string; icon: React.ReactNode }[] = [
  { value: 'audio', label: 'Audio Only', icon: <Mic className="h-4 w-4" /> },
  { value: 'video', label: 'Camera + Audio', icon: <Video className="h-4 w-4" /> },
  { value: 'screen', label: 'Screen + Audio', icon: <Monitor className="h-4 w-4" /> },
];

export function MeetingRecorder({
  meetingId,
  projectId,
  companyId,
  onRecordingComplete,
}: MeetingRecorderProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<RecordingType>('audio');
  const [showConfirmStop, setShowConfirmStop] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const {
    state,
    stats,
    error,
    previewStream,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    uploadProgress,
    isUploading,
  } = useMeetingRecorder({
    meetingId,
    projectId,
    companyId,
    onRecordingComplete: (recording) => {
      setShowDialog(false);
      onRecordingComplete?.(recording);
    },
    onError: (err) => {
      console.error('Recording error:', err);
    },
  });

  // Connect preview stream to video element
  useEffect(() => {
    if (videoPreviewRef.current && previewStream) {
      videoPreviewRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  const handleStartRecording = async () => {
    setShowDialog(true);
    await startRecording({ type: selectedType });
  };

  const handleStopRecording = async () => {
    setShowConfirmStop(false);
    await stopRecording();
  };

  const handleCancel = () => {
    cancelRecording();
    setShowDialog(false);
    setShowConfirmStop(false);
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStateColor = (): string => {
    switch (state) {
      case 'recording':
        return 'bg-red-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'stopped':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const isRecordingActive = state === 'recording' || state === 'paused';

  return (
    <>
      {/* Recording Start Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Meeting Recording
          </CardTitle>
        </CardHeader>
        <CardContent>
          {state === 'idle' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Record this meeting with audio, video, or screen capture. Recordings can be
                transcribed automatically.
              </p>

              <div className="flex items-center gap-3">
                <Select
                  value={selectedType}
                  onValueChange={(value) => setSelectedType(value as RecordingType)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select recording type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECORDING_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          {type.icon}
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button onClick={handleStartRecording} className="gap-2">
                  <Mic className="h-4 w-4" />
                  Start Recording
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStateColor()} animate-pulse`} />
                <span className="font-medium">
                  {state === 'recording' && 'Recording...'}
                  {state === 'paused' && 'Paused'}
                  {state === 'stopped' && 'Processing...'}
                  {state === 'requesting' && 'Requesting access...'}
                </span>
                <span className="text-gray-600 font-mono">{formatDuration(stats.duration)}</span>
              </div>

              <Button variant="outline" size="sm" onClick={() => setShowDialog(true)}>
                View Recording
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recording Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => !isRecordingActive && setShowDialog(open)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {RECORDING_TYPES.find((t) => t.value === selectedType)?.icon}
              {RECORDING_TYPES.find((t) => t.value === selectedType)?.label} Recording
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Preview */}
            {(selectedType === 'video' || selectedType === 'screen') && previewStream && (
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
                {state === 'paused' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Badge variant="secondary" className="text-lg py-2 px-4">
                      Paused
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Audio-only visualization */}
            {selectedType === 'audio' && isRecordingActive && (
              <div className="bg-gray-900 rounded-lg p-8 flex items-center justify-center">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 bg-blue-500 rounded-full transition-all duration-150 ${
                        state === 'recording' ? 'animate-pulse' : ''
                      }`}
                      style={{
                        height: state === 'recording' ? `${20 + Math.random() * 30}px` : '20px',
                        animationDelay: `${i * 100}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getStateColor()}`} />
                  <span className="text-sm font-medium text-gray-700">
                    {state === 'recording' && 'Recording'}
                    {state === 'paused' && 'Paused'}
                    {state === 'stopped' && 'Stopped'}
                    {state === 'requesting' && 'Connecting...'}
                  </span>
                </div>
                <span className="text-2xl font-mono font-bold">{formatDuration(stats.duration)}</span>
              </div>

              <Badge variant="outline">{selectedType}</Badge>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Uploading recording...
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              {state === 'requesting' && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Requesting device access...</span>
                </div>
              )}

              {isRecordingActive && (
                <>
                  {state === 'recording' ? (
                    <Button variant="outline" size="lg" onClick={pauseRecording} className="gap-2">
                      <Pause className="h-5 w-5" />
                      Pause
                    </Button>
                  ) : (
                    <Button variant="outline" size="lg" onClick={resumeRecording} className="gap-2">
                      <Play className="h-5 w-5" />
                      Resume
                    </Button>
                  )}

                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={() => setShowConfirmStop(true)}
                    className="gap-2"
                  >
                    <Square className="h-5 w-5" />
                    Stop
                  </Button>
                </>
              )}

              {(state === 'idle' || state === 'error') && (
                <Button
                  size="lg"
                  onClick={() => startRecording({ type: selectedType })}
                  className="gap-2"
                >
                  <Mic className="h-5 w-5" />
                  Start Recording
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            {!isRecordingActive && !isUploading && (
              <Button variant="ghost" onClick={() => setShowDialog(false)}>
                Close
              </Button>
            )}
            {isRecordingActive && (
              <Button variant="ghost" onClick={handleCancel} className="gap-2">
                <X className="h-4 w-4" />
                Cancel Recording
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stop Confirmation Dialog */}
      <Dialog open={showConfirmStop} onOpenChange={setShowConfirmStop}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Stop Recording?</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Are you sure you want to stop the recording? The recording will be uploaded and can be
            transcribed.
          </p>
          <p className="text-sm text-gray-500">
            Duration: <span className="font-mono">{formatDuration(stats.duration)}</span>
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowConfirmStop(false)}>
              Continue Recording
            </Button>
            <Button variant="destructive" onClick={handleStopRecording} className="gap-2">
              <Square className="h-4 w-4" />
              Stop & Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
