/**
 * Revision Select Dialog Component
 *
 * Allows users to select two drawing revisions for comparison.
 * Displays revision thumbnails, dates, and descriptions.
 */

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  GitCompare,
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDrawingRevisionsForComparison } from '../hooks/useDrawingComparison';
import type { Drawing, DrawingRevision, REVISION_TYPES } from '@/types/drawing';

interface RevisionSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drawing: Drawing;
  onCompare: (revision1Id: string, revision2Id: string) => void;
}

export function RevisionSelectDialog({
  open,
  onOpenChange,
  drawing,
  onCompare,
}: RevisionSelectDialogProps) {
  const [selectedRevisions, setSelectedRevisions] = useState<string[]>([]);

  const { data: revisions, isLoading, error } = useDrawingRevisionsForComparison(
    open ? drawing.id : undefined
  );

  // Sort revisions by date (newest first)
  const sortedRevisions = useMemo(() => {
    if (!revisions) {return [];}
    return [...revisions].sort((a, b) => {
      const dateA = a.revisionDate ? new Date(a.revisionDate).getTime() : 0;
      const dateB = b.revisionDate ? new Date(b.revisionDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [revisions]);

  // Handle revision selection
  const handleRevisionToggle = (revisionId: string) => {
    setSelectedRevisions((prev) => {
      if (prev.includes(revisionId)) {
        return prev.filter((id) => id !== revisionId);
      }
      // Only allow 2 selections
      if (prev.length >= 2) {
        return [prev[1], revisionId];
      }
      return [...prev, revisionId];
    });
  };

  // Handle compare button click
  const handleCompare = () => {
    if (selectedRevisions.length !== 2) {return;}

    // Order by revision date (older first)
    const rev1 = sortedRevisions.find((r) => r.id === selectedRevisions[0]);
    const rev2 = sortedRevisions.find((r) => r.id === selectedRevisions[1]);

    if (!rev1 || !rev2) {return;}

    const date1 = rev1.revisionDate ? new Date(rev1.revisionDate).getTime() : 0;
    const date2 = rev2.revisionDate ? new Date(rev2.revisionDate).getTime() : 0;

    if (date1 < date2) {
      onCompare(rev1.id, rev2.id);
    } else {
      onCompare(rev2.id, rev1.id);
    }
  };

  // Get revision labels for selected items
  const getSelectedLabels = () => {
    if (selectedRevisions.length === 0) {return null;}
    if (selectedRevisions.length === 1) {
      const rev = sortedRevisions.find((r) => r.id === selectedRevisions[0]);
      return `Rev ${rev?.revision || '?'} selected - select one more`;
    }

    const rev1 = sortedRevisions.find((r) => r.id === selectedRevisions[0]);
    const rev2 = sortedRevisions.find((r) => r.id === selectedRevisions[1]);
    return `Comparing Rev ${rev1?.revision || '?'} vs Rev ${rev2?.revision || '?'}`;
  };

  // Reset selection when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedRevisions([]);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Select Revisions to Compare
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {drawing.drawingNumber} - {drawing.title}
          </p>
        </DialogHeader>

        {/* Selection Status */}
        <div className="flex items-center justify-between px-1 py-2 border-b">
          <div className="text-sm">
            {selectedRevisions.length === 0 ? (
              <span className="text-muted-foreground">
                Select two revisions to compare
              </span>
            ) : (
              <span className="font-medium">{getSelectedLabels()}</span>
            )}
          </div>
          {selectedRevisions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRevisions([])}
            >
              Clear selection
            </Button>
          )}
        </div>

        {/* Revisions List */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-sm text-muted-foreground">
                Failed to load revisions
              </p>
            </div>
          ) : sortedRevisions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No revisions available for this drawing
              </p>
            </div>
          ) : sortedRevisions.length === 1 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Only one revision available. At least two revisions are needed
                for comparison.
              </p>
            </div>
          ) : (
            sortedRevisions.map((revision) => (
              <RevisionCard
                key={revision.id}
                revision={revision}
                isSelected={selectedRevisions.includes(revision.id)}
                selectionIndex={selectedRevisions.indexOf(revision.id)}
                onToggle={() => handleRevisionToggle(revision.id)}
              />
            ))
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCompare}
            disabled={selectedRevisions.length !== 2}
          >
            <GitCompare className="h-4 w-4 mr-2" />
            Compare Revisions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Individual Revision Card
 */
interface RevisionCardProps {
  revision: DrawingRevision;
  isSelected: boolean;
  selectionIndex: number;
  onToggle: () => void;
}

function RevisionCard({
  revision,
  isSelected,
  selectionIndex,
  onToggle,
}: RevisionCardProps) {
  const hasFile = !!revision.fileUrl;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary bg-primary/5',
        !hasFile && 'opacity-60'
      )}
      onClick={hasFile ? onToggle : undefined}
    >
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <div className="pt-1">
            <Checkbox
              checked={isSelected}
              disabled={!hasFile}
              onCheckedChange={hasFile ? onToggle : undefined}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Revision Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-mono font-bold">
                {revision.revision}
              </span>
              {revision.isCurrent && (
                <Badge variant="default" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Current
                </Badge>
              )}
              {isSelected && (
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs',
                    selectionIndex === 0
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                  )}
                >
                  {selectionIndex === 0 ? 'Older' : 'Newer'}
                </Badge>
              )}
            </div>

            {/* Date and Description */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {revision.revisionDate
                  ? format(new Date(revision.revisionDate), 'MMM d, yyyy')
                  : 'No date'}
              </span>
              {revision.revisionType && (
                <>
                  <span>•</span>
                  <Badge variant="outline" className="text-xs">
                    {revision.revisionType}
                  </Badge>
                </>
              )}
            </div>

            {/* Description */}
            {revision.revisionDescription && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {revision.revisionDescription}
              </p>
            )}

            {/* No file warning */}
            {!hasFile && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                No file available for comparison
              </p>
            )}
          </div>

          {/* Thumbnail Preview */}
          {hasFile && (
            <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
              <FileText className="w-full h-full p-3 text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default RevisionSelectDialog;
