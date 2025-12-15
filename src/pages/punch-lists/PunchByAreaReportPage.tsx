/**
 * Punch by Area Report Page
 *
 * Page wrapper for the PunchByAreaReport component.
 * Provides standard page layout with navigation.
 */

import { useParams, useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { PunchByAreaReport } from '@/features/punch-lists/components'

export function PunchByAreaReportPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  // If no projectId, redirect to punch lists page
  if (!projectId) {
    navigate('/punch-lists')
    return null
  }

  return (
    <AppLayout>
      <PunchByAreaReport projectId={projectId} />
    </AppLayout>
  )
}

export default PunchByAreaReportPage
