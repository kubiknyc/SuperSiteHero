// File: /src/pages/tasks/TaskDetailPage.tsx
// Task detail view

import { useNavigate, useParams, Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useTask, useUpdateTask, useDeleteTask } from '@/features/tasks/hooks/useTasks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Calendar,
  AlertCircle,
  Edit,
  Trash2,
  CheckCircle2,
  Flag,
} from 'lucide-react'
import { format, isPast } from 'date-fns'
import toast from 'react-hot-toast'

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: task, isLoading, error } = useTask(id)
  const updateMutation = useUpdateTask()
  const deleteMutation = useDeleteTask()

  if (!id) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-error">Task ID not found</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-muted">Loading task...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !task) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
            <p className="text-error">Error loading task: {error?.message}</p>
            <Link to="/tasks">
              <Button className="mt-4">Back to Tasks</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  const handleComplete = async () => {
    try {
      await updateMutation.mutateAsync({
        id: task.id,
        status: 'completed' as const,
        completed_date: new Date().toISOString(),
      })
      toast.success('Task completed')
    } catch (_err) {
      toast.error('Failed to complete task')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return
    }
    try {
      await deleteMutation.mutateAsync(task.id)
      toast.success('Task deleted')
      navigate('/tasks')
    } catch (_err) {
      toast.error('Failed to delete task')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary'
      case 'in_progress':
        return 'default'
      case 'completed':
        return 'success'
      case 'cancelled':
        return 'outline'
      default:
        return 'default'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'text-primary'
      case 'normal':
        return 'text-secondary'
      case 'high':
        return 'text-error'
      default:
        return 'text-secondary'
    }
  }

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed'

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/tasks">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground heading-page">{task.title}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={getStatusColor(task.status ?? 'pending')}>
                  {(task.status ?? 'pending').replace(/_/g, ' ')}
                </Badge>
                {isOverdue && (
                  <Badge variant="destructive">Overdue</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {task.status !== 'completed' && task.status !== 'cancelled' && (
              <>
                {task.status !== 'in_progress' && (
                  <Button
                    onClick={handleComplete}
                    disabled={updateMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete
                  </Button>
                )}
                <Link to={`/tasks/${task.id}/edit`}>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              </>
            )}
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Task Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {task.description && (
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-secondary mb-2">Description</p>
                <p className="text-secondary whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-secondary mb-2">Priority</p>
              <div className={`flex items-center gap-2 text-lg font-semibold ${getPriorityColor(task.priority ?? 'normal')}`}>
                <Flag className="h-5 w-5" />
                {(task.priority ?? 'normal').toUpperCase()}
              </div>
            </div>

            {task.location && (
              <div>
                <p className="text-sm font-medium text-secondary mb-2">Location</p>
                <p className="text-lg font-semibold">{task.location}</p>
              </div>
            )}

            {task.start_date && (
              <div>
                <p className="text-sm font-medium text-secondary mb-2">Start Date</p>
                <p className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {task.start_date ? format(new Date(task.start_date), 'MMMM d, yyyy') : 'N/A'}
                </p>
              </div>
            )}

            {task.due_date && (
              <div>
                <p className="text-sm font-medium text-secondary mb-2">Due Date</p>
                <p className={`text-lg font-semibold flex items-center gap-2 ${isOverdue ? 'text-error' : ''}`}>
                  <Calendar className="h-5 w-5" />
                  {task.due_date ? format(new Date(task.due_date), 'MMMM d, yyyy') : 'N/A'}
                </p>
              </div>
            )}

            {task.completed_date && (
              <div>
                <p className="text-sm font-medium text-secondary mb-2">Completed Date</p>
                <p className="text-lg font-semibold text-success">
                  {task.completed_date ? format(new Date(task.completed_date), 'MMMM d, yyyy') : 'N/A'}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-secondary mb-2">Created</p>
              <p className="text-lg font-semibold">
                {task.created_at ? format(new Date(task.created_at), 'MMMM d, yyyy') : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
