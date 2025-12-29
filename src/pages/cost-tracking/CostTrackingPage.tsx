/**
 * Cost Tracking Page
 * Main dashboard for project cost management with budgets, transactions, and division summaries
 */

import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DollarSign,
  Plus,
  Search,
  Receipt,
  BarChart3,
  RefreshCw,
  Activity,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import {
  useProjectBudgets,
  useProjectBudgetTotals,
  useBudgetByDivision,
  useCostTransactions,
  useCreateProjectBudget,
  useUpdateProjectBudget,
  useDeleteProjectBudget,
  useCreateCostTransaction,
  useUpdateCostTransaction,
  useDeleteCostTransaction,
} from '@/features/cost-tracking/hooks/useCostTracking'
import { BudgetSummaryCards } from '@/features/cost-tracking/components/BudgetSummaryCards'
import { BudgetTable } from '@/features/cost-tracking/components/BudgetTable'
import { BudgetLineForm } from '@/features/cost-tracking/components/BudgetLineForm'
import { TransactionTable } from '@/features/cost-tracking/components/TransactionTable'
import { TransactionForm } from '@/features/cost-tracking/components/TransactionForm'
import { DivisionSummaryChart } from '@/features/cost-tracking/components/DivisionSummaryChart'
import { EVMDashboard } from '@/features/cost-tracking/components/evm/EVMDashboard'
import { BudgetVarianceAlerts } from '@/features/cost-tracking/components/BudgetVarianceAlerts'
import type {
  ProjectBudgetWithDetails,
  CostTransactionWithDetails,
  CreateProjectBudgetDTO,
  UpdateProjectBudgetDTO,
  CreateCostTransactionDTO,
  UpdateCostTransactionDTO,
  TransactionType,
} from '@/types/cost-tracking'

