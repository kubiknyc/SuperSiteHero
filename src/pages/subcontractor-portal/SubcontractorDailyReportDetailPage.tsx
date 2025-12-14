/**
 * Subcontractor Daily Report Detail Page
 * Read-only view of a single daily report
 */

import { useParams, Link } from 'react-router-dom'
import { useSubcontractorDailyReportFull } from '@/features/subcontractor-portal/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  FileText,
  Calendar,
  Building2,
  Cloud,
  Thermometer,
  Users,
  Truck,
  Camera,
  AlertCircle,
  CheckCircle2,
  Clock,
  ClipboardList,
  HardHat,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-48" />
      <Skeleton className="h-48" />
      <Skeleton className="h-48" />
    </div>
  )
}

function WeatherDisplay({
  conditions,
  temperature,
}: {
  conditions: string | null
  temperature: number | null
}) {
  if (!conditions && !temperature) return null

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      {conditions && (
        <span className="flex items-center gap-1.5">
          <Cloud className="h-4 w-4 text-muted-foreground" />
          {conditions.charAt(0).toUpperCase() + conditions.slice(1)}
        </span>
      )}
      {temperature !== null && (
        <span className="flex items-center gap-1.5">
          <Thermometer className="h-4 w-4 text-muted-foreground" />
          {temperature}°F
        </span>
      )}
    </div>
  )
}

export function SubcontractorDailyReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const { report, workforce, equipment, photos, isLoading, isError } =
    useSubcontractorDailyReportFull(reportId)

  if (isLoading) {
    return (
      <div className="p-6">
        <DetailSkeleton />
      </div>
    )
  }

  if (isError || !report) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">Report Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This report doesn't exist or you don't have permission to view it.
            </p>
            <Button asChild>
              <Link to="/portal/daily-reports">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Reports
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link to="/portal/daily-reports">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Reports
            </Link>
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Daily Report
          </h1>
          <div className="flex items-center gap-3 mt-2 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {format(parseISO(report.report_date), 'EEEE, MMMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              {report.project_name}
            </span>
          </div>
        </div>

        <Badge
          variant={report.submitted_at ? 'default' : 'secondary'}
          className={report.submitted_at ? 'bg-green-100 text-green-700' : ''}
        >
          {report.submitted_at ? (
            <>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Submitted
            </>
          ) : (
            <>
              <Clock className="h-3 w-3 mr-1" />
              Draft
            </>
          )}
        </Badge>
      </div>

      {/* Weather & General Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <WeatherDisplay
            conditions={report.weather_condition}
            temperature={report.temperature_high}
          />
        </CardContent>
      </Card>

      {/* Work Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Work Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.work_completed && (
            <div>
              <h4 className="text-sm font-medium mb-1">Work Completed</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {report.work_completed}
              </p>
            </div>
          )}
          {report.work_planned_tomorrow && (
            <div>
              <h4 className="text-sm font-medium mb-1">Work Planned for Tomorrow</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {report.work_planned_tomorrow}
              </p>
            </div>
          )}
          {report.issues && (
            <div>
              <h4 className="text-sm font-medium mb-1 text-orange-600">Issues/Delays</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.issues}</p>
            </div>
          )}
          {report.observations && (
            <div>
              <h4 className="text-sm font-medium mb-1">Observations</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {report.observations}
              </p>
            </div>
          )}
          {!report.work_completed && !report.work_planned_tomorrow && !report.issues && !report.observations && (
            <p className="text-sm text-muted-foreground">No work summary recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Workforce */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Workforce
          </CardTitle>
          <CardDescription>
            {workforce.length > 0
              ? `${workforce.reduce((sum, w) => sum + (w.headcount || 0), 0)} total workers on site`
              : 'No workforce recorded'}
          </CardDescription>
        </CardHeader>
        {workforce.length > 0 && (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trade/Company</TableHead>
                  <TableHead className="text-right">Headcount</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workforce.map((entry, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{entry.trade || 'General'}</span>
                        {entry.company_name && (
                          <span className="text-muted-foreground ml-2">({entry.company_name})</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{entry.headcount || 0}</TableCell>
                    <TableCell className="text-right">{entry.hours_worked || 8}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>

      {/* Equipment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Equipment
          </CardTitle>
          <CardDescription>
            {equipment.length > 0 ? `${equipment.length} equipment entries` : 'No equipment recorded'}
          </CardDescription>
        </CardHeader>
        {equipment.length > 0 && (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((entry, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{entry.equipment_name || entry.equipment_type}</span>
                        {entry.ownership_type && (
                          <span className="text-muted-foreground ml-2">({entry.ownership_type})</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{entry.operator_name || '-'}</TableCell>
                    <TableCell className="text-right">{entry.hours_used || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Photos
          </CardTitle>
          <CardDescription>
            {photos.length > 0 ? `${photos.length} photos` : 'No photos attached'}
          </CardDescription>
        </CardHeader>
        {photos.length > 0 && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo, idx) => (
                <div key={idx} className="group relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || `Photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-white text-xs">
                      {photo.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

    </div>
  )
}

export default SubcontractorDailyReportDetailPage
