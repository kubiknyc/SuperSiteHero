/**
 * Photo Comparison Card Component
 *
 * Displays a before/after or timelapse comparison card.
 */

import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
  GitCompare,
  Calendar,
  MapPin,
  Share2,
  ExternalLink,
  ArrowRight,
  Play,
} from 'lucide-react';
import { getComparisonTypeLabel, ComparisonType } from '@/types/photo-progress';
import type { PhotoComparisonWithDetails } from '@/types/photo-progress';

interface PhotoComparisonCardProps {
  comparison: PhotoComparisonWithDetails;
  projectId: string;
  onShare?: (comparison: PhotoComparisonWithDetails) => void;
}

export function PhotoComparisonCard({ comparison, projectId, onShare }: PhotoComparisonCardProps) {
  const isTimelapse = comparison.comparison_type === ComparisonType.TIMELAPSE ||
    comparison.comparison_type === 'timelapse';

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline">
                {getComparisonTypeLabel(comparison.comparison_type)}
              </Badge>
              {comparison.is_public && (
                <Badge variant="secondary">
                  <Share2 className="h-3 w-3 mr-1" />
                  Public
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-foreground truncate">
              {comparison.title}
            </h3>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Photo Preview */}
        {isTimelapse ? (
          // Timelapse preview - show first photo with play overlay
          <Link to={`/projects/${projectId}/photo-progress/comparison/${comparison.id}`}>
            <div className="relative w-full h-40 mb-3 rounded-md overflow-hidden bg-muted">
              {comparison.photos && comparison.photos.length > 0 ? (
                <>
                  <img
                    src={comparison.photos[0].thumbnail_url || comparison.photos[0].photo_url}
                    alt="Timelapse start"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="bg-white/90 dark:bg-black/90 rounded-full p-3">
                      <Play className="h-6 w-6 text-foreground fill-current" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    {comparison.photo_ids?.length || comparison.photos.length} photos
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <GitCompare className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
          </Link>
        ) : (
          // Before/After preview - show side by side
          <Link to={`/projects/${projectId}/photo-progress/comparison/${comparison.id}`}>
            <div className="flex gap-1 w-full h-40 mb-3 rounded-md overflow-hidden bg-muted">
              <div className="relative flex-1 overflow-hidden">
                {comparison.before_photo ? (
                  <>
                    <img
                      src={comparison.before_photo.thumbnail_url || comparison.before_photo.photo_url}
                      alt="Before"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      Before
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center px-1">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="relative flex-1 overflow-hidden">
                {comparison.after_photo ? (
                  <>
                    <img
                      src={comparison.after_photo.thumbnail_url || comparison.after_photo.photo_url}
                      alt="After"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      After
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          </Link>
        )}

        {comparison.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {comparison.description}
          </p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
          {comparison.location_name && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span>{comparison.location_name}</span>
            </div>
          )}
          {comparison.start_date && comparison.end_date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {format(new Date(comparison.start_date), 'MMM d')} -{' '}
                {format(new Date(comparison.end_date), 'MMM d, yyyy')}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Link to={`/projects/${projectId}/photo-progress/comparison/${comparison.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Comparison
            </Button>
          </Link>
          {onShare && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                onShare(comparison);
              }}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
