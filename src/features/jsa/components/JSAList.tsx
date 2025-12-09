/**
 * JSAList Component
 * Displays a list of Job Safety Analyses with filtering and actions
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Shield,
  AlertTriangle,
  Clock,
  CheckCircle,
  PlayCircle,
  XCircle,
  Search,
  Plus,
  ChevronRight,
  Filter,
  MapPin,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useJSAs, useJSAStatistics } from '../hooks/useJSA';
import type { JSAWithDetails, JSAStatus, JSAFilters } from '@/types/jsa';
import {
  JSA_STATUSES,
  getJSAStatusColor,
  getJSAStatusLabel,
  calculateOverallRisk,
  getRiskLevelColor,
} from '@/types/jsa';

interface JSAListProps {
  projectId: string;
  onCreateNew?: () => void;
}

const statusIcons: Record<JSAStatus, React.ReactNode> = {
  draft: <Shield className="h-4 w-4" />,
  pending_review: <Clock className="h-4 w-4" />,
  approved: <CheckCircle className="h-4 w-4" />,
  in_progress: <PlayCircle className="h-4 w-4" />,
  completed: <CheckCircle className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
};

export function JSAList({ projectId, onCreateNew }: JSAListProps) {
  const [filters, setFilters] = useState<JSAFilters>({
    projectId,
    search: '',
    status: undefined,
  });

  const { data: jsas, isLoading, error } = useJSAs(filters);
  const { data: stats } = useJSAStatistics(projectId);

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleStatusChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      status: value === 'all' ? undefined : (value as JSAStatus),
    }));
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-destructive">Error loading JSAs</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total JSAs</div>
              <div className="text-2xl font-bold">{stats.total_jsas}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Pending Review</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending_review}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Approved</div>
              <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                High Risk
              </div>
              <div className="text-2xl font-bold text-red-600">{stats.high_risk_count}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Job Safety Analyses
            </CardTitle>
            {onCreateNew && (
              <Button onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                New JSA
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search JSAs..."
                value={filters.search || ''}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.status || 'all'}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {JSA_STATUSES.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : jsas && jsas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Hazards</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jsas.map((jsa) => (
                  <JSARow key={jsa.id} jsa={jsa} projectId={projectId} />
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No JSAs found</h3>
              <p className="text-muted-foreground mb-4">
                {filters.search || filters.status
                  ? 'Try adjusting your filters'
                  : 'Create your first Job Safety Analysis to get started'}
              </p>
              {onCreateNew && !filters.search && !filters.status && (
                <Button onClick={onCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create JSA
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface JSARowProps {
  jsa: JSAWithDetails;
  projectId: string;
}

function JSARow({ jsa, projectId }: JSARowProps) {
  const statusColor = getJSAStatusColor(jsa.status);
  const statusLabel = getJSAStatusLabel(jsa.status);
  const icon = statusIcons[jsa.status];
  const hazardCount = (jsa as any).hazard_count || jsa.hazards?.length || 0;
  const overallRisk = jsa.hazards?.length ? calculateOverallRisk(jsa.hazards) : 'low';
  const riskColor = getRiskLevelColor(overallRisk);

  return (
    <TableRow>
      <TableCell className="font-medium">
        <Link
          to={`/projects/${projectId}/jsa/${jsa.id}`}
          className="hover:underline"
        >
          {jsa.jsa_number}
        </Link>
      </TableCell>
      <TableCell>
        <div className="max-w-[200px] truncate" title={jsa.task_description}>
          {jsa.task_description}
        </div>
      </TableCell>
      <TableCell>
        {jsa.work_location ? (
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span className="truncate max-w-[120px]">{jsa.work_location}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        {format(new Date(jsa.scheduled_date), 'MMM d, yyyy')}
        {jsa.start_time && (
          <div className="text-xs text-muted-foreground">{jsa.start_time}</div>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{hazardCount} hazards</Badge>
          {hazardCount > 0 && (
            <Badge
              className={`text-xs ${
                riskColor === 'green' ? 'bg-green-100 text-green-800 border-green-200' :
                riskColor === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                riskColor === 'orange' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                'bg-red-100 text-red-800 border-red-200'
              }`}
            >
              {overallRisk}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={`
            ${statusColor === 'gray' ? 'bg-gray-100 text-gray-800 border-gray-200' : ''}
            ${statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : ''}
            ${statusColor === 'blue' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}
            ${statusColor === 'purple' ? 'bg-purple-100 text-purple-800 border-purple-200' : ''}
            ${statusColor === 'green' ? 'bg-green-100 text-green-800 border-green-200' : ''}
            ${statusColor === 'red' ? 'bg-red-100 text-red-800 border-red-200' : ''}
          `}
        >
          <span className="mr-1">{icon}</span>
          {statusLabel}
        </Badge>
      </TableCell>
      <TableCell>
        <Link to={`/projects/${projectId}/jsa/${jsa.id}`}>
          <Button variant="ghost" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </TableCell>
    </TableRow>
  );
}

export default JSAList;
