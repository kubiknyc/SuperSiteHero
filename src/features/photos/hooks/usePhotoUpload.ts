/**
 * Photo & Video Upload Hook
 *
 * Provides comprehensive photo and video upload functionality with:
 * - 360 photo auto-detection
 * - EXIF metadata extraction
 * - Image compression
 * - Video thumbnail generation
 * - Progress tracking
 * - Supabase storage integration
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { detect360Photo, type Detect360Result } from '@/lib/utils/detect360Photo';
import { photoKeys, useCreatePhoto } from './usePhotos';
import type {
  CreatePhotoDTO,
  EquirectangularMetadata,
  PhotoSource,
  DeviceType,
} from '@/types/photo-management';
import exifr from 'exifr';
import { generateVideoThumbnail, thumbnailToFile } from '@/lib/utils/generateVideoThumbnail';
import { getVideoMetadata, getVideoCodec } from '@/lib/utils/videoCompression';

// =============================================
// Types
// =============================================

export interface PhotoUploadOptions {
  /** Project ID to associate photos with */
  projectId: string;
  /** Entity type to link (e.g., 'daily_report', 'punch_item') */
  entityType?: string;
  /** Entity ID to link */
  entityId?: string;
  /** Maximum file size in bytes (default: 50MB for photos, 500MB for videos) */
  maxFileSize?: number;
  /** Maximum video file size in bytes (default: 500MB) */
  maxVideoFileSize?: number;
  /** Quality for image compression (0-100, default: 85) */
  compressionQuality?: number;
  /** Maximum dimension for resizing (default: 4096) */
  maxDimension?: number;
  /** Auto-detect 360 photos (default: true) */
  detect360?: boolean;
  /** Extract EXIF metadata (default: true) */
  extractExif?: boolean;
  /** Generate thumbnails (default: true) */
  generateThumbnail?: boolean;
  /** Folder path within storage bucket */
  folderPath?: string;
  /** Allow video uploads (default: true) */
  allowVideos?: boolean;
}

export interface PhotoUploadProgress {
  /** File being uploaded */
  file: File;
  /** Upload progress (0-100) */
  progress: number;
  /** Current status */
  status: 'pending' | 'detecting' | 'compressing' | 'uploading' | 'saving' | 'complete' | 'error' | 'generating_thumbnail';
  /** Error message if status is 'error' */
  error?: string;
  /** Detected as 360 photo */
  is360?: boolean;
  /** Is this a video file */
  isVideo?: boolean;
}

export interface PhotoUploadResult {
  /** Uploaded photo URL */
  fileUrl: string;
  /** Thumbnail URL if generated */
  thumbnailUrl?: string;
  /** Storage path */
  path: string;
  /** File name */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** Image width */
  width?: number;
  /** Image height */
  height?: number;
  /** Is 360 photo */
  is360: boolean;
  /** 360 metadata if applicable */
  equirectangularMetadata?: EquirectangularMetadata;
  /** EXIF data */
  exifData?: ExifData;
  /** Is this a video */
  isVideo?: boolean;
  /** Video duration in seconds */
  videoDuration?: number;
  /** Video codec */
  videoCodec?: string;
}

export interface ExifData {
  cameraMake?: string;
  cameraModel?: string;
  capturedAt?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  focalLength?: number;
  aperture?: string;
  iso?: number;
  exposureTime?: string;
  orientation?: number;
}

// =============================================
// Helper Functions
// =============================================

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
 * Compress image while preserving aspect ratio
 */
async function compressImage(
  file: File,
  maxDimension: number = 4096,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Calculate new dimensions while preserving aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = url;
  });
}

/**
 * Generate thumbnail from image
 */
async function generateThumbnail(file: File, maxDimension: number = 400): Promise<Blob> {
  return compressImage(file, maxDimension, 0.7);
}

/**
 * Extract EXIF metadata from image
 */
