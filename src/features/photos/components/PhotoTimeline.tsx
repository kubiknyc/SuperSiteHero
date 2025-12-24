/**
 * PhotoTimeline Component
 *
 * Displays photos organized by date in a timeline view.
 */

import { useMemo } from 'react'
import { Calendar, MapPin, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Photo } from '@/types/photo-management'

interface PhotoTimelineProps {
  photos: Photo[]
  selectedIds: Set<string>
  onSelect: (photoId: string, selected: boolean) => void
  onView: (photo: Photo) => void
  groupBy?: 'day' | 'week' | 'month'
}

interface PhotoGroup {
  key: string
  label: string
  date: Date
  photos: Photo[]
}

export function PhotoTimeline({
  photos,
  selectedIds,
  onSelect,
  onView,
  groupBy = 'day',
}: PhotoTimelineProps) {
  // Group photos by date
  const groups = useMemo(() => {
    const groupMap = new Map<string, PhotoGroup>()

    photos.forEach((photo) => {
      const date = new Date(photo.capturedAt || photo.createdAt)
      let key: string
      let label: string

      switch (groupBy) {
        case 'week': {
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().split('T')[0]
          label = `Week of ${weekStart.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}`
          break
        }
        case 'month': {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          break
        }
        default: {
          key = date.toISOString().split('T')[0]
          const today = new Date()
          const yesterday = new Date(today)
          yesterday.setDate(yesterday.getDate() - 1)

          if (key === today.toISOString().split('T')[0]) {
            label = 'Today'
          } else if (key === yesterday.toISOString().split('T')[0]) {
            label = 'Yesterday'
          } else {
            label = date.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })
          }
        }
      }

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          label,
          date,
          photos: [],
        })
      }
      groupMap.get(key)!.photos.push(photo)
    })

    return Array.from(groupMap.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    )
  }, [photos, groupBy])

  const formatTime = (dateStr?: string) => {
    if (!dateStr) {return ''}
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No photos to display</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.key}>
          {/* Date header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{group.label}</span>
              <span className="text-muted-foreground text-sm">
                ({group.photos.length})
              </span>
            </div>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Photos grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {group.photos.map((photo) => {
              const isSelected = selectedIds.has(photo.id)

              return (
                <div
                  key={photo.id}
                  className={cn(
                    'group relative aspect-square rounded-lg overflow-hidden cursor-pointer',
                    'transition-all duration-200 hover:scale-[1.02]',
                    'ring-2 ring-transparent',
                    isSelected && 'ring-primary ring-offset-2'
                  )}
                  onClick={(e) => {
                    if (e.shiftKey || e.ctrlKey || e.metaKey) {
                      e.preventDefault()
                      onSelect(photo.id, !isSelected)
                    } else {
                      onView(photo)
                    }
                  }}
                >
                  <img
                    src={photo.thumbnailUrl || photo.fileUrl}
                    alt={photo.caption || photo.fileName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* Selection indicator */}
                  <div
                    className={cn(
                      'absolute top-2 left-2 transition-opacity',
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(photo.id, !isSelected)
                    }}
                  >
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card/80 hover:bg-card'
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
                      <div className="w-5 h-5 rounded-full bg-green-500/80 flex items-center justify-center">
                        <MapPin className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Time overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-xs">
                        {formatTime(photo.capturedAt)}
                      </span>
                      {photo.caption && (
                        <span className="text-white/80 text-xs truncate max-w-[60%]">
                          {photo.caption}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default PhotoTimeline
