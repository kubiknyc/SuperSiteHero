/**
 * Tests for 360 Photo Detection Utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detect360Photo, is360Photo, get360Metadata } from './detect360Photo';

// Mock exifr
vi.mock('exifr', () => ({
  default: {
    parse: vi.fn(),
  },
}));

import exifr from 'exifr';

// Setup URL mocks globally
const mockCreateObjectURL = vi.fn().mockReturnValue('blob:test');
const mockRevokeObjectURL = vi.fn();

// Helper to create a mock file with specific dimensions
function createMockFile(
  width: number,
  height: number,
  name: string = 'test.jpg'
): File {
  const blob = new Blob([''], { type: 'image/jpeg' });
  const file = new File([blob], name, { type: 'image/jpeg' });

  // Mock Image loading
  const originalImage = globalThis.Image;
  vi.spyOn(globalThis, 'Image').mockImplementation(() => {
    const img = {
      naturalWidth: width,
      naturalHeight: height,
      src: '',
      onload: null as (() => void) | null,
      onerror: null as (() => void) | null,
    };
    // Trigger onload after setting src
    Object.defineProperty(img, 'src', {
      set: () => {
        setTimeout(() => {
          if (img.onload) {
            img.onload();
          }
        }, 0);
      },
      get: () => '',
    });
    return img as unknown as HTMLImageElement;
  });

  return file;
}

describe('detect360Photo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(exifr.parse).mockResolvedValue(null);

    // Setup URL mocks
    globalThis.URL.createObjectURL = mockCreateObjectURL;
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('aspect ratio detection', () => {
    it('should detect 2:1 aspect ratio as 360 photo', async () => {
      const file = createMockFile(4000, 2000, 'panorama.jpg');

      const result = await detect360Photo(file);

      expect(result.is360).toBe(true);
      expect(result.confidence).toBe('medium');
      expect(result.detectionMethod).toBe('aspect_ratio');
      expect(result.metadata?.aspectRatio).toBe(2);
    });

    it('should detect aspect ratio within tolerance (1.95)', async () => {
      const file = createMockFile(3900, 2000, 'panorama.jpg');

      const result = await detect360Photo(file);

      expect(result.is360).toBe(true);
      expect(result.detectionMethod).toBe('aspect_ratio');
    });

    it('should detect aspect ratio within tolerance (2.05)', async () => {
      const file = createMockFile(4100, 2000, 'panorama.jpg');

      const result = await detect360Photo(file);

      expect(result.is360).toBe(true);
      expect(result.detectionMethod).toBe('aspect_ratio');
    });

    it('should not detect non-2:1 aspect ratio', async () => {
      const file = createMockFile(1920, 1080, 'regular.jpg');

      const result = await detect360Photo(file);

      expect(result.is360).toBe(false);
    });

    it('should not detect 1:1 aspect ratio', async () => {
      const file = createMockFile(1000, 1000, 'square.jpg');

      const result = await detect360Photo(file);

      expect(result.is360).toBe(false);
    });
  });

  describe('camera model detection', () => {
    it('should detect Ricoh Theta camera', async () => {
      const file = createMockFile(1920, 1080, 'theta.jpg');
      vi.mocked(exifr.parse).mockResolvedValue({
        Make: 'RICOH',
        Model: 'RICOH THETA Z1',
      });

      const result = await detect360Photo(file);

      expect(result.is360).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.detectionMethod).toBe('camera_model');
      expect(result.metadata?.cameraMake).toBe('RICOH');
      expect(result.metadata?.cameraModel).toBe('RICOH THETA Z1');
    });

    it('should detect Insta360 camera', async () => {
      const file = createMockFile(1920, 1080, 'insta360.jpg');
      vi.mocked(exifr.parse).mockResolvedValue({
        Make: 'Insta360',
        Model: 'Insta360 ONE X2',
      });

      const result = await detect360Photo(file);

      expect(result.is360).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.detectionMethod).toBe('camera_model');
    });

    it('should detect GoPro Max camera', async () => {
      const file = createMockFile(1920, 1080, 'gopro.jpg');
      vi.mocked(exifr.parse).mockResolvedValue({
        Make: 'GoPro',
        Model: 'GoPro Max',
      });

      const result = await detect360Photo(file);

      expect(result.is360).toBe(true);
      expect(result.confidence).toBe('high');
    });

    it('should not detect regular camera', async () => {
      const file = createMockFile(1920, 1080, 'regular.jpg');
      vi.mocked(exifr.parse).mockResolvedValue({
        Make: 'Canon',
        Model: 'Canon EOS 5D',
      });

      const result = await detect360Photo(file);

      expect(result.is360).toBe(false);
    });
  });

  describe('XMP metadata detection', () => {
    it('should detect equirectangular projection type', async () => {
      const file = createMockFile(1920, 1080, 'xmp.jpg');
      vi.mocked(exifr.parse).mockResolvedValue({
        ProjectionType: 'equirectangular',
      });

      const result = await detect360Photo(file);

      expect(result.is360).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.detectionMethod).toBe('xmp_metadata');
      expect(result.metadata?.projectionType).toBe('equirectangular');
    });

    it('should detect UsePanoramaViewer flag', async () => {
      const file = createMockFile(1920, 1080, 'xmp.jpg');
      vi.mocked(exifr.parse).mockResolvedValue({
        UsePanoramaViewer: true,
      });

      const result = await detect360Photo(file);

      expect(result.is360).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.detectionMethod).toBe('xmp_metadata');
    });

    it('should extract full panorama dimensions', async () => {
      const file = createMockFile(1920, 960, 'xmp.jpg');
      vi.mocked(exifr.parse).mockResolvedValue({
        ProjectionType: 'equirectangular',
        FullPanoWidthPixels: 7680,
        FullPanoHeightPixels: 3840,
      });

      const result = await detect360Photo(file);

      expect(result.metadata?.fullPanoWidth).toBe(7680);
      expect(result.metadata?.fullPanoHeight).toBe(3840);
    });

    it('should extract initial view angles', async () => {
      const file = createMockFile(1920, 960, 'xmp.jpg');
      vi.mocked(exifr.parse).mockResolvedValue({
        ProjectionType: 'equirectangular',
        InitialViewHeadingDegrees: 180,
        InitialViewPitchDegrees: 10,
        InitialViewRollDegrees: 5, // Non-zero to test properly
      });

      const result = await detect360Photo(file);

      expect(result.metadata?.initialViewHeading).toBe(180);
      expect(result.metadata?.initialViewPitch).toBe(10);
      expect(result.metadata?.initialViewRoll).toBe(5);
    });
  });

  describe('priority of detection methods', () => {
    it('should prioritize XMP metadata over aspect ratio', async () => {
      const file = createMockFile(4000, 2000, 'both.jpg');
      vi.mocked(exifr.parse).mockResolvedValue({
        ProjectionType: 'equirectangular',
      });

      const result = await detect360Photo(file);

      expect(result.is360).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.detectionMethod).toBe('xmp_metadata');
    });

    it('should prioritize camera model over aspect ratio', async () => {
      const file = createMockFile(4000, 2000, 'both.jpg');
      vi.mocked(exifr.parse).mockResolvedValue({
        Make: 'RICOH',
        Model: 'THETA V',
      });

      const result = await detect360Photo(file);

      expect(result.is360).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.detectionMethod).toBe('camera_model');
    });
  });

  describe('error handling', () => {
    it('should handle EXIF parsing errors gracefully', async () => {
      const file = createMockFile(4000, 2000, 'error.jpg');
      vi.mocked(exifr.parse).mockRejectedValue(new Error('Parse error'));

      const result = await detect360Photo(file);

      // Should still detect via aspect ratio
      expect(result.is360).toBe(true);
      expect(result.detectionMethod).toBe('aspect_ratio');
    });
  });
});

describe('is360Photo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(exifr.parse).mockResolvedValue(null);
    globalThis.URL.createObjectURL = mockCreateObjectURL;
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true for 360 photos', async () => {
    const file = createMockFile(4000, 2000, 'panorama.jpg');

    const result = await is360Photo(file);

    expect(result).toBe(true);
  });

  it('should return false for regular photos', async () => {
    const file = createMockFile(1920, 1080, 'regular.jpg');

    const result = await is360Photo(file);

    expect(result).toBe(false);
  });
});

describe('get360Metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(exifr.parse).mockResolvedValue(null);
    globalThis.URL.createObjectURL = mockCreateObjectURL;
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return metadata for 360 photos', async () => {
    const file = createMockFile(4000, 2000, 'panorama.jpg');

    const metadata = await get360Metadata(file);

    expect(metadata).not.toBeNull();
    expect(metadata?.aspectRatio).toBe(2);
  });

  it('should return null for non-360 photos', async () => {
    const file = createMockFile(1920, 1080, 'regular.jpg');

    const metadata = await get360Metadata(file);

    expect(metadata).toBeNull();
  });
});
