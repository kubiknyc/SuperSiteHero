/**
 * Delivery Card Component
 * Displays a material delivery in a card format with comprehensive information
 */

import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';
import { ConditionStatusBadge } from './ConditionStatusBadge';
import type { MaterialDelivery } from '@/types/material-receiving';

interface DeliveryCardProps {
  delivery: MaterialDelivery;
  projectId: string;
  photoCount?: number;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function DeliveryCard({
  delivery,
  projectId,
  photoCount = 0,
  onEdit,
  onDelete,
}: DeliveryCardProps) {
  const hasIssues = delivery.condition_status !== 'good' || (delivery.quantity_rejected || 0) > 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-medium truncate">
              {delivery.material_name}
            </CardTitle>
            {delivery.material_description && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {delivery.material_description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <DeliveryStatusBadge status={delivery.delivery_status} />
              <ConditionStatusBadge status={delivery.condition_status} />
              {delivery.material_category && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-secondary border">
                  {delivery.material_category}
                </span>
              )}
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
                <Link to={`/projects/${projectId}/material-receiving/${delivery.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Link>
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(delivery.id)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(delivery.id)}
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
        {/* Delivery Date & Ticket */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(delivery.delivery_date), 'MMM d, yyyy')}</span>
            {delivery.delivery_time && (
              <span className="text-xs">" {delivery.delivery_time.slice(0, 5)}</span>
            )}
          </div>
          {delivery.delivery_ticket_number && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span className="truncate">#{delivery.delivery_ticket_number}</span>
            </div>
          )}
        </div>

        {/* Quantity Info */}
        <div className="flex items-start gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            <div className="flex flex-col">
              <span className="font-medium text-foreground">
                {delivery.quantity_delivered} {delivery.unit_of_measure}
              </span>
              {delivery.quantity_ordered && (
                <span className="text-xs">
                  Ordered: {delivery.quantity_ordered} {delivery.unit_of_measure}
                </span>
              )}
              {(delivery.quantity_rejected || 0) > 0 && (
                <span className="text-xs text-error flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Rejected: {delivery.quantity_rejected}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Vendor Info */}
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Truck className="h-3.5 w-3.5" />
            <span className="truncate font-medium">{delivery.vendor_name}</span>
          </div>
          {(delivery.vendor_contact_name || delivery.vendor_contact_phone) && (
            <div className="ml-5 text-xs text-muted-foreground space-y-0.5">
              {delivery.vendor_contact_name && <div>{delivery.vendor_contact_name}</div>}
              {delivery.vendor_contact_phone && <div>{delivery.vendor_contact_phone}</div>}
            </div>
          )}
        </div>

        {/* Storage & Receiver */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {delivery.storage_location && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{delivery.storage_location}</span>
            </div>
          )}
          {delivery.received_by_name && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{delivery.received_by_name}</span>
            </div>
          )}
        </div>

        {/* Cost Info */}
        {delivery.total_cost && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">
              ${delivery.total_cost.toLocaleString()}
            </span>
            {delivery.unit_cost && (
              <span className="text-xs">
                (${delivery.unit_cost.toFixed(2)}/{delivery.unit_of_measure})
              </span>
            )}
          </div>
        )}

        {/* Issues Warning */}
        {hasIssues && (
          <div className="rounded-md bg-warning-light border border-yellow-200 p-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
              <div className="text-xs text-yellow-800">
                <div className="font-medium">Issues Detected</div>
                {delivery.condition_notes && (
                  <div className="mt-0.5">{delivery.condition_notes}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer: Links & Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {photoCount > 0 && (
              <div className="flex items-center gap-1">
                <Camera className="h-3.5 w-3.5" />
                <span>{photoCount}</span>
              </div>
            )}
            {delivery.submittal_id && (
              <div className="flex items-center gap-1">
                <Link2 className="h-3.5 w-3.5" />
                <span className="text-xs">Linked</span>
              </div>
            )}
            {delivery.purchase_order_number && (
              <div className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                <span className="text-xs">PO #{delivery.purchase_order_number}</span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/projects/${projectId}/material-receiving/${delivery.id}`}>
              View Details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default DeliveryCard;
