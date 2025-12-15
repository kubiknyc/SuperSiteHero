/**
 * Public Report Page
 *
 * Route handler for /reports/public/:token
 * Displays shared reports without authentication.
 */

import { PublicReportViewer } from '@/features/reports/components/PublicReportViewer'

export function PublicReportPage() {
  return <PublicReportViewer />
}

export default PublicReportPage
