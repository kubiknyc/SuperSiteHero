/**
 * Report Builder Page
 *
 * Page for creating and editing report templates.
 * Provides step-by-step wizard for building custom reports.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Play,
  Loader2,
  CheckCircle,
  Settings,
  Columns,
  Filter,
  SortAsc,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  useReportTemplate,
  useCreateReportTemplate,
  useUpdateReportTemplate,
  useSaveTemplateConfiguration,
  useFieldDefinitions,
} from '@/features/reports/hooks/useReportBuilder'
import { DataSourceSelector } from '@/features/reports/components/DataSourceSelector'
import { FieldPicker } from '@/features/reports/components/FieldPicker'
import { FilterBuilder } from '@/features/reports/components/FilterBuilder'
import { ChartBuilder } from '@/features/reports/components/ChartBuilder'
import type {
  ReportDataSource,
  ReportOutputFormat,
  ReportTemplateFieldInput,
  ReportTemplateFilterInput,
  ChartConfiguration,
} from '@/types/report-builder'
import { OUTPUT_FORMAT_CONFIG, generateDefaultTemplateName } from '@/types/report-builder'
import { generateReport, downloadReport } from '@/features/reports/services/reportExportService'
import { useToast } from '@/components/ui/use-toast'
import { logger } from '../../lib/utils/logger';


// Steps in the report builder wizard
const STEPS = [
  { id: 'source', label: 'Data Source', icon: Settings },
  { id: 'fields', label: 'Select Fields', icon: Columns },
  { id: 'filters', label: 'Filters', icon: Filter },
  { id: 'visualization', label: 'Visualization', icon: BarChart3 },
  { id: 'options', label: 'Options', icon: SortAsc },
]

export function ReportBuilderPage() {
  const navigate = useNavigate()
  const { templateId } = useParams<{ templateId: string }>()
  const [searchParams] = useSearchParams()
  const isRunMode = searchParams.get('run') === 'true'
  const isEditMode = !!templateId

  const { userProfile } = useAuth()
  const { toast } = useToast()
  const companyId = userProfile?.company_id

  // State
  const [currentStep, setCurrentStep] = useState(0)
  const [dataSource, setDataSource] = useState<ReportDataSource | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [description, setDescription] = useState('')
  const [isShared, setIsShared] = useState(false)
  const [outputFormat, setOutputFormat] = useState<ReportOutputFormat>('pdf')
  const [selectedFields, setSelectedFields] = useState<ReportTemplateFieldInput[]>([])
  const [filters, setFilters] = useState<ReportTemplateFilterInput[]>([])
  const [chartConfig, setChartConfig] = useState<ChartConfiguration | null>(null)
  const [includeCharts, setIncludeCharts] = useState(true)
  const [includeSummary, setIncludeSummary] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  // Queries
  const { data: existingTemplate, isLoading: templateLoading } = useReportTemplate(templateId)
  const { data: fieldDefinitions, isLoading: fieldsLoading } = useFieldDefinitions(dataSource || undefined)

  // Mutations
  const createTemplate = useCreateReportTemplate()
  const updateTemplate = useUpdateReportTemplate()
  const saveConfig = useSaveTemplateConfiguration()

  // Load existing template data
  useEffect(() => {
    if (existingTemplate) {
      setDataSource(existingTemplate.data_source)
      setTemplateName(existingTemplate.name)
      setDescription(existingTemplate.description || '')
      setIsShared(existingTemplate.is_shared)
      setOutputFormat(existingTemplate.default_format)
      setIncludeCharts(existingTemplate.include_charts)
      setIncludeSummary(existingTemplate.include_summary)

      // Load chart configuration
      if (existingTemplate.configuration?.chartConfig) {
        setChartConfig(existingTemplate.configuration.chartConfig)
      }

      if (existingTemplate.fields) {
        setSelectedFields(existingTemplate.fields.map(f => ({
          field_name: f.field_name,
          display_name: f.display_name,
          field_type: f.field_type,
          display_order: f.display_order,
          column_width: f.column_width,
          is_visible: f.is_visible,
          aggregation: f.aggregation,
          format_string: f.format_string,
        })))
      }

      if (existingTemplate.filters) {
        setFilters(existingTemplate.filters.map(f => ({
          field_name: f.field_name,
          operator: f.operator,
          filter_value: f.filter_value,
          is_relative_date: f.is_relative_date,
          relative_date_value: f.relative_date_value,
          relative_date_unit: f.relative_date_unit,
          filter_group: f.filter_group,
          display_order: f.display_order,
        })))
      }
    }
  }, [existingTemplate])

  // Set default template name when data source changes
  useEffect(() => {
    if (dataSource && !isEditMode && !templateName) {
      setTemplateName(generateDefaultTemplateName(dataSource))
    }
  }, [dataSource, isEditMode, templateName])

  // Navigation
  const goToStep = (step: number) => {
    if (step >= 0 && step < STEPS.length) {
      setCurrentStep(step)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!dataSource
      case 1: return selectedFields.length > 0
      case 2: return true // Filters are optional
      case 3: return true // Charts are optional
      case 4: return !!templateName.trim()
      default: return false
    }
  }

  // Save template
  const handleSave = async () => {
    if (!companyId || !dataSource) {return}

    try {
      if (isEditMode && templateId) {
        // Update existing template
        await updateTemplate.mutateAsync({
          id: templateId,
          data: {
            name: templateName.trim(),
            description: description.trim() || null,
            is_shared: isShared,
            default_format: outputFormat,
            include_charts: includeCharts,
            include_summary: includeSummary,
            configuration: {
              chartConfig: chartConfig || undefined,
            },
          },
        })

        // Save configuration
        await saveConfig.mutateAsync({
          templateId,
          fields: selectedFields,
          filters: filters.length > 0 ? filters : undefined,
        })
      } else {
        // Create new template
        const template = await createTemplate.mutateAsync({
          company_id: companyId,
          name: templateName.trim(),
          description: description.trim() || null,
          data_source: dataSource,
          is_shared: isShared,
          default_format: outputFormat,
          include_charts: includeCharts,
          include_summary: includeSummary,
          configuration: {
            chartConfig: chartConfig || undefined,
          },
        })

        // Save configuration
        await saveConfig.mutateAsync({
          templateId: template.id,
          fields: selectedFields,
          filters: filters.length > 0 ? filters : undefined,
        })
      }

      navigate('/reports')
    } catch (error) {
      logger.error('Failed to save template:', error)
    }
  }

  // Run report - generates and downloads the report
  const handleRun = async () => {
    if (!dataSource || selectedFields.length === 0) {
      toast({
        title: 'Cannot Generate Report',
        description: 'Please select a data source and at least one field.',
        variant: 'destructive',
      })
      return
    }

    setIsGenerating(true)
    try {
      logger.log('Generating report...', { dataSource, outputFormat, fieldsCount: selectedFields.length })

      const result = await generateReport(outputFormat, {
        dataSource,
        fields: selectedFields,
        filters: filters.length > 0 ? filters : undefined,
        title: templateName || 'Custom Report',
        orientation: outputFormat === 'pdf' ? 'landscape' : undefined,
        chartConfig: includeCharts ? chartConfig || undefined : undefined,
        includeChart: includeCharts && !!chartConfig,
        companyName: userProfile?.company_name || undefined,
      })

      // Download the generated report
      downloadReport(result)

      toast({
        title: 'Report Generated',
        description: `Successfully generated ${outputFormat.toUpperCase()} report with ${result.rowCount} records.`,
      })

      logger.log('Report generated successfully:', { rowCount: result.rowCount, filename: result.filename })
    } catch (error) {
      logger.error('Failed to generate report:', error)
      toast({
        title: 'Report Generation Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const isSaving = createTemplate.isPending || updateTemplate.isPending || saveConfig.isPending

  if (templateLoading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/reports')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground heading-page">
                {isEditMode ? 'Edit Report Template' : 'New Report Template'}
              </h1>
              {dataSource && (
                <p className="text-muted text-sm mt-1">
                  {templateName || 'Untitled Report'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(isRunMode || selectedFields.length > 0) && (
              <Button
                variant="outline"
                onClick={handleRun}
                disabled={isGenerating || !dataSource || selectedFields.length === 0}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isGenerating ? 'Generating...' : 'Run Now'}
              </Button>
            )}
            <Button onClick={handleSave} disabled={!canProceed() || isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Template
            </Button>
          </div>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const Icon = step.icon
                const isCompleted = index < currentStep
                const isCurrent = index === currentStep

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => goToStep(index)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                      isCurrent
                        ? 'bg-info-light text-primary-hover'
                        : isCompleted
                        ? 'bg-success-light text-success-dark'
                        : 'text-muted hover:bg-muted'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                    <span className="font-medium hidden md:inline">{step.label}</span>
                    <span className="font-medium md:hidden">{index + 1}</span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {/* Step 1: Data Source */}
          {currentStep === 0 && (
            <DataSourceSelector
              value={dataSource}
              onChange={setDataSource}
            />
          )}

          {/* Step 2: Field Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {fieldsLoading ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted mt-2">Loading available fields...</p>
                  </CardContent>
                </Card>
              ) : fieldDefinitions ? (
                <FieldPicker
                  availableFields={fieldDefinitions}
                  selectedFields={selectedFields}
                  onFieldsChange={setSelectedFields}
                />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted">No fields available for this data source</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 3: Filters */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {fieldsLoading ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted mt-2">Loading available fields...</p>
                  </CardContent>
                </Card>
              ) : fieldDefinitions ? (
                <FilterBuilder
                  filters={filters}
                  onFiltersChange={setFilters}
                  availableFields={fieldDefinitions}
                />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted">Select a data source first to configure filters</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 4: Visualization */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {fieldsLoading ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted mt-2">Loading available fields...</p>
                  </CardContent>
                </Card>
              ) : fieldDefinitions ? (
                <ChartBuilder
                  availableFields={fieldDefinitions}
                  chartConfig={chartConfig}
                  onConfigChange={setChartConfig}
                />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted">Select a data source first to configure charts</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 5: Options */}
          {currentStep === 4 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Template Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Report Name *</Label>
                    <Input
                      id="name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Enter report name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what this report shows"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Share with Team</Label>
                      <p className="text-sm text-muted">
                        Allow others in your company to use this template
                      </p>
                    </div>
                    <Switch checked={isShared} onCheckedChange={setIsShared} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Output Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Default Format</Label>
                    <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as ReportOutputFormat)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OUTPUT_FORMAT_CONFIG.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            {format.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Include Charts</Label>
                      <p className="text-sm text-muted">
                        Add visual charts to the report
                      </p>
                    </div>
                    <Switch checked={includeCharts} onCheckedChange={setIncludeCharts} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Include Summary</Label>
                      <p className="text-sm text-muted">
                        Add summary totals at the end
                      </p>
                    </div>
                    <Switch checked={includeSummary} onCheckedChange={setIncludeSummary} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => goToStep(currentStep - 1)}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button onClick={() => goToStep(currentStep + 1)} disabled={!canProceed()}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={!canProceed() || isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Template
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

export default ReportBuilderPage
