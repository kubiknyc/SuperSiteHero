/**
 * ConstraintBadge Component
 * Visual indicator for activity constraints
 */

import { cn } from '@/lib/utils'
import {
  FileQuestion,
  FileCheck,
  Truck,
  GitBranch,
  ClipboardCheck,
  FileBadge,
  Cloud,
  Users,
  UserCheck,
  PenTool,
  AlertCircle,
} from 'lucide-react'
import type { ConstraintType, ConstraintStatus } from '@/types/look-ahead'
import { CONSTRAINT_TYPE_CONFIG } from '@/types/look-ahead'

interface ConstraintBadgeProps {
  type: ConstraintType
  status: ConstraintStatus
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md'
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'file-question': FileQuestion,
  'file-check': FileCheck,
  truck: Truck,
  'git-branch': GitBranch,
  'clipboard-check': ClipboardCheck,
  'file-badge': FileBadge,
  'cloud-sun': Cloud,
  users: Users,
  'user-check': UserCheck,
  'pen-tool': PenTool,
  'alert-circle': AlertCircle,
}

const statusColors: Record<ConstraintStatus, { bg: string; text: string; border: string }> = {
  open: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  resolved: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  waived: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
  escalated: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
}

export function ConstraintBadge({
  type,
  status,
  className,
  showLabel = false,
  size = 'sm',
}: ConstraintBadgeProps) {
  const config = CONSTRAINT_TYPE_CONFIG[type]
  const colors = statusColors[status]
  const Icon = iconMap[config.icon] || AlertCircle

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        colors.bg,
        colors.text,
        colors.border,
        sizeClasses[size],
        className
      )}
      title={`${config.label} - ${status}`}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}

interface ConstraintCountBadgeProps {
  openCount: number
  totalCount: number
  className?: string
}

export function ConstraintCountBadge({
  openCount,
  totalCount,
  className,
}: ConstraintCountBadgeProps) {
  if (totalCount === 0) {return null}

  const hasOpen = openCount > 0

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full font-medium',
        hasOpen
          ? 'bg-red-100 text-red-700 border border-red-300'
          : 'bg-green-100 text-green-700 border border-green-300',
        className
      )}
      title={`${openCount} open / ${totalCount} total constraints`}
    >
      <AlertCircle className="w-3 h-3" />
      <span>
        {openCount}/{totalCount}
      </span>
    </span>
  )
}
