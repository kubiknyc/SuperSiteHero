/**
 * Auto Report Config Component
 * Phase 5: Field Workflow Automation - Milestone 5.3
 *
 * Configuration UI for scheduled automatic field reports
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar,
  Clock,
  FileText,
  Mail,
  Users,
  Eye,
  Settings,
} from 'lucide-react'
import {
  useCreateScheduledReport,
  useUpdateScheduledReport,
  usePreviewReportData,
} from '../hooks/useScheduledFieldReports'
import type {
  ScheduledFieldReport,
  CreateScheduledFieldReportInput,
  FieldReportType,
  ReportFrequency,
  ReportSection,
  ReportContentConfig,
  ReportOutputFormat,
} from '@/types/workflow-automation'
import {
  FIELD_REPORT_TYPES,
  REPORT_FREQUENCIES,
  REPORT_SECTIONS,
  DAYS_OF_WEEK,
} from '@/types/workflow-automation'
import { cn } from '@/lib/utils'

interface AutoReportConfigProps {
  projectId?: string
  companyId?: string
  report?: ScheduledFieldReport
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AutoReportConfig({
  projectId,
  companyId,
  report,
  open,
  onOpenChange,
  onSuccess,
}: AutoReportConfigProps) {
  const isEditing = !!report

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [reportType, setReportType] = useState<FieldReportType>('weekly_progress')
  const [frequency, setFrequency] = useState<ReportFrequency>('weekly')
  const [dayOfWeek, setDayOfWeek] = useState<number>(1) // Monday
  const [dayOfMonth, setDayOfMonth] = useState<number>(1)
  const [timeOfDay, setTimeOfDay] = useState('18:00')
  const [timezone, setTimezone] = useState('America/New_York')
  const [selectedSections, setSelectedSections] = useState<ReportSection[]>([
    'summary',
    'safety',
    'quality',
    'schedule',
  ])
  const [includeCharts, setIncludeCharts] = useState(true)
  const [includePhotos, setIncludePhotos] = useState(true)
  const [maxPhotos, setMaxPhotos] = useState(10)
  const [recipientEmails, setRecipientEmails] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [includePdfAttachment, setIncludePdfAttachment] = useState(true)
  const [outputFormat, setOutputFormat] = useState<ReportOutputFormat>('pdf')
  const [isActive, setIsActive] = useState(true)

  // Preview state
  const [previewData, setPreviewData] = useState<Record<string, unknown> | null>(null)

  // Mutations
  const createReport = useCreateScheduledReport()
  const updateReport = useUpdateScheduledReport()
  const previewReport = usePreviewReportData()

  // Initialize form when editing
  useEffect(() => {
    if (report) {
      setName(report.name)
      setDescription(report.description || '')
      setReportType(report.report_type)
      setFrequency(report.frequency)
      setDayOfWeek(report.day_of_week ?? 1)
      setDayOfMonth(report.day_of_month ?? 1)
      setTimeOfDay(report.time_of_day)
      setTimezone(report.timezone)
      setSelectedSections(report.content_config.sections || [])
      setIncludeCharts(report.content_config.include_charts ?? true)
      setIncludePhotos(report.content_config.include_photos ?? true)
      setMaxPhotos(report.content_config.max_photos ?? 10)
      setRecipientEmails((report.recipient_emails || []).join(', '))
      setEmailSubject(report.email_subject_template || '')
      setEmailBody(report.email_body_template || '')
      setIncludePdfAttachment(report.include_pdf_attachment)
      setOutputFormat(report.output_format)
      setIsActive(report.is_active)
    } else {
      resetForm()
    }
  }, [report, open])

  const resetForm = () => {
    setName('')
    setDescription('')
    setReportType('weekly_progress')
    setFrequency('weekly')
    setDayOfWeek(1)
    setDayOfMonth(1)
    setTimeOfDay('18:00')
    setTimezone('America/New_York')
    setSelectedSections(['summary', 'safety', 'quality', 'schedule'])
    setIncludeCharts(true)
    setIncludePhotos(true)
    setMaxPhotos(10)
    setRecipientEmails('')
    setEmailSubject('')
    setEmailBody('')
    setIncludePdfAttachment(true)
    setOutputFormat('pdf')
    setIsActive(true)
    setPreviewData(null)
  }

  const toggleSection = (section: ReportSection) => {
    setSelectedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    )
  }

  const handlePreview = async () => {
    if (!projectId) {return}

    const today = new Date()
    let periodStart: string
    let periodEnd: string

    switch (frequency) {
      case 'daily':
        periodStart = periodEnd = today.toISOString().split('T')[0]
        break
      case 'weekly':
      case 'biweekly':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        periodStart = weekAgo.toISOString().split('T')[0]
        periodEnd = today.toISOString().split('T')[0]
        break
      case 'monthly':
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        periodStart = monthAgo.toISOString().split('T')[0]
        periodEnd = today.toISOString().split('T')[0]
        break
      default:
        periodStart = periodEnd = today.toISOString().split('T')[0]
    }

    const data = await previewReport.mutateAsync({
      projectId,
      reportType,
      periodStart,
      periodEnd,
      contentConfig: {
        sections: selectedSections,
        include_charts: includeCharts,
        include_photos: includePhotos,
        max_photos: maxPhotos,
      },
    })

    setPreviewData(data)
  }

  const handleSubmit = async () => {
    const contentConfig: ReportContentConfig = {
      sections: selectedSections,
      include_charts: includeCharts,
      include_photos: includePhotos,
      max_photos: maxPhotos,
    }

    const emails = recipientEmails
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e)

    const input: CreateScheduledFieldReportInput = {
      project_id: projectId,
      company_id: companyId,
      name,
      description: description || undefined,
      report_type: reportType,
      frequency,
      day_of_week: frequency === 'weekly' || frequency === 'biweekly' ? dayOfWeek : undefined,
      day_of_month: frequency === 'monthly' ? dayOfMonth : undefined,
      time_of_day: timeOfDay,
      timezone,
      content_config: contentConfig,
      recipient_emails: emails.length > 0 ? emails : undefined,
      email_subject_template: emailSubject || undefined,
      email_body_template: emailBody || undefined,
      include_pdf_attachment: includePdfAttachment,
      output_format: outputFormat,
    }

    if (isEditing && report) {
      await updateReport.mutateAsync({
        id: report.id,
        updates: { ...input, is_active: isActive },
      })
    } else {
      await createReport.mutateAsync(input)
    }

    onOpenChange(false)
    onSuccess?.()
  }

  const isLoading = createReport.isPending || updateReport.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isEditing ? 'Edit Scheduled Report' : 'Create Scheduled Report'}
          </DialogTitle>
          <DialogDescription>
            Configure automatic report generation and distribution.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">
              <Settings className="h-4 w-4 mr-1" />
              General
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <Calendar className="h-4 w-4 mr-1" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="content">
              <FileText className="h-4 w-4 mr-1" />
              Content
            </TabsTrigger>
            <TabsTrigger value="distribution">
              <Mail className="h-4 w-4 mr-1" />
              Distribution
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Report Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Weekly Progress Report"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Report Type *</Label>
                  <Select
                    value={reportType}
                    onValueChange={(v) => setReportType(v as FieldReportType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_REPORT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose of this report..."
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <Label>Active</Label>
                </div>
                <div className="space-y-2">
                  <Label>Output Format</Label>
                  <Select
                    value={outputFormat}
                    onValueChange={(v) => setOutputFormat(v as ReportOutputFormat)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Schedule Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={frequency}
                      onValueChange={(v) => setFrequency(v as ReportFrequency)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REPORT_FREQUENCIES.map((freq) => (
                          <SelectItem key={freq.value} value={freq.value}>
                            {freq.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={timeOfDay}
                      onChange={(e) => setTimeOfDay(e.target.value)}
                    />
                  </div>
                </div>

                {(frequency === 'weekly' || frequency === 'biweekly') && (
                  <div className="space-y-2">
                    <Label>Day of Week</Label>
                    <Select
                      value={String(dayOfWeek)}
                      onValueChange={(v) => setDayOfWeek(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={String(day.value)}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {frequency === 'monthly' && (
                  <div className="space-y-2">
                    <Label>Day of Month</Label>
                    <Select
                      value={String(dayOfMonth)}
                      onValueChange={(v) => setDayOfMonth(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={String(day)}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Report Sections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {REPORT_SECTIONS.map((section) => (
                    <div
                      key={section.value}
                      className={cn(
                        'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors',
                        selectedSections.includes(section.value)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted'
                      )}
                      onClick={() => toggleSection(section.value)}
                    >
                      <Checkbox
                        checked={selectedSections.includes(section.value)}
                        onCheckedChange={() => toggleSection(section.value)}
                      />
                      <span className="text-sm">{section.label}</span>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Include Charts</Label>
                      <p className="text-xs text-muted-foreground">
                        Add visual charts to the report
                      </p>
                    </div>
                    <Switch checked={includeCharts} onCheckedChange={setIncludeCharts} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Include Photos</Label>
                      <p className="text-xs text-muted-foreground">
                        Include project photos in the report
                      </p>
                    </div>
                    <Switch checked={includePhotos} onCheckedChange={setIncludePhotos} />
                  </div>

                  {includePhotos && (
                    <div className="flex items-center gap-4 pl-4">
                      <Label>Max Photos:</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        className="w-20"
                        value={maxPhotos}
                        onChange={(e) => setMaxPhotos(parseInt(e.target.value) || 10)}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preview Button */}
            {projectId && (
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={previewReport.isPending}
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                {previewReport.isPending ? 'Loading Preview...' : 'Preview Report Data'}
              </Button>
            )}

            {previewData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preview Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[200px]">
                    {JSON.stringify(previewData, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Distribution Tab */}
          <TabsContent value="distribution" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Recipients
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Addresses</Label>
                  <Textarea
                    value={recipientEmails}
                    onChange={(e) => setRecipientEmails(e.target.value)}
                    placeholder="email1@example.com, email2@example.com"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate multiple emails with commas
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Template
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Subject Line</Label>
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="e.g., Weekly Progress Report - {{project_name}}"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email Body</Label>
                  <Textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Custom message to include in the email..."
                    rows={4}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <Label>Attach PDF Report</Label>
                    <p className="text-xs text-muted-foreground">
                      Include the report as a PDF attachment
                    </p>
                  </div>
                  <Switch
                    checked={includePdfAttachment}
                    onCheckedChange={setIncludePdfAttachment}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name || isLoading}>
            {isLoading ? 'Saving...' : isEditing ? 'Update Report' : 'Create Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AutoReportConfig
