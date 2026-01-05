/**
 * Mobile Daily Reports Pages
 *
 * Touch-optimized daily report management for field workers.
 */

import { memo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { useSelectedProject } from '../../../hooks/useSelectedProject';
import { cn } from '../../../lib/utils';

// List view for daily reports
export const MobileDailyReportsList = memo(function MobileDailyReportsList() {
  const navigate = useNavigate();
  const { selectedProject } = useSelectedProject();

  // Mock data - would come from useDailyReports hook
  const reports = [
    {
      id: '1',
      date: '2024-01-15',
      status: 'submitted',
      weather: 'Sunny, 72°F',
      crewCount: 12,
      summary: 'Foundation work continued on Building A',
    },
    {
      id: '2',
      date: '2024-01-14',
      status: 'draft',
      weather: 'Cloudy, 65°F',
      crewCount: 10,
      summary: 'Concrete pour completed for footings',
    },
    {
      id: '3',
      date: '2024-01-13',
      status: 'submitted',
      weather: 'Rain, 58°F',
      crewCount: 8,
      summary: 'Limited work due to weather',
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Daily Reports</h1>
        <Button onClick={() => navigate('/daily-reports/new')} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Report
        </Button>
      </div>

      {/* Filter/Search */}
      <div className="flex gap-2">
        <Input placeholder="Search reports..." className="flex-1" />
        <Button variant="outline" size="icon">
          <Calendar className="h-4 w-4" />
        </Button>
      </div>

      {/* Reports list */}
      <div className="space-y-3">
        {reports.map((report) => (
          <Card
            key={report.id}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate(`/daily-reports/${report.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-foreground">
                    {new Date(report.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">{report.weather}</p>
                </div>
                <Badge variant={report.status === 'submitted' ? 'default' : 'secondary'}>
                  {report.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {report.summary}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {report.crewCount} workers
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {reports.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No reports yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first daily report to get started
          </p>
          <Button onClick={() => navigate('/daily-reports/new')}>
            <Plus className="h-4 w-4 mr-1" />
            Create Report
          </Button>
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

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weather: '',
    temperature: '',
    crewCount: '',
    summary: '',
    workCompleted: '',
    materialsUsed: '',
    issues: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Submit form data
    navigate('/daily-reports');
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">
          {isEditing ? 'Edit Report' : 'New Daily Report'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="h-12"
          />
        </div>

        {/* Weather */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="weather">Weather</Label>
            <Input
              id="weather"
              placeholder="Sunny, Cloudy..."
              value={formData.weather}
              onChange={(e) => setFormData({ ...formData, weather: e.target.value })}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature</Label>
            <Input
              id="temperature"
              placeholder="72°F"
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
              className="h-12"
            />
          </div>
        </div>

        {/* Crew Count */}
        <div className="space-y-2">
          <Label htmlFor="crewCount">Crew Count</Label>
          <Input
            id="crewCount"
            type="number"
            placeholder="Number of workers"
            value={formData.crewCount}
            onChange={(e) => setFormData({ ...formData, crewCount: e.target.value })}
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
          />
        </div>

        {/* Work Completed */}
        <div className="space-y-2">
          <Label htmlFor="workCompleted">Work Completed</Label>
          <Textarea
            id="workCompleted"
            placeholder="Describe work completed today..."
            value={formData.workCompleted}
            onChange={(e) => setFormData({ ...formData, workCompleted: e.target.value })}
            rows={4}
          />
        </div>

        {/* Issues */}
        <div className="space-y-2">
          <Label htmlFor="issues">Issues / Delays</Label>
          <Textarea
            id="issues"
            placeholder="Any issues or delays encountered..."
            value={formData.issues}
            onChange={(e) => setFormData({ ...formData, issues: e.target.value })}
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            {isEditing ? 'Save Changes' : 'Submit Report'}
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

  // Mock data - would come from useDailyReport hook
  const report = {
    id: '1',
    date: '2024-01-15',
    status: 'submitted',
    weather: 'Sunny',
    temperature: '72°F',
    crewCount: 12,
    summary: 'Foundation work continued on Building A. Completed footings for sections 1-4.',
    workCompleted: 'Completed concrete pour for footings in sections 1-4. Installed rebar for sections 5-6. Site preparation for tomorrow\'s work.',
    issues: 'Minor delay due to late material delivery. Resolved by noon.',
    submittedBy: 'John Doe',
    submittedAt: '2024-01-15T17:30:00',
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {new Date(report.date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </h1>
          <p className="text-sm text-muted-foreground">Daily Report</p>
        </div>
        <Badge variant={report.status === 'submitted' ? 'default' : 'secondary'}>
          {report.status}
        </Badge>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <Cloud className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-medium">{report.weather}</p>
          <p className="text-xs text-muted-foreground">{report.temperature}</p>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-medium">{report.crewCount}</p>
          <p className="text-xs text-muted-foreground">Workers</p>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-medium">5:30 PM</p>
          <p className="text-xs text-muted-foreground">Submitted</p>
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{report.summary}</p>
        </CardContent>
      </Card>

      {/* Work Completed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Work Completed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {report.workCompleted}
          </p>
        </CardContent>
      </Card>

      {/* Issues */}
      {report.issues && (
        <Card className="border-yellow-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Issues / Delays</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{report.issues}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => navigate(`/daily-reports/${id}/edit`)}
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button variant="outline" className="flex-1 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
});

export default MobileDailyReportsList;
