/**
 * Subcontractor Tasks Page
 * Lists all tasks assigned to the subcontractor
 */

import { useState } from 'react'
import { useSubcontractorTasks } from '@/features/subcontractor-portal/hooks'
import { TaskStatusButton, StatusBadge } from '@/features/subcontractor-portal/components'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckSquare, Search, MapPin, Calendar, AlertCircle } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import type { SubcontractorItemsFilter, TaskStatus } from '@/types/subcontractor-portal'

function ItemsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  )
}

export function SubcontractorTasksPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('open')

  const filter: SubcontractorItemsFilter = {
    search: search || undefined,
    status:
      statusFilter === 'all'
        ? undefined
        : statusFilter === 'open'
        ? ['pending', 'in_progress']
        : [statusFilter],
  }

  const { data: tasks, isLoading, isError } = useSubcontractorTasks(filter)

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) {return false}
    return isPast(new Date(dueDate)) && !isToday(new Date(dueDate))
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 heading-page">
          <CheckSquare className="h-6 w-6" />
          Tasks
        </h1>
        <p className="text-muted-foreground">
          View and update tasks assigned to you.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <RadixSelect value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </RadixSelect>
      </div>

      {/* Tasks List */}
      {isLoading ? (
        <ItemsSkeleton />
      ) : isError ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Failed to load tasks
          </CardContent>
        </Card>
      ) : !tasks || tasks.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No tasks found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate heading-subsection">{task.title}</h3>
                      {task.priority === 'high' && (
                        <Badge variant="destructive" className="text-xs">
                          High Priority
                        </Badge>
                      )}
                      {task.due_date && isOverdue(task.due_date) && (
                        <Badge variant="destructive" className="text-xs flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Overdue
                        </Badge>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                      {task.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {task.location}
                        </span>
                      )}
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Due {format(new Date(task.due_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      {task.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Start {format(new Date(task.start_date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>

                  <TaskStatusButton
                    taskId={task.id}
                    currentStatus={task.status as TaskStatus}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default SubcontractorTasksPage