async function extractExifData(file: File): Promise<ExifData> {
  try {
    const exif = await exifr.parse(file, {
      tiff: true,
      xmp: false,
      icc: false,
      iptc: false,
      jfif: false,
    });

    if (!exif) {return {};}

    return {
      cameraMake: exif.Make,
      cameraModel: exif.Model,
      capturedAt: exif.DateTimeOriginal?.toISOString() || exif.CreateDate?.toISOString(),
      latitude: exif.latitude,
      longitude: exif.longitude,
      altitude: exif.GPSAltitude,
      focalLength: exif.FocalLength,
      aperture: exif.FNumber ? `f/${exif.FNumber}` : undefined,
      iso: exif.ISO,
      exposureTime: exif.ExposureTime
        ? exif.ExposureTime < 1
          ? `1/${Math.round(1 / exif.ExposureTime)}`
          : `${exif.ExposureTime}s`
        : undefined,
      orientation: exif.Orientation,
    };
  } catch {
    console.debug('EXIF extraction failed');
    return {};
  }
}

/**
 * Generate unique file name
 */
function generateFileName(originalName: string): string {
  const ext = originalName.split('.').pop() || 'jpg';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
}

// =============================================
// Main Hook
// =============================================

/**
 * Check if a file is a video based on MIME type
 */
function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

/**
 * Get video dimensions from a File
 */
async function getVideoDimensions(file: File): Promise<{ width: number; height: number; duration: number } | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    video.src = url;
  });
}

