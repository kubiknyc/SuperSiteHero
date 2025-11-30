/**
 * Client Photos Gallery
 *
 * Read-only photo gallery view for clients.
 */

import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useClientPhotos } from '../hooks/useClientPortal'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Image,
  Calendar,
  MapPin,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { ClientPhotoView } from '@/types/client-portal'

export function ClientPhotos() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: photos, isLoading } = useClientPhotos(projectId)

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedPhoto, setSelectedPhoto] = useState<ClientPhotoView | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number>(0)

  // Get unique categories
  const categories = useMemo(() => {
    if (!photos) return []
    const cats = new Set(photos.map(p => p.category).filter(Boolean))
    return Array.from(cats) as string[]
  }, [photos])

  // Filter photos
  const filteredPhotos = useMemo(() => {
    if (!photos) return []
    return photos.filter(photo => {
      const matchesSearch = !searchTerm ||
        photo.caption?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = categoryFilter === 'all' || photo.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [photos, searchTerm, categoryFilter])

  // Group photos by date
  const photosByDate = useMemo(() => {
    const grouped: Record<string, ClientPhotoView[]> = {}
    filteredPhotos.forEach(photo => {
      const dateKey = photo.taken_at
        ? format(new Date(photo.taken_at), 'yyyy-MM-dd')
        : 'undated'
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(photo)
    })
    return grouped
  }, [filteredPhotos])

  const sortedDates = Object.keys(photosByDate).sort((a, b) => b.localeCompare(a))

  const openLightbox = (photo: ClientPhotoView) => {
    const index = filteredPhotos.findIndex(p => p.id === photo.id)
    setLightboxIndex(index)
    setSelectedPhoto(photo)
  }

  const navigateLightbox = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev'
      ? (lightboxIndex - 1 + filteredPhotos.length) % filteredPhotos.length
      : (lightboxIndex + 1) % filteredPhotos.length
    setLightboxIndex(newIndex)
    setSelectedPhoto(filteredPhotos[newIndex])
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Project Photos</h1>
        <p className="text-gray-600 mt-1">
          Browse progress photos from the project.
        </p>
      </div>

      {/* Filters */}
      {photos && photos.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search photos by caption..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {categories.length > 0 && (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Photo Count */}
      {filteredPhotos.length > 0 && (
        <p className="text-sm text-gray-500">
          Showing {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''}
          {searchTerm || categoryFilter !== 'all' ? ' (filtered)' : ''}
        </p>
      )}

      {/* Photos Grid by Date */}
      {sortedDates.length > 0 ? (
        <div className="space-y-8">
          {sortedDates.map(dateKey => {
            const datePhotos = photosByDate[dateKey]
            const displayDate = dateKey === 'undated'
              ? 'Undated'
              : format(new Date(dateKey), 'MMMM d, yyyy')

            return (
              <div key={dateKey}>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  {displayDate}
                  <span className="text-sm font-normal text-gray-500">
                    ({datePhotos.length} photo{datePhotos.length !== 1 ? 's' : ''})
                  </span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {datePhotos.map(photo => (
                    <button
                      key={photo.id}
                      onClick={() => openLightbox(photo)}
                      className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <img
                        src={photo.thumbnail_url || photo.photo_url}
                        alt={photo.caption || 'Project photo'}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {/* Caption Overlay */}
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                          <p className="text-white text-sm truncate">{photo.caption}</p>
                        </div>
                      )}
                      {/* Category Badge */}
                      {photo.category && (
                        <div className="absolute top-2 left-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/90 text-gray-700">
                            {photo.category}
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Photos Available</h3>
            <p className="text-gray-500 mt-1">
              {searchTerm || categoryFilter !== 'all'
                ? 'No photos match your filters. Try adjusting your search.'
                : 'Project photos will appear here once they\'re uploaded.'}
            </p>
            {(searchTerm || categoryFilter !== 'all') && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchTerm('')
                  setCategoryFilter('all')
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-5xl p-0 bg-black/95">
          <DialogHeader className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/70 to-transparent">
            <DialogTitle className="text-white">
              {selectedPhoto?.caption || 'Photo'}
            </DialogTitle>
          </DialogHeader>

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-20 text-white hover:bg-white/20"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Navigation Buttons */}
          {filteredPhotos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20 h-12 w-12"
                onClick={() => navigateLightbox('prev')}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20 h-12 w-12"
                onClick={() => navigateLightbox('next')}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}

          {/* Main Image */}
          <div className="flex items-center justify-center min-h-[60vh] p-8">
            {selectedPhoto && (
              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.caption || 'Project photo'}
                className="max-w-full max-h-[70vh] object-contain"
              />
            )}
          </div>

          {/* Photo Info */}
          {selectedPhoto && (
            <div className="p-4 bg-black/80 text-white">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {selectedPhoto.taken_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedPhoto.taken_at), 'MMMM d, yyyy h:mm a')}
                  </span>
                )}
                {selectedPhoto.latitude && selectedPhoto.longitude && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    GPS: {selectedPhoto.latitude.toFixed(6)}, {selectedPhoto.longitude.toFixed(6)}
                  </span>
                )}
                {selectedPhoto.category && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/20">
                    {selectedPhoto.category}
                  </span>
                )}
                <span className="text-gray-400 ml-auto">
                  {lightboxIndex + 1} of {filteredPhotos.length}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
