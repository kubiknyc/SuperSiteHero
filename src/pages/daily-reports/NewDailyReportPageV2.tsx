/**
 * NewDailyReportPageV2 - Create new daily report with V2 form
 * Uses the redesigned Quick Mode form for fast entry
 */

import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { DailyReportFormV2 } from '@/features/daily-reports/components/v2';
import { SmartLayout } from '@/components/layout/SmartLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  ChevronLeft,
  Zap,
} from 'lucide-react';
import { validateDateNotFuture } from '@/features/daily-reports/validation/validationUtils';
import { useDuplicateDetection } from '@/features/daily-reports/hooks/useDuplicateDetection';
import { toast } from 'sonner';

export function NewDailyReportPageV2() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedProjectId, setSelectedProjectId, projects, isLoading: projectsLoading } = useSelectedProject();

  // Sync from URL on mount if URL has projectId
  useState(() => {
    const urlProjectId = searchParams.get('projectId');
    if (urlProjectId && urlProjectId !== selectedProjectId) {
      setSelectedProjectId(urlProjectId);
    }
  });
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [errors, setErrors] = useState({
    project: '',
    date: '',
  });
  const [showForm, setShowForm] = useState(false);

  // Check for duplicate reports on the same date
  const { data: duplicateResult } = useDuplicateDetection(selectedProjectId, selectedDate);

  const selectedProject = projects?.find((p) => p.id === selectedProjectId);

  const validateAndProceed = useCallback(() => {
    const newErrors = { project: '', date: '' };

    if (!selectedProjectId) {
      newErrors.project = 'Please select a project';
    }

    if (!selectedDate) {
      newErrors.date = 'Please select a date';
    } else if (!validateDateNotFuture(selectedDate)) {
      newErrors.date = 'Report date cannot be in the future';
    }

    setErrors(newErrors);

    if (newErrors.project || newErrors.date) {
      toast.error('Please fix validation errors before continuing');
      return;
    }

    if (duplicateResult?.hasDuplicate) {
      toast.warning('A report already exists for this date');
      return;
    }

    setShowForm(true);
  }, [selectedProjectId, selectedDate, duplicateResult]);

  const handleBack = useCallback(() => {
    if (showForm) {
      setShowForm(false);
    } else {
      navigate('/daily-reports');
    }
  }, [showForm, navigate]);

  // Show the V2 form
  if (showForm && selectedProjectId && selectedDate) {
    return (
      <DailyReportFormV2
        projectId={selectedProjectId}
        projectName={selectedProject?.name}
        reportDate={selectedDate}
        onBack={handleBack}
      />
    );
  }

  // Project selection screen
  return (
    <SmartLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/daily-reports')}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground heading-page">New Daily Report</h1>
            <p className="text-secondary">Start a new daily report for your project</p>
          </div>
        </div>

        {/* Quick Mode Banner */}
        <Card className="bg-gradient-to-r from-info-light to-info-light/80 border-info">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-info-dark">Quick Mode Enabled</p>
                <p className="text-sm text-primary-hover">
                  Complete your daily report in under 5 minutes with our streamlined form
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selection Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Report Details
            </CardTitle>
            <CardDescription>
              Select the project and date for your daily report
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              label="Select Project"
              htmlFor="project_select"
              required
              error={errors.project}
            >
              <select
                id="project_select"
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setErrors((prev) => ({ ...prev, project: '' }));
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.project ? 'border-error' : 'border-input'
                }`}
                disabled={projectsLoading}
              >
                <option value="">-- Select a project --</option>
                {projects?.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Report Date"
              htmlFor="report_date"
              required
              error={errors.date}
            >
              <input
                id="report_date"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setErrors((prev) => ({ ...prev, date: '' }));
                }}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.date ? 'border-error' : 'border-input'
                }`}
              />
            </FormField>

            {/* Duplicate Report Warning */}
            {duplicateResult?.hasDuplicate && duplicateResult.existingReport && (
              <div className="p-4 bg-warning-light border border-warning rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-warning-dark">Report Already Exists</p>
                    <p className="text-sm text-warning-dark/80 mb-3">
                      A daily report for <strong>{selectedDate}</strong> already exists.
                      Status: <strong>{duplicateResult.existingReport.status}</strong>
                    </p>
                    <div className="flex gap-2">
                      <Link
                        to={`/daily-reports/${duplicateResult.existingReport.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md bg-warning-light text-warning-dark hover:bg-warning/20"
                      >
                        View Report
                      </Link>
                      {duplicateResult.existingReport.status === 'draft' && (
                        <Link
                          to={`/daily-reports/${duplicateResult.existingReport.id}/edit`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md bg-warning text-white hover:bg-warning/90"
                        >
                          Edit Draft
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* No Projects Warning */}
            {!projectsLoading && projects && projects.length === 0 && (
              <div className="flex gap-3 p-4 bg-warning-light border border-warning rounded-lg">
                <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
                <div>
                  <p className="font-medium text-warning-dark">No projects available</p>
                  <p className="text-sm text-warning-dark/80">
                    Create a project first before creating daily reports.
                  </p>
                </div>
              </div>
            )}

            {/* Continue Button */}
            <Button
              onClick={validateAndProceed}
              disabled={duplicateResult?.hasDuplicate}
              className="w-full"
              size="lg"
            >
              <Zap className="h-4 w-4 mr-2" />
              Start Quick Mode Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </SmartLayout>
  );
}

export default NewDailyReportPageV2;
