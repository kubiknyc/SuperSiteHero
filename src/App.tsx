// File: /src/App.tsx
// Main application component with routing and authentication
// Phase 2 Performance: Implements route-based code splitting with React.lazy()

import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TwentyFirstToolbar } from '@21st-extension/toolbar-react'
import { ReactPlugin } from '@21st-extension/react'
import { AuthProvider } from './lib/auth/AuthContext'
import { ToastProvider } from './lib/notifications/ToastContext'
import { ThemeProvider } from './lib/theme/darkMode'
import { ErrorBoundary } from './components/errors/ErrorBoundary'
import { ToastContainer } from './components/notifications/ToastContainer'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { RouteLoadingFallback } from './components/loading/RouteLoadingFallback'
import { PWAInstallBanner } from './components/PWAInstallPrompt'
import { initDatabase, requestPersistentStorage } from './lib/offline/indexeddb'
import { initSyncManager } from './lib/offline/sync-manager'
import { logger } from './lib/utils/logger'
import { initWebVitalsMonitoring } from '../tests/performance/web-vitals-baseline'

// Import industrial theme CSS
import './styles/industrial-theme.css'

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
const NewDailyReportPage = lazy(() => import('./pages/daily-reports/NewDailyReportPageV2').then(m => ({ default: m.NewDailyReportPageV2 })))
const DailyReportDetailPage = lazy(() => import('./pages/daily-reports/DailyReportDetailPage').then(m => ({ default: m.DailyReportDetailPage })))
const DailyReportEditPage = lazy(() => import('./pages/daily-reports/DailyReportEditPageV2').then(m => ({ default: m.DailyReportEditPageV2 })))

// Tasks feature
const TasksPage = lazy(() => import('./pages/tasks/TasksPage').then(m => ({ default: m.TasksPage })))
const TaskCreatePage = lazy(() => import('./pages/tasks/TaskCreatePage').then(m => ({ default: m.TaskCreatePage })))
const TaskDetailPage = lazy(() => import('./pages/tasks/TaskDetailPage').then(m => ({ default: m.TaskDetailPage })))
const TaskEditPage = lazy(() => import('./pages/tasks/TaskEditPage').then(m => ({ default: m.TaskEditPage })))

// Change Orders feature
const ChangeOrdersPage = lazy(() => import('./pages/change-orders/ChangeOrdersPage').then(m => ({ default: m.ChangeOrdersPage })))
const ChangeOrderDetailPage = lazy(() => import('./pages/change-orders/ChangeOrderDetailPage').then(m => ({ default: m.ChangeOrderDetailPage })))

// Documents feature
const DocumentLibraryPage = lazy(() => import('./pages/documents/DocumentLibraryPage'))
const DocumentDetailPage = lazy(() => import('./pages/documents/DocumentDetailPage').then(m => ({ default: m.DocumentDetailPage })))
const DrawingMarkupPage = lazy(() => import('./pages/documents/DrawingMarkupPage').then(m => ({ default: m.DrawingMarkupPage })))

// Drawing Register feature
const DrawingRegisterPage = lazy(() => import('./pages/drawings/DrawingRegisterPage'))

// RFIs feature
const RFIsPage = lazy(() => import('./pages/rfis/RFIsPage').then(m => ({ default: m.RFIsPage })))
const RFIDetailPage = lazy(() => import('./pages/rfis/RFIDetailPage').then(m => ({ default: m.RFIDetailPage })))
// NEW: Dedicated RFIs with ball-in-court tracking and drawing references
const DedicatedRFIsPage = lazy(() => import('./pages/rfis/DedicatedRFIsPage').then(m => ({ default: m.DedicatedRFIsPage })))
const DedicatedRFIDetailPage = lazy(() => import('./pages/rfis/DedicatedRFIDetailPage').then(m => ({ default: m.DedicatedRFIDetailPage })))

// Submittals feature
const SubmittalsPage = lazy(() => import('./pages/submittals/SubmittalsPage').then(m => ({ default: m.SubmittalsPage })))
const SubmittalDetailPage = lazy(() => import('./pages/submittals/SubmittalDetailPage').then(m => ({ default: m.SubmittalDetailPage })))
// NEW: Dedicated submittals with CSI spec section organization
const DedicatedSubmittalsPage = lazy(() => import('./pages/submittals/DedicatedSubmittalsPage').then(m => ({ default: m.DedicatedSubmittalsPage })))
const DedicatedSubmittalDetailPage = lazy(() => import('./pages/submittals/DedicatedSubmittalDetailPage').then(m => ({ default: m.DedicatedSubmittalDetailPage })))

// Punch Lists feature
const PunchListsPage = lazy(() => import('./pages/punch-lists/PunchListsPage').then(m => ({ default: m.PunchListsPage })))
const PunchItemDetailPage = lazy(() => import('./pages/punch-lists/PunchItemDetailPage').then(m => ({ default: m.PunchItemDetailPage })))
const PunchByAreaReportPage = lazy(() => import('./pages/punch-lists/PunchByAreaReportPage').then(m => ({ default: m.PunchByAreaReportPage })))

// Workflows feature
const WorkflowsPage = lazy(() => import('./pages/workflows/WorkflowsPage').then(m => ({ default: m.WorkflowsPage })))
const WorkflowItemDetailPage = lazy(() => import('./pages/workflows/WorkflowItemDetailPage').then(m => ({ default: m.WorkflowItemDetailPage })))

