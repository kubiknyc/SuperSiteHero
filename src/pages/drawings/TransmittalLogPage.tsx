/**
 * Transmittal Log Page
 * Track all drawing transmittals across the project
 */

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { format, formatDistanceToNow, isAfter, subDays } from 'date-fns';
import {
  Send,
  Search,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Mail,
  Building2,
  Calendar,
  FileText,
  MoreHorizontal,
  Eye,
  Bell,
  CheckCheck,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDrawings, useDrawingTransmittals } from '@/features/drawings/hooks/useDrawings';
import type { DrawingTransmittal, Drawing } from '@/types/drawing';

type TransmittalStatus = 'all' | 'pending' | 'acknowledged' | 'overdue';

interface AggregatedTransmittal extends DrawingTransmittal {
  drawing?: Drawing;
}

function StatusBadge({ acknowledged, transmittalDate }: { acknowledged: boolean; transmittalDate: string }) {
  const isOverdue = !acknowledged && isAfter(new Date(), subDays(new Date(transmittalDate), -14));

  if (acknowledged) {
    return (
      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Acknowledged
      </Badge>
    );
  }

  if (isOverdue) {
    return (
      <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        Overdue
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
      <Clock className="h-3 w-3 mr-1" />
      Pending
    </Badge>
  );
}

interface TransmittalRowProps {
  transmittal: AggregatedTransmittal;
}

function TransmittalRow({ transmittal }: TransmittalRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">
          {transmittal.transmittalNumber || `T-${transmittal.id.slice(0, 8)}`}
        </div>
        <div className="text-sm text-muted-foreground">
          {transmittal.drawing?.drawingNumber || 'Unknown drawing'}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{transmittal.recipientCompany || 'N/A'}</div>
            {transmittal.recipientName && (
              <div className="text-sm text-muted-foreground">{transmittal.recipientName}</div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <div>{format(new Date(transmittal.transmittalDate), 'MMM d, yyyy')}</div>
            <div className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(transmittal.transmittalDate), { addSuffix: true })}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span>{transmittal.copiesSent}</span>
          {transmittal.format && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {transmittal.format}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge
          acknowledged={transmittal.acknowledged}
          transmittalDate={transmittal.transmittalDate}
        />
      </TableCell>
      <TableCell>
        {transmittal.acknowledgedAt ? (
          <div className="text-sm">
            <div>{format(new Date(transmittal.acknowledgedAt), 'MMM d, yyyy')}</div>
            <div className="text-muted-foreground">{transmittal.acknowledgedBy}</div>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {!transmittal.acknowledged && (
              <>
                <DropdownMenuItem>
                  <Bell className="h-4 w-4 mr-2" />
                  Send Reminder
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark Acknowledged
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Download className="h-4 w-4 mr-2" />
              Download Receipt
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <XCircle className="h-4 w-4 mr-2" />
              Void Transmittal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default function TransmittalLogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TransmittalStatus>('all');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all');

  // Fetch all drawings to get transmittal data
  const { data: drawings, isLoading: loadingDrawings } = useDrawings(projectId, {});

  // Aggregate all transmittals from drawings
  // In a real app, you'd have a dedicated API endpoint for this
  const { data: allTransmittals, isLoading } = useMemo(() => {
    // For now, return empty array - would need to fetch transmittals per drawing
    // This is a simplified version that uses mock/aggregated data
    return { data: [] as AggregatedTransmittal[], isLoading: loadingDrawings };
  }, [loadingDrawings]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = allTransmittals?.length || 0;
    const acknowledged = allTransmittals?.filter((t) => t.acknowledged).length || 0;
    const pending = total - acknowledged;
    const overdue = allTransmittals?.filter((t) => {
      if (t.acknowledged) {return false;}
      return isAfter(new Date(), subDays(new Date(t.transmittalDate), -14));
    }).length || 0;

    return { total, acknowledged, pending, overdue };
  }, [allTransmittals]);

  // Filter transmittals
  const filteredTransmittals = useMemo(() => {
    if (!allTransmittals) {return [];}

    return allTransmittals.filter((t) => {
      // Status filter
      if (statusFilter === 'acknowledged' && !t.acknowledged) {return false;}
      if (statusFilter === 'pending' && t.acknowledged) {return false;}
      if (statusFilter === 'overdue') {
        if (t.acknowledged) {return false;}
        if (!isAfter(new Date(), subDays(new Date(t.transmittalDate), -14))) {return false;}
      }

      // Date range filter
      if (dateRange !== 'all') {
        const days = parseInt(dateRange);
        const cutoff = subDays(new Date(), days);
        if (!isAfter(new Date(t.transmittalDate), cutoff)) {return false;}
      }

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          t.transmittalNumber?.toLowerCase().includes(searchLower) ||
          t.recipientCompany?.toLowerCase().includes(searchLower) ||
          t.recipientName?.toLowerCase().includes(searchLower) ||
          t.drawing?.drawingNumber?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [allTransmittals, statusFilter, dateRange, search]);

  // Group by recipient company
  const groupedByCompany = useMemo(() => {
    const groups: Record<string, AggregatedTransmittal[]> = {};
    filteredTransmittals.forEach((t) => {
      const company = t.recipientCompany || 'Unknown';
      if (!groups[company]) {groups[company] = [];}
      groups[company].push(t);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [filteredTransmittals]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Send className="h-6 w-6" />
            Transmittal Log
          </h1>
          <p className="text-muted-foreground">
            Track all drawing transmittals and acknowledgments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Log
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Bulk Reminder
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Transmittals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Acknowledged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.acknowledged}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transmittals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as TransmittalStatus)}
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={dateRange}
          onValueChange={(value) => setDateRange(value as typeof dateRange)}
        >
          <SelectTrigger className="w-[150px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="by-company">By Company</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredTransmittals.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Send className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No transmittals found</h3>
                <p className="text-muted-foreground mb-4">
                  {search || statusFilter !== 'all' || dateRange !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Transmittals will appear here when drawings are distributed'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Transmittal Table */}
          {!isLoading && filteredTransmittals.length > 0 && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transmittal</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Date Sent</TableHead>
                    <TableHead>Copies</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Acknowledged</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransmittals.map((transmittal) => (
                    <TransmittalRow key={transmittal.id} transmittal={transmittal} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-company" className="mt-4">
          {/* Empty State */}
          {!isLoading && groupedByCompany.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No transmittals found</h3>
                <p className="text-muted-foreground">
                  Transmittals grouped by company will appear here
                </p>
              </CardContent>
            </Card>
          )}

          {/* Grouped by Company */}
          {groupedByCompany.length > 0 && (
            <div className="space-y-4">
              {groupedByCompany.map(([company, transmittals]) => {
                const pendingCount = transmittals.filter((t) => !t.acknowledged).length;
                return (
                  <Card key={company}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          {company}
                        </CardTitle>
                        <div className="flex gap-2">
                          <Badge variant="secondary">{transmittals.length} total</Badge>
                          {pendingCount > 0 && (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                              {pendingCount} pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Transmittal</TableHead>
                              <TableHead>Date Sent</TableHead>
                              <TableHead>Copies</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {transmittals.slice(0, 5).map((t) => (
                              <TableRow key={t.id}>
                                <TableCell>
                                  <div className="font-medium">
                                    {t.transmittalNumber || `T-${t.id.slice(0, 8)}`}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {t.drawing?.drawingNumber}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {format(new Date(t.transmittalDate), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell>{t.copiesSent}</TableCell>
                                <TableCell>
                                  <StatusBadge
                                    acknowledged={t.acknowledged}
                                    transmittalDate={t.transmittalDate}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {transmittals.length > 5 && (
                        <Button variant="link" className="mt-2">
                          View all {transmittals.length} transmittals
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
