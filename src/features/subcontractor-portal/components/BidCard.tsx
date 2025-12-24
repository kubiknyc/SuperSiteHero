/**
 * Bid Card Component
 * Displays a change order bid request for subcontractor review
 */

import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Calendar, Building2, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { BidWithRelations } from '@/types/subcontractor-portal'

interface BidCardProps {
  bid: BidWithRelations
  compact?: boolean
}

function getBidStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="bg-warning-light text-amber-700 border-amber-200">Pending Response</Badge>
    case 'submitted':
      return <Badge variant="outline" className="bg-blue-50 text-primary-hover border-blue-200">Submitted</Badge>
    case 'awarded':
      return <Badge variant="outline" className="bg-success-light text-success-dark border-green-200">Awarded</Badge>
    case 'rejected':
      return <Badge variant="outline" className="bg-error-light text-error-dark border-red-200">Not Selected</Badge>
    case 'declined':
      return <Badge variant="outline" className="bg-surface text-secondary border-border">Declined</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function BidCard({ bid, compact = false }: BidCardProps) {
  const isPending = bid.bid_status === 'pending'

  if (compact) {
    return (
      <Link to={`/portal/bids/${bid.id}`}>
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-primary/10 rounded-md">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {bid.workflow_item?.title || 'Change Order Bid'}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {bid.project?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getBidStatusBadge(bid.bid_status)}
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">
              {bid.workflow_item?.title || 'Change Order Bid Request'}
            </CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {bid.project?.name}
              </span>
              {bid.workflow_item?.item_number && (
                <span>CO #{bid.workflow_item.item_number}</span>
              )}
            </div>
          </div>
          {getBidStatusBadge(bid.bid_status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Bid details if submitted */}
          {bid.lump_sum_cost !== null && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Your Bid Amount</p>
                <p className="text-xl font-semibold">
                  ${bid.lump_sum_cost.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-xl font-semibold">
                  {bid.duration_days} days
                </p>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {bid.submitted_at ? (
              <span>Submitted {formatDistanceToNow(new Date(bid.submitted_at))} ago</span>
            ) : (
              <span>Requested {formatDistanceToNow(new Date(bid.created_at))} ago</span>
            )}
          </div>

          {/* Actions */}
          {isPending && (
            <div className="flex gap-2 pt-2">
              <Button asChild className="flex-1">
                <Link to={`/portal/bids/${bid.id}`}>
                  Review & Submit Bid
                </Link>
              </Button>
            </div>
          )}

          {!isPending && (
            <Button variant="outline" asChild className="w-full">
              <Link to={`/portal/bids/${bid.id}`}>
                View Details
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default BidCard
