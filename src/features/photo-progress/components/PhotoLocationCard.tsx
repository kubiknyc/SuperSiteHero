/**
 * Photo Location Card Component
 *
 * Displays a summary card for a photo capture location.
 */

import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import {
  MapPin,
  Camera,
  Compass,
  Calendar,
  Image,
  ChevronRight,
} from 'lucide-react';
import {
  getCaptureFrequencyLabel,
  type PhotoLocationWithLatest,
} from '@/types/photo-progress';

interface PhotoLocationCardProps {
  location: PhotoLocationWithLatest;
  projectId: string;
}

export function PhotoLocationCard({ location, projectId }: PhotoLocationCardProps) {
  const isDue = location.next_capture_date &&
    new Date(location.next_capture_date) <= new Date();

  return (
    <Link to={`/projects/${projectId}/photo-progress/location/${location.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {location.location_code && (
                  <span className="text-sm font-medium text-muted-foreground">
                    {location.location_code}
                  </span>
                )}
                <Badge variant={location.is_active ? 'default' : 'secondary'}>
                  {location.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <h3 className="font-semibold text-foreground truncate">
                {location.name}
              </h3>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Photo Preview */}
          {location.latest_thumbnail_url ? (
            <div className="relative w-full h-32 mb-3 rounded-md overflow-hidden bg-muted">
              <img
                src={location.latest_thumbnail_url}
                alt={`Latest from ${location.name}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                {location.photo_count} photos
              </div>
            </div>
          ) : (
            <div className="w-full h-32 mb-3 rounded-md bg-muted flex items-center justify-center">
              <Camera className="h-8 w-8 text-muted-foreground" />
            </div>
          )}

          {location.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {location.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            {(location.building || location.floor) && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">
                  {[location.building, location.floor].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
            {location.camera_direction && (
              <div className="flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5" />
                <span className="capitalize">{location.camera_direction}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Image className="h-3.5 w-3.5" />
              <span>{getCaptureFrequencyLabel(location.capture_frequency)}</span>
            </div>
            {location.latest_capture_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {formatDistanceToNow(new Date(location.latest_capture_date), { addSuffix: true })}
                </span>
              </div>
            )}
          </div>

          {/* Due for capture indicator */}
          {isDue && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Due for capture</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
