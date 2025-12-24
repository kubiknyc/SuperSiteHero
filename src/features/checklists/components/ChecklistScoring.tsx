// File: /src/features/checklists/components/ChecklistScoring.tsx
// Scoring configuration UI for checklist templates

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Settings, Plus, Trash2, AlertCircle } from 'lucide-react'
import type {
  ScoringConfiguration,
  ScoringType,
  GradeThreshold,
  DEFAULT_GRADE_THRESHOLDS,
} from '@/types/checklist-scoring'
import type { ChecklistTemplateItem } from '@/types/checklists'

interface ChecklistScoringProps {
  templateItems: ChecklistTemplateItem[]
  config?: ScoringConfiguration
  onChange: (config: ScoringConfiguration) => void
}

export function ChecklistScoring({ templateItems, config, onChange }: ChecklistScoringProps) {
  const [scoringConfig, setScoringConfig] = useState<ScoringConfiguration>(
    config || {
      enabled: false,
      scoring_type: 'percentage',
      pass_threshold: 70,
      include_na_in_total: false,
      fail_on_critical: false,
    }
  )

  const handleUpdate = (updates: Partial<ScoringConfiguration>) => {
    const newConfig = { ...scoringConfig, ...updates }
    setScoringConfig(newConfig)
    onChange(newConfig)
  }

  const handlePointValueChange = (itemId: string, points: number) => {
    const newPointValues = {
      ...scoringConfig.point_values,
      [itemId]: points,
    }
    handleUpdate({ point_values: newPointValues })
  }

  const handleAddGradeThreshold = () => {
    const currentThresholds = scoringConfig.grade_thresholds || []
    const newThreshold: GradeThreshold = {
      min_percentage: 0,
      grade: '',
      color: '#000000',
    }
    handleUpdate({ grade_thresholds: [...currentThresholds, newThreshold] })
  }

  const handleRemoveGradeThreshold = (index: number) => {
    const currentThresholds = scoringConfig.grade_thresholds || []
    const newThresholds = currentThresholds.filter((_, i) => i !== index)
    handleUpdate({ grade_thresholds: newThresholds })
  }

  const handleUpdateGradeThreshold = (index: number, updates: Partial<GradeThreshold>) => {
    const currentThresholds = scoringConfig.grade_thresholds || []
    const newThresholds = currentThresholds.map((t, i) =>
      i === index ? { ...t, ...updates } : t
    )
    handleUpdate({ grade_thresholds: newThresholds })
  }

  const handleToggleCriticalItem = (itemId: string) => {
    const currentCritical = scoringConfig.critical_item_ids || []
    const newCritical = currentCritical.includes(itemId)
      ? currentCritical.filter((id) => id !== itemId)
      : [...currentCritical, itemId]
    handleUpdate({ critical_item_ids: newCritical })
  }

  return (
    <div className="space-y-6">
      {/* Enable Scoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Scoring Configuration
          </CardTitle>
          <CardDescription>
            Enable and configure scoring for quality audits and inspections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="scoring-enabled" className="text-base">
                Enable Scoring
              </Label>
              <p className="text-sm text-muted">
                Calculate scores automatically when checklist is completed
              </p>
            </div>
            <Switch
              id="scoring-enabled"
              checked={scoringConfig.enabled}
              onCheckedChange={(enabled) => handleUpdate({ enabled })}
            />
          </div>

          {scoringConfig.enabled && (
            <>
              {/* Scoring Type */}
              <div className="space-y-2">
                <Label htmlFor="scoring-type">Scoring Type</Label>
                <Select
                  value={scoringConfig.scoring_type}
                  onValueChange={(value) =>
                    handleUpdate({ scoring_type: value as ScoringType })
                  }
                >
                  <SelectTrigger id="scoring-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="binary">Binary (Pass/Fail)</SelectItem>
                    <SelectItem value="percentage">Percentage (0-100%)</SelectItem>
                    <SelectItem value="points">Points (Weighted)</SelectItem>
                    <SelectItem value="letter_grade">Letter Grade (A-F)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted">
                  {scoringConfig.scoring_type === 'binary' &&
                    'All items must pass for 100%, any failure results in 0%'}
                  {scoringConfig.scoring_type === 'percentage' &&
                    'Calculate percentage based on pass/fail ratio'}
                  {scoringConfig.scoring_type === 'points' &&
                    'Assign point values to items for weighted scoring'}
                  {scoringConfig.scoring_type === 'letter_grade' &&
                    'Convert percentage to letter grade (A-F)'}
                </p>
              </div>

              {/* Pass Threshold */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pass-threshold">Pass Threshold</Label>
                  <span className="text-sm font-medium">{scoringConfig.pass_threshold}%</span>
                </div>
                <Slider
                  id="pass-threshold"
                  min={0}
                  max={100}
                  step={1}
                  value={[scoringConfig.pass_threshold]}
                  onValueChange={([value]) => handleUpdate({ pass_threshold: value })}
                  className="w-full"
                />
                <p className="text-sm text-muted">
                  Minimum score required to pass the checklist
                </p>
              </div>

              {/* N/A Handling */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="include-na" className="text-base">
                    Include N/A in Total
                  </Label>
                  <p className="text-sm text-muted">
                    Count N/A items in the total when calculating score
                  </p>
                </div>
                <Switch
                  id="include-na"
                  checked={scoringConfig.include_na_in_total}
                  onCheckedChange={(checked) => handleUpdate({ include_na_in_total: checked })}
                />
              </div>

              {/* Critical Items */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="fail-critical" className="text-base">
                    Auto-Fail on Critical Items
                  </Label>
                  <p className="text-sm text-muted">
                    Automatically fail if any critical item fails
                  </p>
                </div>
                <Switch
                  id="fail-critical"
                  checked={scoringConfig.fail_on_critical}
                  onCheckedChange={(checked) => handleUpdate({ fail_on_critical: checked })}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Point Values (only for points-based scoring) */}
      {scoringConfig.enabled && scoringConfig.scoring_type === 'points' && (
        <Card>
          <CardHeader>
            <CardTitle>Point Values</CardTitle>
            <CardDescription>
              Assign point values to each checklist item for weighted scoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {templateItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium">{item.label}</p>
                    {item.section && (
                      <p className="text-sm text-muted">{item.section}</p>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={scoringConfig.point_values?.[item.id] || 0}
                    onChange={(e) =>
                      handlePointValueChange(item.id, parseInt(e.target.value) || 0)
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-muted">points</span>
                </div>
              ))}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between font-medium">
                  <span>Total Points</span>
                  <span>
                    {Object.values(scoringConfig.point_values || {}).reduce(
                      (sum, val) => sum + val,
                      0
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grade Thresholds (only for letter grade scoring) */}
      {scoringConfig.enabled && scoringConfig.scoring_type === 'letter_grade' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Grade Thresholds</CardTitle>
                <CardDescription>
                  Define percentage ranges for each letter grade
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddGradeThreshold}>
                <Plus className="w-4 h-4 mr-2" />
                Add Threshold
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(scoringConfig.grade_thresholds || DEFAULT_GRADE_THRESHOLDS).map(
                (threshold, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Input
                      type="text"
                      placeholder="Grade"
                      value={threshold.grade}
                      onChange={(e) =>
                        handleUpdateGradeThreshold(index, { grade: e.target.value })
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-muted">≥</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={threshold.min_percentage}
                      onChange={(e) =>
                        handleUpdateGradeThreshold(index, {
                          min_percentage: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-muted">%</span>
                    <Input
                      type="color"
                      value={threshold.color || '#000000'}
                      onChange={(e) =>
                        handleUpdateGradeThreshold(index, { color: e.target.value })
                      }
                      className="w-16"
                    />
                    {scoringConfig.grade_thresholds && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveGradeThreshold(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Critical Items Selection */}
      {scoringConfig.enabled && scoringConfig.fail_on_critical && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-error" />
              Critical Items
            </CardTitle>
            <CardDescription>
              Mark items as critical - checklist will auto-fail if any critical item fails
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {templateItems.map((item) => {
                const isCritical = scoringConfig.critical_item_ids?.includes(item.id)
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-surface cursor-pointer"
                    onClick={() => handleToggleCriticalItem(item.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.label}</p>
                        {isCritical && (
                          <Badge variant="destructive" className="text-xs">
                            Critical
                          </Badge>
                        )}
                      </div>
                      {item.section && (
                        <p className="text-sm text-muted">{item.section}</p>
                      )}
                    </div>
                    <Switch
                      checked={isCritical}
                      onCheckedChange={() => handleToggleCriticalItem(item.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
