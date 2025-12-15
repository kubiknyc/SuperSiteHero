/**
 * Photo Carousel Widget
 * Displays recent project photos in a carousel
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui'
import { Skeleton } from '@/components/ui/skeleton'
import { Camera, ChevronLeft, ChevronRight, ArrowRight, ImageOff } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { WidgetProps } from '@/types/dashboard'

interface ProjectPhoto {
  id: string
  file_url: string
  caption: string | null
  taken_at: string | null
  created_at: string
}

export function PhotoCarouselWidget({
  projectId,
  config: _config,
  className,
}: WidgetProps) {
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['project-photos', projectId, 'recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photos')
        .select('id, file_url, caption, taken_at, created_at')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {throw error}
      return data as ProjectPhoto[]
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))
  }

  if (isLoading) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Recent Photos
          </CardTitle>
          <button
            onClick={() => navigate(`/projects/${projectId}/photos`)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            View All
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {photos.length > 0 ? (
          <div className="relative">
            {/* Photo display */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={photos[currentIndex].file_url}
                alt={photos[currentIndex].caption || 'Project photo'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.parentElement?.classList.add('flex', 'items-center', 'justify-center')
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-muted hidden">
                <ImageOff className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>

            {/* Navigation */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Caption and counter */}
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate max-w-[70%]">
                {photos[currentIndex].caption || 'No caption'}
              </span>
              <span>
                {currentIndex + 1} / {photos.length}
              </span>
            </div>

            {/* Dots indicator */}
            {photos.length > 1 && photos.length <= 10 && (
              <div className="flex justify-center gap-1.5 mt-2">
                {photos.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      idx === currentIndex
                        ? 'w-4 bg-primary'
                        : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No photos yet</p>
            <Button
              variant="link"
              size="sm"
              className="mt-2"
              onClick={() => navigate(`/projects/${projectId}/photos?capture=true`)}
            >
              Take a photo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
