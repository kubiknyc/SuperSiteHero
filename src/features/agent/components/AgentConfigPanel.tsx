/**
 * AgentConfigPanel Component
 * Configuration panel for Construction AI Agent settings
 */

import * as React from 'react'
import {
  Bot,
  FileText,
  Bell,
  Settings2,
  Loader2,
  RotateCcw,
  Save,
  AlertCircle,
  Clock,
  Zap,
  MessageSquare,
  Search,
  Mail,
  Smartphone,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  useAgentConfig,
  useFeatureMetadata,
  useModelOptions,
  type FeatureMetadata,
} from '../hooks/useAgentConfig'
import {
  AgentFeatureToggle,
  FeatureGroup,
  CompactFeatureToggle,
} from './AgentFeatureToggle'
import type { AgentAutonomyLevel, AgentFeaturesEnabled } from '../types/agent'

// ============================================================================
// Types
// ============================================================================

export interface AgentConfigPanelProps {
  /** Optional className for the container */
  className?: string
  /** Callback when configuration is saved */
  onSave?: () => void
  /** Callback when panel is closed/cancelled */
  onCancel?: () => void
}

// ============================================================================
// Constants
// ============================================================================

const AUTONOMY_LEVELS: {
  value: AgentAutonomyLevel
  label: string
  description: string
}[] = [
  {
    value: 'disabled',
    label: 'Disabled',
    description: 'Agent is completely disabled and will not perform any actions',
  },
  {
    value: 'suggest_only',
    label: 'Suggest Only',
    description: 'Agent suggests actions but requires manual approval for all changes',
  },
  {
    value: 'confirm_actions',
    label: 'Confirm Actions',
    description: 'Agent can perform read operations but requires confirmation for writes',
  },
  {
    value: 'autonomous',
    label: 'Autonomous',
    description: 'Agent can perform most actions automatically within defined limits',
  },
]

const DAYS_OF_WEEK = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
]

const FEATURE_ICONS: Record<keyof AgentFeaturesEnabled, React.ReactNode> = {
  document_processing: <FileText className="h-5 w-5" />,
  daily_report_summaries: <FileText className="h-5 w-5" />,
  rfi_routing: <Zap className="h-5 w-5" />,
  rfi_drafting: <FileText className="h-5 w-5" />,
  submittal_classification: <FileText className="h-5 w-5" />,
  weekly_rollups: <FileText className="h-5 w-5" />,
  chat_interface: <MessageSquare className="h-5 w-5" />,
  background_tasks: <Zap className="h-5 w-5" />,
  semantic_search: <Search className="h-5 w-5" />,
}

// ============================================================================
// Component
// ============================================================================

