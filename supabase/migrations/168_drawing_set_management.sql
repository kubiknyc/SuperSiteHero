-- Migration: Drawing Set Management Features
-- Description: Tables for sheet hyperlinks, revision clouds, and markup migration tracking
-- Created: 2025-01-03

-- ============================================================
-- SHEET REFERENCES (HYPERLINKS)
-- ============================================================

-- Table for cross-sheet references/hyperlinks
CREATE TABLE IF NOT EXISTS sheet_references (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    target_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    source_location JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "page": 1}',
    reference_text TEXT NOT NULL,
    reference_type TEXT NOT NULL DEFAULT 'general' CHECK (reference_type IN ('detail', 'section', 'elevation', 'plan', 'schedule', 'general')),
    is_auto_detected BOOLEAN DEFAULT false,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for sheet_references
CREATE INDEX IF NOT EXISTS idx_sheet_references_source ON sheet_references(source_document_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sheet_references_target ON sheet_references(target_document_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sheet_references_type ON sheet_references(reference_type) WHERE deleted_at IS NULL;

-- Prevent duplicate references
CREATE UNIQUE INDEX IF NOT EXISTS idx_sheet_references_unique
ON sheet_references(source_document_id, target_document_id, reference_text)
WHERE deleted_at IS NULL;

-- ============================================================
-- REVISION CLOUDS
-- ============================================================

-- Table for revision clouds on drawings
CREATE TABLE IF NOT EXISTS revision_clouds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_from INTEGER NOT NULL DEFAULT 0,
    version_to INTEGER NOT NULL DEFAULT 1,
    region JSONB NOT NULL, -- Contains points array and bounds
    description TEXT,
    revision_number TEXT NOT NULL,
    revision_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    page_number INTEGER NOT NULL DEFAULT 1,
    is_auto_generated BOOLEAN DEFAULT false,
    linked_rfi_id UUID REFERENCES rfis(id) ON DELETE SET NULL,
    linked_asi_id UUID, -- Reference to ASI if we have that table
    color TEXT NOT NULL DEFAULT '#FF0000',
    show_marker BOOLEAN DEFAULT true,
    marker_position TEXT DEFAULT 'top-right' CHECK (marker_position IN ('top-left', 'top-right', 'bottom-left', 'bottom-right')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for revision_clouds
CREATE INDEX IF NOT EXISTS idx_revision_clouds_document ON revision_clouds(document_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_revision_clouds_revision ON revision_clouds(revision_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_revision_clouds_page ON revision_clouds(document_id, page_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_revision_clouds_auto ON revision_clouds(is_auto_generated) WHERE deleted_at IS NULL;

-- ============================================================
-- MARKUP MIGRATION TRACKING
-- ============================================================

-- Table for tracking markup migrations between document versions
CREATE TABLE IF NOT EXISTS markup_migrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    original_markup_id UUID NOT NULL REFERENCES document_markups(id) ON DELETE CASCADE,
    new_markup_id UUID NOT NULL REFERENCES document_markups(id) ON DELETE CASCADE,
    from_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    to_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    migration_status TEXT NOT NULL DEFAULT 'migrated' CHECK (migration_status IN ('pending', 'migrated', 'adjusted', 'skipped', 'failed')),
    position_adjustment JSONB, -- Stores x/y offset if position was adjusted
    was_auto_migrated BOOLEAN DEFAULT false,
    overlapped_change BOOLEAN DEFAULT false,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    migrated_by UUID REFERENCES users(id),
    migrated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for markup_migrations
CREATE INDEX IF NOT EXISTS idx_markup_migrations_original ON markup_migrations(original_markup_id);
CREATE INDEX IF NOT EXISTS idx_markup_migrations_new ON markup_migrations(new_markup_id);
CREATE INDEX IF NOT EXISTS idx_markup_migrations_from_doc ON markup_migrations(from_document_id);
CREATE INDEX IF NOT EXISTS idx_markup_migrations_to_doc ON markup_migrations(to_document_id);
CREATE INDEX IF NOT EXISTS idx_markup_migrations_status ON markup_migrations(migration_status);

-- ============================================================
-- BULK MARKUP OPERATIONS
-- ============================================================

-- Table for tracking bulk markup apply operations
CREATE TABLE IF NOT EXISTS bulk_markup_operations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL DEFAULT 'apply' CHECK (operation_type IN ('apply', 'migrate', 'copy')),
    position_strategy TEXT NOT NULL DEFAULT 'same-position' CHECK (position_strategy IN ('same-position', 'centered', 'scaled', 'relative')),
    source_markup_ids UUID[] NOT NULL,
    target_document_ids UUID[] NOT NULL,
    created_markup_ids UUID[] DEFAULT '{}',
    options JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'failed')),
    total_operations INTEGER NOT NULL DEFAULT 0,
    completed_operations INTEGER NOT NULL DEFAULT 0,
    failed_operations INTEGER NOT NULL DEFAULT 0,
    error_details JSONB DEFAULT '[]',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for bulk_markup_operations
CREATE INDEX IF NOT EXISTS idx_bulk_markup_ops_source ON bulk_markup_operations(source_document_id);
CREATE INDEX IF NOT EXISTS idx_bulk_markup_ops_project ON bulk_markup_operations(project_id);
CREATE INDEX IF NOT EXISTS idx_bulk_markup_ops_status ON bulk_markup_operations(status);
CREATE INDEX IF NOT EXISTS idx_bulk_markup_ops_created_by ON bulk_markup_operations(created_by);

-- ============================================================
-- VERSION COMPARISON CACHE
-- ============================================================

-- Table for caching version comparison results
CREATE TABLE IF NOT EXISTS version_comparison_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version1_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version2_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL DEFAULT 1,
    change_regions JSONB NOT NULL DEFAULT '[]',
    overall_change_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    diff_image_url TEXT, -- URL to stored diff image if we want to persist it
    summary TEXT,
    analysis_options JSONB DEFAULT '{}',
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for version_comparison_cache
CREATE INDEX IF NOT EXISTS idx_version_comparison_versions ON version_comparison_cache(version1_id, version2_id);
CREATE INDEX IF NOT EXISTS idx_version_comparison_page ON version_comparison_cache(version1_id, version2_id, page_number);
CREATE INDEX IF NOT EXISTS idx_version_comparison_expires ON version_comparison_cache(expires_at);

-- Unique constraint for version comparison
CREATE UNIQUE INDEX IF NOT EXISTS idx_version_comparison_unique
ON version_comparison_cache(version1_id, version2_id, page_number);

-- ============================================================
-- DRAWING SET INDEX VIEW
-- ============================================================

-- View for drawing set index with link and markup counts
CREATE OR REPLACE VIEW drawing_set_index AS
SELECT
    d.id AS document_id,
    d.project_id,
    d.name AS document_name,
    d.drawing_number,
    d.discipline,
    d.revision AS current_revision,
    d.issue_date AS revision_date,
    COALESCE(outgoing.count, 0) AS outgoing_link_count,
    COALESCE(incoming.count, 0) AS incoming_link_count,
    COALESCE(markups.count, 0) > 0 AS has_markups,
    COALESCE(markups.count, 0) AS markup_count,
    COALESCE(clouds.count, 0) AS revision_cloud_count,
    d.created_at,
    d.updated_at
FROM documents d
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS count
    FROM sheet_references sr
    WHERE sr.source_document_id = d.id AND sr.deleted_at IS NULL
) outgoing ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS count
    FROM sheet_references sr
    WHERE sr.target_document_id = d.id AND sr.deleted_at IS NULL
) incoming ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS count
    FROM document_markups dm
    WHERE dm.document_id = d.id AND dm.deleted_at IS NULL
) markups ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS count
    FROM revision_clouds rc
    WHERE rc.document_id = d.id AND rc.deleted_at IS NULL
) clouds ON true
WHERE d.document_type = 'drawing' AND d.deleted_at IS NULL;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE sheet_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_clouds ENABLE ROW LEVEL SECURITY;
ALTER TABLE markup_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_markup_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_comparison_cache ENABLE ROW LEVEL SECURITY;

