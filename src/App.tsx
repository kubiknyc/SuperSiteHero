// File: /src/App.tsx
// Main application component with routing and authentication
// Phase 2 Performance: Implements route-based code splitting with React.lazy()

import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/auth/AuthContext'
import { ToastProvider } from './lib/notifications/ToastContext'
import { ErrorBoundary } from './components/errors/ErrorBoundary'
import { ToastContainer } from './components/notifications/ToastContainer'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { RouteLoadingFallback } from './components/loading/RouteLoadingFallback'
import { initDatabase, requestPersistentStorage } from './lib/offline/indexeddb'
import { initSyncManager } from './lib/offline/sync-manager'
import { logger } from './lib/utils/logger'

// Auth pages - loaded eagerly as they are the first pages users see
import { LoginPage } from './pages/auth/LoginPage'
import { SignupPage } from './pages/auth/SignupPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'

// Dashboard - loaded eagerly as it's the main landing page
import { DashboardPage } from './pages/DashboardPage'

// All other pages are lazy loaded to reduce initial bundle size
// Projects feature
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage').then(m => ({ default: m.ProjectsPage })))
const ProjectDetailPage = lazy(() => import('./pages/projects/ProjectDetailPage').then(m => ({ default: m.ProjectDetailPage })))

// Daily Reports feature
const DailyReportsPage = lazy(() => import('./pages/daily-reports/DailyReportsPage').then(m => ({ default: m.DailyReportsPage })))
const NewDailyReportPage = lazy(() => import('./pages/daily-reports/NewDailyReportPage').then(m => ({ default: m.NewDailyReportPage })))
const DailyReportDetailPage = lazy(() => import('./pages/daily-reports/DailyReportDetailPage').then(m => ({ default: m.DailyReportDetailPage })))
const DailyReportEditPage = lazy(() => import('./pages/daily-reports/DailyReportEditPage').then(m => ({ default: m.DailyReportEditPage })))

// Tasks feature
const TasksPage = lazy(() => import('./pages/tasks/TasksPage').then(m => ({ default: m.TasksPage })))
const TaskCreatePage = lazy(() => import('./pages/tasks/TaskCreatePage').then(m => ({ default: m.TaskCreatePage })))
const TaskDetailPage = lazy(() => import('./pages/tasks/TaskDetailPage').then(m => ({ default: m.TaskDetailPage })))
const TaskEditPage = lazy(() => import('./pages/tasks/TaskEditPage').then(m => ({ default: m.TaskEditPage })))

// Change Orders feature
const ChangeOrdersPage = lazy(() => import('./pages/change-orders/ChangeOrdersPage').then(m => ({ default: m.ChangeOrdersPage })))
const ChangeOrderDetailPage = lazy(() => import('./pages/change-orders/ChangeOrderDetailPage').then(m => ({ default: m.ChangeOrderDetailPage })))

// Documents feature
const DocumentDetailPage = lazy(() => import('./pages/documents/DocumentDetailPage').then(m => ({ default: m.DocumentDetailPage })))

// RFIs feature
const RFIDetailPage = lazy(() => import('./pages/rfis/RFIDetailPage').then(m => ({ default: m.RFIDetailPage })))

// Submittals feature
const SubmittalsPage = lazy(() => import('./pages/submittals/SubmittalsPage').then(m => ({ default: m.SubmittalsPage })))
const SubmittalDetailPage = lazy(() => import('./pages/submittals/SubmittalDetailPage').then(m => ({ default: m.SubmittalDetailPage })))

// Punch Lists feature
const PunchListsPage = lazy(() => import('./pages/punch-lists/PunchListsPage').then(m => ({ default: m.PunchListsPage })))
const PunchItemDetailPage = lazy(() => import('./pages/punch-lists/PunchItemDetailPage').then(m => ({ default: m.PunchItemDetailPage })))

// Workflows feature
const WorkflowsPage = lazy(() => import('./pages/workflows/WorkflowsPage').then(m => ({ default: m.WorkflowsPage })))
const WorkflowItemDetailPage = lazy(() => import('./pages/workflows/WorkflowItemDetailPage').then(m => ({ default: m.WorkflowItemDetailPage })))

