// File: /src/pages/tasks/TaskCreatePage.tsx
// Create new task page

import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useCreateTask } from '@/features/tasks/hooks/useTasks'
import { TaskForm, TaskFormData } from '@/features/tasks/components/TaskForm'
import toast from 'react-hot-toast'

export function TaskCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId') || ''
  const createMutation = useCreateTask()

  const handleSubmit = async (formData: TaskFormData) => {
    if (!projectId) {
      toast.error('Project ID is required')
      return
    }

    try {
      const result = await createMutation.mutateAsync({
        project_id: projectId,
        ...formData,
      } as any)

      toast.success('Task created successfully')
      navigate(`/tasks/${result.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create task')
    }
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground heading-page">Create Task</h1>
          <p className="text-secondary mt-2">Add a new task to your project</p>
        </div>

        <TaskForm
          projectId={projectId}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending}
        />
      </div>
    </AppLayout>
  )
}
