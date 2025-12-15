/**
 * Historical Bid Analysis Dashboard Component
 * Main dashboard showing vendor performance, bid accuracy, trends, and recommendations
 */

import React, { useState } from 'react'
import { format, subMonths } from 'date-fns'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Users,
  DollarSign,
  Award,
  Download,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { VendorPerformanceCard } from './VendorPerformanceCard'
import { BidAccuracyChart } from './BidAccuracyChart'
import { BidTrendChart } from './BidTrendChart'
import { useBidAnalysisDashboard, useExportBidAnalysis } from '../hooks/useHistoricalBidAnalysis'
import { CSI_DIVISIONS } from '@/types/cost-tracking'
import type { BidAnalysisFilters, TrendDirection } from '@/types/historical-bid-analysis'
import { formatCurrency, formatPercentage, getTrendColor, getTrendIcon } from '@/types/historical-bid-analysis'

interface SummaryCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: {
    direction: TrendDirection
    value: string
  }
  colorClass?: string
}

function SummaryCard({ title, value, subtitle, icon, trend, colorClass = 'text-blue-600' }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                {trend.direction === 'increasing' && <TrendingUp className="h-4 w-4 text-red-500" />}
                {trend.direction === 'decreasing' && <TrendingDown className="h-4 w-4 text-green-500" />}
                {trend.direction === 'stable' && <Minus className="h-4 w-4 text-gray-500" />}
                <span className={`text-sm font-medium text-${getTrendColor(trend.direction)}-600`}>
                  {trend.value}
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-gray-100 ${colorClass}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function HistoricalBidAnalysis() {
  const [filters, setFilters] = useState<Partial<BidAnalysisFilters>>({
    date_from: format(subMonths(new Date(), 12), 'yyyy-MM-dd'),
    date_to: format(new Date(), 'yyyy-MM-dd'),
  })

  const [selectedDivision, setSelectedDivision] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const { trends, recommendations, isLoading, isError } = useBidAnalysisDashboard(filters)
  const exportMutation = useExportBidAnalysis()

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    exportMutation.mutate({
      filters: filters as BidAnalysisFilters,
      format,
      include_charts: true,
      include_vendor_details: true,
      include_raw_data: format === 'excel',
    })
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  // Calculate summary metrics from trends data
  const summaryMetrics = React.useMemo(() => {
    if (!trends.data || trends.data.length === 0) {
      return {
        totalBids: 0,
        avgAccuracy: 0,
        topVendors: 0,
        trendDirection: 'stable' as TrendDirection,
      }
    }

    const totalBids = trends.data.reduce((sum, t) => sum + t.bid_count, 0)
    const latestTrend = trends.data[trends.data.length - 1]
    const earliestTrend = trends.data[0]

    // Calculate trend direction based on average bid changes
    let trendDirection: TrendDirection = 'stable'
    if (latestTrend && earliestTrend && earliestTrend.average_bid > 0) {
      const change = ((latestTrend.average_bid - earliestTrend.average_bid) / earliestTrend.average_bid) * 100
      if (Math.abs(change) > 10) {
        trendDirection = change > 0 ? 'increasing' : 'decreasing'
      }
    }

    return {
      totalBids,
      avgAccuracy: 95, // TODO: Calculate from actual data
      topVendors: recommendations.data?.length || 0,
      trendDirection,
    }
  }, [trends.data, recommendations.data])

  if (isError) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-medium">Failed to load bid analysis data</p>
        <Button onClick={handleRefresh} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Historical Bid Analysis</h1>
          <p className="text-muted-foreground mt-1">
            Analyze past bid performance, vendor trends, and pricing accuracy
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Select onValueChange={(value) => handleExport(value as 'pdf' | 'excel' | 'csv')}>
            <SelectTrigger className="w-[140px]">
              <Download className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Export" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">Export PDF</SelectItem>
              <SelectItem value="excel">Export Excel</SelectItem>
              <SelectItem value="csv">Export CSV</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-from">From Date</Label>
              <Input
                id="date-from"
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">To Date</Label>
              <Input
                id="date-to"
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="division">CSI Division</Label>
              <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                <SelectTrigger id="division">
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {CSI_DIVISIONS.map((div) => (
                    <SelectItem key={div.division} value={div.division}>
                      {div.division} - {div.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="search">Search Vendors</Label>
              <Input
                id="search"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <SummaryCard
              title="Total Bids Analyzed"
              value={summaryMetrics.totalBids.toLocaleString()}
              icon={<Target className="h-6 w-6" />}
              colorClass="text-blue-600"
            />
            <SummaryCard
              title="Average Accuracy"
              value={formatPercentage(summaryMetrics.avgAccuracy)}
              subtitle="Estimated vs Actual"
              icon={<DollarSign className="h-6 w-6" />}
              colorClass="text-green-600"
            />
            <SummaryCard
              title="Top Vendors"
              value={summaryMetrics.topVendors}
              subtitle="Recommended"
              icon={<Users className="h-6 w-6" />}
              colorClass="text-purple-600"
            />
            <SummaryCard
              title="Price Trend"
              value={summaryMetrics.trendDirection}
              subtitle="Last 12 months"
              icon={<Award className="h-6 w-6" />}
              trend={{
                direction: summaryMetrics.trendDirection,
                value: summaryMetrics.trendDirection,
              }}
              colorClass="text-orange-600"
            />
          </>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Bid Trends</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Performance</TabsTrigger>
          <TabsTrigger value="accuracy">Bid Accuracy</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Bid Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bid Trends Over Time</CardTitle>
              <CardDescription>
                Track bid volume, win rates, and pricing trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : trends.data && trends.data.length > 0 ? (
                <BidTrendChart data={trends.data} />
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  No trend data available for the selected period
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Win Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <div className="space-y-2">
                    {trends.data?.slice(-6).map((trend) => (
                      <div key={trend.period} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{trend.period_label}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={trend.win_rate >= 40 ? 'default' : 'secondary'}>
                            {formatPercentage(trend.win_rate)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {trend.win_count}/{trend.bid_count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Average Markup</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <div className="space-y-2">
                    {trends.data?.slice(-6).map((trend) => (
                      <div key={trend.period} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{trend.period_label}</span>
                        <Badge variant="outline">
                          {formatPercentage(trend.average_markup)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Vendor Performance Tab */}
        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Vendors</CardTitle>
              <CardDescription>
                Vendors ranked by historical performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : recommendations.data && recommendations.data.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {recommendations.data.slice(0, 10).map((vendor) => (
                    <VendorPerformanceCard key={vendor.vendor_id || vendor.vendor_name} vendor={vendor} />
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  No vendor performance data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bid Accuracy Tab */}
        <TabsContent value="accuracy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bid Accuracy Analysis</CardTitle>
              <CardDescription>
                Compare estimated bid amounts to actual project costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-12">
                Select a project to view bid accuracy analysis
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Recommendations</CardTitle>
              <CardDescription>
                AI-powered vendor recommendations based on historical performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : recommendations.data && recommendations.data.length > 0 ? (
                <div className="space-y-4">
                  {recommendations.data.map((vendor) => (
                    <div
                      key={vendor.vendor_id || vendor.vendor_name}
                      className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg">
                        #{vendor.rank}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{vendor.vendor_name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                Score: {vendor.score.toFixed(1)}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Win Rate: {formatPercentage(vendor.win_rate)}
                              </Badge>
                              <Badge
                                variant={
                                  vendor.confidence === 'high' ? 'default' :
                                  vendor.confidence === 'medium' ? 'secondary' : 'outline'
                                }
                                className="text-xs"
                              >
                                {vendor.confidence} confidence
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{formatPercentage(vendor.average_markup)}</div>
                            <div className="text-xs text-muted-foreground">Avg Markup</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {vendor.reasons.map((reason, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                        {vendor.concerns.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {vendor.concerns.map((concern, idx) => (
                              <Badge key={idx} variant="destructive" className="text-xs">
                                {concern}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  No vendor recommendations available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