// Checklists feature
const TemplatesPage = lazy(() => import('./features/checklists/pages/TemplatesPage').then(m => ({ default: m.default })))
const TemplateItemsPage = lazy(() => import('./features/checklists/pages/TemplateItemsPage').then(m => ({ default: m.TemplateItemsPage })))
const ExecutionsPage = lazy(() => import('./features/checklists/pages/ExecutionsPage').then(m => ({ default: m.ExecutionsPage })))
const ActiveExecutionPage = lazy(() => import('./features/checklists/pages/ActiveExecutionPage').then(m => ({ default: m.ActiveExecutionPage })))
const ExecutionDetailPage = lazy(() => import('./features/checklists/pages/ExecutionDetailPage').then(m => ({ default: m.ExecutionDetailPage })))

// Reports feature
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })))

// Approvals feature
const MyApprovalsPage = lazy(() => import('./pages/approvals/MyApprovalsPage').then(m => ({ default: m.MyApprovalsPage })))
const ApprovalRequestPage = lazy(() => import('./pages/approvals/ApprovalRequestPage').then(m => ({ default: m.ApprovalRequestPage })))
const ApprovalWorkflowsPage = lazy(() => import('./pages/settings/ApprovalWorkflowsPage').then(m => ({ default: m.ApprovalWorkflowsPage })))

// Schedule / Gantt Charts feature
const GanttChartPage = lazy(() => import('./pages/schedule/GanttChartPage').then(m => ({ default: m.GanttChartPage })))

