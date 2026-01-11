/**
 * AIA G703 Form Component
 *
 * Continuation Sheet for AIA G702
 * Industry-standard detailed line item breakdown with:
 * - SOV detail with all billing columns
 * - Multi-page support for printing
 * - Linked to G702 application
 */

import { useState, useMemo, useRef } from 'react'
import {
  Printer,
  Download,
  Save,
  Edit2,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import {
  useG703,
  usePaymentApplication,
  useUpdateG703LineItem,
  useRecalculateG702Totals,
} from '../hooks/usePaymentApplications'
import type { AIAG703LineItem } from '../types/sov'

// ============================================================================
// TYPES
// ============================================================================

interface AIAG703FormProps {
  g702Id: string
  projectName?: string
  projectNumber?: string
  isEditable?: boolean
  onBackToG702?: () => void
  className?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ITEMS_PER_PAGE = 25 // Standard items per continuation sheet page

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AIAG703Form({
  g702Id,
  projectName = '',
  projectNumber = '',
  isEditable = true,
  onBackToG702,
  className,
}: AIAG703FormProps) {
  const { data: g703, isLoading, error, refetch } = useG703(g702Id)
  const { data: g702 } = usePaymentApplication(g702Id)
  const updateLineItem = useUpdateG703LineItem()
  const recalculateTotals = useRecalculateG702Totals()

  const printRef = useRef<HTMLDivElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [editValues, setEditValues] = useState<{
    this_period: string
    materials_presently_stored: string
  }>({ this_period: '', materials_presently_stored: '' })

  // Calculate pagination
  const totalPages = useMemo(() => {
    if (!g703?.line_items) {return 1}
    return Math.ceil(g703.line_items.length / ITEMS_PER_PAGE)
  }, [g703?.line_items])

  const paginatedItems = useMemo(() => {
    if (!g703?.line_items) {return []}
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return g703.line_items.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [g703?.line_items, currentPage])

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  // Start editing
  const startEditing = (item: AIAG703LineItem) => {
    setEditingId(item.id)
    setEditValues({
      this_period: String(item.this_period || ''),
      materials_presently_stored: String(item.materials_presently_stored || ''),
    })
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null)
    setEditValues({ this_period: '', materials_presently_stored: '' })
  }

  // Save line item
  const handleSave = async (id: string) => {
    await updateLineItem.mutateAsync({
      id,
      data: {
        this_period: parseFloat(editValues.this_period) || 0,
        materials_presently_stored: parseFloat(editValues.materials_presently_stored) || 0,
      },
    })

    // Recalculate G702 totals
    await recalculateTotals.mutateAsync(g702Id)

    cancelEditing()
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96" />
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error || !g703) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-lg font-medium">Error loading continuation sheet</p>
          <p className="text-sm text-muted-foreground mb-4">
            {error?.message || 'Data not found'}
          </p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const canEdit = isEditable && g702?.status === 'draft'

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Actions */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          {onBackToG702 && (
            <Button variant="ghost" size="sm" onClick={onBackToG702}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to G702
            </Button>
          )}
          <h2 className="text-2xl font-bold">
            Continuation Sheet - Application #{g703.application_number}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* G703 Form */}
      <Card ref={printRef} className="print:shadow-none print:border-0">
        <CardContent className="p-8">
          {/* Form Header */}
          <div className="mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold">CONTINUATION SHEET</h1>
                <p className="text-sm text-gray-600">AIA DOCUMENT G703</p>
              </div>
              <div className="text-right text-sm">
                <p>
                  <span className="text-gray-600">Application No:</span>{' '}
                  <span className="font-medium">{g703.application_number}</span>
                </p>
                <p>
                  <span className="text-gray-600">Period To:</span>{' '}
                  <span className="font-medium">{format(parseISO(g703.period_to), 'MM/dd/yyyy')}</span>
                </p>
                <p>
                  <span className="text-gray-600">Page:</span>{' '}
                  <span className="font-medium">{currentPage} of {totalPages}</span>
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Project:</span>{' '}
                <span className="font-medium">{projectName}</span>
              </div>
              <div>
                <span className="text-gray-600">Project No:</span>{' '}
                <span className="font-medium">{projectNumber}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="w-16 text-center font-bold">A</TableHead>
                  <TableHead className="font-bold">B</TableHead>
                  <TableHead className="text-right w-28 font-bold">C</TableHead>
                  <TableHead className="text-right w-28 font-bold">D</TableHead>
                  <TableHead className="text-right w-28 font-bold">E</TableHead>
                  <TableHead className="text-right w-28 font-bold">F</TableHead>
                  <TableHead className="text-right w-20 font-bold">G</TableHead>
                  <TableHead className="text-right w-28 font-bold">H</TableHead>
                  <TableHead className="text-right w-24 font-bold">I</TableHead>
                  {canEdit && <TableHead className="w-20"></TableHead>}
                </TableRow>
                <TableRow className="bg-gray-50 text-xs">
                  <TableHead className="text-center">Item No.</TableHead>
                  <TableHead>Description of Work</TableHead>
                  <TableHead className="text-right">Scheduled Value</TableHead>
                  <TableHead className="text-right">Work Completed From Previous</TableHead>
                  <TableHead className="text-right">This Period</TableHead>
                  <TableHead className="text-right">Materials Stored</TableHead>
                  <TableHead className="text-right">Total (D+E+F)</TableHead>
                  <TableHead className="text-right">% (G/C)</TableHead>
                  <TableHead className="text-right">Balance (C-G)</TableHead>
                  <TableHead className="text-right">Retainage</TableHead>
                  {canEdit && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item) => {
                  const isEditing = editingId === item.id

                  return (
                    <TableRow key={item.id} className="hover:bg-gray-50">
                      <TableCell className="text-center font-mono text-sm">
                        {item.item_number}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="truncate font-medium">{item.description_of_work}</p>
                          {item.cost_code && (
                            <p className="text-xs text-muted-foreground">{item.cost_code}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.scheduled_value)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.from_previous_application)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            className="w-24 h-8 text-right text-sm"
                            value={editValues.this_period}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                this_period: e.target.value,
                              }))
                            }
                            autoFocus
                          />
                        ) : (
                          <span className="font-mono">{formatCurrency(item.this_period)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            className="w-24 h-8 text-right text-sm"
                            value={editValues.materials_presently_stored}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                materials_presently_stored: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          <span className="font-mono">
                            {formatCurrency(item.materials_presently_stored)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(item.total_completed_and_stored)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={item.percent_complete} className="w-10 h-2" />
                          <span className="font-mono text-sm">
                            {formatPercent(item.percent_complete)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.balance_to_finish)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.retainage)}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          {isEditing ? (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => handleSave(item.id)}
                                disabled={updateLineItem.isPending}
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={cancelEditing}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 opacity-0 group-hover:opacity-100"
                              onClick={() => startEditing(item)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-gray-100 font-bold">
                  <TableCell colSpan={2} className="text-right">
                    {currentPage === totalPages ? 'GRAND TOTAL' : `PAGE ${currentPage} TOTAL`}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(
                      currentPage === totalPages
                        ? g703.total_scheduled_value
                        : paginatedItems.reduce((sum, i) => sum + i.scheduled_value, 0)
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(
                      currentPage === totalPages
                        ? g703.total_from_previous
                        : paginatedItems.reduce((sum, i) => sum + i.from_previous_application, 0)
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(
                      currentPage === totalPages
                        ? g703.total_this_period
                        : paginatedItems.reduce((sum, i) => sum + i.this_period, 0)
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(
                      currentPage === totalPages
                        ? g703.total_materials_stored
                        : paginatedItems.reduce((sum, i) => sum + i.materials_presently_stored, 0)
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(
                      currentPage === totalPages
                        ? g703.total_completed_and_stored
                        : paginatedItems.reduce((sum, i) => sum + i.total_completed_and_stored, 0)
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatPercent(
                      g703.total_scheduled_value > 0
                        ? (g703.total_completed_and_stored / g703.total_scheduled_value) * 100
                        : 0
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(
                      currentPage === totalPages
                        ? g703.total_balance_to_finish
                        : paginatedItems.reduce((sum, i) => sum + i.balance_to_finish, 0)
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(
                      currentPage === totalPages
                        ? g703.total_retainage
                        : paginatedItems.reduce((sum, i) => sum + i.retainage, 0)
                    )}
                  </TableCell>
                  {canEdit && <TableCell></TableCell>}
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          {/* Pagination (print hidden) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 print:hidden">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, g703.line_items.length)} of{' '}
                {g703.line_items.length} items
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Summary Notes */}
          <div className="mt-6 text-xs text-gray-600 print:mt-4">
            <p>
              Column explanations: A = Item Number, B = Description of Work, C = Scheduled Value,
              D = Work Completed from Previous Applications, E = Work Completed This Period,
              F = Materials Presently Stored, G = Total Completed and Stored to Date (D+E+F),
              H = Percentage Complete (G/C), I = Balance to Finish (C-G)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card (for multi-page printing) */}
      {totalPages > 1 && currentPage === totalPages && (
        <Card className="print:break-before-page">
          <CardHeader>
            <CardTitle>Application Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Scheduled Value</p>
                <p className="text-xl font-bold">{formatCurrency(g703.total_scheduled_value)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Completed & Stored</p>
                <p className="text-xl font-bold">{formatCurrency(g703.total_completed_and_stored)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Balance to Finish</p>
                <p className="text-xl font-bold">{formatCurrency(g703.total_balance_to_finish)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Retainage</p>
                <p className="text-xl font-bold">{formatCurrency(g703.total_retainage)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AIAG703Form
