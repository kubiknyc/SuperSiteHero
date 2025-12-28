/**
 * PhotoOrganizer Page
 *
 * Central hub for viewing, organizing, and managing project photos.
 * Features:
 * - Multiple view modes (grid, timeline, location)
 * - Photo filtering and search
 * - Statistics dashboard
 * - Collections management
 * - Bulk actions
 */

import { useState, useMemo, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  Camera,
  Grid3X3,
  Calendar,
  MapPin,
  Search,
  Upload,
  FolderPlus,
  Trash2,
  Download,
  Tag,
  X,
  Image,
  Clock,
  HardDrive,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { CameraTrigger } from '../components/CameraCapture'
import { PhotoGrid } from '../components/PhotoGrid'
import { PhotoTimeline } from '../components/PhotoTimeline'
import { PhotoDetailDialog } from '../components/PhotoDetailDialog'
import {
  usePhotos,
  usePhotoStats,
  usePhotoFilterOptions,
  useDeletePhoto,
  useBulkDeletePhotos,
  useCreatePhoto,
  useCreateCollection,
} from '../hooks/usePhotos'
import { usePhotoUpload } from '../hooks/usePhotoUpload'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type {
  Photo,
  PhotoFilters,
  PhotoViewMode,
  CapturedPhoto,
} from '@/types/photo-management'
import { logger } from '../../../lib/utils/logger';
import JSZip from 'jszip';


// =============================================
// Stats Cards Component
// =============================================

interface StatsCardsProps {
  stats: {
    totalPhotos: number
    photosToday: number
    photosThisWeek: number
    photosWithGps: number
    storageUsedBytes: number
  } | null
  isLoading: boolean
}

function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-4">
              <div className="h-4 w-12 bg-muted rounded mb-2" />
              <div className="h-8 w-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) {return '0 B'}
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Image className="h-4 w-4" />
            Total Photos
          </div>
          <div className="text-2xl font-bold">{stats?.totalPhotos || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Clock className="h-4 w-4" />
            Today
          </div>
          <div className="text-2xl font-bold">{stats?.photosToday || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Calendar className="h-4 w-4" />
            This Week
          </div>
          <div className="text-2xl font-bold">{stats?.photosThisWeek || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <MapPin className="h-4 w-4" />
            With GPS
          </div>
          <div className="text-2xl font-bold">{stats?.photosWithGps || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <HardDrive className="h-4 w-4" />
            Storage Used
          </div>
          <div className="text-2xl font-bold">{formatBytes(stats?.storageUsedBytes || 0)}</div>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================
// Filter Bar Component
// =============================================

interface FilterBarProps {
  filters: PhotoFilters
  onFiltersChange: (filters: PhotoFilters) => void
  filterOptions: {
    categories: string[]
    tags: string[]
    buildings: string[]
    floors: string[]
  } | null
}

function FilterBar({ filters, onFiltersChange, filterOptions }: FilterBarProps) {
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.category) {count++}
    if (filters.building) {count++}
    if (filters.floor) {count++}
    if (filters.hasGps !== undefined) {count++}
    if (filters.reviewStatus) {count++}
    return count
  }, [filters])

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Category filter */}
      <RadixSelect
        value={filters.category || 'all'}
        onValueChange={(value: string) =>
          onFiltersChange({ ...filters, category: value === 'all' ? undefined : value })
        }
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {filterOptions?.categories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </RadixSelect>

      {/* Building filter */}
      <RadixSelect
        value={filters.building || 'all'}
        onValueChange={(value: string) =>
          onFiltersChange({ ...filters, building: value === 'all' ? undefined : value })
        }
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Building" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Buildings</SelectItem>
          {filterOptions?.buildings.map((b) => (
            <SelectItem key={b} value={b}>
              {b}
            </SelectItem>
          ))}
        </SelectContent>
      </RadixSelect>

      {/* Floor filter */}
      <RadixSelect
        value={filters.floor || 'all'}
        onValueChange={(value: string) =>
          onFiltersChange({ ...filters, floor: value === 'all' ? undefined : value })
        }
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Floor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Floors</SelectItem>
          {filterOptions?.floors.map((f) => (
            <SelectItem key={f} value={f}>
              {f}
            </SelectItem>
          ))}
        </SelectContent>
      </RadixSelect>

      {/* GPS filter */}
      <RadixSelect
        value={filters.hasGps === undefined ? 'all' : filters.hasGps ? 'yes' : 'no'}
        onValueChange={(value: string) =>
          onFiltersChange({
            ...filters,
            hasGps: value === 'all' ? undefined : value === 'yes',
          })
        }
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="GPS" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Photos</SelectItem>
          <SelectItem value="yes">With GPS</SelectItem>
          <SelectItem value="no">No GPS</SelectItem>
        </SelectContent>
      </RadixSelect>

      {/* Clear filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onFiltersChange({
              ...filters,
              category: undefined,
              building: undefined,
              floor: undefined,
              hasGps: undefined,
              reviewStatus: undefined,
            })
          }
        >
          <X className="h-4 w-4 mr-1" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  )
}

// =============================================
// Main Component
// =============================================

export function PhotoOrganizerPage() {
  const { projectId } = useParams<{ projectId: string }>()

  // View state
  const [viewMode, setViewMode] = useState<PhotoViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<PhotoFilters>({
    projectId,
    sortBy: 'capturedAt',
    sortOrder: 'desc',
  })

  // Selection state
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set())
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)

  // New collection dialog state
  const [showNewCollectionDialog, setShowNewCollectionDialog] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [newCollectionDescription, setNewCollectionDescription] = useState('')

  // File input ref for uploads
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Queries
  const {
    data: photos,
    isLoading: photosLoading,
    error: photosError,
  } = usePhotos({
    ...filters,
    projectId,
    search: searchQuery || undefined,
  })

  const { data: stats, isLoading: statsLoading } = usePhotoStats(projectId)
  const { data: filterOptions } = usePhotoFilterOptions(projectId)

  // Mutations
  const createPhoto = useCreatePhoto()
  const deletePhoto = useDeletePhoto()
  const bulkDeletePhotos = useBulkDeletePhotos()
  const createCollection = useCreateCollection()

  // Photo upload hook
  const { uploadPhotos, uploadProgress: _uploadProgress, isUploading } = usePhotoUpload({
    projectId: projectId ?? '',
  })

  // Handle photo capture from camera
  const handlePhotoCapture = useCallback(
    async (capturedPhotos: CapturedPhoto[]) => {
      if (!projectId) {return}

      const STORAGE_BUCKET = 'project-files'
      let successCount = 0
      let failCount = 0

      for (const captured of capturedPhotos) {
        try {
          // Generate unique file path
          const timestamp = Date.now()
          const sanitizedFilename = captured.metadata.fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
          const filePath = `${projectId}/${timestamp}_${sanitizedFilename}`

          // 1. Upload the file to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, captured.file, {
              cacheControl: '3600',
              upsert: false,
            })

          if (uploadError) {
            throw uploadError
          }

          // 2. Get the public URL
          const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(uploadData.path)

          // 3. Create the photo record
          await createPhoto.mutateAsync({
            projectId,
            fileUrl: urlData.publicUrl,
            fileName: captured.metadata.fileName,
            fileSize: captured.metadata.fileSize,
            width: captured.metadata.width,
            height: captured.metadata.height,
            capturedAt: captured.metadata.capturedAt,
            latitude: captured.metadata.gps?.latitude,
            longitude: captured.metadata.gps?.longitude,
            altitude: captured.metadata.gps?.altitude,
            gpsAccuracy: captured.metadata.gps?.accuracy,
            source: captured.metadata.source,
            deviceType: captured.metadata.deviceType,
            deviceOs: captured.metadata.deviceOs,
            cameraMake: captured.metadata.camera?.make,
            cameraModel: captured.metadata.camera?.model,
            focalLength: captured.metadata.camera?.focalLength,
            aperture: captured.metadata.camera?.aperture,
            iso: captured.metadata.camera?.iso,
            exposureTime: captured.metadata.camera?.exposureTime,
            flashUsed: captured.metadata.camera?.flashUsed,
            orientation: captured.metadata.camera?.orientation,
            weatherCondition: captured.metadata.weather?.condition,
            temperature: captured.metadata.weather?.temperature,
            humidity: captured.metadata.weather?.humidity,
          })

          successCount++
        } catch (error) {
          logger.error('Failed to upload photo:', error)
          failCount++
        }
      }

      // Show summary toast
      if (successCount > 0 && failCount === 0) {
        toast.success(`${successCount} photo${successCount > 1 ? 's' : ''} uploaded successfully`)
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`${successCount} uploaded, ${failCount} failed`)
      } else if (failCount > 0) {
        toast.error(`Failed to upload ${failCount} photo${failCount > 1 ? 's' : ''}`)
      }
    },
    [projectId, createPhoto]
  )

  // Handle file upload from file picker
  const handleFileUpload = useCallback(async () => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files || files.length === 0 || !projectId) {return}

      try {
        const results = await uploadPhotos(Array.from(files))
        const successCount = results.filter(r => r !== null).length
        const failCount = results.length - successCount

        if (successCount > 0 && failCount === 0) {
          toast.success(`${successCount} photo${successCount > 1 ? 's' : ''} uploaded successfully`)
        } else if (successCount > 0 && failCount > 0) {
          toast.warning(`${successCount} uploaded, ${failCount} failed`)
        } else if (failCount > 0) {
          toast.error(`Failed to upload ${failCount} photo${failCount > 1 ? 's' : ''}`)
        }
      } catch (error) {
        logger.error('Upload failed:', error)
        toast.error('Failed to upload photos')
      }

      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [projectId, uploadPhotos]
  )

  // Handle selection
  const handleSelectPhoto = useCallback((photoId: string, selected: boolean) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(photoId)
      } else {
        next.delete(photoId)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (photos && selectedPhotoIds.size < photos.length) {
      setSelectedPhotoIds(new Set(photos.map((p) => p.id)))
    } else {
      setSelectedPhotoIds(new Set())
    }
  }, [photos, selectedPhotoIds.size])

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    if (selectedPhotoIds.size === 0) {return}

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedPhotoIds.size} photo(s)?`
    )
    if (!confirmed) {return}

    await bulkDeletePhotos.mutateAsync(Array.from(selectedPhotoIds))
    setSelectedPhotoIds(new Set())
  }, [selectedPhotoIds, bulkDeletePhotos])

  // Handle view photo
  const handleViewPhoto = useCallback((photo: Photo) => {
    setSelectedPhoto(photo)
  }, [])

  // Handle create collection
  const handleCreateCollection = useCallback(async () => {
    if (!projectId || !newCollectionName.trim()) {return}

    try {
      await createCollection.mutateAsync({
        projectId,
        name: newCollectionName.trim(),
        description: newCollectionDescription.trim() || undefined,
      })
      toast.success('Collection created successfully')
      setShowNewCollectionDialog(false)
      setNewCollectionName('')
      setNewCollectionDescription('')
    } catch (error) {
      logger.error('Failed to create collection:', error)
      toast.error('Failed to create collection')
    }
  }, [projectId, newCollectionName, newCollectionDescription, createCollection])

  // Handle bulk download - creates a ZIP file for multiple photos
  const handleBulkDownload = useCallback(async () => {
    if (selectedPhotoIds.size === 0 || !photos) {return}

    const selectedPhotos = photos.filter(p => selectedPhotoIds.has(p.id))

    // For single photo, download directly
    if (selectedPhotos.length === 1) {
      const photo = selectedPhotos[0]
      try {
        const response = await fetch(photo.fileUrl)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = photo.fileName || `photo-${photo.id}.jpg`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Photo downloaded')
      } catch (error) {
        logger.error('Failed to download photo:', error)
        toast.error('Failed to download photo')
      }
      return
    }

    // For multiple photos, create a ZIP file
    toast.info(`Preparing ${selectedPhotos.length} photos for download...`)

    try {
      const zip = new JSZip()
      const folder = zip.folder('photos')

      // Track filenames to avoid duplicates
      const usedNames = new Set<string>()

      // Fetch all photos in parallel
      const fetchPromises = selectedPhotos.map(async (photo) => {
        try {
          const response = await fetch(photo.fileUrl)
          if (!response.ok) {throw new Error(`HTTP ${response.status}`)}
          const blob = await response.blob()

          // Generate unique filename
          const fileName = photo.fileName || `photo-${photo.id}.jpg`
          const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '.jpg'
          const baseName = fileName.includes('.') ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName

          // Handle duplicate names
          let finalName = fileName
          let counter = 1
          while (usedNames.has(finalName)) {
            finalName = `${baseName}_${counter}${ext}`
            counter++
          }
          usedNames.add(finalName)

          folder?.file(finalName, blob)
          return { success: true, name: finalName }
        } catch (error) {
          logger.error(`Failed to fetch photo ${photo.id}:`, error)
          return { success: false, name: photo.fileName || photo.id }
        }
      })

      const results = await Promise.all(fetchPromises)
      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length

      if (successCount === 0) {
        toast.error('Failed to download any photos')
        return
      }

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      })

      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `photos-${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      if (failCount > 0) {
        toast.success(`Downloaded ${successCount} photos (${failCount} failed)`)
      } else {
        toast.success(`Downloaded ${successCount} photos as ZIP`)
      }
    } catch (error) {
      logger.error('Failed to create ZIP:', error)
      toast.error('Failed to create download package')
    }
  }, [selectedPhotoIds, photos])

  // Handle bulk add tags (placeholder - shows toast for now)
  const handleBulkAddTags = useCallback(() => {
    toast.info('Tag management coming soon')
  }, [])

  // Handle bulk add to collection (placeholder - shows toast for now)
  const handleBulkAddToCollection = useCallback(() => {
    toast.info('Add to collection coming soon')
  }, [])

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No project selected</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold heading-page">Photos</h1>
          <p className="text-muted-foreground">
            Capture, organize, and manage project photos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CameraTrigger
            projectId={projectId}
            onCapture={handlePhotoCapture}
            options={{ enableGps: true, maxPhotos: 20 }}
          >
            <Camera className="h-4 w-4 mr-2" />
            Capture
          </CameraTrigger>
          <Button variant="outline" onClick={handleFileUpload} disabled={isUploading}>
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
          <Button variant="outline" onClick={() => setShowNewCollectionDialog(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            New Collection
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats || null} isLoading={statsLoading} />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search photos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* View Mode */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as PhotoViewMode)}>
          <TabsList>
            <TabsTrigger value="grid">
              <Grid3X3 className="h-4 w-4 mr-1" />
              Grid
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Calendar className="h-4 w-4 mr-1" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="location">
              <MapPin className="h-4 w-4 mr-1" />
              Location
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Sort */}
        <RadixSelect
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onValueChange={(value: string) => {
            const [sortBy, sortOrder] = value.split('-') as [
              PhotoFilters['sortBy'],
              PhotoFilters['sortOrder']
            ]
            setFilters({ ...filters, sortBy, sortOrder })
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="capturedAt-desc">Newest First</SelectItem>
            <SelectItem value="capturedAt-asc">Oldest First</SelectItem>
            <SelectItem value="fileName-asc">Name (A-Z)</SelectItem>
            <SelectItem value="fileName-desc">Name (Z-A)</SelectItem>
            <SelectItem value="fileSize-desc">Largest First</SelectItem>
            <SelectItem value="fileSize-asc">Smallest First</SelectItem>
          </SelectContent>
        </RadixSelect>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        filterOptions={filterOptions || null}
      />

      {/* Bulk Actions Bar */}
      {selectedPhotoIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <Checkbox
            checked={photos && selectedPhotoIds.size === photos.length}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm font-medium">
            {selectedPhotoIds.size} selected
          </span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={handleBulkAddTags}>
            <Tag className="h-4 w-4 mr-1" />
            Add Tags
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkAddToCollection}>
            <FolderPlus className="h-4 w-4 mr-1" />
            Add to Collection
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedPhotoIds(new Set())}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Content */}
      {photosLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : photosError ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Failed to load photos</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : photos?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2 heading-subsection">No Photos Yet</h3>
            <p className="text-muted-foreground mb-4">
              Start by capturing or uploading photos for this project
            </p>
            <div className="flex items-center justify-center gap-2">
              <CameraTrigger
                projectId={projectId}
                onCapture={handlePhotoCapture}
                options={{ enableGps: true }}
              >
                <Camera className="h-4 w-4 mr-2" />
                Capture Photo
              </CameraTrigger>
              <Button variant="outline" onClick={handleFileUpload} disabled={isUploading}>
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload Photos'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'grid' && (
            <PhotoGrid
              photos={photos || []}
              selectedIds={selectedPhotoIds}
              onSelect={handleSelectPhoto}
              onView={handleViewPhoto}
            />
          )}
          {viewMode === 'timeline' && (
            <PhotoTimeline
              photos={photos || []}
              selectedIds={selectedPhotoIds}
              onSelect={handleSelectPhoto}
              onView={handleViewPhoto}
            />
          )}
          {viewMode === 'location' && (
            <div className="text-center py-8 text-muted-foreground">
              Location view coming soon...
            </div>
          )}
        </>
      )}

      {/* Photo Detail Dialog */}
      {selectedPhoto && (
        <PhotoDetailDialog
          photo={selectedPhoto}
          isOpen={!!selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onDelete={() => {
            deletePhoto.mutate(selectedPhoto.id)
            setSelectedPhoto(null)
          }}
        />
      )}

      {/* New Collection Dialog */}
      <Dialog open={showNewCollectionDialog} onOpenChange={setShowNewCollectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="collection-name">Name</Label>
              <Input
                id="collection-name"
                placeholder="Enter collection name..."
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collection-description">Description (optional)</Label>
              <Input
                id="collection-description"
                placeholder="Enter description..."
                value={newCollectionDescription}
                onChange={(e) => setNewCollectionDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCollectionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCollection}
              disabled={!newCollectionName.trim() || createCollection.isPending}
            >
              {createCollection.isPending ? 'Creating...' : 'Create Collection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PhotoOrganizerPage
