// File: /src/pages/daily-reports/DailyReportDetailPage.tsx
// Daily report detail view

import React, { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useDailyReport, useUpdateDailyReport, useDeleteDailyReport } from '@/features/daily-reports/hooks/useDailyReports'
import { useDailyReportFullData } from '@/features/daily-reports/hooks/useDailyReportRelatedData'
import { downloadDailyReportPDF } from '@/features/daily-reports/utils/pdfExport'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Cloud,
  Thermometer,
  Users,
  AlertCircle,
  Edit,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Camera,
  Download,
  Loader2,
  Printer,
  History,
  PenTool,
} from 'lucide-react'
import { PhotoGallery } from '@/features/daily-reports/components/PhotoGallery'
import { PrintView } from '@/features/daily-reports/components/PrintView'
import { VersionHistory } from '@/features/daily-reports/components/VersionHistory'
import { SignatureCapture } from '@/features/daily-reports/components/SignatureCapture'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

// Helper component to isolate type issues with issues field
function IssuesCard({ issuesText }: { issuesText: string | null }) {
  if (!issuesText || issuesText.trim() === '') return null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Issues/Challenges
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 whitespace-pre-wrap">{issuesText}</p>
      </CardContent>
    </Card>
  )
}

export function DailyReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: report, isLoading, error } = useDailyReport(id)
  const updateMutation = useUpdateDailyReport()
  const deleteMutation = useDeleteDailyReport()
  const relatedData = useDailyReportFullData(id)
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [showPrintView, setShowPrintView] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showApprovalSignature, setShowApprovalSignature] = useState(false)

  if (!id) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-red-600">Report ID not found</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-gray-500">Loading report...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !report) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Error loading report: {error?.message}</p>
            <Link to="/daily-reports">
              <Button className="mt-4">Back to Reports</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  const handleExportPDF = async () => {
    if (!report) return

    setIsExportingPDF(true)
    try {
      // Use inline photos from report if available, otherwise use relatedData.photos
      // Cast to any to safely check for photos property without breaking type inference
      const reportAny = report as Record<string, unknown>
      const reportPhotos = (reportAny.photos && Array.isArray(reportAny.photos))
        ? reportAny.photos
        : relatedData.photos

      await downloadDailyReportPDF({
        report,
        workforce: relatedData.workforce,
        equipment: relatedData.equipment,
        deliveries: relatedData.deliveries,
        visitors: relatedData.visitors,
        photos: reportPhotos,
        projectName: report.project?.name || 'Project',
      })
      toast.success('PDF exported successfully')
    } catch (err) {
      console.error('PDF export error:', err)
      toast.error('Failed to export PDF')
    } finally {
      setIsExportingPDF(false)
    }
  }

  const handleApprove = async () => {
    try {
      await updateMutation.mutateAsync({
        id: report.id,
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      toast.success('Report approved')
    } catch (err) {
      toast.error('Failed to approve report')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return
    }
    try {
      await deleteMutation.mutateAsync(report.id)
      toast.success('Report deleted')
      navigate('/daily-reports')
    } catch (err) {
      toast.error('Failed to delete report')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary'
      case 'submitted':
        return 'default'
      case 'in_review':
        return 'default'
      case 'approved':
        return 'success'
      default:
        return 'outline'
    }
  }

  // Extract issues as string for type safety
  const issuesText: string | null = typeof report.issues === 'string' ? report.issues : null

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/daily-reports">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Daily Report - {report.report_date ? format(new Date(report.report_date), 'MMM d, yyyy') : 'N/A'}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={getStatusColor(report.status ?? 'draft')}>
                  {(report.status ?? 'draft').replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setShowPrintView(true)}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPDF}
              disabled={isExportingPDF || relatedData.isLoading}
            >
              {isExportingPDF ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isExportingPDF ? 'Exporting...' : 'Export PDF'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowVersionHistory(!showVersionHistory)}
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
            {report.status === 'draft' && (
              <Link to={`/daily-reports/${report.id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
            )}
            {report.status === 'submitted' && (
              <Button onClick={() => setShowApprovalSignature(true)} variant="outline">
                <PenTool className="h-4 w-4 mr-2" />
                Sign & Approve
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Report Details */}
        <Card>
          <CardHeader>
            <CardTitle>Report Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Report Date</p>
              <p className="text-lg font-semibold mt-1">
                {report.report_date ? format(new Date(report.report_date), 'EEEE, MMMM d, yyyy') : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Created By</p>
              <p className="text-lg font-semibold mt-1">{report.created_by || 'Unknown'}</p>
            </div>
            {report.submitted_at && (
              <div>
                <p className="text-sm font-medium text-gray-600">Submitted</p>
                <p className="text-lg font-semibold mt-1">
                  {report.submitted_at ? format(new Date(report.submitted_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                </p>
              </div>
            )}
            {report.approved_at && (
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-lg font-semibold mt-1">
                  {report.approved_at ? format(new Date(report.approved_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weather Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Weather Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Weather Condition</p>
                <p className="text-lg font-semibold mt-1 capitalize">
                  {report.weather_condition || 'Not recorded'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Temperature</p>
                <p className="text-lg font-semibold mt-1">
                  {report.temperature_high && report.temperature_low
                    ? `${report.temperature_high}°F / ${report.temperature_low}°F`
                    : 'Not recorded'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Weather Delays</p>
                <p className="text-lg font-semibold mt-1">
                  {report.weather_delays ? 'Yes' : 'No'}
                </p>
              </div>
            </div>

            {report.weather_delay_notes && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-gray-600 mb-2">Delay Notes</p>
                <p className="text-gray-700 whitespace-pre-wrap">{report.weather_delay_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <IssuesCard issuesText={issuesText} />

        {/* Observations */}
        {report.observations && report.observations.trim() !== '' && (
          <Card>
            <CardHeader>
              <CardTitle>Observations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{report.observations}</p>
            </CardContent>
          </Card>
        )}

        {/* Comments */}
        {report.comments && (
          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{report.comments}</p>
            </CardContent>
          </Card>
        )}

        {/* Photos - use type cast to avoid 'in' operator breaking type inference */}
        {(() => {
          const reportAny = report as Record<string, unknown>
          const photos = reportAny.photos
          if (!photos || !Array.isArray(photos) || photos.length === 0) return null
          return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Photos ({photos.length})
                </CardTitle>
                <CardDescription>Progress documentation with GPS metadata</CardDescription>
              </CardHeader>
              <CardContent>
                <PhotoGallery photos={photos as any} readOnly />
              </CardContent>
            </Card>
          )
        })()}

        {/* Version History */}
        {showVersionHistory && (
          <VersionHistory reportId={report.id} />
        )}

        {/* Approval Signature Dialog */}
        {showApprovalSignature && (
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <PenTool className="h-5 w-5" />
                Approval Signature
              </CardTitle>
              <CardDescription>Sign below to approve this daily report</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SignatureCapture
                label="Approver Signature"
                onSave={async (signatureDataUrl) => {
                  try {
                    await updateMutation.mutateAsync({
                      id: report.id,
                      status: 'approved',
                      approved_at: new Date().toISOString(),
                    })
                    setShowApprovalSignature(false)
                    toast.success('Report approved with signature')
                  } catch (err) {
                    toast.error('Failed to approve report')
                  }
                }}
                onClear={() => {}}
              />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowApprovalSignature(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Print View Modal */}
      {showPrintView && (
        <PrintView
          report={report}
          workforce={relatedData.workforce}
          equipment={relatedData.equipment}
          deliveries={relatedData.deliveries}
          visitors={relatedData.visitors}
          projectName={report.project?.name || 'Project'}
          onClose={() => setShowPrintView(false)}
        />
      )}
    </AppLayout>
  )
}
