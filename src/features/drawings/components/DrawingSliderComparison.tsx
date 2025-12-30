/* eslint-disable react-hooks/set-state-in-render */
/**
 * Drawing Slider Comparison Component
 *
 * Lightweight before/after slider for quick inline comparison of drawing revisions.
 * Uses the BeforeAfterSlider component from photo-progress feature.
 */

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SlidersHorizontal,
  Calendar,
  FileText,
  AlertCircle,
  Maximize2,
  X,
} from 'lucide-react';
import { BeforeAfterSlider } from '@/features/photo-progress/components/BeforeAfterSlider';
import { useDrawingRevisionsForComparison } from '../hooks/useDrawingComparison';
import type { Drawing } from '@/types/drawing';

interface DrawingSliderComparisonProps {
  drawing: Drawing;
  className?: string;
  /** Initial revision IDs to compare */
  initialRevision1Id?: string;
  initialRevision2Id?: string;
  /** Callback when full comparison is requested */
  onOpenFullComparison?: (revision1Id: string, revision2Id: string) => void;
}

/**
 * Inline slider comparison for drawing revisions
 */
export function DrawingSliderComparison({
  drawing,
  className,
  initialRevision1Id,
  initialRevision2Id,
  onOpenFullComparison,
}: DrawingSliderComparisonProps) {
  const [selectedRev1, setSelectedRev1] = useState<string | undefined>(
    initialRevision1Id
  );
  const [selectedRev2, setSelectedRev2] = useState<string | undefined>(
    initialRevision2Id
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: revisions, isLoading, error } = useDrawingRevisionsForComparison(
    drawing.id
  );

  // Filter revisions to only those with image files (not PDFs)
  const imageRevisions = useMemo(() => {
    if (!revisions) {return [];}
    return revisions.filter(
      (rev) =>
        rev.fileUrl &&
        rev.fileType &&
        !rev.fileType.includes('pdf') &&
        rev.fileType.startsWith('image/')
    );
  }, [revisions]);

  // Get selected revisions
  const revision1 = imageRevisions.find((r) => r.id === selectedRev1);
  const revision2 = imageRevisions.find((r) => r.id === selectedRev2);

  // Auto-select first two revisions if not set
  useMemo(() => {
    if (imageRevisions.length >= 2 && !selectedRev1 && !selectedRev2) {
      setSelectedRev1(imageRevisions[1]?.id); // Older
      setSelectedRev2(imageRevisions[0]?.id); // Newer
    }
  }, [imageRevisions, selectedRev1, selectedRev2]);

  const canCompare =
    revision1 && revision2 && revision1.fileUrl && revision2.fileUrl;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-4 w-4" />
            Revision Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full aspect-[16/9]" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-4 w-4" />
            Revision Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-center">
            <AlertCircle className="h-6 w-6 text-destructive mr-2" />
            <span className="text-sm text-muted-foreground">
              Failed to load revisions
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (imageRevisions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-4 w-4" />
            Revision Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Slider comparison is only available for image files.
            </p>
            {revisions && revisions.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                This drawing has PDF revisions. Use the full comparison dialog
                for PDF drawings.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (imageRevisions.length === 1) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-4 w-4" />
            Revision Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Only one image revision available.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              At least two image revisions are needed for comparison.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal className="h-4 w-4" />
              Revision Comparison
            </CardTitle>
            <div className="flex items-center gap-2">
              {canCompare && onOpenFullComparison && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onOpenFullComparison(revision1!.id, revision2!.id)
                  }
                >
                  <Maximize2 className="h-4 w-4 mr-1" />
                  Full View
                </Button>
              )}
              {canCompare && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreen(true)}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Revision Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Older Revision
              </label>
              <Select
                value={selectedRev1}
                onValueChange={setSelectedRev1}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select older revision" />
                </SelectTrigger>
                <SelectContent>
                  {imageRevisions.map((rev) => (
                    <SelectItem
                      key={rev.id}
                      value={rev.id}
                      disabled={rev.id === selectedRev2}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {rev.revision}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {rev.revisionDate
                            ? format(new Date(rev.revisionDate), 'MMM d, yyyy')
                            : ''}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Newer Revision
              </label>
              <Select
                value={selectedRev2}
                onValueChange={setSelectedRev2}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select newer revision" />
                </SelectTrigger>
                <SelectContent>
                  {imageRevisions.map((rev) => (
                    <SelectItem
                      key={rev.id}
                      value={rev.id}
                      disabled={rev.id === selectedRev1}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {rev.revision}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {rev.revisionDate
                            ? format(new Date(rev.revisionDate), 'MMM d, yyyy')
                            : ''}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Slider */}
          {canCompare ? (
            <BeforeAfterSlider
              beforeImage={revision1.fileUrl!}
              afterImage={revision2.fileUrl!}
              beforeLabel={`Rev ${revision1.revision}`}
              afterLabel={`Rev ${revision2.revision}`}
            />
          ) : (
            <div className="aspect-[16/9] bg-muted rounded-lg flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Select two revisions to compare
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5" />
                {drawing.drawingNumber} - Revision Comparison
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>

          {canCompare && (
            <div className="space-y-4">
              <BeforeAfterSlider
                beforeImage={revision1.fileUrl!}
                afterImage={revision2.fileUrl!}
                beforeLabel={`Rev ${revision1.revision}`}
                afterLabel={`Rev ${revision2.revision}`}
                className="w-full"
              />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-muted p-3 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">Rev {revision1.revision}</Badge>
                    <span className="text-muted-foreground">(Older)</span>
                  </div>
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {revision1.revisionDate
                      ? format(new Date(revision1.revisionDate), 'MMM d, yyyy')
                      : 'No date'}
                  </p>
                  {revision1.revisionDescription && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {revision1.revisionDescription}
                    </p>
                  )}
                </div>
                <div className="bg-muted p-3 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">Rev {revision2.revision}</Badge>
                    <span className="text-muted-foreground">(Newer)</span>
                  </div>
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {revision2.revisionDate
                      ? format(new Date(revision2.revisionDate), 'MMM d, yyyy')
                      : 'No date'}
                  </p>
                  {revision2.revisionDescription && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {revision2.revisionDescription}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DrawingSliderComparison;
