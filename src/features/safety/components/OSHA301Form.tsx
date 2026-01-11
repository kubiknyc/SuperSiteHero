/**
 * OSHA 301 Form - Injury and Illness Incident Report
 *
 * This form is the official OSHA Form 301 used to report individual work-related
 * injuries and illnesses. One form must be completed for each recordable case.
 *
 * Required information:
 * - Employee information
 * - Physician/health care provider information
 * - Case details (date, time, location)
 * - Injury/illness description
 * - What object or substance harmed the employee
 * - What the employee was doing when hurt
 */

import { useState, useRef } from 'react'
import { format } from 'date-fns'
import {
  FileText,
  User,
  Building2,
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
  AlertTriangle,
  Printer,
  Download,
  CheckCircle,
  X,
} from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { SafetyIncident } from '@/types/safety-incidents'

// =============================================
// Types
// =============================================

interface OSHA301FormProps {
  incident?: SafetyIncident | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (data: OSHA301FormData) => Promise<void>
  readOnly?: boolean
  className?: string
}

export interface OSHA301FormData {
  // Case Information
  case_number: string
  establishment_name: string

  // Employee Information
  employee_name: string
  employee_address: string
  employee_city_state_zip: string
  employee_dob: string
  employee_hire_date: string
  employee_gender: 'male' | 'female' | 'other' | ''

  // Physician Information
  physician_name: string
  physician_address: string
  physician_city_state_zip: string
  was_treated_in_er: boolean
  was_hospitalized_overnight: boolean

  // Case Details
  incident_date: string
  incident_time: string
  time_began_work: string
  incident_location: string

  // Description
  what_employee_doing: string
  how_injury_occurred: string
  what_object_substance: string
  injury_illness_type: string
  body_part_affected: string

  // Classification
  death_date: string
  days_away_from_work: number
  days_job_transfer: number

  // Completed By
  completed_by_name: string
  completed_by_title: string
  completed_date: string
  completed_phone: string
}

// =============================================
// Helper Functions
// =============================================

function convertIncidentToFormData(incident: SafetyIncident | null | undefined): Partial<OSHA301FormData> {
  if (!incident) {return {}}

  return {
    case_number: incident.case_number || '',
    establishment_name: incident.project?.name || '',
    employee_name: incident.employee_name || '',
    employee_dob: incident.employee_dob || '',
    employee_hire_date: incident.employee_hire_date || '',
    employee_gender: (incident.employee_gender as any) || '',
    incident_date: incident.incident_date || '',
    incident_time: incident.incident_time || '',
    time_began_work: incident.time_began_work || '',
    incident_location: incident.location || '',
    what_employee_doing: incident.task_being_performed || '',
    how_injury_occurred: incident.description || '',
    what_object_substance: incident.object_substance || '',
    injury_illness_type: incident.nature_of_injury || '',
    body_part_affected: incident.body_part_affected || '',
    death_date: incident.death_date || '',
    days_away_from_work: incident.days_away_from_work || 0,
    days_job_transfer: incident.days_restricted_duty || 0,
    physician_name: incident.treating_physician || '',
    was_treated_in_er: incident.emergency_room_visit || false,
    was_hospitalized_overnight: incident.hospitalized_overnight || false,
  }
}

// =============================================
// Main Component
// =============================================

