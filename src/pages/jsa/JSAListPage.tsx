/**
 * JSAListPage
 * Main page for listing and managing Job Safety Analyses within a project
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  Shield,
  ArrowLeft,
  AlertTriangle,
  FileText,
  Clock,
  ChevronRight,
  Info,
} from 'lucide-react';
import { JSAList } from '@/features/jsa/components';
import { useCreateJSA, useNextJSANumber, useJSAStatistics } from '@/features/jsa/hooks/useJSA';
import { useProject } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import { logger } from '../../lib/utils/logger';


export function JSAListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [taskDescription, setTaskDescription] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [scheduledDate, setScheduledDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const createMutation = useCreateJSA();
  const { data: nextNumber } = useNextJSANumber(projectId || '');
  const { data: project } = useProject(projectId || '');
  const { data: stats, isLoading: statsLoading } = useJSAStatistics(projectId || '');

  if (!projectId) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Shield className="h-16 w-16 text-muted-foreground opacity-50" />
          <div className="text-center">
            <h2 className="text-lg font-semibold">No Project Selected</h2>
            <p className="text-muted-foreground">
              Please select a project to view Job Safety Analyses
            </p>
          </div>
          <Button onClick={() => navigate('/projects')}>Go to Projects</Button>
        </div>
      </AppLayout>
    );
  }

  const handleCreate = async () => {
    if (!taskDescription || !scheduledDate) {return;}

    try {
      const jsa = await createMutation.mutateAsync({
        project_id: projectId,
        task_description: taskDescription,
        work_location: workLocation || undefined,
        scheduled_date: scheduledDate,
      });
      setShowCreateDialog(false);
      setTaskDescription('');
      setWorkLocation('');
      setScheduledDate(format(new Date(), 'yyyy-MM-dd'));
      navigate(`/projects/${projectId}/jsa/${jsa.id}`);
    } catch (error) {
      logger.error('Failed to create JSA:', error);
    }
  };

  const handleOpenCreate = () => {
    setScheduledDate(format(new Date(), 'yyyy-MM-dd'));
    setShowCreateDialog(true);
  };

  const hasHighRisk = stats && stats.high_risk_count > 0;
  const hasPendingReview = stats && stats.pending_review > 0;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/projects/${projectId}`)}
              aria-label="Go back to project"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold heading-page">Job Safety Analyses</h1>
                {statsLoading ? (
                  <Skeleton className="h-5 w-12" />
                ) : stats ? (
                  <Badge variant="secondary">{stats.total_jsas} Total</Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {project?.name || 'Loading...'} - Document hazards and safety controls
              </p>
            </div>
          </div>
        </div>

        {/* Alert Banners */}
        {(hasHighRisk || hasPendingReview) && (
          <div className="flex flex-col sm:flex-row gap-4">
            {hasHighRisk && (
              <Card className="flex-1 border-destructive/50 bg-destructive/5">
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">
                      {stats.high_risk_count} High Risk JSA{stats.high_risk_count !== 1 ? 's' : ''} Require Attention
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}
            {hasPendingReview && (
              <Card className="flex-1 border-warning/50 bg-warning/5">
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium text-warning">
                      {stats.pending_review} JSA{stats.pending_review !== 1 ? 's' : ''} Pending Review
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-warning">
                    Review Now
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Main List Component */}
        <JSAList
          projectId={projectId}
          onCreateNew={handleOpenCreate}
        />

        {/* Safety Tip */}
        <Card className="border-dashed bg-muted/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-sm mb-1">Safety Best Practices</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Complete JSAs before starting any high-risk work activity</li>
                  <li>• Ensure all workers sign off acknowledging hazards and controls</li>
                  <li>• Review and update JSAs when conditions change</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Create New JSA
              </DialogTitle>
              <DialogDescription>
                {nextNumber ? (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    This will be assigned number: <strong>{nextNumber}</strong>
                  </span>
                ) : (
                  'Complete the form below to create a new Job Safety Analysis'
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="task">
                  Task Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="task"
                  placeholder="Describe the task or work activity that requires safety analysis"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={3}
                  className={cn(!taskDescription && 'border-muted-foreground/30')}
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about the work being performed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Work Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Building A - 3rd Floor, Rooftop, Basement"
                  value={workLocation}
                  onChange={(e) => setWorkLocation(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">
                  Scheduled Date <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="pl-10"
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!taskDescription || !scheduledDate || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>Creating...</>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Create JSA
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

export default JSAListPage;
