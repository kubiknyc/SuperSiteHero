/**
 * Public Photo Comparison Page
 *
 * Public view for shared photo comparisons accessed via share token.
 * No authentication required - uses is_public flag check in API.
 */

import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BeforeAfterSlider } from '@/features/photo-progress/components';
import { photoProgressApi } from '@/lib/api/services/photo-progress';
import { getComparisonTypeLabel } from '@/types/photo-progress';
import {
  Camera,
  MapPin,
  Calendar,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Share2,
  Download,
} from 'lucide-react';

export function PublicComparisonPage() {
  const { token } = useParams<{ token: string }>();

  const { data: comparison, isLoading, error } = useQuery({
    queryKey: ['public-comparison', token],
    queryFn: () => photoProgressApi.comparisons.getComparisonByToken(token!),
    enabled: !!token,
    retry: false,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto p-6">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="w-full aspect-[16/9] rounded-lg" />
          <div className="mt-6 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  // Error or not found state
  if (error || !comparison) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Comparison Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This comparison may have been removed or the link has expired.
            </p>
            <Link to="/">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to Homepage
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const beforePhoto = comparison.before_photo;
  const afterPhoto = comparison.after_photo;
  const hasPhotos = beforePhoto?.photo_url && afterPhoto?.photo_url;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Camera className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">Photo Progress</span>
            </div>
            <Badge variant="secondary">
              <Share2 className="h-3 w-3 mr-1" />
              Shared View
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {comparison.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {comparison.location_name && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {comparison.location_name}
              </div>
            )}
            <Badge variant="outline">
              {getComparisonTypeLabel(comparison.comparison_type)}
            </Badge>
          </div>
        </div>

        {/* Comparison Slider */}
        {hasPhotos ? (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <BeforeAfterSlider
                beforeImage={beforePhoto.photo_url}
                afterImage={afterPhoto.photo_url}
                beforeLabel={beforePhoto.captured_at 
                  ? format(new Date(beforePhoto.captured_at), 'MMM d, yyyy')
                  : 'Before'}
                afterLabel={afterPhoto.captured_at 
                  ? format(new Date(afterPhoto.captured_at), 'MMM d, yyyy')
                  : 'After'}
                className="aspect-[16/9]"
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Photos not available</p>
            </CardContent>
          </Card>
        )}

        {/* Photo Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Before Photo Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Before
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {beforePhoto?.captured_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(beforePhoto.captured_at), 'MMMM d, yyyy \'at\' h:mm a')}
                </div>
              )}
              {beforePhoto?.notes && (
                <p className="text-muted-foreground">{beforePhoto.notes}</p>
              )}
              {beforePhoto?.weather_condition && (
                <Badge variant="secondary" className="capitalize">
                  {beforePhoto.weather_condition}
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* After Photo Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                After
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {afterPhoto?.captured_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(afterPhoto.captured_at), 'MMMM d, yyyy \'at\' h:mm a')}
                </div>
              )}
              {afterPhoto?.notes && (
                <p className="text-muted-foreground">{afterPhoto.notes}</p>
              )}
              {afterPhoto?.weather_condition && (
                <Badge variant="secondary" className="capitalize">
                  {afterPhoto.weather_condition}
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        {comparison.description && (
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {comparison.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Download Section */}
        {hasPhotos && (
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Downloads</CardTitle>
              <CardDescription>Download the original photos</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <a
                href={beforePhoto.photo_url}
                target="_blank"
                rel="noopener noreferrer"
                download
              >
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Before Photo
                </Button>
              </a>
              <a
                href={afterPhoto.photo_url}
                target="_blank"
                rel="noopener noreferrer"
                download
              >
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  After Photo
                </Button>
              </a>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container max-w-4xl mx-auto px-6 py-6 text-center text-sm text-muted-foreground">
          <p>Powered by JobSight Construction Management</p>
        </div>
      </footer>
    </div>
  );
}

export default PublicComparisonPage;
