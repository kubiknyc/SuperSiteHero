/**
 * Mobile Tasks Pages
 *
 * Touch-optimized task management for field workers.
 */

import { memo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  User,
  Calendar,
  Flag,
} from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { cn } from '../../../lib/utils';

// List view for tasks
export const MobileTasksList = memo(function MobileTasksList() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'mine' | 'overdue'>('mine');

  // Mock data
  const tasks = [
    {
      id: '1',
      title: 'Review electrical drawings',
      status: 'in_progress',
      priority: 'high',
      assignee: 'John Doe',
      dueDate: '2024-01-18',
      project: 'Building A',
    },
    {
      id: '2',
      title: 'Submit RFI for steel specs',
      status: 'pending',
      priority: 'high',
      assignee: 'John Doe',
      dueDate: '2024-01-16',
      project: 'Building A',
    },
    {
      id: '3',
      title: 'Schedule concrete pour',
      status: 'completed',
      priority: 'medium',
      assignee: 'John Doe',
      dueDate: '2024-01-15',
      project: 'Building B',
    },
    {
      id: '4',
      title: 'Coordinate with subcontractor',
      status: 'pending',
      priority: 'low',
      assignee: 'Jane Smith',
      dueDate: '2024-01-20',
      project: 'Building A',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-info" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-error';
      case 'medium':
        return 'text-warning';
      default:
        return 'text-success';
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'completed') {return false;}
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">My Tasks</h1>
        <Badge variant="secondary">12 pending</Badge>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['mine', 'all', 'overdue'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className="flex-1"
          >
            {f === 'mine' ? 'My Tasks' : f === 'all' ? 'All' : 'Overdue'}
          </Button>
        ))}
      </div>

      {/* Search */}
      <Input placeholder="Search tasks..." />

      {/* Tasks list */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <Card
            key={task.id}
            className={cn(
              "cursor-pointer hover:border-primary/50 transition-colors",
              isOverdue(task.dueDate, task.status) && "border-error/50"
            )}
            onClick={() => navigate(`/tasks/${task.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {getStatusIcon(task.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Flag className={cn("h-3 w-3", getPriorityColor(task.priority))} />
                    <span className="text-xs text-muted-foreground">{task.project}</span>
                  </div>
                  <p className={cn(
                    "font-medium text-foreground truncate",
                    task.status === 'completed' && "line-through text-muted-foreground"
                  )}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span className={isOverdue(task.dueDate, task.status) ? 'text-error' : ''}>
                        {task.dueDate}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {task.assignee}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

// Detail view for a task
export const MobileTaskDetail = memo(function MobileTaskDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Mock data
  const task = {
    id: '1',
    title: 'Review electrical drawings',
    description: 'Review and approve electrical drawings for Building A, floors 1-3. Check for code compliance and coordination with mechanical.',
    status: 'in_progress',
    priority: 'high',
    assignee: 'John Doe',
    dueDate: '2024-01-18',
    project: 'Building A',
    createdBy: 'Project Manager',
    createdAt: '2024-01-10',
  };

  const [status, setStatus] = useState(task.status);

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline">{task.project}</Badge>
          <Badge
            variant={task.priority === 'high' ? 'destructive' : 'secondary'}
          >
            {task.priority}
          </Badge>
        </div>
        <h1 className="text-xl font-bold text-foreground">{task.title}</h1>
      </div>

      {/* Status update */}
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <Card>
        <CardContent className="p-4">
          <Label className="text-muted-foreground text-xs uppercase mb-2 block">
            Description
          </Label>
          <p className="text-foreground">{task.description}</p>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Assigned To</span>
            <span className="font-medium">{task.assignee}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Due Date</span>
            <span className="font-medium">{task.dueDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created By</span>
            <span className="font-medium">{task.createdBy}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium">{task.createdAt}</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3 pt-4">
        {status !== 'completed' && (
          <Button
            className="w-full h-12"
            onClick={() => setStatus('completed')}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Mark Complete
          </Button>
        )}
        <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>
          Back to Tasks
        </Button>
      </div>
    </div>
  );
});

export default MobileTasksList;
