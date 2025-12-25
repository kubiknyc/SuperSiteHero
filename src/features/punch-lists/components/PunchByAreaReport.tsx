/**
 * Punch by Area Summary Report Component
 *
 * Displays punch items grouped by location/area with statistics,
 * filtering, and export capabilities.
 */

import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import ExcelJS from 'exceljs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  Building2,
  Layers,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader2,
  BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import { usePunchByArea, type AreaSummary, type PunchByAreaFilters } from '../hooks/usePunchByArea'
import { PRIORITY_COLORS, type PriorityLevel } from '../utils/priorityScoring'
import type { PunchItemStatus } from '@/types/database'
import { cn } from '@/lib/utils'
import { useProject } from '@/features/projects/hooks/useProjects'

// ============================================================================
// Types
// ============================================================================

interface PunchByAreaReportProps {
  projectId?: string
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_OPTIONS: { value: PunchItemStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ready_for_review', label: 'Ready for Review' },
  { value: 'completed', label: 'Completed' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
]

const PRIORITY_OPTIONS: { value: PriorityLevel; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

// ============================================================================
// Sub-Components
// ============================================================================

interface AreaRowProps {
  area: AreaSummary
  onViewDetails: (area: AreaSummary) => void
}

function AreaRow({ area, onViewDetails }: AreaRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const completionRate = area.total > 0
    ? Math.round(((area.completed + area.verified) / area.total) * 100)
    : 0

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="border rounded-lg p-4 mb-2 hover:bg-surface transition-colors">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-disabled" />
              ) : (
                <ChevronRight className="h-4 w-4 text-disabled" />
              )}
              <MapPin className="h-4 w-4 text-primary" />
              <div className="text-left">
                <p className="font-medium text-foreground">{area.fullLocation}</p>
                <p className="text-sm text-muted">
                  {area.total} item{area.total !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Status Badges */}
              <div className="hidden md:flex items-center gap-2">
                {area.open > 0 && (
                  <Badge variant="outline" className="bg-blue-50 text-primary-hover border-blue-200">
                    {area.open} Open
                  </Badge>
                )}
                {area.inProgress > 0 && (
                  <Badge variant="outline" className="bg-warning-light text-yellow-700 border-yellow-200">
                    {area.inProgress} In Progress
                  </Badge>
                )}
                {area.overdue > 0 && (
                  <Badge variant="outline" className="bg-error-light text-error-dark border-red-200">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {area.overdue} Overdue
                  </Badge>
                )}
              </div>

              {/* Priority Score */}
              <div className="text-right min-w-[80px]">
                <p className="text-sm font-medium text-secondary">
                  Priority: {area.averagePriorityScore}
                </p>
                <div className="w-full h-1.5 bg-muted rounded-full mt-1">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      area.averagePriorityScore >= 75
                        ? 'bg-red-500'
                        : area.averagePriorityScore >= 55
                        ? 'bg-orange-500'
                        : area.averagePriorityScore >= 35
                        ? 'bg-warning'
                        : 'bg-green-500'
                    )}
                    style={{ width: `${area.averagePriorityScore}%` }}
                  />
                </div>
              </div>

              {/* Completion Rate */}
              <div className="text-right min-w-[100px]">
                <p className="text-sm font-medium text-secondary">{completionRate}% Complete</p>
                <Progress value={completionRate} className="h-1.5 mt-1" />
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary-hover">{area.open}</p>
                <p className="text-sm text-primary">Open</p>
              </div>
              <div className="bg-warning-light rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-700">{area.inProgress}</p>
                <p className="text-sm text-warning">In Progress</p>
              </div>
              <div className="bg-success-light rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-success-dark">
                  {area.completed + area.verified}
                </p>
                <p className="text-sm text-success">Completed</p>
              </div>
              <div className="bg-error-light rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-error-dark">{area.overdue}</p>
                <p className="text-sm text-error">Overdue</p>
              </div>
            </div>

            {/* Priority Distribution */}
            <div className="mb-4">
              <p className="text-sm font-medium text-secondary mb-2">Priority Distribution</p>
              <div className="flex gap-2">
                {PRIORITY_OPTIONS.map(({ value, label }) => (
                  <Badge
                    key={value}
                    className={cn(
                      'text-xs',
                      PRIORITY_COLORS[value].bgColor,
                      PRIORITY_COLORS[value].color
                    )}
                  >
                    {area.priorityDistribution[value]} {label}
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewDetails(area)}
            >
              View All Items
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function PunchByAreaReport({ projectId: propProjectId }: PunchByAreaReportProps) {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>()
  const projectId = propProjectId || routeProjectId
  const navigate = useNavigate()

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<PunchByAreaFilters>({
    status: [],
    priorityLevel: [],
    includeCompleted: false,
  })
  const [groupBy, setGroupBy] = useState<'area' | 'building' | 'floor'>('area')
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | null>(null)

  // Queries
  const { data: project } = useProject(projectId)
  const { summary, isLoading, error, refetch } = usePunchByArea(projectId, filters)

  // Filtered areas based on search
  const filteredAreas = useMemo(() => {
    if (!summary) {return []}

    let areas = summary.areas

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      areas = areas.filter(
        area =>
          area.fullLocation.toLowerCase().includes(query) ||
          area.building?.toLowerCase().includes(query) ||
          area.floor?.toLowerCase().includes(query) ||
          area.room?.toLowerCase().includes(query) ||
          area.area?.toLowerCase().includes(query)
      )
    }

    return areas
  }, [summary, searchQuery])

  // Group areas based on selection
  const groupedAreas = useMemo(() => {
    if (!summary) {return {}}

    switch (groupBy) {
      case 'building':
        return summary.byBuilding
      case 'floor':
        return summary.byFloor
      default:
        return { 'All Areas': filteredAreas }
    }
  }, [summary, groupBy, filteredAreas])

  // Handle filter changes
  const handleStatusFilterChange = (status: PunchItemStatus) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status?.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...(prev.status || []), status],
    }))
  }

  const handlePriorityFilterChange = (priority: PriorityLevel) => {
    setFilters(prev => ({
      ...prev,
      priorityLevel: prev.priorityLevel?.includes(priority)
        ? prev.priorityLevel.filter(p => p !== priority)
        : [...(prev.priorityLevel || []), priority],
    }))
  }

  // Export to Excel
  const handleExportExcel = async () => {
    if (!summary) {return}

    setIsExporting('excel')
    try {
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'JobSight'
      workbook.created = new Date()

      const worksheet = workbook.addWorksheet('Punch by Area Summary', {
        pageSetup: { orientation: 'landscape', fitToPage: true },
      })

      // Header styling
      worksheet.columns = [
        { header: 'Location', key: 'location', width: 40 },
        { header: 'Building', key: 'building', width: 20 },
        { header: 'Floor', key: 'floor', width: 15 },
        { header: 'Total', key: 'total', width: 10 },
        { header: 'Open', key: 'open', width: 10 },
        { header: 'In Progress', key: 'inProgress', width: 12 },
        { header: 'Completed', key: 'completed', width: 12 },
        { header: 'Verified', key: 'verified', width: 10 },
        { header: 'Overdue', key: 'overdue', width: 10 },
        { header: 'Avg Priority', key: 'priority', width: 12 },
        { header: 'Completion %', key: 'completion', width: 12 },
      ]

      // Style header row
      const headerRow = worksheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E79' },
      }
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
      headerRow.height = 24

      // Add data rows
      summary.areas.forEach((area, index) => {
        const completionRate = area.total > 0
          ? Math.round(((area.completed + area.verified) / area.total) * 100)
          : 0

        const row = worksheet.addRow({
          location: area.fullLocation,
          building: area.building || 'N/A',
          floor: area.floor || 'N/A',
          total: area.total,
          open: area.open,
          inProgress: area.inProgress,
          completed: area.completed,
          verified: area.verified,
          overdue: area.overdue,
          priority: area.averagePriorityScore,
          completion: `${completionRate}%`,
        })

        // Alternating row colors
        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' },
          }
        }
      })

      // Add summary row
      worksheet.addRow({})
      const totalRow = worksheet.addRow({
        location: 'TOTALS',
        building: '',
        floor: '',
        total: summary.totals.totalItems,
        open: summary.totals.totalOpen,
        inProgress: summary.totals.totalInProgress,
        completed: summary.totals.totalCompleted,
        verified: summary.totals.totalVerified,
        overdue: summary.totals.totalOverdue,
        priority: summary.totals.averagePriorityScore,
        completion: '',
      })
      totalRow.font = { bold: true }
      totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' },
      }

      // Auto-filter
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: summary.areas.length + 1, column: 11 },
      }

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `punch-by-area-${project?.name || 'report'}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
      link.click()
      URL.revokeObjectURL(url)

      toast.success('Excel report exported successfully')
    } catch (err) {
      console.error('Export error:', err)
      toast.error('Failed to export report')
    } finally {
      setIsExporting(null)
    }
  }

  // Export to PDF (HTML for print)
  const handleExportPDF = async () => {
    if (!summary) {return}

    setIsExporting('pdf')
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Punch by Area Report - ${project?.name || 'Project'}</title>
          <style>
            @page { size: landscape; margin: 0.5in; }
            body { font-family: Arial, sans-serif; font-size: 10pt; }
            h1 { font-size: 18pt; color: #1f4e79; margin-bottom: 8px; }
            .meta { color: #666; font-size: 9pt; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background: #1f4e79; color: white; padding: 8px; text-align: left; }
            td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
            tr:nth-child(even) { background: #f9f9f9; }
            .summary { display: flex; gap: 16px; margin-bottom: 16px; }
            .summary-card { background: #f0f4f8; padding: 12px; border-radius: 4px; text-align: center; flex: 1; }
            .summary-card h3 { font-size: 24pt; margin: 0; color: #1f4e79; }
            .summary-card p { margin: 4px 0 0; color: #666; font-size: 9pt; }
            .overdue { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1 className="heading-page">Punch by Area Summary Report</h1>
          <p class="meta">
            Project: ${project?.name || 'N/A'} | Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}
          </p>

          <div class="summary">
            <div class="summary-card">
              <h3 className="heading-subsection">${summary.totals.totalItems}</h3>
              <p>Total Items</p>
            </div>
            <div class="summary-card">
              <h3 className="heading-subsection">${summary.totals.totalOpen}</h3>
              <p>Open</p>
            </div>
            <div class="summary-card">
              <h3 className="heading-subsection">${summary.totals.totalInProgress}</h3>
              <p>In Progress</p>
            </div>
            <div class="summary-card">
              <h3 className="heading-subsection">${summary.totals.totalCompleted + summary.totals.totalVerified}</h3>
              <p>Completed</p>
            </div>
            <div class="summary-card">
              <h3 class="overdue">${summary.totals.totalOverdue}</h3>
              <p>Overdue</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Location</th>
                <th>Total</th>
                <th>Open</th>
                <th>In Progress</th>
                <th>Completed</th>
                <th>Overdue</th>
                <th>Avg Priority</th>
                <th>Completion %</th>
              </tr>
            </thead>
            <tbody>
              ${summary.areas
                .map(area => {
                  const completion = area.total > 0
                    ? Math.round(((area.completed + area.verified) / area.total) * 100)
                    : 0
                  return `
                    <tr>
                      <td>${area.fullLocation}</td>
                      <td>${area.total}</td>
                      <td>${area.open}</td>
                      <td>${area.inProgress}</td>
                      <td>${area.completed + area.verified}</td>
                      <td class="${area.overdue > 0 ? 'overdue' : ''}">${area.overdue}</td>
                      <td>${area.averagePriorityScore}</td>
                      <td>${completion}%</td>
                    </tr>
                  `
                })
                .join('')}
            </tbody>
          </table>
        </body>
        </html>
      `

      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const printWindow = window.open(url, '_blank')
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      }

      toast.success('PDF report ready for printing')
    } catch (err) {
      console.error('Export error:', err)
      toast.error('Failed to generate PDF')
    } finally {
      setIsExporting(null)
    }
  }

  // View details for a specific area
  const handleViewDetails = (area: AreaSummary) => {
    // Navigate to punch list with area filter
    navigate(`/projects/${projectId}/punch-lists?area=${encodeURIComponent(area.fullLocation)}`)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-error mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2 heading-subsection">Error Loading Report</h3>
            <p className="text-secondary mb-4">{error.message}</p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 heading-page">
              <BarChart3 className="h-6 w-6" />
              Punch by Area Report
            </h1>
            <p className="text-muted-foreground text-sm">
              {project?.name || 'Project'} - {summary?.totals.totalItems || 0} total items across {summary?.totals.uniqueAreas || 0} areas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isExporting !== null}>
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting !== null}>
                <FileText className="h-4 w-4 mr-2" />
                Export to PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel} disabled={isExporting !== null}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export to Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-foreground">{summary.totals.totalItems}</p>
              <p className="text-sm text-secondary">Total Items</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{summary.totals.totalOpen}</p>
              <p className="text-sm text-secondary">Open</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-warning">{summary.totals.totalInProgress}</p>
              <p className="text-sm text-secondary">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-success">
                {summary.totals.totalCompleted + summary.totals.totalVerified}
              </p>
              <p className="text-sm text-secondary">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-error">{summary.totals.totalOverdue}</p>
              <p className="text-sm text-secondary">Overdue</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
              <Input
                placeholder="Search by location, building, floor..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Group By */}
            <Select value={groupBy} onValueChange={(v: 'area' | 'building' | 'floor') => setGroupBy(v)}>
              <SelectTrigger className="w-[150px]">
                <Layers className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Group by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="area">By Area</SelectItem>
                <SelectItem value="building">By Building</SelectItem>
                <SelectItem value="floor">By Floor</SelectItem>
              </SelectContent>
            </Select>

            {/* Include Completed */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-completed"
                checked={filters.includeCompleted}
                onCheckedChange={checked =>
                  setFilters(prev => ({ ...prev, includeCompleted: checked === true }))
                }
              />
              <Label htmlFor="include-completed" className="text-sm">
                Include Completed
              </Label>
            </div>
          </div>

          {/* Status Filters */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-secondary mr-2">Status:</span>
            {STATUS_OPTIONS.map(({ value, label }) => (
              <Badge
                key={value}
                variant={filters.status?.includes(value) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleStatusFilterChange(value)}
              >
                {label}
              </Badge>
            ))}
          </div>

          {/* Priority Filters */}
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-sm text-secondary mr-2">Priority:</span>
            {PRIORITY_OPTIONS.map(({ value, label }) => (
              <Badge
                key={value}
                variant={filters.priorityLevel?.includes(value) ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer',
                  filters.priorityLevel?.includes(value) && PRIORITY_COLORS[value].bgColor
                )}
                onClick={() => handlePriorityFilterChange(value)}
              >
                {label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Area List */}
      <Card>
        <CardHeader>
          <CardTitle>Areas ({filteredAreas.length})</CardTitle>
          <CardDescription>
            Click on an area to expand and see details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAreas.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-secondary">No areas found matching your filters</p>
            </div>
          ) : (
            <div>
              {Object.entries(groupedAreas).map(([groupName, areas]) => (
                <div key={groupName} className="mb-6">
                  {groupBy !== 'area' && (
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2 heading-subsection">
                      <Building2 className="h-5 w-5 text-disabled" />
                      {groupName}
                      <Badge variant="secondary">{areas.length} areas</Badge>
                    </h3>
                  )}
                  {areas.map(area => (
                    <AreaRow
                      key={area.fullLocation}
                      area={area}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PunchByAreaReport
