-- Migration: Video Support for Photos
-- Description: Adds video support columns to photos table and updates storage policies

-- ============================================================================
-- Add video columns to photos table
-- ============================================================================

-- Add is_video flag
ALTER TABLE photos ADD COLUMN IF NOT EXISTS is_video BOOLEAN NOT NULL DEFAULT false;

-- Add video duration in seconds
ALTER TABLE photos ADD COLUMN IF NOT EXISTS video_duration INTEGER;

-- Add video codec info (e.g., 'h264', 'vp8', 'vp9', 'hevc')
ALTER TABLE photos ADD COLUMN IF NOT EXISTS video_codec TEXT;

-- Add thumbnail URL for video preview
-- Note: thumbnailUrl already exists, we'll use that for video thumbnails too

-- Add video-specific metadata
ALTER TABLE photos ADD COLUMN IF NOT EXISTS video_metadata JSONB DEFAULT NULL;

-- Add video processing status
ALTER TABLE photos ADD COLUMN IF NOT EXISTS video_processing_status TEXT CHECK (video_processing_status IN ('pending', 'processing', 'ready', 'failed'));

-- ============================================================================
-- Indexes for video queries
-- ============================================================================

-- Index for filtering videos
CREATE INDEX IF NOT EXISTS idx_photos_is_video ON photos(is_video) WHERE is_video = true;

-- Index for video processing status
CREATE INDEX IF NOT EXISTS idx_photos_video_processing_status ON photos(video_processing_status) WHERE video_processing_status IS NOT NULL;

-- ============================================================================
-- Update storage bucket policies for video MIME types
-- Note: This is informational - actual bucket config is in Supabase dashboard
-- Storage bucket should accept:
--   - video/mp4
--   - video/webm
--   - video/quicktime
--   - video/x-msvideo (avi)
--   - video/x-matroska (mkv)
-- Max file size: 500MB
-- ============================================================================

-- ============================================================================
-- Helper function to check if file is video
-- ============================================================================

CREATE OR REPLACE FUNCTION is_video_mime_type(mime_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN mime_type LIKE 'video/%';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Function to get video stats for a project
-- ============================================================================

CREATE OR REPLACE FUNCTION get_project_video_stats(p_project_id UUID)
RETURNS TABLE (
  total_videos INTEGER,
  total_duration_seconds BIGINT,
  total_storage_bytes BIGINT,
  videos_pending INTEGER,
  videos_processing INTEGER,
  videos_ready INTEGER,
  videos_failed INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_videos,
    COALESCE(SUM(video_duration), 0)::BIGINT AS total_duration_seconds,
    COALESCE(SUM(file_size), 0)::BIGINT AS total_storage_bytes,
    COUNT(*) FILTER (WHERE video_processing_status = 'pending')::INTEGER AS videos_pending,
    COUNT(*) FILTER (WHERE video_processing_status = 'processing')::INTEGER AS videos_processing,
    COUNT(*) FILTER (WHERE video_processing_status = 'ready')::INTEGER AS videos_ready,
    COUNT(*) FILTER (WHERE video_processing_status = 'failed')::INTEGER AS videos_failed
  FROM photos
  WHERE project_id = p_project_id
    AND is_video = true
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_project_video_stats(UUID) TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN photos.is_video IS 'Flag indicating if this is a video file instead of an image';
COMMENT ON COLUMN photos.video_duration IS 'Duration of the video in seconds';
COMMENT ON COLUMN photos.video_codec IS 'Video codec used (e.g., h264, vp8, vp9, hevc)';
COMMENT ON COLUMN photos.video_metadata IS 'Additional video metadata as JSON (bitrate, frame_rate, audio_codec, etc.)';
COMMENT ON COLUMN photos.video_processing_status IS 'Status of video processing (pending, processing, ready, failed)';
COMMENT ON FUNCTION is_video_mime_type(TEXT) IS 'Helper function to check if a MIME type is a video type';
COMMENT ON FUNCTION get_project_video_stats(UUID) IS 'Get video statistics for a project';
