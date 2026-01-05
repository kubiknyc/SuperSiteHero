#!/usr/bin/env node
/**
 * Migration script: AppLayout -> SmartLayout
 * Migrates all pages from the old AppLayout to the new SmartLayout component
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const PAGES_DIR = 'src/pages';
const DRY_RUN = process.argv.includes('--dry-run');

// Track statistics
const stats = {
  scanned: 0,
  migrated: 0,
  skipped: 0,
  errors: []
};

// Page title mappings for common pages
const pageTitles = {
  'ProjectsPage': { title: 'Projects', subtitle: 'Manage your construction projects' },
  'ProjectDetailPage': { title: 'Project Details' },
  'ProjectSettingsPage': { title: 'Project Settings' },
  'DailyReportsPage': { title: 'Daily Reports', subtitle: 'Field activity logs' },
  'DailyReportDetailPage': { title: 'Daily Report' },
  'DailyReportCreatePage': { title: 'New Daily Report' },
  'DailyReportEditPage': { title: 'Edit Daily Report' },
  'NewDailyReportPage': { title: 'New Daily Report' },
  'RFIsPage': { title: 'RFIs', subtitle: 'Requests for information' },
  'DedicatedRFIsPage': { title: 'RFIs', subtitle: 'Requests for information' },
  'RFIDetailPage': { title: 'RFI Details' },
  'DedicatedRFIDetailPage': { title: 'RFI Details' },
  'PunchListsPage': { title: 'Punch Lists', subtitle: 'Deficiency tracking' },
  'PunchItemDetailPage': { title: 'Punch Item' },
  'TasksPage': { title: 'Tasks', subtitle: 'Track work items' },
  'TaskDetailPage': { title: 'Task Details' },
  'TaskCreatePage': { title: 'New Task' },
  'TaskEditPage': { title: 'Edit Task' },
  'SubmittalsPage': { title: 'Submittals', subtitle: 'Document submissions' },
  'DedicatedSubmittalsPage': { title: 'Submittals', subtitle: 'Document submissions' },
  'SubmittalDetailPage': { title: 'Submittal Details' },
  'DedicatedSubmittalDetailPage': { title: 'Submittal Details' },
  'InspectionsPage': { title: 'Inspections', subtitle: 'Quality inspections' },
  'InspectionDetailPage': { title: 'Inspection Details' },
  'CreateInspectionPage': { title: 'New Inspection' },
  'MeetingsPage': { title: 'Meetings', subtitle: 'Project meetings' },
  'MeetingDetailPage': { title: 'Meeting Details' },
  'MeetingFormPage': { title: 'Meeting' },
  'DocumentLibraryPage': { title: 'Documents', subtitle: 'Project documentation' },
  'DocumentDetailPage': { title: 'Document Details' },
  'ContactsPage': { title: 'Contacts', subtitle: 'Directory' },
  'ContactDetailPage': { title: 'Contact Details' },
  'ContactFormPage': { title: 'Contact' },
  'ChangeOrdersPage': { title: 'Change Orders', subtitle: 'Contract modifications' },
  'ChangeOrderDetailPage': { title: 'Change Order Details' },
  'BudgetPage': { title: 'Budget', subtitle: 'Cost tracking' },
  'AnalyticsPage': { title: 'Analytics', subtitle: 'Project insights' },
  'ReportsPage': { title: 'Reports', subtitle: 'Generate reports' },
  'ReportBuilderPage': { title: 'Report Builder' },
  'ScheduledReportFormPage': { title: 'Scheduled Report' },
  'PhotoProgressPage': { title: 'Photo Progress', subtitle: 'Visual documentation' },
  'PhotoUploadPage': { title: 'Upload Photos' },
  'PhotoReportFormPage': { title: 'Photo Report' },
  'PhotoLocationFormPage': { title: 'Photo Location' },
  'PhotoLocationDetailPage': { title: 'Photo Location Details' },
  'DailyPhotoChecklistPage': { title: 'Daily Photo Checklist' },
  'ShopDrawingsPage': { title: 'Shop Drawings', subtitle: 'Technical drawings' },
  'ShopDrawingDetailPage': { title: 'Shop Drawing Details' },
  'LienWaiversPage': { title: 'Lien Waivers', subtitle: 'Payment documentation' },
  'LienWaiverDetailPage': { title: 'Lien Waiver Details' },
  'PaymentApplicationsPage': { title: 'Payment Applications', subtitle: 'Payment requests' },
  'PaymentApplicationDetailPage': { title: 'Payment Application Details' },
  'TransmittalsPage': { title: 'Transmittals', subtitle: 'Document transmittals' },
  'TransmittalDetailPage': { title: 'Transmittal Details' },
  'PermitsPage': { title: 'Permits', subtitle: 'Building permits' },
  'PermitDetailPage': { title: 'Permit Details' },
  'NoticesPage': { title: 'Notices', subtitle: 'Project notices' },
  'NoticeDetailPage': { title: 'Notice Details' },
  'WeatherLogsPage': { title: 'Weather Logs', subtitle: 'Weather tracking' },
  'WeatherLogDetailPage': { title: 'Weather Log Details' },
  'ToolboxTalksPage': { title: 'Toolbox Talks', subtitle: 'Safety briefings' },
  'ToolboxTalkFormPage': { title: 'Toolbox Talk' },
  'ToolboxTalkDetailPage': { title: 'Toolbox Talk Details' },
  'JSAListPage': { title: 'Job Safety Analysis', subtitle: 'Safety assessments' },
  'JSADetailPage': { title: 'JSA Details' },
  'QualityControlPage': { title: 'Quality Control', subtitle: 'QC management' },
  'QCInspectionDetailPage': { title: 'QC Inspection Details' },
  'NCRDetailPage': { title: 'Non-Conformance Report' },
  'MasterSchedulePage': { title: 'Master Schedule', subtitle: 'Project timeline' },
  'GanttChartPage': { title: 'Gantt Chart' },
  'LookAheadPage': { title: 'Look Ahead', subtitle: 'Short-term planning' },
  'CostTrackingPage': { title: 'Cost Tracking', subtitle: 'Financial monitoring' },
  'ProcurementPage': { title: 'Procurement', subtitle: 'Material procurement' },
  'EquipmentPage': { title: 'Equipment', subtitle: 'Equipment management' },
  'TakeoffsListPage': { title: 'Takeoffs', subtitle: 'Quantity takeoffs' },
  'SiteInstructionsPage': { title: 'Site Instructions', subtitle: 'Field directives' },
  'WorkflowsPage': { title: 'Workflows', subtitle: 'Process management' },
  'WorkflowItemDetailPage': { title: 'Workflow Item' },
  'CloseoutPage': { title: 'Closeout', subtitle: 'Project closeout' },
  'MyApprovalsPage': { title: 'Approvals', subtitle: 'Pending approvals' },
  'ApprovalRequestPage': { title: 'Approval Request' },
  'ProfileEditPage': { title: 'Edit Profile' },
  'PunchByAreaReportPage': { title: 'Punch by Area Report' },
  // Settings pages
  'UserManagementPage': { title: 'User Management', subtitle: 'Manage team members' },
  'RolesPermissionsPage': { title: 'Roles & Permissions', subtitle: 'Access control' },
  'DistributionListsPage': { title: 'Distribution Lists', subtitle: 'Contact groups' },
  'CostCodesPage': { title: 'Cost Codes', subtitle: 'Budget categories' },
  'ProjectTemplatesPage': { title: 'Project Templates', subtitle: 'Reusable templates' },
  'ApprovalWorkflowsPage': { title: 'Approval Workflows', subtitle: 'Workflow configuration' },
  'CalendarIntegrationsPage': { title: 'Calendar Integrations', subtitle: 'Sync calendars' },
  'DocuSignIntegrationPage': { title: 'DocuSign Integration', subtitle: 'Electronic signatures' },
  'QuickBooksPage': { title: 'QuickBooks', subtitle: 'Financial sync' },
  'NotificationPreferencesPage': { title: 'Notifications', subtitle: 'Notification preferences' },
  'CompanyProfilePage': { title: 'Company Profile', subtitle: 'Company information' },
  'UserApprovalsPage': { title: 'User Approvals', subtitle: 'Pending user requests' },
};

function getAllTsxFiles(dir, files = []) {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      getAllTsxFiles(fullPath, files);
    } else if (entry.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractPageName(filePath) {
  const fileName = filePath.split(/[/\\]/).pop();
  return fileName.replace('.tsx', '');
}

function migrateFile(filePath) {
  stats.scanned++;

  let content = readFileSync(filePath, 'utf-8');

  // Check if it uses AppLayout
  if (!content.includes("from '@/components/layout/AppLayout'") &&
      !content.includes('from "@/components/layout/AppLayout"') &&
      !content.includes("from '@/components/layout'")) {
    stats.skipped++;
    return false;
  }

  // Skip if already using SmartLayout
  if (content.includes('SmartLayout')) {
    stats.skipped++;
    return false;
  }

  const pageName = extractPageName(filePath);
  const pageInfo = pageTitles[pageName] || {};

  try {
    // Replace import statement
    content = content.replace(
      /import\s*{\s*AppLayout\s*}\s*from\s*['"]@\/components\/layout\/AppLayout['"]/g,
      "import { SmartLayout } from '@/components/layout/SmartLayout'"
    );

    // Also handle barrel imports
    content = content.replace(
      /import\s*{\s*([^}]*)\bAppLayout\b([^}]*)\s*}\s*from\s*['"]@\/components\/layout['"]/g,
      (match, before, after) => {
        const otherImports = (before + after).replace(/,\s*,/g, ',').replace(/^,|,$/g, '').trim();
        if (otherImports) {
          return `import { ${otherImports} } from '@/components/layout'\nimport { SmartLayout } from '@/components/layout/SmartLayout'`;
        }
        return "import { SmartLayout } from '@/components/layout/SmartLayout'";
      }
    );

    // Build SmartLayout props
    let smartLayoutProps = '';
    if (pageInfo.title) {
      smartLayoutProps += ` title="${pageInfo.title}"`;
    }
    if (pageInfo.subtitle) {
      smartLayoutProps += ` subtitle="${pageInfo.subtitle}"`;
    }

    // Replace <AppLayout> with <SmartLayout>
    content = content.replace(/<AppLayout>/g, `<SmartLayout${smartLayoutProps}>`);
    content = content.replace(/<\/AppLayout>/g, '</SmartLayout>');

    // Handle AppLayout with props
    content = content.replace(/<AppLayout\s+([^>]*)>/g, (match, props) => {
      return `<SmartLayout${smartLayoutProps ? smartLayoutProps + ' ' : ' '}${props}>`;
    });

    if (!DRY_RUN) {
      writeFileSync(filePath, content, 'utf-8');
    }

    stats.migrated++;
    console.log(`✓ Migrated: ${relative(process.cwd(), filePath)}`);
    return true;

  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`✗ Error: ${relative(process.cwd(), filePath)} - ${error.message}`);
    return false;
  }
}

// Main execution
console.log('🚀 Starting AppLayout -> SmartLayout migration...\n');
console.log(DRY_RUN ? '📝 DRY RUN MODE - No files will be modified\n' : '');

const files = getAllTsxFiles(PAGES_DIR);
files.forEach(migrateFile);

console.log('\n📊 Migration Summary:');
console.log(`   Scanned: ${stats.scanned} files`);
console.log(`   Migrated: ${stats.migrated} files`);
console.log(`   Skipped: ${stats.skipped} files`);

if (stats.errors.length > 0) {
  console.log(`   Errors: ${stats.errors.length}`);
  stats.errors.forEach(({ file, error }) => {
    console.log(`      - ${file}: ${error}`);
  });
}

console.log('\n✅ Migration complete!');
