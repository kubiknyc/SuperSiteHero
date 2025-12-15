-- Migration: Meeting Recordings and Transcription
-- Phase 2.2: Meeting Recording/Transcription feature

-- Meeting recordings table
CREATE TABLE IF NOT EXISTS meeting_recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Recording metadata
  recording_type TEXT NOT NULL CHECK (recording_type IN ('audio', 'video', 'screen')),
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  duration_seconds INTEGER,
  mime_type TEXT NOT NULL,

  -- Storage
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'meeting-recordings',
  thumbnail_path TEXT,

  -- Processing status
  status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN (
    'uploading',
    'uploaded',
    'processing',
    'transcribing',
    'completed',
    'failed'
  )),
  processing_error TEXT,

  -- Transcription
  transcription_status TEXT CHECK (transcription_status IN (
    'pending',
    'in_progress',
    'completed',
    'failed'
  )),
  transcription_text TEXT,
  transcription_language TEXT DEFAULT 'en',
  transcription_cost_cents INTEGER,

  -- Metadata
  recorded_by UUID REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Chunked upload tracking
  total_chunks INTEGER,
  uploaded_chunks INTEGER DEFAULT 0,
  upload_session_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Indexes
  CONSTRAINT valid_chunks CHECK (
    (total_chunks IS NULL AND uploaded_chunks = 0) OR
    (total_chunks IS NOT NULL AND uploaded_chunks <= total_chunks)
  )
);

-- Recording transcription segments for timestamped playback
CREATE TABLE IF NOT EXISTS recording_transcription_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recording_id UUID NOT NULL REFERENCES meeting_recordings(id) ON DELETE CASCADE,

  -- Segment timing
  start_time_ms INTEGER NOT NULL,
  end_time_ms INTEGER NOT NULL,

  -- Content
  text TEXT NOT NULL,
  speaker_label TEXT,
  confidence DECIMAL(5,4),

  -- Word-level timing (optional, for precise seeking)
  words JSONB,

  -- Order
  segment_index INTEGER NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_timing CHECK (end_time_ms > start_time_ms)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_meeting_id ON meeting_recordings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_project_id ON meeting_recordings(project_id);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_company_id ON meeting_recordings(company_id);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_status ON meeting_recordings(status);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_recorded_at ON meeting_recordings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_upload_session ON meeting_recordings(upload_session_id) WHERE upload_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transcription_segments_recording ON recording_transcription_segments(recording_id);
CREATE INDEX IF NOT EXISTS idx_transcription_segments_timing ON recording_transcription_segments(recording_id, start_time_ms);

-- Enable RLS
ALTER TABLE meeting_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_transcription_segments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meeting_recordings
CREATE POLICY "Users can view recordings in their company"
  ON meeting_recordings FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert recordings for their company"
  ON meeting_recordings FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update recordings they created"
  ON meeting_recordings FOR UPDATE
  USING (
    recorded_by = auth.uid() OR
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can delete recordings"
  ON meeting_recordings FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- RLS Policies for transcription segments
CREATE POLICY "Users can view segments for accessible recordings"
  ON recording_transcription_segments FOR SELECT
  USING (
    recording_id IN (
      SELECT id FROM meeting_recordings
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "System can insert segments"
  ON recording_transcription_segments FOR INSERT
  WITH CHECK (
    recording_id IN (
      SELECT id FROM meeting_recordings
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Function to update recording timestamps
CREATE OR REPLACE FUNCTION update_meeting_recording_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_meeting_recording_timestamp ON meeting_recordings;
CREATE TRIGGER update_meeting_recording_timestamp
  BEFORE UPDATE ON meeting_recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_recording_timestamp();

-- Function to get full transcription text from segments
CREATE OR REPLACE FUNCTION get_recording_transcription(p_recording_id UUID)
RETURNS TEXT AS $$
  SELECT string_agg(text, ' ' ORDER BY segment_index)
  FROM recording_transcription_segments
  WHERE recording_id = p_recording_id;
$$ LANGUAGE sql STABLE;

-- Function to search within transcriptions
CREATE OR REPLACE FUNCTION search_recording_transcriptions(
  p_company_id UUID,
  p_search_query TEXT
)
RETURNS TABLE (
  recording_id UUID,
  meeting_id UUID,
  segment_id UUID,
  segment_text TEXT,
  start_time_ms INTEGER,
  ts_rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mr.id as recording_id,
    mr.meeting_id,
    rts.id as segment_id,
    rts.text as segment_text,
    rts.start_time_ms,
    ts_rank(to_tsvector('english', rts.text), plainto_tsquery('english', p_search_query)) as ts_rank
  FROM recording_transcription_segments rts
  JOIN meeting_recordings mr ON mr.id = rts.recording_id
  WHERE mr.company_id = p_company_id
    AND mr.deleted_at IS NULL
    AND to_tsvector('english', rts.text) @@ plainto_tsquery('english', p_search_query)
  ORDER BY ts_rank DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create storage bucket for recordings (run manually in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('meeting-recordings', 'meeting-recordings', false)
-- ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE meeting_recordings IS 'Stores meeting audio/video recordings with transcription support';
COMMENT ON TABLE recording_transcription_segments IS 'Timestamped transcription segments for click-to-seek functionality';
COMMENT ON COLUMN meeting_recordings.transcription_cost_cents IS 'OpenAI Whisper API cost tracking at $0.006/minute';