-- Sheet references policies
CREATE POLICY "Users can view sheet references in their projects" ON sheet_references
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN project_members pm ON d.project_id = pm.project_id
            WHERE d.id = sheet_references.source_document_id
            AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create sheet references in their projects" ON sheet_references
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN project_members pm ON d.project_id = pm.project_id
            WHERE d.id = sheet_references.source_document_id
            AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own sheet references" ON sheet_references
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM documents d
            JOIN project_members pm ON d.project_id = pm.project_id
            WHERE d.id = sheet_references.source_document_id
            AND pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'admin', 'project_manager')
        )
    );

CREATE POLICY "Users can delete their own sheet references" ON sheet_references
    FOR DELETE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM documents d
            JOIN project_members pm ON d.project_id = pm.project_id
            WHERE d.id = sheet_references.source_document_id
            AND pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'admin', 'project_manager')
        )
    );

-- Revision clouds policies
CREATE POLICY "Users can view revision clouds in their projects" ON revision_clouds
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN project_members pm ON d.project_id = pm.project_id
            WHERE d.id = revision_clouds.document_id
            AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create revision clouds in their projects" ON revision_clouds
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN project_members pm ON d.project_id = pm.project_id
            WHERE d.id = revision_clouds.document_id
            AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own revision clouds" ON revision_clouds
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM documents d
            JOIN project_members pm ON d.project_id = pm.project_id
            WHERE d.id = revision_clouds.document_id
            AND pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'admin', 'project_manager')
        )
    );

