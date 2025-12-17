-- ============================================================================
-- Migration: AR/VR Site Walkthroughs - 3D Models and BIM Data Storage
-- Description: Database schema for 3D model storage, BIM elements, and VR tours
-- ============================================================================

-- =========================
-- 3D Models Table
-- =========================
CREATE TABLE IF NOT EXISTS public.models_3d (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- File information
    name TEXT NOT NULL,
    description TEXT,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    file_path TEXT NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('gltf', 'glb', 'obj', 'fbx', 'ifc', 'step', 'stl')),

    -- Processing status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed', 'archived')),
    processing_error TEXT,
    processed_at TIMESTAMPTZ,

    -- Model metadata (populated after processing)
    triangle_count INTEGER,
    vertex_count INTEGER,
    material_count INTEGER,
    texture_count INTEGER,
    has_animations BOOLEAN DEFAULT FALSE,
    animation_names TEXT[],

    -- Bounding box
    bounding_box_min JSONB, -- {x, y, z}
    bounding_box_max JSONB, -- {x, y, z}
    center_point JSONB,     -- {x, y, z}

    -- Display settings
    default_camera_position JSONB, -- {x, y, z}
    default_camera_target JSONB,   -- {x, y, z}
    default_scale DECIMAL(10,4) DEFAULT 1.0,
    up_axis TEXT DEFAULT 'Y' CHECK (up_axis IN ('X', 'Y', 'Z')),

    -- Optimized versions
    optimized_file_path TEXT,
    thumbnail_url TEXT,
    preview_url TEXT,

    -- LOD (Level of Detail) versions
    lod_versions JSONB DEFAULT '[]', -- [{level: 1, path: '...', triangles: 1000}]

    -- Tagging and categorization
    tags TEXT[],
    category TEXT,

    -- Audit fields
    uploaded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for models_3d
CREATE INDEX IF NOT EXISTS idx_models_3d_project ON public.models_3d(project_id);
CREATE INDEX IF NOT EXISTS idx_models_3d_organization ON public.models_3d(organization_id);
CREATE INDEX IF NOT EXISTS idx_models_3d_status ON public.models_3d(status);
CREATE INDEX IF NOT EXISTS idx_models_3d_format ON public.models_3d(format);
CREATE INDEX IF NOT EXISTS idx_models_3d_tags ON public.models_3d USING GIN(tags);