// Checklists feature
const ChecklistsDashboardPage = lazy(() => import('./features/checklists/pages/ChecklistsDashboardPage').then(m => ({ default: m.default })))
const TemplatesPage = lazy(() => import('./features/checklists/pages/TemplatesPage').then(m => ({ default: m.default })))
const TemplatePreviewPage = lazy(() => import('./features/checklists/pages/TemplatePreviewPage').then(m => ({ default: m.TemplatePreviewPage })))
const TemplateItemsPage = lazy(() => import('./features/checklists/pages/TemplateItemsPage').then(m => ({ default: m.TemplateItemsPage })))
const ExecutionsPage = lazy(() => import('./features/checklists/pages/ExecutionsPage').then(m => ({ default: m.ExecutionsPage })))
const ActiveExecutionPage = lazy(() => import('./features/checklists/pages/ActiveExecutionPage').then(m => ({ default: m.ActiveExecutionPage })))
const ExecutionDetailPage = lazy(() => import('./features/checklists/pages/ExecutionDetailPage').then(m => ({ default: m.ExecutionDetailPage })))
const SchedulesPage = lazy(() => import('./features/checklists/pages/SchedulesPage').then(m => ({ default: m.default })))

// Reports feature
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })))

// Approvals feature
const MyApprovalsPage = lazy(() => import('./pages/approvals/MyApprovalsPage').then(m => ({ default: m.MyApprovalsPage })))
const ApprovalRequestPage = lazy(() => import('./pages/approvals/ApprovalRequestPage').then(m => ({ default: m.ApprovalRequestPage })))
const ApprovalWorkflowsPage = lazy(() => import('./pages/settings/ApprovalWorkflowsPage').then(m => ({ default: m.ApprovalWorkflowsPage })))
const NotificationPreferencesPage = lazy(() => import('./pages/settings/NotificationPreferencesPage').then(m => ({ default: m.NotificationPreferencesPage })))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })))
const CompanyProfilePage = lazy(() => import('./pages/settings/CompanyProfilePage').then(m => ({ default: m.CompanyProfilePage })))
const UserManagementPage = lazy(() => import('./pages/settings/UserManagementPage').then(m => ({ default: m.UserManagementPage })))
const ProjectTemplatesPage = lazy(() => import('./pages/settings/ProjectTemplatesPage').then(m => ({ default: m.ProjectTemplatesPage })))
const DistributionListsPage = lazy(() => import('./pages/settings/DistributionListsPage').then(m => ({ default: m.DistributionListsPage })))
const RolesPermissionsPage = lazy(() => import('./pages/settings/RolesPermissionsPage').then(m => ({ default: m.RolesPermissionsPage })))
const AISettingsPage = lazy(() => import('./pages/settings/AISettingsPage'))

// Schedule / Gantt Charts feature
const GanttChartPage = lazy(() => import('./pages/schedule/GanttChartPage').then(m => ({ default: m.GanttChartPage })))
const MasterSchedulePage = lazy(() => import('./pages/schedule/MasterSchedulePage').then(m => ({ default: m.MasterSchedulePage })))

