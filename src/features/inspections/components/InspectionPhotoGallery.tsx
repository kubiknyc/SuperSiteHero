// File: /src/features/inspections/components/InspectionPhotoGallery.tsx
// Gallery component displaying photos attached to an inspection

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Camera,
  MoreVertical,
  Trash2,
  Download,
  ZoomIn,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ImageOff,
} from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/lib/notifications/ToastContext'
import { InspectionPhotoUpload } from './InspectionPhotoUpload'
import type { InspectionPhoto } from '../types/photo'
import { PHOTO_TYPES } from '../types/photo'
import { cn } from '@/lib/utils'

interface InspectionPhotoGalleryProps {
  inspectionId: string
  canEdit?: boolean
  className?: string
}

async function fetchInspectionPhotos(inspectionId: string): Promise<InspectionPhoto[]> {
  const { data, error } = await supabase
    .from('inspection_photos')
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {throw error}
  return data || []
}

export function InspectionPhotoGallery({
  inspectionId,
  canEdit = false,
  className,
}: InspectionPhotoGalleryProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  const [photoToDelete, setPhotoToDelete] = useState<InspectionPhoto | null>(null)

  const queryClient = useQueryClient()
  const { success, error: showError } = useToast()

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['inspection-photos', inspectionId],
    queryFn: () => fetchInspectionPhotos(inspectionId),
    enabled: !!inspectionId,
  })

  const deletePhoto = useMutation({
    mutationFn: async (photo: InspectionPhoto) => {
      // Delete from storage if path exists
      if (photo.storage_path) {
        await supabase.storage
          .from('inspection-photos')
          .remove([photo.storage_path])
      }

      // Delete from database
      const { error } = await supabase
        .from('inspection_photos')
        .delete()
        .eq('id', photo.id)

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-photos', inspectionId] })
      success('Photo Deleted', 'The photo has been removed')
      setPhotoToDelete(null)
    },
    onError: (err: Error) => {
      showError('Delete Failed', err.message)
    },
  })

  const handleDownload = (photo: InspectionPhoto) => {
    const link = document.createElement('a')
    link.href = photo.url
    link.download = photo.file_name || 'inspection-photo.jpg'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getPhotoTypeLabel = (type: string) => {
    return PHOTO_TYPES.find(t => t.value === type)?.label || type
  }

  const getPhotoTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'deficiency': return 'destructive'
      case 'compliance': return 'success'
      case 'before': return 'secondary'
      case 'after': return 'default'
      default: return 'outline'
    }
  }

  // Lightbox navigation
  const selectedPhoto = selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null
  const canGoPrev = selectedPhotoIndex !== null && selectedPhotoIndex > 0
  const canGoNext = selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1

  const goToPrev = () => {
    if (canGoPrev) {setSelectedPhotoIndex(selectedPhotoIndex! - 1)}
  }

  const goToNext = () => {
    if (canGoNext) {setSelectedPhotoIndex(selectedPhotoIndex! + 1)}
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Photos
              {photos.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {photos.length}
                </Badge>
              )}
            </CardTitle>
            {canEdit && (
              <InspectionPhotoUpload inspectionId={inspectionId} />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <div className="text-center py-8">
              <ImageOff className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm mb-4">
                No photos have been added to this inspection yet.
              </p>
              {canEdit && (
                <InspectionPhotoUpload inspectionId={inspectionId} />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="group relative aspect-square rounded-lg overflow-hidden border cursor-pointer"
                  onClick={() => setSelectedPhotoIndex(index)}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Inspection photo'}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Photo Type Badge */}
                  <Badge
                    variant={getPhotoTypeBadgeVariant(photo.photo_type) as any}
                    className="absolute top-2 left-2 text-xs"
                  >
                    {getPhotoTypeLabel(photo.photo_type)}
                  </Badge>

                  {/* Actions */}
                  {canEdit && (
                    <div
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownload(photo)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setPhotoToDelete(photo)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}

                  {/* Caption overlay */}
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-2 text-white text-xs truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {photo.caption}
                    </div>
                  )}

                  {/* Zoom icon */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="h-8 w-8 text-white drop-shadow-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox Dialog */}
      <Dialog open={selectedPhoto !== null} onOpenChange={() => setSelectedPhotoIndex(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Badge variant={getPhotoTypeBadgeVariant(selectedPhoto?.photo_type || 'general') as any}>
                {getPhotoTypeLabel(selectedPhoto?.photo_type || 'general')}
              </Badge>
              {selectedPhoto?.caption && (
                <span className="text-sm font-normal text-muted-foreground truncate">
                  {selectedPhoto.caption}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="relative flex items-center justify-center bg-black min-h-[50vh]">
            {selectedPhoto && (
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || 'Inspection photo'}
                className="max-w-full max-h-[70vh] object-contain"
              />
            )}

            {/* Navigation Arrows */}
            {canGoPrev && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); goToPrev() }}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}

            {canGoNext && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); goToNext() }}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}

            {/* Photo Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
              {selectedPhotoIndex !== null ? selectedPhotoIndex + 1 : 0} / {photos.length}
            </div>
          </div>

          {/* Photo Details */}
          {selectedPhoto && (
            <div className="p-4 pt-0 space-y-2 text-sm">
              {selectedPhoto.location_description && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {selectedPhoto.location_description}
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(selectedPhoto.created_at), 'PPp')}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleDownload(selectedPhoto)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!photoToDelete} onOpenChange={() => setPhotoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this photo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => photoToDelete && deletePhoto.mutate(photoToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default InspectionPhotoGallery
