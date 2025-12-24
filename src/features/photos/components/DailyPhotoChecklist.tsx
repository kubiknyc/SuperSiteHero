/**
 * DailyPhotoChecklist Component
 * Shows required photos for the day with completion status
 */

import { useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import {
  Camera,
  CheckCircle2,
  Circle,
  Clock,
  ChevronLeft,
  ChevronRight,
  MapPin,
  AlertCircle,
  SkipForward,
  Image,
  Building2,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useDailyPhotoChecklist, useSkipPhotoRequirement } from '../hooks/usePhotoTemplates';
import type { PhotoRequirementWithTemplate, RequirementStatus } from '@/types/photo-templates';
import { cn } from '@/lib/utils';

interface DailyPhotoChecklistProps {
  projectId: string;
  onTakePhoto?: (requirement: PhotoRequirementWithTemplate) => void;
  onViewPhoto?: (photoId: string) => void;
  className?: string;
}

const statusConfig: Record<
  RequirementStatus,
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  completed: { icon: CheckCircle2, color: 'text-success', label: 'Completed' },
  pending: { icon: Circle, color: 'text-disabled', label: 'Pending' },
  partial: { icon: Clock, color: 'text-warning', label: 'Partial' },
  missed: { icon: AlertCircle, color: 'text-error', label: 'Missed' },
  skipped: { icon: SkipForward, color: 'text-muted', label: 'Skipped' },
};

export function DailyPhotoChecklist({
  projectId,
  onTakePhoto,
  onViewPhoto,
  className,
}: DailyPhotoChecklistProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [selectedRequirement, setSelectedRequirement] =
    useState<PhotoRequirementWithTemplate | null>(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { data: checklist, isLoading } = useDailyPhotoChecklist(projectId, dateStr);
  const skipMutation = useSkipPhotoRequirement();

  const handlePrevDay = () => setSelectedDate((d) => subDays(d, 1));
  const handleNextDay = () => setSelectedDate((d) => addDays(d, 1));
  const handleToday = () => setSelectedDate(new Date());

  const handleSkip = (requirement: PhotoRequirementWithTemplate) => {
    setSelectedRequirement(requirement);
    setSkipReason('');
    setSkipDialogOpen(true);
  };

  const confirmSkip = async () => {
    if (!selectedRequirement) {return;}
    await skipMutation.mutateAsync({
      requirementId: selectedRequirement.id,
      reason: skipReason,
    });
    setSkipDialogOpen(false);
    setSelectedRequirement(null);
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const isFuture = selectedDate > new Date();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const completionPercent = checklist?.stats
    ? Math.round((checklist.stats.completed / Math.max(checklist.stats.total, 1)) * 100)
    : 0;

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Daily Photo Checklist
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handlePrevDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant={isToday ? 'secondary' : 'ghost'}
                size="sm"
                onClick={handleToday}
                className="min-w-[120px]"
              >
                {isToday ? 'Today' : format(selectedDate, 'MMM d, yyyy')}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleNextDay}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {checklist && checklist.stats.total > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {checklist.stats.completed} of {checklist.stats.total} completed
                </span>
                <span className="font-medium">{completionPercent}%</span>
              </div>
              <Progress value={completionPercent} className="h-2" />
              {checklist.stats.overdue > 0 && (
                <p className="text-sm text-error">
                  {checklist.stats.overdue} overdue photo{checklist.stats.overdue > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {!checklist || checklist.requirements.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Image className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2">No photos required for this day</p>
              <p className="text-sm">Configure photo templates to set up daily requirements</p>
            </div>
          ) : (
            <div className="space-y-3">
              {checklist.requirements.map((req) => (
                <RequirementCard
                  key={req.id}
                  requirement={req}
                  isFuture={isFuture}
                  onTakePhoto={onTakePhoto}
                  onViewPhoto={onViewPhoto}
                  onSkip={handleSkip}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skip Dialog */}
      <Dialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skip Photo Requirement</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-sm text-muted-foreground">
              Skipping: <strong>{selectedRequirement?.template?.name}</strong>
            </p>
            <Textarea
              placeholder="Reason for skipping (optional)"
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkipDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSkip} disabled={skipMutation.isPending}>
              {skipMutation.isPending ? 'Skipping...' : 'Skip'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface RequirementCardProps {
  requirement: PhotoRequirementWithTemplate;
  isFuture: boolean;
  onTakePhoto?: (requirement: PhotoRequirementWithTemplate) => void;
  onViewPhoto?: (photoId: string) => void;
  onSkip?: (requirement: PhotoRequirementWithTemplate) => void;
}

function RequirementCard({
  requirement,
  isFuture,
  onTakePhoto,
  onViewPhoto,
  onSkip,
}: RequirementCardProps) {
  const template = requirement.template;
  const status = statusConfig[requirement.status];
  const StatusIcon = status.icon;

  const locationParts = [template?.building, template?.floor, template?.area]
    .filter(Boolean)
    .join(' › ');

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 transition-colors',
        requirement.status === 'completed' && 'bg-success-light border-green-200',
        requirement.status === 'missed' && 'bg-error-light border-red-200',
        requirement.status === 'pending' && 'hover:bg-surface'
      )}
    >
      <StatusIcon className={cn('mt-0.5 h-5 w-5 shrink-0', status.color)} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-medium" className="heading-card">{template?.name || 'Unknown Location'}</h4>
            {locationParts && (
              <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="h-3 w-3" />
                {locationParts}
              </p>
            )}
          </div>
          <Badge variant="outline" className={cn('shrink-0', status.color)}>
            {status.label}
          </Badge>
        </div>

        {template?.photoInstructions && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {template.photoInstructions}
          </p>
        )}

        {template?.latitude && template?.longitude && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            GPS: {template.latitude.toFixed(6)}, {template.longitude.toFixed(6)}
          </p>
        )}

        {requirement.photosCount > 0 && (
          <p className="mt-1 flex items-center gap-1 text-sm">
            <Layers className="h-3 w-3" />
            {requirement.photosCount} photo{requirement.photosCount > 1 ? 's' : ''} taken
          </p>
        )}

        {/* Action buttons */}
        <div className="mt-2 flex items-center gap-2">
          {requirement.status === 'pending' && !isFuture && onTakePhoto && (
            <Button size="sm" onClick={() => onTakePhoto(requirement)}>
              <Camera className="mr-1 h-3 w-3" />
              Take Photo
            </Button>
          )}

          {requirement.completedPhotoIds.length > 0 && onViewPhoto && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewPhoto(requirement.completedPhotoIds[0])}
            >
              <Image className="mr-1 h-3 w-3" />
              View
            </Button>
          )}

          {requirement.status === 'pending' && !isFuture && onSkip && (
            <Button size="sm" variant="ghost" onClick={() => onSkip(requirement)}>
              <SkipForward className="mr-1 h-3 w-3" />
              Skip
            </Button>
          )}
        </div>

        {requirement.skipReason && (
          <p className="mt-2 text-sm text-muted-foreground italic">
            Skipped: {requirement.skipReason}
          </p>
        )}
      </div>
    </div>
  );
}

export default DailyPhotoChecklist;
