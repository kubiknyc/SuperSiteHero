/**
 * TransmittalList Component
 * Displays a list of transmittals with filtering and actions
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  FileText,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Plus,
  ChevronRight,
  Filter,
  Building2,
  AlertCircle,
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
import { useTransmittals, useTransmittalStats } from '../hooks/useTransmittals';
import {
  type TransmittalWithDetails,
  type TransmittalStatus,
  type TransmittalFilters,
  TRANSMITTAL_STATUSES,
  getTransmittalStatusColor,
  getTransmittalStatusLabel,
} from '@/types/transmittal';

interface TransmittalListProps {
  projectId: string;
  onCreateNew?: () => void;
}

const statusIcons: Record<TransmittalStatus, React.ReactNode> = {
  draft: <FileText className="h-4 w-4" />,
  sent: <Send className="h-4 w-4" />,
  received: <Clock className="h-4 w-4" />,
  acknowledged: <CheckCircle className="h-4 w-4" />,
  void: <XCircle className="h-4 w-4" />,
};

export function TransmittalList({ projectId, onCreateNew }: TransmittalListProps) {
  const [filters, setFilters] = useState<TransmittalFilters>({
    projectId,
    search: '',
    status: undefined,
  });

  const { data: transmittals, isLoading, error } = useTransmittals(filters);
  const { data: stats } = useTransmittalStats(projectId);

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleStatusChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      status: value === 'all' ? undefined : (value as TransmittalStatus),
    }));
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-destructive">Error loading transmittals</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Draft</div>
              <div className="text-2xl font-bold text-secondary">{stats.draft}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Sent</div>
              <div className="text-2xl font-bold text-primary">{stats.sent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Received</div>
              <div className="text-2xl font-bold text-success">{stats.received}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Acknowledged</div>
              <div className="text-2xl font-bold text-emerald-600">{stats.acknowledged}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Transmittals
            </CardTitle>
            {onCreateNew && (
              <Button onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                New Transmittal
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transmittals..."
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
                {TRANSMITTAL_STATUSES.map(status => (
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
          ) : transmittals && transmittals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Date Sent</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transmittals.map((transmittal) => (
                  <TransmittalRow
                    key={transmittal.id}
                    transmittal={transmittal}
                    projectId={projectId}
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2 heading-subsection">No transmittals found</h3>
              <p className="text-muted-foreground mb-4">
                {filters.search || filters.status
                  ? 'Try adjusting your filters'
                  : 'Create your first transmittal to get started'}
              </p>
              {onCreateNew && !filters.search && !filters.status && (
                <Button onClick={onCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Transmittal
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface TransmittalRowProps {
  transmittal: TransmittalWithDetails;
  projectId: string;
}

function TransmittalRow({ transmittal, projectId }: TransmittalRowProps) {
  const statusColor = getTransmittalStatusColor(transmittal.status);
  const statusLabel = getTransmittalStatusLabel(transmittal.status);
  const icon = statusIcons[transmittal.status];

  return (
    <TableRow>
      <TableCell className="font-medium">
        <Link
          to={`/projects/${projectId}/transmittals/${transmittal.id}`}
          className="hover:underline"
        >
          {transmittal.transmittal_number}
        </Link>
      </TableCell>
      <TableCell>
        <div className="max-w-[300px] truncate" title={transmittal.subject}>
          {transmittal.subject}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="truncate max-w-[150px]">{transmittal.to_company}</span>
        </div>
        {transmittal.to_contact && (
          <div className="text-sm text-muted-foreground truncate">
            {transmittal.to_contact}
          </div>
        )}
      </TableCell>
      <TableCell>
        {transmittal.date_sent ? (
          format(new Date(transmittal.date_sent), 'MMM d, yyyy')
        ) : (
          <span className="text-muted-foreground">Not sent</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline">
          {(transmittal as any).item_count || 0} items
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={`
            ${statusColor === 'gray' ? 'bg-muted text-foreground border-border' : ''}
            ${statusColor === 'blue' ? 'bg-info-light text-blue-800 border-blue-200' : ''}
            ${statusColor === 'green' ? 'bg-success-light text-green-800 border-green-200' : ''}
            ${statusColor === 'emerald' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : ''}
            ${statusColor === 'red' ? 'bg-error-light text-red-800 border-red-200' : ''}
          `}
        >
          <span className="mr-1">{icon}</span>
          {statusLabel}
        </Badge>
      </TableCell>
      <TableCell>
        <Link to={`/projects/${projectId}/transmittals/${transmittal.id}`}>
          <Button variant="ghost" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </TableCell>
    </TableRow>
  );
}

export default TransmittalList;