CREATE POLICY "Users can delete their own revision clouds" ON revision_clouds
    FOR DELETE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM documents d
            JOIN project_members pm ON d.project_id = pm.project_id
            WHERE d.id = revision_clouds.document_id
            AND pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'admin', 'project_manager')
        )
    );

-- Markup migrations policies
CREATE POLICY "Users can view markup migrations in their projects" ON markup_migrations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN project_members pm ON d.project_id = pm.project_id
            WHERE d.id = markup_migrations.to_document_id
            AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create markup migrations in their projects" ON markup_migrations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN project_members pm ON d.project_id = pm.project_id
            WHERE d.id = markup_migrations.to_document_id
            AND pm.user_id = auth.uid()
        )
    );

-- Bulk operations policies
CREATE POLICY "Users can view their own bulk operations" ON bulk_markup_operations
    FOR SELECT USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = bulk_markup_operations.project_id
            AND pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'admin', 'project_manager')
        )
    );

CREATE POLICY "Users can create bulk operations in their projects" ON bulk_markup_operations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = bulk_markup_operations.project_id
            AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own bulk operations" ON bulk_markup_operations
    FOR UPDATE USING (created_by = auth.uid());

-- Version comparison cache policies
CREATE POLICY "Users can view comparison cache in their projects" ON version_comparison_cache
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN project_members pm ON d.project_id = pm.project_id
            WHERE d.id = version_comparison_cache.version1_id
            AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create comparison cache in their projects" ON version_comparison_cache
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN project_members pm ON d.project_id = pm.project_id
            WHERE d.id = version_comparison_cache.version1_id
            AND pm.user_id = auth.uid()
        )
    );

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_sheet_references_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sheet_references_updated_at
    BEFORE UPDATE ON sheet_references
    FOR EACH ROW
    EXECUTE FUNCTION update_sheet_references_updated_at();

CREATE OR REPLACE FUNCTION update_revision_clouds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_revision_clouds_updated_at
    BEFORE UPDATE ON revision_clouds
    FOR EACH ROW
    EXECUTE FUNCTION update_revision_clouds_updated_at();

-- ============================================================
-- CLEANUP FUNCTION
-- ============================================================

-- Function to clean up expired comparison cache
CREATE OR REPLACE FUNCTION cleanup_expired_comparison_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM version_comparison_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comment on tables
COMMENT ON TABLE sheet_references IS 'Cross-references between drawing sheets (hyperlinks)';
COMMENT ON TABLE revision_clouds IS 'Revision clouds marking changes on drawings';
COMMENT ON TABLE markup_migrations IS 'Tracking of markup migrations between document versions';
COMMENT ON TABLE bulk_markup_operations IS 'Bulk markup apply/migrate operations';
COMMENT ON TABLE version_comparison_cache IS 'Cached version comparison results';
COMMENT ON VIEW drawing_set_index IS 'Index view of all drawings with reference and markup counts';
