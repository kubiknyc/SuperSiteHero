/**
 * InspectionsSection - Track inspections and their results
 * Supports building official, owner, third-party, and internal inspections
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
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { useDailyReportStoreV2 } from '../../store/dailyReportStoreV2';
import type { InspectionResult, InspectionCategory, InspectionEntry } from '@/types/daily-reports-v2';

// Inspection result configurations
const INSPECTION_RESULTS: {
  value: InspectionResult;
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'pass',
    label: 'Pass',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  {
    value: 'fail',
    label: 'Fail',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: <XCircle className="h-4 w-4" />,
  },
  {
    value: 'conditional',
    label: 'Conditional',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  {
    value: 'scheduled',
    label: 'Scheduled',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: <XCircle className="h-4 w-4" />,
  },
  {
    value: 'rescheduled',
    label: 'Rescheduled',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: <RotateCcw className="h-4 w-4" />,
  },
];

const INSPECTION_CATEGORIES: { value: InspectionCategory; label: string }[] = [
  { value: 'building_official', label: 'Building Official' },
  { value: 'owner', label: 'Owner' },
  { value: 'third_party', label: 'Third Party' },
  { value: 'internal', label: 'Internal QC' },
];

const COMMON_INSPECTION_TYPES = [
  'Footing/Foundation',
  'Rough Framing',
  'Rough Electrical',
  'Rough Plumbing',
  'Rough Mechanical',
  'Insulation',
  'Drywall',
  'Final Electrical',
  'Final Plumbing',
  'Final Mechanical',
  'Fire Alarm',
  'Fire Sprinkler',
  'Concrete',
  'Steel/Structural',
  'Roofing',
  'Waterproofing',
  'ADA Compliance',
  'Final Building',
  'Certificate of Occupancy',
];

interface InspectionsSectionProps {
  expanded: boolean;
  onToggle: () => void;
}

export function InspectionsSection({ expanded, onToggle }: InspectionsSectionProps) {
  const inspections = useDailyReportStoreV2((state) => state.inspections);
  const addInspection = useDailyReportStoreV2((state) => state.addInspection);
  const updateInspection = useDailyReportStoreV2((state) => state.updateInspection);
  const removeInspection = useDailyReportStoreV2((state) => state.removeInspection);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<InspectionEntry | null>(null);
  const [formData, setFormData] = useState<Partial<InspectionEntry>>({});
  const [showCustomType, setShowCustomType] = useState(false);

  // Calculate summary stats
  const stats = useMemo(() => {
    const passed = inspections.filter((i) => i.result === 'pass').length;
    const failed = inspections.filter((i) => i.result === 'fail').length;
    const conditional = inspections.filter((i) => i.result === 'conditional').length;
    const pending = inspections.filter((i) => i.reinspection_required).length;
    return { passed, failed, conditional, pending };
  }, [inspections]);

  const getResultInfo = (result?: InspectionResult) => {
    return INSPECTION_RESULTS.find((r) => r.value === result) || INSPECTION_RESULTS[3]; // Default to 'scheduled'
  };

  const handleAdd = useCallback(() => {
    setFormData({
      inspection_category: 'building_official',
      reinspection_required: false,
    });
    setEditingInspection(null);
    setShowCustomType(false);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((inspection: InspectionEntry) => {
    setFormData({ ...inspection });
    setEditingInspection(inspection);
    setShowCustomType(!COMMON_INSPECTION_TYPES.includes(inspection.inspection_type));
    setDialogOpen(true);
  }, []);

  const handleFormChange = useCallback((updates: Partial<InspectionEntry>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSave = useCallback(() => {
    if (!formData.inspection_type) {return;}

    if (editingInspection) {
      updateInspection(editingInspection.id, formData);
    } else {
      addInspection(formData);
    }
    setDialogOpen(false);
    setFormData({});
    setEditingInspection(null);
  }, [editingInspection, formData, addInspection, updateInspection]);

  const handleCancel = useCallback(() => {
    setDialogOpen(false);
    setFormData({});
    setEditingInspection(null);
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (confirm('Are you sure you want to delete this inspection?')) {
      removeInspection(id);
    }
  }, [removeInspection]);

  const getCategoryLabel = (category?: InspectionCategory) => {
    return INSPECTION_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  return (
    <>
      <Card className={stats.failed > 0 ? 'border-red-200' : ''}>
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stats.failed > 0 ? 'bg-red-100' : 'bg-blue-100'}`}>
              <ClipboardCheck className={`h-5 w-5 ${stats.failed > 0 ? 'text-red-600' : 'text-blue-600'}`} />
            </div>
            <div className="text-left">
              <CardTitle className="text-base flex items-center gap-2">
                Inspections
                {inspections.length > 0 && (
                  <div className="flex gap-1">
                    {stats.passed > 0 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        {stats.passed} passed
                      </Badge>
                    )}
                    {stats.failed > 0 && (
                      <Badge variant="destructive">{stats.failed} failed</Badge>
                    )}
                    {stats.conditional > 0 && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                        {stats.conditional} conditional
                      </Badge>
                    )}
                  </div>
                )}
              </CardTitle>
              <CardDescription>
                {inspections.length > 0
                  ? `${inspections.length} inspection${inspections.length > 1 ? 's' : ''} documented`
                  : 'Track building, owner, and third-party inspections'}
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
            {/* Add Button */}
            <div className="p-4 bg-gray-50 border-b">
              <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-1" />
                Add Inspection
              </Button>
            </div>

            {/* Inspections Table/List */}
            <div className="divide-y">
              {inspections.map((inspection) => {
                const resultInfo = getResultInfo(inspection.result);
                return (
                  <div key={inspection.id} className="p-4">
                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{inspection.inspection_type}</span>
                        <span className="text-sm text-gray-500">
                          ({getCategoryLabel(inspection.inspection_category)})
                        </span>
                        {inspection.result && (
                          <span
                            className={`px-2 py-0.5 rounded text-sm font-medium flex items-center gap-1 ${resultInfo.bgColor} ${resultInfo.color}`}
                          >
                            {resultInfo.icon}
                            {resultInfo.label}
                          </span>
                        )}
                        {inspection.reinspection_required && (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            Reinspection Required
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(inspection)}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(inspection.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-2">
                      {inspection.inspector_name && (
                        <div>
                          <span className="text-gray-500">Inspector:</span>
                          <span className="ml-1">{inspection.inspector_name}</span>
                        </div>
                      )}
                      {inspection.inspector_company && (
                        <div>
                          <span className="text-gray-500">Company:</span>
                          <span className="ml-1">{inspection.inspector_company}</span>
                        </div>
                      )}
                      {inspection.inspection_time && (
                        <div>
                          <span className="text-gray-500">Time:</span>
                          <span className="ml-1">{inspection.inspection_time}</span>
                        </div>
                      )}
                      {inspection.permit_number && (
                        <div>
                          <span className="text-gray-500">Permit #:</span>
                          <span className="ml-1">{inspection.permit_number}</span>
                        </div>
                      )}
                    </div>

                    {/* Deficiencies */}
                    {inspection.deficiencies_noted && (
                      <div className="p-2 bg-red-50 rounded mb-2">
                        <span className="text-xs font-medium text-red-700">Deficiencies:</span>
                        <p className="text-sm text-red-600">{inspection.deficiencies_noted}</p>
                      </div>
                    )}

                    {/* Conditions */}
                    {inspection.pass_with_conditions && (
                      <div className="p-2 bg-yellow-50 rounded mb-2">
                        <span className="text-xs font-medium text-yellow-700">Conditions:</span>
                        <p className="text-sm text-yellow-600">{inspection.pass_with_conditions}</p>
                      </div>
                    )}

                    {/* Corrective Actions */}
                    {inspection.corrective_actions_required && (
                      <div className="p-2 bg-blue-50 rounded">
                        <span className="text-xs font-medium text-blue-700">Corrective Actions:</span>
                        <p className="text-sm text-blue-600">{inspection.corrective_actions_required}</p>
                      </div>
                    )}

                    {/* Reinspection Date */}
                    {inspection.reinspection_date && (
                      <div className="mt-2 text-sm text-orange-600">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        Reinspection: {inspection.reinspection_date}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Empty State */}
              {inspections.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <ClipboardCheck className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No inspections scheduled or completed today.</p>
                  <p className="text-sm">Add inspections to track permit compliance.</p>
                </div>
              )}
            </div>

            {/* Summary Footer */}
            {inspections.length > 0 && (
              <div className="p-4 bg-gray-100 border-t">
                <div className="flex justify-between text-sm">
                  <span>
                    Total: {inspections.length} inspection{inspections.length > 1 ? 's' : ''}
                  </span>
                  {stats.pending > 0 && (
                    <span className="text-orange-600">
                      {stats.pending} reinspection{stats.pending > 1 ? 's' : ''} required
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Inspection Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              {editingInspection ? 'Edit Inspection' : 'Add Inspection'}
            </DialogTitle>
            <DialogDescription>
              Record inspection details and results.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Inspection Type */}
            <div className="space-y-2">
              <Label>Inspection Type *</Label>
              {!showCustomType ? (
                <div className="space-y-2">
                  <Select
                    value={formData.inspection_type || ''}
                    onValueChange={(value) => {
                      if (value === '__custom__') {
                        setShowCustomType(true);
                        handleFormChange({ inspection_type: '' });
                      } else {
                        handleFormChange({ inspection_type: value });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select inspection type" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_INSPECTION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">Other (custom)...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={formData.inspection_type || ''}
                    onChange={(e) => handleFormChange({ inspection_type: e.target.value })}
                    placeholder="Enter inspection type"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomType(false)}
                  >
                    Use List
                  </Button>
                </div>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.inspection_category || ''}
                onValueChange={(value) =>
                  handleFormChange({ inspection_category: value as InspectionCategory })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {INSPECTION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Inspector Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inspector Name</Label>
                <Input
                  type="text"
                  value={formData.inspector_name || ''}
                  onChange={(e) => handleFormChange({ inspector_name: e.target.value })}
                  placeholder="Inspector's name"
                />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  type="text"
                  value={formData.inspector_company || ''}
                  onChange={(e) => handleFormChange({ inspector_company: e.target.value })}
                  placeholder="Company/Agency"
                />
              </div>
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label>Inspection Time</Label>
              <Input
                type="time"
                value={formData.inspection_time || ''}
                onChange={(e) => handleFormChange({ inspection_time: e.target.value })}
                className="w-40"
              />
            </div>

            {/* Result */}
            <div className="space-y-2">
              <Label>Result</Label>
              <div className="flex flex-wrap gap-2">
                {INSPECTION_RESULTS.map((result) => (
                  <Button
                    key={result.value}
                    type="button"
                    variant={formData.result === result.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFormChange({ result: result.value })}
                    className={
                      formData.result === result.value
                        ? ''
                        : `${result.bgColor} ${result.color} border-0 hover:opacity-80`
                    }
                  >
                    {result.icon}
                    <span className="ml-1">{result.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Conditional - Pass with Conditions */}
            {formData.result === 'conditional' && (
              <div className="space-y-2">
                <Label>Conditions for Approval</Label>
                <textarea
                  value={formData.pass_with_conditions || ''}
                  onChange={(e) => handleFormChange({ pass_with_conditions: e.target.value })}
                  placeholder="What conditions must be met?"
                  className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Deficiencies (for fail/conditional) */}
            {(formData.result === 'fail' || formData.result === 'conditional') && (
              <div className="space-y-2">
                <Label>Deficiencies Noted</Label>
                <textarea
                  value={formData.deficiencies_noted || ''}
                  onChange={(e) => handleFormChange({ deficiencies_noted: e.target.value })}
                  placeholder="List all deficiencies found..."
                  className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Corrective Actions */}
            {(formData.result === 'fail' || formData.result === 'conditional') && (
              <div className="space-y-2">
                <Label>Corrective Actions Required</Label>
                <textarea
                  value={formData.corrective_actions_required || ''}
                  onChange={(e) => handleFormChange({ corrective_actions_required: e.target.value })}
                  placeholder="What needs to be done to pass?"
                  className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Reinspection */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="reinspection_required"
                  checked={formData.reinspection_required || false}
                  onCheckedChange={(checked) =>
                    handleFormChange({ reinspection_required: checked as boolean })
                  }
                />
                <Label htmlFor="reinspection_required">Reinspection Required</Label>
              </div>
              {formData.reinspection_required && (
                <div className="flex items-center gap-2">
                  <Label>Date:</Label>
                  <Input
                    type="date"
                    value={formData.reinspection_date || ''}
                    onChange={(e) => handleFormChange({ reinspection_date: e.target.value })}
                    className="w-40"
                  />
                </div>
              )}
            </div>

            {/* Permit Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Permit Number</Label>
                <Input
                  type="text"
                  value={formData.permit_number || ''}
                  onChange={(e) => handleFormChange({ permit_number: e.target.value })}
                  placeholder="Permit #"
                />
              </div>
              <div className="space-y-2">
                <Label>Permit Type</Label>
                <Input
                  type="text"
                  value={formData.permit_type || ''}
                  onChange={(e) => handleFormChange({ permit_type: e.target.value })}
                  placeholder="e.g., Building, Electrical"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => handleFormChange({ notes: e.target.value })}
                placeholder="Any additional observations or notes..."
                className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!formData.inspection_type?.trim()}
            >
              {editingInspection ? 'Save Changes' : 'Add Inspection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default InspectionsSection;