// Predictive Analytics feature
const AnalyticsPage = lazy(() => import('./pages/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })))

// Safety Incidents feature
const IncidentsListPage = lazy(() => import('./features/safety/pages/IncidentsListPage').then(m => ({ default: m.IncidentsListPage })))
const IncidentDetailPage = lazy(() => import('./features/safety/pages/IncidentDetailPage').then(m => ({ default: m.IncidentDetailPage })))
const CreateIncidentPage = lazy(() => import('./features/safety/pages/CreateIncidentPage').then(m => ({ default: m.CreateIncidentPage })))

// Messaging feature
const MessagesPage = lazy(() => import('./features/messaging/pages/MessagesPage').then(m => ({ default: m.MessagesPage })))

// Notices feature
const NoticesPage = lazy(() => import('./pages/notices/NoticesPage').then(m => ({ default: m.NoticesPage })))
const NoticeDetailPage = lazy(() => import('./pages/notices/NoticeDetailPage').then(m => ({ default: m.NoticeDetailPage })))

// Subcontractor Portal feature
const SubcontractorLayout = lazy(() => import('./features/subcontractor-portal/components/SubcontractorLayout').then(m => ({ default: m.SubcontractorLayout })))
const SubcontractorDashboardPage = lazy(() => import('./pages/subcontractor-portal/SubcontractorDashboardPage').then(m => ({ default: m.SubcontractorDashboardPage })))
const SubcontractorBidsPage = lazy(() => import('./pages/subcontractor-portal/SubcontractorBidsPage').then(m => ({ default: m.SubcontractorBidsPage })))
const BidDetailPage = lazy(() => import('./pages/subcontractor-portal/BidDetailPage').then(m => ({ default: m.BidDetailPage })))
const SubcontractorPunchItemsPage = lazy(() => import('./pages/subcontractor-portal/SubcontractorPunchItemsPage').then(m => ({ default: m.SubcontractorPunchItemsPage })))
const SubcontractorTasksPage = lazy(() => import('./pages/subcontractor-portal/SubcontractorTasksPage').then(m => ({ default: m.SubcontractorTasksPage })))
const SubcontractorProjectsPage = lazy(() => import('./pages/subcontractor-portal/SubcontractorProjectsPage').then(m => ({ default: m.SubcontractorProjectsPage })))
const SubcontractorCompliancePage = lazy(() => import('./pages/subcontractor-portal/SubcontractorCompliancePage').then(m => ({ default: m.SubcontractorCompliancePage })))
const AcceptInvitationPage = lazy(() => import('./pages/auth/AcceptInvitationPage').then(m => ({ default: m.AcceptInvitationPage })))

// Client Portal feature
const ClientPortalLayout = lazy(() => import('./components/layout/ClientPortalLayout').then(m => ({ default: m.ClientPortalLayout })))
const ClientDashboard = lazy(() => import('./features/client-portal/pages/ClientDashboard').then(m => ({ default: m.ClientDashboard })))
const ClientProjectDetail = lazy(() => import('./features/client-portal/pages/ClientProjectDetail').then(m => ({ default: m.ClientProjectDetail })))
const ClientSchedule = lazy(() => import('./features/client-portal/pages/ClientSchedule').then(m => ({ default: m.ClientSchedule })))
const ClientPhotos = lazy(() => import('./features/client-portal/pages/ClientPhotos').then(m => ({ default: m.ClientPhotos })))
const ClientDocuments = lazy(() => import('./features/client-portal/pages/ClientDocuments').then(m => ({ default: m.ClientDocuments })))
const ClientRFIs = lazy(() => import('./features/client-portal/pages/ClientRFIs').then(m => ({ default: m.ClientRFIs })))
const ClientChangeOrders = lazy(() => import('./features/client-portal/pages/ClientChangeOrders').then(m => ({ default: m.ClientChangeOrders })))

// Photo Management feature
const PhotoOrganizerPage = lazy(() => import('./features/photos/pages/PhotoOrganizerPage').then(m => ({ default: m.PhotoOrganizerPage })))

// Material Receiving feature
const MaterialReceivingPage = lazy(() => import('./features/material-receiving/pages/MaterialReceivingPage').then(m => ({ default: m.MaterialReceivingPage })))
const MaterialReceivingDetailPage = lazy(() => import('./features/material-receiving/pages/MaterialReceivingDetailPage').then(m => ({ default: m.MaterialReceivingDetailPage })))

function App() {
  // Initialize IndexedDB for offline functionality
  useEffect(() => {
    let cleanupSync: (() => void) | null = null;

    const initOfflineDatabase = async () => {
      try {
        logger.log('[App] Initializing offline database...')
        await initDatabase()
        logger.log('[App] Offline database initialized successfully')

        // Request persistent storage to prevent eviction
        const isPersistent = await requestPersistentStorage()
        if (isPersistent) {
          logger.log('[App] Persistent storage granted')
        } else {
          logger.log('[App] Persistent storage not granted - data may be evicted under storage pressure')
        }

        // Initialize background sync manager
        logger.log('[App] Initializing background sync manager...')
        cleanupSync = initSyncManager()
        logger.log('[App] Background sync manager initialized')
      } catch (error) {
        logger.error('[App] Failed to initialize offline database:', error)
        // Don't block app startup on IndexedDB failure
      }
    }

    initOfflineDatabase()

    // Cleanup on unmount
    return () => {
      if (cleanupSync) {
        cleanupSync()
      }
    }
  }, [])

  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ToastProvider>
          <AuthProvider>
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                {/* Public routes - loaded eagerly */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/invite/:token" element={<AcceptInvitationPage />} />

                {/* Protected routes - lazy loaded for code splitting */}
                <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

                {/* Projects feature */}
                <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />

                {/* Daily Reports feature */}
                <Route path="/daily-reports" element={<ProtectedRoute><DailyReportsPage /></ProtectedRoute>} />
                <Route path="/daily-reports/new" element={<ProtectedRoute><NewDailyReportPage /></ProtectedRoute>} />
                <Route path="/daily-reports/:id" element={<ProtectedRoute><DailyReportDetailPage /></ProtectedRoute>} />
                <Route path="/daily-reports/:id/edit" element={<ProtectedRoute><DailyReportEditPage /></ProtectedRoute>} />

                {/* Change Orders feature */}
                <Route path="/change-orders" element={<ProtectedRoute><ChangeOrdersPage /></ProtectedRoute>} />
                <Route path="/change-orders/:id" element={<ProtectedRoute><ChangeOrderDetailPage /></ProtectedRoute>} />

                {/* Workflows feature (RFIs, Submittals) */}
                <Route path="/workflows" element={<ProtectedRoute><WorkflowsPage /></ProtectedRoute>} />
                <Route path="/workflows/:id" element={<ProtectedRoute><WorkflowItemDetailPage /></ProtectedRoute>} />

                {/* Tasks feature */}
                <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
                <Route path="/tasks/new" element={<ProtectedRoute><TaskCreatePage /></ProtectedRoute>} />
                <Route path="/tasks/:id" element={<ProtectedRoute><TaskDetailPage /></ProtectedRoute>} />
                <Route path="/tasks/:id/edit" element={<ProtectedRoute><TaskEditPage /></ProtectedRoute>} />

                {/* Documents feature */}
                <Route path="/documents/:documentId" element={<ProtectedRoute><DocumentDetailPage /></ProtectedRoute>} />

                {/* RFIs feature */}
                <Route path="/rfis/:rfiId" element={<ProtectedRoute><RFIDetailPage /></ProtectedRoute>} />

                {/* Submittals feature */}
                <Route path="/submittals" element={<ProtectedRoute><SubmittalsPage /></ProtectedRoute>} />
                <Route path="/submittals/:submittalId" element={<ProtectedRoute><SubmittalDetailPage /></ProtectedRoute>} />

                {/* Punch Lists feature */}
                <Route path="/punch-lists" element={<ProtectedRoute><PunchListsPage /></ProtectedRoute>} />
                <Route path="/punch-lists/:id" element={<ProtectedRoute><PunchItemDetailPage /></ProtectedRoute>} />

                {/* Checklists feature */}
                <Route path="/checklists/templates" element={<ProtectedRoute><TemplatesPage /></ProtectedRoute>} />
                <Route path="/checklists/templates/:templateId/items" element={<ProtectedRoute><TemplateItemsPage /></ProtectedRoute>} />
                <Route path="/checklists/executions" element={<ProtectedRoute><ExecutionsPage /></ProtectedRoute>} />
                <Route path="/checklists/executions/:executionId/fill" element={<ProtectedRoute><ActiveExecutionPage /></ProtectedRoute>} />
                <Route path="/checklists/executions/:executionId" element={<ProtectedRoute><ExecutionDetailPage /></ProtectedRoute>} />

                {/* Reports feature */}
                <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />

                {/* Approvals feature */}
                <Route path="/approvals" element={<ProtectedRoute><MyApprovalsPage /></ProtectedRoute>} />
                <Route path="/approvals/:id" element={<ProtectedRoute><ApprovalRequestPage /></ProtectedRoute>} />
                <Route path="/settings/approval-workflows" element={<ProtectedRoute><ApprovalWorkflowsPage /></ProtectedRoute>} />

                {/* Schedule / Gantt Charts feature */}
                <Route path="/projects/:projectId/schedule" element={<ProtectedRoute><GanttChartPage /></ProtectedRoute>} />

                {/* Predictive Analytics feature */}
                <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />

                {/* Safety Incidents feature */}
                <Route path="/safety" element={<ProtectedRoute><IncidentsListPage /></ProtectedRoute>} />
                <Route path="/safety/new" element={<ProtectedRoute><CreateIncidentPage /></ProtectedRoute>} />
                <Route path="/safety/:id" element={<ProtectedRoute><IncidentDetailPage /></ProtectedRoute>} />

                {/* Messaging feature */}
                <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
                <Route path="/messages/:conversationId" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />

                {/* Notices feature */}
                <Route path="/notices" element={<ProtectedRoute><NoticesPage /></ProtectedRoute>} />
                <Route path="/notices/:id" element={<ProtectedRoute><NoticeDetailPage /></ProtectedRoute>} />

                {/* Photo Management feature */}
                <Route path="/photos" element={<ProtectedRoute><PhotoOrganizerPage /></ProtectedRoute>} />

                {/* Material Receiving feature */}
                <Route path="/projects/:projectId/material-receiving" element={<ProtectedRoute><MaterialReceivingPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/material-receiving/:materialId" element={<ProtectedRoute><MaterialReceivingDetailPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/photos" element={<ProtectedRoute><PhotoOrganizerPage /></ProtectedRoute>} />

                {/* Subcontractor Portal feature - role-protected routes */}
                <Route path="/portal" element={<ProtectedRoute requiredRole="subcontractor"><SubcontractorLayout /></ProtectedRoute>}>
                  <Route index element={<SubcontractorDashboardPage />} />
                  <Route path="projects" element={<SubcontractorProjectsPage />} />
                  <Route path="bids" element={<SubcontractorBidsPage />} />
                  <Route path="bids/:bidId" element={<BidDetailPage />} />
                  <Route path="punch-items" element={<SubcontractorPunchItemsPage />} />
                  <Route path="tasks" element={<SubcontractorTasksPage />} />
                  <Route path="compliance" element={<SubcontractorCompliancePage />} />
                </Route>

                {/* Client Portal feature - role-protected routes */}
                <Route path="/client" element={<ProtectedRoute requiredRole="client"><ClientPortalLayout /></ProtectedRoute>}>
                  <Route index element={<ClientDashboard />} />
                  <Route path="projects/:projectId" element={<ClientProjectDetail />} />
                  <Route path="projects/:projectId/schedule" element={<ClientSchedule />} />
                  <Route path="projects/:projectId/photos" element={<ClientPhotos />} />
                  <Route path="projects/:projectId/documents" element={<ClientDocuments />} />
                  <Route path="projects/:projectId/rfis" element={<ClientRFIs />} />
                  <Route path="projects/:projectId/change-orders" element={<ClientChangeOrders />} />
                </Route>

                {/* Redirect unknown routes to dashboard */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>

            {/* Toast notification container - displays all toasts throughout app */}
            <ToastContainer />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
