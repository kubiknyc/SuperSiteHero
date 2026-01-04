-- Drawing bookmarks for quick navigation
-- Migration: 169_drawing_bookmarks.sql
-- Description: Add bookmark functionality to save drawing locations for quick navigation

-- Create drawing_bookmarks table
CREATE TABLE IF NOT EXISTS drawing_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL DEFAULT 1,
  viewport JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "zoom": 1}',
  name TEXT NOT NULL,
  folder TEXT,
  shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT drawing_bookmarks_page_number_positive CHECK (page_number > 0),
  CONSTRAINT drawing_bookmarks_name_not_empty CHECK (trim(name) != '')
);

-- Create indexes for performance
CREATE INDEX idx_drawing_bookmarks_project ON drawing_bookmarks(project_id);
CREATE INDEX idx_drawing_bookmarks_user ON drawing_bookmarks(user_id);
CREATE INDEX idx_drawing_bookmarks_document ON drawing_bookmarks(document_id);
CREATE INDEX idx_drawing_bookmarks_folder ON drawing_bookmarks(folder) WHERE folder IS NOT NULL;
CREATE INDEX idx_drawing_bookmarks_shared ON drawing_bookmarks(shared) WHERE shared = true;

-- Enable Row Level Security
ALTER TABLE drawing_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own bookmarks and shared bookmarks in their projects
CREATE POLICY "Users can view own and shared bookmarks"
  ON drawing_bookmarks FOR SELECT
  USING (
    user_id = auth.uid()
    OR (shared = true AND project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    ))
  );

-- Users can create their own bookmarks in projects they have access to
CREATE POLICY "Users can create own bookmarks"
  ON drawing_bookmarks FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- Users can update their own bookmarks
CREATE POLICY "Users can update own bookmarks"
  ON drawing_bookmarks FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own bookmarks
CREATE POLICY "Users can delete own bookmarks"
  ON drawing_bookmarks FOR DELETE
  USING (user_id = auth.uid());

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER update_drawing_bookmarks_updated_at
  BEFORE UPDATE ON drawing_bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE drawing_bookmarks IS 'Stores user bookmarks for quick navigation to specific drawing locations, pages, and zoom levels';
COMMENT ON COLUMN drawing_bookmarks.viewport IS 'JSON object containing viewport state: {x: number, y: number, zoom: number}';
COMMENT ON COLUMN drawing_bookmarks.folder IS 'Optional folder name for organizing bookmarks';
COMMENT ON COLUMN drawing_bookmarks.shared IS 'When true, bookmark is visible to all project members';
