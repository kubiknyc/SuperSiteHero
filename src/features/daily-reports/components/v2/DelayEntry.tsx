/**
 * DelayEntry - Quick entry component for tracking delays
 * Critical for construction claims and schedule defense
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertTriangle,
  CloudRain,
  Users,
  Truck,
  FileQuestion,
  Building,
  Wrench,
} from 'lucide-react';
import { useDailyReportStoreV2 } from '../../store/dailyReportStoreV2';
import type { DelayType, DelayCategory } from '@/types/daily-reports-v2';

const DELAY_TYPES: { value: DelayType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'owner', label: 'Owner', icon: <Building className="h-4 w-4" />, color: 'bg-purple-100 text-purple-700' },
  { value: 'contractor', label: 'Contractor', icon: <Wrench className="h-4 w-4" />, color: 'bg-info-light text-primary-hover' },
  { value: 'weather', label: 'Weather', icon: <CloudRain className="h-4 w-4" />, color: 'bg-cyan-100 text-cyan-700' },
  { value: 'material', label: 'Material', icon: <Truck className="h-4 w-4" />, color: 'bg-orange-100 text-orange-700' },
  { value: 'labor', label: 'Labor', icon: <Users className="h-4 w-4" />, color: 'bg-success-light text-success-dark' },
  { value: 'design', label: 'Design/RFI', icon: <FileQuestion className="h-4 w-4" />, color: 'bg-warning-light text-yellow-700' },
  { value: 'inspection', label: 'Inspection', icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-error-light text-error-dark' },
  { value: 'other', label: 'Other', icon: <Clock className="h-4 w-4" />, color: 'bg-muted text-secondary' },
];

const DELAY_CATEGORIES: { value: DelayCategory; label: string; description: string }[] = [
  { value: 'excusable_compensable', label: 'Excusable & Compensable', description: 'Time extension + cost recovery' },
  { value: 'excusable_non_compensable', label: 'Excusable Only', description: 'Time extension, no cost recovery' },
  { value: 'non_excusable', label: 'Non-Excusable', description: 'No relief available' },
];

interface DelayEntrySectionProps {
  expanded: boolean;
  onToggle: () => void;
}

export function DelayEntrySection({ expanded, onToggle }: DelayEntrySectionProps) {
  const delays = useDailyReportStoreV2((state) => state.delays);
  const addDelayEntry = useDailyReportStoreV2((state) => state.addDelayEntry);
  const updateDelayEntry = useDailyReportStoreV2((state) => state.updateDelayEntry);
  const removeDelayEntry = useDailyReportStoreV2((state) => state.removeDelayEntry);

  const [_showQuickAdd, setShowQuickAdd] = useState(false);

  const totalDelayHours = delays.reduce((sum, d) => sum + (d.duration_hours || 0), 0);

  const handleQuickAdd = useCallback((delayType: DelayType) => {
    addDelayEntry({
      delay_type: delayType,
      delay_category: delayType === 'weather' ? 'excusable_non_compensable' :
                      delayType === 'owner' || delayType === 'design' ? 'excusable_compensable' :
                      'non_excusable',
      description: '',
      duration_hours: 0,
    });
    setShowQuickAdd(false);
  }, [addDelayEntry]);

  const getDelayTypeInfo = (type: DelayType) => {
    return DELAY_TYPES.find((t) => t.value === type) || DELAY_TYPES[DELAY_TYPES.length - 1];
  };

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-surface transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-error-light rounded-lg">
            <AlertTriangle className="h-5 w-5 text-error" />
          </div>
          <div className="text-left">
            <CardTitle className="text-base flex items-center gap-2">
              Delays & Issues
              {delays.length > 0 && (
                <Badge variant="destructive" className="font-normal">
                  {delays.length} {delays.length === 1 ? 'delay' : 'delays'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {delays.length > 0
                ? `${totalDelayHours.toFixed(1)} hours of delays recorded`
                : 'Track delays for claims and schedule defense'}
            </CardDescription>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-disabled" />
        ) : (
          <ChevronDown className="h-5 w-5 text-disabled" />
        )}
      </button>

      {expanded && (
        <CardContent className="border-t p-0">
          {/* Quick Add Buttons */}
          <div className="p-4 bg-surface border-b">
            <div className="text-sm font-medium text-secondary mb-2">Quick Add Delay:</div>
            <div className="flex flex-wrap gap-2">
              {DELAY_TYPES.map((type) => (
                <Button
                  key={type.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAdd(type.value)}
                  className={`${type.color} border-0 hover:opacity-80`}
                >
                  {type.icon}
                  <span className="ml-1">{type.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Delay List */}
          <div className="divide-y">
            {delays.map((delay) => {
              const typeInfo = getDelayTypeInfo(delay.delay_type);
              return (
                <div key={delay.id} className="p-4 space-y-3">
                  {/* Header Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-sm font-medium flex items-center gap-1 ${typeInfo.color}`}>
                        {typeInfo.icon}
                        {typeInfo.label}
                      </span>
                      <select
                        value={delay.delay_category || 'non_excusable'}
                        onChange={(e) =>
                          updateDelayEntry(delay.id, { delay_category: e.target.value as DelayCategory })
                        }
                        className="text-sm border rounded px-2 py-1"
                      >
                        {DELAY_CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDelayEntry(delay.id)}
                      className="p-2 text-disabled hover:text-error hover:bg-error-light rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Time and Duration */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-secondary">Start:</label>
                      <Input
                        type="time"
                        value={delay.start_time || ''}
                        onChange={(e) => updateDelayEntry(delay.id, { start_time: e.target.value })}
                        className="w-28 h-8 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-secondary">End:</label>
                      <Input
                        type="time"
                        value={delay.end_time || ''}
                        onChange={(e) => updateDelayEntry(delay.id, { end_time: e.target.value })}
                        className="w-28 h-8 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-secondary">Hours:</label>
                      <Input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={delay.duration_hours || ''}
                        onChange={(e) =>
                          updateDelayEntry(delay.id, { duration_hours: parseFloat(e.target.value) || 0 })
                        }
                        className="w-20 h-8 text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <textarea
                      value={delay.description || ''}
                      onChange={(e) => updateDelayEntry(delay.id, { description: e.target.value })}
                      placeholder="Describe the delay, its cause, and impact..."
                      className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Affected Areas and Responsible Party */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Input
                        type="text"
                        value={delay.affected_areas?.join(', ') || ''}
                        onChange={(e) =>
                          updateDelayEntry(delay.id, {
                            affected_areas: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        placeholder="Affected areas (comma-separated)"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        type="text"
                        value={delay.responsible_party || ''}
                        onChange={(e) => updateDelayEntry(delay.id, { responsible_party: e.target.value })}
                        placeholder="Responsible party"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Impact Fields */}
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-secondary">Schedule Impact (days):</label>
                      <Input
                        type="number"
                        min="0"
                        value={delay.schedule_impact_days || ''}
                        onChange={(e) =>
                          updateDelayEntry(delay.id, { schedule_impact_days: parseInt(e.target.value) || 0 })
                        }
                        className="w-20 h-8 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-secondary">Est. Cost Impact:</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted">$</span>
                        <Input
                          type="number"
                          min="0"
                          value={delay.cost_impact_estimate || ''}
                          onChange={(e) =>
                            updateDelayEntry(delay.id, { cost_impact_estimate: parseFloat(e.target.value) || 0 })
                          }
                          className="w-32 h-8 text-sm pl-6"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {delays.length === 0 && (
              <div className="p-8 text-center text-muted">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-disabled" />
                <p>No delays recorded today.</p>
                <p className="text-sm">Use the buttons above to log any delays.</p>
              </div>
            )}
          </div>

          {/* Summary Footer */}
          {delays.length > 0 && (
            <div className="p-4 bg-muted border-t">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Total Delays:</span>
                <span className="font-bold text-error">{totalDelayHours.toFixed(1)} hours</span>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default DelayEntrySection;
