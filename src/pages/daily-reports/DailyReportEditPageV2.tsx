/**
 * DailyReportEditPageV2 - Edit daily report with V2 form
 * Uses the redesigned Quick/Detailed Mode form
 */

import { useNavigate, useParams } from 'react-router-dom';
import { useDailyReportV2 } from '@/features/daily-reports/hooks/useDailyReportsV2';
import { DailyReportFormV2 } from '@/features/daily-reports/components/v2';
import { AppLayout } from '@/components/layout/AppLayout';
import { AlertCircle, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DailyReportEditPageV2() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: report, isLoading, error } = useDailyReportV2(id);

  const handleBack = () => {
    if (report) {
      navigate(`/daily-reports/${report.id}`);
    } else {
      navigate('/daily-reports');
    }
  };

  if (!id) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Report ID not found</p>
            <Button variant="outline" onClick={() => navigate('/daily-reports')} className="mt-4">
              Back to Reports
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-500">Loading report...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !report) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Error loading report</p>
            <p className="text-gray-500 text-sm mt-1">{error?.message || 'Report not found'}</p>
            <Button variant="outline" onClick={() => navigate('/daily-reports')} className="mt-4">
              Back to Reports
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Only allow editing draft or changes_requested reports
  const canEdit = report.status === 'draft' || report.status === 'changes_requested';

  if (!canEdit) {
    const statusLabels: Record<string, string> = {
      submitted: 'submitted for approval',
      in_review: 'under review',
      approved: 'approved',
      locked: 'locked',
    };

    return (
      <AppLayout>
        <div className="p-6">
          <div className="max-w-md mx-auto text-center py-12">
            <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Lock className="h-8 w-8 text-gray-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Cannot Edit Report</h2>
            <p className="text-gray-600 mb-4">
              This report has been {statusLabels[report.status] || report.status} and cannot be
              edited.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate(`/daily-reports/${report.id}`)}>
                View Report
              </Button>
              <Button onClick={() => navigate('/daily-reports')}>Back to Reports</Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <DailyReportFormV2
      projectId={report.project_id}
      reportDate={report.report_date}
      existingReport={report}
      onBack={handleBack}
    />
  );
}

export default DailyReportEditPageV2;
