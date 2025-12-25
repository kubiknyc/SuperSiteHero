/**
 * Equipment Ready-State Checklist Component
 * Pre-use inspection checklist with status tracking
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertTriangle,
  Truck,
  ClipboardCheck,
  Wrench,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  useEquipmentChecklistTemplateForType,
  useCompleteEquipmentChecklist,
} from '../hooks/useEquipmentDailyStatus';
import type {
  EquipmentDailyStatusWithEquipment,
  EquipmentChecklistResponse,
  EquipmentDailyStatusType,
  IssueSeverity,
  EquipmentChecklistItem,
} from '@/types/equipment-daily-status';
import {
  EQUIPMENT_DAILY_STATUS_LABELS,
  EQUIPMENT_DAILY_STATUS_COLORS,
  DEFAULT_EQUIPMENT_CHECKLIST_ITEMS,
} from '@/types/equipment-daily-status';

interface EquipmentReadyStateChecklistProps {
  equipmentStatus: EquipmentDailyStatusWithEquipment;
  onComplete?: () => void;
}

export function EquipmentReadyStateChecklist({
  equipmentStatus,
  onComplete,
}: EquipmentReadyStateChecklistProps) {
  const equipment = equipmentStatus.equipment;
  const equipmentType = equipment?.equipment_type || '';

  const { data: template, isLoading: isLoadingTemplate } =
    useEquipmentChecklistTemplateForType(equipmentType);

  const completeChecklist = useCompleteEquipmentChecklist();

  const [expanded, setExpanded] = useState(!equipmentStatus.checklist_completed);
  const [responses, setResponses] = useState<Map<string, EquipmentChecklistResponse>>(
    () => {
      // Initialize from existing inspection_items if present
      const map = new Map<string, EquipmentChecklistResponse>();
      if (equipmentStatus.inspection_items) {
        equipmentStatus.inspection_items.forEach((item) => {
          map.set(item.itemId, item);
        });
      }
      return map;
    }
  );
  const [issues, setIssues] = useState(equipmentStatus.issues_found || '');
  const [issueSeverity, setIssueSeverity] = useState<IssueSeverity | ''>(
    equipmentStatus.issue_severity || ''
  );
  const [maintenanceNotes, setMaintenanceNotes] = useState(
    equipmentStatus.maintenance_notes || ''
  );

  // Get checklist items - from template or defaults
  const checklistItems: EquipmentChecklistItem[] = useMemo(() => {
    if (template?.items && template.items.length > 0) {
      return template.items;
    }
    return DEFAULT_EQUIPMENT_CHECKLIST_ITEMS;
  }, [template]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups = new Map<string, EquipmentChecklistItem[]>();
    checklistItems.forEach((item) => {
      const category = item.category || 'General';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(item);
    });
    return groups;
  }, [checklistItems]);

  // Calculate completion stats
  const stats = useMemo(() => {
    const total = checklistItems.length;
    const answered = responses.size;
    const passed = Array.from(responses.values()).filter((r) => r.status === 'pass').length;
    const failed = Array.from(responses.values()).filter((r) => r.status === 'fail').length;
    const required = checklistItems.filter((i) => i.required).length;
    const requiredAnswered = checklistItems
      .filter((i) => i.required)
      .filter((i) => responses.has(i.id)).length;

    return { total, answered, passed, failed, required, requiredAnswered };
  }, [checklistItems, responses]);

  const canSubmit =
    stats.requiredAnswered === stats.required && stats.answered > 0;

  const handleResponseChange = (
    itemId: string,
    status: 'pass' | 'fail' | 'na',
    notes?: string
  ) => {
    setResponses((prev) => {
      const next = new Map(prev);
      next.set(itemId, { itemId, status, notes });
      return next;
    });
  };

  const handleSubmit = async () => {
    // Determine final status based on responses
    const hasFailures = stats.failed > 0;
    const hasIssues = issues.trim().length > 0;

    let finalStatus: EquipmentDailyStatusType = 'ready';
    if (hasFailures || (hasIssues && issueSeverity === 'critical')) {
      finalStatus = 'down';
    } else if (hasIssues || (hasFailures && issueSeverity === 'moderate')) {
      finalStatus = 'maintenance_required';
    }

    try {
      await completeChecklist.mutateAsync({
        id: equipmentStatus.id,
        dto: {
          inspection_items: Array.from(responses.values()),
          status: finalStatus,
          issues_found: issues || undefined,
          issue_severity: issueSeverity || undefined,
          requires_maintenance: hasFailures || hasIssues,
          maintenance_notes: maintenanceNotes || undefined,
        },
      });
      onComplete?.();
    } catch (error) {
      console.error('Failed to complete checklist:', error);
    }
  };

  const handleMarkAllPass = () => {
    const newResponses = new Map<string, EquipmentChecklistResponse>();
    checklistItems.forEach((item) => {
      newResponses.set(item.id, { itemId: item.id, status: 'pass' });
    });
    setResponses(newResponses);
  };

  if (isLoadingTemplate) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-disabled" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info-light rounded-lg">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Pre-Use Inspection
                {equipmentStatus.checklist_completed && (
                  <Badge
                    variant="secondary"
                    className={`bg-${EQUIPMENT_DAILY_STATUS_COLORS[equipmentStatus.status]}-100 text-${EQUIPMENT_DAILY_STATUS_COLORS[equipmentStatus.status]}-800`}
                  >
                    {EQUIPMENT_DAILY_STATUS_LABELS[equipmentStatus.status]}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {equipment?.equipment_number} - {equipment?.name}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!equipmentStatus.checklist_completed && (
              <Badge variant="outline">
                {stats.answered}/{stats.total} items
              </Badge>
            )}
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-disabled" />
            ) : (
              <ChevronDown className="h-5 w-5 text-disabled" />
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Equipment Info */}
          <div className="flex items-center gap-4 p-3 bg-surface rounded-lg text-sm">
            <Truck className="h-5 w-5 text-disabled" />
            <div className="flex-1">
              <span className="font-medium">{equipment?.make}</span>{' '}
              <span className="text-secondary">{equipment?.model}</span>
            </div>
            {equipment?.current_hours !== undefined && (
              <div className="text-secondary">
                <span className="font-medium">{equipment.current_hours.toFixed(1)}</span> hrs
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {!equipmentStatus.checklist_completed && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleMarkAllPass}
              >
                <CheckCircle2 className="h-4 w-4 mr-1 text-success" />
                Mark All Pass
              </Button>
            </div>
          )}

          {/* Checklist Items by Category */}
          <div className="space-y-4">
            {Array.from(groupedItems.entries()).map(([category, items]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-secondary mb-2 flex items-center gap-2 heading-card">
                  {category}
                  <Badge variant="outline" className="text-xs font-normal">
                    {items.filter((i) => responses.has(i.id)).length}/{items.length}
                  </Badge>
                </h4>
                <div className="space-y-2">
                  {items.map((item) => {
                    const response = responses.get(item.id);
                    return (
                      <ChecklistItemRow
                        key={item.id}
                        item={item}
                        response={response}
                        disabled={equipmentStatus.checklist_completed}
                        onChange={(status, notes) =>
                          handleResponseChange(item.id, status, notes)
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Issues Section */}
          {!equipmentStatus.checklist_completed && (
            <div className="border-t pt-4 space-y-3">
              <div>
                <Label htmlFor="issues" className="text-sm font-medium">
                  Issues Found (if any)
                </Label>
                <Textarea
                  id="issues"
                  placeholder="Describe any issues found during inspection..."
                  value={issues}
                  onChange={(e) => setIssues(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>

              {issues.trim() && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="severity" className="text-sm font-medium">
                      Issue Severity
                    </Label>
                    <Select
                      value={issueSeverity}
                      onValueChange={(value) =>
                        setIssueSeverity(value as IssueSeverity)
                      }
                    >
                      <SelectTrigger id="severity" className="mt-1">
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minor">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-yellow-400" />
                            Minor - Can continue use
                          </span>
                        </SelectItem>
                        <SelectItem value="moderate">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-400" />
                            Moderate - Schedule repair
                          </span>
                        </SelectItem>
                        <SelectItem value="critical">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-400" />
                            Critical - Do not operate
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="maintenance-notes" className="text-sm font-medium">
                      Maintenance Notes
                    </Label>
                    <Input
                      id="maintenance-notes"
                      placeholder="Additional notes for maintenance..."
                      value={maintenanceNotes}
                      onChange={(e) => setMaintenanceNotes(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Completed Status */}
          {equipmentStatus.checklist_completed && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 text-sm text-secondary">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Completed{' '}
                {equipmentStatus.checklist_completed_at &&
                  new Date(equipmentStatus.checklist_completed_at).toLocaleString()}
              </div>
              {equipmentStatus.issues_found && (
                <div className="mt-2 p-3 bg-warning-light rounded-lg text-sm">
                  <div className="flex items-center gap-2 font-medium text-yellow-800">
                    <AlertTriangle className="h-4 w-4" />
                    Issues Found
                  </div>
                  <p className="mt-1 text-yellow-700">{equipmentStatus.issues_found}</p>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          {!equipmentStatus.checklist_completed && (
            <div className="border-t pt-4">
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || completeChecklist.isPending}
                className="w-full"
              >
                {completeChecklist.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete Inspection
                  </>
                )}
              </Button>
              {!canSubmit && (
                <p className="text-xs text-muted text-center mt-2">
                  Complete all required items ({stats.requiredAnswered}/{stats.required})
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ChecklistItemRowProps {
  item: EquipmentChecklistItem;
  response?: EquipmentChecklistResponse;
  disabled: boolean;
  onChange: (status: 'pass' | 'fail' | 'na', notes?: string) => void;
}

function ChecklistItemRow({
  item,
  response,
  disabled,
  onChange,
}: ChecklistItemRowProps) {
  const [showNotes, setShowNotes] = useState(
    response?.status === 'fail' || !!response?.notes
  );

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-surface transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm">{item.label}</span>
          {item.required && (
            <span className="text-error text-xs">*</span>
          )}
        </div>
        {showNotes && (
          <Input
            placeholder="Add notes..."
            className="mt-2 h-8 text-sm"
            value={response?.notes || ''}
            onChange={(e) => onChange(response?.status || 'pass', e.target.value)}
            disabled={disabled}
          />
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            onChange('pass');
            setShowNotes(false);
          }}
          disabled={disabled}
          className={`p-2 rounded-full transition-colors ${
            response?.status === 'pass'
              ? 'bg-success-light text-success'
              : 'text-gray-300 hover:text-success hover:bg-success-light'
          }`}
        >
          <CheckCircle2 className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => {
            onChange('fail');
            setShowNotes(true);
          }}
          disabled={disabled}
          className={`p-2 rounded-full transition-colors ${
            response?.status === 'fail'
              ? 'bg-error-light text-error'
              : 'text-gray-300 hover:text-error hover:bg-error-light'
          }`}
        >
          <XCircle className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => {
            onChange('na');
            setShowNotes(false);
          }}
          disabled={disabled}
          className={`p-2 rounded-full transition-colors ${
            response?.status === 'na'
              ? 'bg-muted text-secondary'
              : 'text-gray-300 hover:text-muted hover:bg-muted'
          }`}
        >
          <MinusCircle className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default EquipmentReadyStateChecklist;
