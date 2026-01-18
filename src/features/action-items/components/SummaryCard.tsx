/**
 * Summary Card Component
 * Displays action item metrics with colored icons
 */

import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface SummaryCardProps {
  title: string
  value: number | string
  subtitle: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'red' | 'orange'
  highlight?: boolean
}

export const SummaryCard = memo(function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  color,
  highlight = false,
}: SummaryCardProps) {
  const colorClasses = {
    blue: 'text-primary bg-blue-50',
    green: 'text-success bg-success-light',
    red: 'text-error bg-error-light',
    orange: 'text-orange-600 bg-orange-50',
  }

  return (
    <Card className={cn(highlight && 'border-red-300 bg-error-light/50')}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className={cn('p-2 rounded-lg', colorClasses[color])}>
            {icon}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted">{title}</p>
          <p className="text-xs text-disabled mt-1">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  )
})

export default SummaryCard
