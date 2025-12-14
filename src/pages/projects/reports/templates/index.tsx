/**
 * Report Templates Page
 *
 * Browse and use pre-built industry-standard report templates.
 */

import * as React from 'react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Play, Plus, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TemplateLibrary } from '@/features/reports/components/TemplateLibrary'
import { useCreateReportTemplate } from '@/features/reports/hooks/useReportBuilder'
import { useAuth } from '@/lib/auth/AuthContext'
import type { StandardTemplate } from '@/features/reports/services/standardTemplates'

export default function ReportTemplatesPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { user, userProfile } = useAuth()
  const [selectedTemplate, setSelectedTemplate] = useState<StandardTemplate | null>(null)
  const createTemplate = useCreateReportTemplate()
  const companyId = userProfile?.company_id

  const handleSelectTemplate = (template: StandardTemplate) => {
    setSelectedTemplate(template)
  }

  const handleUseTemplate = async () => {
    if (!selectedTemplate || !companyId) return

    // Create a new report template from the standard template
    try {
      const newTemplate = await createTemplate.mutateAsync({
        company_id: companyId,
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        data_source: selectedTemplate.data_source,
        is_shared: false,
        configuration: {
          selectedFieldIds: selectedTemplate.fields.map(f => f.field_name),
          chartConfig: selectedTemplate.include_charts ? {
            type: 'bar',
            showLegend: true,
          } : undefined,
        },
        default_format: selectedTemplate.default_format,
        page_orientation: selectedTemplate.page_orientation,
        include_charts: selectedTemplate.include_charts,
        include_summary: selectedTemplate.include_summary,
      })

      // Navigate to report builder with new template
      if (projectId) {
        navigate(`/projects/${projectId}/reports/builder/${newTemplate.id}`)
      } else {
        navigate(`/reports/builder/${newTemplate.id}`)
      }
    } catch (error) {
      console.error('Failed to create template:', error)
    }
  }

  const handleGenerateReport = () => {
    if (!selectedTemplate) return

    // Navigate to quick generate
    if (projectId) {
      navigate(`/projects/${projectId}/reports/generate?template=${selectedTemplate.id}`)
    } else {
      navigate(`/reports/generate?template=${selectedTemplate.id}`)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(projectId ? `/projects/${projectId}/reports` : '/reports')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
        </div>
      </div>

      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Report Templates</h1>
          <p className="text-muted-foreground mt-1">
            Pre-built industry-standard templates for construction project reporting
          </p>
        </div>
        {selectedTemplate && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGenerateReport}>
              <Play className="h-4 w-4 mr-2" />
              Quick Generate
            </Button>
            <Button onClick={handleUseTemplate} disabled={createTemplate.isPending}>
              {createTemplate.isPending ? 'Creating...' : 'Customize & Use'}
            </Button>
          </div>
        )}
      </div>

      {/* Selected Template Preview */}
      {selectedTemplate && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Selected: {selectedTemplate.name}</CardTitle>
                <CardDescription>{selectedTemplate.description}</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTemplate(null)}
              >
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Category:</span>{' '}
                <span className="capitalize font-medium">{selectedTemplate.category}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Format:</span>{' '}
                <span className="uppercase font-medium">{selectedTemplate.default_format}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Fields:</span>{' '}
                <span className="font-medium">{selectedTemplate.fields.length}</span>
              </div>
              {selectedTemplate.recommended_frequency && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Recommended:</span>{' '}
                  <span className="capitalize font-medium">{selectedTemplate.recommended_frequency}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Library */}
      <TemplateLibrary
        onSelectTemplate={handleSelectTemplate}
        selectedTemplateId={selectedTemplate?.id}
      />

      {/* Help Card */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            How to use Report Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">1. Browse Templates</h4>
              <p className="text-muted-foreground">
                Search and filter through pre-built templates organized by daily, weekly, and monthly reports.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">2. Select Template</h4>
              <p className="text-muted-foreground">
                Click on a template to select it. Preview the fields and configuration before using.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">3. Generate or Customize</h4>
              <p className="text-muted-foreground">
                Use "Quick Generate" for immediate reports or "Customize & Use" to modify the template.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
