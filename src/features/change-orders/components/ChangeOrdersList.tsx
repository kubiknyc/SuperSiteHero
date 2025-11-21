// File: /src/features/change-orders/components/ChangeOrdersList.tsx
// List view of change orders

import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, DollarSign, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkflowItem } from '@/types/database'

interface ChangeOrdersListProps {
  changeOrders: (WorkflowItem & { workflow_type?: any; raised_by_user?: any; bids?: any[] })[]
}

export function ChangeOrdersList({ changeOrders }: ChangeOrdersListProps) {
  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      'under_review': 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      closed: 'bg-gray-100 text-gray-600',
    }
    return statusColors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority: string) => {
    const priorityColors: Record<string, string> = {
      low: 'border-l-gray-400',
      normal: 'border-l-blue-400',
      high: 'border-l-orange-400',
    }
    return priorityColors[priority] || 'border-l-gray-400'
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'TBD'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (changeOrders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No change orders found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {changeOrders.map((co) => {
        const awardedBid = co.bids?.find((b: any) => b.is_awarded)
        const totalCost = awardedBid?.lump_sum_cost || co.cost_impact

        return (
          <Card
            key={co.id}
            className={cn(
              'p-4 hover:shadow-md transition-shadow border-l-4',
              getPriorityColor(co.priority)
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg">
                    {co.workflow_type?.prefix || 'CO'}-{String(co.number).padStart(3, '0')}
                  </h3>
                  <Badge className={getStatusColor(co.status)}>
                    {co.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {co.priority}
                  </Badge>
                </div>

                <p className="text-gray-900 mb-2">{co.title}</p>

                {co.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {co.description}
                  </p>
                )}

                <div className="flex items-center gap-6 text-sm text-gray-600">
                  {totalCost !== null && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <span>{formatCurrency(totalCost)}</span>
                    </div>
                  )}

                  {co.schedule_impact !== null && co.schedule_impact > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{co.schedule_impact} days</span>
                    </div>
                  )}

                  {co.raised_by_user && (
                    <span>
                      By: {co.raised_by_user.first_name} {co.raised_by_user.last_name}
                    </span>
                  )}

                  <span>
                    Created: {format(new Date(co.created_at), 'MMM d, yyyy')}
                  </span>

                  {co.bids && co.bids.length > 0 && (
                    <span className="text-blue-600">
                      {co.bids.length} bid{co.bids.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              <Link to={`/change-orders/${co.id}`}>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </Button>
              </Link>
            </div>
          </Card>
        )
      })}
    </div>
  )
}