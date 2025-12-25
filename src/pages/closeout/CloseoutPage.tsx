/**
 * Closeout Page
 *
 * Project closeout document tracking and warranty management.
 * Provides a comprehensive view of all closeout requirements.
 */

import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  CloseoutDocumentList,
  WarrantyList,
  useCloseoutDocuments,
  useWarranties,
  useCloseoutStatistics,
  useWarrantyStatistics,
} from '@/features/closeout'
import type { CloseoutDocumentWithDetails, WarrantyWithDetails } from '@/types/closeout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjects } from '@/features/projects/hooks/useProjects'
import {
  FolderCheck,
  Building2,
  FileCheck,
  Shield,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
} from 'lucide-react'

export function CloseoutPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [activeTab, setActiveTab] = useState('documents')

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useProjects()

  // Fetch closeout data
  const {
    data: documents = [],
    isLoading: documentsLoading,
  } = useCloseoutDocuments(selectedProjectId || undefined)

  const {
    data: warranties = [],
    isLoading: warrantiesLoading,
  } = useWarranties(selectedProjectId || undefined)

  const { data: closeoutStats } = useCloseoutStatistics(selectedProjectId || undefined)
  const { data: warrantyStats } = useWarrantyStatistics(selectedProjectId || undefined)

  // Calculate overview stats
  const totalDocuments = documents.length
  const receivedDocuments = documents.filter((d: CloseoutDocumentWithDetails) => d.status === 'approved' || d.status === 'submitted').length
  const pendingDocuments = documents.filter((d: CloseoutDocumentWithDetails) => d.status === 'pending' || d.status === 'under_review').length
  const completionPercent = totalDocuments > 0 ? Math.round((receivedDocuments / totalDocuments) * 100) : 0

  const totalWarranties = warranties.length
  const activeWarranties = warranties.filter((w: WarrantyWithDetails) => w.status === 'active').length
  const expiringWarranties = warranties.filter((w: WarrantyWithDetails) => {
    const daysUntil = Math.ceil(
      (new Date(w.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    return w.status === 'active' && daysUntil <= 90 && daysUntil > 0
  }).length

  const isLoading = documentsLoading || warrantiesLoading

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 heading-page">
              <FolderCheck className="h-7 w-7 text-success" />
              Project Closeout
            </h1>
            <p className="text-secondary mt-1">
              Track closeout documents and warranty information
            </p>
          </div>
        </div>

        {/* Project Selector */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium text-secondary mb-1 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Select Project
                </label>
                <Select
                  value={selectedProjectId || 'none'}
                  onValueChange={(value) => setSelectedProjectId(value === 'none' ? '' : value)}
                  disabled={projectsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select a project...</SelectItem>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedProjectId ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2 heading-subsection">Select a Project</h3>
              <p className="text-muted">
                Choose a project above to view closeout documents and warranties
              </p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-disabled mb-4" />
              <p className="text-muted">Loading closeout data...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-info-light rounded-lg p-2">
                      <FileCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Documents</p>
                      <p className="text-xl font-bold">
                        {receivedDocuments}/{totalDocuments}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-success-light rounded-lg p-2">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Completion</p>
                      <p className="text-xl font-bold text-success">
                        {completionPercent}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 rounded-lg p-2">
                      <Shield className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Active Warranties</p>
                      <p className="text-xl font-bold">{activeWarranties}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${expiringWarranties > 0 ? 'bg-orange-100' : 'bg-muted'}`}>
                      <Clock className={`h-5 w-5 ${expiringWarranties > 0 ? 'text-orange-600' : 'text-secondary'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Expiring Soon</p>
                      <p className={`text-xl font-bold ${expiringWarranties > 0 ? 'text-orange-600' : ''}`}>
                        {expiringWarranties}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for Documents and Warranties */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  Documents ({totalDocuments})
                </TabsTrigger>
                <TabsTrigger value="warranties" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Warranties ({totalWarranties})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="mt-6">
                <CloseoutDocumentList
                  documents={documents}
                  statistics={closeoutStats}
                  onDocumentClick={(doc) => console.log('View document:', doc.id)}
                  onCreateDocument={() => console.log('Create document')}
                  onExport={() => console.log('Export documents')}
                />
              </TabsContent>

              <TabsContent value="warranties" className="mt-6">
                <WarrantyList
                  warranties={warranties}
                  statistics={warrantyStats}
                  onWarrantyClick={(w) => console.log('View warranty:', w.id)}
                  onCreateWarranty={() => console.log('Create warranty')}
                  onExport={() => console.log('Export warranties')}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  )
}

export default CloseoutPage