export function CostTrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const projectId = searchParams.get('project') || ''
  const activeTab = searchParams.get('tab') || 'budgets'
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id || ''

  // Search and filters
  const [budgetSearch, setBudgetSearch] = useState('')
  const [transactionSearch, setTransactionSearch] = useState('')
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<TransactionType | 'all'>('all')

  // Form states
  const [budgetFormOpen, setBudgetFormOpen] = useState(false)
  const [transactionFormOpen, setTransactionFormOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<ProjectBudgetWithDetails | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<CostTransactionWithDetails | null>(null)

  // Data queries
  const { data: projects } = useMyProjects()
  const { data: budgets, isLoading: budgetsLoading, refetch: refetchBudgets } = useProjectBudgets(
    projectId ? { projectId } : { projectId: '' }
  )
  const { data: budgetTotals, isLoading: totalsLoading } = useProjectBudgetTotals(projectId || undefined)
  const { data: divisionSummary, isLoading: divisionsLoading } = useBudgetByDivision(projectId || undefined)
  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = useCostTransactions(
    projectId ? { projectId, transactionType: transactionTypeFilter !== 'all' ? transactionTypeFilter : undefined } : { projectId: '' }
  )

  // Mutations
  const createBudget = useCreateProjectBudget()
  const updateBudget = useUpdateProjectBudget()
  const deleteBudget = useDeleteProjectBudget()
  const createTransaction = useCreateCostTransaction()
  const updateTransaction = useUpdateCostTransaction()
  const deleteTransaction = useDeleteCostTransaction()

  // Handle project change
  const handleProjectChange = (newProjectId: string) => {
    const params = new URLSearchParams(searchParams)
    if (newProjectId) {
      params.set('project', newProjectId)
    } else {
      params.delete('project')
    }
    setSearchParams(params)
  }

  // Handle tab change
  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('tab', tab)
    setSearchParams(params)
  }

  // Filter budgets
  const filteredBudgets = useMemo(() => {
    if (!budgets) {return []}
    if (!budgetSearch) {return budgets}

    const searchLower = budgetSearch.toLowerCase()
    return budgets.filter(b =>
      b.cost_code?.toLowerCase().includes(searchLower) ||
      b.cost_code_name?.toLowerCase().includes(searchLower) ||
      b.division?.toLowerCase().includes(searchLower)
    )
  }, [budgets, budgetSearch])

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) {return []}
    if (!transactionSearch) {return transactions}

    const searchLower = transactionSearch.toLowerCase()
    return transactions.filter(t =>
      t.description?.toLowerCase().includes(searchLower) ||
      t.cost_code?.code?.toLowerCase().includes(searchLower) ||
      t.cost_code?.name?.toLowerCase().includes(searchLower) ||
      t.vendor_name?.toLowerCase().includes(searchLower) ||
      t.invoice_number?.toLowerCase().includes(searchLower)
    )
  }, [transactions, transactionSearch])

  // Budget form handlers
  const handleCreateBudget = () => {
    setEditingBudget(null)
    setBudgetFormOpen(true)
  }

  const handleEditBudget = (budget: ProjectBudgetWithDetails) => {
    setEditingBudget(budget)
    setBudgetFormOpen(true)
  }

  const handleBudgetSubmit = (data: CreateProjectBudgetDTO | UpdateProjectBudgetDTO) => {
    if (editingBudget) {
      updateBudget.mutate(
        { id: editingBudget.id, dto: data as UpdateProjectBudgetDTO },
        {
          onSuccess: () => {
            setBudgetFormOpen(false)
            setEditingBudget(null)
          },
        }
      )
    } else {
      createBudget.mutate(data as CreateProjectBudgetDTO, {
        onSuccess: () => {
          setBudgetFormOpen(false)
        },
      })
    }
  }

  const handleDeleteBudget = (id: string) => {
    deleteBudget.mutate(id)
  }

  // Transaction form handlers
  const handleCreateTransaction = () => {
    setEditingTransaction(null)
    setTransactionFormOpen(true)
  }

  const handleEditTransaction = (transaction: CostTransactionWithDetails) => {
    setEditingTransaction(transaction)
    setTransactionFormOpen(true)
  }

  const handleTransactionSubmit = (data: CreateCostTransactionDTO | UpdateCostTransactionDTO) => {
    if (editingTransaction) {
      updateTransaction.mutate(
        { id: editingTransaction.id, dto: data as UpdateCostTransactionDTO },
        {
          onSuccess: () => {
            setTransactionFormOpen(false)
            setEditingTransaction(null)
          },
        }
      )
    } else {
      createTransaction.mutate(data as CreateCostTransactionDTO, {
        onSuccess: () => {
          setTransactionFormOpen(false)
        },
      })
    }
  }

  const handleDeleteTransaction = (id: string) => {
    deleteTransaction.mutate(id)
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 heading-page">
              <DollarSign className="h-6 w-6" />
              Cost Tracking
            </h1>
            <p className="text-muted mt-1">
              Manage project budgets, track costs, and analyze spending by division
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="border rounded-md px-3 py-2 text-sm min-w-[200px]"
              value={projectId}
              onChange={(e) => handleProjectChange(e.target.value)}
            >
              <option value="">Select a project...</option>
              {projects?.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                refetchBudgets()
                refetchTransactions()
              }}
              title="Refresh data"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Budget Summary Cards */}
        {projectId && (
          <BudgetSummaryCards totals={budgetTotals} isLoading={totalsLoading} />
        )}

        {/* Budget Variance Alerts */}
        {projectId && (
          <BudgetVarianceAlerts
            projectId={projectId}
            onAlertClick={(alert) => {
              // Navigate to budget line if available
              if (alert.budget_id) {
                handleTabChange('budgets')
                setBudgetSearch(alert.cost_code || '')
              }
            }}
          />
        )}

        {/* Main Content */}
        {!projectId ? (
          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary heading-subsection">Select a Project</h3>
              <p className="text-muted mt-1">
                Choose a project from the dropdown above to view and manage costs
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="budgets" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Budgets
              </TabsTrigger>
              <TabsTrigger value="transactions" className="gap-2">
                <Receipt className="h-4 w-4" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="divisions" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                By Division
              </TabsTrigger>
              <TabsTrigger value="evm" className="gap-2">
                <Activity className="h-4 w-4" />
                EVM Analysis
              </TabsTrigger>
            </TabsList>

            {/* Budgets Tab */}
            <TabsContent value="budgets">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Budget Lines</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
                      <Input
                        placeholder="Search cost codes..."
                        className="pl-9 w-64"
                        value={budgetSearch}
                        onChange={(e) => setBudgetSearch(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleCreateBudget} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Budget Line
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <BudgetTable
                    budgets={filteredBudgets}
                    isLoading={budgetsLoading}
                    onEdit={handleEditBudget}
                    onDelete={handleDeleteBudget}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Cost Transactions</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
                      <Input
                        placeholder="Search transactions..."
                        className="pl-9 w-64"
                        value={transactionSearch}
                        onChange={(e) => setTransactionSearch(e.target.value)}
                      />
                    </div>
                    <select
                      className="border rounded-md px-3 py-2 text-sm"
                      value={transactionTypeFilter}
                      onChange={(e) => setTransactionTypeFilter(e.target.value as TransactionType | 'all')}
                    >
                      <option value="all">All Types</option>
                      <option value="commitment">Commitments</option>
                      <option value="actual">Actuals</option>
                      <option value="adjustment">Adjustments</option>
                      <option value="forecast">Forecasts</option>
                    </select>
                    <Button onClick={handleCreateTransaction} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Transaction
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <TransactionTable
                    transactions={filteredTransactions}
                    isLoading={transactionsLoading}
                    onEdit={handleEditTransaction}
                    onDelete={handleDeleteTransaction}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Division Summary Tab */}
            <TabsContent value="divisions">
              <Card>
                <CardHeader>
                  <CardTitle>Budget by CSI Division</CardTitle>
                </CardHeader>
                <CardContent>
                  <DivisionSummaryChart
                    divisions={divisionSummary || []}
                    isLoading={divisionsLoading}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* EVM Analysis Tab */}
            <TabsContent value="evm">
              <EVMDashboard
                projectId={projectId}
                companyId={companyId}
                projectName={projects?.find(p => p.id === projectId)?.name}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* Budget Form Modal */}
        <BudgetLineForm
          open={budgetFormOpen}
          onClose={() => {
            setBudgetFormOpen(false)
            setEditingBudget(null)
          }}
          onSubmit={handleBudgetSubmit}
          budget={editingBudget}
          projectId={projectId}
          companyId={companyId}
          isSubmitting={createBudget.isPending || updateBudget.isPending}
        />

        {/* Transaction Form Modal */}
        <TransactionForm
          open={transactionFormOpen}
          onClose={() => {
            setTransactionFormOpen(false)
            setEditingTransaction(null)
          }}
          onSubmit={handleTransactionSubmit}
          transaction={editingTransaction}
          projectId={projectId}
          companyId={companyId}
          isSubmitting={createTransaction.isPending || updateTransaction.isPending}
        />
      </div>
    </AppLayout>
  )
}

export default CostTrackingPage
