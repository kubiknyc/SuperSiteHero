/**
 * 360 Photo Detection Utility
 *
 * Client-side utility to detect 360/panoramic photos before upload.
 * Checks aspect ratio and EXIF data to determine if a photo is a 360 panorama.
 */

import exifr from 'exifr';

/**
 * List of known 360 camera manufacturers and models
 */
const KNOWN_360_CAMERAS = [
  // Ricoh Theta series
  'RICOH THETA',
  'THETA S',
  'THETA SC',
  'THETA V',
  'THETA Z1',
  'THETA X',
  // Insta360 series
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
  // GoPro
  'GOPRO MAX',
  'FUSION',
  // Samsung
  'SAMSUNG GEAR 360',
  'GEAR 360',
  // Garmin
  'GARMIN VIRB 360',
  'VIRB 360',
  // Vuze
  'VUZE XR',
  'VUZE',
  // Kandao
  'KANDAO QOOCAM',
  'QOOCAM 8K',
  // Labpano
  'PILOT ONE',
  'PILOT ERA',
  // Xiaomi
  'MI SPHERE',
  'MIJIA SPHERE',
  // Kodak
  'KODAK PIXPRO SP360',
  'PIXPRO SP360',
  'PIXPRO ORBIT360',
  // LG
  'LG 360 CAM',
];

/**
 * XMP namespaces that indicate 360 content
 * Used for documentation and potential future use
 */
const _XMP_360_MARKERS = [
  'GPano',                    // Google Photo Sphere XMP
  'GSpherical',               // Google Spherical Video
  'ProjectionType',           // Common projection type field
  'UsePanoramaViewer',        // Indicates panorama viewer should be used
  'FullPanoWidthPixels',      // Full panorama width
  'FullPanoHeightPixels',     // Full panorama height
  'CroppedAreaLeftPixels',    // Cropped area info
];

/**
 * Result of 360 photo detection
 */
export interface Detect360Result {
  is360: boolean;
  confidence: 'high' | 'medium' | 'low';
  detectionMethod: 'aspect_ratio' | 'camera_model' | 'xmp_metadata' | 'manual' | 'unknown';
  metadata?: {
    aspectRatio?: number;
    width?: number;
    height?: number;
    cameraMake?: string;
    cameraModel?: string;
    projectionType?: string;
    fullPanoWidth?: number;
    fullPanoHeight?: number;
    initialViewHeading?: number;
    initialViewPitch?: number;
    initialViewRoll?: number;
  };
}

/**
 * Get image dimensions from a File
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

/**
 * Check if camera make/model matches known 360 cameras
 */
function isKnown360Camera(make?: string, model?: string): boolean {
  if (!make && !model) return false;

  const combined = `${make || ''} ${model || ''}`.toUpperCase();

  return KNOWN_360_CAMERAS.some((camera) =>
    combined.includes(camera.toUpperCase())
  );
}

/**
 * Check aspect ratio for 2:1 equirectangular projection
 * Allows tolerance of 1.9 to 2.1
 */
function is2to1AspectRatio(width: number, height: number): boolean {
  if (height === 0) return false;
  const ratio = width / height;
  return ratio >= 1.9 && ratio <= 2.1;
}

/**
 * Detect if a file is a 360/panoramic photo
 *
 * @param file - The image file to analyze
 * @returns Detection result with confidence and metadata
 */
