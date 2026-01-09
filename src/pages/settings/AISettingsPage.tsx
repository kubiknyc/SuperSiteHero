/**
 * AI Settings Page
 * Configuration page for AI features including provider selection,
 * API key management, feature toggles, and usage monitoring.
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Bot,
  Key,
  Settings,
  Activity,
  DollarSign,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  RefreshCw,
  Brain,
  FileSearch,
  Clock,
  Shield,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  useAIConfiguration,
  useUpdateAIConfiguration,
  useTestAIConfiguration,
  useAIUsageStats,
} from '@/features/ai/hooks/useAIConfiguration'
import type { AIProviderType } from '@/types/ai'
import { MODEL_PRICING, DEFAULT_MODELS } from '@/lib/api/services/ai-provider'

const configSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'local']),
  api_key: z.string().optional(),
  model_preference: z.string().min(1, 'Model is required'),
  is_enabled: z.boolean(),
  monthly_budget_dollars: z.coerce.number().min(0).optional(),
  features_enabled: z.object({
    rfi_routing: z.boolean(),
    smart_summaries: z.boolean(),
    risk_prediction: z.boolean(),
    schedule_optimization: z.boolean(),
    document_enhancement: z.boolean(),
  }),
})

type ConfigFormValues = z.infer<typeof configSchema>

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI', description: 'GPT-4o, GPT-4o-mini' },
  { value: 'anthropic', label: 'Anthropic', description: 'Claude 3.5 Sonnet, Haiku' },
  { value: 'local', label: 'Local (Ollama)', description: 'Self-hosted models' },
]

const FEATURE_INFO = [
  {
    key: 'rfi_routing' as const,
    label: 'RFI Auto-Routing',
    description: 'Intelligent RFI assignment suggestions based on content analysis',
    icon: Brain,
  },
  {
    key: 'smart_summaries' as const,
    label: 'Smart Summaries',
    description: 'AI-generated summaries for daily reports and meetings',
    icon: FileSearch,
  },
  {
    key: 'risk_prediction' as const,
    label: 'Risk Prediction',
    description: 'Early warning detection for at-risk activities',
    icon: AlertTriangle,
  },
  {
    key: 'schedule_optimization' as const,
    label: 'Schedule Optimization',
    description: 'Critical path analysis and scheduling recommendations',
    icon: Clock,
  },
  {
    key: 'document_enhancement' as const,
    label: 'Document Enhancement',
    description: 'Enhanced document classification and metadata extraction',
    icon: Shield,
  },
]

export default function AISettingsPage() {
  const [showApiKey, setShowApiKey] = useState(false)
  const { data: config, isLoading } = useAIConfiguration()
  const { data: usageStats } = useAIUsageStats()
  const updateConfig = useUpdateAIConfiguration()
  const testConfig = useTestAIConfiguration()

  // Helper to get current provider
  const getCurrentProvider = () => config?.default_provider || config?.provider || 'openai'

  // Helper to get current model based on provider
  const getCurrentModel = () => {
    const provider = getCurrentProvider()
    if (provider === 'openai') return config?.openai_model || config?.model_preference || 'gpt-4o-mini'
    if (provider === 'anthropic') return config?.anthropic_model || config?.model_preference || 'claude-3-5-haiku-latest'
    return config?.model_preference || 'llama3'
  }

  // Helper to check if AI is enabled
  const isAIEnabled = () => {
    if (config?.is_enabled !== undefined) return config.is_enabled
    return config?.enable_rfi_routing || config?.enable_smart_summaries ||
           config?.enable_risk_prediction || config?.enable_schedule_optimization ||
           config?.enable_document_enhancement || true
  }

  // Helper to get features enabled state
  const getFeaturesEnabled = () => ({
    rfi_routing: config?.enable_rfi_routing ?? config?.features_enabled?.rfi_routing ?? true,
    smart_summaries: config?.enable_smart_summaries ?? config?.features_enabled?.smart_summaries ?? true,
    risk_prediction: config?.enable_risk_prediction ?? config?.features_enabled?.risk_prediction ?? true,
    schedule_optimization: config?.enable_schedule_optimization ?? config?.features_enabled?.schedule_optimization ?? true,
    document_enhancement: config?.enable_document_enhancement ?? config?.features_enabled?.document_enhancement ?? true,
  })

  // Helper to check if API key is configured
  const hasApiKey = () => {
    const provider = getCurrentProvider()
    if (provider === 'openai') return !!(config?.openai_api_key_id || config?.api_key_encrypted)
    if (provider === 'anthropic') return !!(config?.anthropic_api_key_id || config?.api_key_encrypted)
    return true // Local doesn't need API key
  }

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema) as any,
    defaultValues: {
      provider: getCurrentProvider(),
      api_key: '',
      model_preference: getCurrentModel(),
      is_enabled: isAIEnabled(),
      monthly_budget_dollars: config?.monthly_budget_cents
        ? config.monthly_budget_cents / 100
        : undefined,
      features_enabled: getFeaturesEnabled(),
    },
    values: config
      ? {
          provider: getCurrentProvider(),
          api_key: '',
          model_preference: getCurrentModel(),
          is_enabled: isAIEnabled(),
          monthly_budget_dollars: config.monthly_budget_cents
            ? config.monthly_budget_cents / 100
            : undefined,
          features_enabled: getFeaturesEnabled(),
        }
      : undefined,
  })

  const selectedProvider = form.watch('provider')

  const getModelsForProvider = (provider: AIProviderType): string[] => {
    switch (provider) {
      case 'openai':
        return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
      case 'anthropic':
        return ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest']
      case 'local':
        return ['llama3', 'mistral', 'codellama', 'phi3']
    }
  }

  const onSubmit = async (values: ConfigFormValues) => {
    await updateConfig.mutateAsync({
      provider: values.provider,
      api_key: values.api_key || undefined,
      model_preference: values.model_preference,
      is_enabled: values.is_enabled,
      monthly_budget_cents: values.monthly_budget_dollars
        ? Math.round(values.monthly_budget_dollars * 100)
        : undefined,
      features_enabled: values.features_enabled,
    })
  }

  const handleTestConnection = () => {
    if (config) {
      testConfig.mutate(config)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 heading-page">
            <Bot className="w-6 h-6" />
            AI Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure AI-powered features for your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAIEnabled() && hasApiKey() ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="w-3 h-3" />
              AI Enabled
            </Badge>
          ) : !hasApiKey() ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              API Key Required
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="w-3 h-3" />
              AI Disabled
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="configuration">
        <TabsList>
          <TabsTrigger value="configuration" className="gap-2">
            <Settings className="w-4 h-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Zap className="w-4 h-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-2">
            <Activity className="w-4 h-4" />
            Usage & Billing
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Enable/Disable Toggle */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    AI Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="is_enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable AI Features</FormLabel>
                          <FormDescription>
                            Turn on AI-powered automation across the platform
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Provider Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Provider Configuration
                  </CardTitle>
                  <CardDescription>
                    Choose your AI provider and configure API access
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>AI Provider</FormLabel>
                        <RadixSelect
                          onValueChange={(value) => {
                            field.onChange(value)
                            // Reset model when provider changes
                            form.setValue(
                              'model_preference',
                              DEFAULT_MODELS[value as AIProviderType]
                            )
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PROVIDER_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex flex-col">
                                  <span>{option.label}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {option.description}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </RadixSelect>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedProvider !== 'local' && (
                    <FormField
                      control={form.control}
                      name="api_key"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            API Key
                          </FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <div className="relative flex-1">
                                <Input
                                  type={showApiKey ? 'text' : 'password'}
                                  placeholder={
                                    hasApiKey()
                                      ? '••••••••••••••••'
                                      : 'Enter your API key'
                                  }
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                  onClick={() => setShowApiKey(!showApiKey)}
                                >
                                  {showApiKey ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                          </div>
                          <FormDescription>
                            {selectedProvider === 'openai'
                              ? 'Get your API key from platform.openai.com'
                              : 'Get your API key from console.anthropic.com'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="model_preference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Model</FormLabel>
                        <RadixSelect onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getModelsForProvider(selectedProvider).map((model) => {
                              const pricing = MODEL_PRICING[model]
                              return (
                                <SelectItem key={model} value={model}>
                                  <div className="flex items-center justify-between gap-4">
                                    <span>{model}</span>
                                    {pricing && (
                                      <span className="text-xs text-muted-foreground">
                                        ${(pricing.input / 100).toFixed(3)}/1K in |{' '}
                                        ${(pricing.output / 100).toFixed(3)}/1K out
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </RadixSelect>
                        <FormDescription>
                          Choose the model to use for AI features. Smaller models are faster and
                          cheaper.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={testConfig.isPending || !config}
                    >
                      {testConfig.isPending ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      Test Connection
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Budget Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Budget Controls
                  </CardTitle>
                  <CardDescription>
                    Set monthly spending limits for AI features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="monthly_budget_dollars"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Budget ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="10"
                            placeholder="100"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          AI requests will be paused when this limit is reached. Leave empty for
                          unlimited.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={updateConfig.isPending}>
                  {updateConfig.isPending && (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save Configuration
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI Features</CardTitle>
                  <CardDescription>
                    Enable or disable individual AI-powered features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {FEATURE_INFO.map((feature) => (
                    <FormField
                      key={feature.key}
                      control={form.control}
                      name={`features_enabled.${feature.key}`}
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="flex items-start gap-3">
                            <feature.icon className="w-5 h-5 mt-0.5 text-muted-foreground" />
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">{feature.label}</FormLabel>
                              <FormDescription>{feature.description}</FormDescription>
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!form.watch('is_enabled')}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={updateConfig.isPending}>
                  {updateConfig.isPending && (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save Features
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Usage Overview
              </CardTitle>
              <CardDescription>
                {usageStats
                  ? `${usageStats.periodStart} to ${usageStats.periodEnd}`
                  : 'Current billing period'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Budget Progress */}
              {usageStats?.budgetCents && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Budget Used</span>
                    <span className="font-medium">
                      ${(usageStats.totalCostCents / 100).toFixed(2)} / $
                      {(usageStats.budgetCents / 100).toFixed(2)}
                    </span>
                  </div>
                  <Progress
                    value={usageStats.budgetUsedPercent}
                    className={
                      usageStats.budgetUsedPercent > 80 ? 'text-destructive' : undefined
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {usageStats.budgetUsedPercent}% of monthly budget used
                  </p>
                </div>
              )}

              <Separator />

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {usageStats?.totalTokens.toLocaleString() || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Tokens</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    ${((usageStats?.totalCostCents || 0) / 100).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {usageStats?.byFeature.reduce((sum, f) => sum + f.requestCount, 0) || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Requests</p>
                </div>
              </div>

              <Separator />

              {/* Usage by Feature */}
              <div className="space-y-3">
                <h4 className="font-medium heading-card">Usage by Feature</h4>
                {usageStats?.byFeature.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No usage data yet</p>
                ) : (
                  usageStats?.byFeature.map((feature) => (
                    <div
                      key={feature.feature}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="font-medium capitalize">
                          {feature.feature.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {feature.requestCount} requests | {feature.tokens.toLocaleString()}{' '}
                          tokens
                        </p>
                      </div>
                      <Badge variant="secondary">${(feature.costCents / 100).toFixed(2)}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cost Estimates */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Estimates</CardTitle>
              <CardDescription>
                Estimated monthly costs based on typical usage patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">RFI Routing</p>
                    <p className="text-sm text-muted-foreground">~500 RFIs/month</p>
                  </div>
                  <span>~$7/month</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">Daily Report Summaries</p>
                    <p className="text-sm text-muted-foreground">~2,000 reports/month</p>
                  </div>
                  <span>~$40/month</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">Meeting Action Items</p>
                    <p className="text-sm text-muted-foreground">~200 meetings/month</p>
                  </div>
                  <span>~$6/month</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">Weekly Status Reports</p>
                    <p className="text-sm text-muted-foreground">~400 projects * 4 weeks</p>
                  </div>
                  <span>~$16/month</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">Document Classification</p>
                    <p className="text-sm text-muted-foreground">~500 enhanced/month</p>
                  </div>
                  <span>~$10/month</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-2 font-medium">
                  <span>Estimated Total</span>
                  <span>~$80/month</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
