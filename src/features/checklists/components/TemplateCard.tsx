// File: /src/features/checklists/components/TemplateCard.tsx
// Template card component for grid/list view
// Phase: 2.1 - Template List/Grid View

import { useState, useRef, useEffect } from 'react'
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
  Copy,
  Edit,
  Trash2,
  Clock,
  Tag,
  FileText,
  ListChecks,
} from 'lucide-react'
import type { ChecklistTemplate } from '@/types/checklists'
import { formatDistanceToNow } from 'date-fns'

interface TemplateCardProps {
  template: ChecklistTemplate
  viewMode?: 'grid' | 'list'
  onEdit?: (template: ChecklistTemplate) => void
  onEditItems?: (template: ChecklistTemplate) => void
  onDuplicate?: (template: ChecklistTemplate) => void
  onDelete?: (template: ChecklistTemplate) => void
  onView?: (template: ChecklistTemplate) => void
}

export function TemplateCard({
  template,
  viewMode = 'grid',
  onEdit,
  onEditItems,
  onDuplicate,
  onDelete,
  onView,
}: TemplateCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete?.(template)
      setShowDeleteConfirm(false)
      setShowMenu(false)
    } else {
      setShowDeleteConfirm(true)
      setTimeout(() => setShowDeleteConfirm(false), 3000)
    }
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

  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <div className="flex items-center p-4 gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3
                  className="text-base font-semibold truncate cursor-pointer hover:text-blue-600"
                  onClick={() => onView?.(template)}
                >
                  {template.name}
                </h3>
                {template.description && (
                  <p className="text-sm text-gray-600 line-clamp-1">{template.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  {template.category && (
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                  )}
                  {template.is_system_template && (
                    <Badge variant="secondary" className="text-xs">
                      System
                    </Badge>
                  )}
                  {template.estimated_duration_minutes && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {template.estimated_duration_minutes} min
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    Updated {formatDistanceToNow(new Date(template.updated_at), { addSuffix: true })}
                  </span>
                </div>
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
                        onClick={() => { onView?.(template); setShowMenu(false) }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Details
                      </button>
                      <button
                        onClick={() => { onEdit?.(template); setShowMenu(false) }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Template
                      </button>
                      <button
                        onClick={() => { onEditItems?.(template); setShowMenu(false) }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <ListChecks className="w-4 h-4 mr-2" />
                        Edit Items
                      </button>
                      <button
                        onClick={() => { onDuplicate?.(template); setShowMenu(false) }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </button>
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
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
              <CheckSquare className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle
              className="text-lg truncate group-hover:text-blue-600"
              onClick={() => onView?.(template)}
            >
              {template.name}
            </CardTitle>
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
                    onClick={() => { onView?.(template); setShowMenu(false) }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Details
                  </button>
                  <button
                    onClick={() => { onEdit?.(template); setShowMenu(false) }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Template
                  </button>
                  <button
                    onClick={() => { onEditItems?.(template); setShowMenu(false) }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <ListChecks className="w-4 h-4 mr-2" />
                    Edit Items
                  </button>
                  <button
                    onClick={() => { onDuplicate?.(template); setShowMenu(false) }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </button>
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

      <CardContent onClick={() => onView?.(template)}>
        {template.description && (
          <CardDescription className="line-clamp-2 min-h-[2.5rem]">
            {template.description}
          </CardDescription>
        )}

        <div className="mt-4 space-y-2">
          {/* Category & System Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            {template.category && (
              <Badge variant="outline" className="text-xs">
                {template.category}
              </Badge>
            )}
            {template.is_system_template && (
              <Badge variant="secondary" className="text-xs">
                System
              </Badge>
            )}
          </div>

          {/* Tags */}
          {template.tags && template.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Tag className="w-3 h-3 text-gray-400" />
              {template.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {template.tags.length > 3 && (
                <span className="text-xs text-gray-500">+{template.tags.length - 3} more</span>
              )}
            </div>
          )}

          {/* Duration */}
          {template.estimated_duration_minutes && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{template.estimated_duration_minutes} minutes</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="text-xs text-gray-400" onClick={() => onView?.(template)}>
        Updated {formatDistanceToNow(new Date(template.updated_at), { addSuffix: true })}
      </CardFooter>
    </Card>
  )
}
