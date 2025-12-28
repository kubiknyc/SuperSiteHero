/**
 * Progress Photo Card Component
 *
 * Displays a photo card with metadata and actions.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  Star,
  Calendar,
  MapPin,
  User,
  Cloud,
  Thermometer,
  MoreVertical,
  Eye,
  Trash2,
  Edit,
  Download,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getWeatherConditionLabel } from '@/types/photo-progress';
import type { ProgressPhotoWithDetails } from '@/types/photo-progress';

interface ProgressPhotoCardProps {
  photo: ProgressPhotoWithDetails;
  onToggleFeatured?: (id: string) => void;
  onEdit?: (photo: ProgressPhotoWithDetails) => void;
  onDelete?: (id: string) => void;
  onView?: (photo: ProgressPhotoWithDetails) => void;
}

export function ProgressPhotoCard({
  photo,
  onToggleFeatured,
  onEdit,
  onDelete,
  onView,
}: ProgressPhotoCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Card className="overflow-hidden group">
      {/* Photo */}
      <div
        className="relative w-full aspect-[4/3] bg-muted cursor-pointer"
        onClick={() => onView?.(photo)}
      >
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse bg-muted-foreground/20 w-full h-full" />
          </div>
        )}
        <img
          src={photo.thumbnail_url || photo.photo_url}
          alt={photo.caption || 'Progress photo'}
          className={`w-full h-full object-cover transition-opacity ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
        />

        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all">
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView?.(photo)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Full Size
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(photo)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={photo.photo_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete?.(photo.id)}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Featured star */}
          {photo.is_featured && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="bg-amber-500 text-white border-0">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Featured
              </Badge>
            </div>
          )}

          {/* View button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onView?.(photo);
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-3">
        {/* Caption */}
        {photo.caption && (
          <p className="text-sm font-medium text-foreground line-clamp-1 mb-2">
            {photo.caption}
          </p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(photo.capture_date), 'MMM d, yyyy')}</span>
          </div>

          {photo.location_name && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{photo.location_name}</span>
            </div>
          )}

          {photo.weather_condition && (
            <div className="flex items-center gap-1">
              <Cloud className="h-3 w-3" />
              <span>{getWeatherConditionLabel(photo.weather_condition)}</span>
            </div>
          )}

          {photo.temperature !== null && photo.temperature !== undefined && (
            <div className="flex items-center gap-1">
              <Thermometer className="h-3 w-3" />
              <span>{photo.temperature}°</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {photo.tags && photo.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {photo.tags.slice(0, 3).map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {photo.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{photo.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className={photo.is_featured ? 'text-amber-500' : ''}
            onClick={() => onToggleFeatured?.(photo.id)}
          >
            <Star className={`h-4 w-4 mr-1 ${photo.is_featured ? 'fill-current' : ''}`} />
            {photo.is_featured ? 'Featured' : 'Feature'}
          </Button>

          {photo.captured_by_name && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{photo.captured_by_name}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
