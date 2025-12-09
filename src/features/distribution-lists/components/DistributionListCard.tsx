/**
 * Distribution List Card Component
 * Displays a single distribution list with actions
 */

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Star,
  Globe,
  FolderOpen,
} from 'lucide-react'
import type { DistributionListWithCount } from '@/types/distribution-list'
import { getListTypeLabel } from '@/types/distribution-list'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface DistributionListCardProps {
  list: DistributionListWithCount
  onEdit?: (list: DistributionListWithCount) => void
  onDuplicate?: (list: DistributionListWithCount) => void
  onDelete?: (list: DistributionListWithCount) => void
}

export function DistributionListCard({
  list,
  onEdit,
  onDuplicate,
  onDelete,
}: DistributionListCardProps) {
  return (
    <Card className={cn(
      'hover:shadow-md transition-shadow',
      list.is_default && 'ring-1 ring-yellow-400'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn(
            'p-2.5 rounded-lg',
            list.project_id ? 'bg-blue-100' : 'bg-gray-100'
          )}>
            <Users className={cn(
              'h-5 w-5',
              list.project_id ? 'text-blue-600' : 'text-gray-600'
            )} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base truncate">{list.name}</h3>
              {list.is_default && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
              )}
            </div>

            {list.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                {list.description}
              </p>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {getListTypeLabel(list.list_type as any)}
              </Badge>

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{list.member_count} member{list.member_count !== 1 ? 's' : ''}</span>
              </div>

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {list.project_id ? (
                  <>
                    <FolderOpen className="h-3 w-3" />
                    <span>Project</span>
                  </>
                ) : (
                  <>
                    <Globe className="h-3 w-3" />
                    <span>Company-wide</span>
                  </>
                )}
              </div>

              {list.updated_at && (
                <span className="text-xs text-muted-foreground">
                  Updated {formatDistanceToNow(new Date(list.updated_at), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(list)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(list)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(list)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

export default DistributionListCard
