-- Migration: 360 Photo Detection Support
-- Description: Adds support for detecting and viewing 360/panoramic photos
-- Version: 131

-- =============================================
-- Add equirectangular_metadata column to photos table
-- =============================================

-- Add the equirectangular_metadata JSONB column for storing 360 photo metadata
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'photos' AND column_name = 'equirectangular_metadata'
    ) THEN
        ALTER TABLE photos ADD COLUMN equirectangular_metadata JSONB DEFAULT NULL;
        COMMENT ON COLUMN photos.equirectangular_metadata IS 'Metadata for 360/equirectangular photos including projection type, field of view, etc.';
    END IF;
END $$;

-- Ensure is_360 column exists (should already be present based on types, but adding for safety)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'photos' AND column_name = 'is_360'
    ) THEN
        ALTER TABLE photos ADD COLUMN is_360 BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN photos.is_360 IS 'Indicates if this is a 360/panoramic photo';
    END IF;
END $$;

-- =============================================
-- Create index on is_360 for efficient filtering
-- =============================================

CREATE INDEX IF NOT EXISTS idx_photos_is_360
ON photos (is_360)
WHERE is_360 = TRUE;

CREATE INDEX IF NOT EXISTS idx_photos_project_is_360
ON photos (project_id, is_360)
WHERE is_360 = TRUE;

-- =============================================
-- Create function to detect 360 photos
-- =============================================

CREATE OR REPLACE FUNCTION detect_360_photo()
RETURNS TRIGGER AS $$
DECLARE
    aspect_ratio NUMERIC;
    camera_make TEXT;
    camera_model TEXT;
    known_360_cameras TEXT[] := ARRAY[
        -- Ricoh Theta series
        'RICOH THETA',
        'THETA S',
        'THETA SC',
        'THETA V',
        'THETA Z1',
        'THETA X',
        -- Insta360 series
        'INSTA360',
        'INSTA360 ONE',
        'INSTA360 ONE X',
        'INSTA360 ONE X2',
        'INSTA360 ONE R',
        'INSTA360 ONE RS',
        'INSTA360 X3',
        'INSTA360 X4',
        'INSTA360 EVO',
        'INSTA360 GO',
        'INSTA360 GO 2',
        'INSTA360 GO 3',
        -- GoPro
        'GOPRO MAX',
        'GoPro Max',
        'FUSION',
        'GoPro Fusion',
        -- Samsung
        'SAMSUNG GEAR 360',
        'Gear 360',
        -- Garmin
        'GARMIN VIRB 360',
        'VIRB 360',
        -- Vuze
        'VUZE XR',
        'VUZE',
        -- Kandao
        'KANDAO QOOCAM',
        'QOOCAM 8K',
        -- Labpano
        'PILOT ONE',
        'PILOT ERA',
        -- Xiaomi
        'MI SPHERE',
        'MIJIA SPHERE',
        -- Kodak
        'KODAK PIXPRO SP360',
        'PIXPRO SP360',
        'PIXPRO ORBIT360',
        -- LG
        'LG 360 CAM'
    ];
    is_360_photo BOOLEAN := FALSE;
