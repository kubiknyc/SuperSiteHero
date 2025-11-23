// File: /src/pages/daily-reports/DailyReportsPage.tsx
// Daily reports list and management page

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { useDailyReports } from '@/features/daily-reports/hooks/useDailyReports'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plus,
  FileText,
  Calendar,
  Cloud,
  Users,
  Eye,
  Edit,
  Thermometer,
  Clock,
} from 'lucide-react'
import { format } from 'date-fns'

export function DailyReportsPage() {
  const { data: projects } = useMyProjects()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [dateFilter, setDateFilter] = useState('')

  // Use the selected project or first active project
  const activeProjectId = selectedProjectId || projects?.find((p) => p.status === 'active')?.id || projects?.[0]?.id

  const { data: reports, isLoading, error } = useDailyReports(activeProjectId)

  // Filter reports by date if date filter is set
  const filteredReports = reports?.filter((report) => {
    if (!dateFilter) return true
    return report.report_date === dateFilter
  })

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary'
      case 'in_review':
      case 'submitted':
        return 'default'
      case 'approved':
        return 'success'
      default:
        return 'outline'
    }
  }

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Daily Reports</h1>
            <p className="text-gray-600 mt-1">
              Track daily activities, weather, and workforce
            </p>
          </div>
          <Link to="/daily-reports/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Project selector */}
              {projects && projects.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project
                  </label>
                  <Select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                    <option value="">Select project...</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Date filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Date
                </label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading daily reports...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-600">Error loading daily reports: {error.message}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && (!filteredReports || filteredReports.length === 0) && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No daily reports yet
              </h3>
              <p className="text-gray-600 mb-6">
                {dateFilter
                  ? 'No reports found for the selected date.'
                  : 'Start documenting your daily activities by creating your first report.'}
              </p>
              {!dateFilter && (
                <Link to="/daily-reports/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Report
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reports Table */}
        {filteredReports && filteredReports.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              <CardDescription>
                {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Weather</TableHead>
                    <TableHead>Temperature</TableHead>
                    <TableHead>Workforce</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {report.report_date ? format(new Date(report.report_date), 'MMM d, yyyy') : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Cloud className="h-4 w-4 text-gray-400" />
                          {report.weather_condition || 'Not recorded'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {report.temperature_high && report.temperature_low ? (
                          <div className="flex items-center gap-2">
                            <Thermometer className="h-4 w-4 text-gray-400" />
                            {report.temperature_high}°/{report.temperature_low}°
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          {report.total_workers || 0} workers
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(report.status ?? 'draft')}>
                          {formatStatus(report.status ?? 'draft')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {report.created_by || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/daily-reports/${report.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {report.status === 'draft' && (
                            <Link to={`/daily-reports/${report.id}/edit`}>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        {filteredReports && filteredReports.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Reports</p>
                    <p className="text-2xl font-bold mt-1">{filteredReports.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                    <p className="text-2xl font-bold mt-1">
                      {filteredReports.filter((r) => r.status === 'submitted').length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Weather Delays</p>
                    <p className="text-2xl font-bold mt-1">
                      {filteredReports.filter((r) => r.weather_delays).length}
                    </p>
                  </div>
                  <Cloud className="h-8 w-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
