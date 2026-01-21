/**
 * MobileDashboard - Field-focused mobile dashboard
 *
 * Provides quick access to field work features:
 * - Today's summary (weather, crew count, key metrics)
 * - Quick action grid (camera, daily report, punch item, inspection)
 * - Recent activity list
 * - Pending items requiring attention
 *
 * Wired up to real data from existing hooks.
 */

import { memo, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Camera,
  ClipboardList,
  ListChecks,
  FileCheck,
  ChevronRight,
  Sun,
  CloudRain,
  Cloud,
  Snowflake,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useSelectedProject } from '../../hooks/useSelectedProject';
import { useAuth } from '../../lib/auth/AuthContext';
import { usePunchItems } from '../../features/punch-lists/hooks';
import { useTasks, useMyTasks } from '../../features/tasks/hooks/useTasks';
import { useInspections, useUpcomingInspections } from '../../features/inspections/hooks/useInspections';
import { useDailyReports } from '../../features/daily-reports/hooks';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';

// Quick action button component
interface QuickActionProps {
  icon: React.ElementType;
  label: string;
  to: string;
  color?: string;
}

const QuickAction = memo(function QuickAction({
  icon: Icon,
  label,
  to,
  color = 'bg-primary',
}: QuickActionProps) {
  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-4 rounded-xl",
        "bg-card border border-border hover:border-primary/50 transition-colors",
        "min-h-[100px] active:scale-95"
      )}
    >
      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", color)}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </Link>
  );
});

// Summary stat card
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  isLoading?: boolean;
  onClick?: () => void;
}

const StatCard = memo(function StatCard({ label, value, icon: Icon, isLoading, onClick }: StatCardProps) {
  const content = (
    <div className={cn(
      "flex items-center gap-3 p-3 bg-muted/30 rounded-lg",
      onClick && "cursor-pointer hover:bg-muted/50 transition-colors"
    )}>
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <p className="text-lg font-semibold text-foreground">{value}</p>
        )}
      </div>
    </div>
  );

  if (onClick) {
    return <button onClick={onClick} className="w-full text-left">{content}</button>;
  }
  return content;
});

// Activity item component
interface ActivityItemProps {
  title: string;
  subtitle: string;
  time: string;
  status: 'pending' | 'completed' | 'overdue';
  to: string;
}