// Predictive Analytics feature
const AnalyticsPage = lazy(() => import('./pages/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })))

// Safety Incidents feature
const IncidentsListPage = lazy(() => import('./features/safety/pages/IncidentsListPage').then(m => ({ default: m.IncidentsListPage })))
const IncidentDetailPage = lazy(() => import('./features/safety/pages/IncidentDetailPage').then(m => ({ default: m.IncidentDetailPage })))
const CreateIncidentPage = lazy(() => import('./features/safety/pages/CreateIncidentPage').then(m => ({ default: m.CreateIncidentPage })))
const OSHA300LogPage = lazy(() => import('./features/safety/pages/OSHA300LogPage').then(m => ({ default: m.OSHA300LogPage })))

// Inspections feature
const InspectionsPage = lazy(() => import('./pages/inspections/InspectionsPage').then(m => ({ default: m.InspectionsPage })))
const InspectionDetailPage = lazy(() => import('./pages/inspections/InspectionDetailPage').then(m => ({ default: m.InspectionDetailPage })))
const CreateInspectionPage = lazy(() => import('./pages/inspections/CreateInspectionPage').then(m => ({ default: m.CreateInspectionPage })))

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
const SubcontractorDailyReportsPage = lazy(() => import('./pages/subcontractor-portal/SubcontractorDailyReportsPage').then(m => ({ default: m.SubcontractorDailyReportsPage })))
const SubcontractorDailyReportDetailPage = lazy(() => import('./pages/subcontractor-portal/SubcontractorDailyReportDetailPage').then(m => ({ default: m.SubcontractorDailyReportDetailPage })))
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
const ClientNotificationSettingsPage = lazy(() => import('./features/client-portal/pages/ClientNotificationSettingsPage').then(m => ({ default: m.ClientNotificationSettingsPage })))

// Photo Management feature
const PhotoOrganizerPage = lazy(() => import('./features/photos/pages/PhotoOrganizerPage').then(m => ({ default: m.PhotoOrganizerPage })))
const PhotoTemplatesPage = lazy(() => import('./pages/photos/PhotoTemplatesPage'))
const DailyPhotoChecklistPage = lazy(() => import('./pages/photos/DailyPhotoChecklistPage'))

// Material Receiving feature
const MaterialReceivingPage = lazy(() => import('./pages/material-receiving/MaterialReceivingPage').then(m => ({ default: m.MaterialReceivingPage })))
const MaterialReceivingDetailPage = lazy(() => import('./pages/material-receiving/MaterialReceivingDetailPage').then(m => ({ default: m.MaterialReceivingDetailPage })))

// Contacts feature
const ContactsPage = lazy(() => import('./pages/contacts/ContactsPage').then(m => ({ default: m.ContactsPage })))
const ContactDetailPage = lazy(() => import('./pages/contacts/ContactDetailPage').then(m => ({ default: m.ContactDetailPage })))

// Takeoffs feature
const TakeoffPage = lazy(() => import('./pages/takeoffs/TakeoffPage'))
const TakeoffsListPage = lazy(() => import('./pages/takeoffs/TakeoffsListPage'))
const ContactFormPage = lazy(() => import('./pages/contacts/ContactFormPage').then(m => ({ default: m.ContactFormPage })))

// Weather Logs feature
const WeatherLogsPage = lazy(() => import('./pages/weather-logs/WeatherLogsPage').then(m => ({ default: m.WeatherLogsPage })))
const WeatherLogDetailPage = lazy(() => import('./pages/weather-logs/WeatherLogDetailPage').then(m => ({ default: m.WeatherLogDetailPage })))

// Site Instructions feature
const SiteInstructionsPage = lazy(() => import('./pages/site-instructions/SiteInstructionsPage'))
const SiteInstructionDetailPage = lazy(() => import('./pages/site-instructions/SiteInstructionDetailPage'))
const CreateSiteInstructionPage = lazy(() => import('./pages/site-instructions/CreateSiteInstructionPage'))
const SiteInstructionAcknowledgePage = lazy(() => import('./pages/site-instructions/SiteInstructionAcknowledgePage').then(m => ({ default: m.SiteInstructionAcknowledgePage })))

// Meetings feature
const MeetingsPage = lazy(() => import('./pages/meetings/MeetingsPage').then(m => ({ default: m.MeetingsPage })))
const MeetingDetailPage = lazy(() => import('./pages/meetings/MeetingDetailPage').then(m => ({ default: m.MeetingDetailPage })))
const MeetingFormPage = lazy(() => import('./pages/meetings/MeetingFormPage').then(m => ({ default: m.MeetingFormPage })))

// Action Items feature
const ActionItemsDashboard = lazy(() => import('./features/action-items/components/ActionItemsDashboard').then(m => ({ default: m.ActionItemsDashboard })))

// Equipment feature
const EquipmentPage = lazy(() => import('./pages/equipment/EquipmentPage').then(m => ({ default: m.EquipmentPage })))

// Budget feature
const BudgetPage = lazy(() => import('./pages/budget/BudgetPage').then(m => ({ default: m.BudgetPage })))

// Cost Tracking feature
const CostTrackingPage = lazy(() => import('./pages/cost-tracking/CostTrackingPage').then(m => ({ default: m.CostTrackingPage })))

// Permits feature
const PermitsPage = lazy(() => import('./pages/permits/PermitsPage').then(m => ({ default: m.PermitsPage })))
const PermitDetailPage = lazy(() => import('./pages/permits/PermitDetailPage').then(m => ({ default: m.PermitDetailPage })))

// Cost Estimates feature
const CostEstimatesPage = lazy(() => import('./pages/cost-estimates').then(m => ({ default: m.CostEstimatesPage })))
const CostEstimateDetailPage = lazy(() => import('./pages/cost-estimates').then(m => ({ default: m.CostEstimateDetailPage })))

// Payment Applications feature (AIA G702/G703)
const PaymentApplicationsPage = lazy(() => import('./pages/payment-applications/PaymentApplicationsPage').then(m => ({ default: m.PaymentApplicationsPage })))
const PaymentApplicationDetailPage = lazy(() => import('./pages/payment-applications/PaymentApplicationDetailPage').then(m => ({ default: m.PaymentApplicationDetailPage })))

// Lien Waivers feature
const LienWaiversPage = lazy(() => import('./pages/lien-waivers/LienWaiversPage').then(m => ({ default: m.LienWaiversPage })))
const LienWaiverDetailPage = lazy(() => import('./pages/lien-waivers/LienWaiverDetailPage').then(m => ({ default: m.LienWaiverDetailPage })))

// Look-Ahead Planning feature
const LookAheadPage = lazy(() => import('./pages/look-ahead/LookAheadPage').then(m => ({ default: m.default })))
const LookAheadSnapshotsPage = lazy(() => import('./pages/look-ahead/LookAheadSnapshotsPage').then(m => ({ default: m.default })))

// Insurance Tracking feature
const InsurancePage = lazy(() => import('./pages/insurance/InsurancePage').then(m => ({ default: m.InsurancePage })))

// Toolbox Talks feature
const ToolboxTalksPage = lazy(() => import('./pages/toolbox-talks/ToolboxTalksPage').then(m => ({ default: m.ToolboxTalksPage })))
const ToolboxTalkDetailPage = lazy(() => import('./pages/toolbox-talks/ToolboxTalkDetailPage').then(m => ({ default: m.ToolboxTalkDetailPage })))
const ToolboxTalkFormPage = lazy(() => import('./pages/toolbox-talks/ToolboxTalkFormPage').then(m => ({ default: m.ToolboxTalkFormPage })))

// Project Closeout feature
const CloseoutPage = lazy(() => import('./pages/closeout/CloseoutPage').then(m => ({ default: m.CloseoutPage })))

// Custom Report Builder feature
const ReportBuilderPage = lazy(() => import('./pages/reports/ReportBuilderPage').then(m => ({ default: m.ReportBuilderPage })))
const ScheduledReportFormPage = lazy(() => import('./pages/reports/ScheduledReportFormPage').then(m => ({ default: m.ScheduledReportFormPage })))
const PublicReportPage = lazy(() => import('./pages/reports/PublicReportPage').then(m => ({ default: m.PublicReportPage })))

// QuickBooks Integration feature
const QuickBooksPage = lazy(() => import('./pages/settings/QuickBooksPage').then(m => ({ default: m.QuickBooksPage })))
const QuickBooksCallbackPage = lazy(() => import('./pages/settings/QuickBooksCallbackPage').then(m => ({ default: m.QuickBooksCallbackPage })))

// Calendar Integrations feature
const CalendarIntegrationsPage = lazy(() => import('./pages/settings/CalendarIntegrationsPage').then(m => ({ default: m.CalendarIntegrationsPage })))

// Transmittals feature
const TransmittalsPage = lazy(() => import('./pages/transmittals/TransmittalsPage').then(m => ({ default: m.TransmittalsPage })))
const TransmittalDetailPage = lazy(() => import('./pages/transmittals/TransmittalDetailPage').then(m => ({ default: m.TransmittalDetailPage })))
const TransmittalEditPage = lazy(() => import('./pages/transmittals/TransmittalEditPage').then(m => ({ default: m.TransmittalEditPage })))

// Job Safety Analysis (JSA) feature
const JSAListPage = lazy(() => import('./pages/jsa/JSAListPage').then(m => ({ default: m.JSAListPage })))
const JSADetailPage = lazy(() => import('./pages/jsa/JSADetailPage').then(m => ({ default: m.JSADetailPage })))

// Bidding Module feature
const BidPackagesPage = lazy(() => import('./pages/bidding/BidPackagesPage'))
const BidPackageDetailPage = lazy(() => import('./pages/bidding/BidPackageDetailPage'))

// Field Dashboard feature
const FieldDashboardPage = lazy(() => import('./pages/field-dashboard/FieldDashboardPage'))

// Public Pages (no authentication required)
const PublicApprovalPage = lazy(() => import('./pages/public/PublicApprovalPage').then(m => ({ default: m.PublicApprovalPage })))

// Error Pages - Branded 404 and 500 pages
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))

