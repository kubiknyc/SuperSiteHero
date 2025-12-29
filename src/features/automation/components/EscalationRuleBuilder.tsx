/**
 * Escalation Rule Builder Component
 * Phase 5: Field Workflow Automation - Milestone 5.1
 *
 * Visual builder for creating and editing escalation rules
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react'
import {
  useCreateEscalationRule,
  useUpdateEscalationRule,
  useTestRuleCondition,
} from '../hooks/useEscalationRules'
import type {
  EscalationRule,
  CreateEscalationRuleInput,
  EscalationSourceType,
  EscalationActionType,
  TriggerCondition,
  SimpleCondition,
  ConditionOperator,
  ActionConfig,
} from '@/types/workflow-automation'
import {
  ESCALATION_SOURCE_TYPES,
  ESCALATION_ACTION_TYPES,
  CONDITION_OPERATORS,
} from '@/types/workflow-automation'

// Field definitions per source type
const SOURCE_FIELDS: Record<EscalationSourceType, { name: string; type: string }[]> = {
  inspection: [
    { name: 'status', type: 'string' },
    { name: 'inspection_type', type: 'string' },
    { name: 'result', type: 'string' },
  ],
  checklist: [
    { name: 'status', type: 'string' },
    { name: 'score_fail', type: 'number' },
    { name: 'score_pass', type: 'number' },
  ],
  safety_observation: [
    { name: 'severity', type: 'number' },
    { name: 'category', type: 'string' },
    { name: 'status', type: 'string' },
  ],
  punch_item: [
    { name: 'status', type: 'string' },
    { name: 'priority', type: 'string' },
    { name: 'trade', type: 'string' },
  ],
  rfi: [
    { name: 'status', type: 'string' },
    { name: 'priority', type: 'string' },
    { name: 'days_open', type: 'number' },
  ],
  submittal: [
    { name: 'status', type: 'string' },
    { name: 'approval_status', type: 'string' },
  ],
  task: [
    { name: 'status', type: 'string' },
    { name: 'priority', type: 'string' },
    { name: 'is_overdue', type: 'boolean' },
  ],
  equipment_inspection: [
    { name: 'overall_status', type: 'string' },
    { name: 'follow_up_required', type: 'boolean' },
  ],
}

interface EscalationRuleBuilderProps {
  projectId?: string
  companyId?: string
  rule?: EscalationRule
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EscalationRuleBuilder({
  projectId,
  companyId,
  rule,
  open,
  onOpenChange,
  onSuccess,
}: EscalationRuleBuilderProps) {
  const isEditing = !!rule

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sourceType, setSourceType] = useState<EscalationSourceType>('inspection')
  const [conditions, setConditions] = useState<SimpleCondition[]>([])
  const [actionType, setActionType] = useState<EscalationActionType>('create_punch_item')
  const [actionConfig, setActionConfig] = useState<Record<string, unknown>>({})
  const [isActive, setIsActive] = useState(true)
  const [delayMinutes, setDelayMinutes] = useState(0)

  // Test state
  const [testData, setTestData] = useState<Record<string, unknown>>({})
  const [testResult, setTestResult] = useState<boolean | null>(null)

  // Mutations
  const createRule = useCreateEscalationRule()
  const updateRule = useUpdateEscalationRule()
  const testCondition = useTestRuleCondition()

  const resetForm = () => {
    setName('')
    setDescription('')
    setSourceType('inspection')
    setConditions([])
    setActionType('create_punch_item')
    setActionConfig({})
    setIsActive(true)
    setDelayMinutes(0)
    setTestData({})
    setTestResult(null)
  }

  // Initialize form when editing
  useEffect(() => {
    if (rule) {
      setTimeout(() => {
        setName(rule.name)
        setDescription(rule.description || '')
        setSourceType(rule.source_type)
        setActionType(rule.action_type)
        setActionConfig(rule.action_config as Record<string, unknown>)
        setIsActive(rule.is_active)
        setDelayMinutes(rule.execution_delay_minutes)

        // Parse conditions
        const cond = rule.trigger_condition as TriggerCondition
        if ('and' in cond && cond.and) {
          setConditions(cond.and.filter((c): c is SimpleCondition => 'field' in c))
        } else if ('field' in cond) {
          setConditions([cond as SimpleCondition])
        } else {
          setConditions([])
        }
      }, 0)
    } else {
      setTimeout(() => {
        resetForm()
      }, 0)
    }
  }, [rule, open])

  const addCondition = () => {
    const fields = SOURCE_FIELDS[sourceType]
    setConditions([
      ...conditions,
      { field: fields[0]?.name || '', operator: 'equals', value: '' },
    ])
  }

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  const updateCondition = (index: number, updates: Partial<SimpleCondition>) => {
    setConditions(
      conditions.map((c, i) => (i === index ? { ...c, ...updates } : c))
    )
  }

  const handleTest = async () => {
    const triggerCondition: TriggerCondition =
      conditions.length > 1 ? { and: conditions } : conditions[0] || {}

    const result = await testCondition.mutateAsync({
      condition: triggerCondition,
      sampleData: testData,
    })
    setTestResult(result)
  }

  const handleSubmit = async () => {
    const triggerCondition: TriggerCondition =
      conditions.length > 1 ? { and: conditions } : conditions[0] || {}

    const input: CreateEscalationRuleInput = {
      project_id: projectId,
      company_id: companyId,
      name,
      description: description || undefined,
      source_type: sourceType,
      trigger_condition: triggerCondition,
      action_type: actionType,
      action_config: actionConfig as ActionConfig,
      is_active: isActive,
      execution_delay_minutes: delayMinutes,
    }

    if (isEditing && rule) {
      await updateRule.mutateAsync({ id: rule.id, updates: input })
    } else {
      await createRule.mutateAsync(input)
    }

    onOpenChange(false)
    onSuccess?.()
  }

  const isLoading = createRule.isPending || updateRule.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning" />
            {isEditing ? 'Edit Escalation Rule' : 'Create Escalation Rule'}
          </DialogTitle>
          <DialogDescription>
            Define conditions that trigger automatic actions when events occur.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Rule Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Failed Inspection - Create Punch"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Trigger Source *</Label>
                <Select
                  value={sourceType}
                  onValueChange={(v) => {
                    setSourceType(v as EscalationSourceType)
                    setConditions([]) // Reset conditions when source changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESCALATION_SOURCE_TYPES.map((type) => (
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
                placeholder="Describe what this rule does..."
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* Conditions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Trigger Conditions</CardTitle>
                <Button variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Condition
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {conditions.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No conditions - rule will trigger on all {sourceType} events
                </p>
              ) : (
                conditions.map((condition, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
                  >
                    {index > 0 && (
                      <Badge variant="secondary" className="mr-2">
                        AND
                      </Badge>
                    )}

                    <Select
                      value={condition.field}
                      onValueChange={(v) => updateCondition(index, { field: v })}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Field" />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_FIELDS[sourceType].map((field) => (
                          <SelectItem key={field.name} value={field.name}>
                            {field.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={condition.operator}
                      onValueChange={(v) =>
                        updateCondition(index, { operator: v as ConditionOperator })
                      }
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_OPERATORS.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {!['is_null', 'is_not_null'].includes(condition.operator) && (
                      <Input
                        className="flex-1"
                        value={String(condition.value || '')}
                        onChange={(e) =>
                          updateCondition(index, { value: e.target.value })
                        }
                        placeholder="Value"
                      />
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCondition(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Action */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Action to Execute</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Action Type *</Label>
                <Select
                  value={actionType}
                  onValueChange={(v) => {
                    setActionType(v as EscalationActionType)
                    setActionConfig({}) // Reset config when action changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESCALATION_ACTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action-specific config */}
              {(actionType === 'create_punch_item' || actionType === 'create_task') && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={(actionConfig.priority as string) || 'normal'}
                      onValueChange={(v) =>
                        setActionConfig({ ...actionConfig, priority: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due In (days)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={(actionConfig.due_days as number) || 0}
                      onChange={(e) =>
                        setActionConfig({
                          ...actionConfig,
                          due_days: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Title Template</Label>
                    <Input
                      value={(actionConfig.title_template as string) || ''}
                      onChange={(e) =>
                        setActionConfig({
                          ...actionConfig,
                          title_template: e.target.value,
                        })
                      }
                      placeholder="e.g., Auto-created: {{title}}"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use {'{{field}}'} to insert values from the source
                    </p>
                  </div>
                </div>
              )}

              {actionType === 'send_notification' && (
                <div className="space-y-2">
                  <Label>Recipients</Label>
                  <Input
                    value={
                      ((actionConfig.recipients as string[]) || []).join(', ')
                    }
                    onChange={(e) =>
                      setActionConfig({
                        ...actionConfig,
                        recipients: e.target.value.split(',').map((r) => r.trim()),
                      })
                    }
                    placeholder="role:project_manager, role:admin"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use role:name for role-based or enter user IDs
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settings */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label>Delay (minutes):</Label>
                <Input
                  type="number"
                  min={0}
                  className="w-20"
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Test Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="h-4 w-4" />
                Test Rule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Sample Data (JSON)</Label>
                <Textarea
                  rows={3}
                  value={JSON.stringify(testData, null, 2)}
                  onChange={(e) => {
                    try {
                      setTestData(JSON.parse(e.target.value))
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  placeholder='{"status": "failed", "priority": "high"}'
                />
              </div>

              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTest}
                  disabled={testCondition.isPending}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Test Condition
                </Button>

                {testResult !== null && (
                  <div className="flex items-center gap-2">
                    {testResult ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <span className="text-success font-medium">
                          Condition matched!
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-error" />
                        <span className="text-error font-medium">
                          Condition not matched
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name || isLoading}>
            {isLoading ? 'Saving...' : isEditing ? 'Update Rule' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EscalationRuleBuilder
