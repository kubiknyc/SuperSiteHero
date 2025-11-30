// Photo-related types for daily reports

export interface GPSCoordinates {
  latitude: number
  longitude: number
  altitude?: number
  accuracy?: number
}

export interface EXIFData {
  make?: string
  model?: string
  dateTime?: string
  orientation?: number
  exposureTime?: number
  fNumber?: number
  iso?: number
  focalLength?: number
  flash?: boolean
  [key: string]: any
}

export interface PhotoMetadata {
  filename: string
  size: number
  type: string
  uploadedAt: string
  capturedAt?: string
  gps?: GPSCoordinates
  exif?: EXIFData
  width?: number
  height?: number
}

export interface DailyReportPhoto {
  id: string
  reportId?: string
  url?: string
  thumbnailUrl?: string
  caption?: string
  metadata: PhotoMetadata
  localFile?: File
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed'
  uploadProgress?: number
  error?: string
}

export interface PhotoUploadOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
  quality?: number
  extractGPS?: boolean
  extractEXIF?: boolean
}

export const DEFAULT_UPLOAD_OPTIONS: PhotoUploadOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  quality: 0.8,
  extractGPS: true,
  extractEXIF: true,
}
