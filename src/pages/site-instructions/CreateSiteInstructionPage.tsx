import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useToast } from '@/lib/notifications/ToastContext'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useCreateSiteInstruction } from '@/features/site-instructions/hooks'
import { SiteInstructionForm } from '@/features/site-instructions/components'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import { useProject } from '@/features/projects/hooks/useProjects'

export default function CreateSiteInstructionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('project') || ''
  const { success, error } = useToast()

  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const { data: contacts = [], isLoading: contactsLoading } = useContacts(projectId)
  const createMutation = useCreateSiteInstruction()

  // Filter to only subcontractors
  const subcontractors = contacts.filter((c) => c.contact_type === 'subcontractor')

  const handleSubmit = async (data: any) => {
    try {
      const result = await createMutation.mutateAsync(data)
      success('Success', 'Site instruction created successfully')
      navigate(`/site-instructions/${result.id}`)
    } catch (err) {
      error('Error', 'Failed to create site instruction')
    }
  }

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground mb-4">No project selected</p>
        <Button variant="outline" onClick={() => navigate('/site-instructions')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Site Instructions
        </Button>
      </div>
    )
  }

  if (projectLoading || contactsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold heading-page">New Site Instruction</h1>
          {project && (
            <p className="text-muted-foreground">Project: {project.name}</p>
          )}
        </div>
      </div>

      {/* Form */}
      <SiteInstructionForm
        projectId={projectId}
        contacts={subcontractors}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
        mode="create"
      />
    </div>
  )
}
