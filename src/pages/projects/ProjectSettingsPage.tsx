// File: /src/pages/projects/ProjectSettingsPage.tsx
// Project settings page with team management, financial settings, and feature toggles

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { useProject, useUpdateProject } from '@/features/projects/hooks/useProjects'
import { ProjectTeamManagement } from '@/features/projects/components/ProjectTeamManagement'
import { DeleteProjectConfirmation } from '@/features/projects/components/DeleteProjectConfirmation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Settings,
  DollarSign,
  Thermometer,
  ToggleLeft,
  AlertTriangle,
  Loader2,
  Save,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/lib/notifications/ToastContext'
import { FEATURE_TOGGLES } from '@/features/projects/types/settings'
import { cn } from '@/lib/utils'

export function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const { success, error: showError } = useToast()

  const { data: project, isLoading, error } = useProject(projectId || '')
  const updateProject = useUpdateProject()

  // Form state
  const [contractValue, setContractValue] = useState<string>('')
  const [budget, setBudget] = useState<string>('')
  const [contingencyPercent, setContingencyPercent] = useState<string>('')
  const [weatherUnits, setWeatherUnits] = useState<'imperial' | 'metric'>('imperial')
  const [isSavingFinancial, setIsSavingFinancial] = useState(false)

  // Feature toggles state
  const [featureToggles, setFeatureToggles] = useState<Record<string, boolean>>({})
  const [isSavingFeatures, setIsSavingFeatures] = useState(false)

  // Initialize form when project loads
  useState(() => {
    if (project) {
      setContractValue(project.contract_value?.toString() || '')
      setBudget(project.budget?.toString() || '')
      setWeatherUnits((project as any).weather_units || 'imperial')
    }
  })

  // Check permissions
  const isAdmin = userProfile?.role === 'owner' || userProfile?.role === 'admin'

  if (!projectId) {
    return (
      <SmartLayout title="Project Settings">
        <div className="p-6 text-center">
          <p className="text-destructive">Project ID not found</p>
        </div>
      </SmartLayout>
    )
  }

  if (isLoading) {
    return (
      <SmartLayout title="Project Settings">
        <div className="container max-w-4xl py-6 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </SmartLayout>
    )
  }

  if (error || !project) {
    return (
      <SmartLayout title="Project Settings">
        <div className="container max-w-4xl py-6">
          <Button variant="outline" onClick={() => navigate(`/projects/${projectId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project
          </Button>
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.message || 'Failed to load project settings'}
            </AlertDescription>
          </Alert>
        </div>
      </SmartLayout>
    )
  }

  const handleSaveFinancial = async () => {
    setIsSavingFinancial(true)
    try {
      await updateProject.mutateAsync({
        projectId: project.id,
        updates: {
          contract_value: contractValue ? parseFloat(contractValue) : undefined,
          budget: budget ? parseFloat(budget) : undefined,
        },
      })
      success('Settings Saved', 'Financial settings have been updated')
    } catch (err) {
      showError('Error', 'Failed to save financial settings')
    } finally {
      setIsSavingFinancial(false)
    }
  }

  const handleToggleFeature = async (key: string, enabled: boolean) => {
    setFeatureToggles(prev => ({ ...prev, [key]: enabled }))
    // In a full implementation, this would save to a project_settings table
    success('Feature Updated', `Feature has been ${enabled ? 'enabled' : 'disabled'}`)
  }

  return (
    <SmartLayout title="Project Settings">
      <div className="container max-w-4xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to={`/projects/${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="heading-page flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Project Settings
            </h1>
            <p className="text-muted-foreground">{project.name}</p>
          </div>
        </div>

        {/* Team Management */}
        <ProjectTeamManagement
          projectId={projectId}
          companyId={userProfile?.company_id || ''}
        />

        {/* Financial Settings */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Settings
              </CardTitle>
              <CardDescription>
                Configure contract value and budget tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contract_value">Contract Value</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contract_value"
                      type="number"
                      value={contractValue}
                      onChange={(e) => setContractValue(e.target.value)}
                      placeholder="0.00"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Project Budget</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="budget"
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="0.00"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contingency">Contingency (%)</Label>
                <Input
                  id="contingency"
                  type="number"
                  value={contingencyPercent}
                  onChange={(e) => setContingencyPercent(e.target.value)}
                  placeholder="10"
                  className="max-w-[120px]"
                  min={0}
                  max={100}
                />
              </div>
              <div className="pt-2">
                <Button onClick={handleSaveFinancial} disabled={isSavingFinancial}>
                  {isSavingFinancial ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Financial Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weather Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              Weather Display
            </CardTitle>
            <CardDescription>
              Configure how weather data is displayed for this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Temperature Units</Label>
              <Select value={weatherUnits} onValueChange={(v) => setWeatherUnits(v as 'imperial' | 'metric')}>
                <SelectTrigger className="max-w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="imperial">Fahrenheit (°F)</SelectItem>
                  <SelectItem value="metric">Celsius (°C)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ToggleLeft className="h-5 w-5" />
                Feature Toggles
              </CardTitle>
              <CardDescription>
                Enable or disable features for this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {FEATURE_TOGGLES.map(feature => (
                  <div
                    key={feature.key}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">{feature.label}</p>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                    <Switch
                      checked={featureToggles[feature.key] ?? true}
                      onCheckedChange={(checked) => handleToggleFeature(feature.key, checked)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Danger Zone */}
        {isAdmin && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions that affect this project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg border-destructive/30 bg-destructive/5">
                <div>
                  <p className="font-medium">Delete Project</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this project and all associated data
                  </p>
                </div>
                <DeleteProjectConfirmation
                  projectId={project.id}
                  projectName={project.name}
                  onDeleted={() => navigate('/projects')}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SmartLayout>
  )
}

export default ProjectSettingsPage