export async function detect360Photo(file: File): Promise<Detect360Result> {
  const result: Detect360Result = {
    is360: false,
    confidence: 'low',
    detectionMethod: 'unknown',
    metadata: {},
  };

  try {
    // First, get image dimensions
    const dimensions = await getImageDimensions(file);
    if (dimensions) {
      result.metadata!.width = dimensions.width;
      result.metadata!.height = dimensions.height;
      result.metadata!.aspectRatio = dimensions.width / dimensions.height;
    }

    // Try to parse EXIF data
    let exifData: Record<string, any> | null = null;
    try {
      exifData = await exifr.parse(file, {
        // Parse all available metadata
        tiff: true,
        xmp: true,
        icc: false,
        iptc: false,
        jfif: false,
        ihdr: false,
        // Include specific tags we need
        pick: [
          'Make',
          'Model',
          'ImageWidth',
          'ImageHeight',
          'PixelXDimension',
          'PixelYDimension',
          // XMP GPano tags
          'ProjectionType',
          'UsePanoramaViewer',
          'FullPanoWidthPixels',
          'FullPanoHeightPixels',
          'CroppedAreaLeftPixels',
          'CroppedAreaTopPixels',
          'CroppedAreaImageWidthPixels',
          'CroppedAreaImageHeightPixels',
          'InitialViewHeadingDegrees',
          'InitialViewPitchDegrees',
          'InitialViewRollDegrees',
          'PoseHeadingDegrees',
          'PosePitchDegrees',
          'PoseRollDegrees',
        ],
      });
    } catch {
      // EXIF parsing failed, continue with other checks
      console.debug('EXIF parsing failed for 360 detection, continuing with dimension check');
    }

    if (exifData) {
      // Extract camera info
      result.metadata!.cameraMake = exifData.Make;
      result.metadata!.cameraModel = exifData.Model;

      // Check for XMP GPano/GSpherical metadata (highest confidence)
      if (exifData.ProjectionType) {
        result.metadata!.projectionType = exifData.ProjectionType;
        if (exifData.ProjectionType.toLowerCase() === 'equirectangular') {
          result.is360 = true;
          result.confidence = 'high';
          result.detectionMethod = 'xmp_metadata';
        }
      }

      if (exifData.UsePanoramaViewer === true || exifData.UsePanoramaViewer === 'True') {
        result.is360 = true;
        result.confidence = 'high';
        result.detectionMethod = 'xmp_metadata';
      }

      // Extract panorama dimensions if available
      if (exifData.FullPanoWidthPixels) {
        result.metadata!.fullPanoWidth = Number(exifData.FullPanoWidthPixels);
      }
      if (exifData.FullPanoHeightPixels) {
        result.metadata!.fullPanoHeight = Number(exifData.FullPanoHeightPixels);
      }

      // Extract initial view angles if available
      if (exifData.InitialViewHeadingDegrees) {
        result.metadata!.initialViewHeading = Number(exifData.InitialViewHeadingDegrees);
      }
      if (exifData.InitialViewPitchDegrees) {
        result.metadata!.initialViewPitch = Number(exifData.InitialViewPitchDegrees);
      }
      if (exifData.InitialViewRollDegrees) {
        result.metadata!.initialViewRoll = Number(exifData.InitialViewRollDegrees);
      }

      // Check camera make/model (high confidence if matched)
      if (!result.is360 && isKnown360Camera(exifData.Make, exifData.Model)) {
        result.is360 = true;
        result.confidence = 'high';
        result.detectionMethod = 'camera_model';
      }
    }

    // Check aspect ratio (medium confidence)
    if (!result.is360 && dimensions) {
      if (is2to1AspectRatio(dimensions.width, dimensions.height)) {
        result.is360 = true;
        result.confidence = 'medium';
        result.detectionMethod = 'aspect_ratio';
      }
    }

    return result;
  } catch (error) {
    console.error('Error detecting 360 photo:', error);
    return result;
  }
}

/**
 * Simplified detection function that returns just a boolean
 * Suitable for quick checks during upload
 *
 * @param file - The image file to analyze
 * @returns true if the photo is detected as 360
 */
export async function is360Photo(file: File): Promise<boolean> {
  const result = await detect360Photo(file);
  return result.is360;
}

/**
 * Get equirectangular metadata for a 360 photo
 * Returns null if not a 360 photo
 */
export async function get360Metadata(file: File): Promise<Detect360Result['metadata'] | null> {
  const result = await detect360Photo(file);
  if (!result.is360) return null;
  return result.metadata ?? null;
}

export default detect360Photo;