BEGIN
    -- Calculate aspect ratio if dimensions are available
    IF NEW.width IS NOT NULL AND NEW.height IS NOT NULL AND NEW.height > 0 THEN
        aspect_ratio := NEW.width::NUMERIC / NEW.height::NUMERIC;

        -- Check for 2:1 aspect ratio (equirectangular projection)
        -- Allow tolerance of 1.9 to 2.1
        IF aspect_ratio >= 1.9 AND aspect_ratio <= 2.1 THEN
            is_360_photo := TRUE;
        END IF;
    END IF;

    -- Get camera info (handle case variations)
    camera_make := UPPER(COALESCE(NEW.camera_make, ''));
    camera_model := UPPER(COALESCE(NEW.camera_model, ''));

    -- Check if camera is a known 360 camera
    IF NOT is_360_photo THEN
        FOR i IN 1..array_length(known_360_cameras, 1) LOOP
            IF camera_make LIKE '%' || known_360_cameras[i] || '%' OR
               camera_model LIKE '%' || known_360_cameras[i] || '%' THEN
                is_360_photo := TRUE;
                EXIT;
            END IF;
        END LOOP;
    END IF;

    -- Check existing equirectangular_metadata for projection type hints
    IF NOT is_360_photo AND NEW.equirectangular_metadata IS NOT NULL THEN
        IF NEW.equirectangular_metadata->>'projectionType' IN ('equirectangular', 'spherical', 'cylindrical') THEN
            is_360_photo := TRUE;
        END IF;
    END IF;

    -- Update is_360 flag
    NEW.is_360 := is_360_photo;

    -- If detected as 360, populate equirectangular_metadata with defaults if not set
    IF is_360_photo AND NEW.equirectangular_metadata IS NULL THEN
        NEW.equirectangular_metadata := jsonb_build_object(
            'projectionType', 'equirectangular',
            'detectedBy', 'auto',
            'detectedAt', NOW(),
            'aspectRatio', aspect_ratio,
            'cameraMatch', CASE
                WHEN camera_make != '' OR camera_model != ''
                THEN TRUE
                ELSE FALSE
            END
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Create trigger to detect 360 photos on INSERT and UPDATE
-- =============================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_detect_360_photo ON photos;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER trigger_detect_360_photo
    BEFORE INSERT OR UPDATE OF width, height, camera_make, camera_model, equirectangular_metadata
    ON photos
    FOR EACH ROW
    EXECUTE FUNCTION detect_360_photo();

-- =============================================
-- Add RLS policies for equirectangular_metadata
-- =============================================

-- Ensure existing photo policies cover the new column (they should since they're row-level)
-- No additional policies needed as equirectangular_metadata is just another column on photos

-- =============================================
-- Create helper function to manually mark photo as 360
-- =============================================

CREATE OR REPLACE FUNCTION mark_photo_as_360(
    p_photo_id UUID,
    p_is_360 BOOLEAN DEFAULT TRUE,
    p_metadata JSONB DEFAULT NULL
)
RETURNS photos AS $$
DECLARE
    v_photo photos;
BEGIN
    UPDATE photos
    SET
        is_360 = p_is_360,
        equirectangular_metadata = COALESCE(
            p_metadata,
            CASE WHEN p_is_360 THEN
                jsonb_build_object(
                    'projectionType', 'equirectangular',
                    'detectedBy', 'manual',
                    'detectedAt', NOW()
                )
            ELSE NULL END
        ),
        updated_at = NOW()
    WHERE id = p_photo_id
    RETURNING * INTO v_photo;

    RETURN v_photo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION mark_photo_as_360(UUID, BOOLEAN, JSONB) TO authenticated;

-- =============================================
-- Create view for 360 photos with enhanced metadata
-- =============================================

CREATE OR REPLACE VIEW v_360_photos AS
SELECT
    p.*,
    CASE
        WHEN p.width IS NOT NULL AND p.height IS NOT NULL AND p.height > 0
        THEN p.width::NUMERIC / p.height::NUMERIC
        ELSE NULL
    END AS aspect_ratio,
    COALESCE(p.equirectangular_metadata->>'projectionType', 'equirectangular') AS projection_type,
    COALESCE(p.equirectangular_metadata->>'detectedBy', 'unknown') AS detection_method
FROM photos p
WHERE p.is_360 = TRUE
AND p.deleted_at IS NULL;

-- =============================================
-- Run detection on existing photos
-- =============================================

-- Update existing photos to trigger 360 detection
-- This will set is_360 and equirectangular_metadata for any photos that qualify
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    WITH updated AS (
        UPDATE photos
        SET updated_at = updated_at  -- Trigger the update to run detection
        WHERE width IS NOT NULL
        AND height IS NOT NULL
        AND (
            -- Has 2:1 aspect ratio
            (width::NUMERIC / height::NUMERIC >= 1.9 AND width::NUMERIC / height::NUMERIC <= 2.1)
            OR
            -- Has 360 camera
            camera_make ILIKE ANY(ARRAY['%RICOH%', '%INSTA360%', '%GOPRO MAX%', '%GEAR 360%', '%VIRB 360%'])
            OR
            camera_model ILIKE ANY(ARRAY['%THETA%', '%INSTA360%', '%MAX%', '%FUSION%', '%360%'])
        )
        AND deleted_at IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO updated_count FROM updated;

    RAISE NOTICE 'Updated % photos for 360 detection', updated_count;
END $$;

-- =============================================
-- Add comment to document the feature
-- =============================================

COMMENT ON FUNCTION detect_360_photo() IS
'Trigger function that automatically detects 360/panoramic photos based on:
- Aspect ratio: 2:1 (1.9-2.1 tolerance) for equirectangular projection
- Camera make/model: Known 360 cameras (Ricoh Theta, Insta360, GoPro Max, etc.)
- Existing metadata: projectionType field in equirectangular_metadata';
