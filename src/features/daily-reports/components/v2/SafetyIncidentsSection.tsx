/**
 * SafetyIncidentsSection - CRITICAL component for OSHA compliance
 * Multi-stage form for comprehensive safety incident documentation
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Shield,
  AlertCircle,
  Pencil,
  Activity,
  User,
  FileText,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { useDailyReportStoreV2 } from '../../store/dailyReportStoreV2';
import type { IncidentType, SafetyIncident, CompletionStatus, EmployeeStatus } from '@/types/daily-reports-v2';

// Employee status options for OSHA 300 log scope
const EMPLOYEE_STATUS_OPTIONS: { value: EmployeeStatus; label: string }[] = [
  { value: 'direct_employee', label: 'Direct Employee' },
  { value: 'contractor', label: 'Contractor/Subcontractor' },
  { value: 'temp_worker', label: 'Temporary Worker' },
  { value: 'visitor', label: 'Visitor' },
];

// Incident types with severity-based colors (OSHA classification)
const INCIDENT_TYPES: {
  value: IncidentType;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  severity: number;
}[] = [
  {
    value: 'near_miss',
    label: 'Near Miss',
    description: 'Close call, no injury',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    severity: 1,
  },
  {
    value: 'first_aid',
    label: 'First Aid',
    description: 'Minor injury, first aid only',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    severity: 2,
  },
  {
    value: 'recordable',
    label: 'OSHA Recordable',
    description: 'Medical treatment beyond first aid',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    severity: 3,
  },
  {
    value: 'lost_time',
    label: 'Lost Time',
    description: 'Days away from work',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    severity: 4,
  },
  {
    value: 'fatality',
    label: 'Fatality',
    description: 'Death - OSHA notification required',
    color: 'text-red-900',
    bgColor: 'bg-red-200',
    severity: 5,
  },
];

const INCIDENT_CATEGORIES = [
  'fall',
  'struck_by',
  'caught_in',
  'electrical',
  'heat_stress',
  'chemical',
  'ergonomic',
  'vehicle',
  'other',
];

const BODY_PARTS = [
  'Head',
  'Face',
  'Eyes',
  'Neck',
  'Shoulder',
  'Arm',
  'Elbow',
  'Wrist',
  'Hand',
  'Fingers',
  'Back',
  'Chest',
  'Abdomen',
  'Hip',
  'Leg',
  'Knee',
  'Ankle',
  'Foot',
  'Toes',
  'Multiple',
];

interface SafetyIncidentsSectionProps {
  expanded: boolean;
  onToggle: () => void;
}

type FormStage = 'basic' | 'injury' | 'investigation' | 'notifications';

export function SafetyIncidentsSection({ expanded, onToggle }: SafetyIncidentsSectionProps) {
  const safetyIncidents = useDailyReportStoreV2((state) => state.safetyIncidents);
  const addSafetyIncident = useDailyReportStoreV2((state) => state.addSafetyIncident);
  const updateSafetyIncident = useDailyReportStoreV2((state) => state.updateSafetyIncident);
  const removeSafetyIncident = useDailyReportStoreV2((state) => state.removeSafetyIncident);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<SafetyIncident | null>(null);
  const [formStage, setFormStage] = useState<FormStage>('basic');

  // Form state for new/editing incident
  const [formData, setFormData] = useState<Partial<SafetyIncident>>({});

  // Calculate summary stats
  const stats = useMemo(() => {
    const recordableCount = safetyIncidents.filter((i) =>
      ['recordable', 'lost_time', 'fatality'].includes(i.incident_type)
    ).length;
    const pendingActions = safetyIncidents.filter(
      (i) => i.completion_status === 'pending' || i.completion_status === 'in_progress'
    ).length;
    return { recordableCount, pendingActions };
  }, [safetyIncidents]);

  const getIncidentTypeInfo = (type: IncidentType) => {
    return INCIDENT_TYPES.find((t) => t.value === type) || INCIDENT_TYPES[0];
  };

  const handleQuickAdd = useCallback((type: IncidentType) => {
    const isOshaReportable = ['recordable', 'lost_time', 'fatality'].includes(type);
    setFormData({
      incident_type: type,
      osha_reportable: isOshaReportable,
      completion_status: 'pending',
    });
    setFormStage('basic');
    setEditingIncident(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((incident: SafetyIncident) => {
    setFormData({ ...incident });
    setEditingIncident(incident);
    setFormStage('basic');
    setDialogOpen(true);
  }, []);

  const handleFormChange = useCallback((updates: Partial<SafetyIncident>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSave = useCallback(() => {
    if (editingIncident) {
      updateSafetyIncident(editingIncident.id, formData);
    } else {
      addSafetyIncident(formData);
    }
    setDialogOpen(false);
    setFormData({});
    setEditingIncident(null);
  }, [editingIncident, formData, addSafetyIncident, updateSafetyIncident]);

  const handleCancel = useCallback(() => {
    setDialogOpen(false);
    setFormData({});
    setEditingIncident(null);
    setFormStage('basic');
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (confirm('Are you sure you want to delete this incident?')) {
      removeSafetyIncident(id);
    }
  }, [removeSafetyIncident]);

  const canProceedToNext = useCallback(() => {
    switch (formStage) {
      case 'basic':
        return formData.incident_type && formData.description?.trim();
      case 'injury':
        // Injury details optional for near_miss
        return formData.incident_type === 'near_miss' || formData.injured_party_name;
      case 'investigation':
        return true; // Optional but recommended
      case 'notifications':
        return true;
      default:
        return false;
    }
  }, [formStage, formData]);

  const getStageIndex = (stage: FormStage) => {
    return ['basic', 'injury', 'investigation', 'notifications'].indexOf(stage);
  };

  const goToNextStage = useCallback(() => {
    const stages: FormStage[] = ['basic', 'injury', 'investigation', 'notifications'];
    const currentIndex = stages.indexOf(formStage);
    if (currentIndex < stages.length - 1) {
      setFormStage(stages[currentIndex + 1]);
    }
  }, [formStage]);

  const goToPrevStage = useCallback(() => {
    const stages: FormStage[] = ['basic', 'injury', 'investigation', 'notifications'];
    const currentIndex = stages.indexOf(formStage);
    if (currentIndex > 0) {
      setFormStage(stages[currentIndex - 1]);
    }
  }, [formStage]);

  const renderFormStage = () => {
    switch (formStage) {
      case 'basic':
        return (
          <div className="space-y-4">
            {/* Incident Type */}
            <div className="space-y-2">
              <Label>Incident Type *</Label>
              <Select
                value={formData.incident_type || ''}
                onValueChange={(value) => {
                  const isOshaReportable = ['recordable', 'lost_time', 'fatality'].includes(value);
                  handleFormChange({
                    incident_type: value as IncidentType,
                    osha_reportable: isOshaReportable,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select incident type" />
                </SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${type.bgColor}`} />
                        <span>{type.label}</span>
                        <span className="text-gray-400 text-xs">- {type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* OSHA Warning Banner */}
            {formData.osha_reportable && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-700">OSHA Reportable Incident</p>
                  <p className="text-sm text-red-600">
                    {formData.incident_type === 'fatality'
                      ? 'OSHA requires notification within 8 hours of fatality.'
                      : 'This incident must be recorded on OSHA 300 log.'}
                  </p>
                </div>
              </div>
            )}

            {/* Incident Category */}
            <div className="space-y-2">
              <Label>Incident Category</Label>
              <Select
                value={formData.incident_category || ''}
                onValueChange={(value) => handleFormChange({ incident_category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {INCIDENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time & Location */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Incident Time</Label>
                <Input
                  type="time"
                  value={formData.incident_time || ''}
                  onChange={(e) => handleFormChange({ incident_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  type="text"
                  value={formData.incident_location || ''}
                  onChange={(e) => handleFormChange({ incident_location: e.target.value })}
                  placeholder="e.g., 3rd floor, North wing"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description *</Label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleFormChange({ description: e.target.value })}
                placeholder="Describe what happened in detail..."
                className="w-full px-3 py-2 border rounded-lg text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case 'injury':
        return (
          <div className="space-y-4">
            {formData.incident_type === 'near_miss' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">
                  Near miss incidents don't require injury details. You may skip to the next section.
                </p>
              </div>
            )}

            {/* Injured Party Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Injured Party Name</Label>
                <Input
                  type="text"
                  value={formData.injured_party_name || ''}
                  onChange={(e) => handleFormChange({ injured_party_name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  type="text"
                  value={formData.injured_party_company || ''}
                  onChange={(e) => handleFormChange({ injured_party_company: e.target.value })}
                  placeholder="Company name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trade</Label>
                <Input
                  type="text"
                  value={formData.injured_party_trade || ''}
                  onChange={(e) => handleFormChange({ injured_party_trade: e.target.value })}
                  placeholder="e.g., Electrician, Carpenter"
                />
              </div>
              <div className="space-y-2">
                <Label>Employee Status (OSHA 300)</Label>
                <Select
                  value={formData.employee_status || ''}
                  onValueChange={(value) => handleFormChange({ employee_status: value as EmployeeStatus })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Injury Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type of Injury</Label>
                <Input
                  type="text"
                  value={formData.injury_type || ''}
                  onChange={(e) => handleFormChange({ injury_type: e.target.value })}
                  placeholder="e.g., Laceration, Sprain"
                />
              </div>
              <div className="space-y-2">
                <Label>Body Part Affected</Label>
                <Select
                  value={formData.body_part_affected || ''}
                  onValueChange={(value) => handleFormChange({ body_part_affected: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select body part" />
                  </SelectTrigger>
                  <SelectContent>
                    {BODY_PARTS.map((part) => (
                      <SelectItem key={part} value={part}>
                        {part}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Treatment */}
            <div className="space-y-2">
              <Label>Treatment Provided</Label>
              <textarea
                value={formData.treatment_provided || ''}
                onChange={(e) => handleFormChange({ treatment_provided: e.target.value })}
                placeholder="Describe first aid or medical treatment provided..."
                className="w-full px-3 py-2 border rounded-lg text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label>Medical Facility (if applicable)</Label>
              <Input
                type="text"
                value={formData.medical_facility || ''}
                onChange={(e) => handleFormChange({ medical_facility: e.target.value })}
                placeholder="e.g., City General Hospital"
              />
            </div>

            {/* Return to Work */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="returned_to_work"
                  checked={formData.returned_to_work || false}
                  onCheckedChange={(checked) =>
                    handleFormChange({ returned_to_work: checked as boolean })
                  }
                />
                <Label htmlFor="returned_to_work">Returned to work same day</Label>
              </div>
              {!formData.returned_to_work && (
                <div className="flex items-center gap-2">
                  <Label>Expected Return:</Label>
                  <Input
                    type="date"
                    value={formData.return_date || ''}
                    onChange={(e) => handleFormChange({ return_date: e.target.value })}
                    className="w-40"
                  />
                </div>
              )}
            </div>

            {/* OSHA DART Rate Fields - For recordable/lost time incidents */}
            {['recordable', 'lost_time', 'fatality'].includes(formData.incident_type || '') && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-700">OSHA DART Rate Tracking</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Days Away From Work</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.days_away_from_work || ''}
                      onChange={(e) => handleFormChange({ days_away_from_work: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500">Calendar days unable to work</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Days on Restricted Duty</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.days_on_restricted_duty || ''}
                      onChange={(e) => handleFormChange({ days_on_restricted_duty: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500">Days with work restrictions</p>
                  </div>
                </div>
              </div>
            )}

            {/* Hospitalization & Amputation Tracking - OSHA 24-hour reporting */}
            {['recordable', 'lost_time', 'fatality'].includes(formData.incident_type || '') && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-700">Severe Injury Tracking (OSHA 24-hour reporting)</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="hospitalized"
                        checked={formData.hospitalized || false}
                        onCheckedChange={(checked) =>
                          handleFormChange({ hospitalized: checked as boolean })
                        }
                      />
                      <div>
                        <Label htmlFor="hospitalized">In-Patient Hospitalization</Label>
                        <p className="text-xs text-amber-600 mt-1">
                          OSHA 24-hour reporting required
                        </p>
                      </div>
                    </div>
                    {formData.hospitalized && (
                      <div className="ml-6 space-y-2">
                        <Label>Number Hospitalized</Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.hospitalization_count || 1}
                          onChange={(e) => handleFormChange({ hospitalization_count: parseInt(e.target.value) || 1 })}
                        />
                        {(formData.hospitalization_count || 0) >= 3 && (
                          <p className="text-xs text-red-600 font-medium">
                            3+ workers hospitalized - OSHA notification required within 24 hours
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="amputation"
                        checked={formData.amputation || false}
                        onCheckedChange={(checked) =>
                          handleFormChange({ amputation: checked as boolean })
                        }
                      />
                      <div>
                        <Label htmlFor="amputation">Amputation Injury</Label>
                        <p className="text-xs text-amber-600 mt-1">
                          OSHA 24-hour reporting required
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Fatality Information - OSHA 8-hour reporting */}
            {formData.incident_type === 'fatality' && (
              <div className="p-4 bg-red-50 border-2 border-red-500 rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-bold text-red-700">FATALITY - OSHA 8-HOUR REPORTING REQUIRED</span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Date/Time of Death *</Label>
                    <Input
                      type="datetime-local"
                      value={formData.date_of_death || ''}
                      onChange={(e) => handleFormChange({ date_of_death: e.target.value })}
                    />
                  </div>

                  <div className="p-3 bg-white rounded border border-red-300 space-y-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="osha_notified"
                        checked={!!formData.osha_notification_timestamp}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleFormChange({
                              osha_notification_timestamp: new Date().toISOString(),
                              osha_notification_method: 'phone'
                            });
                          } else {
                            handleFormChange({
                              osha_notification_timestamp: undefined,
                              osha_notified_by: undefined,
                              osha_notification_method: undefined
                            });
                          }
                        }}
                      />
                      <div>
                        <Label htmlFor="osha_notified" className="text-red-700 font-medium">OSHA Has Been Notified</Label>
                        <p className="text-xs text-red-600">Call 1-800-321-OSHA within 8 hours of fatality</p>
                      </div>
                    </div>

                    {formData.osha_notification_timestamp && (
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-red-200">
                        <div className="space-y-2">
                          <Label>Notified By</Label>
                          <Input
                            type="text"
                            value={formData.osha_notified_by || ''}
                            onChange={(e) => handleFormChange({ osha_notified_by: e.target.value })}
                            placeholder="Name of person who called OSHA"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Method</Label>
                          <Select
                            value={formData.osha_notification_method || 'phone'}
                            onValueChange={(value) => handleFormChange({ osha_notification_method: value as 'phone' | 'online' | 'in_person' })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="phone">Phone (1-800-321-OSHA)</SelectItem>
                              <SelectItem value="online">Online Portal</SelectItem>
                              <SelectItem value="in_person">In Person</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-green-600">
                            OSHA notified at: {new Date(formData.osha_notification_timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {!formData.osha_notification_timestamp && (
                      <p className="text-xs text-red-700 font-medium">
                        You must report this fatality to OSHA by telephone (1-800-321-OSHA) within 8 hours.
                        Also notify: Project Manager, Safety Director, Legal, Insurance carrier.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'investigation':
        return (
          <div className="space-y-4">
            {/* Causes */}
            <div className="space-y-2">
              <Label>Immediate Cause</Label>
              <textarea
                value={formData.immediate_cause || ''}
                onChange={(e) => handleFormChange({ immediate_cause: e.target.value })}
                placeholder="What directly caused the incident?"
                className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label>Root Cause</Label>
              <textarea
                value={formData.root_cause || ''}
                onChange={(e) => handleFormChange({ root_cause: e.target.value })}
                placeholder="What underlying conditions allowed this to happen?"
                className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Label>Immediate Actions Taken</Label>
              <textarea
                value={formData.immediate_actions || ''}
                onChange={(e) => handleFormChange({ immediate_actions: e.target.value })}
                placeholder="What was done right after the incident?"
                className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label>Corrective Actions Required</Label>
              <textarea
                value={formData.corrective_actions || ''}
                onChange={(e) => handleFormChange({ corrective_actions: e.target.value })}
                placeholder="What needs to be done to prevent recurrence?"
                className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label>Preventive Measures</Label>
              <textarea
                value={formData.preventive_measures || ''}
                onChange={(e) => handleFormChange({ preventive_measures: e.target.value })}
                placeholder="Long-term changes to prevent similar incidents"
                className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Responsibility */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Responsible Party</Label>
                <Input
                  type="text"
                  value={formData.responsible_party || ''}
                  onChange={(e) => handleFormChange({ responsible_party: e.target.value })}
                  placeholder="Who is responsible for follow-up?"
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.completion_due_date || ''}
                  onChange={(e) => handleFormChange({ completion_due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.completion_status || 'pending'}
                onValueChange={(value) =>
                  handleFormChange({ completion_status: value as CompletionStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-4">
            {/* OSHA Section */}
            {formData.osha_reportable && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-red-700">OSHA Reporting Required</span>
                </div>
                <div className="space-y-2">
                  <Label>OSHA Case Number (if assigned)</Label>
                  <Input
                    type="text"
                    value={formData.osha_case_number || ''}
                    onChange={(e) => handleFormChange({ osha_case_number: e.target.value })}
                    placeholder="e.g., 2024-001"
                  />
                </div>
                {/* Privacy Case - OSHA allows name redaction for certain injuries */}
                <div className="flex items-start gap-3 pt-2 border-t border-red-200">
                  <Checkbox
                    id="privacy_case"
                    checked={formData.privacy_case || false}
                    onCheckedChange={(checked) =>
                      handleFormChange({ privacy_case: checked as boolean })
                    }
                  />
                  <div>
                    <Label htmlFor="privacy_case" className="text-red-700">Privacy Case</Label>
                    <p className="text-xs text-red-600 mt-1">
                      Check if employee name should be withheld from OSHA 300 log
                      (sexual assault, HIV, mental illness, or other sensitive conditions)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Reporting Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reported By</Label>
                <Input
                  type="text"
                  value={formData.reported_by || ''}
                  onChange={(e) => handleFormChange({ reported_by: e.target.value })}
                  placeholder="Name of person reporting"
                />
              </div>
              <div className="space-y-2">
                <Label>Reported At</Label>
                <Input
                  type="datetime-local"
                  value={formData.reported_at || ''}
                  onChange={(e) => handleFormChange({ reported_at: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reported To (comma-separated)</Label>
              <Input
                type="text"
                value={formData.reported_to?.join(', ') || ''}
                onChange={(e) =>
                  handleFormChange({
                    reported_to: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="e.g., Site Safety Manager, Project Manager"
              />
            </div>

            {/* Notifications */}
            <div className="space-y-3">
              <Label className="text-base">Notifications</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="client_notified"
                    checked={formData.client_notified || false}
                    onCheckedChange={(checked) =>
                      handleFormChange({ client_notified: checked as boolean })
                    }
                  />
                  <Label htmlFor="client_notified">Client Notified</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="insurance_notified"
                    checked={formData.insurance_notified || false}
                    onCheckedChange={(checked) =>
                      handleFormChange({ insurance_notified: checked as boolean })
                    }
                  />
                  <Label htmlFor="insurance_notified">Insurance Notified</Label>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getCompletionStatusIcon = (status: CompletionStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <>
      <Card className={stats.recordableCount > 0 ? 'border-red-200' : ''}>
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stats.recordableCount > 0 ? 'bg-red-100' : 'bg-orange-100'}`}>
              <Shield className={`h-5 w-5 ${stats.recordableCount > 0 ? 'text-red-600' : 'text-orange-600'}`} />
            </div>
            <div className="text-left">
              <CardTitle className="text-base flex items-center gap-2">
                Safety Incidents
                {safetyIncidents.length > 0 && (
                  <Badge variant={stats.recordableCount > 0 ? 'destructive' : 'secondary'}>
                    {safetyIncidents.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {stats.recordableCount > 0
                  ? `${stats.recordableCount} OSHA recordable incident${stats.recordableCount > 1 ? 's' : ''}`
                  : safetyIncidents.length > 0
                    ? `${safetyIncidents.length} incident${safetyIncidents.length > 1 ? 's' : ''} documented`
                    : 'Document near misses, first aid, and recordable incidents'}
              </CardDescription>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {expanded && (
          <CardContent className="border-t p-0">
            {/* Quick Add Buttons */}
            <div className="p-4 bg-gray-50 border-b">
              <div className="text-sm font-medium text-gray-700 mb-2">Log Incident:</div>
              <div className="flex flex-wrap gap-2">
                {INCIDENT_TYPES.map((type) => (
                  <Button
                    key={type.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAdd(type.value)}
                    className={`${type.bgColor} ${type.color} border-0 hover:opacity-80`}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Incident List */}
            <div className="divide-y">
              {safetyIncidents.map((incident) => {
                const typeInfo = getIncidentTypeInfo(incident.incident_type);
                return (
                  <div key={incident.id} className="p-4">
                    {/* OSHA Warning Banner */}
                    {incident.osha_reportable && (
                      <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium text-red-700">OSHA Recordable</span>
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${typeInfo.bgColor} ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        {incident.incident_time && (
                          <span className="text-sm text-gray-500">at {incident.incident_time}</span>
                        )}
                        {incident.incident_location && (
                          <span className="text-sm text-gray-500">- {incident.incident_location}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(incident)}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(incident.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-700 mb-3">{incident.description}</p>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {incident.injured_party_name && (
                        <div>
                          <span className="text-gray-500">Injured:</span>
                          <span className="ml-1 font-medium">{incident.injured_party_name}</span>
                        </div>
                      )}
                      {incident.injury_type && (
                        <div>
                          <span className="text-gray-500">Injury:</span>
                          <span className="ml-1">{incident.injury_type}</span>
                        </div>
                      )}
                      {incident.body_part_affected && (
                        <div>
                          <span className="text-gray-500">Body Part:</span>
                          <span className="ml-1">{incident.body_part_affected}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Status:</span>
                        {getCompletionStatusIcon(incident.completion_status)}
                        <span className="capitalize">{incident.completion_status}</span>
                      </div>
                    </div>

                    {/* Corrective Actions Preview */}
                    {incident.corrective_actions && (
                      <div className="mt-3 p-2 bg-blue-50 rounded">
                        <span className="text-xs font-medium text-blue-700">Corrective Actions:</span>
                        <p className="text-sm text-blue-600">{incident.corrective_actions}</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Empty State */}
              {safetyIncidents.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No safety incidents reported today.</p>
                  <p className="text-sm">Record near misses and incidents to maintain safety documentation.</p>
                </div>
              )}
            </div>

            {/* Summary Footer */}
            {safetyIncidents.length > 0 && (
              <div className="p-4 bg-gray-100 border-t">
                <div className="flex justify-between text-sm">
                  <span>
                    Total: {safetyIncidents.length} incident{safetyIncidents.length > 1 ? 's' : ''}
                  </span>
                  {stats.pendingActions > 0 && (
                    <span className="text-orange-600">
                      {stats.pendingActions} pending action{stats.pendingActions > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Multi-Stage Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {editingIncident ? 'Edit Safety Incident' : 'Log Safety Incident'}
            </DialogTitle>
            <DialogDescription>
              Document all incident details for safety records and OSHA compliance.
            </DialogDescription>
          </DialogHeader>

          {/* Stage Indicator */}
          <div className="flex items-center justify-between px-2 py-3 border-b">
            {[
              { key: 'basic', label: 'Basic Info', icon: Activity },
              { key: 'injury', label: 'Injury Details', icon: User },
              { key: 'investigation', label: 'Investigation', icon: FileText },
              { key: 'notifications', label: 'Notifications', icon: Bell },
            ].map((stage, index) => (
              <button
                key={stage.key}
                type="button"
                onClick={() => setFormStage(stage.key as FormStage)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded transition-colors ${
                  formStage === stage.key
                    ? 'bg-blue-100 text-blue-700'
                    : getStageIndex(stage.key as FormStage) < getStageIndex(formStage)
                      ? 'text-green-600'
                      : 'text-gray-400'
                }`}
              >
                <stage.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{stage.label}</span>
              </button>
            ))}
          </div>

          {/* Form Content */}
          <div className="py-4">{renderFormStage()}</div>

          <DialogFooter className="flex justify-between">
            <div>
              {formStage !== 'basic' && (
                <Button type="button" variant="outline" onClick={goToPrevStage}>
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              {formStage !== 'notifications' ? (
                <Button type="button" onClick={goToNextStage} disabled={!canProceedToNext()}>
                  Next
                </Button>
              ) : (
                <Button type="button" onClick={handleSave}>
                  {editingIncident ? 'Save Changes' : 'Log Incident'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SafetyIncidentsSection;
