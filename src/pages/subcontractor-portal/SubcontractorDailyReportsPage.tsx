/**
 * Subcontractor Daily Reports Page
 * Read-only access to daily reports filtered by subcontractor's scope
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useCanViewDailyReports,
  useSubcontractorDailyReports,
  useSubcontractorProjects,
} from '@/features/subcontractor-portal/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Search,
  Calendar,
  Building2,
  Cloud,
  Users,
  Truck,
  Camera,
  Eye,
  Lock,
  AlertCircle,
} from 'lucide-react'
import { format, parseISO, subDays } from 'date-fns'

function ReportsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  )
}

function WeatherBadge({ weather }: { weather: string | null }) {
  if (!weather) {return null}

  const weatherColors: Record<string, string> = {
    sunny: 'bg-warning-light text-yellow-700',
    cloudy: 'bg-muted text-secondary',
    rainy: 'bg-info-light text-primary-hover',
    stormy: 'bg-purple-100 text-purple-700',
    snowy: 'bg-slate-100 text-slate-600',
    foggy: 'bg-muted text-secondary',
  }

  return (
    <Badge variant="secondary" className={weatherColors[weather] || 'bg-muted text-secondary'}>
      <Cloud className="h-3 w-3 mr-1" />
      {weather.charAt(0).toUpperCase() + weather.slice(1)}
    </Badge>
  )
}

export function SubcontractorDailyReportsPage() {
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('30')

  // Check permission
  const { data: canView, isLoading: checkingPermission } = useCanViewDailyReports()
  const { data: projects } = useSubcontractorProjects()

  // Calculate date filter
  const startDate =
    dateRange !== 'all'
      ? format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd')
      : undefined

  const filter = {
    projectId: projectFilter !== 'all' ? projectFilter : undefined,
    startDate,
  }

  const { data: reports, isLoading, isError } = useSubcontractorDailyReports(filter)

  // Filter by search client-side
  const filteredReports = reports?.filter((report) => {
    if (!search) {return true}
    const searchLower = search.toLowerCase()
    return (
      report.project_name.toLowerCase().includes(searchLower) ||
      (report.work_summary && report.work_summary.toLowerCase().includes(searchLower))
    )
  })

  // Permission denied
  if (!checkingPermission && !canView) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2" className="heading-section">Access Restricted</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              You don't have permission to view daily reports. Contact the project manager to
              request access.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" className="heading-page">
          <FileText className="h-6 w-6" />
          Daily Reports
        </h1>
        <p className="text-muted-foreground">
          View daily reports for your assigned projects (read-only).
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <RadixSelect value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects?.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </RadixSelect>
        <RadixSelect value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </RadixSelect>
      </div>

      {/* Reports List */}
      {checkingPermission || isLoading ? (
        <ReportsSkeleton />
      ) : isError ? (
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-error" />
            <p className="text-muted-foreground">Failed to load daily reports</p>
          </CardContent>
        </Card>
      ) : !filteredReports || filteredReports.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No daily reports found</p>
            {(search || projectFilter !== 'all') && (
              <p className="text-sm mt-1">Try adjusting your filters</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <Card key={report.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(parseISO(report.report_date), 'EEEE, MMMM d, yyyy')}
                      </span>
                      <WeatherBadge weather={report.weather_condition} />
                      {report.submitted_at && (
                        <Badge variant="outline" className="text-success border-green-200">
                          Submitted
                        </Badge>
                      )}
                    </div>

                    {/* Project name */}
                    <div className="flex items-center gap-1.5 mt-2 text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="text-sm">{report.project_name}</span>
                    </div>

                    {/* Work completed summary */}
                    {report.work_summary && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {report.work_summary}
                      </p>
                    )}

                    {/* Stats row */}
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                      {report.workforce_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {report.workforce_count} workers
                        </span>
                      )}
                      {report.equipment_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Truck className="h-3.5 w-3.5" />
                          {report.equipment_count} equipment
                        </span>
                      )}
                      {report.photos_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Camera className="h-3.5 w-3.5" />
                          {report.photos_count} photos
                        </span>
                      )}
                    </div>
                  </div>

                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/portal/daily-reports/${report.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default SubcontractorDailyReportsPage
