/**
 * Mobile Daily Reports Pages
 *
 * Touch-optimized daily report management for field workers.
 * Wired up to real data from existing hooks.
 */

import { memo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus,
  ChevronRight,
  Calendar,
  Cloud,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  Send,
  ArrowLeft,
  Sun,
  CloudRain,
  Snowflake,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { useSelectedProject } from '../../../hooks/useSelectedProject';
import {
  useDailyReports,
  useDailyReport,
  useCreateDailyReport,
  useUpdateDailyReport,
  useDeleteDailyReport,
} from '../../../features/daily-reports/hooks';
import { cn } from '../../../lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '../../../components/ui/use-toast';

// Status badge helper
function getStatusBadge(status: string) {
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    draft: { variant: 'secondary', label: 'Draft' },
    submitted: { variant: 'default', label: 'Submitted' },
    approved: { variant: 'default', label: 'Approved' },
    rejected: { variant: 'destructive', label: 'Rejected' },
    pending_review: { variant: 'outline', label: 'Pending Review' },
  };
  return config[status] || { variant: 'secondary', label: status };
}

// Weather icon helper
function getWeatherIcon(condition?: string) {
  if (!condition) return Sun;
  const lower = condition.toLowerCase();
  if (lower.includes('rain') || lower.includes('shower')) return CloudRain;
  if (lower.includes('cloud') || lower.includes('overcast')) return Cloud;
  if (lower.includes('snow') || lower.includes('sleet')) return Snowflake;
  return Sun;
}

