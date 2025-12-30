/**
 * Look-Ahead Print View Component
 *
 * Print-friendly 4-week look-ahead schedule.
 * Optimized for letter/A4 landscape printing with clean formatting.
 */

import { useMemo } from 'react'
import { format } from 'date-fns'
import { ACTIVITY_STATUS_CONFIG, type LookAheadActivityWithDetails, type PPCMetrics } from '@/types/look-ahead'

// ============================================================================
// Types
// ============================================================================

interface LookAheadPrintViewProps {
  projectName: string
  activities: Record<1 | 2 | 3 | 4, LookAheadActivityWithDetails[]>
  weeks: Array<{
    weekNumber: 1 | 2 | 3 | 4
    startDate: string
    endDate: string
    label: string
  }>
  ppcMetrics?: PPCMetrics
  baseDate: Date
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDateRange(start: string, end: string): string {
  return `${format(new Date(start), 'MMM d')} - ${format(new Date(end), 'MMM d, yyyy')}`
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return '#22c55e'
    case 'in_progress': return '#3b82f6'
    case 'blocked': return '#ef4444'
    case 'at_risk': return '#f59e0b'
    default: return '#64748b'
  }
}

function getStatusLabel(status: string): string {
  return ACTIVITY_STATUS_CONFIG[status as keyof typeof ACTIVITY_STATUS_CONFIG]?.label || status
}

// ============================================================================
// Component
// ============================================================================

