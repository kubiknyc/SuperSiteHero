import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  AlertCircle,
  Image,
  Building2,
  Filter,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import DailyPhotoChecklist from '@/features/photos/components/DailyPhotoChecklist';
import { useDailyPhotoChecklist } from '@/features/photos/hooks/usePhotoTemplates';
import { useProject } from '@/features/projects/hooks/useProjects';
import { AppLayout } from '@/components/layout/AppLayout';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
  isActive?: boolean;
}

function StatCard({ label, value, icon: Icon, color, onClick, isActive }: StatCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isActive && 'ring-2 ring-primary'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={cn('rounded-full p-2', color)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DailyPhotoChecklistPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');

  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const { data: checklist, isLoading } = useDailyPhotoChecklist(projectId || '', dateStr);
  const { data: project } = useProject(projectId || '');

  if (!projectId) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Image className="h-16 w-16 text-muted-foreground opacity-50" />
          <div className="text-center">
            <h2 className="text-lg font-semibold">No Project Selected</h2>
            <p className="text-muted-foreground">
              Please select a project to view the daily photo checklist
            </p>
          </div>
          <Button onClick={() => navigate('/projects')}>Go to Projects</Button>
        </div>
      </AppLayout>
    );
  }

  // Extract unique buildings from requirements
  const buildings = checklist?.requirements
    ? [...new Set(checklist.requirements.map((r) => r.template?.building).filter(Boolean))]
    : [];

  // Filter requirements based on status and building
  const filteredRequirements = checklist?.requirements?.filter((req) => {
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesBuilding =
      buildingFilter === 'all' || req.template?.building === buildingFilter;
    return matchesStatus && matchesBuilding;
  });

  const stats = checklist?.stats || { total: 0, completed: 0, pending: 0, overdue: 0, skipped: 0 };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold heading-page">Daily Photo Checklist</h1>
                <Badge variant="outline" className="hidden sm:inline-flex">
                  <CalendarDays className="h-3 w-3 mr-1" />
                  {format(new Date(), 'MMM d, yyyy')}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {project?.name || 'Loading...'} - Track required progress photos for each location
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Required"
              value={stats.total}
              icon={Camera}
              color="bg-primary"
              onClick={() => setStatusFilter('all')}
              isActive={statusFilter === 'all'}
            />
            <StatCard
              label="Completed"
              value={stats.completed}
              icon={CheckCircle2}
              color="bg-success"
              onClick={() => setStatusFilter('completed')}
              isActive={statusFilter === 'completed'}
            />
            <StatCard
              label="Pending"
              value={stats.pending}
              icon={Clock}
              color="bg-warning"
              onClick={() => setStatusFilter('pending')}
              isActive={statusFilter === 'pending'}
            />
            <StatCard
              label="Overdue"
              value={stats.overdue}
              icon={AlertCircle}
              color="bg-destructive"
              onClick={() => setStatusFilter('missed')}
              isActive={statusFilter === 'missed'}
            />
          </div>
        )}

        {/* Filters */}
        {buildings.length > 0 && (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={buildingFilter} onValueChange={setBuildingFilter}>
              <SelectTrigger className="w-[180px]">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Buildings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buildings</SelectItem>
                {buildings.map((building) => (
                  <SelectItem key={building} value={building || ''}>
                    {building}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(statusFilter !== 'all' || buildingFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setBuildingFilter('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Active filter indicator */}
        {(statusFilter !== 'all' || buildingFilter !== 'all') && filteredRequirements && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Showing {filteredRequirements.length} of {stats.total} requirements
            </span>
            {statusFilter !== 'all' && (
              <Badge variant="secondary" className="capitalize">
                {statusFilter}
              </Badge>
            )}
            {buildingFilter !== 'all' && (
              <Badge variant="secondary">
                <Building2 className="h-3 w-3 mr-1" />
                {buildingFilter}
              </Badge>
            )}
          </div>
        )}

        {/* Main Checklist Component */}
        <DailyPhotoChecklist
          projectId={projectId}
          onTakePhoto={(req) => {
            // Navigate to camera/upload page with requirement context
            navigate(`/projects/${projectId}/photos/upload?requirementId=${req.id}`);
          }}
          onViewPhoto={(photoId) => {
            // Navigate to photo detail
            navigate(`/projects/${projectId}/photos/${photoId}`);
          }}
        />

        {/* Quick Tips */}
        {stats.total > 0 && stats.completed < stats.total && (
          <Card className="border-dashed bg-muted/50">
            <CardContent className="p-4">
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <Camera className="h-4 w-4" />
                Quick Tips
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Photos are geotagged automatically when GPS is enabled</li>
                <li>• Use the "Skip" option only when a location is inaccessible</li>
                <li>• Completed photos are synced to the project gallery</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
