/**
 * JSAListPage
 * Main page for listing and managing Job Safety Analyses within a project
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';
import { JSAList } from '@/features/jsa/components';
import { useCreateJSA, useNextJSANumber } from '@/features/jsa/hooks/useJSA';
import type { JobSafetyAnalysis } from '@/types/jsa';

export function JSAListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [taskDescription, setTaskDescription] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  const createMutation = useCreateJSA();
  const { data: nextNumber } = useNextJSANumber(projectId || '');

  if (!projectId) {
    return <div>Project ID is required</div>;
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
      setScheduledDate('');
      navigate(`/projects/${projectId}/jsa/${jsa.id}`);
    } catch (error) {
      console.error('Failed to create JSA:', error);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <JSAList
        projectId={projectId}
        onCreateNew={() => setShowCreateDialog(true)}
      />

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New JSA</DialogTitle>
            <DialogDescription>
              {nextNumber && `This will be ${nextNumber}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task">Task Description *</Label>
              <Textarea
                id="task"
                placeholder="Describe the task or work activity"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Work Location</Label>
              <Input
                id="location"
                placeholder="Where will the work take place?"
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Scheduled Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!taskDescription || !scheduledDate || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create JSA'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default JSAListPage;
