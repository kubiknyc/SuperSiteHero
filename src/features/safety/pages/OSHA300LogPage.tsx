/**
 * OSHA 300 Log Page
 *
 * OSHA Form 300 compliant log of work-related injuries and illnesses
 * with 300A annual summary support.
 */

import { useState, useMemo } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { OSHA300Log, OSHA300ACertificationDialog } from '../components'
import { useIncidents, useOSHA300ASummary } from '../hooks/useIncidents'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { ClipboardList, Building2, FileDown, AlertTriangle, Info, FileSpreadsheet, Settings2, FileCheck2, CalendarCheck } from 'lucide-react'
import type { SafetyIncident, OSHA300LogEntry, OSHA300ASummary } from '@/types/safety-incidents'
import {
  exportOSHA300ToExcel,
  exportOSHA300ToCSV,
  downloadFile,
} from '../utils/osha300Export'
import { useToast } from '@/lib/notifications/ToastContext'
import { useAuth } from '@/hooks/useAuth'

/**
 * Convert SafetyIncident to OSHA300LogEntry format
 */
function mapIncidentToOSHA300Entry(incident: SafetyIncident): OSHA300LogEntry {
  return {
    id: incident.id,
    project_id: incident.project_id,
    project_name: incident.project?.name || '',
    case_number: incident.case_number,
    employee_name: incident.is_privacy_case ? null : incident.employee_name,
    job_title: incident.employee_job_title,
    incident_date: incident.incident_date,
    location: incident.location,
    description: incident.description,
    injury_illness_type: incident.injury_illness_type,
    body_part: incident.body_part_affected,
    object_substance: incident.object_substance,
    death: incident.death_date != null,
    days_away_from_work: incident.days_away_from_work > 0 || incident.days_away_count > 0,
    job_transfer_restriction: incident.days_restricted_duty > 0 || incident.days_transfer_restriction > 0,
    other_recordable: incident.osha_recordable && !incident.death_date && incident.days_away_from_work === 0 && incident.days_restricted_duty === 0 && incident.days_away_count === 0 && incident.days_transfer_restriction === 0,
    days_away_count: incident.days_away_count || incident.days_away_from_work,
    days_transfer_restriction: incident.days_transfer_restriction || incident.days_restricted_duty,
    severity: incident.severity,
  }
}

/**
 * Convert API summary format to component format
 */
function mapSummaryToOSHA300A(summary: any, year: number): OSHA300ASummary | null {
  if (!summary) {return null}
  return {
    project_id: summary.project_id,
    project_name: summary.establishment_name || 'Company-wide',
    year: summary.calendar_year || year,
    total_deaths: summary.total_deaths || 0,
    total_days_away_cases: summary.total_days_away_cases || 0,
    total_job_transfer_cases: summary.total_restriction_cases || 0,
    total_other_recordable_cases: summary.total_other_cases || 0,
    total_injuries: summary.total_injuries || 0,
    total_skin_disorders: summary.skin_disorders || 0,
    total_respiratory_conditions: summary.respiratory_conditions || 0,
    total_poisonings: summary.poisoning_cases || 0,
    total_hearing_losses: summary.hearing_loss_cases || 0,
    total_other_illnesses: summary.other_illnesses || 0,
    total_days_away: summary.total_days_away || 0,
    total_days_transfer: summary.total_days_restriction || 0,
    total_recordable_cases: summary.total_recordable_cases || 0,
  }
}

