// File: src/features/gantt/components/GanttTimeline.tsx
// Timeline header component for Gantt chart

import { useMemo } from 'react'
import { format } from 'date-fns'
import type { GanttZoomLevel } from '@/types/schedule'
import { generateTimelineColumns } from '../utils/dateUtils'

interface GanttTimelineProps {
  startDate: Date
  endDate: Date
  zoomLevel: GanttZoomLevel
  sidebarWidth: number
  headerHeight: number
  scrollX: number
}

export function GanttTimeline({
  startDate,
  endDate,
  zoomLevel,
  sidebarWidth,
  headerHeight,
  scrollX,
}: GanttTimelineProps) {
  const columns = useMemo(
    () => generateTimelineColumns(startDate, endDate, zoomLevel),
    [startDate, endDate, zoomLevel]
  )

  // Group columns by month for secondary header row
  const monthGroups = useMemo(() => {
    if (zoomLevel === 'month' || zoomLevel === 'quarter') {return []}

    const groups: { month: string; year: string; width: number; offset: number }[] = []
    let currentMonth = ''
    let currentOffset = 0

    columns.forEach((col, _index) => {
      const monthYear = format(col.date, 'MMMM yyyy')

      if (monthYear !== currentMonth) {
        if (currentMonth) {
          // Update previous group width
          const lastGroup = groups[groups.length - 1]
          lastGroup.width = currentOffset - lastGroup.offset
        }
        groups.push({
          month: format(col.date, 'MMMM'),
          year: format(col.date, 'yyyy'),
          width: 0,
          offset: currentOffset,
        })
        currentMonth = monthYear
      }
      currentOffset += col.width
    })

    // Set width for last group
    if (groups.length > 0) {
      const lastGroup = groups[groups.length - 1]
      lastGroup.width = currentOffset - lastGroup.offset
    }

    return groups
  }, [columns, zoomLevel])

  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0)

  return (
    <div
      className="sticky top-0 z-20 bg-card border-b"
      style={{ height: headerHeight }}
    >
      <div className="flex">
        {/* Sidebar placeholder */}
        <div
          className="flex-shrink-0 bg-surface border-r border-b flex items-end px-4 py-2"
          style={{ width: sidebarWidth, height: headerHeight }}
        >
          <span className="text-sm font-semibold text-secondary">Task Name</span>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-hidden">
          <div
            className="relative"
            style={{
              width: totalWidth,
              height: headerHeight,
              transform: `translateX(-${scrollX}px)`,
            }}
          >
            {/* Month row (for day/week views) */}
            {monthGroups.length > 0 && (
              <div
                className="absolute top-0 left-0 right-0 flex border-b bg-muted"
                style={{ height: headerHeight / 2 }}
              >
                {monthGroups.map((group, index) => (
                  <div
                    key={`month-${index}`}
                    className="flex items-center justify-center text-sm font-semibold text-secondary border-r"
                    style={{
                      width: group.width,
                      minWidth: group.width,
                    }}
                  >
                    {group.month} {group.year}
                  </div>
                ))}
              </div>
            )}

            {/* Date/Week columns */}
            <div
              className="absolute left-0 right-0 flex"
              style={{
                top: monthGroups.length > 0 ? headerHeight / 2 : 0,
                height: monthGroups.length > 0 ? headerHeight / 2 : headerHeight,
              }}
            >
              {columns.map((column, index) => (
                <div
                  key={`col-${index}`}
                  className={`
                    flex flex-col items-center justify-center text-xs border-r
                    ${column.is_weekend ? 'bg-muted' : 'bg-card'}
                    ${column.is_today ? 'bg-orange-50 border-orange-300' : ''}
                  `}
                  style={{
                    width: column.width,
                    minWidth: column.width,
                  }}
                >
                  <span
                    className={`font-medium ${
                      column.is_today ? 'text-orange-600' : 'text-secondary'
                    }`}
                  >
                    {column.label}
                  </span>
                  {column.sub_label && (
                    <span
                      className={`text-[10px] ${
                        column.is_today ? 'text-orange-500' : 'text-muted'
                      }`}
                    >
                      {column.sub_label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