// Demo Page - Industrial Modern Design System Showcase
const DemoPage = lazy(() => import('./pages/DemoPage').then(m => ({ default: m.DemoPage })))

// Color Palette Demo - Visual comparison of all color palette options
const ColorPaletteDemo = lazy(() => import('./pages/ColorPaletteDemo').then(m => ({ default: m.ColorPaletteDemo })))

// Refined Palette Demo - Side-by-side comparison of finalist palettes with logo
const RefinedPaletteDemo = lazy(() => import('./pages/RefinedPaletteDemo').then(m => ({ default: m.RefinedPaletteDemo })))

// Design Concepts Demo - Different UI design directions
const DesignConceptsDemo = lazy(() => import('./pages/DesignConceptsDemo').then(m => ({ default: m.DesignConceptsDemo })))

// Design Concepts - 8 distinct visual directions
const ConceptsIndex = lazy(() => import('./pages/design-concepts/ConceptsIndex').then(m => ({ default: m.default })))
const Concept1Industrial = lazy(() => import('./pages/design-concepts/Concept1Industrial').then(m => ({ default: m.default })))
const Concept2Blueprint = lazy(() => import('./pages/design-concepts/Concept2Blueprint').then(m => ({ default: m.default })))
const Concept3ModernDark = lazy(() => import('./pages/design-concepts/Concept3ModernDark').then(m => ({ default: m.default })))
const Concept4Scandinavian = lazy(() => import('./pages/design-concepts/Concept4Scandinavian').then(m => ({ default: m.default })))
const Concept5BoldContrast = lazy(() => import('./pages/design-concepts/Concept5BoldContrast').then(m => ({ default: m.default })))
const Concept6EarthNatural = lazy(() => import('./pages/design-concepts/Concept6EarthNatural').then(m => ({ default: m.default })))
const Concept7SafetyHighVis = lazy(() => import('./pages/design-concepts/Concept7SafetyHighVis').then(m => ({ default: m.default })))
const Concept8NavyPremium = lazy(() => import('./pages/design-concepts/Concept8NavyPremium').then(m => ({ default: m.default })))

