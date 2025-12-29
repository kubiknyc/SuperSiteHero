import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  Truck,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from 'lucide-react'
import type { MaterialDelivery } from '@/types/material-receiving'

interface MaterialAnalyticsProps {
  deliveries: MaterialDelivery[]
  dateRange?: { from: Date; to: Date }
}

interface AnalyticsData {
  totalDeliveries: number
  completedDeliveries: number
  pendingDeliveries: number
  onTimeRate: number
  damageRate: number
  rejectionRate: number
  avgDeliveryTime: number
  byStatus: Record<string, number>
  byCategory: Record<string, number>
  byVendor: Record<string, { total: number; onTime: number; damaged: number }>
  recentTrend: 'up' | 'down' | 'stable'
}

function calculateAnalytics(deliveries: MaterialDelivery[]): AnalyticsData {
  const total = deliveries.length
  const completed = deliveries.filter(d => d.delivery_status === 'received').length
  const pending = deliveries.filter(d => d.delivery_status === 'scheduled').length
  const rejected = deliveries.filter(d => d.delivery_status === 'rejected').length
  const damaged = deliveries.filter(d => d.condition_status === 'damaged' || d.condition_status === 'defective').length

  // Calculate on-time rate (using delivery_date for both since we don't have separate scheduled/received dates)
  let onTimeCount = 0
  let deliveriesWithDates = 0
  deliveries.forEach(d => {
    if (d.delivery_date) {
      deliveriesWithDates++
      // All deliveries with a date are considered on-time for now
      if (d.delivery_status === 'received') {
        onTimeCount++
      }
    }
  })

  // By status
  const byStatus: Record<string, number> = {}
  deliveries.forEach(d => {
    const status = d.delivery_status || 'unknown'
    byStatus[status] = (byStatus[status] || 0) + 1
  })

  // By category
  const byCategory: Record<string, number> = {}
  deliveries.forEach(d => {
    const category = (d.material_category as string) || 'other'
    byCategory[category] = (byCategory[category] || 0) + 1
  })

  // By vendor
  const byVendor: Record<string, { total: number; onTime: number; damaged: number }> = {}
  deliveries.forEach(d => {
    const vendor = d.vendor_name || 'Unknown'
    if (!byVendor[vendor]) {
      byVendor[vendor] = { total: 0, onTime: 0, damaged: 0 }
    }
    byVendor[vendor].total++
    if (d.delivery_date && d.delivery_status === 'received') {
      byVendor[vendor].onTime++
    }
    if (d.condition_status === 'damaged' || d.condition_status === 'defective') {
      byVendor[vendor].damaged++
    }
  })

  // Calculate trend (compare last 7 days vs previous 7 days)
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const lastWeek = deliveries.filter(d => {
    const date = new Date(d.created_at || '')
    return date >= sevenDaysAgo && date <= now
  }).length

  const previousWeek = deliveries.filter(d => {
    const date = new Date(d.created_at || '')
    return date >= fourteenDaysAgo && date < sevenDaysAgo
  }).length

  let recentTrend: 'up' | 'down' | 'stable' = 'stable'
  if (lastWeek > previousWeek * 1.1) {recentTrend = 'up'}
  if (lastWeek < previousWeek * 0.9) {recentTrend = 'down'}

  return {
    totalDeliveries: total,
    completedDeliveries: completed,
    pendingDeliveries: pending,
    onTimeRate: deliveriesWithDates > 0 ? Math.round((onTimeCount / deliveriesWithDates) * 100) : 0,
    damageRate: total > 0 ? Math.round((damaged / total) * 100) : 0,
    rejectionRate: total > 0 ? Math.round((rejected / total) * 100) : 0,
    avgDeliveryTime: 0, // Would need more data to calculate
    byStatus,
    byCategory,
    byVendor,
    recentTrend,
  }
}