export function LookAheadPrintView({
  projectName,
  activities,
  weeks,
  ppcMetrics,
  baseDate,
}: LookAheadPrintViewProps) {
  // Calculate summary stats
  const stats = useMemo(() => {
    const allActivities = Object.values(activities).flat()
    return {
      total: allActivities.length,
      completed: allActivities.filter(a => a.status === 'completed').length,
      inProgress: allActivities.filter(a => a.status === 'in_progress').length,
      blocked: allActivities.filter(a => a.status === 'blocked').length,
      atRisk: allActivities.filter(a => a.status === 'delayed').length,
      planned: allActivities.filter(a => a.status === 'planned').length,
    }
  }, [activities])

  return (
    <div className="print-view">
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 0.5in;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .print-view {
            display: block !important;
          }
        }

        .print-view {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 9pt;
          color: #1f2937;
          padding: 0;
        }

        .print-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #1f4e79;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }

        .print-title {
          font-size: 16pt;
          font-weight: bold;
          color: #1f4e79;
          margin: 0;
        }

        .print-subtitle {
          font-size: 10pt;
          color: #6b7280;
          margin: 4px 0 0;
        }

        .print-meta {
          text-align: right;
          font-size: 8pt;
          color: #6b7280;
        }

        .print-stats {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 4px;
        }

        .print-stat {
          text-align: center;
        }

        .print-stat-value {
          font-size: 14pt;
          font-weight: bold;
          color: #1f4e79;
        }

        .print-stat-label {
          font-size: 7pt;
          color: #6b7280;
          text-transform: uppercase;
        }

        .print-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .print-week {
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          page-break-inside: avoid;
        }

        .print-week-header {
          background: #1f4e79;
          color: white;
          padding: 6px 8px;
          font-weight: 600;
          font-size: 9pt;
        }

        .print-week-dates {
          font-size: 7pt;
          font-weight: normal;
          opacity: 0.9;
        }

        .print-week-body {
          padding: 4px;
          min-height: 200px;
          max-height: 400px;
          overflow: hidden;
        }

        .print-activity {
          padding: 4px 6px;
          margin-bottom: 4px;
          border-radius: 3px;
          border-left: 3px solid;
          background: #f9fafb;
          page-break-inside: avoid;
        }

        .print-activity-name {
          font-weight: 600;
          font-size: 8pt;
          color: #1f2937;
          margin-bottom: 2px;
        }

        .print-activity-details {
          font-size: 7pt;
          color: #6b7280;
        }

        .print-activity-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 2px;
        }

        .print-activity-trade {
          font-size: 6pt;
          padding: 1px 4px;
          background: #e5e7eb;
          border-radius: 2px;
        }

        .print-activity-status {
          font-size: 6pt;
          padding: 1px 4px;
          border-radius: 2px;
          color: white;
        }

        .print-footer {
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          font-size: 7pt;
          color: #9ca3af;
        }

        .print-legend {
          display: flex;
          gap: 12px;
        }

        .print-legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .print-legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
      `}</style>

      {/* Header */}
      <div className="print-header">
        <div>
          <h1 className="print-title heading-page">4-Week Look-Ahead Schedule</h1>
          <p className="print-subtitle">{projectName}</p>
        </div>
        <div className="print-meta">
          <div>Generated: {format(new Date(), 'MMMM d, yyyy h:mm a')}</div>
          <div>Week Starting: {format(baseDate, 'MMMM d, yyyy')}</div>
          {ppcMetrics && (
            <div style={{ fontWeight: 'bold', color: '#1f4e79' }}>
              Current PPC: {ppcMetrics.currentWeekPPC.toFixed(0)}%
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="print-stats">
        <div className="print-stat">
          <div className="print-stat-value">{stats.total}</div>
          <div className="print-stat-label">Total Activities</div>
        </div>
        <div className="print-stat">
          <div className="print-stat-value" style={{ color: '#22c55e' }}>{stats.completed}</div>
          <div className="print-stat-label">Completed</div>
        </div>
        <div className="print-stat">
          <div className="print-stat-value" style={{ color: '#3b82f6' }}>{stats.inProgress}</div>
          <div className="print-stat-label">In Progress</div>
        </div>
        <div className="print-stat">
          <div className="print-stat-value" style={{ color: '#64748b' }}>{stats.planned}</div>
          <div className="print-stat-label">Planned</div>
        </div>
        <div className="print-stat">
          <div className="print-stat-value" style={{ color: '#ef4444' }}>{stats.blocked}</div>
          <div className="print-stat-label">Blocked</div>
        </div>
        <div className="print-stat">
          <div className="print-stat-value" style={{ color: '#f59e0b' }}>{stats.atRisk}</div>
          <div className="print-stat-label">At Risk</div>
        </div>
        {ppcMetrics && (
          <>
            <div className="print-stat" style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '16px' }}>
              <div className="print-stat-value">{ppcMetrics.currentWeekPPC.toFixed(0)}%</div>
              <div className="print-stat-label">PPC</div>
            </div>
            <div className="print-stat">
              <div className="print-stat-value">{ppcMetrics.averagePPC.toFixed(0)}%</div>
              <div className="print-stat-label">4-Week Avg</div>
            </div>
          </>
        )}
      </div>

      {/* Week Grid */}
      <div className="print-grid">
        {weeks.map((week) => {
          const weekActivities = activities[week.weekNumber] || []

          return (
            <div key={week.weekNumber} className="print-week">
              <div className="print-week-header">
                <div>Week {week.weekNumber}: {week.label}</div>
                <div className="print-week-dates">
                  {formatDateRange(week.startDate, week.endDate)}
                </div>
              </div>
              <div className="print-week-body">
                {weekActivities.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>
                    No activities scheduled
                  </div>
                ) : (
                  weekActivities.slice(0, 15).map((activity) => (
                    <div
                      key={activity.id}
                      className="print-activity"
                      style={{ borderLeftColor: getStatusColor(activity.status) }}
                    >
                      <div className="print-activity-name">{activity.activity_name}</div>
                      {activity.description && (
                        <div className="print-activity-details">
                          {activity.description.substring(0, 60)}
                          {activity.description.length > 60 && '...'}
                        </div>
                      )}
                      <div className="print-activity-meta">
                        {activity.trade && (
                          <span className="print-activity-trade">{activity.trade}</span>
                        )}
                        <span
                          className="print-activity-status"
                          style={{ backgroundColor: getStatusColor(activity.status) }}
                        >
                          {getStatusLabel(activity.status)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                {weekActivities.length > 15 && (
                  <div style={{ textAlign: 'center', padding: '4px', color: '#6b7280', fontSize: '7pt' }}>
                    + {weekActivities.length - 15} more activities
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="print-footer">
        <div className="print-legend">
          <span style={{ fontWeight: 600 }}>Legend:</span>
          <div className="print-legend-item">
            <div className="print-legend-dot" style={{ backgroundColor: '#22c55e' }} />
            <span>Completed</span>
          </div>
          <div className="print-legend-item">
            <div className="print-legend-dot" style={{ backgroundColor: '#3b82f6' }} />
            <span>In Progress</span>
          </div>
          <div className="print-legend-item">
            <div className="print-legend-dot" style={{ backgroundColor: '#64748b' }} />
            <span>Planned</span>
          </div>
          <div className="print-legend-item">
            <div className="print-legend-dot" style={{ backgroundColor: '#ef4444' }} />
            <span>Blocked</span>
          </div>
          <div className="print-legend-item">
            <div className="print-legend-dot" style={{ backgroundColor: '#f59e0b' }} />
            <span>At Risk</span>
          </div>
        </div>
        <div>
          SuperSiteHero | {projectName} | Page 1 of 1
        </div>
      </div>
    </div>
  )
}

export default LookAheadPrintView
