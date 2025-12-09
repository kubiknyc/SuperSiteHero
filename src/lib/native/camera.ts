/**
 * Native Camera Utility
 * Uses native camera on iOS/Android, falls back to browser on web
 */

import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { isNative, isPluginAvailable } from './platform';

export interface CapturedPhoto {
  dataUrl: string;
  format: string;
  webPath?: string;
  path?: string;
  exif?: Record<string, unknown>;
}

export interface CameraOptions {
  quality?: number;
  allowEditing?: boolean;
  source?: 'camera' | 'photos' | 'prompt';
  width?: number;
  height?: number;
  saveToGallery?: boolean;
}

const defaultOptions: CameraOptions = {
  quality: 90,
  allowEditing: false,
  source: 'camera',
  saveToGallery: false,
};

/**
 * Check if camera is available
 */
export function isCameraAvailable(): boolean {
  if (isNative()) {
    return isPluginAvailable('Camera');
  }
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Request camera permissions
 */
export async function requestCameraPermission(): Promise<boolean> {
  if (!isNative()) {
    // On web, permissions are requested when getUserMedia is called
    return true;
  }

  try {
    const permission = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
    return permission.camera === 'granted' || permission.camera === 'limited';
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
}

/**
 * Take a photo using native camera or browser
 */
export async function takePhoto(options: CameraOptions = {}): Promise<CapturedPhoto | null> {
  const mergedOptions = { ...defaultOptions, ...options };

  if (isNative() && isPluginAvailable('Camera')) {
    return takeNativePhoto(mergedOptions);
  }
  return takeBrowserPhoto(mergedOptions);
}

/**
 * Take photo using native Capacitor Camera
 */
async function takeNativePhoto(options: CameraOptions): Promise<CapturedPhoto | null> {
  try {
    const sourceMap: Record<string, CameraSource> = {
      camera: CameraSource.Camera,
      photos: CameraSource.Photos,
      prompt: CameraSource.Prompt,
    };

    const photo: Photo = await Camera.getPhoto({
      quality: options.quality || 90,
      allowEditing: options.allowEditing || false,
      resultType: CameraResultType.DataUrl,
      source: sourceMap[options.source || 'camera'],
      width: options.width,
      height: options.height,
      saveToGallery: options.saveToGallery,
      correctOrientation: true,
    });

    return {
      dataUrl: photo.dataUrl || '',
      format: photo.format,
      webPath: photo.webPath,
      path: photo.path,
      exif: photo.exif,
    };
  } catch (error) {
    // User cancelled or error occurred
    if ((error as Error).message?.includes('cancelled')) {
      return null;
    }
    console.error('Native camera error:', error);
    throw error;
  }
}

/**
 * Take photo using browser MediaDevices API
 */
async function takeBrowserPhoto(options: CameraOptions): Promise<CapturedPhoto | null> {
  return new Promise((resolve, reject) => {
    // Create hidden file input for photo selection
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    if (options.source === 'camera') {
      input.capture = 'environment'; // Use back camera on mobile
    }

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      try {
        const dataUrl = await fileToDataUrl(file);
        resolve({
          dataUrl,
          format: file.type.split('/')[1] || 'jpeg',
        });
      } catch (error) {
        reject(error);
      }
    };

    input.oncancel = () => {
      resolve(null);
    };

    input.click();
  });
}

/**
 * Convert File to data URL
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Pick multiple photos from gallery
 */
export async function pickPhotos(limit = 10): Promise<CapturedPhoto[]> {
  if (isNative() && isPluginAvailable('Camera')) {
    try {
      const result = await Camera.pickImages({
        quality: 90,
        limit,
      });

      return result.photos.map((photo) => ({
        dataUrl: '', // Need to read file separately
        format: photo.format,
        webPath: photo.webPath,
        path: photo.path,
      }));
    } catch (error) {
      if ((error as Error).message?.includes('cancelled')) {
        return [];
      }
      throw error;
    }
  }

  // Browser fallback with multiple selection
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;

    input.onchange = async (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (!files || files.length === 0) {
        resolve([]);
        return;
      }

      const photos: CapturedPhoto[] = [];
      for (let i = 0; i < Math.min(files.length, limit); i++) {
        const dataUrl = await fileToDataUrl(files[i]);
        photos.push({
          dataUrl,
          format: files[i].type.split('/')[1] || 'jpeg',
        });
      }
      resolve(photos);
    };

    input.oncancel = () => resolve([]);
    input.click();
  });
}
