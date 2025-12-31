/**
 * Resource Histogram Component
 *
 * Displays resource utilization as a bar chart below the Gantt chart.
 * Shows labor and equipment allocation per day with over-allocation warnings.
 */

import { useMemo } from 'react'
import { format, parseISO, isWeekend } from 'date-fns'
import { cn } from '@/lib/utils'
import { AlertTriangle, Users, Wrench } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ResourceAnalysis, DailyResourceSummary, ResourceConflict } from '../hooks/useResourceConflicts'

interface ResourceHistogramProps {
  resourceAnalysis: ResourceAnalysis
  /** Width of each day column (matches Gantt chart zoom) */
  columnWidth: number
  /** Height of the histogram area */
  height?: number
  /** Maximum capacity line to show */
  laborCapacity?: number
  equipmentCapacity?: number
  /** Show equipment bars alongside labor */
  showEquipment?: boolean
  /** Show weekend shading */
  showWeekends?: boolean
  /** Callback when clicking on a conflict */
  onConflictClick?: (conflict: ResourceConflict) => void
}

export function ResourceHistogram({
  resourceAnalysis,
  columnWidth,
  height = 120,
  laborCapacity = 8,
  equipmentCapacity = 4,
  showEquipment = true,
  showWeekends = true,
  onConflictClick,
}: ResourceHistogramProps) {
  const { dailySummaries, conflicts, peakUtilization, overallUtilization } = resourceAnalysis

  // Calculate max value for scaling
  const maxLabor = useMemo(() => {
    if (dailySummaries.length === 0) return laborCapacity
    return Math.max(
      laborCapacity,
      ...dailySummaries.map(d => d.totalLabor)
    )
  }, [dailySummaries, laborCapacity])

  const maxEquipment = useMemo(() => {
    if (dailySummaries.length === 0) return equipmentCapacity
    return Math.max(
      equipmentCapacity,
      ...dailySummaries.map(d => d.totalEquipment)
    )
  }, [dailySummaries, equipmentCapacity])

  // Calculate bar heights
  const chartPadding = 20 // top padding for labels
  const barAreaHeight = height - chartPadding

  const getBarHeight = (value: number, maxValue: number) => {
    if (maxValue === 0) return 0
    return (value / maxValue) * barAreaHeight
  }

  const getCapacityLineY = (capacity: number, maxValue: number) => {
    if (maxValue === 0) return barAreaHeight
    return chartPadding + barAreaHeight - (capacity / maxValue) * barAreaHeight
  }

  // Check if a day has conflicts
  const getDayConflicts = (date: string): ResourceConflict[] => {
    return conflicts.filter(c => c.date === date)
  }

  if (dailySummaries.length === 0) {
    return (
      <div className="flex items-center justify-center p-4 text-muted text-sm">
        No resource data available
      </div>
    )
  }

  const totalWidth = dailySummaries.length * columnWidth

  return (
    <TooltipProvider>
      <div className="border-t bg-card">
        {/* Header with stats */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Resource Histogram
            </h3>
            {conflicts.length > 0 && (
              <div className="flex items-center gap-1 text-warning text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>{conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded" />
              <span>Labor</span>
            </div>
            {showEquipment && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-violet-500 rounded" />
                <span>Equipment</span>
              </div>
            )}
            <div className="border-l pl-4">
              <span>Utilization: {overallUtilization}%</span>
            </div>
            {peakUtilization.date && (
              <div>
                <span>Peak: {peakUtilization.value} on {format(parseISO(peakUtilization.date), 'MMM d')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart area */}
        <div className="overflow-x-auto">
          <svg
            width={totalWidth}
            height={height}
            className="block"
          >
            {/* Weekend shading */}
            {showWeekends && dailySummaries.map((day, index) => {
              const date = parseISO(day.date)
              if (!isWeekend(date)) return null
              return (
                <rect
                  key={`weekend-${index}`}
                  x={index * columnWidth}
                  y={0}
                  width={columnWidth}
                  height={height}
                  fill="rgb(var(--muted) / 0.3)"
                />
              )
            })}

            {/* Capacity lines */}
            <line
              x1={0}
              y1={getCapacityLineY(laborCapacity, maxLabor)}
              x2={totalWidth}
              y2={getCapacityLineY(laborCapacity, maxLabor)}
              stroke="rgb(var(--primary))"
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.5}
            />
            {showEquipment && (
              <line
                x1={0}
                y1={getCapacityLineY(equipmentCapacity, maxEquipment)}
                x2={totalWidth}
                y2={getCapacityLineY(equipmentCapacity, maxEquipment)}
                stroke="#8b5cf6"
                strokeWidth={1}
                strokeDasharray="4,4"
                opacity={0.5}
              />
            )}

            {/* Grid lines */}
            {dailySummaries.map((_, index) => (
              <line
                key={`grid-${index}`}
                x1={index * columnWidth}
                y1={chartPadding}
                x2={index * columnWidth}
                y2={height}
                stroke="rgb(var(--border))"
                strokeWidth={0.5}
              />
            ))}

            {/* Labor bars */}
            {dailySummaries.map((day, index) => {
              const dayConflicts = getDayConflicts(day.date)
              const hasConflict = dayConflicts.length > 0
              const barHeight = getBarHeight(day.totalLabor, maxLabor)
              const barWidth = showEquipment ? (columnWidth - 4) / 2 : columnWidth - 4
              const x = index * columnWidth + 2

              return (
                <Tooltip key={`labor-${index}`}>
                  <TooltipTrigger asChild>
                    <g
                      className="cursor-pointer"
                      onClick={() => {
                        if (hasConflict && onConflictClick) {
                          onConflictClick(dayConflicts[0])
                        }
                      }}
                    >
                      <rect
                        x={x}
                        y={height - barHeight}
                        width={barWidth}
                        height={barHeight}
                        rx={2}
                        className={cn(
                          'transition-colors',
                          hasConflict
                            ? 'fill-destructive'
                            : day.totalLabor > laborCapacity * 0.8
                              ? 'fill-warning'
                              : 'fill-primary'
                        )}
                        opacity={0.8}
                      />
                      {/* Over-allocation indicator */}
                      {hasConflict && (
                        <g transform={`translate(${x + barWidth / 2 - 6}, ${height - barHeight - 16})`}>
                          <circle cx={6} cy={6} r={8} fill="rgb(var(--destructive))" />
                          <text
                            x={6}
                            y={10}
                            textAnchor="middle"
                            className="text-[10px] fill-white font-bold"
                          >
                            !
                          </text>
                        </g>
                      )}
                    </g>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p className="font-medium">{format(parseISO(day.date), 'EEE, MMM d')}</p>
                      <p className="text-muted">
                        Labor: {day.totalLabor} / {laborCapacity}
                      </p>
                      {hasConflict && (
                        <p className="text-destructive font-medium">
                          {dayConflicts.length} resource conflict{dayConflicts.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )
            })}

            {/* Equipment bars (if enabled) */}
            {showEquipment && dailySummaries.map((day, index) => {
              const barHeight = getBarHeight(day.totalEquipment, maxEquipment)
              const barWidth = (columnWidth - 4) / 2
              const x = index * columnWidth + 2 + barWidth + 1

              return (
                <Tooltip key={`equipment-${index}`}>
                  <TooltipTrigger asChild>
                    <rect
                      x={x}
                      y={height - barHeight}
                      width={barWidth}
                      height={barHeight}
                      rx={2}
                      className={cn(
                        'transition-colors',
                        day.totalEquipment > equipmentCapacity
                          ? 'fill-destructive'
                          : day.totalEquipment > equipmentCapacity * 0.8
                            ? 'fill-warning'
                            : 'fill-violet-500'
                      )}
                      opacity={0.8}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p className="font-medium">{format(parseISO(day.date), 'EEE, MMM d')}</p>
                      <p className="text-muted">
                        Equipment: {day.totalEquipment} / {equipmentCapacity}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )
            })}

            {/* Date labels (show every nth based on column width) */}
            {dailySummaries.map((day, index) => {
              // Show label every 7 days for narrow columns, every day for wide columns
              const showLabel = columnWidth >= 40 || index % 7 === 0
              if (!showLabel) return null

              return (
                <text
                  key={`label-${index}`}
                  x={index * columnWidth + columnWidth / 2}
                  y={12}
                  textAnchor="middle"
                  className="text-[9px] fill-muted select-none"
                >
                  {format(parseISO(day.date), columnWidth >= 60 ? 'MMM d' : 'd')}
                </text>
              )
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between px-4 py-1 border-t text-xs text-muted bg-muted/30">
          <div className="flex items-center gap-4">
            <span>Capacity: {laborCapacity} hrs/day (labor)</span>
            {showEquipment && (
              <span>{equipmentCapacity} units (equipment)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-primary rounded" />
              <span>Normal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-warning rounded" />
              <span>&gt;80%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-destructive rounded" />
              <span>Conflict</span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default ResourceHistogram
