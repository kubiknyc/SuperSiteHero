/**
 * Subcontractor Photos Hooks
 * Hooks for viewing project photos (P2-1 Feature)
 */

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { subcontractorPortalApi } from '@/lib/api/services/subcontractor-portal'
import type {
  SubcontractorPhoto,
  SubcontractorPhotoFilters,
  PhotoSummary,
  PhotoCategory,
} from '@/types/subcontractor-portal'

// =============================================
// QUERY KEYS
// =============================================

export const photoKeys = {
  all: ['subcontractor', 'photos'] as const,
  list: (filters?: SubcontractorPhotoFilters) => [...photoKeys.all, 'list', filters] as const,
  summary: () => [...photoKeys.all, 'summary'] as const,
}

// =============================================
// QUERY HOOKS
// =============================================

/**
 * Fetch photos from the subcontractor's projects
 */
export function useSubcontractorPhotos(filters?: SubcontractorPhotoFilters) {
  const { user } = useAuth()

  return useQuery({
    queryKey: photoKeys.list(filters),
    queryFn: () => subcontractorPortalApi.getProjectPhotos(user?.id || '', filters),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch photo summary for dashboard
 */
export function usePhotoSummary() {
  const { user } = useAuth()

  return useQuery({
    queryKey: photoKeys.summary(),
    queryFn: () => subcontractorPortalApi.getPhotoSummary(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Get category label
 */
export function getCategoryLabel(category: PhotoCategory | null): string {
  if (!category) { return 'General' }
  const labels: Record<PhotoCategory, string> = {
    progress: 'Progress',
    safety: 'Safety',
    quality: 'Quality',
    weather: 'Weather',
    delivery: 'Delivery',
    equipment: 'Equipment',
    general: 'General',
    issue: 'Issue',
  }
  return labels[category] || category
}

/**
 * Get category color
 */
export function getCategoryColor(category: PhotoCategory | null): string {
  if (!category) { return 'text-muted-foreground' }
  switch (category) {
    case 'progress':
      return 'text-primary'
    case 'safety':
      return 'text-destructive'
    case 'quality':
      return 'text-success'
    case 'weather':
      return 'text-warning'
    case 'delivery':
      return 'text-info'
    case 'equipment':
      return 'text-warning-600'
    case 'issue':
      return 'text-destructive'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Get category badge variant
 */
export function getCategoryBadgeVariant(category: PhotoCategory | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!category) { return 'outline' }
  switch (category) {
    case 'safety':
    case 'issue':
      return 'destructive'
    case 'progress':
    case 'quality':
      return 'default'
    default:
      return 'secondary'
  }
}

/**
 * Format photo date for display
 */
export function formatPhotoDate(dateString: string | null): string {
  if (!dateString) { return '-' }
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format photo datetime for display
 */
export function formatPhotoDateTime(dateString: string | null): string {
  if (!dateString) { return '-' }
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Filter photos by category
 */
export function filterPhotosByCategory(
  photos: SubcontractorPhoto[],
  category: PhotoCategory | 'all'
): SubcontractorPhoto[] {
  if (category === 'all') { return photos }
  return photos.filter(p => p.category === category)
}

/**
 * Group photos by date
 */
export function groupPhotosByDate(
  photos: SubcontractorPhoto[]
): Record<string, SubcontractorPhoto[]> {
  return photos.reduce((acc, photo) => {
    const date = photo.uploaded_at.split('T')[0]
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(photo)
    return acc
  }, {} as Record<string, SubcontractorPhoto[]>)
}

/**
 * Group photos by project
 */
export function groupPhotosByProject(
  photos: SubcontractorPhoto[]
): Record<string, SubcontractorPhoto[]> {
  return photos.reduce((acc, photo) => {
    const key = photo.project_id
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(photo)
    return acc
  }, {} as Record<string, SubcontractorPhoto[]>)
}

// Re-export types for convenience
export type {
  SubcontractorPhoto,
  SubcontractorPhotoFilters,
  PhotoSummary,
  PhotoCategory,
}
