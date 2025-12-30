// File: /src/pages/analytics/AnalyticsPage.tsx
// Project Analytics Page - Displays predictive analytics dashboard

import { useParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui'
import { AppLayout } from '@/components/layout/AppLayout'
import { PredictiveAnalyticsDashboard } from '@/features/analytics/components'
import { useProjects } from '@/features/projects/hooks/useProjects'

/**
 * AnalyticsPage Component
 *
 * Displays the predictive analytics dashboard for a project.
 * Shows risk scores, budget/schedule predictions, trends, and recommendations.
 *
 * URL: /projects/:projectId/analytics
 *
 * Usage:
 * Navigate to /projects/abc-123/analytics to view analytics for that project.
 */
export function AnalyticsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: projects } = useProjects()

  // If no projectId in URL, show project selector
  if (!projectId) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <h1 className="text-2xl font-bold text-foreground heading-page">
            Predictive Analytics
          </h1>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <span className="text-4xl">📊</span>
                <h2 className="text-xl font-medium mt-4 heading-section">Select a Project</h2>
                <p className="text-muted mt-2">
                  Choose a project to view its predictive analytics dashboard
                </p>

                {projects && projects.length > 0 ? (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
                    {projects.map((project) => (
                      <Link
                        key={project.id}
                        to={`/projects/${project.id}/analytics`}
                        className="p-4 border rounded-lg hover:bg-surface hover:border-blue-300 transition-colors text-left"
                      >
                        <h3 className="font-medium text-foreground heading-subsection">
                          {project.name}
                        </h3>
                        <p className="text-sm text-muted truncate">
                          {project.project_number || 'No project number'}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-disabled mt-4">
                    No projects available. Create a project first.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Breadcrumb */}
        <nav className="text-sm">
          <ol className="flex items-center gap-2 text-muted">
            <li>
              <Link to="/projects" className="hover:text-primary">
                Projects
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link to={`/projects/${projectId}`} className="hover:text-primary">
                Project Details
              </Link>
            </li>
            <li>/</li>
            <li className="text-foreground font-medium">Analytics</li>
          </ol>
        </nav>

        {/* Dashboard */}
        <PredictiveAnalyticsDashboard projectId={projectId} />
      </div>
    </AppLayout>
  )
}

export default AnalyticsPage
