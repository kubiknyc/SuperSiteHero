// File: /src/features/cost-estimates/components/EstimateSummaryCard.tsx
// Card displaying cost estimate summary and totals

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from '@/components/ui'
import { Calculator, DollarSign, TrendingUp } from 'lucide-react'
import type { CostEstimate } from '@/types/database-extensions'

interface EstimateSummaryCardProps {
  estimate: CostEstimate
}

export function EstimateSummaryCard({ estimate }: EstimateSummaryCardProps) {
  const formatCurrency = (value: number | string | null | undefined) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (numValue === null || numValue === undefined || isNaN(numValue)) {return '$0.00'}
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue)
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500'
      case 'invoiced':
        return 'bg-blue-500'
      case 'archived':
        return 'bg-gray-500'
      case 'draft':
      default:
        return 'bg-yellow-500'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Cost Summary</CardTitle>
          <Badge className={getStatusColor(estimate.status)}>
            {estimate.status || 'draft'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cost Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Calculator className="h-4 w-4" />
              <span>Material Cost</span>
            </div>
            <span className="font-semibold">
              {formatCurrency(estimate.total_material_cost)}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Calculator className="h-4 w-4" />
              <span>Labor Cost</span>
            </div>
            <span className="font-semibold">
              {formatCurrency(estimate.total_labor_cost)}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Subtotal</span>
            </div>
            <span className="font-semibold">
              {formatCurrency(estimate.subtotal)}
            </span>
          </div>

          {estimate.markup_percentage && Number(estimate.markup_percentage) > 0 && (
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>
                  Markup ({Number(estimate.markup_percentage).toFixed(2)}%)
                </span>
              </div>
              <span className="font-semibold">
                {formatCurrency(estimate.markup_amount)}
              </span>
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between py-3 bg-muted rounded-lg px-3">
            <span className="text-base font-bold">Total Cost</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(estimate.total_cost)}
            </span>
          </div>
        </div>

        {/* Configuration */}
        <div className="pt-4 space-y-2 border-t">
          <h4 className="text-sm font-semibold text-muted-foreground">Configuration</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Labor Rate:</span>
              <p className="font-medium">
                {formatCurrency(estimate.labor_rate)}/hour
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Markup:</span>
              <p className="font-medium">
                {Number(estimate.markup_percentage || 0).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
