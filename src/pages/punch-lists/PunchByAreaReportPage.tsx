/**
 * Punch by Area Report Page
 *
 * Page wrapper for the PunchByAreaReport component.
 * Provides standard page layout with navigation.
 */

import { useParams, useNavigate } from 'react-router-dom'
import { SmartLayout } from '@/components/layout/SmartLayout'
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
    <SmartLayout title="Punch by Area Report">
      <PunchByAreaReport projectId={projectId} />
    </SmartLayout>
  )
}

export default PunchByAreaReportPage
