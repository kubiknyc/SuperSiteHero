// Type definitions for meeting recordings and transcription

export type RecordingType = 'audio' | 'video' | 'screen';

export type RecordingStatus =
  | 'uploading'
  | 'uploaded'
  | 'processing'
  | 'transcribing'
  | 'completed'
  | 'failed';

export type TranscriptionStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface MeetingRecording {
  id: string;
  meeting_id: string;
  project_id: string;
  company_id: string;

  // Recording metadata
  recording_type: RecordingType;
  file_name: string;
  file_size_bytes: number;
  duration_seconds: number | null;
  mime_type: string;

  // Storage
  storage_path: string;
  storage_bucket: string;
  thumbnail_path: string | null;

  // Processing status
  status: RecordingStatus;
  processing_error: string | null;

  // Transcription
  transcription_status: TranscriptionStatus | null;
  transcription_text: string | null;
  transcription_language: string;
  transcription_cost_cents: number | null;

  // Metadata
  recorded_by: string | null;
  recorded_at: string;

  // Chunked upload tracking
  total_chunks: number | null;
  uploaded_chunks: number;
  upload_session_id: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TranscriptionSegment {
  id: string;
  recording_id: string;
  start_time_ms: number;
  end_time_ms: number;
  text: string;
  speaker_label: string | null;
  confidence: number | null;
  words: WordTiming[] | null;
  segment_index: number;
  created_at: string;
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface RecordingUploadProgress {
  recordingId: string;
  fileName: string;
  totalBytes: number;
  uploadedBytes: number;
  percentComplete: number;
  status: 'preparing' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface ChunkedUploadSession {
  sessionId: string;
  recordingId: string;
  totalChunks: number;
  uploadedChunks: number;
  chunkSize: number;
}

export interface RecordingWithSegments extends MeetingRecording {
  segments?: TranscriptionSegment[];
}

export interface TranscriptionSearchResult {
  recording_id: string;
  meeting_id: string;
  segment_id: string;
  segment_text: string;
  start_time_ms: number;
  ts_rank: number;
}

// Recorder state types
export type RecorderState = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopped' | 'error';

export interface RecorderConfig {
  type: RecordingType;
  mimeType?: string;
  audioBitsPerSecond?: number;
  videoBitsPerSecond?: number;
  frameRate?: number;
}

export interface RecorderStats {
  duration: number;
  fileSize: number;
  isRecording: boolean;
  isPaused: boolean;
}