export function OSHA300LogPage() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showCertificationDialog, setShowCertificationDialog] = useState(false)
  const [hoursWorked, setHoursWorked] = useState<number>(0)
  const [averageEmployees, setAverageEmployees] = useState<number>(0)
  const [exporting, setExporting] = useState(false)

  const { showToast } = useToast()
  const { user } = useAuth()

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useProjects()

  // Fetch OSHA recordable incidents
  const { data: incidents = [], isLoading: incidentsLoading } = useIncidents({
    osha_recordable: true,
    date_from: `${selectedYear}-01-01`,
    date_to: `${selectedYear}-12-31`,
    project_id: selectedProjectId || undefined,
  })

  // Fetch OSHA 300A Summary
  const { data: summaryData } = useOSHA300ASummary(selectedYear, selectedProjectId || undefined)

  // Convert incidents to OSHA 300 log entries
  const oshaEntries = useMemo(() =>
    incidents.map(mapIncidentToOSHA300Entry),
    [incidents]
  )

  // Convert summary to display format
  const summary = useMemo(() =>
    mapSummaryToOSHA300A(summaryData, selectedYear),
    [summaryData, selectedYear]
  )

  // Generate year options (last 5 years)
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

  // Calculate OSHA statistics
  const totalCases = oshaEntries.length
  const deathCount = oshaEntries.filter(e => e.death).length
  const daysAwayCount = oshaEntries.filter(e => e.days_away_from_work).length
  const restrictedCount = oshaEntries.filter(e => e.job_transfer_restriction).length
  const otherRecordableCount = oshaEntries.filter(e => e.other_recordable).length

  // Get establishment name
  const establishmentName = selectedProjectId
    ? projects?.find(p => p.id === selectedProjectId)?.name || 'Unknown Project'
    : 'Company-wide'

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      const blob = await exportOSHA300ToExcel(oshaEntries, summary, {
        year: selectedYear,
        establishmentName,
        hoursWorked: hoursWorked > 0 ? hoursWorked : undefined,
        averageEmployees: averageEmployees > 0 ? averageEmployees : undefined,
      })
      downloadFile(blob, `OSHA_300_Log_${selectedYear}_${establishmentName.replace(/\s+/g, '_')}.xlsx`)
      showToast({
        type: 'success',
        title: 'Export Complete',
        message: 'OSHA 300 Log exported to Excel successfully.',
      })
      setShowExportDialog(false)
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export OSHA 300 Log. Please try again.',
      })
    } finally {
      setExporting(false)
    }
  }

  const handleExportCSV = () => {
    try {
      const csvContent = exportOSHA300ToCSV(oshaEntries, selectedYear)
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      downloadFile(blob, `OSHA_300_Log_${selectedYear}_${establishmentName.replace(/\s+/g, '_')}.csv`)
      showToast({
        type: 'success',
        title: 'Export Complete',
        message: 'OSHA 300 Log exported to CSV successfully.',
      })
      setShowExportDialog(false)
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export OSHA 300 Log. Please try again.',
      })
    }
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="h-7 w-7 text-red-600" />
              OSHA 300 Log
            </h1>
            <p className="text-gray-600 mt-1">
              Log of Work-Related Injuries and Illnesses
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="default"
              onClick={() => setShowCertificationDialog(true)}
              disabled={!summary}
            >
              <FileCheck2 className="h-4 w-4 mr-2" />
              Certify 300A
            </Button>
            <Button variant="outline" onClick={() => setShowSettingsDialog(true)}>
              <Settings2 className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" onClick={() => setShowExportDialog(true)}>
              <FileDown className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Compliance Notice */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">OSHA Recordkeeping Requirements</p>
                <p className="text-blue-700 mt-1">
                  Employers with 10+ employees must maintain OSHA 300 logs. The log must be
                  retained for 5 years. Post the 300A summary from Feb 1 - April 30 annually.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 300A Posting Deadline Banner */}
        {(() => {
          const today = new Date()
          const currentMonth = today.getMonth() + 1 // 1-12
          const isPreviousYearData = selectedYear < currentYear
          const isPostingPeriod = currentMonth >= 1 && currentMonth <= 4 // Jan-Apr
          const isJanuaryBeforePosting = currentMonth === 1 // January - prepare for Feb 1 posting

          // Show banner for previous year's data during posting period
          if (isPreviousYearData && (isPostingPeriod || isJanuaryBeforePosting)) {
            const isOverdue = currentMonth > 4 // After April 30
            const isActive = currentMonth >= 2 && currentMonth <= 4 // Feb 1 - Apr 30
            const isUpcoming = currentMonth === 1 // Before Feb 1

            return (
              <Alert className={isOverdue ? "border-red-500 bg-red-50" : isActive ? "border-orange-500 bg-orange-50" : "border-yellow-500 bg-yellow-50"}>
                <CalendarCheck className={`h-5 w-5 ${isOverdue ? "text-red-600" : isActive ? "text-orange-600" : "text-yellow-600"}`} />
                <AlertDescription className={isOverdue ? "text-red-800" : isActive ? "text-orange-800" : "text-yellow-800"}>
                  {isOverdue ? (
                    <span>
                      <strong>OVERDUE:</strong> The {selectedYear} OSHA 300A summary should have been posted from February 1 through April 30, {currentYear}.
                    </span>
                  ) : isActive ? (
                    <span>
                      <strong>POSTING REQUIRED:</strong> The {selectedYear} OSHA 300A summary must be posted in a conspicuous location until April 30, {currentYear}.
                      {!summary && ' Certify the 300A form to generate the required posting.'}
                    </span>
                  ) : (
                    <span>
                      <strong>UPCOMING DEADLINE:</strong> The {selectedYear} OSHA 300A summary must be certified and posted from February 1 through April 30, {currentYear}.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )
          }
          return null
        })()}

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Year Selector */}
              <div className="w-full md:w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calendar Year
                </label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project Selector */}
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Project / Establishment
                </label>
                <Select
                  value={selectedProjectId || 'all'}
                  onValueChange={(value) => setSelectedProjectId(value === 'all' ? '' : value)}
                  disabled={projectsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects (Company-wide)</SelectItem>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{totalCases}</p>
              <p className="text-sm text-gray-500">Total Cases</p>
            </CardContent>
          </Card>
          <Card className={deathCount > 0 ? 'border-red-300 bg-red-50' : ''}>
            <CardContent className="py-4 text-center">
              <p className={`text-3xl font-bold ${deathCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {deathCount}
              </p>
              <p className="text-sm text-gray-500">Deaths (G)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{daysAwayCount}</p>
              <p className="text-sm text-gray-500">Days Away (H)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{restrictedCount}</p>
              <p className="text-sm text-gray-500">Restricted (I)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{otherRecordableCount}</p>
              <p className="text-sm text-gray-500">Other (J)</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Log Component */}
        {incidentsLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
              <p className="text-gray-500 mt-4">Loading OSHA 300 log...</p>
            </CardContent>
          </Card>
        ) : oshaEntries.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Recordable Incidents</h3>
              <p className="text-gray-500">
                No OSHA recordable incidents for {selectedYear}
                {selectedProjectId ? ' on this project' : ' company-wide'}.
              </p>
              <p className="text-sm text-green-600 mt-2">
                Keep up the great safety record!
              </p>
            </CardContent>
          </Card>
        ) : (
          <OSHA300Log
            entries={oshaEntries}
            summary={summary}
            hoursWorked={hoursWorked}
            averageEmployees={averageEmployees}
            year={selectedYear}
            establishmentName={establishmentName}
            onExport={() => setShowExportDialog(true)}
          />
        )}
      </div>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export OSHA 300 Log</DialogTitle>
            <DialogDescription>
              Choose the export format for the OSHA 300 Log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Button
              onClick={handleExportExcel}
              disabled={exporting}
              className="w-full justify-start"
              variant="outline"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
              Export to Excel (.xlsx)
              <span className="ml-auto text-xs text-gray-500">Includes 300A Summary</span>
            </Button>
            <Button
              onClick={handleExportCSV}
              disabled={exporting}
              className="w-full justify-start"
              variant="outline"
            >
              <FileDown className="h-4 w-4 mr-2 text-blue-600" />
              Export to CSV
              <span className="ml-auto text-xs text-gray-500">Log data only</span>
            </Button>
            <div className="text-xs text-gray-500 mt-2">
              <p>Note: Set hours worked and employee count in Settings for accurate rate calculations.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>OSHA 300 Log Settings</DialogTitle>
            <DialogDescription>
              Configure establishment data for TRIR and DART rate calculations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="hoursWorked">Total Hours Worked ({selectedYear})</Label>
              <Input
                id="hoursWorked"
                type="number"
                min="0"
                value={hoursWorked || ''}
                onChange={(e) => setHoursWorked(parseInt(e.target.value) || 0)}
                placeholder="e.g., 250000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Total hours worked by all employees during the year
              </p>
            </div>
            <div>
              <Label htmlFor="avgEmployees">Average Number of Employees</Label>
              <Input
                id="avgEmployees"
                type="number"
                min="0"
                value={averageEmployees || ''}
                onChange={(e) => setAverageEmployees(parseInt(e.target.value) || 0)}
                placeholder="e.g., 125"
              />
              <p className="text-xs text-gray-500 mt-1">
                Annual average number of employees
              </p>
            </div>

            {hoursWorked > 0 && (
              <Card className="bg-gray-50">
                <CardContent className="py-3">
                  <p className="text-sm font-medium text-gray-700">Calculated Rates</p>
                  <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                    <div>
                      <span className="text-gray-600">TRIR:</span>
                      <span className="ml-2 font-bold">
                        {((totalCases * 200000) / hoursWorked).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">DART:</span>
                      <span className="ml-2 font-bold">
                        {(((daysAwayCount + restrictedCount) * 200000) / hoursWorked).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setShowSettingsDialog(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* OSHA 300A Certification Dialog */}
      {summary && user && (
        <OSHA300ACertificationDialog
          open={showCertificationDialog}
          onOpenChange={setShowCertificationDialog}
          summary={summary}
          companyId={user.company_id || ''}
          projectId={selectedProjectId || undefined}
          onCertificationComplete={() => {
            showToast({
              type: 'success',
              title: 'Form Certified',
              message: `OSHA 300A form for ${selectedYear} has been certified successfully.`,
            })
          }}
        />
      )}
    </AppLayout>
  )
}

export default OSHA300LogPage
