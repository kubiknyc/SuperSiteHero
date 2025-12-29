/**
 * Invoice List Page
 * Display and manage owner/client invoices
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Send,
  Eye,
  MoreHorizontal,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Calendar,
  Building2,
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
import {
  useProjectInvoices,
  useInvoiceStats,
  useSendOwnerInvoice,
  useVoidOwnerInvoice,
} from '@/features/invoicing/hooks/useOwnerInvoices';
import { InvoiceFormDialog } from '@/features/invoicing/components/InvoiceFormDialog';
import { InvoiceDetailDialog } from '@/features/invoicing/components/InvoiceDetailDialog';
import { formatCurrency } from '@/lib/utils';
import type { OwnerInvoice, OwnerInvoiceStatus } from '@/types/owner-invoice';
import { OWNER_INVOICE_STATUSES } from '@/types/owner-invoice';

/**
 * Get status badge variant based on invoice status
 */
function getStatusBadgeVariant(status: OwnerInvoiceStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
      return 'default';
    case 'sent':
    case 'viewed':
    case 'partially_paid':
      return 'secondary';
    case 'overdue':
    case 'disputed':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * Get status color class for styling
 */
function getStatusColorClass(status: OwnerInvoiceStatus): string {
  switch (status) {
    case 'paid':
      return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
    case 'sent':
      return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
    case 'viewed':
      return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400';
    case 'partially_paid':
      return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'overdue':
      return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
    case 'disputed':
      return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
    case 'void':
      return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400';
    default:
      return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400';
  }
}

export default function InvoiceListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OwnerInvoiceStatus | 'all'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<OwnerInvoice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Queries
  const { data: invoices, isLoading } = useProjectInvoices(projectId);
  const { data: stats } = useInvoiceStats(projectId);

  // Mutations
  const sendInvoice = useSendOwnerInvoice();
  const voidInvoice = useVoidOwnerInvoice();

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    if (!invoices) {return [];}

    return invoices.filter((invoice) => {
      // Status filter
      if (statusFilter !== 'all' && invoice.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
          invoice.billToName.toLowerCase().includes(searchLower) ||
          invoice.billToCompany?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [invoices, statusFilter, search]);

  // Handlers
  const handleAddInvoice = () => {
    setSelectedInvoice(null);
    setIsFormOpen(true);
  };

  const handleEditInvoice = (invoice: OwnerInvoice) => {
    setSelectedInvoice(invoice);
    setIsFormOpen(true);
  };

  const handleViewInvoice = (invoice: OwnerInvoice) => {
    setSelectedInvoice(invoice);
    setIsDetailOpen(true);
  };

  const handleSendInvoice = async (invoice: OwnerInvoice) => {
    try {
      await sendInvoice.mutateAsync({ id: invoice.id });
      toast.success(`Invoice ${invoice.invoiceNumber} sent`);
    } catch (error) {
      toast.error('Failed to send invoice');
    }
  };

  const handleVoidInvoice = async (invoice: OwnerInvoice) => {
    try {
      await voidInvoice.mutateAsync(invoice.id);
      toast.success(`Invoice ${invoice.invoiceNumber} voided`);
    } catch (error) {
      toast.error('Failed to void invoice');
    }
  };

  const handleRowClick = (invoice: OwnerInvoice) => {
    handleViewInvoice(invoice);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 heading-page">
            <FileText className="h-6 w-6" />
            Invoices
          </h1>
          <p className="text-muted-foreground">
            Bill project owners and track payments
          </p>
        </div>
        <Button onClick={handleAddInvoice}>
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.draftCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats?.totalDraft || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Send className="h-4 w-4 text-blue-500" />
              Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.sentCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats?.totalSent || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.overdueCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats?.totalOverdue || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.paidCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats?.totalPaidThisMonth || 0)} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-yellow-500" />
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(stats?.totalOutstanding || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total receivables</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as OwnerInvoiceStatus | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {OWNER_INVOICE_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Invoice Table */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filteredInvoices.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Bill To</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(invoice)}
                >
                  <TableCell className="font-medium">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.invoiceDate), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{invoice.billToName}</div>
                      {invoice.billToCompany && (
                        <div className="text-sm text-muted-foreground">
                          {invoice.billToCompany}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(invoice.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        invoice.balanceDue > 0
                          ? 'text-amber-600 font-medium'
                          : 'text-green-600'
                      }
                    >
                      {formatCurrency(invoice.balanceDue)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getStatusBadgeVariant(invoice.status)}
                      className={getStatusColorClass(invoice.status)}
                    >
                      {OWNER_INVOICE_STATUSES.find((s) => s.value === invoice.status)?.label ||
                        invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewInvoice(invoice)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {invoice.status === 'draft' && (
                          <>
                            <DropdownMenuItem onClick={() => handleEditInvoice(invoice)}>
                              Edit Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendInvoice(invoice)}>
                              <Send className="h-4 w-4 mr-2" />
                              Send Invoice
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {invoice.status !== 'void' && invoice.status !== 'paid' && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleVoidInvoice(invoice)}
                          >
                            Void Invoice
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium heading-subsection">No invoices found</h3>
            <p className="text-muted-foreground mb-4">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first invoice to bill the project owner'}
            </p>
            {!search && statusFilter === 'all' && (
              <Button onClick={handleAddInvoice}>
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <InvoiceFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        projectId={projectId || ''}
        invoice={selectedInvoice}
      />

      {/* Detail Dialog */}
      <InvoiceDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        invoiceId={selectedInvoice?.id}
        onEdit={() => {
          setIsDetailOpen(false);
          if (selectedInvoice) {
            handleEditInvoice(selectedInvoice);
          }
        }}
      />
    </div>
  );
}
