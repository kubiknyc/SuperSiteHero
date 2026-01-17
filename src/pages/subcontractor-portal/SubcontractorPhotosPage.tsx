/**
 * Subcontractor Photos Page
 * View project photos (read-only) - P2-1 Feature
 */

import { useState, useMemo } from 'react'
import {
  useSubcontractorPhotos,
  usePhotoSummary,
  getCategoryLabel,
  getCategoryBadgeVariant,
  formatPhotoDateTime,
  groupPhotosByDate,
  type SubcontractorPhoto,
  type PhotoCategory,
} from '@/features/subcontractor-portal/hooks'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import {
  Camera,
  Grid3X3,
  List,
  Calendar,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  User,
  Tag,
  Building2,
  ImageIcon,
  ZoomIn,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Category options for filtering
const CATEGORY_OPTIONS: Array<{ value: PhotoCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All Categories' },
  { value: 'progress', label: 'Progress' },
  { value: 'safety', label: 'Safety' },
  { value: 'quality', label: 'Quality' },
  { value: 'weather', label: 'Weather' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'issue', label: 'Issue' },
  { value: 'general', label: 'General' },
]

type ViewMode = 'grid' | 'list' | 'timeline'

export default function SubcontractorPhotosPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedCategory, setSelectedCategory] = useState<PhotoCategory | 'all'>('all')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<SubcontractorPhoto | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Fetch photos with filters
  const { data: photos = [], isLoading } = useSubcontractorPhotos({
    category: selectedCategory === 'all' ? undefined : selectedCategory,
    project_id: selectedProject === 'all' ? undefined : selectedProject,
    search: searchQuery || undefined,
  })

  const { data: summary } = usePhotoSummary()

  // Get unique projects from photos for filter dropdown
  const projectOptions = useMemo(() => {
    const projectMap = new Map<string, string>()
    photos.forEach((photo) => {
      if (!projectMap.has(photo.project_id)) {
        projectMap.set(photo.project_id, photo.project_name)
      }
    })
    return Array.from(projectMap.entries()).map(([id, name]) => ({
      value: id,
      label: name,
    }))
  }, [photos])

  // Group photos by date for timeline view
  const photosByDate = useMemo(() => groupPhotosByDate(photos), [photos])

  // Sorted date keys (most recent first)
  const sortedDates = useMemo(
    () => Object.keys(photosByDate).sort((a, b) => b.localeCompare(a)),
    [photosByDate]
  )

  // Handle lightbox navigation
  const handlePrevPhoto = () => {
    setLightboxIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))
    setSelectedPhoto(photos[lightboxIndex > 0 ? lightboxIndex - 1 : photos.length - 1])
  }

  const handleNextPhoto = () => {
    setLightboxIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))
    setSelectedPhoto(photos[lightboxIndex < photos.length - 1 ? lightboxIndex + 1 : 0])
  }

  const openLightbox = (photo: SubcontractorPhoto, index: number) => {
    setSelectedPhoto(photo)
    setLightboxIndex(index)
  }

  const closeLightbox = () => {
    setSelectedPhoto(null)
  }

  // Format date for timeline headers
  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Today'
    }
    if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday'
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 heading-page">
            <Camera className="h-6 w-6 text-primary" />
            Project Photos
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse photos from your assigned projects
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Photos</span>
              </div>
              <p className="heading-section mt-1">{summary.total_photos}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">This Week</span>
              </div>
              <p className="heading-section mt-1">{summary.photos_this_week}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">This Month</span>
              </div>
              <p className="heading-section mt-1">{summary.photos_this_month}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Projects</span>
              </div>
              <p className="heading-section mt-1">{summary.photos_by_project.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and View Controls */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by caption, location, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select
              value={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value as PhotoCategory | 'all')}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Project Filter */}
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projectOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 w-8 p-0"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'timeline' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('timeline')}
                className="h-8 w-8 p-0"
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Active Filters */}
          {(selectedCategory !== 'all' || selectedProject !== 'all' || searchQuery) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedCategory !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {getCategoryLabel(selectedCategory)}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSelectedCategory('all')}
                  />
                </Badge>
              )}
              {selectedProject !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {projectOptions.find((p) => p.value === selectedProject)?.label}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSelectedProject('all')}
                  />
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: {searchQuery}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => {
                  setSelectedCategory('all')
                  setSelectedProject('all')
                  setSearchQuery('')
                }}
              >
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading photos...</div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && photos.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="mb-2 heading-subsection">No Photos Found</h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedCategory !== 'all' || selectedProject !== 'all'
                  ? 'Try adjusting your filters to see more photos.'
                  : 'Photos from your assigned projects will appear here.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid View */}
      {!isLoading && photos.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {photos.map((photo, index) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              onClick={() => openLightbox(photo, index)}
            />
          ))}
        </div>
      )}

      {/* List View */}
      {!isLoading && photos.length > 0 && viewMode === 'list' && (
        <div className="space-y-3">
          {photos.map((photo, index) => (
            <PhotoListItem
              key={photo.id}
              photo={photo}
              onClick={() => openLightbox(photo, index)}
            />
          ))}
        </div>
      )}

      {/* Timeline View */}
      {!isLoading && photos.length > 0 && viewMode === 'timeline' && (
        <div className="space-y-8">
          {sortedDates.map((date) => (
            <div key={date}>
              <h2 className="mb-4 flex items-center gap-2 heading-section">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                {formatDateHeader(date)}
                <Badge variant="secondary" className="ml-2">
                  {photosByDate[date].length} photos
                </Badge>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {photosByDate[date].map((photo) => {
                  const globalIndex = photos.findIndex((p) => p.id === photo.id)
                  return (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      compact
                      onClick={() => openLightbox(photo, globalIndex)}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          {selectedPhoto && (
            <div className="relative">
              {/* Navigation Buttons */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white"
                onClick={handlePrevPhoto}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white"
                onClick={handleNextPhoto}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>

              {/* Photo */}
              <div className="bg-black flex items-center justify-center min-h-[400px] max-h-[70vh]">
                <img
                  src={selectedPhoto.photo_url}
                  alt={selectedPhoto.caption || 'Project photo'}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>

              {/* Photo Details */}
              <div className="p-4 bg-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {selectedPhoto.caption && (
                      <p className="font-medium mb-2">{selectedPhoto.caption}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {selectedPhoto.project_name}
                      </span>
                      {selectedPhoto.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {selectedPhoto.location}
                          {selectedPhoto.area && ` - ${selectedPhoto.area}`}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {selectedPhoto.uploaded_by_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatPhotoDateTime(selectedPhoto.taken_at || selectedPhoto.uploaded_at)}
                      </span>
                    </div>
                    {selectedPhoto.tags && selectedPhoto.tags.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-wrap gap-1">
                          {selectedPhoto.tags.map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <Badge variant={getCategoryBadgeVariant(selectedPhoto.category)}>
                    {getCategoryLabel(selectedPhoto.category)}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-3">
                  Photo {lightboxIndex + 1} of {photos.length}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Photo Card Component
interface PhotoCardProps {
  photo: SubcontractorPhoto
  compact?: boolean
  onClick: () => void
}

function PhotoCard({ photo, compact = false, onClick }: PhotoCardProps) {
  return (
    <Card
      className={cn(
        'overflow-hidden cursor-pointer group hover:ring-2 hover:ring-primary transition-all',
        compact ? 'aspect-square' : ''
      )}
      onClick={onClick}
    >
      <div className={cn('relative', compact ? 'h-full' : 'aspect-video')}>
        <img
          src={photo.thumbnail_url || photo.photo_url}
          alt={photo.caption || 'Project photo'}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <Badge
          variant={getCategoryBadgeVariant(photo.category)}
          className="absolute top-2 right-2 text-xs"
        >
          {getCategoryLabel(photo.category)}
        </Badge>
      </div>
      {!compact && (
        <CardContent className="p-3">
          {photo.caption && (
            <p className="text-sm font-medium line-clamp-1 mb-1">{photo.caption}</p>
          )}
          <p className="text-xs text-muted-foreground line-clamp-1">{photo.project_name}</p>
          <p className="text-xs text-muted-foreground">
            {formatPhotoDateTime(photo.taken_at || photo.uploaded_at)}
          </p>
        </CardContent>
      )}
    </Card>
  )
}

// Photo List Item Component
interface PhotoListItemProps {
  photo: SubcontractorPhoto
  onClick: () => void
}

function PhotoListItem({ photo, onClick }: PhotoListItemProps) {
  return (
    <Card
      className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="flex gap-4">
          <div className="relative w-32 h-24 flex-shrink-0">
            <img
              src={photo.thumbnail_url || photo.photo_url}
              alt={photo.caption || 'Project photo'}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 py-3 pr-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                {photo.caption && (
                  <p className="font-medium line-clamp-1 mb-1">{photo.caption}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {photo.project_name}
                  </span>
                  {photo.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {photo.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatPhotoDateTime(photo.taken_at || photo.uploaded_at)}
                  </span>
                </div>
              </div>
              <Badge variant={getCategoryBadgeVariant(photo.category)}>
                {getCategoryLabel(photo.category)}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