export function OSHA301Form({
  incident,
  open,
  onOpenChange,
  onSave,
  readOnly = false,
  className,
}: OSHA301FormProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const initialData = convertIncidentToFormData(incident)
  const [formData, setFormData] = useState<Partial<OSHA301FormData>>(initialData)

  const updateField = <K extends keyof OSHA301FormData>(
    field: K,
    value: OSHA301FormData[K]
  ) => {
    if (readOnly) {return}
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handlePrint = () => {
    window.print()
  }

  const handleSave = async () => {
    if (!onSave) {return}

    setSaving(true)
    try {
      await onSave(formData as OSHA301FormData)
      toast.success('OSHA 301 form saved')
    } catch (error) {
      toast.error('Failed to save form')
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            OSHA Form 301 - Injury and Illness Incident Report
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className={cn('space-y-6', className)}>
          {/* Header for Print */}
          <div className="hidden print:block border-b pb-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">OSHA's Form 301</h1>
                <p className="text-sm text-muted-foreground">
                  Injury and Illness Incident Report
                </p>
              </div>
              <div className="text-right text-sm">
                <p>U.S. Department of Labor</p>
                <p>Occupational Safety and Health Administration</p>
              </div>
            </div>
          </div>

          {/* Case Information */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Information About the Case
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label>Case Number (from Log 300)</Label>
                <Input
                  value={formData.case_number || ''}
                  onChange={(e) => updateField('case_number', e.target.value)}
                  placeholder="e.g., 2024-001"
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label>Establishment Name</Label>
                <Input
                  value={formData.establishment_name || ''}
                  onChange={(e) => updateField('establishment_name', e.target.value)}
                  placeholder="Company/Project name"
                  disabled={readOnly}
                />
              </div>
            </CardContent>
          </Card>

          {/* Employee Information */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Information About the Employee
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={formData.employee_name || ''}
                    onChange={(e) => updateField('employee_name', e.target.value)}
                    placeholder="Employee's full legal name"
                    disabled={readOnly}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Street Address</Label>
                  <Input
                    value={formData.employee_address || ''}
                    onChange={(e) => updateField('employee_address', e.target.value)}
                    placeholder="Street address"
                    disabled={readOnly}
                  />
                </div>
                <div className="col-span-2">
                  <Label>City, State, ZIP</Label>
                  <Input
                    value={formData.employee_city_state_zip || ''}
                    onChange={(e) => updateField('employee_city_state_zip', e.target.value)}
                    placeholder="City, State ZIP"
                    disabled={readOnly}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Date of Birth
                  </Label>
                  <Input
                    type="date"
                    value={formData.employee_dob || ''}
                    onChange={(e) => updateField('employee_dob', e.target.value)}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Date Hired
                  </Label>
                  <Input
                    type="date"
                    value={formData.employee_hire_date || ''}
                    onChange={(e) => updateField('employee_hire_date', e.target.value)}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select
                    value={formData.employee_gender || ''}
                    onValueChange={(value) => updateField('employee_gender', value as any)}
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Physician Information */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Information About the Physician or Health Care Provider
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Name of Physician or Other Health Care Professional</Label>
                <Input
                  value={formData.physician_name || ''}
                  onChange={(e) => updateField('physician_name', e.target.value)}
                  placeholder="Physician name"
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label>Facility Address (if treated away from worksite)</Label>
                <Input
                  value={formData.physician_address || ''}
                  onChange={(e) => updateField('physician_address', e.target.value)}
                  placeholder="Street address"
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label>City, State, ZIP</Label>
                <Input
                  value={formData.physician_city_state_zip || ''}
                  onChange={(e) => updateField('physician_city_state_zip', e.target.value)}
                  placeholder="City, State ZIP"
                  disabled={readOnly}
                />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.was_treated_in_er || false}
                    onChange={(e) => updateField('was_treated_in_er', e.target.checked)}
                    disabled={readOnly}
                    className="h-4 w-4"
                  />
                  <span>Was employee treated in emergency room?</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.was_hospitalized_overnight || false}
                    onChange={(e) => updateField('was_hospitalized_overnight', e.target.checked)}
                    disabled={readOnly}
                    className="h-4 w-4"
                  />
                  <span>Was employee hospitalized overnight?</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Incident Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Information About the Case
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Date of Injury/Illness *
                  </Label>
                  <Input
                    type="date"
                    value={formData.incident_date || ''}
                    onChange={(e) => updateField('incident_date', e.target.value)}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Time of Event
                  </Label>
                  <Input
                    type="time"
                    value={formData.incident_time || ''}
                    onChange={(e) => updateField('incident_time', e.target.value)}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Time Employee Began Work
                  </Label>
                  <Input
                    type="time"
                    value={formData.time_began_work || ''}
                    onChange={(e) => updateField('time_began_work', e.target.value)}
                    disabled={readOnly}
                  />
                </div>
              </div>

              <div>
                <Label>Where did the event occur? *</Label>
                <Input
                  value={formData.incident_location || ''}
                  onChange={(e) => updateField('incident_location', e.target.value)}
                  placeholder="e.g., Loading dock at north end of warehouse"
                  disabled={readOnly}
                />
              </div>

              <Separator />

              <div>
                <Label>What was the employee doing just before the incident occurred? *</Label>
                <p className="text-xs text-muted-foreground mb-1">
                  Describe the activity, as well as the tools, equipment, or material the employee was using.
                </p>
                <Textarea
                  value={formData.what_employee_doing || ''}
                  onChange={(e) => updateField('what_employee_doing', e.target.value)}
                  placeholder="e.g., Employee was carrying a bundle of steel rods to the staging area..."
                  rows={3}
                  disabled={readOnly}
                />
              </div>

              <div>
                <Label>What happened? *</Label>
                <p className="text-xs text-muted-foreground mb-1">
                  Tell us how the injury occurred.
                </p>
                <Textarea
                  value={formData.how_injury_occurred || ''}
                  onChange={(e) => updateField('how_injury_occurred', e.target.value)}
                  placeholder="e.g., Employee tripped over uneven flooring and fell, landing on right knee..."
                  rows={3}
                  disabled={readOnly}
                />
              </div>

              <div>
                <Label>What object or substance directly harmed the employee?</Label>
                <p className="text-xs text-muted-foreground mb-1">
                  e.g., concrete floor, chlorine, radial arm saw
                </p>
                <Input
                  value={formData.what_object_substance || ''}
                  onChange={(e) => updateField('what_object_substance', e.target.value)}
                  placeholder="Object or substance"
                  disabled={readOnly}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>What was the injury or illness? *</Label>
                  <p className="text-xs text-muted-foreground mb-1">
                    e.g., second degree burns, broken arm, carpal tunnel syndrome
                  </p>
                  <Input
                    value={formData.injury_illness_type || ''}
                    onChange={(e) => updateField('injury_illness_type', e.target.value)}
                    placeholder="Type of injury/illness"
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label>What part(s) of the body was affected? *</Label>
                  <p className="text-xs text-muted-foreground mb-1">
                    e.g., right hand, lower back, left eye
                  </p>
                  <Input
                    value={formData.body_part_affected || ''}
                    onChange={(e) => updateField('body_part_affected', e.target.value)}
                    placeholder="Body part(s)"
                    disabled={readOnly}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Classification */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Outcome</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div>
                <Label>Date of Death (if applicable)</Label>
                <Input
                  type="date"
                  value={formData.death_date || ''}
                  onChange={(e) => updateField('death_date', e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label>Days Away from Work</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.days_away_from_work || ''}
                  onChange={(e) => updateField('days_away_from_work', parseInt(e.target.value) || 0)}
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label>Days of Job Transfer/Restriction</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.days_job_transfer || ''}
                  onChange={(e) => updateField('days_job_transfer', parseInt(e.target.value) || 0)}
                  disabled={readOnly}
                />
              </div>
            </CardContent>
          </Card>

          {/* Completed By */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Completed By</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={formData.completed_by_name || ''}
                  onChange={(e) => updateField('completed_by_name', e.target.value)}
                  placeholder="Your name"
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.completed_by_title || ''}
                  onChange={(e) => updateField('completed_by_title', e.target.value)}
                  placeholder="Your title"
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.completed_phone || ''}
                  onChange={(e) => updateField('completed_phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label>Date Completed</Label>
                <Input
                  type="date"
                  value={formData.completed_date || format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => updateField('completed_date', e.target.value)}
                  disabled={readOnly}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Notice */}
          <div className="text-xs text-muted-foreground border-t pt-4">
            <p className="font-medium mb-1">Privacy Case Notice</p>
            <p>
              If a case is a "privacy concern case" (involving an intimate body part or
              sexual assault, HIV infection, mental illness, etc.), you may not enter the
              employee's name on the 300 Log. Instead, enter "privacy case" and the case
              number. Keep a separate, confidential list of case numbers and employee names.
            </p>
          </div>
        </div>

        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" />
            Close
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          {!readOnly && onSave && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Save Form
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default OSHA301Form
