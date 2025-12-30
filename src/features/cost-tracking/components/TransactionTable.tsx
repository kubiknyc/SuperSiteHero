/**
 * Transaction Table Component
 * Displays cost transactions with filtering and sorting
 */

import { useState, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { format } from 'date-fns'
import {
  Receipt,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Building2,
  FileText,
  Truck,
  Clock,
  Wrench,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { TRANSACTION_TYPES, SOURCE_TYPES, type CostTransactionWithDetails, type TransactionType, type SourceType } from '@/types/cost-tracking'

interface TransactionTableProps {
  transactions: CostTransactionWithDetails[]
  isLoading: boolean
  onEdit: (transaction: CostTransactionWithDetails) => void
  onDelete: (id: string) => void
}

type SortField = 'transaction_date' | 'cost_code' | 'amount' | 'transaction_type'
type SortDirection = 'asc' | 'desc'

export function TransactionTable({
  transactions,
  isLoading,
  onEdit,
  onDelete,
}: TransactionTableProps) {
  const [sortField, setSortField] = useState<SortField>('transaction_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getTransactionTypeBadge = (type: TransactionType) => {
    const config = TRANSACTION_TYPES.find(t => t.value === type)
    const colorMap: Record<string, string> = {
      blue: 'bg-info-light text-primary-hover',
      green: 'bg-success-light text-success-dark',
      orange: 'bg-orange-100 text-orange-700',
      purple: 'bg-purple-100 text-purple-700',
    }
    return (
      <Badge className={cn('font-medium', colorMap[config?.color || 'blue'])}>
        {config?.label || type}
      </Badge>
    )
  }

  const getSourceIcon = (sourceType: SourceType | null) => {
    switch (sourceType) {
      case 'change_order':
        return <FileText className="h-4 w-4 text-purple-500" />
      case 'invoice':
        return <Receipt className="h-4 w-4 text-success" />
      case 'subcontract':
        return <Building2 className="h-4 w-4 text-primary" />
      case 'material':
        return <Truck className="h-4 w-4 text-orange-500" />
      case 'equipment':
        return <Wrench className="h-4 w-4 text-muted" />
      case 'timesheet':
        return <Clock className="h-4 w-4 text-indigo-500" />
      default:
        return <Receipt className="h-4 w-4 text-disabled" />
    }
  }

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      let aVal: string | number | Date
      let bVal: string | number | Date

      switch (sortField) {
        case 'transaction_date':
          aVal = new Date(a.transaction_date)
          bVal = new Date(b.transaction_date)
          break
        case 'cost_code':
          aVal = a.cost_code?.code || ''
          bVal = b.cost_code?.code || ''
          break
        case 'amount':
          aVal = a.amount
          bVal = b.amount
          break
        case 'transaction_type':
          aVal = a.transaction_type
          bVal = b.transaction_type
          break
        default:
          return 0
      }

      if (aVal instanceof Date && bVal instanceof Date) {
        return sortDirection === 'asc'
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime()
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })
  }, [transactions, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection(field === 'transaction_date' ? 'desc' : 'asc')
    }
  }

  const SortHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <th
      className={cn('py-3 px-3 font-medium text-muted cursor-pointer hover:bg-surface select-none', className)}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        )}
      </div>
    </th>
  )

  const handleConfirmDelete = () => {
    if (deleteId) {
      onDelete(deleteId)
      setDeleteId(null)
    }
  }

  // Calculate totals by type
  const totalsByType = useMemo(() => {
    return transactions.reduce((acc, t) => {
      acc[t.transaction_type] = (acc[t.transaction_type] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)
  }, [transactions])

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)

  // Virtualization setup
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: sortedTransactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 65, // Estimated row height in pixels
    overscan: 5, // Number of items to render outside visible area
  })

  if (isLoading) {
    return (
      <div className="py-12 text-center text-muted">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center">
        <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-muted">No transactions found</p>
        <p className="text-sm text-disabled">Record cost transactions to track spending</p>
      </div>
    )
  }

  return (
    <>
      {/* Totals by Type */}
      <div className="flex flex-wrap gap-4 mb-4 p-3 bg-surface rounded-lg">
        {TRANSACTION_TYPES.map(type => (
          <div key={type.value} className="flex items-center gap-2">
            {getTransactionTypeBadge(type.value)}
            <span className="font-mono text-sm">
              {formatCurrency(totalsByType[type.value] || 0)}
            </span>
          </div>
        ))}
        <div className="ml-auto font-medium">
          Total: <span className="font-mono">{formatCurrency(totalAmount)}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-background z-10">
            <tr className="border-b">
              <SortHeader field="transaction_date" className="text-left">Date</SortHeader>
              <SortHeader field="cost_code" className="text-left">Cost Code</SortHeader>
              <th className="text-left py-3 px-3 font-medium text-muted">Description</th>
              <SortHeader field="transaction_type" className="text-left">Type</SortHeader>
              <th className="text-left py-3 px-3 font-medium text-muted">Source</th>
              <th className="text-left py-3 px-3 font-medium text-muted">Vendor</th>
              <SortHeader field="amount" className="text-right">Amount</SortHeader>
              <th className="w-10" />
            </tr>
          </thead>
        </table>

        {/* Virtualized table body */}
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{
            height: '600px',
            width: '100%',
          }}
        >
          <table className="w-full">
            <tbody
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const transaction = sortedTransactions[virtualRow.index]
                return (
                  <tr
                    key={transaction.id}
                    className="border-b hover:bg-surface transition-colors absolute w-full"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <td className="py-3 px-3 text-sm">
                      {format(new Date(transaction.transaction_date), 'MMM d, yyyy')}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-mono text-sm">{transaction.cost_code?.code}</span>
                        <span className="text-xs text-muted truncate max-w-[150px]">
                          {transaction.cost_code?.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm max-w-[200px]">
                      <p className="truncate">{transaction.description}</p>
                      {(transaction.invoice_number || transaction.po_number) && (
                        <p className="text-xs text-muted">
                          {transaction.invoice_number && `Inv: ${transaction.invoice_number}`}
                          {transaction.invoice_number && transaction.po_number && ' | '}
                          {transaction.po_number && `PO: ${transaction.po_number}`}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {getTransactionTypeBadge(transaction.transaction_type)}
                    </td>
                    <td className="py-3 px-3">
                      {transaction.source_type && (
                        <div className="flex items-center gap-1">
                          {getSourceIcon(transaction.source_type)}
                          <span className="text-xs text-secondary">
                            {SOURCE_TYPES.find(s => s.value === transaction.source_type)?.label}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-sm">
                      {transaction.subcontractor?.name || transaction.vendor_name || '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm font-medium">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="py-3 px-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(transaction)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteId(transaction.id)}
                            className="text-error"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This will affect budget calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-error hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
