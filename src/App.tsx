// File: /src/App.tsx
// Main application component with routing and authentication
// Phase 2 Performance: Implements route-based code splitting with React.lazy()

import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/auth/AuthContext'
import { ToastProvider } from './lib/notifications/ToastContext'
import { ErrorBoundary } from './components/errors/ErrorBoundary'
import { ToastContainer } from './components/notifications/ToastContainer'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { RouteLoadingFallback } from './components/loading/RouteLoadingFallback'

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

// Reports feature
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })))

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                {/* Public routes - loaded eagerly */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />

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

                {/* Reports feature */}
                <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />

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
