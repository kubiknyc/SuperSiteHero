// File: src/features/safety/components/OSHA300Log.tsx
// OSHA 300 Log - Form 300 compliant injury/illness log

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type {
  OSHA300LogEntry,
  OSHA300ASummary,
  OSHAInjuryIllnessType,
  IncidentSeverity,
} from '@/types/safety-incidents'
import {
  OSHA_INJURY_ILLNESS_TYPES,
  SEVERITY_CONFIG,
  getOSHAInjuryIllnessTypeLabel,
  calculateOSHAIncidentRate,
  calculateDARTRate,
} from '@/types/safety-incidents'

// =============================================
// Types
// =============================================

interface OSHA300LogProps {
  entries: OSHA300LogEntry[]
  summary?: OSHA300ASummary | null
  hoursWorked?: number
  averageEmployees?: number
  year?: number
  onYearChange?: (year: number) => void
  onEntryClick?: (entry: OSHA300LogEntry) => void
  onExport?: () => void
  establishmentName?: string
  className?: string
}

// =============================================
// Helper Components
// =============================================

/**
 * Checkbox indicator for OSHA 300 log columns
 */
function CheckMark({ checked }: { checked: boolean }) {
  if (!checked) {return <span className="text-gray-300">-</span>}
  return <span className="text-success font-bold">X</span>
}

/**
 * Injury/Illness type indicator badge
 */
function TypeBadge({ type }: { type: OSHAInjuryIllnessType | null }) {
  if (!type) {return <span className="text-disabled">-</span>}

  const config = OSHA_INJURY_ILLNESS_TYPES.find((t) => t.value === type)

  const colorClasses: Record<OSHAInjuryIllnessType, string> = {
    injury: 'bg-error-light text-red-800',
    skin_disorder: 'bg-orange-100 text-orange-800',
    respiratory: 'bg-info-light text-blue-800',
    poisoning: 'bg-purple-100 text-purple-800',
    hearing_loss: 'bg-warning-light text-yellow-800',
    other_illness: 'bg-muted text-foreground',
  }

  return (
    <Badge variant="outline" className={cn('text-xs', colorClasses[type])}>
      {config?.column}: {config?.label || type}
    </Badge>
  )
}

/**
 * Severity indicator
 */
function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const config = SEVERITY_CONFIG[severity]
  const colorClasses: Record<string, string> = {
    green: 'bg-success-light text-green-800',
    yellow: 'bg-warning-light text-yellow-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-error-light text-red-800',
    purple: 'bg-purple-100 text-purple-800',
  }

  return (
    <Badge variant="outline" className={cn('text-xs', colorClasses[config.color])}>
      {config.label}
    </Badge>
  )
}

// =============================================
// OSHA 300A Summary Card
// =============================================

interface SummaryCardProps {
  summary: OSHA300ASummary
  hoursWorked?: number
  averageEmployees?: number
}

