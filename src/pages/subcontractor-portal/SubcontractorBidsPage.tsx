/**
 * Subcontractor Bids Page
 * Lists all change order bids for the subcontractor
 */

import { useState } from 'react'
import { useSubcontractorBids } from '@/features/subcontractor-portal/hooks'
import { BidCard } from '@/features/subcontractor-portal/components'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText } from 'lucide-react'
import type { BidStatus } from '@/types/subcontractor-portal'

function BidsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-40" />
      ))}
    </div>
  )
}

export function SubcontractorBidsPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted' | 'all'>('pending')

  const statusFilter: BidStatus[] | undefined =
    activeTab === 'pending'
      ? ['pending']
      : activeTab === 'submitted'
        ? ['submitted', 'awarded', 'rejected', 'declined']
        : undefined

  const { data: bids, isLoading, isError } = useSubcontractorBids(
    statusFilter ? { status: statusFilter } : undefined
  )

  const pendingCount = bids?.filter((b) => b.bid_status === 'pending').length || 0
  const submittedCount = bids?.filter((b) =>
    ['submitted', 'awarded', 'rejected', 'declined'].includes(b.bid_status)
  ).length || 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 heading-page">
          <FileText className="h-6 w-6" />
          Change Order Bids
        </h1>
        <p className="text-muted-foreground">
          Review and submit your bids for change order work.
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="submitted">
            Submitted ({submittedCount})
          </TabsTrigger>
          <TabsTrigger value="all">
            All
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <BidsSkeleton />
          ) : isError ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Failed to load bids
              </CardContent>
            </Card>
          ) : !bids || bids.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                {activeTab === 'pending'
                  ? 'No pending bid requests'
                  : activeTab === 'submitted'
                    ? 'No submitted bids'
                    : 'No bids found'}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {bids.map((bid) => (
                <BidCard key={bid.id} bid={bid} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SubcontractorBidsPage
