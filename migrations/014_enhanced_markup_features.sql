-- Migration: Enhanced Markup Features
-- Description: Adds tables for markup layers, scale calibrations, and updates document_markups

-- ============================================================
-- MARKUP LAYERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS document_markup_layers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#FF0000',
    visible BOOLEAN NOT NULL DEFAULT true,
    locked BOOLEAN NOT NULL DEFAULT false,
    order_index INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for layers
CREATE INDEX IF NOT EXISTS idx_markup_layers_document ON document_markup_layers(document_id);
CREATE INDEX IF NOT EXISTS idx_markup_layers_created_by ON document_markup_layers(created_by);
CREATE INDEX IF NOT EXISTS idx_markup_layers_order ON document_markup_layers(document_id, order_index);

-- ============================================================
-- SCALE CALIBRATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS document_scale_calibrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL DEFAULT 1,
    pixel_distance NUMERIC NOT NULL,
    real_world_distance NUMERIC NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'feet',
    calibrated_by UUID REFERENCES users(id),
    calibrated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(document_id, page_number)
);

-- Indexes for scale calibrations
CREATE INDEX IF NOT EXISTS idx_scale_calibrations_document ON document_scale_calibrations(document_id);

-- ============================================================
-- ENHANCE DOCUMENT_MARKUPS TABLE
-- ============================================================

-- Add layer reference
ALTER TABLE document_markups
ADD COLUMN IF NOT EXISTS layer_id UUID REFERENCES document_markup_layers(id);

-- Add color column for easier querying/filtering
ALTER TABLE document_markups
ADD COLUMN IF NOT EXISTS color VARCHAR(20);

-- Add visible flag for individual markup visibility
ALTER TABLE document_markups
ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT true;

-- Add author name for denormalized fast display
ALTER TABLE document_markups
ADD COLUMN IF NOT EXISTS author_name VARCHAR(255);

-- Add permission level
ALTER TABLE document_markups
ADD COLUMN IF NOT EXISTS permission_level VARCHAR(20) DEFAULT 'view';

-- Add shared with users (array of user IDs)
ALTER TABLE document_markups
ADD COLUMN IF NOT EXISTS shared_with_users UUID[];

-- Index for layer filtering
CREATE INDEX IF NOT EXISTS idx_markups_layer ON document_markups(layer_id);
CREATE INDEX IF NOT EXISTS idx_markups_color ON document_markups(color);
CREATE INDEX IF NOT EXISTS idx_markups_visible ON document_markups(visible);

-- ============================================================
-- MARKUP MEASUREMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS document_markup_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL DEFAULT 1,
    measurement_type VARCHAR(20) NOT NULL, -- 'distance', 'area', 'perimeter'
    points JSONB NOT NULL, -- Array of [x, y] coordinates
    value NUMERIC NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'feet',
    display_label VARCHAR(100),
    color VARCHAR(20) DEFAULT '#0066FF',
    stroke_width INTEGER DEFAULT 2,
    font_size INTEGER DEFAULT 12,
    show_label BOOLEAN DEFAULT true,
    label_position JSONB, -- {x, y}
    layer_id UUID REFERENCES document_markup_layers(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for measurements
CREATE INDEX IF NOT EXISTS idx_measurements_document ON document_markup_measurements(document_id);
CREATE INDEX IF NOT EXISTS idx_measurements_page ON document_markup_measurements(document_id, page_number);
CREATE INDEX IF NOT EXISTS idx_measurements_type ON document_markup_measurements(measurement_type);

-- ============================================================
-- MARKUP SHARING HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS document_markup_share_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    markup_id UUID NOT NULL REFERENCES document_markups(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'shared', 'unshared', 'permission_changed'
    shared_with_type VARCHAR(20), -- 'user', 'role', 'team', 'subcontractor'
    shared_with_id VARCHAR(100), -- user ID or role name
    permission_level VARCHAR(20),
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for share history
CREATE INDEX IF NOT EXISTS idx_share_history_markup ON document_markup_share_history(markup_id);
CREATE INDEX IF NOT EXISTS idx_share_history_performer ON document_markup_share_history(performed_by);

-- ============================================================
-- VERSION COMPARISON CACHE TABLE (for storing comparison results)
-- ============================================================
CREATE TABLE IF NOT EXISTS document_version_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version1_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version2_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    change_regions JSONB, -- Array of change region objects
    overall_change_percentage NUMERIC,
    summary TEXT,
    analyzed_by UUID REFERENCES users(id),
    analyzed_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(version1_id, version2_id)
);

-- Index for comparison lookups
CREATE INDEX IF NOT EXISTS idx_comparisons_versions ON document_version_comparisons(version1_id, version2_id);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE document_markup_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_scale_calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_markup_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_markup_share_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_version_comparisons ENABLE ROW LEVEL SECURITY;

-- Policies for markup layers (access through document project membership)
CREATE POLICY "Users can view layers for accessible documents" ON document_markup_layers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN project_assignments pa ON d.project_id = pa.project_id
            WHERE d.id = document_markup_layers.document_id
            AND pa.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create layers for accessible documents" ON document_markup_layers
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN project_assignments pa ON d.project_id = pa.project_id
            WHERE d.id = document_markup_layers.document_id
            AND pa.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own layers" ON document_markup_layers
    FOR UPDATE
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own layers" ON document_markup_layers
    FOR DELETE
    USING (created_by = auth.uid());

-- Similar policies for scale calibrations
CREATE POLICY "Users can view calibrations for accessible documents" ON document_scale_calibrations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN project_assignments pa ON d.project_id = pa.project_id
            WHERE d.id = document_scale_calibrations.document_id
            AND pa.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create calibrations for accessible documents" ON document_scale_calibrations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN project_assignments pa ON d.project_id = pa.project_id
            WHERE d.id = document_scale_calibrations.document_id
            AND pa.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update calibrations for accessible documents" ON document_scale_calibrations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN project_assignments pa ON d.project_id = pa.project_id
            WHERE d.id = document_scale_calibrations.document_id
            AND pa.user_id = auth.uid()
        )
    );