// List view for daily reports
export const MobileDailyReportsList = memo(function MobileDailyReportsList() {
  const navigate = useNavigate();
  const { selectedProjectId, selectedProject } = useSelectedProject();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch real data
  const { data: reports, isLoading, error } = useDailyReports(selectedProjectId);

  // Filter reports by search
  const filteredReports = reports?.filter(report => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      report.summary?.toLowerCase().includes(query) ||
      report.report_date.includes(query)
    );
  });

  if (!selectedProjectId) {
    return (
      <div className="p-4 text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Project Selected</h3>
        <p className="text-muted-foreground mb-4">
          Please select a project to view daily reports
        </p>
        <Button onClick={() => navigate('/mobile/projects')}>
          Select Project
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Daily Reports</h1>
          <p className="text-sm text-muted-foreground">{selectedProject?.name}</p>
        </div>
        <Button onClick={() => navigate('/mobile/daily-reports/new')} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>

      {/* Filter/Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search reports..."
          className="flex-1 h-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button variant="outline" size="icon" className="h-10 w-10">
          <Calendar className="h-4 w-4" />
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">Failed to load reports</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      )}

      {/* Reports list */}
      {!isLoading && !error && (
        <div className="space-y-3">
          {filteredReports?.map((report) => {
            const statusConfig = getStatusBadge(report.status);
            const WeatherIcon = getWeatherIcon(report.weather_conditions);

            return (
              <Card
                key={report.id}
                className="cursor-pointer hover:border-primary/50 transition-colors active:scale-[0.99]"
                onClick={() => navigate(`/mobile/daily-reports/${report.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {format(new Date(report.report_date), 'EEE, MMM d, yyyy')}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <WeatherIcon className="h-3 w-3" />
                        <span>{report.weather_conditions || 'No weather data'}</span>
                        {report.temperature_high && (
                          <span>· {report.temperature_high}°F</span>
                        )}
                      </div>
                    </div>
                    <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {report.summary || 'No summary provided'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {report.crew_count || 0} workers
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && (!filteredReports || filteredReports.length === 0) && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchQuery ? 'No matching reports' : 'No reports yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? 'Try a different search term' : 'Create your first daily report to get started'}
          </p>
          {!searchQuery && (
            <Button onClick={() => navigate('/mobile/daily-reports/new')}>
              <Plus className="h-4 w-4 mr-1" />
              Create Report
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

// Form for creating/editing daily reports
export const MobileDailyReportForm = memo(function MobileDailyReportForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { selectedProjectId } = useSelectedProject();
  const { toast } = useToast();

  // Fetch existing report if editing
  const { data: existingReport, isLoading: isLoadingReport } = useDailyReport(id || '');

  // Mutations
  const createMutation = useCreateDailyReport();
  const updateMutation = useUpdateDailyReport();

  const [formData, setFormData] = useState({
    report_date: new Date().toISOString().split('T')[0],
    weather_conditions: '',
    temperature_high: '',
    temperature_low: '',
    crew_count: '',
    summary: '',
    work_completed: '',
    delays_issues: '',
  });

  // Populate form when editing
  useState(() => {
    if (existingReport) {
      setFormData({
        report_date: existingReport.report_date,
        weather_conditions: existingReport.weather_conditions || '',
        temperature_high: existingReport.temperature_high?.toString() || '',
        temperature_low: existingReport.temperature_low?.toString() || '',
        crew_count: existingReport.crew_count?.toString() || '',
        summary: existingReport.summary || '',
        work_completed: existingReport.work_completed || '',
        delays_issues: existingReport.delays_issues || '',
      });
    }
  });

  const handleSubmit = useCallback(async (e: React.FormEvent, asDraft = false) => {
    e.preventDefault();

    if (!selectedProjectId) {
      toast({
        title: 'Error',
        description: 'Please select a project first',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      project_id: selectedProjectId,
      report_date: formData.report_date,
      weather_conditions: formData.weather_conditions || null,
      temperature_high: formData.temperature_high ? parseInt(formData.temperature_high) : null,
      temperature_low: formData.temperature_low ? parseInt(formData.temperature_low) : null,
      crew_count: formData.crew_count ? parseInt(formData.crew_count) : null,
      summary: formData.summary || null,
      work_completed: formData.work_completed || null,
      delays_issues: formData.delays_issues || null,
      status: asDraft ? 'draft' : 'submitted',
    };

    try {
      if (isEditing && id) {
        await updateMutation.mutateAsync({ id, ...payload });
        toast({
          title: 'Success',
          description: 'Report updated successfully',
        });
      } else {
        await createMutation.mutateAsync(payload);
        toast({
          title: 'Success',
          description: asDraft ? 'Report saved as draft' : 'Report submitted successfully',
        });
      }
      navigate('/mobile/daily-reports');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save report',
        variant: 'destructive',
      });
    }
  }, [formData, selectedProjectId, isEditing, id, createMutation, updateMutation, navigate, toast]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isEditing && isLoadingReport) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">
          {isEditing ? 'Edit Report' : 'New Daily Report'}
        </h1>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="report_date">Report Date</Label>
          <Input
            id="report_date"
            type="date"
            value={formData.report_date}
            onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
            className="h-12"
            required
          />
        </div>

        {/* Weather */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2 col-span-1">
            <Label htmlFor="weather_conditions">Weather</Label>
            <Input
              id="weather_conditions"
              placeholder="Sunny"
              value={formData.weather_conditions}
              onChange={(e) => setFormData({ ...formData, weather_conditions: e.target.value })}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="temperature_high">High °F</Label>
            <Input
              id="temperature_high"
              type="number"
              placeholder="75"
              value={formData.temperature_high}
              onChange={(e) => setFormData({ ...formData, temperature_high: e.target.value })}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="temperature_low">Low °F</Label>
            <Input
              id="temperature_low"
              type="number"
              placeholder="55"
              value={formData.temperature_low}
              onChange={(e) => setFormData({ ...formData, temperature_low: e.target.value })}
              className="h-12"
            />
          </div>
        </div>

        {/* Crew Count */}
        <div className="space-y-2">
          <Label htmlFor="crew_count">Crew Count</Label>
          <Input
            id="crew_count"
            type="number"
            placeholder="Number of workers on site"
            value={formData.crew_count}
            onChange={(e) => setFormData({ ...formData, crew_count: e.target.value })}
            className="h-12"
          />
        </div>

        {/* Summary */}
        <div className="space-y-2">
          <Label htmlFor="summary">Summary</Label>
          <Textarea
            id="summary"
            placeholder="Brief summary of the day's work..."
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            rows={3}
            className="min-h-[80px]"
          />
        </div>

        {/* Work Completed */}
        <div className="space-y-2">
          <Label htmlFor="work_completed">Work Completed</Label>
          <Textarea
            id="work_completed"
            placeholder="Describe work completed today..."
            value={formData.work_completed}
            onChange={(e) => setFormData({ ...formData, work_completed: e.target.value })}
            rows={4}
            className="min-h-[100px]"
          />
        </div>

        {/* Issues */}
        <div className="space-y-2">
          <Label htmlFor="delays_issues">Issues / Delays</Label>
          <Textarea
            id="delays_issues"
            placeholder="Any issues or delays encountered..."
            value={formData.delays_issues}
            onChange={(e) => setFormData({ ...formData, delays_issues: e.target.value })}
            rows={3}
            className="min-h-[80px]"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12"
            onClick={(e) => handleSubmit(e as any, true)}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Draft'}
          </Button>
          <Button type="submit" className="flex-1 h-12" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                Submit
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
});

// Detail view for a single report
export const MobileDailyReportDetail = memo(function MobileDailyReportDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  // Fetch real data
  const { data: report, isLoading, error } = useDailyReport(id || '');
  const deleteMutation = useDeleteDailyReport();

  const handleDelete = useCallback(async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast({
        title: 'Success',
        description: 'Report deleted successfully',
      });
      navigate('/mobile/daily-reports');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete report',
        variant: 'destructive',
      });
    }
  }, [id, deleteMutation, navigate, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-4 text-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Report Not Found</h3>
        <Button onClick={() => navigate('/mobile/daily-reports')}>
          Back to Reports
        </Button>
      </div>
    );
  }

  const statusConfig = getStatusBadge(report.status);
  const WeatherIcon = getWeatherIcon(report.weather_conditions);

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/mobile/daily-reports')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">
            {format(new Date(report.report_date), 'EEEE, MMMM d, yyyy')}
          </h1>
          <p className="text-sm text-muted-foreground">Daily Report</p>
        </div>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <WeatherIcon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-medium">{report.weather_conditions || 'N/A'}</p>
          <p className="text-xs text-muted-foreground">
            {report.temperature_high ? `${report.temperature_high}°F` : '--'}
          </p>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-medium">{report.crew_count || 0}</p>
          <p className="text-xs text-muted-foreground">Workers</p>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-medium">
            {format(new Date(report.created_at), 'h:mm a')}
          </p>
          <p className="text-xs text-muted-foreground">Created</p>
        </div>
      </div>

      {/* Summary */}
      {report.summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{report.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Work Completed */}
      {report.work_completed && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Work Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {report.work_completed}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Issues */}
      {report.delays_issues && (
        <Card className="border-yellow-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              Issues / Delays
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{report.delays_issues}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          className="flex-1 h-12"
          onClick={() => navigate(`/mobile/daily-reports/${id}/edit`)}
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-12 text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </>
          )}
        </Button>
      </div>
    </div>
  );
});

export default MobileDailyReportsList;
