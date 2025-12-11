/**
 * ProgressSection - Track activity progress with variance indicators
 * Links to schedule activities and tracks planned vs actual progress
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Pencil,
  Target,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { useDailyReportStoreV2 } from '../../store/dailyReportStoreV2';
import type { ProgressEntry } from '@/types/daily-reports-v2';

const UNITS_OF_MEASURE = ['SF', 'LF', 'CY', 'SY', 'EA', 'TON', '%', 'HR'];

interface ProgressSectionProps {
  expanded: boolean;
  onToggle: () => void;
}

export function ProgressSection({ expanded, onToggle }: ProgressSectionProps) {
  const progress = useDailyReportStoreV2((state) => state.progress);
  const addProgressEntry = useDailyReportStoreV2((state) => state.addProgressEntry);
  const updateProgressEntry = useDailyReportStoreV2((state) => state.updateProgressEntry);
  const removeProgressEntry = useDailyReportStoreV2((state) => state.removeProgressEntry);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ProgressEntry | null>(null);
  const [formData, setFormData] = useState<Partial<ProgressEntry>>({});

  // Calculate overall stats
  const stats = useMemo(() => {
    const behindCount = progress.filter((p) => (p.variance_percentage || 0) < -5).length;
    const aheadCount = progress.filter((p) => (p.variance_percentage || 0) > 5).length;
    const avgVariance = progress.length > 0
      ? progress.reduce((sum, p) => sum + (p.variance_percentage || 0), 0) / progress.length
      : 0;
    return { behindCount, aheadCount, avgVariance };
  }, [progress]);

  const getVarianceColor = (variance: number | undefined) => {
    if (!variance) return { text: 'text-gray-500', bg: 'bg-gray-100' };
    if (variance > 5) return { text: 'text-green-600', bg: 'bg-green-100' };
    if (variance < -5) return { text: 'text-red-600', bg: 'bg-red-100' };
    return { text: 'text-yellow-600', bg: 'bg-yellow-100' };
  };

  const handleAdd = useCallback(() => {
    setFormData({});
    setEditingEntry(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((entry: ProgressEntry) => {
    setFormData({ ...entry });
    setEditingEntry(entry);
    setDialogOpen(true);
  }, []);

  const handleFormChange = useCallback((updates: Partial<ProgressEntry>) => {
    setFormData((prev) => {
      const updated = { ...prev, ...updates };
      // Auto-calculate variance
      if (updated.planned_percentage_today !== undefined && updated.actual_percentage_today !== undefined) {
        updated.variance_percentage = (updated.actual_percentage_today || 0) - (updated.planned_percentage_today || 0);
      }
      return updated;
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!formData.activity_name?.trim()) return;

    if (editingEntry) {
      updateProgressEntry(editingEntry.id, formData);
    } else {
      addProgressEntry(formData);
    }
    setDialogOpen(false);
    setFormData({});
    setEditingEntry(null);
  }, [editingEntry, formData, addProgressEntry, updateProgressEntry]);

  const handleCancel = useCallback(() => {
    setDialogOpen(false);
    setFormData({});
    setEditingEntry(null);
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (confirm('Are you sure you want to delete this progress entry?')) {
      removeProgressEntry(id);
    }
  }, [removeProgressEntry]);

  return (
    <>
      <Card className={stats.behindCount > 0 ? 'border-red-200' : ''}>
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stats.behindCount > 0 ? 'bg-red-100' : 'bg-indigo-100'}`}>
              <Target className={`h-5 w-5 ${stats.behindCount > 0 ? 'text-red-600' : 'text-indigo-600'}`} />
            </div>
            <div className="text-left">
              <CardTitle className="text-base flex items-center gap-2">
                Progress Tracking
                {progress.length > 0 && (
                  <div className="flex gap-1">
                    {stats.aheadCount > 0 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        {stats.aheadCount} ahead
                      </Badge>
                    )}
                    {stats.behindCount > 0 && (
                      <Badge variant="destructive">{stats.behindCount} behind</Badge>
                    )}
                  </div>
                )}
              </CardTitle>
              <CardDescription>
                {progress.length > 0
                  ? `${progress.length} activities tracked`
                  : 'Track planned vs actual progress'}
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
                Add Activity
              </Button>
            </div>

            {/* Progress Table */}
            <div className="overflow-x-auto">
              {progress.length > 0 && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-3 font-medium">Activity</th>
                      <th className="text-center p-3 font-medium">Planned %</th>
                      <th className="text-center p-3 font-medium">Actual %</th>
                      <th className="text-center p-3 font-medium">Variance</th>
                      <th className="text-center p-3 font-medium">Cumulative</th>
                      <th className="w-20 p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {progress.map((entry) => {
                      const varianceColors = getVarianceColor(entry.variance_percentage);
                      return (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="p-3">
                            <div className="font-medium">{entry.activity_name}</div>
                            {entry.cost_code && (
                              <div className="text-xs text-gray-500">{entry.cost_code}</div>
                            )}
                          </td>
                          <td className="text-center p-3">
                            {entry.planned_percentage_today ?? '-'}%
                          </td>
                          <td className="text-center p-3">
                            {entry.actual_percentage_today ?? '-'}%
                          </td>
                          <td className="text-center p-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${varianceColors.bg} ${varianceColors.text}`}
                            >
                              {(entry.variance_percentage || 0) > 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (entry.variance_percentage || 0) < 0 ? (
                                <TrendingDown className="h-3 w-3" />
                              ) : null}
                              {entry.variance_percentage ?? 0}%
                            </span>
                          </td>
                          <td className="text-center p-3">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 rounded-full"
                                  style={{ width: `${Math.min(entry.cumulative_percentage || 0, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs">{entry.cumulative_percentage ?? 0}%</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEdit(entry)}
                                className="p-1 text-gray-400 hover:text-blue-500"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(entry.id)}
                                className="p-1 text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Empty State */}
              {progress.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <Target className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No progress entries today.</p>
                  <p className="text-sm">Track activity completion against schedule.</p>
                </div>
              )}
            </div>

            {/* Summary */}
            {progress.length > 0 && (
              <div className="p-4 bg-gray-100 border-t">
                <div className="text-sm">
                  Average Variance:{' '}
                  <span className={stats.avgVariance >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {stats.avgVariance >= 0 ? '+' : ''}{stats.avgVariance.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Progress Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {editingEntry ? 'Edit Progress' : 'Add Progress Entry'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Activity Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Activity Name *</Label>
                <Input
                  type="text"
                  value={formData.activity_name || ''}
                  onChange={(e) => handleFormChange({ activity_name: e.target.value })}
                  placeholder="e.g., Foundation Footings"
                />
              </div>
              <div className="space-y-2">
                <Label>Cost Code</Label>
                <Input
                  type="text"
                  value={formData.cost_code || ''}
                  onChange={(e) => handleFormChange({ cost_code: e.target.value })}
                  placeholder="e.g., 03-100"
                />
              </div>
            </div>

            {/* Progress */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Planned % Today</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.planned_percentage_today || ''}
                  onChange={(e) => handleFormChange({ planned_percentage_today: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Actual % Today</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.actual_percentage_today || ''}
                  onChange={(e) => handleFormChange({ actual_percentage_today: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cumulative %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.cumulative_percentage || ''}
                  onChange={(e) => handleFormChange({ cumulative_percentage: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Variance Display */}
            {formData.variance_percentage !== undefined && (
              <div className={`p-3 rounded-lg ${getVarianceColor(formData.variance_percentage).bg}`}>
                <span className={`font-medium ${getVarianceColor(formData.variance_percentage).text}`}>
                  Variance: {formData.variance_percentage >= 0 ? '+' : ''}{formData.variance_percentage}%
                </span>
              </div>
            )}

            {/* Quantities */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Planned Qty</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.planned_quantity_today || ''}
                  onChange={(e) => handleFormChange({ planned_quantity_today: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Actual Qty</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.actual_quantity_today || ''}
                  onChange={(e) => handleFormChange({ actual_quantity_today: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select
                  value={formData.unit_of_measure || ''}
                  onValueChange={(value) => handleFormChange({ unit_of_measure: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS_OF_MEASURE.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Variance Reason (if behind) */}
            {(formData.variance_percentage || 0) < -5 && (
              <>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Variance Reason
                  </Label>
                  <textarea
                    value={formData.variance_reason || ''}
                    onChange={(e) => handleFormChange({ variance_reason: e.target.value })}
                    placeholder="Explain why progress is behind schedule..."
                    className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Corrective Action</Label>
                  <textarea
                    value={formData.corrective_action || ''}
                    onChange={(e) => handleFormChange({ corrective_action: e.target.value })}
                    placeholder="What will be done to get back on schedule?"
                    className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={!formData.activity_name?.trim()}>
              {editingEntry ? 'Save Changes' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ProgressSection;