-- Similar policies for measurements
CREATE POLICY "Users can view measurements for accessible documents" ON document_markup_measurements
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN project_assignments pa ON d.project_id = pa.project_id
            WHERE d.id = document_markup_measurements.document_id
            AND pa.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create measurements for accessible documents" ON document_markup_measurements
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN project_assignments pa ON d.project_id = pa.project_id
            WHERE d.id = document_markup_measurements.document_id
            AND pa.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own measurements" ON document_markup_measurements
    FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own measurements" ON document_markup_measurements
    FOR DELETE
    USING (created_by = auth.uid());

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to update author_name when markup is created
CREATE OR REPLACE FUNCTION update_markup_author_name()
RETURNS TRIGGER AS $$
BEGIN
    SELECT full_name INTO NEW.author_name
    FROM users
    WHERE id = NEW.created_by;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-populate author_name
DROP TRIGGER IF EXISTS tr_markup_author_name ON document_markups;
CREATE TRIGGER tr_markup_author_name
    BEFORE INSERT ON document_markups
    FOR EACH ROW
    EXECUTE FUNCTION update_markup_author_name();

-- Function to extract color from markup_data JSONB
CREATE OR REPLACE FUNCTION sync_markup_color()
RETURNS TRIGGER AS $$
BEGIN
    NEW.color := COALESCE(NEW.markup_data->>'stroke', NEW.markup_data->>'color', '#FF0000');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync color from markup_data
DROP TRIGGER IF EXISTS tr_sync_markup_color ON document_markups;
CREATE TRIGGER tr_sync_markup_color
    BEFORE INSERT OR UPDATE OF markup_data ON document_markups
    FOR EACH ROW
    EXECUTE FUNCTION sync_markup_color();

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE document_markup_layers IS 'Named layers for organizing markup annotations';
COMMENT ON TABLE document_scale_calibrations IS 'Scale calibration data for measurement tools';
COMMENT ON TABLE document_markup_measurements IS 'Measurement annotations (distance, area, perimeter)';
COMMENT ON TABLE document_markup_share_history IS 'History of markup sharing actions';
COMMENT ON TABLE document_version_comparisons IS 'Cached results of document version comparisons';

COMMENT ON COLUMN document_markups.layer_id IS 'Reference to the markup layer this annotation belongs to';
COMMENT ON COLUMN document_markups.color IS 'Denormalized color for filtering (synced from markup_data)';
COMMENT ON COLUMN document_markups.visible IS 'Whether this individual markup is visible';
COMMENT ON COLUMN document_markups.author_name IS 'Denormalized author name for fast display';
COMMENT ON COLUMN document_markups.permission_level IS 'Permission level: view, edit, admin';
COMMENT ON COLUMN document_markups.shared_with_users IS 'Array of specific user IDs this markup is shared with';