export function usePhotoUpload(options: PhotoUploadOptions) {
  const {
    projectId,
    entityType,
    entityId,
    maxFileSize = 50 * 1024 * 1024, // 50MB for photos
    maxVideoFileSize = 500 * 1024 * 1024, // 500MB for videos
    compressionQuality = 85,
    maxDimension = 4096,
    detect360: shouldDetect360 = true,
    extractExif = true,
    generateThumbnail: shouldGenerateThumbnail = true,
    folderPath,
    allowVideos = true,
  } = options;

  const queryClient = useQueryClient();
  const createPhoto = useCreatePhoto();

  const [uploadProgress, setUploadProgress] = useState<Map<string, PhotoUploadProgress>>(new Map());

  /**
   * Upload a single photo or video
   */
  const uploadPhoto = useCallback(
    async (file: File): Promise<PhotoUploadResult> => {
      const fileId = `${file.name}-${Date.now()}`;
      const isVideo = isVideoFile(file);

      // Update progress: Starting
      setUploadProgress((prev) => {
        const next = new Map(prev);
        next.set(fileId, { file, progress: 0, status: 'pending', isVideo });
        return next;
      });

      try {
        // Validate file type
        const isImage = file.type.startsWith('image/');
        if (!isImage && !isVideo) {
          throw new Error(`Invalid file type: ${file.type}. Only images and videos are allowed.`);
        }

        if (isVideo && !allowVideos) {
          throw new Error('Video uploads are not allowed.');
        }

        // Validate file size (different limits for photos vs videos)
        const fileSizeLimit = isVideo ? maxVideoFileSize : maxFileSize;
        if (file.size > fileSizeLimit) {
          throw new Error(
            `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds limit (${(fileSizeLimit / 1024 / 1024).toFixed(0)}MB)`
          );
        }

        // Get dimensions (different methods for images vs videos)
        let dimensions: { width: number; height: number } | null = null;
        let videoDuration: number | undefined;
        let videoCodec: string | undefined;

        if (isVideo) {
          const videoInfo = await getVideoDimensions(file);
          if (videoInfo) {
            dimensions = { width: videoInfo.width, height: videoInfo.height };
            videoDuration = Math.round(videoInfo.duration);
          }
          // Get video codec
          videoCodec = getVideoCodec(file.type);
        } else {
          dimensions = await getImageDimensions(file);
        }

        // Detect 360 photo (only for images)
        let is360 = false;
        let detect360Result: Detect360Result | undefined;

        if (shouldDetect360 && !isVideo) {
          setUploadProgress((prev) => {
            const next = new Map(prev);
            next.set(fileId, { ...prev.get(fileId)!, status: 'detecting', progress: 5 });
            return next;
          });

          detect360Result = await detect360Photo(file);
          is360 = detect360Result.is360;
        }

        setUploadProgress((prev) => {
          const next = new Map(prev);
          next.set(fileId, { ...prev.get(fileId)!, is360, progress: 10 });
          return next;
        });

        // Extract EXIF data (only for images)
        let exifData: ExifData = {};
        if (extractExif && !isVideo) {
          exifData = await extractExifData(file);
        }

        // Compress image (skip compression for 360 photos and videos)
        setUploadProgress((prev) => {
          const next = new Map(prev);
          next.set(fileId, { ...prev.get(fileId)!, status: isVideo ? 'generating_thumbnail' : 'compressing', progress: 15 });
          return next;
        });

        let uploadFile: Blob = file;
        if (!isVideo && !is360 && (dimensions?.width || 0) > maxDimension) {
          uploadFile = await compressImage(file, maxDimension, compressionQuality / 100);
        }

        // Generate thumbnail (different methods for images vs videos)
        let thumbnailBlob: Blob | undefined;
        if (shouldGenerateThumbnail) {
          if (isVideo) {
            // Generate thumbnail from video
            try {
              const videoThumbnail = await generateVideoThumbnail(file, {
                width: 400,
                time: 1,
                format: 'image/jpeg',
                quality: 0.8,
              });
              thumbnailBlob = videoThumbnail.blob;
            } catch (thumbError) {
              console.warn('Failed to generate video thumbnail:', thumbError);
            }
          } else if (!is360) {
            thumbnailBlob = await generateThumbnail(file, 400);
          }
        }

        // Prepare file paths
        const fileName = generateFileName(file.name);
        const basePath = folderPath
          ? `${projectId}/${folderPath}`
          : `${projectId}/photos`;
        const filePath = `${basePath}/${fileName}`;
        const thumbnailPath = thumbnailBlob ? `${basePath}/thumbnails/${fileName}` : undefined;

        // Upload to Supabase Storage
        setUploadProgress((prev) => {
          const next = new Map(prev);
          next.set(fileId, { ...prev.get(fileId)!, status: 'uploading', progress: 30 });
          return next;
        });

        // Upload main file
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, uploadFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        setUploadProgress((prev) => {
          const next = new Map(prev);
          next.set(fileId, { ...prev.get(fileId)!, progress: 70 });
          return next;
        });

        // Upload thumbnail if generated
        let thumbnailUrl: string | undefined;
        if (thumbnailBlob && thumbnailPath) {
          const { error: thumbError } = await supabase.storage
            .from('project-files')
            .upload(thumbnailPath, thumbnailBlob, {
              cacheControl: '3600',
              upsert: false,
            });

          if (!thumbError) {
            const { data: thumbUrlData } = supabase.storage
              .from('project-files')
              .getPublicUrl(thumbnailPath);
            thumbnailUrl = thumbUrlData.publicUrl;
          }
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(filePath);
        const fileUrl = urlData.publicUrl;

        setUploadProgress((prev) => {
          const next = new Map(prev);
          next.set(fileId, { ...prev.get(fileId)!, progress: 80 });
          return next;
        });

        // Build equirectangular metadata
        let equirectangularMetadata: EquirectangularMetadata | undefined;
        if (is360 && detect360Result) {
          equirectangularMetadata = {
            projectionType: 'equirectangular',
            detectedBy: detect360Result.detectionMethod as EquirectangularMetadata['detectedBy'],
            detectedAt: new Date().toISOString(),
            aspectRatio: detect360Result.metadata?.aspectRatio,
            confidence: detect360Result.confidence,
            fullPanoWidth: detect360Result.metadata?.fullPanoWidth,
            fullPanoHeight: detect360Result.metadata?.fullPanoHeight,
            initialViewHeading: detect360Result.metadata?.initialViewHeading,
            initialViewPitch: detect360Result.metadata?.initialViewPitch,
            initialViewRoll: detect360Result.metadata?.initialViewRoll,
          };
        }

        // Save photo record to database
        setUploadProgress((prev) => {
          const next = new Map(prev);
          next.set(fileId, { ...prev.get(fileId)!, status: 'saving', progress: 90 });
          return next;
        });

        const photoDto: CreatePhotoDTO & { isVideo?: boolean; videoDuration?: number; videoCodec?: string } = {
          projectId,
          fileUrl,
          thumbnailUrl,
          fileName: file.name,
          fileSize: uploadFile instanceof Blob ? uploadFile.size : file.size,
          width: dimensions?.width,
          height: dimensions?.height,
          is360,
          equirectangularMetadata,
          capturedAt: exifData.capturedAt,
          latitude: exifData.latitude,
          longitude: exifData.longitude,
          altitude: exifData.altitude,
          cameraMake: exifData.cameraMake,
          cameraModel: exifData.cameraModel,
          focalLength: exifData.focalLength,
          aperture: exifData.aperture,
          iso: exifData.iso,
          exposureTime: exifData.exposureTime,
          orientation: exifData.orientation,
          source: 'upload' as PhotoSource,
          deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop' as DeviceType,
          ...(entityType === 'daily_report' && entityId ? { dailyReportId: entityId } : {}),
          ...(entityType === 'punch_item' && entityId ? { punchItemId: entityId } : {}),
          ...(entityType === 'safety_incident' && entityId ? { safetyIncidentId: entityId } : {}),
          ...(entityType === 'workflow_item' && entityId ? { workflowItemId: entityId } : {}),
          // Video-specific fields
          ...(isVideo ? {
            isVideo: true,
            videoDuration,
            videoCodec,
          } : {}),
        };

        await createPhoto.mutateAsync(photoDto);

        // Complete
        setUploadProgress((prev) => {
          const next = new Map(prev);
          next.set(fileId, { ...prev.get(fileId)!, status: 'complete', progress: 100 });
          return next;
        });

        return {
          fileUrl,
          thumbnailUrl,
          path: filePath,
          fileName: file.name,
          fileSize: uploadFile instanceof Blob ? uploadFile.size : file.size,
          width: dimensions?.width,
          height: dimensions?.height,
          is360,
          equirectangularMetadata,
          exifData,
          isVideo,
          videoDuration,
          videoCodec,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        setUploadProgress((prev) => {
          const next = new Map(prev);
          next.set(fileId, { ...prev.get(fileId)!, status: 'error', error: errorMessage });
          return next;
        });
        throw error;
      }
    },
    [
      projectId,
      entityType,
      entityId,
      maxFileSize,
      maxVideoFileSize,
      compressionQuality,
      maxDimension,
      shouldDetect360,
      extractExif,
      shouldGenerateThumbnail,
      folderPath,
      allowVideos,
      createPhoto,
    ]
  );

  /**
   * Upload multiple photos and/or videos
   */
  const uploadPhotos = useCallback(
    async (files: File[]): Promise<PhotoUploadResult[]> => {
      const results: PhotoUploadResult[] = [];
      const errors: Error[] = [];

      for (const file of files) {
        try {
          const result = await uploadPhoto(file);
          results.push(result);
        } catch (error) {
          errors.push(error instanceof Error ? error : new Error('Upload failed'));
        }
      }

      // Invalidate queries after all uploads
      queryClient.invalidateQueries({ queryKey: photoKeys.lists() });

      if (errors.length > 0) {
        toast.error(`${errors.length} file(s) failed to upload`);
      }

      if (results.length > 0) {
        const count360 = results.filter((r) => r.is360).length;
        const countVideos = results.filter((r) => r.isVideo).length;
        const countPhotos = results.length - countVideos;

        if (countVideos > 0 && countPhotos > 0) {
          toast.success(`Uploaded ${countPhotos} photo(s) and ${countVideos} video(s)`);
        } else if (countVideos > 0) {
          toast.success(`Uploaded ${countVideos} video(s)`);
        } else if (count360 > 0) {
          toast.success(`Uploaded ${results.length} photo(s) (${count360} 360 photo${count360 > 1 ? 's' : ''} detected)`);
        } else {
          toast.success(`Uploaded ${results.length} photo(s)`);
        }
      }

      return results;
    },
    [uploadPhoto, queryClient]
  );

  /**
   * Clear upload progress
   */
  const clearProgress = useCallback(() => {
    setUploadProgress(new Map());
  }, []);

  /**
   * Get overall upload status
   */
  const isUploading = Array.from(uploadProgress.values()).some(
    (p) => p.status !== 'complete' && p.status !== 'error'
  );

  const uploadCount = uploadProgress.size;
  const completeCount = Array.from(uploadProgress.values()).filter(
    (p) => p.status === 'complete'
  ).length;
  const errorCount = Array.from(uploadProgress.values()).filter(
    (p) => p.status === 'error'
  ).length;

  return {
    uploadPhoto,
    uploadPhotos,
    uploadProgress: Array.from(uploadProgress.values()),
    clearProgress,
    isUploading,
    uploadCount,
    completeCount,
    errorCount,
  };
}

export default usePhotoUpload;
