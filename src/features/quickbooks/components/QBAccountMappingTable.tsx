/**
 * QuickBooks Account Mapping Table
 *
 * Map local cost codes to QuickBooks Chart of Accounts
 */

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, Star, Loader2, RefreshCw, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  useQBAccountMappings,
  useQBAccounts,
  useCreateQBAccountMapping,
  useDeleteQBAccountMapping,
  useSetDefaultQBMapping,
  useQBConnectionStatus,
} from '../hooks/useQuickBooks'
import type { QBAccount, CreateQBAccountMappingDTO } from '@/types/quickbooks'

interface QBAccountMappingTableProps {
  connectionId: string | null | undefined
}

export function QBAccountMappingTable({ connectionId }: QBAccountMappingTableProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<QBAccount | null>(null)
  const [costCodeInput, setCostCodeInput] = useState('')

  const { data: mappings, isLoading: mappingsLoading } = useQBAccountMappings(connectionId ?? undefined)
  const { data: qbAccounts, isLoading: accountsLoading, refetch: refetchAccounts } = useQBAccounts(connectionId)
  const createMapping = useCreateQBAccountMapping()
  const deleteMapping = useDeleteQBAccountMapping()
  const setDefault = useSetDefaultQBMapping()

  const filteredAccounts = qbAccounts?.filter(
    (account) =>
      account.Name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.AcctNum?.includes(searchQuery)
  )

  const handleAddMapping = async () => {
    if (!connectionId || !selectedAccount) return

    const mapping: CreateQBAccountMappingDTO = {
      cost_code: costCodeInput || undefined,
      qb_account_id: selectedAccount.Id!,
      qb_account_name: selectedAccount.Name,
      qb_account_type: selectedAccount.AccountType,
      qb_account_number: selectedAccount.AcctNum,
      is_default: !mappings?.length, // First mapping is default
    }

    try {
      await createMapping.mutateAsync({ connectionId, mapping })
      setIsAddDialogOpen(false)
      setSelectedAccount(null)
      setCostCodeInput('')
      setSearchQuery('')
    } catch (error) {
      console.error('Failed to create mapping:', error)
    }
  }

  const handleDeleteMapping = async (mappingId: string) => {
    try {
      await deleteMapping.mutateAsync(mappingId)
    } catch (error) {
      console.error('Failed to delete mapping:', error)
    }
  }

  const handleSetDefault = async (mappingId: string) => {
    if (!connectionId) return
    try {
      await setDefault.mutateAsync({ mappingId, connectionId })
    } catch (error) {
      console.error('Failed to set default mapping:', error)
    }
  }

  if (!connectionId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Connect to QuickBooks to manage account mappings.
      </div>
    )
  }

  if (mappingsLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Map your cost codes to QuickBooks accounts for accurate financial tracking.
        </p>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Mapping
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Account Mapping</DialogTitle>
              <DialogDescription>
                Map a cost code to a QuickBooks account.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cost Code (optional)</label>
                <Input
                  placeholder="e.g., 01-310 or leave blank for default"
                  value={costCodeInput}
                  onChange={(e) => setCostCodeInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to use as default account for unmapped cost codes.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">QuickBooks Account</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchAccounts()}
                    disabled={accountsLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${accountsLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search accounts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto border rounded-md">
                  {accountsLoading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                      Loading accounts...
                    </div>
                  ) : filteredAccounts?.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No accounts found
                    </div>
                  ) : (
                    filteredAccounts?.map((account) => (
                      <button
                        key={account.Id}
                        type="button"
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 border-b last:border-b-0 ${
                          selectedAccount?.Id === account.Id ? 'bg-muted' : ''
                        }`}
                        onClick={() => setSelectedAccount(account)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{account.Name}</span>
                          {account.AcctNum && (
                            <span className="text-muted-foreground">#{account.AcctNum}</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{account.AccountType}</div>
                      </button>
                    ))
                  )}
                </div>

                {selectedAccount && (
                  <div className="p-2 bg-muted rounded-md text-sm">
                    Selected: <strong>{selectedAccount.Name}</strong>
                    {selectedAccount.AcctNum && ` (#${selectedAccount.AcctNum})`}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddMapping}
                disabled={!selectedAccount || createMapping.isPending}
              >
                {createMapping.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Add Mapping
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {mappings?.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground mb-2">No account mappings configured yet.</p>
          <p className="text-sm text-muted-foreground">
            Add mappings to sync your cost codes with QuickBooks accounts.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cost Code</TableHead>
              <TableHead>QB Account</TableHead>
              <TableHead>Account Type</TableHead>
              <TableHead className="text-center">Default</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings?.map((mapping) => (
              <TableRow key={mapping.id}>
                <TableCell className="font-medium">
                  {mapping.cost_code || (
                    <span className="text-muted-foreground italic">Any (Default)</span>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    {mapping.qb_account_name}
                    {mapping.qb_account_number && (
                      <span className="text-muted-foreground ml-2">
                        #{mapping.qb_account_number}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{mapping.qb_account_type}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  {mapping.is_default ? (
                    <Star className="h-4 w-4 text-yellow-500 mx-auto fill-yellow-500" />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(mapping.id)}
                      disabled={setDefault.isPending}
                      className="h-8 w-8 p-0"
                    >
                      <Star className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteMapping(mapping.id)}
                    disabled={deleteMapping.isPending}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
