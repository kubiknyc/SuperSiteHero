/**
 * Create Incident Page
 *
 * Page for reporting new safety incidents using the OSHA-compliant form.
 */

import { useNavigate, Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { IncidentReportForm } from '../components'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CreateIncidentPage() {
  const navigate = useNavigate()

  const handleSuccess = (incidentId: string) => {
    navigate(`/safety/${incidentId}`)
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <Link to="/safety">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Incidents
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground heading-page">Report Safety Incident</h1>
          <p className="text-muted mt-1">
            Complete this OSHA-compliant form to report a safety incident
          </p>
        </div>

        {/* Form */}
        <div className="bg-card rounded-lg border p-6">
          <IncidentReportForm
            onSuccess={handleSuccess}
            onCancel={() => navigate('/safety')}
          />
        </div>
      </div>
    </AppLayout>
  )
}

export default CreateIncidentPage
