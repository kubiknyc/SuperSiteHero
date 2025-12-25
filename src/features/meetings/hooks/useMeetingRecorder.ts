/**
 * Meeting Recorder Hook
 * Handles audio/video/screen recording with pause/resume and chunked upload
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import RecordRTC, { RecordRTCPromisesHandler } from 'recordrtc';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import type {
  RecordingType,
  RecorderState,
  RecorderConfig,
  RecorderStats,
  MeetingRecording,
  ChunkedUploadSession,
} from '@/types/meeting-recordings';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for upload
const STORAGE_BUCKET = 'meeting-recordings';

interface UseMeetingRecorderOptions {
  meetingId: string;
  projectId: string;
  companyId: string;
  onRecordingComplete?: (recording: MeetingRecording) => void;
  onError?: (error: Error) => void;
}

interface UseMeetingRecorderReturn {
  // State
  state: RecorderState;
  stats: RecorderStats;
  error: string | null;
  previewStream: MediaStream | null;

  // Actions
  startRecording: (config: RecorderConfig) => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<MeetingRecording | null>;
  cancelRecording: () => void;

  // Upload progress
  uploadProgress: number;
  isUploading: boolean;
}

export function useMeetingRecorder({
  meetingId,
  projectId,
  companyId,
  onRecordingComplete,
  onError,
}: UseMeetingRecorderOptions): UseMeetingRecorderReturn {
  const { user } = useAuth();
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState<RecorderStats>({
    duration: 0,
    fileSize: 0,
    isRecording: false,
    isPaused: false,
  });

  const recorderRef = useRef<RecordRTCPromisesHandler | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const lastPauseTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingConfigRef = useRef<RecorderConfig | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Update duration stats while recording
  const startDurationTimer = useCallback(() => {
    durationIntervalRef.current = setInterval(() => {
      if (state === 'recording') {
        const elapsed = Date.now() - startTimeRef.current - pausedDurationRef.current;
        setStats((prev) => ({
          ...prev,
          duration: Math.floor(elapsed / 1000),
          isRecording: true,
          isPaused: false,
        }));
      }
    }, 1000);
  }, [state]);

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  // Get media stream based on recording type
  const getMediaStream = useCallback(async (config: RecorderConfig): Promise<MediaStream> => {
    const { type } = config;

    try {
      if (type === 'audio') {
        return await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      if (type === 'video') {
        return await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: config.frameRate || 30 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      if (type === 'screen') {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: config.frameRate || 30 },
          },
          audio: true,
        });

        // Try to get microphone audio as well
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
            },
          });

          // Combine screen audio and microphone
          const audioContext = new AudioContext();
          const destination = audioContext.createMediaStreamDestination();

          const screenAudioTracks = screenStream.getAudioTracks();
          if (screenAudioTracks.length > 0) {
            const screenAudioSource = audioContext.createMediaStreamSource(
              new MediaStream(screenAudioTracks)
            );
            screenAudioSource.connect(destination);
          }

          const micSource = audioContext.createMediaStreamSource(micStream);
          micSource.connect(destination);

          // Create combined stream with screen video and mixed audio
          const combinedStream = new MediaStream([
            ...screenStream.getVideoTracks(),
            ...destination.stream.getAudioTracks(),
          ]);

          return combinedStream;
        } catch {
          // Fall back to screen stream only if microphone unavailable
          return screenStream;
        }
      }

      throw new Error(`Unsupported recording type: ${type}`);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Permission denied. Please allow access to recording devices.');
      }
      if (err.name === 'NotFoundError') {
        throw new Error('No recording device found. Please check your hardware.');
      }
      throw err;
    }
  }, []);

  // Get MIME type for recording
  const getMimeType = useCallback((config: RecorderConfig): string => {
    if (config.mimeType) {return config.mimeType;}

    if (config.type === 'audio') {
      // Prefer WebM for broader compatibility
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        return 'audio/webm;codecs=opus';
      }
      return 'audio/webm';
    }

    // Video/screen recording
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
      return 'video/webm;codecs=vp9,opus';
    }
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
      return 'video/webm;codecs=vp8,opus';
    }
    return 'video/webm';
  }, []);

  // Start recording
  const startRecording = useCallback(
    async (config: RecorderConfig): Promise<void> => {
      try {
        setState('requesting');
        setError(null);
        recordingConfigRef.current = config;

        const stream = await getMediaStream(config);
        streamRef.current = stream;
        setPreviewStream(stream);

        const mimeType = getMimeType(config);

        const recorder = new RecordRTCPromisesHandler(stream, {
          type: config.type === 'audio' ? 'audio' : 'video',
          mimeType: mimeType as any,
          audioBitsPerSecond: config.audioBitsPerSecond || 128000,
          videoBitsPerSecond: config.videoBitsPerSecond || 2500000,
          disableLogs: true,
        });

        recorderRef.current = recorder;

        await recorder.startRecording();

        startTimeRef.current = Date.now();
        pausedDurationRef.current = 0;

        setState('recording');
        setStats({
          duration: 0,
          fileSize: 0,
          isRecording: true,
          isPaused: false,
        });

        startDurationTimer();
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to start recording';
        setError(errorMessage);
        setState('error');
        onError?.(new Error(errorMessage));
      }
    },
    [getMediaStream, getMimeType, startDurationTimer, onError]
  );

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (recorderRef.current && state === 'recording') {
      recorderRef.current.pauseRecording();
      lastPauseTimeRef.current = Date.now();
      setState('paused');
      setStats((prev) => ({ ...prev, isPaused: true }));
      stopDurationTimer();
    }
  }, [state, stopDurationTimer]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (recorderRef.current && state === 'paused') {
      recorderRef.current.resumeRecording();
      pausedDurationRef.current += Date.now() - lastPauseTimeRef.current;
      setState('recording');
      setStats((prev) => ({ ...prev, isPaused: false }));
      startDurationTimer();
    }
  }, [state, startDurationTimer]);

  // Upload blob in chunks
  const uploadInChunks = useCallback(
    async (blob: Blob, recordingId: string, fileName: string): Promise<string> => {
      const totalChunks = Math.ceil(blob.size / CHUNK_SIZE);

      // For small files, do a simple upload
      if (totalChunks <= 1) {
        const storagePath = `${companyId}/${projectId}/${meetingId}/${recordingId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, blob, {
            contentType: blob.type,
            upsert: true,
          });

        if (uploadError) {throw uploadError;}

        setUploadProgress(100);
        return storagePath;
      }

      // Chunked upload for large files
      const storagePath = `${companyId}/${projectId}/${meetingId}/${recordingId}/${fileName}`;
      const chunks: Blob[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, blob.size);
        chunks.push(blob.slice(start, end));
      }

      // Upload chunks sequentially
      const uploadedChunkPaths: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunkPath = `${storagePath}.chunk${i}`;

        const { error: chunkError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(chunkPath, chunks[i], {
            contentType: 'application/octet-stream',
            upsert: true,
          });

        if (chunkError) {throw chunkError;}

        uploadedChunkPaths.push(chunkPath);
        setUploadProgress(Math.round(((i + 1) / chunks.length) * 90));

        // Update progress in database
        await supabase
          .from('meeting_recordings')
          .update({ uploaded_chunks: i + 1 })
          .eq('id', recordingId);
      }

      // Combine chunks (this would typically be done server-side)
      // For now, we'll upload the full blob after tracking progress
      const { error: finalError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, blob, {
          contentType: blob.type,
          upsert: true,
        });

      if (finalError) {throw finalError;}

      // Clean up chunk files
      for (const chunkPath of uploadedChunkPaths) {
        await supabase.storage.from(STORAGE_BUCKET).remove([chunkPath]);
      }

      setUploadProgress(100);
      return storagePath;
    },
    [companyId, projectId, meetingId]
  );

  // Stop recording and upload
  const stopRecording = useCallback(async (): Promise<MeetingRecording | null> => {
    if (!recorderRef.current) {return null;}

    try {
      setState('stopped');
      stopDurationTimer();

      await recorderRef.current.stopRecording();
      const blob = await recorderRef.current.getBlob();

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      setPreviewStream(null);

      if (!blob || blob.size === 0) {
        throw new Error('No recording data captured');
      }

      setIsUploading(true);
      setUploadProgress(0);

      const config = recordingConfigRef.current!;
      const extension = config.type === 'audio' ? 'webm' : 'webm';
      const fileName = `recording_${Date.now()}.${extension}`;

      // Create recording record
      const { data: recording, error: createError } = await supabase
        .from('meeting_recordings')
        .insert({
          meeting_id: meetingId,
          project_id: projectId,
          company_id: companyId,
          recording_type: config.type,
          file_name: fileName,
          file_size_bytes: blob.size,
          duration_seconds: stats.duration,
          mime_type: blob.type,
          storage_path: '',
          storage_bucket: STORAGE_BUCKET,
          status: 'uploading',
          recorded_by: user?.id,
          recorded_at: new Date().toISOString(),
          total_chunks: Math.ceil(blob.size / CHUNK_SIZE),
          uploaded_chunks: 0,
          upload_session_id: crypto.randomUUID(),
        })
        .select()
        .single();

      if (createError || !recording) {
        throw new Error(createError?.message || 'Failed to create recording record');
      }

      // Upload the file
      const storagePath = await uploadInChunks(blob, recording.id, fileName);

      // Update recording with storage path
      const { data: updatedRecording, error: updateError } = await supabase
        .from('meeting_recordings')
        .update({
          storage_path: storagePath,
          status: 'uploaded',
          transcription_status: 'pending',
        })
        .eq('id', recording.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      setIsUploading(false);
      setState('idle');

      // Reset recorder
      recorderRef.current = null;
      streamRef.current = null;
      recordingConfigRef.current = null;

      onRecordingComplete?.(updatedRecording as MeetingRecording);

      return updatedRecording as MeetingRecording;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to stop and upload recording';
      setError(errorMessage);
      setState('error');
      setIsUploading(false);
      onError?.(new Error(errorMessage));
      return null;
    }
  }, [
    meetingId,
    projectId,
    companyId,
    user,
    stats.duration,
    uploadInChunks,
    stopDurationTimer,
    onRecordingComplete,
    onError,
  ]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    stopDurationTimer();

    if (recorderRef.current) {
      recorderRef.current.stopRecording();
      recorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setPreviewStream(null);
    setState('idle');
    setError(null);
    setStats({
      duration: 0,
      fileSize: 0,
      isRecording: false,
      isPaused: false,
    });
    recordingConfigRef.current = null;
  }, [stopDurationTimer]);

  return {
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
  };
}
