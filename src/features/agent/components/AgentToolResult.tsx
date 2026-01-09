/**
 * Agent Tool Result
 * Displays tool execution results with expandable details and actions
 */

import React, { useState } from 'react'
import { format } from 'date-fns'
import {
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Copy,
  RotateCcw,
  FileText,
  Search,
  Route,
  PenLine,
  Calendar,
  AlertTriangle,
  FileStack,
  ListTodo,
  DollarSign,
  Users,
  CloudSun,
  HardHat,
  ClipboardCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ============================================================================
// Types
// ============================================================================

export interface ToolResultProps {
  toolName: string
  input?: Record<string, unknown>
  output?: unknown
  error?: string | null
  status: 'pending' | 'executing' | 'success' | 'error'
  executionTimeMs?: number
  timestamp?: string
  onRetry?: () => void
  onNavigate?: (type: string, id: string) => void
  showDetails?: boolean
  compact?: boolean
}

interface ToolConfig {
  displayName: string
  icon: React.ReactNode
  color: string
  formatOutput: (output: unknown) => React.ReactNode
}

// ============================================================================
// Tool Configuration
// ============================================================================

const TOOL_CONFIGS: Record<string, ToolConfig> = {
  summarize_daily_report: {
    displayName: 'Daily Report Summary',
    icon: <FileText className="h-4 w-4" />,
    color: 'text-blue-500',
    formatOutput: (output) => <SummaryOutput output={output} />,
  },
  semantic_search: {
    displayName: 'Search Results',
    icon: <Search className="h-4 w-4" />,
    color: 'text-purple-500',
    formatOutput: (output) => <SearchResultsOutput output={output} />,
  },
  route_rfi: {
    displayName: 'RFI Routing',
    icon: <Route className="h-4 w-4" />,
    color: 'text-orange-500',
    formatOutput: (output) => <RoutingOutput output={output} />,
  },
  draft_rfi_response: {
    displayName: 'RFI Draft',
    icon: <PenLine className="h-4 w-4" />,
    color: 'text-green-500',
    formatOutput: (output) => <DraftOutput output={output} />,
  },
  weekly_status: {
    displayName: 'Weekly Status',
    icon: <Calendar className="h-4 w-4" />,
    color: 'text-indigo-500',
    formatOutput: (output) => <WeeklyStatusOutput output={output} />,
  },
  classify_document: {
    displayName: 'Document Classification',
    icon: <FileStack className="h-4 w-4" />,
    color: 'text-cyan-500',
    formatOutput: (output) => <ClassificationOutput output={output} />,
  },
  extract_action_items: {
    displayName: 'Action Items',
    icon: <ListTodo className="h-4 w-4" />,
    color: 'text-amber-500',
    formatOutput: (output) => <ActionItemsOutput output={output} />,
  },
  analyze_budget_variance: {
    displayName: 'Budget Analysis',
    icon: <DollarSign className="h-4 w-4" />,
    color: 'text-emerald-500',
    formatOutput: (output) => <BudgetOutput output={output} />,
  },
  assess_risk: {
    displayName: 'Risk Assessment',
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-red-500',
    formatOutput: (output) => <RiskOutput output={output} />,
  },
  evaluate_contractor: {
    displayName: 'Contractor Evaluation',
    icon: <Users className="h-4 w-4" />,
    color: 'text-violet-500',
    formatOutput: (output) => <ContractorOutput output={output} />,
  },
  weather_forecast: {
    displayName: 'Weather Forecast',
    icon: <CloudSun className="h-4 w-4" />,
    color: 'text-sky-500',
    formatOutput: (output) => <WeatherOutput output={output} />,
  },
  generate_safety_checklist: {
    displayName: 'Safety Checklist',
    icon: <HardHat className="h-4 w-4" />,
    color: 'text-yellow-600',
    formatOutput: (output) => <SafetyOutput output={output} />,
  },
  schedule_inspection: {
    displayName: 'Inspection Schedule',
    icon: <ClipboardCheck className="h-4 w-4" />,
    color: 'text-teal-500',
    formatOutput: (output) => <InspectionOutput output={output} />,
  },
}

const DEFAULT_CONFIG: ToolConfig = {
  displayName: 'Tool Result',
  icon: <CheckCircle className="h-4 w-4" />,
  color: 'text-gray-500',
  formatOutput: (output) => <GenericOutput output={output} />,
}

// ============================================================================
// Main Component
// ============================================================================

export function AgentToolResult({
  toolName,
  input,
  output,
  error,
  status,
  executionTimeMs,
  timestamp,
  onRetry,
  onNavigate,
  showDetails = true,
  compact = false,
}: ToolResultProps) {
  const [isExpanded, setIsExpanded] = useState(!compact)
  const [showInput, setShowInput] = useState(false)

  const config = TOOL_CONFIGS[toolName] || {
    ...DEFAULT_CONFIG,
    displayName: formatToolName(toolName),
  }

  const handleCopy = () => {
    const text = typeof output === 'string' ? output : JSON.stringify(output, null, 2)
    navigator.clipboard.writeText(text)
  }

  // Status indicator
  const StatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      case 'executing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1 px-2 rounded-lg bg-muted/50">
        <span className={cn('shrink-0', config.color)}>{config.icon}</span>
        <span className="text-sm font-medium truncate">{config.displayName}</span>
        <StatusIcon />
        {status === 'error' && error && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[200px] text-xs">{error}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    )
  }

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="p-3 pb-0">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-2">
                <span className={cn('shrink-0', config.color)}>{config.icon}</span>
                <span className="font-medium text-sm">{config.displayName}</span>
                <Badge
                  variant={
                    status === 'success'
                      ? 'success'
                      : status === 'error'
                      ? 'destructive'
                      : 'secondary'
                  }
                  className="text-xs"
                >
                  {status === 'pending'
                    ? 'Waiting'
                    : status === 'executing'
                    ? 'Running'
                    : status === 'success'
                    ? 'Complete'
                    : 'Failed'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {executionTimeMs && status !== 'pending' && status !== 'executing' && (
                  <span className="text-xs text-muted-foreground">
                    {executionTimeMs < 1000
                      ? `${executionTimeMs}ms`
                      : `${(executionTimeMs / 1000).toFixed(1)}s`}
                  </span>
                )}
                <StatusIcon />
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="p-3 pt-2">
            {/* Error display */}
            {error && (
              <div className="mb-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                      Error
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
                  </div>
                  {onRetry && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onRetry}
                      className="shrink-0"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Output display */}
            {output && status === 'success' && (
              <div className="space-y-2">
                {config.formatOutput(output)}
              </div>
            )}

            {/* Loading state */}
            {(status === 'pending' || status === 'executing') && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                <span className="text-sm text-muted-foreground">
                  {status === 'pending' ? 'Waiting to execute...' : 'Executing...'}
                </span>
              </div>
            )}

            {/* Footer with actions */}
            {showDetails && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <div className="flex items-center gap-2">
                  {input && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowInput(!showInput)}
                      className="text-xs"
                    >
                      {showInput ? 'Hide Input' : 'Show Input'}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {output && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={handleCopy}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy output</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {timestamp && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(timestamp), 'h:mm a')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Input details (collapsible) */}
            {showInput && input && (
              <div className="mt-3 p-2 rounded bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-1">Input</p>
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(input, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

// ============================================================================
// Output Components
// ============================================================================

function GenericOutput({ output }: { output: unknown }) {
  if (typeof output === 'string') {
    return <p className="text-sm whitespace-pre-wrap">{output}</p>
  }

  if (typeof output === 'object' && output !== null) {
    const obj = output as Record<string, unknown>
    return (
      <div className="space-y-2">
        {Object.entries(obj).map(([key, value]) => {
          if (key.startsWith('_')) return null

          return (
            <div key={key} className="flex gap-2">
              <span className="text-xs text-muted-foreground capitalize min-w-[100px]">
                {key.replace(/_/g, ' ')}:
              </span>
              <span className="text-sm">
                {Array.isArray(value)
                  ? value.length + ' items'
                  : typeof value === 'object'
                  ? JSON.stringify(value)
                  : String(value)}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return null
}

function SummaryOutput({ output }: { output: unknown }) {
  const data = output as { summary?: string; highlights?: string[]; metrics?: Record<string, number> }

  return (
    <div className="space-y-3">
      {data.summary && (
        <p className="text-sm leading-relaxed">{data.summary}</p>
      )}

      {data.highlights && data.highlights.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Highlights</p>
          <ul className="space-y-1">
            {data.highlights.map((item, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <span className="text-primary mt-1.5">-</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.metrics && Object.keys(data.metrics).length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(data.metrics).map(([key, value]) => (
            <div key={key} className="p-2 rounded bg-muted/50">
              <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
              <p className="font-semibold">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SearchResultsOutput({ output }: { output: unknown }) {
  const data = output as { results?: Array<{ id: string; title: string; type: string; score: number; snippet?: string }> }

  if (!data.results || data.results.length === 0) {
    return <p className="text-sm text-muted-foreground">No results found</p>
  }

  return (
    <div className="space-y-2">
      {data.results.slice(0, 5).map((result) => (
        <div
          key={result.id}
          className="p-2 rounded border hover:bg-muted/50 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{result.title}</span>
            <Badge variant="outline" className="text-xs">
              {result.type}
            </Badge>
          </div>
          {result.snippet && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {result.snippet}
            </p>
          )}
        </div>
      ))}
      {data.results.length > 5 && (
        <p className="text-xs text-muted-foreground text-center">
          +{data.results.length - 5} more results
        </p>
      )}
    </div>
  )
}

function RoutingOutput({ output }: { output: unknown }) {
  const data = output as {
    recommended_assignee?: { name: string; role: string; confidence: number }
    reasoning?: string
    alternatives?: Array<{ name: string; role: string }>
  }

  return (
    <div className="space-y-3">
      {data.recommended_assignee && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs font-medium text-primary mb-1">Recommended</p>
          <p className="font-medium">{data.recommended_assignee.name}</p>
          <p className="text-sm text-muted-foreground">{data.recommended_assignee.role}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${data.recommended_assignee.confidence * 100}%` }}
              />
            </div>
            <span className="text-xs">
              {Math.round(data.recommended_assignee.confidence * 100)}%
            </span>
          </div>
        </div>
      )}

      {data.reasoning && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Reasoning</p>
          <p className="text-sm">{data.reasoning}</p>
        </div>
      )}

      {data.alternatives && data.alternatives.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Alternatives</p>
          <div className="flex flex-wrap gap-2">
            {data.alternatives.map((alt, idx) => (
              <Badge key={idx} variant="secondary">
                {alt.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DraftOutput({ output }: { output: unknown }) {
  const data = output as { draft?: string; subject?: string; confidence?: number }

  return (
    <div className="space-y-3">
      {data.subject && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Subject</p>
          <p className="text-sm font-medium">{data.subject}</p>
        </div>
      )}
      {data.draft && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Draft Response</p>
          <div className="p-3 rounded bg-muted/50 text-sm whitespace-pre-wrap">
            {data.draft}
          </div>
        </div>
      )}
    </div>
  )
}

function WeeklyStatusOutput({ output }: { output: unknown }) {
  const data = output as {
    summary?: string
    accomplishments?: string[]
    issues?: string[]
    next_week?: string[]
  }

  return (
    <div className="space-y-3">
      {data.summary && <p className="text-sm">{data.summary}</p>}

      {data.accomplishments && data.accomplishments.length > 0 && (
        <div>
          <p className="text-xs font-medium text-emerald-600 mb-1">Accomplishments</p>
          <ul className="space-y-1">
            {data.accomplishments.map((item, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.issues && data.issues.length > 0 && (
        <div>
          <p className="text-xs font-medium text-amber-600 mb-1">Issues</p>
          <ul className="space-y-1">
            {data.issues.map((item, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.next_week && data.next_week.length > 0 && (
        <div>
          <p className="text-xs font-medium text-blue-600 mb-1">Next Week</p>
          <ul className="space-y-1">
            {data.next_week.map((item, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <span className="text-blue-500 mt-1">-</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ClassificationOutput({ output }: { output: unknown }) {
  const data = output as {
    category?: string
    subcategory?: string
    confidence?: number
    tags?: string[]
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="default">{data.category}</Badge>
        {data.subcategory && <Badge variant="secondary">{data.subcategory}</Badge>}
      </div>

      {data.confidence && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Confidence:</span>
          <div className="flex-1 max-w-[100px] h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: `${data.confidence * 100}%` }}
            />
          </div>
          <span className="text-xs">{Math.round(data.confidence * 100)}%</span>
        </div>
      )}

      {data.tags && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.tags.map((tag, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

function ActionItemsOutput({ output }: { output: unknown }) {
  const data = output as {
    items?: Array<{ task: string; assignee?: string; due?: string; priority?: string }>
  }

  if (!data.items || data.items.length === 0) {
    return <p className="text-sm text-muted-foreground">No action items found</p>
  }

  return (
    <div className="space-y-2">
      {data.items.map((item, idx) => (
        <div key={idx} className="p-2 rounded border flex items-start gap-2">
          <input type="checkbox" className="mt-1" />
          <div className="flex-1">
            <p className="text-sm">{item.task}</p>
            <div className="flex items-center gap-2 mt-1">
              {item.assignee && (
                <Badge variant="secondary" className="text-xs">
                  {item.assignee}
                </Badge>
              )}
              {item.due && (
                <span className="text-xs text-muted-foreground">{item.due}</span>
              )}
              {item.priority && (
                <Badge
                  variant={
                    item.priority === 'high'
                      ? 'destructive'
                      : item.priority === 'medium'
                      ? 'warning'
                      : 'secondary'
                  }
                  className="text-xs"
                >
                  {item.priority}
                </Badge>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function BudgetOutput({ output }: { output: unknown }) {
  const data = output as {
    total_budget?: number
    spent?: number
    variance?: number
    variance_percent?: number
    categories?: Array<{ name: string; budget: number; spent: number }>
  }

  return (
    <div className="space-y-3">
      {data.total_budget && (
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">Budget</p>
            <p className="font-semibold">${data.total_budget.toLocaleString()}</p>
          </div>
          <div className="p-2 rounded bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">Spent</p>
            <p className="font-semibold">${(data.spent || 0).toLocaleString()}</p>
          </div>
          <div className="p-2 rounded bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">Variance</p>
            <p
              className={cn(
                'font-semibold',
                (data.variance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {(data.variance || 0) >= 0 ? '+' : ''}
              {data.variance_percent?.toFixed(1)}%
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function RiskOutput({ output }: { output: unknown }) {
  const data = output as {
    overall_risk?: 'low' | 'medium' | 'high' | 'critical'
    risks?: Array<{ risk: string; severity: string; mitigation?: string }>
  }

  const riskColors = {
    low: 'bg-green-100 text-green-700 border-green-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    critical: 'bg-red-100 text-red-700 border-red-200',
  }

  return (
    <div className="space-y-3">
      {data.overall_risk && (
        <div
          className={cn(
            'px-3 py-2 rounded-lg border text-center font-medium capitalize',
            riskColors[data.overall_risk]
          )}
        >
          {data.overall_risk} Risk
        </div>
      )}

      {data.risks && data.risks.length > 0 && (
        <div className="space-y-2">
          {data.risks.map((item, idx) => (
            <div key={idx} className="p-2 rounded border">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{item.risk}</p>
                <Badge
                  variant={
                    item.severity === 'high' || item.severity === 'critical'
                      ? 'destructive'
                      : item.severity === 'medium'
                      ? 'warning'
                      : 'secondary'
                  }
                  className="text-xs"
                >
                  {item.severity}
                </Badge>
              </div>
              {item.mitigation && (
                <p className="text-xs text-muted-foreground mt-1">
                  Mitigation: {item.mitigation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ContractorOutput({ output }: { output: unknown }) {
  return <GenericOutput output={output} />
}

function WeatherOutput({ output }: { output: unknown }) {
  const data = output as {
    current?: { temp: number; condition: string }
    forecast?: Array<{ day: string; high: number; low: number; condition: string }>
    alerts?: string[]
  }

  return (
    <div className="space-y-3">
      {data.current && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-sky-100 to-blue-100 dark:from-sky-900/30 dark:to-blue-900/30">
          <CloudSun className="h-10 w-10 text-sky-500" />
          <div>
            <p className="text-2xl font-bold">{data.current.temp}°F</p>
            <p className="text-sm text-muted-foreground">{data.current.condition}</p>
          </div>
        </div>
      )}

      {data.forecast && data.forecast.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {data.forecast.slice(0, 3).map((day, idx) => (
            <div key={idx} className="p-2 rounded bg-muted/50 text-center">
              <p className="text-xs font-medium">{day.day}</p>
              <p className="text-sm">
                {day.high}° / {day.low}°
              </p>
              <p className="text-xs text-muted-foreground">{day.condition}</p>
            </div>
          ))}
        </div>
      )}

      {data.alerts && data.alerts.length > 0 && (
        <div className="p-2 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Weather Alerts</span>
          </div>
          <ul className="mt-1 text-sm text-amber-600 dark:text-amber-300">
            {data.alerts.map((alert, idx) => (
              <li key={idx}>- {alert}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function SafetyOutput({ output }: { output: unknown }) {
  const data = output as {
    checklist?: Array<{ item: string; required: boolean; category?: string }>
    hazards?: string[]
  }

  return (
    <div className="space-y-3">
      {data.hazards && data.hazards.length > 0 && (
        <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
            Identified Hazards
          </p>
          <ul className="text-sm text-red-600 dark:text-red-300">
            {data.hazards.map((hazard, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                {hazard}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.checklist && data.checklist.length > 0 && (
        <div className="space-y-1">
          {data.checklist.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50">
              <input type="checkbox" className="rounded" />
              <span className="text-sm flex-1">{item.item}</span>
              {item.required && (
                <Badge variant="destructive" className="text-xs">
                  Required
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InspectionOutput({ output }: { output: unknown }) {
  return <GenericOutput output={output} />
}

// ============================================================================
// Helpers
// ============================================================================

function formatToolName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ============================================================================
// Streaming Tool Result
// ============================================================================

export function StreamingToolResult({
  toolName,
  status,
  arguments: args,
}: {
  toolName: string
  status: 'pending' | 'executing' | 'complete' | 'error'
  arguments: string
}) {
  const config = TOOL_CONFIGS[toolName] || {
    ...DEFAULT_CONFIG,
    displayName: formatToolName(toolName),
  }

  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/50 animate-pulse">
      <span className={cn('shrink-0', config.color)}>{config.icon}</span>
      <span className="text-sm font-medium">{config.displayName}</span>
      <Loader2 className="h-4 w-4 animate-spin ml-auto" />
    </div>
  )
}