// Blueprint Samples - Clean Blueprint applied to real pages
const BlueprintSamplesIndex = lazy(() => import('./pages/blueprint-samples/BlueprintSamplesIndex').then(m => ({ default: m.default })))
const BlueprintLayout = lazy(() => import('./pages/blueprint-samples/BlueprintLayout').then(m => ({ default: m.default })))
const BlueprintDashboard = lazy(() => import('./pages/blueprint-samples/BlueprintDashboard').then(m => ({ default: m.default })))
const BlueprintProjectDetail = lazy(() => import('./pages/blueprint-samples/BlueprintProjectDetail').then(m => ({ default: m.default })))
const BlueprintDailyReports = lazy(() => import('./pages/blueprint-samples/BlueprintDailyReports').then(m => ({ default: m.default })))
const BlueprintDocuments = lazy(() => import('./pages/blueprint-samples/BlueprintDocuments').then(m => ({ default: m.default })))
const AnimatedBlueprintDemo = lazy(() => import('./pages/blueprint-samples/AnimatedBlueprintDemo').then(m => ({ default: m.default })))

// Blueprint Variants - 4 polished, production-ready designs
const BlueprintVariantsIndex = lazy(() => import('./pages/blueprint-samples/BlueprintVariantsIndex').then(m => ({ default: m.default })))
const PolishedVariant1Professional = lazy(() => import('./pages/blueprint-samples/PolishedVariant1Professional').then(m => ({ default: m.default })))
const PolishedVariant1ProfessionalImproved = lazy(() => import('./pages/blueprint-samples/PolishedVariant1ProfessionalImproved').then(m => ({ default: m.default })))
const PolishedVariant2TechnicalDark = lazy(() => import('./pages/blueprint-samples/PolishedVariant2TechnicalDark').then(m => ({ default: m.default })))
const PolishedVariant3MinimalPrecision = lazy(() => import('./pages/blueprint-samples/PolishedVariant3MinimalPrecision').then(m => ({ default: m.default })))
const PolishedVariant4ModernIndustrial = lazy(() => import('./pages/blueprint-samples/PolishedVariant4ModernIndustrial').then(m => ({ default: m.default })))

