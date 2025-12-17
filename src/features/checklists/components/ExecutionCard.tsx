// File: /src/features/checklists/components/ExecutionCard.tsx
// Execution card component for grid/list view
// Phase: 3.1 - Checklist Execution UI

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  CheckSquare,
  MoreVertical,
  Eye,
  PlayCircle,
  Trash2,
  Clock,
  MapPin,
  User,
  Award,
} from 'lucide-react'
import type { ChecklistExecution } from '@/types/checklists'
import { formatDistanceToNow } from 'date-fns'

interface ExecutionCardProps {
  execution: ChecklistExecution
  viewMode?: 'grid' | 'list'
  onDelete?: (execution: ChecklistExecution) => void
  className?: string
}

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  submitted: 'bg-green-100 text-green-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
}

const STATUS_LABELS = {
  draft: 'Draft',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
}

export function ExecutionCard({
  execution,
  viewMode = 'grid',
  onDelete,
  className = '',
}: ExecutionCardProps) {
  const navigate = useNavigate()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const canContinue = execution.status === 'draft' || execution.status === 'in_progress'
  const isCompleted = execution.is_completed

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete?.(execution)
      setShowDeleteConfirm(false)
      setShowMenu(false)
    } else {
      setShowDeleteConfirm(true)
      setTimeout(() => setShowDeleteConfirm(false), 3000)
    }
  }

  const handleView = () => {
    navigate(`/checklists/executions/${execution.id}`)
  }

  const handleContinue = () => {
    navigate(`/checklists/executions/${execution.id}/fill`)
  }

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  // Calculate progress percentage (mock for now - will be calculated from responses)
  const progressPercentage = execution.is_completed ? 100 : 0

  if (viewMode === 'list') {
    return (
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <div className="flex items-center p-4 gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-950 flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-primary dark:text-primary-400" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3
                  className="text-base font-semibold truncate cursor-pointer hover:text-primary dark:hover:text-primary-400"
                  onClick={handleView}
                >
                  {execution.name}
                </h3>
                {execution.description && (
                  <p className="text-sm text-gray-600 line-clamp-1">{execution.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <Badge className={`text-xs ${STATUS_COLORS[execution.status]}`}>
                    {STATUS_LABELS[execution.status]}
                  </Badge>
                  {execution.category && (
                    <Badge variant="outline" className="text-xs">
                      {execution.category}
                    </Badge>
                  )}
                  {execution.inspector_user_id && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Inspector
                    </span>
                  )}
                  {execution.location && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {execution.location}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {execution.completed_at
                      ? `Completed ${formatDistanceToNow(new Date(execution.completed_at), { addSuffix: true })}`
                      : `Created ${formatDistanceToNow(new Date(execution.created_at), { addSuffix: true })}`
                    }
                  </span>
                </div>

                {/* Progress Bar */}
                {!isCompleted && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          progressPercentage === 100 ? 'bg-green-600' : 'bg-primary dark:bg-primary'
                        }`}
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 relative" ref={menuRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMenu(!showMenu)}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                    <div className="py-1">
                      <button
                        onClick={() => { handleView(); setShowMenu(false) }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </button>
                      {canContinue && (
                        <button
                          onClick={() => { handleContinue(); setShowMenu(false) }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Continue
                        </button>
                      )}
                      <div className="border-t border-gray-200 my-1" />
                      <button
                        onClick={handleDelete}
                        className={`flex items-center w-full px-4 py-2 text-sm ${
                          showDeleteConfirm ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {showDeleteConfirm ? 'Click again to confirm' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // Grid view
  return (
    <Card className={`hover:shadow-lg transition-shadow cursor-pointer group ${className}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-950 flex items-center justify-center mb-3">
              <CheckSquare className="w-6 h-6 text-primary dark:text-primary-400" />
            </div>
            <CardTitle
              className="text-lg truncate group-hover:text-primary dark:group-hover:text-primary-400"
              onClick={handleView}
            >
              {execution.name}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={`text-xs ${STATUS_COLORS[execution.status]}`}>
                {STATUS_LABELS[execution.status]}
              </Badge>
            </div>
          </div>
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
                  <button
                    onClick={() => { handleView(); setShowMenu(false) }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </button>
                  {canContinue && (
                    <button
                      onClick={() => { handleContinue(); setShowMenu(false) }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Continue
                    </button>
                  )}
                  <div className="border-t border-gray-200 my-1" />
                  <button
                    onClick={handleDelete}
                    className={`flex items-center w-full px-4 py-2 text-sm ${
                      showDeleteConfirm ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {showDeleteConfirm ? 'Click again to confirm' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent onClick={handleView}>
        {execution.description && (
          <CardDescription className="line-clamp-2 min-h-[2.5rem]">
            {execution.description}
          </CardDescription>
        )}

        <div className="mt-4 space-y-2">
          {/* Category */}
          {execution.category && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {execution.category}
              </Badge>
            </div>
          )}

          {/* Location & Inspector */}
          <div className="flex flex-col gap-1 text-sm text-gray-600">
            {execution.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{execution.location}</span>
              </div>
            )}
            {execution.inspector_user_id && (
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>Inspector assigned</span>
              </div>
            )}
          </div>

          {/* Progress Bar (only for in-progress) */}
          {!isCompleted && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Progress</span>
                <span>{progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    progressPercentage === 100 ? 'bg-green-600' : 'bg-primary dark:bg-primary'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="text-xs text-gray-400 flex justify-between" onClick={handleView}>
        <span>
          {execution.completed_at
            ? `Completed ${formatDistanceToNow(new Date(execution.completed_at), { addSuffix: true })}`
            : `Created ${formatDistanceToNow(new Date(execution.created_at), { addSuffix: true })}`
          }
        </span>
        {canContinue && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); handleContinue() }}
            className="ml-2"
          >
            <PlayCircle className="w-3 h-3 mr-1" />
            Continue
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
