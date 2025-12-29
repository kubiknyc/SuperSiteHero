// Supabase Storage hooks for daily report photos
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'

const STORAGE_BUCKET = 'daily-report-photos'

/**
 * Generate storage path for photo
 */
export function generateStoragePath(reportId: string, filename: string): string {
  const timestamp = Date.now()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${reportId}/${timestamp}_${sanitizedFilename}`
}

/**
 * Upload a photo to Supabase Storage
 */
export function useUploadPhoto() {
  const { userProfile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      file,
      reportId,
      onProgress: _onProgress,
    }: {
      file: File
      reportId: string
      onProgress?: (progress: number) => void
    }) => {
      if (!userProfile?.company_id) {
        throw new Error('User company not found')
      }

      const path = generateStoragePath(reportId, file.name)

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)

      return {
        path: data.path,
        url: urlData.publicUrl,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-report-photos'] })
    },
  })
}

/**
 * Delete a photo from Supabase Storage
 */
export function useDeletePhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (path: string) => {
      const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path])

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-report-photos'] })
    },
  })
}

/**
 * Save photo metadata to database
 */
export function useSavePhotoMetadata() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (photo: {
      daily_report_id: string
      file_path: string
      file_name: string
      file_size: number
      caption?: string
      gps_latitude?: number
      gps_longitude?: number
      gps_altitude?: number
      captured_at?: string
      metadata?: Record<string, any>
    }) => {
      const { data, error } = await (supabase as any)
        .from('daily_report_photos')
        .insert(photo)
        .select()
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['daily-report-photos', data.daily_report_id] })
    },
  })
}

/**
 * Delete photo metadata from database
 */
export function useDeletePhotoMetadata() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (photoId: string) => {
      const { error } = await (supabase as any).from('daily_report_photos').delete().eq('id', photoId)

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-report-photos'] })
    },
  })
}

/**
 * Fetch photos for a daily report
 */
export function useDailyReportPhotos(reportId: string | undefined) {
  return useQuery({
    queryKey: ['daily-report-photos', reportId],
    queryFn: async () => {
      if (!reportId) {
        throw new Error('Report ID required')
      }

      const { data, error } = await (supabase as any)
        .from('daily_report_photos')
        .select('*')
        .eq('daily_report_id', reportId)
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return data
    },
    enabled: !!reportId,
  })
}

/**
 * Update photo caption
 */
export function useUpdatePhotoCaption() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ photoId, caption }: { photoId: string; caption: string }) => {
      const { data, error } = await (supabase as any)
        .from('daily_report_photos')
        .update({ caption })
        .eq('id', photoId)
        .select()
        .single()

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['daily-report-photos', data.daily_report_id] })
    },
  })
}
