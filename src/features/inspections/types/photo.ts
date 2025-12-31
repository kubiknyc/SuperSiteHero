// File: /src/features/inspections/types/photo.ts
// Type definitions for inspection photos

export interface InspectionPhoto {
  id: string
  inspection_id: string
  url: string
  thumbnail_url: string | null
  storage_path: string | null
  caption: string | null
  photo_type: PhotoType
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  width: number | null
  height: number | null
  latitude: number | null
  longitude: number | null
  location_description: string | null
  taken_at: string | null
  device_info: string | null
  uploaded_by: string | null
  display_order: number
  created_at: string
  updated_at: string
}

export type PhotoType = 'general' | 'before' | 'after' | 'deficiency' | 'compliance'

export const PHOTO_TYPES: { value: PhotoType; label: string; description: string }[] = [
  { value: 'general', label: 'General', description: 'General documentation photo' },
  { value: 'before', label: 'Before', description: 'Condition before work' },
  { value: 'after', label: 'After', description: 'Condition after work' },
  { value: 'deficiency', label: 'Deficiency', description: 'Issue or deficiency found' },
  { value: 'compliance', label: 'Compliance', description: 'Compliance documentation' },
]

export interface UploadInspectionPhotoInput {
  inspection_id: string
  file: File
  caption?: string
  photo_type?: PhotoType
  location_description?: string
}

export interface UpdateInspectionPhotoInput {
  caption?: string
  photo_type?: PhotoType
  location_description?: string
  display_order?: number
}