export function AgentConfigPanel({
  className,
  onSave,
  onCancel,
}: AgentConfigPanelProps) {
  const {
    config,
    isLoading,
    isUpdating,
    error,
    updateConfig,
    toggleFeature,
    updateNotifications,
    updateAutonomyLevel,
    updatePreferredModel,
    updateTaskLimits,
    resetToDefaults,
  } = useAgentConfig()

  const { features, getFeaturesByCategory } = useFeatureMetadata()
  const { models } = useModelOptions()

  // Local state for form fields that need batched updates
  const [localDailyLimit, setLocalDailyLimit] = React.useState<number>(100)
  const [localMonthlyLimit, setLocalMonthlyLimit] = React.useState<number | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)

  // Sync local state with config
  React.useEffect(() => {
    if (config) {
      setLocalDailyLimit(config.daily_task_limit)
      setLocalMonthlyLimit(config.monthly_task_limit)
    }
  }, [config])

  // Handle save
  const handleSave = React.useCallback(async () => {
    if (hasUnsavedChanges) {
      await updateTaskLimits(localDailyLimit, localMonthlyLimit)
      setHasUnsavedChanges(false)
    }
    onSave?.()
  }, [hasUnsavedChanges, localDailyLimit, localMonthlyLimit, updateTaskLimits, onSave])

  // Handle reset
  const handleReset = React.useCallback(async () => {
    await resetToDefaults()
    setHasUnsavedChanges(false)
  }, [resetToDefaults])

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-gray-500">Loading configuration...</span>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Failed to load configuration
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {error.message}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Agent Configuration</CardTitle>
              <CardDescription>
                Configure how the Construction AI Agent operates
              </CardDescription>
            </div>
          </div>
          {isUpdating && (
            <Badge variant="secondary" className="gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </Badge>
          )}
        </div>
      </CardHeader>

      <Tabs defaultValue="general" className="w-full">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6">
          <TabsList className="h-12 bg-transparent p-0 -mb-px">
            <TabsTrigger
              value="general"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger
              value="features"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Zap className="h-4 w-4 mr-2" />
              Features
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="advanced"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Advanced
            </TabsTrigger>
          </TabsList>
        </div>

        <CardContent className="p-6">
          {/* General Tab */}
          <TabsContent value="general" className="m-0 space-y-6">
            {/* Agent Enabled Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  config?.is_enabled
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                )}>
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <Label className="text-base font-medium">Agent Status</Label>
                  <p className="text-sm text-gray-500">
                    {config?.is_enabled ? 'Agent is active and operational' : 'Agent is currently disabled'}
                  </p>
                </div>
              </div>
              <Switch
                checked={config?.is_enabled ?? false}
                onCheckedChange={(checked) => updateConfig({ is_enabled: checked })}
                disabled={isUpdating}
              />
            </div>

            {/* Autonomy Level */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Autonomy Level</Label>
              <p className="text-sm text-gray-500">
                Control how independently the agent can operate
              </p>
              <div className="grid gap-3">
                {AUTONOMY_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => updateAutonomyLevel(level.value)}
                    disabled={isUpdating}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border p-4 text-left transition-all',
                      'hover:border-gray-300 hover:bg-gray-50',
                      'dark:hover:border-gray-600 dark:hover:bg-gray-800/50',
                      config?.autonomy_level === level.value
                        ? 'border-primary bg-primary/5 dark:border-primary/50 dark:bg-primary/10'
                        : 'border-gray-200 dark:border-gray-700'
                    )}
                  >
                    <div className={cn(
                      'mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center',
                      config?.autonomy_level === level.value
                        ? 'border-primary'
                        : 'border-gray-300 dark:border-gray-600'
                    )}>
                      {config?.autonomy_level === level.value && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {level.label}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {level.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Default AI Model</Label>
              <p className="text-sm text-gray-500">
                Choose the default model for agent operations
              </p>
              <Select
                value={config?.preferred_model ?? 'claude-3-5-sonnet'}
                onValueChange={updatePreferredModel}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <span>{model.name}</span>
                        {model.isPremium && (
                          <Badge variant="subtle-primary" size="sm">Pro</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {config?.preferred_model && (
                <p className="text-xs text-gray-500">
                  {models.find((m) => m.id === config.preferred_model)?.description}
                </p>
              )}
            </div>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="m-0 space-y-6">
            {/* Documents Category */}
            <FeatureGroup
              title="Document Features"
              description="Features related to document processing and management"
            >
              {getFeaturesByCategory('documents').map((feature) => (
                <AgentFeatureToggle
                  key={feature.key}
                  id={feature.key}
                  name={feature.name}
                  description={feature.description}
                  enabled={config?.features_enabled?.[feature.key] ?? false}
                  onToggle={(enabled) => toggleFeature(feature.key, enabled)}
                  isPremium={feature.isPremium}
                  disabled={isUpdating}
                  icon={FEATURE_ICONS[feature.key]}
                />
              ))}
            </FeatureGroup>

            {/* Workflows Category */}
            <FeatureGroup
              title="Workflow Automation"
              description="Automate common construction workflows"
            >
              {getFeaturesByCategory('workflows').map((feature) => (
                <AgentFeatureToggle
                  key={feature.key}
                  id={feature.key}
                  name={feature.name}
                  description={feature.description}
                  enabled={config?.features_enabled?.[feature.key] ?? false}
                  onToggle={(enabled) => toggleFeature(feature.key, enabled)}
                  isPremium={feature.isPremium}
                  disabled={isUpdating}
                  icon={FEATURE_ICONS[feature.key]}
                />
              ))}
            </FeatureGroup>

            {/* Communication Category */}
            <FeatureGroup
              title="Communication"
              description="Summaries and reports"
            >
              {getFeaturesByCategory('communication').map((feature) => (
                <AgentFeatureToggle
                  key={feature.key}
                  id={feature.key}
                  name={feature.name}
                  description={feature.description}
                  enabled={config?.features_enabled?.[feature.key] ?? false}
                  onToggle={(enabled) => toggleFeature(feature.key, enabled)}
                  isPremium={feature.isPremium}
                  disabled={isUpdating}
                  icon={FEATURE_ICONS[feature.key]}
                />
              ))}
            </FeatureGroup>

            {/* Intelligence Category */}
            <FeatureGroup
              title="AI Intelligence"
              description="Chat and search capabilities"
            >
              {getFeaturesByCategory('intelligence').map((feature) => (
                <AgentFeatureToggle
                  key={feature.key}
                  id={feature.key}
                  name={feature.name}
                  description={feature.description}
                  enabled={config?.features_enabled?.[feature.key] ?? false}
                  onToggle={(enabled) => toggleFeature(feature.key, enabled)}
                  isPremium={feature.isPremium}
                  disabled={isUpdating}
                  icon={FEATURE_ICONS[feature.key]}
                />
              ))}
            </FeatureGroup>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="m-0 space-y-6">
            {/* Notification Channels */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Notification Channels</Label>
                <p className="text-sm text-gray-500">
                  Choose how you want to receive agent notifications
                </p>
              </div>

              <div className="space-y-3">
                {/* In-App Notifications */}
                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                      <Smartphone className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <Label className="font-medium">In-App Notifications</Label>
                      <p className="text-sm text-gray-500">
                        Receive notifications within the application
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config?.notification_channels?.in_app ?? true}
                    onCheckedChange={(checked) =>
                      updateNotifications({ in_app: checked })
                    }
                    disabled={isUpdating}
                  />
                </div>

                {/* Email Notifications */}
                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                      <Mail className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <Label className="font-medium">Email Notifications</Label>
                      <p className="text-sm text-gray-500">
                        Receive important updates via email
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config?.notification_channels?.email ?? false}
                    onCheckedChange={(checked) =>
                      updateNotifications({ email: checked })
                    }
                    disabled={isUpdating}
                  />
                </div>
              </div>
            </div>

            {/* Digest Frequency (placeholder for future) */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Digest Frequency</Label>
              <p className="text-sm text-gray-500">
                How often to receive activity summaries
              </p>
              <Select defaultValue="daily" disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">
                Coming soon - digest emails will summarize agent activity
              </p>
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="m-0 space-y-6">
            {/* Task Limits */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Task Limits</Label>
                <p className="text-sm text-gray-500">
                  Control how many tasks the agent can perform
                </p>
              </div>

              {/* Daily Limit */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Daily Task Limit</Label>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {localDailyLimit} tasks
                  </span>
                </div>
                <Slider
                  value={[localDailyLimit]}
                  onValueChange={([value]) => {
                    setLocalDailyLimit(value)
                    setHasUnsavedChanges(true)
                  }}
                  min={10}
                  max={500}
                  step={10}
                  disabled={isUpdating}
                />
                <p className="text-xs text-gray-500">
                  Maximum number of automated tasks per day
                </p>
              </div>

              {/* Monthly Limit */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Monthly Task Limit</Label>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {localMonthlyLimit ? `${localMonthlyLimit} tasks` : 'Unlimited'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={localMonthlyLimit ?? ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value, 10) : null
                      setLocalMonthlyLimit(value)
                      setHasUnsavedChanges(true)
                    }}
                    placeholder="Unlimited"
                    min={0}
                    disabled={isUpdating}
                    className="w-32"
                  />
                  <span className="text-sm text-gray-500">tasks per month</span>
                </div>
                <p className="text-xs text-gray-500">
                  Leave empty for unlimited monthly tasks
                </p>
              </div>
            </div>

            {/* Working Hours */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Working Hours</Label>
                <p className="text-sm text-gray-500">
                  When the agent is allowed to perform automated tasks
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={config?.working_hours_start ?? '08:00'}
                    onChange={(e) =>
                      updateConfig({ working_hours_start: e.target.value })
                    }
                    disabled={isUpdating}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={config?.working_hours_end ?? '18:00'}
                    onChange={(e) =>
                      updateConfig({ working_hours_end: e.target.value })
                    }
                    disabled={isUpdating}
                  />
                </div>
              </div>

              {/* Working Days */}
              <div className="space-y-2">
                <Label>Working Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = config?.working_days?.includes(day.value) ?? false
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          const currentDays = config?.working_days ?? [1, 2, 3, 4, 5]
                          const newDays = isSelected
                            ? currentDays.filter((d) => d !== day.value)
                            : [...currentDays, day.value].sort()
                          updateConfig({ working_days: newDays })
                        }}
                        disabled={isUpdating}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                          isSelected
                            ? 'border-primary bg-primary text-white'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        )}
                      >
                        {day.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select
                  value={config?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone}
                  onValueChange={(value) => updateConfig({ timezone: value })}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="America/Phoenix">Arizona (MST)</SelectItem>
                    <SelectItem value="America/Anchorage">Alaska (AKT)</SelectItem>
                    <SelectItem value="Pacific/Honolulu">Hawaii (HST)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom System Prompt (placeholder) */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Custom Instructions</Label>
              <p className="text-sm text-gray-500">
                Add custom instructions for the agent to follow
              </p>
              <Textarea
                placeholder="Enter any additional instructions for the agent..."
                className="min-h-[100px]"
                disabled
              />
              <p className="text-xs text-gray-400">
                Coming soon - customize agent behavior with natural language instructions
              </p>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>

      {/* Footer Actions */}
      <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <Button
          variant="ghost"
          onClick={handleReset}
          disabled={isUpdating}
          className="text-gray-500 hover:text-gray-700"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
        <div className="flex items-center gap-3">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isUpdating}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={isUpdating || !hasUnsavedChanges}
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ============================================================================
// Exports
// ============================================================================

export default AgentConfigPanel