function App() {
  // Initialize Web Vitals monitoring in production
  useEffect(() => {
    if (import.meta.env.PROD) {
      initWebVitalsMonitoring();
    }
  }, []);

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
    <>
      <TwentyFirstToolbar
        config={{
          plugins: [ReactPlugin],
          style: {
            colorScheme: 'auto' // Ensures proper contrast for theme
          }
        }}
      />
      <ErrorBoundary>
      <ThemeProvider defaultTheme="system">
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
                {/* Public approval page - No auth required */}
                <Route path="/approve/:token" element={<PublicApprovalPage />} />

                {/* Protected routes - lazy loaded for code splitting */}
                <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

                {/* Field Dashboard */}
                <Route path="/field-dashboard" element={<ProtectedRoute><FieldDashboardPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/field-dashboard" element={<ProtectedRoute><FieldDashboardPage /></ProtectedRoute>} />

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
                <Route path="/documents" element={<ProtectedRoute><DocumentLibraryPage /></ProtectedRoute>} />
                <Route path="/documents/:documentId" element={<ProtectedRoute><DocumentDetailPage /></ProtectedRoute>} />
                <Route path="/documents/:documentId/markup" element={<ProtectedRoute><DrawingMarkupPage /></ProtectedRoute>} />

                {/* Drawing Register feature */}
                <Route path="/projects/:projectId/drawings" element={<ProtectedRoute><DrawingRegisterPage /></ProtectedRoute>} />

                {/* Takeoffs feature */}
                <Route path="/projects/:projectId/takeoffs" element={<ProtectedRoute><TakeoffsListPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/documents/:documentId/takeoff" element={<ProtectedRoute><TakeoffPage /></ProtectedRoute>} />

                {/* RFIs feature */}
                <Route path="/rfis" element={<ProtectedRoute><RFIsPage /></ProtectedRoute>} />
                <Route path="/rfis/:rfiId" element={<ProtectedRoute><RFIDetailPage /></ProtectedRoute>} />
                {/* NEW: Dedicated RFIs with ball-in-court tracking */}
                <Route path="/rfis-v2" element={<ProtectedRoute><DedicatedRFIsPage /></ProtectedRoute>} />
                <Route path="/rfis-v2/:rfiId" element={<ProtectedRoute><DedicatedRFIDetailPage /></ProtectedRoute>} />

                {/* Submittals feature */}
                <Route path="/submittals" element={<ProtectedRoute><SubmittalsPage /></ProtectedRoute>} />
                <Route path="/submittals/:submittalId" element={<ProtectedRoute><SubmittalDetailPage /></ProtectedRoute>} />
                {/* NEW: Dedicated submittals with CSI spec section organization */}
                <Route path="/submittals-v2" element={<ProtectedRoute><DedicatedSubmittalsPage /></ProtectedRoute>} />
                <Route path="/submittals-v2/:submittalId" element={<ProtectedRoute><DedicatedSubmittalDetailPage /></ProtectedRoute>} />

                {/* Punch Lists feature */}
                <Route path="/punch-lists" element={<ProtectedRoute><PunchListsPage /></ProtectedRoute>} />
                <Route path="/punch-lists/:id" element={<ProtectedRoute><PunchItemDetailPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/punch-lists/by-area" element={<ProtectedRoute><PunchByAreaReportPage /></ProtectedRoute>} />

                {/* Checklists feature */}
                <Route path="/checklists/dashboard" element={<ProtectedRoute><ChecklistsDashboardPage /></ProtectedRoute>} />
                <Route path="/checklists/schedules" element={<ProtectedRoute><SchedulesPage /></ProtectedRoute>} />
                <Route path="/checklists/templates" element={<ProtectedRoute><TemplatesPage /></ProtectedRoute>} />
                <Route path="/checklists/templates/:templateId/preview" element={<ProtectedRoute><TemplatePreviewPage /></ProtectedRoute>} />
                <Route path="/checklists/templates/:templateId/items" element={<ProtectedRoute><TemplateItemsPage /></ProtectedRoute>} />
                <Route path="/checklists/executions" element={<ProtectedRoute><ExecutionsPage /></ProtectedRoute>} />
                <Route path="/checklists/executions/:executionId/fill" element={<ProtectedRoute><ActiveExecutionPage /></ProtectedRoute>} />
                <Route path="/checklists/executions/:executionId" element={<ProtectedRoute><ExecutionDetailPage /></ProtectedRoute>} />

                {/* Reports feature */}
                <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />

                {/* Approvals feature */}
                <Route path="/approvals" element={<ProtectedRoute><MyApprovalsPage /></ProtectedRoute>} />
                <Route path="/approvals/:id" element={<ProtectedRoute><ApprovalRequestPage /></ProtectedRoute>} />
                {/* Settings feature */}
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/settings/company" element={<ProtectedRoute><CompanyProfilePage /></ProtectedRoute>} />
                <Route path="/settings/users" element={<ProtectedRoute><UserManagementPage /></ProtectedRoute>} />
                <Route path="/settings/approval-workflows" element={<ProtectedRoute><ApprovalWorkflowsPage /></ProtectedRoute>} />
                <Route path="/settings/project-templates" element={<ProtectedRoute><ProjectTemplatesPage /></ProtectedRoute>} />
                <Route path="/settings/distribution-lists" element={<ProtectedRoute><DistributionListsPage /></ProtectedRoute>} />
                <Route path="/settings/roles" element={<ProtectedRoute><RolesPermissionsPage /></ProtectedRoute>} />
                <Route path="/settings/notifications" element={<ProtectedRoute><NotificationPreferencesPage /></ProtectedRoute>} />
                <Route path="/settings/quickbooks" element={<ProtectedRoute><QuickBooksPage /></ProtectedRoute>} />
                <Route path="/settings/quickbooks/callback" element={<ProtectedRoute><QuickBooksCallbackPage /></ProtectedRoute>} />
                <Route path="/settings/calendar" element={<ProtectedRoute><CalendarIntegrationsPage /></ProtectedRoute>} />
                <Route path="/settings/ai" element={<ProtectedRoute><AISettingsPage /></ProtectedRoute>} />

                {/* Schedule / Gantt Charts feature */}
                <Route path="/projects/:projectId/schedule" element={<ProtectedRoute><MasterSchedulePage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/gantt" element={<ProtectedRoute><GanttChartPage /></ProtectedRoute>} />

                {/* Predictive Analytics feature */}
                <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />

                {/* Safety Incidents feature */}
                <Route path="/safety" element={<ProtectedRoute><IncidentsListPage /></ProtectedRoute>} />
                <Route path="/safety/new" element={<ProtectedRoute><CreateIncidentPage /></ProtectedRoute>} />
                <Route path="/safety/:id" element={<ProtectedRoute><IncidentDetailPage /></ProtectedRoute>} />
                <Route path="/safety/osha-300" element={<ProtectedRoute><OSHA300LogPage /></ProtectedRoute>} />

                {/* Inspections feature */}
                <Route path="/inspections" element={<ProtectedRoute><InspectionsPage /></ProtectedRoute>} />
                <Route path="/inspections/new" element={<ProtectedRoute><CreateInspectionPage /></ProtectedRoute>} />
                <Route path="/inspections/:id" element={<ProtectedRoute><InspectionDetailPage /></ProtectedRoute>} />
                <Route path="/inspections/:id/edit" element={<ProtectedRoute><CreateInspectionPage /></ProtectedRoute>} />

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
                <Route path="/projects/:projectId/photo-templates" element={<ProtectedRoute><PhotoTemplatesPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/photo-checklist" element={<ProtectedRoute><DailyPhotoChecklistPage /></ProtectedRoute>} />

                {/* Contacts feature */}
                <Route path="/contacts" element={<ProtectedRoute><ContactsPage /></ProtectedRoute>} />
                <Route path="/contacts/new" element={<ProtectedRoute><ContactFormPage /></ProtectedRoute>} />
                <Route path="/contacts/:contactId" element={<ProtectedRoute><ContactDetailPage /></ProtectedRoute>} />
                <Route path="/contacts/:contactId/edit" element={<ProtectedRoute><ContactFormPage /></ProtectedRoute>} />

                {/* Weather Logs feature */}
                <Route path="/weather-logs" element={<ProtectedRoute><WeatherLogsPage /></ProtectedRoute>} />
                <Route path="/weather-logs/:id" element={<ProtectedRoute><WeatherLogDetailPage /></ProtectedRoute>} />

                {/* Site Instructions feature */}
                <Route path="/site-instructions" element={<ProtectedRoute><SiteInstructionsPage /></ProtectedRoute>} />
                <Route path="/site-instructions/new" element={<ProtectedRoute><CreateSiteInstructionPage /></ProtectedRoute>} />
                <Route path="/site-instructions/:id" element={<ProtectedRoute><SiteInstructionDetailPage /></ProtectedRoute>} />
                {/* QR Code Acknowledgment - No auth required for QR access */}
                <Route path="/site-instructions/acknowledge/:token" element={<SiteInstructionAcknowledgePage />} />

                {/* Meetings feature */}
                <Route path="/meetings" element={<ProtectedRoute><MeetingsPage /></ProtectedRoute>} />
                <Route path="/meetings/new" element={<ProtectedRoute><MeetingFormPage /></ProtectedRoute>} />
                <Route path="/meetings/:id" element={<ProtectedRoute><MeetingDetailPage /></ProtectedRoute>} />
                <Route path="/meetings/:id/edit" element={<ProtectedRoute><MeetingFormPage /></ProtectedRoute>} />

                {/* Action Items feature */}
                <Route path="/action-items" element={<ProtectedRoute><ActionItemsDashboard /></ProtectedRoute>} />

                {/* Equipment feature */}
                <Route path="/equipment" element={<ProtectedRoute><EquipmentPage /></ProtectedRoute>} />

                {/* Budget feature */}
                <Route path="/budget" element={<ProtectedRoute><BudgetPage /></ProtectedRoute>} />

                {/* Cost Tracking feature */}
                <Route path="/cost-tracking" element={<ProtectedRoute><CostTrackingPage /></ProtectedRoute>} />

                {/* Permits feature */}
                <Route path="/permits" element={<ProtectedRoute><PermitsPage /></ProtectedRoute>} />
                <Route path="/permits/:id" element={<ProtectedRoute><PermitDetailPage /></ProtectedRoute>} />

                {/* Cost Estimates feature */}
                <Route path="/projects/:projectId/cost-estimates" element={<ProtectedRoute><CostEstimatesPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/cost-estimates/:estimateId" element={<ProtectedRoute><CostEstimateDetailPage /></ProtectedRoute>} />

                {/* Payment Applications feature (AIA G702/G703) */}
                <Route path="/payment-applications" element={<ProtectedRoute><PaymentApplicationsPage /></ProtectedRoute>} />
                <Route path="/payment-applications/:applicationId" element={<ProtectedRoute><PaymentApplicationDetailPage /></ProtectedRoute>} />

                {/* Lien Waivers feature */}
                <Route path="/lien-waivers" element={<ProtectedRoute><LienWaiversPage /></ProtectedRoute>} />
                <Route path="/lien-waivers/:id" element={<ProtectedRoute><LienWaiverDetailPage /></ProtectedRoute>} />

                {/* Transmittals feature */}
                <Route path="/transmittals" element={<ProtectedRoute><TransmittalsPage /></ProtectedRoute>} />
                <Route path="/transmittals/:transmittalId" element={<ProtectedRoute><TransmittalDetailPage /></ProtectedRoute>} />
                <Route path="/transmittals/:transmittalId/edit" element={<ProtectedRoute><TransmittalEditPage /></ProtectedRoute>} />

                {/* Look-Ahead Planning feature */}
                <Route path="/projects/:projectId/look-ahead" element={<ProtectedRoute><LookAheadPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/look-ahead/snapshots" element={<ProtectedRoute><LookAheadSnapshotsPage /></ProtectedRoute>} />

                {/* Insurance Tracking feature */}
                <Route path="/insurance" element={<ProtectedRoute><InsurancePage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/insurance" element={<ProtectedRoute><InsurancePage /></ProtectedRoute>} />

                {/* Toolbox Talks feature */}
                <Route path="/toolbox-talks" element={<ProtectedRoute><ToolboxTalksPage /></ProtectedRoute>} />
                <Route path="/toolbox-talks/new" element={<ProtectedRoute><ToolboxTalkFormPage /></ProtectedRoute>} />
                <Route path="/toolbox-talks/:id" element={<ProtectedRoute><ToolboxTalkDetailPage /></ProtectedRoute>} />
                <Route path="/toolbox-talks/:id/edit" element={<ProtectedRoute><ToolboxTalkFormPage /></ProtectedRoute>} />

                {/* Job Safety Analysis (JSA) feature */}
                <Route path="/projects/:projectId/jsa" element={<ProtectedRoute><JSAListPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/jsa/:jsaId" element={<ProtectedRoute><JSADetailPage /></ProtectedRoute>} />

                {/* Bidding Module feature */}
                <Route path="/bidding" element={<ProtectedRoute><BidPackagesPage /></ProtectedRoute>} />
                <Route path="/bidding/:packageId" element={<ProtectedRoute><BidPackageDetailPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/bidding" element={<ProtectedRoute><BidPackagesPage /></ProtectedRoute>} />

                {/* Project Closeout feature */}
                <Route path="/closeout" element={<ProtectedRoute><CloseoutPage /></ProtectedRoute>} />
                <Route path="/projects/:projectId/closeout" element={<ProtectedRoute><CloseoutPage /></ProtectedRoute>} />

                {/* Custom Report Builder feature */}
                <Route path="/reports/builder" element={<ProtectedRoute><ReportBuilderPage /></ProtectedRoute>} />
                <Route path="/reports/builder/:templateId" element={<ProtectedRoute><ReportBuilderPage /></ProtectedRoute>} />
                <Route path="/reports/schedules/new" element={<ProtectedRoute><ScheduledReportFormPage /></ProtectedRoute>} />
                <Route path="/reports/schedules/:id" element={<ProtectedRoute><ScheduledReportFormPage /></ProtectedRoute>} />
                {/* Public report viewer - No auth required */}
                <Route path="/reports/public/:token" element={<PublicReportPage />} />

                {/* Subcontractor Portal feature - role-protected routes */}
                <Route path="/portal" element={<ProtectedRoute requiredRole="subcontractor"><SubcontractorLayout /></ProtectedRoute>}>
                  <Route index element={<SubcontractorDashboardPage />} />
                  <Route path="projects" element={<SubcontractorProjectsPage />} />
                  <Route path="bids" element={<SubcontractorBidsPage />} />
                  <Route path="bids/:bidId" element={<BidDetailPage />} />
                  <Route path="punch-items" element={<SubcontractorPunchItemsPage />} />
                  <Route path="tasks" element={<SubcontractorTasksPage />} />
                  <Route path="compliance" element={<SubcontractorCompliancePage />} />
                  <Route path="daily-reports" element={<SubcontractorDailyReportsPage />} />
                  <Route path="daily-reports/:reportId" element={<SubcontractorDailyReportDetailPage />} />
                </Route>

                {/* Client Portal feature - role-protected routes */}
                <Route path="/client" element={<ProtectedRoute requiredRole="client"><ClientPortalLayout /></ProtectedRoute>}>
                  <Route index element={<ClientDashboard />} />
                  <Route path="projects/:projectId" element={<ClientProjectDetail />} />
                  <Route path="settings/notifications" element={<ClientNotificationSettingsPage />} />
                  <Route path="projects/:projectId/schedule" element={<ClientSchedule />} />
                  <Route path="projects/:projectId/photos" element={<ClientPhotos />} />
                  <Route path="projects/:projectId/documents" element={<ClientDocuments />} />
                  <Route path="projects/:projectId/rfis" element={<ClientRFIs />} />
                  <Route path="projects/:projectId/change-orders" element={<ClientChangeOrders />} />
                  <Route path="projects/:projectId/settings/notifications" element={<ClientNotificationSettingsPage />} />
                </Route>

                {/* Demo Page - Industrial Modern Design System Showcase */}
                <Route path="/demo" element={<DemoPage />} />
                <Route path="/demo/colors" element={<ColorPaletteDemo />} />
                <Route path="/demo/refined" element={<RefinedPaletteDemo />} />
                <Route path="/demo/concepts" element={<DesignConceptsDemo />} />

                {/* Design Concepts - 8 Visual Directions */}
                <Route path="/design-concepts" element={<ConceptsIndex />} />
                <Route path="/design-concepts/1-industrial" element={<Concept1Industrial />} />
                <Route path="/design-concepts/2-blueprint" element={<Concept2Blueprint />} />
                <Route path="/design-concepts/3-modern-dark" element={<Concept3ModernDark />} />
                <Route path="/design-concepts/4-scandinavian" element={<Concept4Scandinavian />} />
                <Route path="/design-concepts/5-bold-contrast" element={<Concept5BoldContrast />} />
                <Route path="/design-concepts/6-earth-natural" element={<Concept6EarthNatural />} />
                <Route path="/design-concepts/7-safety-highvis" element={<Concept7SafetyHighVis />} />
                <Route path="/design-concepts/8-navy-premium" element={<Concept8NavyPremium />} />

                {/* Blueprint Samples - Concept 2 Applied to Real Pages */}
                <Route path="/blueprint-samples" element={<BlueprintSamplesIndex />} />
                <Route path="/blueprint-samples/layout" element={<BlueprintLayout />} />
                <Route path="/blueprint-samples/dashboard" element={<BlueprintDashboard />} />
                <Route path="/blueprint-samples/project-detail" element={<BlueprintProjectDetail />} />
                <Route path="/blueprint-samples/daily-reports" element={<BlueprintDailyReports />} />
                <Route path="/blueprint-samples/documents" element={<BlueprintDocuments />} />
                <Route path="/blueprint-samples/animated-demo" element={<AnimatedBlueprintDemo />} />

                {/* Blueprint Variants - 4 Polished, Production-Ready Designs */}
                <Route path="/blueprint-samples/variants" element={<BlueprintVariantsIndex />} />
                <Route path="/blueprint-samples/variants/1-professional" element={<PolishedVariant1Professional />} />
                <Route path="/blueprint-samples/variants/1-professional-improved" element={<PolishedVariant1ProfessionalImproved />} />
                <Route path="/blueprint-samples/variants/2-technical-dark" element={<PolishedVariant2TechnicalDark />} />
                <Route path="/blueprint-samples/variants/3-minimal" element={<PolishedVariant3MinimalPrecision />} />
                <Route path="/blueprint-samples/variants/4-industrial" element={<PolishedVariant4ModernIndustrial />} />

                {/* 404 Not Found - Branded error page */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>

            {/* Toast notification container - displays all toasts throughout app */}
            <ToastContainer />

              {/* PWA Install Banner - prompts users to install the app */}
              <PWAInstallBanner />
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
    </>
  )
}

export default App
