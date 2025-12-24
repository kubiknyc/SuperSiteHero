/**
 * Material Receiving Card Component
 *
 * Displays a material receipt in a card format with key information
 */

import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Calendar,
  MapPin,
  Truck,
  User,
  FileText,
  Camera,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Package,
  Link2,
} from 'lucide-react'
import { format } from 'date-fns'
import { StatusBadge } from './StatusBadge'
import { ConditionBadge } from './ConditionBadge'
import type { MaterialReceivedWithDetails } from '@/types/material-receiving'

interface MaterialReceivingCardProps {
  material: MaterialReceivedWithDetails
  projectId: string
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function MaterialReceivingCard({
  material,
  projectId,
  onEdit,
  onDelete,
}: MaterialReceivingCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-medium truncate">
              {material.material_description}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <StatusBadge status={material.status} />
              <ConditionBadge condition={material.condition} />
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/projects/${projectId}/material-receiving/${material.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Link>
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(material.id)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(material.id)}
                  className="text-error"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-2 space-y-3">
        {/* Delivery Info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(material.delivery_date), 'MMM d, yyyy')}</span>
          </div>
          {material.delivery_ticket_number && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span className="truncate">#{material.delivery_ticket_number}</span>
            </div>
          )}
        </div>

        {/* Quantity & Vendor */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {material.quantity && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              <span>
                {material.quantity}
                {material.unit && ` ${material.unit}`}
              </span>
            </div>
          )}
          {material.vendor && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Truck className="h-3.5 w-3.5" />
              <span className="truncate">{material.vendor}</span>
            </div>
          )}
        </div>

        {/* Storage & Receiver */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {material.storage_location && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{material.storage_location}</span>
            </div>
          )}
          {material.received_by_name && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{material.received_by_name}</span>
            </div>
          )}
        </div>

        {/* Links & Photos */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {material.photo_count > 0 && (
              <div className="flex items-center gap-1">
                <Camera className="h-3.5 w-3.5" />
                <span>{material.photo_count}</span>
              </div>
            )}
            {material.submittal_number && (
              <div className="flex items-center gap-1">
                <Link2 className="h-3.5 w-3.5" />
                <span>Submittal #{material.submittal_number}</span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/projects/${projectId}/material-receiving/${material.id}`}>
              View
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default MaterialReceivingCard