-- =========================
-- BIM Models Table (IFC specific)
-- =========================
CREATE TABLE IF NOT EXISTS public.bim_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_3d_id UUID REFERENCES public.models_3d(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- IFC Metadata
    ifc_schema TEXT, -- IFC2X3, IFC4, IFC4X3
    ifc_name TEXT,
    ifc_description TEXT,
    ifc_author TEXT,
    ifc_organization TEXT,
    preprocessor_version TEXT,
    originating_system TEXT,
    authorization TEXT,
    file_date TIMESTAMPTZ,

    -- Structure counts
    element_count INTEGER DEFAULT 0,
    type_count INTEGER DEFAULT 0,
    property_set_count INTEGER DEFAULT 0,

    -- Spatial structure (JSON tree)
    spatial_structure JSONB,

    -- Type summary [{type: 'IFCWALL', count: 50}, ...]
    type_summary JSONB DEFAULT '[]',

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for bim_models
CREATE INDEX IF NOT EXISTS idx_bim_models_project ON public.bim_models(project_id);
CREATE INDEX IF NOT EXISTS idx_bim_models_model_3d ON public.bim_models(model_3d_id);
CREATE INDEX IF NOT EXISTS idx_bim_models_schema ON public.bim_models(ifc_schema);

-- =========================
-- BIM Elements Table
-- =========================
CREATE TABLE IF NOT EXISTS public.bim_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bim_model_id UUID NOT NULL REFERENCES public.bim_models(id) ON DELETE CASCADE,

    -- IFC identity
    express_id INTEGER NOT NULL,
    global_id TEXT NOT NULL, -- IFC GUID
    ifc_type TEXT NOT NULL,  -- IFCWALL, IFCWINDOW, etc.
    name TEXT,
    description TEXT,

    -- Spatial hierarchy
    parent_express_id INTEGER,
    level_express_id INTEGER,
    level_name TEXT,

    -- Geometry reference (if stored separately)
    geometry_id UUID,

    -- Bounding box
    bounding_box JSONB, -- {min: {x,y,z}, max: {x,y,z}}

    -- Properties (cached for quick access)
    properties_cache JSONB DEFAULT '{}',

    -- Visualization state
    is_visible BOOLEAN DEFAULT TRUE,
    color_override TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for bim_elements
CREATE INDEX IF NOT EXISTS idx_bim_elements_model ON public.bim_elements(bim_model_id);
CREATE INDEX IF NOT EXISTS idx_bim_elements_express_id ON public.bim_elements(bim_model_id, express_id);
CREATE INDEX IF NOT EXISTS idx_bim_elements_global_id ON public.bim_elements(global_id);
CREATE INDEX IF NOT EXISTS idx_bim_elements_type ON public.bim_elements(ifc_type);
CREATE INDEX IF NOT EXISTS idx_bim_elements_level ON public.bim_elements(level_name);

-- =========================
-- BIM Property Sets Table
-- =========================
CREATE TABLE IF NOT EXISTS public.bim_property_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bim_element_id UUID NOT NULL REFERENCES public.bim_elements(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    description TEXT,

    -- Properties as JSONB array [{name, value, type, unit}]
    properties JSONB NOT NULL DEFAULT '[]',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for property sets
CREATE INDEX IF NOT EXISTS idx_bim_property_sets_element ON public.bim_property_sets(bim_element_id);

-- =========================
-- VR Tours Table
-- =========================
CREATE TABLE IF NOT EXISTS public.vr_tours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    description TEXT,

    -- Tour settings
    start_node_id UUID, -- Set after nodes are created
    auto_rotate BOOLEAN DEFAULT FALSE,
    show_compass BOOLEAN DEFAULT TRUE,
    allow_zoom BOOLEAN DEFAULT TRUE,

    -- Navigation settings
    transition_duration INTEGER DEFAULT 1000, -- milliseconds
    transition_type TEXT DEFAULT 'fade' CHECK (transition_type IN ('fade', 'slide', 'zoom', 'none')),

    -- Sharing
    is_public BOOLEAN DEFAULT FALSE,
    share_token TEXT UNIQUE,
    password_protected BOOLEAN DEFAULT FALSE,
    password_hash TEXT,

    -- Statistics
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,

    -- Audit fields
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for vr_tours
CREATE INDEX IF NOT EXISTS idx_vr_tours_project ON public.vr_tours(project_id);
CREATE INDEX IF NOT EXISTS idx_vr_tours_share_token ON public.vr_tours(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vr_tours_public ON public.vr_tours(is_public) WHERE is_public = TRUE;

-- =========================
-- VR Tour Nodes Table (360 Photo Locations)
-- =========================
CREATE TABLE IF NOT EXISTS public.vr_tour_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tour_id UUID NOT NULL REFERENCES public.vr_tours(id) ON DELETE CASCADE,

    -- Photo reference
    photo_id UUID REFERENCES public.photos(id) ON DELETE SET NULL,
    photo_url TEXT NOT NULL,
    thumbnail_url TEXT,

    name TEXT NOT NULL,
    description TEXT,

    -- Position in physical space (if known)
    position JSONB, -- {x, y, z}

    -- Initial view orientation
    initial_heading DECIMAL(5,2) DEFAULT 0, -- degrees
    initial_pitch DECIMAL(5,2) DEFAULT 0,
    initial_zoom DECIMAL(4,2) DEFAULT 1,

    -- Navigation order
    sequence_order INTEGER DEFAULT 0,

    -- Floor/level association
    floor_level TEXT,

    -- Metadata
    captured_at TIMESTAMPTZ,
    tags TEXT[],

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for vr_tour_nodes
CREATE INDEX IF NOT EXISTS idx_vr_tour_nodes_tour ON public.vr_tour_nodes(tour_id);
CREATE INDEX IF NOT EXISTS idx_vr_tour_nodes_photo ON public.vr_tour_nodes(photo_id);
CREATE INDEX IF NOT EXISTS idx_vr_tour_nodes_sequence ON public.vr_tour_nodes(tour_id, sequence_order);

-- =========================
-- VR Tour Connections Table (Links between nodes)
-- =========================
CREATE TABLE IF NOT EXISTS public.vr_tour_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_node_id UUID NOT NULL REFERENCES public.vr_tour_nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES public.vr_tour_nodes(id) ON DELETE CASCADE,

    -- Hotspot position in source panorama
    yaw DECIMAL(6,2) NOT NULL,   -- -180 to 180 degrees
    pitch DECIMAL(5,2) NOT NULL, -- -90 to 90 degrees

    -- Display
    label TEXT,
    icon TEXT DEFAULT 'arrow',
    color TEXT DEFAULT '#ffffff',
    scale DECIMAL(3,2) DEFAULT 1.0,

    -- Bidirectional connection
    is_bidirectional BOOLEAN DEFAULT TRUE,
    reverse_yaw DECIMAL(6,2),
    reverse_pitch DECIMAL(5,2),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate connections
    UNIQUE(source_node_id, target_node_id)
);

-- Indexes for connections
CREATE INDEX IF NOT EXISTS idx_vr_tour_connections_source ON public.vr_tour_connections(source_node_id);
CREATE INDEX IF NOT EXISTS idx_vr_tour_connections_target ON public.vr_tour_connections(target_node_id);

-- =========================
-- VR Tour Annotations Table
-- =========================
CREATE TABLE IF NOT EXISTS public.vr_tour_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID NOT NULL REFERENCES public.vr_tour_nodes(id) ON DELETE CASCADE,

    -- Position in panorama
    yaw DECIMAL(6,2) NOT NULL,
    pitch DECIMAL(5,2) NOT NULL,

    -- Content
    type TEXT NOT NULL CHECK (type IN ('text', 'image', 'video', 'link', 'document', 'model')),
    title TEXT,
    content TEXT,
    media_url TEXT,

    -- Display settings
    icon TEXT DEFAULT 'info',
    color TEXT DEFAULT '#3b82f6',
    scale DECIMAL(3,2) DEFAULT 1.0,
    always_visible BOOLEAN DEFAULT FALSE,

    -- Optional link to project entities
    linked_entity_type TEXT, -- 'rfi', 'punch_item', 'document', etc.
    linked_entity_id UUID,

    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for annotations
CREATE INDEX IF NOT EXISTS idx_vr_tour_annotations_node ON public.vr_tour_annotations(node_id);

-- =========================
-- AR Sessions Table (for tracking placed models)
-- =========================
CREATE TABLE IF NOT EXISTS public.ar_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Session info
    device_type TEXT,
    device_model TEXT,
    ar_framework TEXT, -- 'webxr', 'arcore', 'arkit'

    -- Duration
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,

    -- Location
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),

    -- Statistics
    models_placed INTEGER DEFAULT 0,
    screenshots_taken INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for AR sessions
CREATE INDEX IF NOT EXISTS idx_ar_sessions_project ON public.ar_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_ar_sessions_user ON public.ar_sessions(user_id);

-- =========================
-- AR Placed Models Table
-- =========================
CREATE TABLE IF NOT EXISTS public.ar_placed_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.ar_sessions(id) ON DELETE CASCADE,
    model_3d_id UUID NOT NULL REFERENCES public.models_3d(id) ON DELETE CASCADE,

    -- Transform
    position JSONB NOT NULL, -- {x, y, z}
    rotation JSONB NOT NULL, -- {x, y, z, w} quaternion
    scale DECIMAL(10,4) NOT NULL DEFAULT 1.0,

    -- Anchor (for persistence)
    anchor_id TEXT,
    anchor_type TEXT, -- 'plane', 'marker', 'world'

    -- Screenshot reference
    screenshot_url TEXT,

    -- Notes
    notes TEXT,

    placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for placed models
CREATE INDEX IF NOT EXISTS idx_ar_placed_models_session ON public.ar_placed_models(session_id);
CREATE INDEX IF NOT EXISTS idx_ar_placed_models_model ON public.ar_placed_models(model_3d_id);

-- =========================
-- Model Comments Table
-- =========================
CREATE TABLE IF NOT EXISTS public.model_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_3d_id UUID REFERENCES public.models_3d(id) ON DELETE CASCADE,
    bim_element_id UUID REFERENCES public.bim_elements(id) ON DELETE CASCADE,
    vr_tour_node_id UUID REFERENCES public.vr_tour_nodes(id) ON DELETE CASCADE,

    -- Position in 3D space (if applicable)
    position JSONB, -- {x, y, z}
    camera_position JSONB, -- Camera position when comment was made
    camera_target JSONB,

    -- Content
    content TEXT NOT NULL,

    -- Resolution status (for issues)
    is_issue BOOLEAN DEFAULT FALSE,
    issue_status TEXT DEFAULT 'open' CHECK (issue_status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_to UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id),

    -- Attachments
    attachments JSONB DEFAULT '[]', -- [{name, url, type}]

    -- Audit
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- At least one reference required
    CONSTRAINT model_comments_ref_check CHECK (
        model_3d_id IS NOT NULL OR
        bim_element_id IS NOT NULL OR
        vr_tour_node_id IS NOT NULL
    )
);

