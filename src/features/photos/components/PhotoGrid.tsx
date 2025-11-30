/**
 * PhotoGrid Component
 *
 * Displays photos in a responsive grid layout with selection support.
 */

import { useState, useCallback } from 'react'
import { MapPin, Check, MoreHorizontal, Eye, Download, Trash2, Tag, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Photo } from '@/types/photo-management'

interface PhotoGridProps {
  photos: Photo[]
  selectedIds: Set<string>
  onSelect: (photoId: string, selected: boolean) => void
  onView: (photo: Photo) => void
  columns?: number
  showCaptions?: boolean
}

export function PhotoGrid({
  photos,
  selectedIds,
  onSelect,
  onView,
  columns = 6,
  showCaptions = true,
}: PhotoGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const handleClick = useCallback(
    (photo: Photo, e: React.MouseEvent) => {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        e.preventDefault()
        onSelect(photo.id, !selectedIds.has(photo.id))
      } else {
        onView(photo)
      }
    },
    [onSelect, selectedIds, onView]
  )

  const formatDate = (dateStr?: string) => {
    if (!dateStr) {return ''}
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No photos found</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 4 && 'grid-cols-2 md:grid-cols-4',
        columns === 5 && 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
        columns === 6 && 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6'
      )}
    >
      {photos.map((photo) => {
        const isSelected = selectedIds.has(photo.id)
        const isHovered = hoveredId === photo.id

        return (
          <div
            key={photo.id}
            className={cn(
              'group relative aspect-square rounded-lg overflow-hidden cursor-pointer',
              'transition-all duration-200',
              'ring-2 ring-transparent',
              isSelected && 'ring-primary ring-offset-2',
              isHovered && !isSelected && 'ring-primary/50'
            )}
            onMouseEnter={() => setHoveredId(photo.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={(e) => handleClick(photo, e)}
          >
            {/* Image */}
            <img
              src={photo.thumbnailUrl || photo.fileUrl}
              alt={photo.caption || photo.fileName}
              className="w-full h-full object-cover"
              loading="lazy"
            />

            {/* Overlay */}
            <div
              className={cn(
                'absolute inset-0 bg-black/0 transition-all duration-200',
                (isHovered || isSelected) && 'bg-black/30'
              )}
            />

            {/* Selection checkbox */}
            <div
              className={cn(
                'absolute top-2 left-2 transition-opacity duration-200',
                isHovered || isSelected ? 'opacity-100' : 'opacity-0'
              )}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(photo.id, !isSelected)
              }}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/80 hover:bg-white'
                )}
              >
                {isSelected ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-400" />
                )}
              </div>
            </div>

            {/* GPS indicator */}
            {photo.latitude && photo.longitude && (
              <div className="absolute top-2 right-2">
                <div className="w-6 h-6 rounded-full bg-green-500/80 flex items-center justify-center">
                  <MapPin className="h-3 w-3 text-white" />
                </div>
              </div>
            )}

            {/* Actions menu */}
            <div
              className={cn(
                'absolute bottom-2 right-2 transition-opacity duration-200',
                isHovered ? 'opacity-100' : 'opacity-0'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 bg-white/80 hover:bg-white"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView(photo)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Tag className="h-4 w-4 mr-2" />
                    Edit Tags
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Caption */}
            {showCaptions && (photo.caption || photo.capturedAt) && (
              <div
                className={cn(
                  'absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent',
                  'transition-opacity duration-200',
                  isHovered || isSelected ? 'opacity-100' : 'opacity-0'
                )}
              >
                {photo.caption && (
                  <p className="text-white text-xs font-medium truncate">{photo.caption}</p>
                )}
                {photo.capturedAt && (
                  <p className="text-white/70 text-xs">{formatDate(photo.capturedAt)}</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default PhotoGrid
