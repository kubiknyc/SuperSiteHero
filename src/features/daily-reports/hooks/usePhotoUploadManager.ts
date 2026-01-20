/**
 * Photo Upload Manager Hook
 * Orchestrates batch photo uploads with compression, GPS/EXIF extraction, and progress tracking
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  compressImage,
  extractGPSData,
  extractEXIFData,
  generateThumbnail,
  validateImageFile,
  validateFileSize,
} from '../utils/photoUtils';
import type { PhotoEntryV2, PhotoCategory } from '@/types/daily-reports-v2';
import { logger } from '@/lib/utils/logger';

const BUCKET_NAME = 'daily-report-photos';
const MAX_FILE_SIZE_MB = 50;

interface UploadProgress {
  photoId: string;
  status: 'pending' | 'compressing' | 'extracting' | 'uploading' | 'uploaded' | 'failed';
  progress: number; // 0-100
  error?: string;
}

interface ProcessedPhoto {
  id: string;
  file: File;
  compressedFile?: File;
  thumbnailDataUrl?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  compassHeading?: number;
  takenAt?: string;
  originalFileName: string;
}

interface UsePhotoUploadManagerReturn {
  uploadProgress: Record<string, UploadProgress>;
  isUploading: boolean;
  processPhoto: (file: File, photoId: string) => Promise<ProcessedPhoto>;
  uploadPhoto: (
    processedPhoto: ProcessedPhoto,
    projectId: string,
    reportDate: string,
    reportId: string
  ) => Promise<string>;
  uploadBatch: (
    photos: ProcessedPhoto[],
    projectId: string,
    reportDate: string,
    reportId: string
  ) => Promise<{ uploaded: PhotoEntryV2[]; failed: string[] }>;
  clearProgress: () => void;
}

export function usePhotoUploadManager(): UsePhotoUploadManagerReturn {
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const [isUploading, setIsUploading] = useState(false);

  // Update progress for a specific photo
  const updateProgress = useCallback(
    (photoId: string, update: Partial<UploadProgress>) => {
      setUploadProgress((prev) => ({
        ...prev,
        // eslint-disable-next-line security/detect-object-injection
        [photoId]: {
          ...prev[photoId],
          photoId,
          ...update,
        },
      }));
    },
    []
  );

  // Process a photo (compress, extract GPS/EXIF, generate thumbnail)
  const processPhoto = useCallback(
    async (file: File, photoId: string): Promise<ProcessedPhoto> => {
      updateProgress(photoId, { status: 'pending', progress: 0 });

      // Validate file
      if (!validateImageFile(file)) {
        throw new Error(`Invalid file type: ${file.type}`);
      }

      if (!validateFileSize(file, MAX_FILE_SIZE_MB)) {
        throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max ${MAX_FILE_SIZE_MB}MB)`);
      }

      const processedPhoto: ProcessedPhoto = {
        id: photoId,
        file,
        originalFileName: file.name,
      };

      try {
        // Compress image
        updateProgress(photoId, { status: 'compressing', progress: 20 });
        processedPhoto.compressedFile = await compressImage(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          quality: 0.8,
        });

        // Extract GPS and EXIF data
        updateProgress(photoId, { status: 'extracting', progress: 50 });

        const [gpsData, exifData, thumbnailDataUrl] = await Promise.all([
          extractGPSData(file),
          extractEXIFData(file),
          generateThumbnail(file, 300),
        ]);

        if (gpsData) {
          processedPhoto.gpsLatitude = gpsData.latitude;
          processedPhoto.gpsLongitude = gpsData.longitude;
        }

        if (exifData?.dateTime) {
          // Convert EXIF date to ISO string if possible
          try {
            const date = new Date(exifData.dateTime);
            if (!isNaN(date.getTime())) {
              processedPhoto.takenAt = date.toISOString();
            }
          } catch {
            // Ignore date parsing errors
          }
        }

        processedPhoto.thumbnailDataUrl = thumbnailDataUrl;

        updateProgress(photoId, { status: 'pending', progress: 100 });

        return processedPhoto;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to process photo';

        updateProgress(photoId, {
          status: 'failed',
          progress: 0,
          error: errorMessage,
        });
        throw error;
      }
    },
    [updateProgress]
  );

  // Upload a single processed photo to Supabase Storage
  const uploadPhoto = useCallback(
    async (
      processedPhoto: ProcessedPhoto,
      projectId: string,
      reportDate: string,
      reportId: string
    ): Promise<string> => {
      const { id, compressedFile, file, originalFileName } = processedPhoto;

      updateProgress(id, { status: 'uploading', progress: 0 });

      try {
        const fileToUpload = compressedFile || file;
        const extension = originalFileName.split('.').pop() || 'jpg';
        const storagePath = `${projectId}/${reportDate}/${reportId}/${id}.${extension}`;

        // Upload main image
        const { data: _data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, fileToUpload, {
            cacheControl: '3600',
            upsert: true,
          });

        if (error) {
          throw new Error(`Upload failed: ${error.message}`);
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

        updateProgress(id, { status: 'uploaded', progress: 100 });

        return publicUrl;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';

        updateProgress(id, {
          status: 'failed',
          progress: 0,
          error: errorMessage,
        });
        throw error;
      }
    },
    [updateProgress]
  );

  // Upload a batch of photos
  const uploadBatch = useCallback(
    async (
      photos: ProcessedPhoto[],
      projectId: string,
      reportDate: string,
      reportId: string
    ): Promise<{ uploaded: PhotoEntryV2[]; failed: string[] }> => {
      setIsUploading(true);

      const uploaded: PhotoEntryV2[] = [];
      const failed: string[] = [];

      for (const photo of photos) {
        try {
          const publicUrl = await uploadPhoto(photo, projectId, reportDate, reportId);

          // Create PhotoEntryV2 object
          const photoEntry: PhotoEntryV2 = {
            id: photo.id,
            daily_report_id: reportId,
            file_url: publicUrl,
            thumbnail_url: photo.thumbnailDataUrl || undefined,
            category: 'general' as PhotoCategory,
            gps_latitude: photo.gpsLatitude,
            gps_longitude: photo.gpsLongitude,
            taken_at: photo.takenAt || new Date().toISOString(),
            upload_status: 'uploaded',
            created_at: new Date().toISOString(),
          };

          uploaded.push(photoEntry);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error('Failed to upload photo:', { photoId: photo.id, error: errorMessage });
          failed.push(photo.id);
        }
      }

      setIsUploading(false);

      return { uploaded, failed };
    },
    [uploadPhoto]
  );

  // Clear all progress
  const clearProgress = useCallback(() => {
    setUploadProgress({});
  }, []);

  return {
    uploadProgress,
    isUploading,
    processPhoto,
    uploadPhoto,
    uploadBatch,
    clearProgress,
  };
}

export type { UploadProgress, ProcessedPhoto, UsePhotoUploadManagerReturn };
