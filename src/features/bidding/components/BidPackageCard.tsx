/**
 * BidPackageCard Component
 * Card display for bid packages in list view
 */

import { formatDistanceToNow, format } from 'date-fns'
import { Link } from 'react-router-dom'
import {
  Building2,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Mail,
  Users,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { BidPackageStatusBadge } from './BidPackageStatusBadge'
import type { BidPackageWithDetails } from '@/types/bidding'
import { formatBidAmount, getDaysUntilDue, getBidTypeLabel, getDivisionName } from '@/types/bidding'

interface BidPackageCardProps {
  bidPackage: BidPackageWithDetails
  onInvite?: (id: string) => void
  onPublish?: (id: string) => void
}

export function BidPackageCard({ bidPackage, onInvite, onPublish }: BidPackageCardProps) {
  const daysUntilDue = getDaysUntilDue(bidPackage.bid_due_date)
  const isOverdue = daysUntilDue < 0
  const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 3
  const responsesReceived = (bidPackage.accepted_count || 0) + (bidPackage.declined_count || 0)
  const totalInvited = bidPackage.invitations_count || 0
  const responseRate = totalInvited > 0 ? (responsesReceived / totalInvited) * 100 : 0

  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link to={`/bidding/${bidPackage.id}`}>
              <CardTitle className="text-lg font-semibold hover:text-primary truncate">
                {bidPackage.package_number} - {bidPackage.name}
              </CardTitle>
            </Link>
            {bidPackage.project && (
              <p className="text-sm text-muted-foreground truncate mt-1">
                <Building2 className="w-3 h-3 inline mr-1" />
                {bidPackage.project.name}
              </p>
            )}
          </div>
          <BidPackageStatusBadge status={bidPackage.status} />
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Bid Type & Division */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {getBidTypeLabel(bidPackage.bid_type)}
          </span>
          {bidPackage.division && (
            <span className="truncate">
              Div {bidPackage.division} - {getDivisionName(bidPackage.division)}
            </span>
          )}
        </div>

        {/* Due Date */}
        <div className={`flex items-center gap-2 text-sm ${isOverdue ? 'text-error' : isDueSoon ? 'text-orange-600' : 'text-muted-foreground'}`}>
          {isOverdue ? (
            <AlertTriangle className="w-4 h-4" />
          ) : isDueSoon ? (
            <Clock className="w-4 h-4" />
          ) : (
            <Calendar className="w-4 h-4" />
          )}
          <span>
            {isOverdue ? (
              `Bids closed ${formatDistanceToNow(new Date(bidPackage.bid_due_date))} ago`
            ) : daysUntilDue === 0 ? (
              `Due today at ${bidPackage.bid_due_time || '5:00 PM'}`
            ) : (
              `Due ${format(new Date(bidPackage.bid_due_date), 'MMM d, yyyy')} at ${bidPackage.bid_due_time || '5:00 PM'}`
            )}
          </span>
          {isDueSoon && !isOverdue && (
            <span className="ml-auto font-medium">
              {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''} left
            </span>
          )}
        </div>

        {/* Estimated Value */}
        {bidPackage.estimated_value && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span>Est. Value: {formatBidAmount(bidPackage.estimated_value)}</span>
          </div>
        )}

        {/* Invitation Stats */}
        {totalInvited > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="w-4 h-4" />
                Invitations
              </span>
              <span>
                {responsesReceived} / {totalInvited} responded
              </span>
            </div>
            <Progress value={responseRate} className="h-2" />
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="text-success">{bidPackage.accepted_count || 0} accepted</span>
              <span className="text-error">{bidPackage.declined_count || 0} declined</span>
              <span>{(totalInvited - responsesReceived)} pending</span>
            </div>
          </div>
        )}

        {/* Bid Stats */}
        {(bidPackage.submissions_count || 0) > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Bids Received</span>
              <span className="font-semibold">{bidPackage.submissions_count}</span>
            </div>
            {bidPackage.low_bid && bidPackage.high_bid && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Low Bid</span>
                  <span className="font-medium text-success">{formatBidAmount(bidPackage.low_bid)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">High Bid</span>
                  <span className="font-medium">{formatBidAmount(bidPackage.high_bid)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pending Questions */}
        {(bidPackage.pending_questions || 0) > 0 && (
          <div className="flex items-center gap-2 text-sm text-orange-600">
            <HelpCircle className="w-4 h-4" />
            <span>{bidPackage.pending_questions} unanswered question{bidPackage.pending_questions !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Awarded */}
        {bidPackage.status === 'awarded' && bidPackage.awarded_bidder && (
          <div className="flex items-center gap-2 text-sm text-success pt-2 border-t">
            <CheckCircle2 className="w-4 h-4" />
            <span>Awarded to {bidPackage.awarded_bidder.company_name}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-4 gap-2">
        <Link to={`/bidding/${bidPackage.id}`} className="flex-1">
          <Button variant="outline" className="w-full" size="sm">
            View Details
          </Button>
        </Link>
        {bidPackage.status === 'draft' && onPublish && (
          <Button size="sm" onClick={() => onPublish(bidPackage.id)}>
            Publish
          </Button>
        )}
        {['published', 'questions_period', 'bids_due'].includes(bidPackage.status) && onInvite && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={() => onInvite(bidPackage.id)}>
                  <Mail className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send Invitations</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardFooter>
    </Card>
  )
}
