// File: /src/pages/tasks/TaskEditPage.tsx
// Edit task page

import { useNavigate, useParams } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useTask, useUpdateTask } from '@/features/tasks/hooks/useTasks'
import { TaskForm, TaskFormData } from '@/features/tasks/components/TaskForm'
import { AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export function TaskEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: task, isLoading, error } = useTask(id)
  const updateMutation = useUpdateTask()

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
          </div>
        </div>
      </AppLayout>
    )
  }

  const handleSubmit = async (formData: TaskFormData) => {
    try {
      await updateMutation.mutateAsync({
        id: task.id,
        ...formData,
      })

      toast.success('Task updated successfully')
      navigate(`/tasks/${task.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update task')
    }
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground" className="heading-page">Edit Task</h1>
          <p className="text-secondary mt-2">Update task details and status</p>
        </div>

        <TaskForm
          projectId={task.project_id}
          initialData={task}
          onSubmit={handleSubmit}
          isLoading={updateMutation.isPending}
        />
      </div>
    </AppLayout>
  )
}
