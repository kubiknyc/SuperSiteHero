/**
 * Purchase Order Card
 *
 * Card display for a purchase order in list views.
 */

import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { POStatusBadge } from './POStatusBadge';
import {
  ShoppingCart,
  Building2,
  Calendar,
  DollarSign,
  Package,
  ChevronRight,
  Truck,
} from 'lucide-react';
import type { PurchaseOrderWithDetails } from '@/types/procurement';

interface POCardProps {
  po: PurchaseOrderWithDetails;
  projectId: string;
}

export function POCard({ po, projectId }: POCardProps) {
  const receivedPercent = po.line_item_count > 0
    ? Math.round((po.received_line_count / po.line_item_count) * 100)
    : 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <Link
              to={`/projects/${projectId}/procurement/${po.id}`}
              className="font-semibold text-foreground hover:text-primary transition-colors"
            >
              {po.po_number}
            </Link>
          </div>
          <POStatusBadge status={po.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Vendor */}
        {po.vendor_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>{po.vendor_name}</span>
          </div>
        )}

        {/* Dates */}
        <div className="flex flex-wrap gap-4 text-sm">
          {po.order_date && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Ordered: {format(new Date(po.order_date), 'MMM d, yyyy')}</span>
            </div>
          )}
          {po.expected_delivery_date && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Truck className="h-4 w-4" />
              <span>Expected: {format(new Date(po.expected_delivery_date), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        {/* Amount & Items */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-semibold">
                ${po.total_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>{po.line_item_count} item{po.line_item_count !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Received Progress */}
          {po.status === 'ordered' || po.status === 'partially_received' ? (
            <div className="text-sm">
              <span className="text-muted-foreground">Received: </span>
              <span className={receivedPercent === 100 ? 'text-green-600 font-medium' : ''}>
                {receivedPercent}%
              </span>
            </div>
          ) : null}
        </div>

        {/* View Link */}
        <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
          <Link to={`/projects/${projectId}/procurement/${po.id}`}>
            View Details
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
