// File: /src/App.tsx
// Main application component with routing and authentication

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/auth/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

// Page imports
import { LoginPage } from './pages/auth/LoginPage'
import { SignupPage } from './pages/auth/SignupPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProjectsPage } from './pages/projects/ProjectsPage'
import { DailyReportsPage } from './pages/daily-reports/DailyReportsPage'
import { ChangeOrdersPage } from './pages/change-orders/ChangeOrdersPage'
import { ChangeOrderDetailPage } from './pages/change-orders/ChangeOrderDetailPage'
// TODO: Import remaining pages

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
          <Route path="/daily-reports" element={<ProtectedRoute><DailyReportsPage /></ProtectedRoute>} />
          <Route path="/change-orders" element={<ProtectedRoute><ChangeOrdersPage /></ProtectedRoute>} />
          <Route path="/change-orders/:id" element={<ProtectedRoute><ChangeOrderDetailPage /></ProtectedRoute>} />

          {/* TODO: Add routes for all features:
           * - Documents
           * - Workflows (RFIs, COs, Submittals)
           * - Tasks
           * - Checklists
           * - Punch Lists
           * - Safety
           * - Inspections
           * - etc.
           */}

          {/* Redirect unknown routes to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