function OSHA300ASummaryCard({ summary, hoursWorked = 0, averageEmployees = 0 }: SummaryCardProps) {
  const totalRecordable = summary.total_recordable_cases
  const dartCases = summary.total_days_away_cases + summary.total_job_transfer_cases

  const incidentRate = calculateOSHAIncidentRate(totalRecordable, hoursWorked)
  const dartRate = calculateDARTRate(dartCases, hoursWorked)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          OSHA 300A Summary - {summary.year}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Case Classification */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted uppercase">Case Classification</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-secondary">Deaths:</span>
                <span className="ml-2 font-bold">{summary.total_deaths}</span>
              </div>
              <div>
                <span className="text-secondary">Days Away:</span>
                <span className="ml-2 font-bold">{summary.total_days_away_cases}</span>
              </div>
              <div>
                <span className="text-secondary">Job Transfer:</span>
                <span className="ml-2 font-bold">{summary.total_job_transfer_cases}</span>
              </div>
              <div>
                <span className="text-secondary">Other:</span>
                <span className="ml-2 font-bold">{summary.total_other_recordable_cases}</span>
              </div>
            </div>
          </div>

          {/* Injury/Illness Types */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted uppercase">By Type</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-secondary">(G) Injury:</span>
                <span className="ml-2 font-bold">{summary.total_injuries}</span>
              </div>
              <div>
                <span className="text-secondary">(H) Skin:</span>
                <span className="ml-2 font-bold">{summary.total_skin_disorders}</span>
              </div>
              <div>
                <span className="text-secondary">(I) Resp:</span>
                <span className="ml-2 font-bold">{summary.total_respiratory_conditions}</span>
              </div>
              <div>
                <span className="text-secondary">(J) Poison:</span>
                <span className="ml-2 font-bold">{summary.total_poisonings}</span>
              </div>
              <div>
                <span className="text-secondary">(K) Hearing:</span>
                <span className="ml-2 font-bold">{summary.total_hearing_losses}</span>
              </div>
              <div>
                <span className="text-secondary">(L) Other:</span>
                <span className="ml-2 font-bold">{summary.total_other_illnesses}</span>
              </div>
            </div>
          </div>

          {/* Days Lost */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted uppercase">Days</p>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-secondary">Days Away:</span>
                <span className="ml-2 font-bold text-error">{summary.total_days_away}</span>
              </div>
              <div>
                <span className="text-secondary">Days Restricted:</span>
                <span className="ml-2 font-bold text-orange-600">{summary.total_days_transfer}</span>
              </div>
            </div>
          </div>

          {/* Rates */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted uppercase">Rates (per 100 FTE)</p>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-secondary">TRIR:</span>
                <span className="ml-2 font-bold">{incidentRate}</span>
              </div>
              <div>
                <span className="text-secondary">DART:</span>
                <span className="ml-2 font-bold">{dartRate}</span>
              </div>
              <div>
                <span className="text-secondary">Total Recordable:</span>
                <span className="ml-2 font-bold text-primary">{totalRecordable}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Establishment Info */}
        {hoursWorked > 0 && (
          <div className="mt-4 pt-4 border-t text-xs text-muted">
            <span className="mr-4">Hours Worked: {hoursWorked.toLocaleString()}</span>
            {averageEmployees > 0 && (
              <span>Average Employees: {averageEmployees}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// =============================================
// Main Component
// =============================================

/**
 * OSHA 300 Log Component
 *
 * Displays recordable injuries and illnesses in OSHA Form 300 format.
 *
 * Features:
 * - Full OSHA 300 log table with all required columns
 * - 300A annual summary card
 * - TRIR and DART rate calculations
 * - Filtering by year and injury type
 * - Export capability
 *
 * @example
 * ```tsx
 * <OSHA300Log
 *   entries={oshaLogEntries}
 *   summary={annualSummary}
 *   hoursWorked={250000}
 *   averageEmployees={125}
 *   year={2024}
 *   onYearChange={(year) => setSelectedYear(year)}
 *   onExport={() => exportToExcel()}
 * />
 * ```
 */
export function OSHA300Log({
  entries,
  summary,
  hoursWorked = 0,
  averageEmployees = 0,
  year = new Date().getFullYear(),
  onYearChange,
  onEntryClick,
  onExport,
  establishmentName,
  className,
}: OSHA300LogProps) {
  const [typeFilter, setTypeFilter] = React.useState<string>('all')
  const [search, setSearch] = React.useState('')

  // Generate year options (last 5 years)
  const yearOptions = React.useMemo(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => currentYear - i)
  }, [])

  // Filter entries
  const filteredEntries = React.useMemo(() => {
    return entries.filter((entry) => {
      // Type filter
      if (typeFilter !== 'all' && entry.injury_illness_type !== typeFilter) {
        return false
      }

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        if (
          !(entry.employee_name?.toLowerCase().includes(searchLower) ||
            entry.description.toLowerCase().includes(searchLower) ||
            entry.case_number?.toLowerCase().includes(searchLower) ||
            entry.location?.toLowerCase().includes(searchLower))
        ) {
          return false
        }
      }

      return true
    })
  }, [entries, typeFilter, search])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold heading-section">OSHA Form 300 - Log of Work-Related Injuries and Illnesses</h2>
          {establishmentName && (
            <p className="text-sm text-muted">Establishment: {establishmentName}</p>
          )}
          <p className="text-sm text-muted">
            {filteredEntries.length} recordable case{filteredEntries.length !== 1 ? 's' : ''} for {year}
          </p>
        </div>
        <div className="flex gap-2">
          {onExport && (
            <Button variant="outline" onClick={onExport} size="sm">
              Export to Excel
            </Button>
          )}
        </div>
      </div>

      {/* 300A Summary */}
      {summary && (
        <OSHA300ASummaryCard
          summary={summary}
          hoursWorked={hoursWorked}
          averageEmployees={averageEmployees}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={year.toString()} onValueChange={(v) => onYearChange?.(parseInt(v))}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {OSHA_INJURY_ILLNESS_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                ({t.column}) {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Search cases..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
      </div>

      {/* Column Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-secondary bg-surface p-3 rounded">
        <span className="font-medium">Columns:</span>
        <span>(A) Case No.</span>
        <span>(B) Employee Name</span>
        <span>(C) Job Title</span>
        <span>(D) Date</span>
        <span>(E) Location</span>
        <span>(F) Description</span>
        <span>(G-L) Type</span>
        <span>(M) Death</span>
        <span>(N) Days Away</span>
        <span>(O) Job Transfer</span>
        <span>(P) Other Recordable</span>
      </div>

      {/* OSHA 300 Log Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface border-b">
              <tr>
                <th className="px-2 py-2 text-left font-medium text-xs">(A) Case No.</th>
                <th className="px-2 py-2 text-left font-medium text-xs min-w-[120px]">(B) Name</th>
                <th className="px-2 py-2 text-left font-medium text-xs">(C) Title</th>
                <th className="px-2 py-2 text-left font-medium text-xs">(D) Date</th>
                <th className="px-2 py-2 text-left font-medium text-xs">(E) Location</th>
                <th className="px-2 py-2 text-left font-medium text-xs min-w-[150px]">(F) Description</th>
                <th className="px-2 py-2 text-center font-medium text-xs">(G-L) Type</th>
                <th className="px-2 py-2 text-center font-medium text-xs" title="Death">(M)</th>
                <th className="px-2 py-2 text-center font-medium text-xs" title="Days Away">(N)</th>
                <th className="px-2 py-2 text-center font-medium text-xs" title="Job Transfer/Restriction">(O)</th>
                <th className="px-2 py-2 text-center font-medium text-xs" title="Other Recordable">(P)</th>
                <th className="px-2 py-2 text-center font-medium text-xs">Days Away</th>
                <th className="px-2 py-2 text-center font-medium text-xs">Days Restr.</th>
                <th className="px-2 py-2 text-left font-medium text-xs">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className={cn(
                    'hover:bg-surface',
                    onEntryClick && 'cursor-pointer',
                    entry.death && 'bg-error-light'
                  )}
                  onClick={() => onEntryClick?.(entry)}
                >
                  <td className="px-2 py-2 font-mono text-xs">
                    {entry.case_number || '-'}
                  </td>
                  <td className="px-2 py-2 text-xs">
                    {entry.employee_name || 'Privacy Protected'}
                  </td>
                  <td className="px-2 py-2 text-xs">
                    {entry.job_title || '-'}
                  </td>
                  <td className="px-2 py-2 text-xs whitespace-nowrap">
                    {new Date(entry.incident_date).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-2 text-xs">
                    {entry.location || '-'}
                  </td>
                  <td className="px-2 py-2 text-xs">
                    <div className="line-clamp-2">{entry.description}</div>
                    {entry.body_part && (
                      <div className="text-muted">Body: {entry.body_part}</div>
                    )}
                    {entry.object_substance && (
                      <div className="text-muted">Object: {entry.object_substance}</div>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <TypeBadge type={entry.injury_illness_type} />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <CheckMark checked={entry.death} />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <CheckMark checked={entry.days_away_from_work} />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <CheckMark checked={entry.job_transfer_restriction} />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <CheckMark checked={entry.other_recordable} />
                  </td>
                  <td className="px-2 py-2 text-center font-mono">
                    {entry.days_away_count > 0 ? entry.days_away_count : '-'}
                  </td>
                  <td className="px-2 py-2 text-center font-mono">
                    {entry.days_transfer_restriction > 0 ? entry.days_transfer_restriction : '-'}
                  </td>
                  <td className="px-2 py-2">
                    <SeverityBadge severity={entry.severity} />
                  </td>
                </tr>
              ))}
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-3 py-8 text-center text-muted">
                    No recordable cases found for {year}
                  </td>
                </tr>
              )}
            </tbody>
            {/* Totals Row */}
            {filteredEntries.length > 0 && (
              <tfoot className="bg-muted border-t-2">
                <tr className="font-medium">
                  <td colSpan={7} className="px-2 py-2 text-right text-sm">
                    Page Totals:
                  </td>
                  <td className="px-2 py-2 text-center">
                    {filteredEntries.filter((e) => e.death).length}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {filteredEntries.filter((e) => e.days_away_from_work).length}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {filteredEntries.filter((e) => e.job_transfer_restriction).length}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {filteredEntries.filter((e) => e.other_recordable).length}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {filteredEntries.reduce((sum, e) => sum + e.days_away_count, 0)}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {filteredEntries.reduce((sum, e) => sum + e.days_transfer_restriction, 0)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* OSHA 300 Form Instructions */}
      <div className="text-xs text-muted space-y-1 border-t pt-4">
        <p className="font-medium">OSHA Form 300 Column Instructions:</p>
        <p>(M) Death - Check if employee died</p>
        <p>(N) Days away from work - Check if employee had days away from work</p>
        <p>(O) Job transfer or restriction - Check if employee was transferred or had restrictions</p>
        <p>(P) Other recordable cases - Check if none of the above apply but case is still recordable</p>
        <p className="mt-2">
          <span className="font-medium">Injury/Illness Types: </span>
          (G) Injury, (H) Skin disorder, (I) Respiratory condition, (J) Poisoning, (K) Hearing loss, (L) All other illnesses
        </p>
      </div>
    </div>
  )
}

export default OSHA300Log
