// File: /src/App.tsx
// Main application component with routing and authentication

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/auth/AuthContext'
import { ToastProvider } from './lib/notifications/ToastContext'
import { ErrorBoundary } from './components/errors/ErrorBoundary'
import { ToastContainer } from './components/notifications/ToastContainer'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

// Page imports
import { LoginPage } from './pages/auth/LoginPage'
import { SignupPage } from './pages/auth/SignupPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProjectsPage } from './pages/projects/ProjectsPage'
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage'
import { DailyReportsPage } from './pages/daily-reports/DailyReportsPage'
import { NewDailyReportPage } from './pages/daily-reports/NewDailyReportPage'
import { DailyReportDetailPage } from './pages/daily-reports/DailyReportDetailPage'
import { DailyReportEditPage } from './pages/daily-reports/DailyReportEditPage'
import { TasksPage } from './pages/tasks/TasksPage'
import { TaskCreatePage } from './pages/tasks/TaskCreatePage'
import { TaskDetailPage } from './pages/tasks/TaskDetailPage'
import { TaskEditPage } from './pages/tasks/TaskEditPage'
import { ChangeOrdersPage } from './pages/change-orders/ChangeOrdersPage'
import { ChangeOrderDetailPage } from './pages/change-orders/ChangeOrderDetailPage'
import { DocumentDetailPage } from './pages/documents/DocumentDetailPage'
import { RFIDetailPage } from './pages/rfis/RFIDetailPage'
import { SubmittalsPage } from './pages/submittals/SubmittalsPage'
import { SubmittalDetailPage } from './pages/submittals/SubmittalDetailPage'
import { PunchListsPage } from './pages/punch-lists/PunchListsPage'
import { PunchItemDetailPage } from './pages/punch-lists/PunchItemDetailPage'
import { ReportsPage } from './pages/reports/ReportsPage'
// TODO: Import remaining pages

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Protected routes */}
              <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
              <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />
              <Route path="/daily-reports" element={<ProtectedRoute><DailyReportsPage /></ProtectedRoute>} />
              <Route path="/daily-reports/new" element={<ProtectedRoute><NewDailyReportPage /></ProtectedRoute>} />
              <Route path="/daily-reports/:id" element={<ProtectedRoute><DailyReportDetailPage /></ProtectedRoute>} />
              <Route path="/daily-reports/:id/edit" element={<ProtectedRoute><DailyReportEditPage /></ProtectedRoute>} />
              <Route path="/change-orders" element={<ProtectedRoute><ChangeOrdersPage /></ProtectedRoute>} />
              <Route path="/change-orders/:id" element={<ProtectedRoute><ChangeOrderDetailPage /></ProtectedRoute>} />
              <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
              <Route path="/tasks/new" element={<ProtectedRoute><TaskCreatePage /></ProtectedRoute>} />
              <Route path="/tasks/:id" element={<ProtectedRoute><TaskDetailPage /></ProtectedRoute>} />
              <Route path="/tasks/:id/edit" element={<ProtectedRoute><TaskEditPage /></ProtectedRoute>} />
              <Route path="/documents/:documentId" element={<ProtectedRoute><DocumentDetailPage /></ProtectedRoute>} />
              <Route path="/rfis/:rfiId" element={<ProtectedRoute><RFIDetailPage /></ProtectedRoute>} />
              <Route path="/submittals" element={<ProtectedRoute><SubmittalsPage /></ProtectedRoute>} />
              <Route path="/submittals/:submittalId" element={<ProtectedRoute><SubmittalDetailPage /></ProtectedRoute>} />
              <Route path="/punch-lists" element={<ProtectedRoute><PunchListsPage /></ProtectedRoute>} />
              <Route path="/punch-lists/:id" element={<ProtectedRoute><PunchItemDetailPage /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />

              {/* TODO: Add routes for all features:
               * - Documents
               * - Workflows (RFIs, COs, Submittals)
               * - Checklists
               * - Punch Lists
               * - Safety
               * - Inspections
               * - etc.
               */}

              {/* Redirect unknown routes to dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Toast notification container - displays all toasts throughout app */}
            <ToastContainer />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
