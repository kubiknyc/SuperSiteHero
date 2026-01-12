/**
 * MobileApp - Field-focused mobile application shell
 *
 * Provides a streamlined mobile experience focused on field work:
 * - Daily Reports
 * - Photo Progress
 * - Punch Lists
 * - Inspections
 * - Tasks
 * - Projects (simplified navigation)
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RouteLoadingFallback } from './components/loading/RouteLoadingFallback';
import { MobileLayout } from './components/layout/MobileLayout';

// Auth pages - shared with desktop (using V2 premium design)
import { LoginPageV2 as LoginPage } from './pages/auth/LoginPageV2';
import { SignupPageV2 as SignupPage } from './pages/auth/SignupPageV2';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// MFA pages
const MFASetupPage = lazy(() => import('./pages/auth/MFASetupPage').then(m => ({ default: m.MFASetupPage })));
const MFAVerifyPage = lazy(() => import('./pages/auth/MFAVerifyPage').then(m => ({ default: m.MFAVerifyPage })));

// Registration flow
import { CompanyRegistration } from './features/registration/CompanyRegistration';
import { PendingApproval } from './features/registration/PendingApproval';

// Mobile-optimized pages
const MobileDashboard = lazy(() => import('./pages/mobile/MobileDashboard').then(m => ({ default: m.MobileDashboard })));
const MobileSettings = lazy(() => import('./pages/mobile/MobileSettings').then(m => ({ default: m.MobileSettings })));

// Mobile Daily Reports
const MobileDailyReportsList = lazy(() => import('./pages/mobile/MobileDailyReports').then(m => ({ default: m.MobileDailyReportsList })));
const MobileDailyReportForm = lazy(() => import('./pages/mobile/MobileDailyReports').then(m => ({ default: m.MobileDailyReportForm })));
const MobileDailyReportDetail = lazy(() => import('./pages/mobile/MobileDailyReports').then(m => ({ default: m.MobileDailyReportDetail })));

// Mobile Photo Progress
const MobilePhotoProgressList = lazy(() => import('./pages/mobile/MobilePhotoProgress').then(m => ({ default: m.MobilePhotoProgressList })));
const MobilePhotoCapture = lazy(() => import('./pages/mobile/MobilePhotoCapture').then(m => ({ default: m.MobilePhotoCapture })));
const MobilePhotoDetail = lazy(() => import('./pages/mobile/MobilePhotoProgress').then(m => ({ default: m.MobilePhotoDetail })));

// Mobile Punch Lists
const MobilePunchListsList = lazy(() => import('./pages/mobile/MobilePunchLists').then(m => ({ default: m.MobilePunchListsList })));
const MobilePunchItemForm = lazy(() => import('./pages/mobile/MobilePunchLists').then(m => ({ default: m.MobilePunchItemForm })));
const MobilePunchItemDetail = lazy(() => import('./pages/mobile/MobilePunchLists').then(m => ({ default: m.MobilePunchItemDetail })));

// Mobile Inspections
const MobileInspectionsList = lazy(() => import('./pages/mobile/MobileInspections').then(m => ({ default: m.MobileInspectionsList })));
const MobileInspectionForm = lazy(() => import('./pages/mobile/MobileInspections').then(m => ({ default: m.MobileInspectionForm })));
const MobileInspectionDetail = lazy(() => import('./pages/mobile/MobileInspections').then(m => ({ default: m.MobileInspectionDetail })));

// Mobile Tasks
const MobileTasksList = lazy(() => import('./pages/mobile/MobileTasks').then(m => ({ default: m.MobileTasksList })));
const MobileTaskDetail = lazy(() => import('./pages/mobile/MobileTasks').then(m => ({ default: m.MobileTaskDetail })));

// Mobile Projects
const MobileProjectsList = lazy(() => import('./pages/mobile/MobileProjects').then(m => ({ default: m.MobileProjectsList })));
const MobileProjectDetail = lazy(() => import('./pages/mobile/MobileProjects').then(m => ({ default: m.MobileProjectDetail })));

// Shared pages (reuse desktop versions)
const MessagesPage = lazy(() => import('./features/messaging/pages/MessagesPage').then(m => ({ default: m.MessagesPage })));
const ProfileEditPage = lazy(() => import('./pages/profile/ProfileEditPage').then(m => ({ default: m.ProfileEditPage })));
const AcceptInvitationPage = lazy(() => import('./pages/auth/AcceptInvitationPage').then(m => ({ default: m.AcceptInvitationPage })));

// Public pages
const PublicApprovalPage = lazy(() => import('./pages/public/PublicApprovalPage').then(m => ({ default: m.PublicApprovalPage })));
const PublicComparisonPage = lazy(() => import('./pages/photo-progress/PublicComparisonPage').then(m => ({ default: m.PublicComparisonPage })));
const PrivacyPolicyPage = lazy(() => import('./pages/legal/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsOfServicePage = lazy(() => import('./pages/legal/TermsOfServicePage').then(m => ({ default: m.TermsOfServicePage })));

// Error page
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

/**
 * Wrapper to apply MobileLayout to protected routes
 */
function MobileProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <MobileLayout>{children}</MobileLayout>
    </ProtectedRoute>
  );
}

export function MobileApp() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* Public auth routes (no layout) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/register" element={<CompanyRegistration />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* MFA Routes */}
        <Route path="/auth/mfa-setup" element={<ProtectedRoute><MFASetupPage /></ProtectedRoute>} />
        <Route path="/auth/mfa-verify" element={<MFAVerifyPage />} />

        {/* Registration routes */}
        <Route path="/pending-approval" element={<ProtectedRoute><PendingApproval /></ProtectedRoute>} />
        <Route path="/invite/:token" element={<AcceptInvitationPage />} />

        {/* Public pages (no auth) */}
        <Route path="/approve/:token" element={<PublicApprovalPage />} />
        <Route path="/share/comparison/:token" element={<PublicComparisonPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />

        {/* Protected mobile routes with MobileLayout */}
        <Route path="/" element={<MobileProtectedRoute><MobileDashboard /></MobileProtectedRoute>} />

        {/* Mobile prefixed routes (primary mobile navigation) */}
        <Route path="/mobile/dashboard" element={<MobileProtectedRoute><MobileDashboard /></MobileProtectedRoute>} />

        {/* Daily Reports - mobile prefixed */}
        <Route path="/mobile/daily-reports" element={<MobileProtectedRoute><MobileDailyReportsList /></MobileProtectedRoute>} />
        <Route path="/mobile/daily-reports/new" element={<MobileProtectedRoute><MobileDailyReportForm /></MobileProtectedRoute>} />
        <Route path="/mobile/daily-reports/:id" element={<MobileProtectedRoute><MobileDailyReportDetail /></MobileProtectedRoute>} />
        <Route path="/mobile/daily-reports/:id/edit" element={<MobileProtectedRoute><MobileDailyReportForm /></MobileProtectedRoute>} />

        {/* Photo Progress - mobile prefixed */}
        <Route path="/mobile/photo-progress" element={<MobileProtectedRoute><MobilePhotoProgressList /></MobileProtectedRoute>} />
        <Route path="/mobile/photo-progress/capture" element={<ProtectedRoute><MobilePhotoCapture /></ProtectedRoute>} />
        <Route path="/mobile/photo-progress/:photoId" element={<MobileProtectedRoute><MobilePhotoDetail /></MobileProtectedRoute>} />

        {/* Punch Lists - mobile prefixed */}
        <Route path="/mobile/punch-lists" element={<MobileProtectedRoute><MobilePunchListsList /></MobileProtectedRoute>} />
        <Route path="/mobile/punch-lists/new" element={<MobileProtectedRoute><MobilePunchItemForm /></MobileProtectedRoute>} />
        <Route path="/mobile/punch-lists/:id" element={<MobileProtectedRoute><MobilePunchItemDetail /></MobileProtectedRoute>} />
        <Route path="/mobile/punch-lists/:id/edit" element={<MobileProtectedRoute><MobilePunchItemForm /></MobileProtectedRoute>} />

        {/* Inspections - mobile prefixed */}
        <Route path="/mobile/inspections" element={<MobileProtectedRoute><MobileInspectionsList /></MobileProtectedRoute>} />
        <Route path="/mobile/inspections/new" element={<MobileProtectedRoute><MobileInspectionForm /></MobileProtectedRoute>} />
        <Route path="/mobile/inspections/:id" element={<MobileProtectedRoute><MobileInspectionDetail /></MobileProtectedRoute>} />
        <Route path="/mobile/inspections/:id/edit" element={<MobileProtectedRoute><MobileInspectionForm /></MobileProtectedRoute>} />

        {/* Tasks - mobile prefixed */}
        <Route path="/mobile/tasks" element={<MobileProtectedRoute><MobileTasksList /></MobileProtectedRoute>} />
        <Route path="/mobile/tasks/:id" element={<MobileProtectedRoute><MobileTaskDetail /></MobileProtectedRoute>} />

        {/* Projects - mobile prefixed */}
        <Route path="/mobile/projects" element={<MobileProtectedRoute><MobileProjectsList /></MobileProtectedRoute>} />
        <Route path="/mobile/projects/:projectId" element={<MobileProtectedRoute><MobileProjectDetail /></MobileProtectedRoute>} />

        {/* Settings - mobile prefixed */}
        <Route path="/mobile/settings" element={<MobileProtectedRoute><MobileSettings /></MobileProtectedRoute>} />

        {/* Legacy routes (without /mobile prefix) - redirect or support both */}
        <Route path="/daily-reports" element={<MobileProtectedRoute><MobileDailyReportsList /></MobileProtectedRoute>} />
        <Route path="/daily-reports/new" element={<MobileProtectedRoute><MobileDailyReportForm /></MobileProtectedRoute>} />
        <Route path="/daily-reports/:id" element={<MobileProtectedRoute><MobileDailyReportDetail /></MobileProtectedRoute>} />
        <Route path="/daily-reports/:id/edit" element={<MobileProtectedRoute><MobileDailyReportForm /></MobileProtectedRoute>} />

        <Route path="/photo-progress" element={<MobileProtectedRoute><MobilePhotoProgressList /></MobileProtectedRoute>} />
        <Route path="/photo-progress/capture" element={<ProtectedRoute><MobilePhotoCapture /></ProtectedRoute>} />
        <Route path="/photo-progress/:photoId" element={<MobileProtectedRoute><MobilePhotoDetail /></MobileProtectedRoute>} />
        <Route path="/projects/:projectId/photo-progress" element={<MobileProtectedRoute><MobilePhotoProgressList /></MobileProtectedRoute>} />
        <Route path="/projects/:projectId/photo-progress/capture" element={<ProtectedRoute><MobilePhotoCapture /></ProtectedRoute>} />
        <Route path="/projects/:projectId/photo-progress/:photoId" element={<MobileProtectedRoute><MobilePhotoDetail /></MobileProtectedRoute>} />

        <Route path="/punch-lists" element={<MobileProtectedRoute><MobilePunchListsList /></MobileProtectedRoute>} />
        <Route path="/punch-lists/new" element={<MobileProtectedRoute><MobilePunchItemForm /></MobileProtectedRoute>} />
        <Route path="/punch-lists/:id" element={<MobileProtectedRoute><MobilePunchItemDetail /></MobileProtectedRoute>} />
        <Route path="/punch-lists/:id/edit" element={<MobileProtectedRoute><MobilePunchItemForm /></MobileProtectedRoute>} />

        <Route path="/inspections" element={<MobileProtectedRoute><MobileInspectionsList /></MobileProtectedRoute>} />
        <Route path="/inspections/new" element={<MobileProtectedRoute><MobileInspectionForm /></MobileProtectedRoute>} />
        <Route path="/inspections/:id" element={<MobileProtectedRoute><MobileInspectionDetail /></MobileProtectedRoute>} />
        <Route path="/inspections/:id/edit" element={<MobileProtectedRoute><MobileInspectionForm /></MobileProtectedRoute>} />

        <Route path="/tasks" element={<MobileProtectedRoute><MobileTasksList /></MobileProtectedRoute>} />
        <Route path="/tasks/:id" element={<MobileProtectedRoute><MobileTaskDetail /></MobileProtectedRoute>} />

        <Route path="/projects" element={<MobileProtectedRoute><MobileProjectsList /></MobileProtectedRoute>} />
        <Route path="/projects/:projectId" element={<MobileProtectedRoute><MobileProjectDetail /></MobileProtectedRoute>} />

        {/* Messages (reuse desktop) */}
        <Route path="/messages" element={<MobileProtectedRoute><MessagesPage /></MobileProtectedRoute>} />
        <Route path="/messages/:conversationId" element={<MobileProtectedRoute><MessagesPage /></MobileProtectedRoute>} />

        {/* Profile & Settings */}
        <Route path="/profile" element={<MobileProtectedRoute><ProfileEditPage /></MobileProtectedRoute>} />
        <Route path="/profile/edit" element={<MobileProtectedRoute><ProfileEditPage /></MobileProtectedRoute>} />
        <Route path="/settings" element={<MobileProtectedRoute><MobileSettings /></MobileProtectedRoute>} />

        {/* Redirect desktop-only routes to mobile equivalents */}
        <Route path="/analytics" element={<Navigate to="/" replace />} />
        <Route path="/reports/builder" element={<Navigate to="/" replace />} />
        <Route path="/reports/builder/*" element={<Navigate to="/" replace />} />
        <Route path="/workflows" element={<Navigate to="/" replace />} />
        <Route path="/checklists/*" element={<Navigate to="/inspections" replace />} />
        <Route path="/budget" element={<Navigate to="/" replace />} />
        <Route path="/cost-tracking" element={<Navigate to="/" replace />} />
        <Route path="/payment-applications" element={<Navigate to="/" replace />} />
        <Route path="/lien-waivers" element={<Navigate to="/" replace />} />
        <Route path="/procurement" element={<Navigate to="/" replace />} />

        {/* Field dashboard redirects to mobile dashboard */}
        <Route path="/field-dashboard" element={<Navigate to="/" replace />} />
        <Route path="/projects/:projectId/field-dashboard" element={<Navigate to="/projects/:projectId" replace />} />

        {/* 404 Not Found */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default MobileApp;