-- Indexes for model comments
CREATE INDEX IF NOT EXISTS idx_model_comments_model ON public.model_comments(model_3d_id);
CREATE INDEX IF NOT EXISTS idx_model_comments_element ON public.model_comments(bim_element_id);
CREATE INDEX IF NOT EXISTS idx_model_comments_node ON public.model_comments(vr_tour_node_id);
CREATE INDEX IF NOT EXISTS idx_model_comments_issue ON public.model_comments(is_issue) WHERE is_issue = TRUE;

-- =========================
-- Updated Timestamp Triggers
-- =========================
CREATE OR REPLACE FUNCTION update_visualization_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_models_3d_updated ON public.models_3d;
CREATE TRIGGER trg_models_3d_updated
    BEFORE UPDATE ON public.models_3d
    FOR EACH ROW EXECUTE FUNCTION update_visualization_timestamp();

DROP TRIGGER IF EXISTS trg_bim_models_updated ON public.bim_models;
CREATE TRIGGER trg_bim_models_updated
    BEFORE UPDATE ON public.bim_models
    FOR EACH ROW EXECUTE FUNCTION update_visualization_timestamp();

DROP TRIGGER IF EXISTS trg_vr_tours_updated ON public.vr_tours;
CREATE TRIGGER trg_vr_tours_updated
    BEFORE UPDATE ON public.vr_tours
    FOR EACH ROW EXECUTE FUNCTION update_visualization_timestamp();

