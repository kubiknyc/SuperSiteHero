/**
 * Status Update Button Component
 * Quick status change buttons for punch items and tasks
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  ChevronDown,
  Play,
  CheckCircle,
  Clock,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUpdatePunchItemStatus, useUpdateTaskStatus } from '../hooks'
import type { PunchItemStatus, TaskStatus } from '@/types/subcontractor-portal'

// Status configurations
const punchItemStatuses: { value: PunchItemStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'in_progress', label: 'In Progress', icon: <Play className="h-4 w-4" />, color: 'blue' },
  { value: 'ready_for_review', label: 'Ready for Review', icon: <Clock className="h-4 w-4" />, color: 'amber' },
  { value: 'completed', label: 'Mark Complete', icon: <CheckCircle className="h-4 w-4" />, color: 'green' },
]

const taskStatuses: { value: TaskStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'in_progress', label: 'In Progress', icon: <Play className="h-4 w-4" />, color: 'blue' },
  { value: 'completed', label: 'Mark Complete', icon: <CheckCircle className="h-4 w-4" />, color: 'green' },
]

interface StatusBadgeProps {
  status: string
  type: 'punch-item' | 'task'
}

export function StatusBadge({ status, type: _type }: StatusBadgeProps) {
  const statusColors: Record<string, string> = {
    open: 'bg-muted text-foreground border-border',
    pending: 'bg-muted text-foreground border-border',
    in_progress: 'bg-info-light text-blue-800 border-blue-200',
    ready_for_review: 'bg-amber-100 text-amber-800 border-amber-200',
    completed: 'bg-success-light text-green-800 border-green-200',
    verified: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected: 'bg-error-light text-red-800 border-red-200',
    cancelled: 'bg-muted text-foreground border-border',
  }

  const statusLabels: Record<string, string> = {
    open: 'Open',
    pending: 'Pending',
    in_progress: 'In Progress',
    ready_for_review: 'Ready for Review',
    completed: 'Completed',
    verified: 'Verified',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  }

  return (
    <Badge variant="outline" className={cn('font-medium', statusColors[status])}>
      {statusLabels[status] || status}
    </Badge>
  )
}

interface PunchItemStatusButtonProps {
  punchItemId: string
  currentStatus: PunchItemStatus
  disabled?: boolean
}

export function PunchItemStatusButton({
  punchItemId,
  currentStatus,
  disabled = false,
}: PunchItemStatusButtonProps) {
  const updateStatus = useUpdatePunchItemStatus()
  const [isOpen, setIsOpen] = useState(false)

  // Filter out current status and statuses that can't be set by subcontractor
  const availableStatuses = punchItemStatuses.filter(
    (s) => s.value !== currentStatus && !['verified', 'rejected'].includes(s.value)
  )

  const handleStatusChange = async (newStatus: PunchItemStatus) => {
    await updateStatus.mutateAsync({
      punchItemId,
      status: newStatus,
    })
    setIsOpen(false)
  }

  if (currentStatus === 'verified' || currentStatus === 'rejected') {
    return <StatusBadge status={currentStatus} type="punch-item" />
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || updateStatus.isPending}
          className="gap-2"
        >
          {updateStatus.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <StatusBadge status={currentStatus} type="punch-item" />
          )}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableStatuses.map((status) => (
          <DropdownMenuItem
            key={status.value}
            onClick={() => handleStatusChange(status.value)}
            className="gap-2"
          >
            {status.icon}
            {status.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface TaskStatusButtonProps {
  taskId: string
  currentStatus: TaskStatus
  disabled?: boolean
}

export function TaskStatusButton({
  taskId,
  currentStatus,
  disabled = false,
}: TaskStatusButtonProps) {
  const updateStatus = useUpdateTaskStatus()
  const [isOpen, setIsOpen] = useState(false)

  // Filter out current status
  const availableStatuses = taskStatuses.filter((s) => s.value !== currentStatus)

  const handleStatusChange = async (newStatus: TaskStatus) => {
    await updateStatus.mutateAsync({
      taskId,
      status: newStatus,
    })
    setIsOpen(false)
  }

  if (currentStatus === 'completed' || currentStatus === 'cancelled') {
    return <StatusBadge status={currentStatus} type="task" />
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || updateStatus.isPending}
          className="gap-2"
        >
          {updateStatus.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <StatusBadge status={currentStatus} type="task" />
          )}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableStatuses.map((status) => (
          <DropdownMenuItem
            key={status.value}
            onClick={() => handleStatusChange(status.value)}
            className="gap-2"
          >
            {status.icon}
            {status.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Named exports: StatusBadge, PunchItemStatusButton, TaskStatusButton