export function MaterialAnalytics({ deliveries, dateRange: _dateRange }: MaterialAnalyticsProps) {
  const analytics = useMemo(() => calculateAnalytics(deliveries), [deliveries])

  const topCategories = useMemo(() => {
    return Object.entries(analytics.byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [analytics.byCategory])

  const topVendors = useMemo(() => {
    return Object.entries(analytics.byVendor)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
  }, [analytics.byVendor])

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info-light rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted">Total Deliveries</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{analytics.totalDeliveries}</p>
                  {analytics.recentTrend === 'up' && (
                    <TrendingUp className="h-4 w-4 text-success" />
                  )}
                  {analytics.recentTrend === 'down' && (
                    <TrendingDown className="h-4 w-4 text-error" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success-light rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted">On-Time Rate</p>
                <p className="text-2xl font-bold">{analytics.onTimeRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning-light rounded-lg">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted">Pending</p>
                <p className="text-2xl font-bold">{analytics.pendingDeliveries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-error-light rounded-lg">
                <AlertTriangle className="h-5 w-5 text-error" />
              </div>
              <div>
                <p className="text-sm text-muted">Damage Rate</p>
                <p className="text-2xl font-bold">{analytics.damageRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Deliveries by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Deliveries by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.byStatus).map(([status, count]) => {
                const percentage = analytics.totalDeliveries > 0
                  ? Math.round((count / analytics.totalDeliveries) * 100)
                  : 0

                const statusColors: Record<string, string> = {
                  scheduled: 'bg-blue-500',
                  received: 'bg-green-500',
                  partially_received: 'bg-warning',
                  rejected: 'bg-red-500',
                  back_ordered: 'bg-gray-500',
                }

                return (
                  <div key={status}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="capitalize">{status.replace('_', ' ')}</span>
                      <span className="text-muted">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${statusColors[status] || 'bg-gray-500'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Top Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <p className="text-muted text-sm">No category data</p>
            ) : (
              <div className="space-y-3">
                {topCategories.map(([category, count]) => {
                  const percentage = analytics.totalDeliveries > 0
                    ? Math.round((count / analytics.totalDeliveries) * 100)
                    : 0

                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize">{category.replace('_', ' ')}</span>
                        <span className="text-muted">{count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Vendors Performance */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Vendor Performance
            </CardTitle>
            <CardDescription>
              Top vendors by delivery volume and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topVendors.length === 0 ? (
              <p className="text-muted text-sm">No vendor data</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Vendor</th>
                      <th className="text-center py-2 font-medium">Deliveries</th>
                      <th className="text-center py-2 font-medium">On-Time Rate</th>
                      <th className="text-center py-2 font-medium">Damage Rate</th>
                      <th className="text-center py-2 font-medium">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topVendors.map(([vendor, stats]) => {
                      const onTimeRate = stats.total > 0
                        ? Math.round((stats.onTime / stats.total) * 100)
                        : 0
                      const damageRate = stats.total > 0
                        ? Math.round((stats.damaged / stats.total) * 100)
                        : 0

                      // Simple rating calculation
                      let rating: 'good' | 'fair' | 'poor' = 'good'
                      if (onTimeRate < 80 || damageRate > 10) {rating = 'fair'}
                      if (onTimeRate < 60 || damageRate > 20) {rating = 'poor'}

                      const ratingColors = {
                        good: 'bg-success-light text-green-800',
                        fair: 'bg-warning-light text-yellow-800',
                        poor: 'bg-error-light text-red-800',
                      }

                      return (
                        <tr key={vendor} className="border-b last:border-0">
                          <td className="py-3 font-medium">{vendor}</td>
                          <td className="py-3 text-center">{stats.total}</td>
                          <td className="py-3 text-center">
                            <span className={onTimeRate >= 80 ? 'text-success' : 'text-warning'}>
                              {onTimeRate}%
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span className={damageRate <= 5 ? 'text-success' : 'text-error'}>
                              {damageRate}%
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <Badge className={ratingColors[rating]}>
                              {rating.charAt(0).toUpperCase() + rating.slice(1)}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted mb-1">Completed</p>
            <p className="text-3xl font-bold text-success">{analytics.completedDeliveries}</p>
            <p className="text-xs text-disabled">
              {analytics.totalDeliveries > 0
                ? `${Math.round((analytics.completedDeliveries / analytics.totalDeliveries) * 100)}% of total`
                : '0% of total'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted mb-1">Rejection Rate</p>
            <p className="text-3xl font-bold text-error">{analytics.rejectionRate}%</p>
            <p className="text-xs text-disabled">Target: &lt;5%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted mb-1">Unique Vendors</p>
            <p className="text-3xl font-bold text-primary">{Object.keys(analytics.byVendor).length}</p>
            <p className="text-xs text-disabled">Active suppliers</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default MaterialAnalytics