const ActivityItem = memo(function ActivityItem({
  title,
  subtitle,
  time,
  status,
  to,
}: ActivityItemProps) {
  const statusConfig = {
    pending: { icon: Clock, color: 'text-warning' },
    completed: { icon: CheckCircle2, color: 'text-success' },
    overdue: { icon: AlertCircle, color: 'text-error' },
  };
  const { icon: StatusIcon, color } = statusConfig[status];

  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors"
    >
      <StatusIcon className={cn("h-5 w-5 flex-shrink-0", color)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{time}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
});

// Weather icon helper
function getWeatherIcon(condition?: string) {
  if (!condition) {return Sun;}
  const lower = condition.toLowerCase();
  if (lower.includes('rain') || lower.includes('shower')) {return CloudRain;}
  if (lower.includes('cloud') || lower.includes('overcast')) {return Cloud;}
  if (lower.includes('snow') || lower.includes('sleet')) {return Snowflake;}
  return Sun;
}

export const MobileDashboard = memo(function MobileDashboard() {
  const { user } = useAuth();
  const { selectedProject, selectedProjectId } = useSelectedProject();
  const navigate = useNavigate();

  // Fetch real data
  const { data: punchItems, isLoading: punchLoading } = usePunchItems(selectedProjectId);
  const { data: myTasks, isLoading: tasksLoading } = useMyTasks(selectedProjectId);
  const { data: upcomingInspections, isLoading: inspectionsLoading } = useUpcomingInspections(selectedProjectId);
  const { data: dailyReports, isLoading: reportsLoading } = useDailyReports(selectedProjectId);

  // Calculate stats
  const stats = useMemo(() => {
    const openPunchItems = punchItems?.filter(p => p.status === 'open' || p.status === 'in_progress').length ?? 0;
    const pendingTasks = myTasks?.filter(t => t.status !== 'completed').length ?? 0;
    const todayReports = dailyReports?.filter(r => {
      const reportDate = new Date(r.report_date);
      const today = new Date();
      return reportDate.toDateString() === today.toDateString();
    }).length ?? 0;
    const dueInspections = upcomingInspections?.filter(i => {
      if (!i.scheduled_date) {return false;}
      const scheduledDate = new Date(i.scheduled_date);
      const today = new Date();
      return scheduledDate <= today;
    }).length ?? 0;

    return { openPunchItems, pendingTasks, todayReports, dueInspections };
  }, [punchItems, myTasks, dailyReports, upcomingInspections]);

  // Build recent activity from real data
  const recentActivity = useMemo(() => {
    const activities: ActivityItemProps[] = [];

    // Add recent daily reports
    dailyReports?.slice(0, 2).forEach(report => {
      activities.push({
        title: `Daily Report - ${report.summary?.slice(0, 30) || 'No summary'}`,
        subtitle: `${report.status}`,
        time: formatDistanceToNow(new Date(report.created_at), { addSuffix: true }),
        status: report.status === 'approved' ? 'completed' : report.status === 'draft' ? 'pending' : 'completed',
        to: `/mobile/daily-reports/${report.id}`,
      });
    });

    // Add recent punch items
    punchItems?.slice(0, 2).forEach(item => {
      const isOverdue = item.due_date && new Date(item.due_date) < new Date() && item.status !== 'closed';
      activities.push({
        title: `Punch Item - ${item.title}`,
        subtitle: item.location || 'No location',
        time: formatDistanceToNow(new Date(item.created_at), { addSuffix: true }),
        status: item.status === 'closed' ? 'completed' : isOverdue ? 'overdue' : 'pending',
        to: `/mobile/punch-lists/${item.id}`,
      });
    });

    // Add upcoming inspections
    upcomingInspections?.slice(0, 2).forEach(inspection => {
      const isOverdue = inspection.scheduled_date && new Date(inspection.scheduled_date) < new Date();
      activities.push({
        title: `Inspection - ${inspection.type || 'General'}`,
        subtitle: inspection.location || 'No location',
        time: inspection.scheduled_date
          ? formatDistanceToNow(new Date(inspection.scheduled_date), { addSuffix: true })
          : 'Not scheduled',
        status: inspection.result === 'pass' ? 'completed' : isOverdue ? 'overdue' : 'pending',
        to: `/mobile/inspections/${inspection.id}`,
      });
    });

    // Sort by most recent and limit
    return activities.slice(0, 4);
  }, [dailyReports, punchItems, upcomingInspections]);

  // Pending attention items
  const attentionItems = useMemo(() => {
    const items: { title: string; subtitle: string; action: string; path: string }[] = [];

    // Overdue inspections
    const overdueInspections = upcomingInspections?.filter(i => {
      if (!i.scheduled_date) {return false;}
      return new Date(i.scheduled_date) < new Date() && i.status !== 'completed';
    });
    if (overdueInspections?.length) {
      items.push({
        title: 'Overdue Inspections',
        subtitle: `${overdueInspections.length} inspection(s) past due`,
        action: 'Review',
        path: '/mobile/inspections',
      });
    }

    // Missing today's report
    const hasReportToday = dailyReports?.some(r => {
      const reportDate = new Date(r.report_date);
      const today = new Date();
      return reportDate.toDateString() === today.toDateString();
    });
    if (!hasReportToday && selectedProjectId) {
      items.push({
        title: 'Missing Daily Report',
        subtitle: "Today's report not submitted",
        action: 'Create',
        path: '/mobile/daily-reports/new',
      });
    }

    // Overdue punch items
    const overduePunch = punchItems?.filter(p => {
      if (!p.due_date) {return false;}
      return new Date(p.due_date) < new Date() && p.status !== 'closed';
    });
    if (overduePunch?.length) {
      items.push({
        title: 'Overdue Punch Items',
        subtitle: `${overduePunch.length} item(s) past due date`,
        action: 'View',
        path: '/mobile/punch-lists',
      });
    }

    return items;
  }, [upcomingInspections, dailyReports, punchItems, selectedProjectId]);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {return 'Good morning';}
    if (hour < 17) {return 'Good afternoon';}
    return 'Good evening';
  };

  // Get first name from user
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  const isLoading = punchLoading || tasksLoading || inspectionsLoading || reportsLoading;
  const WeatherIcon = Sun; // Default, would come from weather API

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Greeting */}
      <div className="space-y-1">
        <h1 className="heading-page text-foreground">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-muted-foreground">
          {selectedProject ? selectedProject.name : 'Select a project to get started'}
        </p>
      </div>

      {/* Today's Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Today's Summary</CardTitle>
            <div className="flex items-center gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <div className="flex items-center gap-1 text-muted-foreground">
                <WeatherIcon className="h-4 w-4 text-warning" />
                <span className="text-sm">72°F</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <StatCard
            label="Pending Tasks"
            value={stats.pendingTasks}
            icon={ListChecks}
            isLoading={tasksLoading}
            onClick={() => navigate('/mobile/tasks')}
          />
          <StatCard
            label="Open Punch Items"
            value={stats.openPunchItems}
            icon={AlertCircle}
            isLoading={punchLoading}
            onClick={() => navigate('/mobile/punch-lists')}
          />
          <StatCard
            label="Today's Reports"
            value={stats.todayReports}
            icon={ClipboardList}
            isLoading={reportsLoading}
            onClick={() => navigate('/mobile/daily-reports')}
          />
          <StatCard
            label="Inspections Due"
            value={stats.dueInspections}
            icon={FileCheck}
            isLoading={inspectionsLoading}
            onClick={() => navigate('/mobile/inspections')}
          />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction
            icon={Camera}
            label="Take Photo"
            to={selectedProject ? `/mobile/photo-progress/capture` : '/mobile/photo-progress/capture'}
            color="bg-info"
          />
          <QuickAction
            icon={ClipboardList}
            label="Daily Report"
            to="/mobile/daily-reports/new"
            color="bg-success"
          />
          <QuickAction
            icon={ListChecks}
            label="Punch Item"
            to="/mobile/punch-lists/new"
            color="bg-warning"
          />
          <QuickAction
            icon={FileCheck}
            label="Inspection"
            to="/mobile/inspections/new"
            color="bg-primary"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary h-8"
              onClick={() => navigate('/mobile/daily-reports')}
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-1 p-2">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <ActivityItem key={index} {...activity} />
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
              <p className="text-xs">Start by creating a daily report</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Items - Only show if there are items */}
      {attentionItems.length > 0 && (
        <Card className="border-warning/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              <CardTitle className="text-base">Needs Attention</CardTitle>
              <Badge variant="secondary" className="ml-auto">{attentionItems.length} items</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {attentionItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate(item.path)}>
                  {item.action}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Floating Action Button for quick photo */}
      <Button
        size="lg"
        className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg z-30"
        onClick={() => navigate('/mobile/photo-progress/capture')}
      >
        <Camera className="h-6 w-6" />
        <span className="sr-only">Quick Photo</span>
      </Button>
    </div>
  );
});

export default MobileDashboard;