DROP TRIGGER IF EXISTS trg_vr_tour_nodes_updated ON public.vr_tour_nodes;
CREATE TRIGGER trg_vr_tour_nodes_updated
    BEFORE UPDATE ON public.vr_tour_nodes
    FOR EACH ROW EXECUTE FUNCTION update_visualization_timestamp();

DROP TRIGGER IF EXISTS trg_model_comments_updated ON public.model_comments;
CREATE TRIGGER trg_model_comments_updated
    BEFORE UPDATE ON public.model_comments
    FOR EACH ROW EXECUTE FUNCTION update_visualization_timestamp();

-- =========================
-- Row Level Security
-- =========================

-- models_3d RLS
ALTER TABLE public.models_3d ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS models_3d_select ON public.models_3d;
CREATE POLICY models_3d_select ON public.models_3d FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS models_3d_insert ON public.models_3d;
CREATE POLICY models_3d_insert ON public.models_3d FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS models_3d_update ON public.models_3d;
CREATE POLICY models_3d_update ON public.models_3d FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS models_3d_delete ON public.models_3d;
CREATE POLICY models_3d_delete ON public.models_3d FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- vr_tours RLS
ALTER TABLE public.vr_tours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vr_tours_select ON public.vr_tours;
CREATE POLICY vr_tours_select ON public.vr_tours FOR SELECT
    USING (
        is_public = TRUE OR
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS vr_tours_insert ON public.vr_tours;
CREATE POLICY vr_tours_insert ON public.vr_tours FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS vr_tours_update ON public.vr_tours;
CREATE POLICY vr_tours_update ON public.vr_tours FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS vr_tours_delete ON public.vr_tours;
CREATE POLICY vr_tours_delete ON public.vr_tours FOR DELETE
    USING (
        created_by = auth.uid() OR
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.models_3d TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bim_models TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bim_elements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bim_property_sets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vr_tours TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vr_tour_nodes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vr_tour_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vr_tour_annotations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ar_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ar_placed_models TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_comments TO authenticated;

-- Public read for shared tours
GRANT SELECT ON public.vr_tours TO anon;
GRANT SELECT ON public.vr_tour_nodes TO anon;
GRANT SELECT ON public.vr_tour_connections TO anon;
GRANT SELECT ON public.vr_tour_annotations TO anon;

-- =========================
-- Storage Buckets
-- =========================

-- Create storage bucket for 3D models (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'models-3d',
    'models-3d',
    FALSE,
    524288000, -- 500MB limit for 3D models
    ARRAY[
        'model/gltf+json',
        'model/gltf-binary',
        'application/octet-stream',
        'model/obj',
        'application/x-ifc',
        'model/step',
        'model/stl'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for models-3d bucket
DROP POLICY IF EXISTS models_3d_bucket_select ON storage.objects;
CREATE POLICY models_3d_bucket_select ON storage.objects FOR SELECT
    USING (
        bucket_id = 'models-3d' AND
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS models_3d_bucket_insert ON storage.objects;
CREATE POLICY models_3d_bucket_insert ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'models-3d' AND
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS models_3d_bucket_update ON storage.objects;
CREATE POLICY models_3d_bucket_update ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'models-3d' AND
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS models_3d_bucket_delete ON storage.objects;
CREATE POLICY models_3d_bucket_delete ON storage.objects FOR DELETE
    USING (
        bucket_id = 'models-3d' AND
        auth.uid() IS NOT NULL
    );

COMMENT ON TABLE public.models_3d IS 'Stores 3D models for AR/VR visualization';
COMMENT ON TABLE public.bim_models IS 'BIM/IFC specific model metadata';
COMMENT ON TABLE public.bim_elements IS 'Individual BIM elements with properties';
COMMENT ON TABLE public.vr_tours IS 'Virtual reality tours using 360 photos';
COMMENT ON TABLE public.vr_tour_nodes IS '360 photo locations in VR tours';
COMMENT ON TABLE public.ar_sessions IS 'AR session tracking for analytics';
