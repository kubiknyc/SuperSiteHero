/**
 * Data Source Selector Component
 *
 * Allows users to select which data source to build a report from.
 */

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  HelpCircle,
  FileCheck,
  Calendar,
  RefreshCw,
  DollarSign,
  AlertTriangle,
  ClipboardCheck,
  CheckSquare,
  CheckCircle,
  Users,
  File,
  Truck,
  Shield,
  FileText,
  MessageSquare,
} from 'lucide-react'
import type { ReportDataSource } from '@/types/report-builder'
import { DATA_SOURCE_CONFIG } from '@/types/report-builder'

// Map icon names to components
const iconMap: Record<string, React.ElementType> = {
  HelpCircle,
  FileCheck,
  Calendar,
  RefreshCw,
  DollarSign,
  AlertTriangle,
  ClipboardCheck,
  CheckSquare,
  CheckCircle,
  Users,
  File,
  Truck,
  Shield,
  FileText,
  MessageSquare,
}

interface DataSourceSelectorProps {
  value: ReportDataSource | null
  onChange: (source: ReportDataSource) => void
  className?: string
}

export function DataSourceSelector({ value, onChange, className }: DataSourceSelectorProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h3 className="text-lg font-medium text-foreground" className="heading-subsection">Select Data Source</h3>
        <p className="text-sm text-muted mt-1">
          Choose which type of data you want to include in your report
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {DATA_SOURCE_CONFIG.map((source) => {
          const Icon = iconMap[source.icon] || File
          const isSelected = value === source.value

          return (
            <Card
              key={source.value}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                isSelected
                  ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200'
                  : 'hover:border-input'
              )}
              onClick={() => onChange(source.value)}
            >
              <CardContent className="p-4 text-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2',
                    isSelected ? 'bg-info-light' : 'bg-muted'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5',
                      isSelected ? 'text-primary' : 'text-secondary'
                    )}
                  />
                </div>
                <p
                  className={cn(
                    'text-sm font-medium',
                    isSelected ? 'text-blue-900' : 'text-foreground'
                  )}
                >
                  {source.label}
                </p>
                <p className="text-xs text-muted mt-1 line-clamp-1">
                  {source.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Compact data source badge for display
 */
export function DataSourceBadge({ source }: { source: ReportDataSource }) {
  const config = DATA_SOURCE_CONFIG.find((c) => c.value === source)
  const Icon = config ? iconMap[config.icon] || File : File

  const colorClasses: Record<string, string> = {
    blue: 'bg-info-light text-blue-800',
    green: 'bg-success-light text-green-800',
    orange: 'bg-orange-100 text-orange-800',
    purple: 'bg-purple-100 text-purple-800',
    emerald: 'bg-emerald-100 text-emerald-800',
    red: 'bg-error-light text-red-800',
    cyan: 'bg-cyan-100 text-cyan-800',
    yellow: 'bg-warning-light text-yellow-800',
    indigo: 'bg-indigo-100 text-indigo-800',
    slate: 'bg-slate-100 text-slate-800',
    gray: 'bg-muted text-foreground',
    amber: 'bg-amber-100 text-amber-800',
    teal: 'bg-teal-100 text-teal-800',
    sky: 'bg-sky-100 text-sky-800',
    rose: 'bg-rose-100 text-rose-800',
  }

  return (
    <Badge
      variant="outline"
      className={cn('text-xs', colorClasses[config?.color || 'gray'])}
    >
      <Icon className="h-3 w-3 mr-1" />
      {config?.label || source}
    </Badge>
  )
}

export default DataSourceSelector
