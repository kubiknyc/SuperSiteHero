// File: /src/features/cost-estimates/components/EstimateItemsTable.tsx
// Table displaying cost estimate line items

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui'
import { Pencil, Trash2 } from 'lucide-react'
import type { CostEstimateItem } from '@/types/database-extensions'

interface EstimateItemsTableProps {
  items: CostEstimateItem[]
  onEditItem?: (item: CostEstimateItem) => void
  onDeleteItem?: (itemId: string) => void
  isLoading?: boolean
  readOnly?: boolean
}

export function EstimateItemsTable({
  items,
  onEditItem,
  onDeleteItem,
  isLoading = false,
  readOnly = false,
}: EstimateItemsTableProps) {
  const formatCurrency = (value: number | string | null | undefined) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (numValue === null || numValue === undefined || isNaN(numValue)) {return '$0.00'}
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numValue)
  }

  const formatQuantity = (value: number | string | null | undefined) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (numValue === null || numValue === undefined || isNaN(numValue)) {return '0.00'}
    return numValue.toFixed(2)
  }

  // Calculate totals
  const totals = items.reduce(
    (acc, item) => {
      const materialCost = typeof item.material_cost === 'string' ? parseFloat(item.material_cost) : item.material_cost
      const laborCost = typeof item.labor_cost === 'string' ? parseFloat(item.labor_cost) : item.labor_cost
      const totalCost = typeof item.total_cost === 'string' ? parseFloat(item.total_cost) : item.total_cost

      return {
        material: acc.material + (materialCost || 0),
        labor: acc.labor + (laborCost || 0),
        total: acc.total + (totalCost || 0),
      }
    },
    { material: 0, labor: 0, total: 0 }
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading items...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 border rounded-lg">
        <p className="text-muted-foreground">No line items yet. Add items to build your estimate.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Material Cost</TableHead>
              <TableHead className="text-right">Labor Hours</TableHead>
              <TableHead className="text-right">Labor Cost</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
              {!readOnly && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{item.measurement_type}</Badge>
                </TableCell>
                <TableCell className="text-right">{formatQuantity(item.quantity)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.unit_cost)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.material_cost)}</TableCell>
                <TableCell className="text-right">{formatQuantity(item.labor_hours)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.labor_cost)}</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(item.total_cost)}
                </TableCell>
                {!readOnly && (
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {onEditItem && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditItem(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {onDeleteItem && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-error" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Line Item</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{item.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDeleteItem(item.id)}
                                className="bg-red-500 hover:bg-error"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}

            {/* Totals Row */}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell colSpan={4}>Totals</TableCell>
              <TableCell className="text-right">{formatCurrency(totals.material)}</TableCell>
              <TableCell></TableCell>
              <TableCell className="text-right">{formatCurrency(totals.labor)}</TableCell>
              <TableCell className="text-right">{formatCurrency(totals.total)}</TableCell>
              {!readOnly && <TableCell></TableCell>}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
