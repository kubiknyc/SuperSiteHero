/**
 * MobileDashboard - Field-focused mobile dashboard
 *
 * Provides quick access to field work features:
 * - Today's summary (weather, crew count, key metrics)
 * - Quick action grid (camera, daily report, punch item, inspection)
 * - Recent activity list
 * - Pending items requiring attention
 */

import { memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Camera,
  ClipboardList,
  ListChecks,
  FileCheck,
  ChevronRight,
  Cloud,
  Sun,
  CloudRain,
  Clock,
  AlertCircle,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useSelectedProject } from '../../hooks/useSelectedProject';
import { useAuth } from '../../lib/auth/AuthContext';
import { cn } from '../../lib/utils';

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
  trend?: 'up' | 'down' | 'neutral';
}

const StatCard = memo(function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
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
    pending: { icon: Clock, color: 'text-yellow-500' },
    completed: { icon: CheckCircle2, color: 'text-green-500' },
    overdue: { icon: AlertCircle, color: 'text-red-500' },
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

export const MobileDashboard = memo(function MobileDashboard() {
  const { user } = useAuth();
  const { selectedProject } = useSelectedProject();
  const navigate = useNavigate();

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get first name from user
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="p-4 space-y-6">
      {/* Greeting */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">
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
            <div className="flex items-center gap-1 text-muted-foreground">
              <Sun className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">72°F</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <StatCard label="Pending Tasks" value={5} icon={ListChecks} />
          <StatCard label="Open Punch Items" value={12} icon={AlertCircle} />
          <StatCard label="Today's Reports" value={2} icon={ClipboardList} />
          <StatCard label="Inspections Due" value={3} icon={FileCheck} />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction
            icon={Camera}
            label="Take Photo"
            to={selectedProject ? `/projects/${selectedProject.id}/photo-progress/capture` : '/photo-progress/capture'}
            color="bg-blue-500"
          />
          <QuickAction
            icon={ClipboardList}
            label="Daily Report"
            to="/daily-reports/new"
            color="bg-green-500"
          />
          <QuickAction
            icon={ListChecks}
            label="Punch Item"
            to="/punch-lists/new"
            color="bg-orange-500"
          />
          <QuickAction
            icon={FileCheck}
            label="Inspection"
            to="/inspections/new"
            color="bg-purple-500"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary h-8">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-1 p-2">
          <ActivityItem
            title="Daily Report - Foundation Work"
            subtitle="Submitted by John Doe"
            time="2h ago"
            status="completed"
            to="/daily-reports/1"
          />
          <ActivityItem
            title="Punch Item #42 - Paint Touch-up"
            subtitle="Room 204, 2nd Floor"
            time="3h ago"
            status="pending"
            to="/punch-lists/42"
          />
          <ActivityItem
            title="Electrical Inspection"
            subtitle="Panel E-1, Building A"
            time="5h ago"
            status="overdue"
            to="/inspections/3"
          />
          <ActivityItem
            title="Photo Progress Update"
            subtitle="12 photos uploaded"
            time="Yesterday"
            status="completed"
            to="/photo-progress"
          />
        </CardContent>
      </Card>

      {/* Pending Items */}
      <Card className="border-yellow-500/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-base">Needs Attention</CardTitle>
            <Badge variant="secondary" className="ml-auto">3 items</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg">
            <div>
              <p className="text-sm font-medium">Overdue Inspection</p>
              <p className="text-xs text-muted-foreground">Fire Safety - Building B</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/inspections/5')}>
              Review
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg">
            <div>
              <p className="text-sm font-medium">Missing Daily Report</p>
              <p className="text-xs text-muted-foreground">Yesterday's report not submitted</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/daily-reports/new')}>
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Floating Action Button for quick photo */}
      <Button
        size="lg"
        className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg z-30"
        onClick={() => navigate(selectedProject ? `/projects/${selectedProject.id}/photo-progress/capture` : '/photo-progress/capture')}
      >
        <Camera className="h-6 w-6" />
        <span className="sr-only">Quick Photo</span>
      </Button>
    </div>
  );
});

export default MobileDashboard;
