/**
 * Vendor Performance Card Component
 * Displays individual vendor performance metrics and historical data
 */

import React from 'react'
import { Building2, Award, TrendingUp, Star, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { VendorRecommendation } from '@/types/historical-bid-analysis'
import { formatPercentage, formatCurrency, getReliabilityConfig } from '@/types/historical-bid-analysis'

interface VendorPerformanceCardProps {
  vendor: VendorRecommendation
  onClick?: () => void
}

export function VendorPerformanceCard({ vendor, onClick }: VendorPerformanceCardProps) {
  const reliabilityConfig = getReliabilityConfig(vendor.reliability_level)

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-lg">{vendor.vendor_name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={`text-${reliabilityConfig?.color}-700 bg-${reliabilityConfig?.color}-50 border-${reliabilityConfig?.color}-200`}>
                    {reliabilityConfig?.label} Reliability
                  </Badge>
                  {vendor.recent_activity && (
                    <Badge variant="secondary" className="text-xs">
                      Active
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{vendor.score.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Overall Score</div>
            </div>
          </div>

          {/* Win Rate Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Win Rate</span>
              <span className="font-medium">{formatPercentage(vendor.win_rate)}</span>
            </div>
            <Progress value={vendor.win_rate} className="h-2" />
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-4 pt-2 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold">{formatPercentage(vendor.average_markup)}</div>
              <div className="text-xs text-muted-foreground">Avg Markup</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{formatPercentage(vendor.completion_rate)}</div>
              <div className="text-xs text-muted-foreground">Completion</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{vendor.similar_projects}</div>
              <div className="text-xs text-muted-foreground">Similar Projects</div>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Win Rate Score</span>
              <span className="font-medium">{vendor.score_breakdown.win_rate_score.toFixed(1)}/25</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Pricing Score</span>
              <span className="font-medium">{vendor.score_breakdown.pricing_score.toFixed(1)}/25</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Reliability Score</span>
              <span className="font-medium">{vendor.score_breakdown.reliability_score.toFixed(1)}/25</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Experience Score</span>
              <span className="font-medium">{vendor.score_breakdown.experience_score.toFixed(1)}/25</span>
            </div>
          </div>

          {/* Strengths */}
          {vendor.reasons.length > 0 && (
            <div className="space-y-1 pt-2 border-t">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Strengths
              </div>
              <div className="flex flex-wrap gap-1">
                {vendor.reasons.slice(0, 3).map((reason, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {reason}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Quality Score */}
          {vendor.quality_score !== null && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm">
                Quality Score: <span className="font-semibold">{vendor.quality_score.toFixed(1)}/100</span>
              </span>
            </div>
          )}

          {/* Confidence Badge */}
          <div className="flex items-center justify-center pt-2">
            <Badge
              variant={
                vendor.confidence === 'high' ? 'default' :
                vendor.confidence === 'medium' ? 'secondary' : 'outline'
              }
            >
              {vendor.confidence.toUpperCase()} CONFIDENCE RECOMMENDATION
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
