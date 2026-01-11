/**
 * Punch List Escalation Panel Component
 *
 * Displays overdue punch items with escalation status and provides
 * batch escalation functionality with smooth Framer Motion animations.
 */

import { useState, useMemo } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import {
  AlertTriangle,
  AlertOctagon,
  Clock,
  User,
  Building2,
  ArrowUp,
  Bell,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
  UserPlus,
  Mail,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select } from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import {
  useOverduePunchItems,
  useEscalationStats,
  useBatchEscalatePunchItems,
  useRecordPunchListReminder,
  getEscalationLevelInfo,
  DEFAULT_ESCALATION_CONFIG,
  type EscalationLevel,
  type OverduePunchItem,
} from '../hooks/usePunchListEscalation'

// ============================================================================
// Types
// ============================================================================

interface PunchListEscalationPanelProps {
  projectId: string
  maxHeight?: string
  showSubcontractorBreakdown?: boolean
  onItemClick?: (punchItemId: string) => void
}

interface EscalationItemProps {
  item: OverduePunchItem
  isSelected: boolean
  onSelect: (selected: boolean) => void
  onSendReminder: () => void
  onClick?: () => void
  isReminderPending: boolean
}

// ============================================================================
// Sub-Components
// ============================================================================

function EscalationLevelBadge({ level }: { level: EscalationLevel }) {
  const info = getEscalationLevelInfo(level)

  const Icon = level === 'critical' ? AlertOctagon : level === 'urgent' ? AlertTriangle : Clock

  return (
    <Badge
      variant="outline"
      className={cn('gap-1', info.bgColor, info.color, info.borderColor)}
    >
      <Icon className="h-3 w-3" />
      {info.label}
    </Badge>
  )
}

function EscalationItem({
  item,
  isSelected,
  onSelect,
  onSendReminder,
  onClick,
  isReminderPending,
}: EscalationItemProps) {
  const levelInfo = getEscalationLevelInfo(item.escalationLevel)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
      whileHover={{ scale: 1.01, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
      className={cn(
        'p-4 rounded-lg border transition-colors',
        levelInfo.bgColor,
        levelInfo.borderColor
      )}
    >
      <div className="flex items-start gap-3">
        <motion.div
          whileTap={{ scale: 0.9 }}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(checked === true)}
            className="mt-1"
          />
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <motion.div
              className={cn('flex-1 cursor-pointer', onClick && 'hover:underline')}
              onClick={onClick}
              whileHover={{ x: 2 }}
            >
              <div className="font-medium text-sm truncate">{item.title}</div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                {item.number && <span>#{item.number}</span>}
                {item.location && <span>{item.location}</span>}
              </div>
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.1 }}
            >
              <EscalationLevelBadge level={item.escalationLevel} />
            </motion.div>
          </div>

          <motion.div
            className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {item.assigneeName && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{item.assigneeName}</span>
              </div>
            )}
            {item.subcontractorName && (
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                <span>{item.subcontractorName}</span>
              </div>
            )}
            <motion.div
              className={cn('flex items-center gap-1 font-medium', levelInfo.color)}
              animate={{
                scale: item.escalationLevel === 'critical' ? [1, 1.05, 1] : 1
              }}
              transition={{ repeat: item.escalationLevel === 'critical' ? Infinity : 0, duration: 2 }}
            >
              <Clock className="h-3 w-3" />
              <span>{item.daysOverdue} days overdue</span>
            </motion.div>
          </motion.div>

          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Due: {item.due_date ? format(new Date(item.due_date), 'MMM d, yyyy') : 'No due date'}
            </div>
            <div className="flex items-center gap-1">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={onSendReminder}
                  disabled={isReminderPending}
                >
                  {isReminderPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Bell className="h-3 w-3" />
                  )}
                  Send Reminder
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function SubcontractorBreakdown({
  stats,
}: {
  stats: ReturnType<typeof useEscalationStats>
}) {
  const [isOpen, setIsOpen] = useState(false)

  if (!stats.bySubcontractor.length) {return null}

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between h-auto py-2">
          <span className="text-sm font-medium">By Subcontractor</span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pt-2">
        {stats.bySubcontractor.map((sub) => (
          <div
            key={sub.subcontractorId}
            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{sub.subcontractorName}</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs">
                {sub.count} items
              </Badge>
              <span className="text-xs text-muted-foreground">
                Avg: {Math.round(sub.averageDaysOverdue)} days
              </span>
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function PunchListEscalationPanel({
  projectId,
  maxHeight = '600px',
  showSubcontractorBreakdown = true,
  onItemClick,
}: PunchListEscalationPanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterLevel, setFilterLevel] = useState<EscalationLevel | 'all'>('all')
  const [reminderPending, setReminderPending] = useState<string | null>(null)

  const { data: overdueItems, isLoading, error, refetch } = useOverduePunchItems(
    projectId,
    DEFAULT_ESCALATION_CONFIG
  )
  const stats = useEscalationStats(projectId, DEFAULT_ESCALATION_CONFIG)
  const batchEscalate = useBatchEscalatePunchItems()
  const recordReminder = useRecordPunchListReminder()

  // Filter items by escalation level
  const filteredItems = useMemo(() => {
    if (!overdueItems) {return []}
    if (filterLevel === 'all') {return overdueItems}
    return overdueItems.filter((item) => item.escalationLevel === filterLevel)
  }, [overdueItems, filterLevel])

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectItem = (itemId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(itemId)
      } else {
        next.delete(itemId)
      }
      return next
    })
  }

  const handleBatchEscalate = async () => {
    const itemsToEscalate = filteredItems
      .filter((item) => selectedIds.has(item.id))
      .map((item) => ({
        punchItemId: item.id,
        escalationLevel: item.escalationLevel,
      }))

    try {
      await batchEscalate.mutateAsync(itemsToEscalate)
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Failed to batch escalate:', error)
    }
  }

  const handleSendReminder = async (item: OverduePunchItem) => {
    if (!item.assigned_to) {return}

    setReminderPending(item.id)
    try {
      await recordReminder.mutateAsync({
        punchItemId: item.id,
        recipientId: item.assigned_to,
        reminderType: 'in_app',
      })
    } catch (error) {
      console.error('Failed to send reminder:', error)
    } finally {
      setReminderPending(null)
    }
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-error">
          Failed to load overdue punch items. Please try again.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Overdue Punch Items
            </CardTitle>
            <CardDescription>
              {stats.total} item{stats.total !== 1 ? 's' : ''} overdue
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary with staggered animations */}
        <motion.div
          className="grid grid-cols-4 gap-2"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1 } }
          }}
        >
          <motion.div
            className="text-center p-2 rounded-lg bg-muted/50"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
            whileHover={{ scale: 1.05 }}
          >
            <motion.div
              className="text-2xl font-bold"
              key={stats.total}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {stats.total}
            </motion.div>
            <div className="text-xs text-muted-foreground">Total</div>
          </motion.div>
          <motion.div
            className="text-center p-2 rounded-lg bg-red-50 border border-red-200"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
            whileHover={{ scale: 1.05 }}
          >
            <motion.div
              className="text-2xl font-bold text-red-700"
              key={stats.critical}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {stats.critical}
            </motion.div>
            <div className="text-xs text-red-600">Critical</div>
          </motion.div>
          <motion.div
            className="text-center p-2 rounded-lg bg-orange-50 border border-orange-200"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
            whileHover={{ scale: 1.05 }}
          >
            <motion.div
              className="text-2xl font-bold text-orange-700"
              key={stats.urgent}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {stats.urgent}
            </motion.div>
            <div className="text-xs text-orange-600">Urgent</div>
          </motion.div>
          <motion.div
            className="text-center p-2 rounded-lg bg-yellow-50 border border-yellow-200"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
            whileHover={{ scale: 1.05 }}
          >
            <motion.div
              className="text-2xl font-bold text-yellow-700"
              key={stats.warning}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {stats.warning}
            </motion.div>
            <div className="text-xs text-yellow-600">Warning</div>
          </motion.div>
        </motion.div>

        {/* Average Days Overdue with animated counter */}
        <motion.div
          className="p-3 rounded-lg bg-muted/30 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <TrendingUp className="h-4 w-4" />
            Average Days Overdue
          </div>
          <motion.div
            className="text-xl font-bold"
            key={stats.averageDaysOverdue}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {Math.round(stats.averageDaysOverdue)} days
          </motion.div>
        </motion.div>

        {/* Subcontractor Breakdown */}
        {showSubcontractorBreakdown && <SubcontractorBreakdown stats={stats} />}

        {/* Filter and Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
              onCheckedChange={(checked) => handleSelectAll(checked === true)}
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as EscalationLevel | 'all')}
              className="w-[140px] h-8 text-sm"
            >
              <option value="all">All Levels</option>
              <option value="critical">Critical</option>
              <option value="urgent">Urgent</option>
              <option value="warning">Warning</option>
            </Select>
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 20 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={handleBatchEscalate}
                    disabled={batchEscalate.isPending}
                  >
                    {batchEscalate.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                    Escalate ({selectedIds.size})
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Items List with layout animations */}
        <LayoutGroup>
          {isLoading ? (
            <motion.div
              className="flex items-center justify-center py-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </motion.div>
          ) : filteredItems.length === 0 ? (
            <motion.div
              className="text-center py-8 text-muted-foreground"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, delay: 0.1 }}
              >
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                No overdue punch items!
              </motion.p>
              <motion.p
                className="text-sm mt-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                All items are within their due dates.
              </motion.p>
            </motion.div>
          ) : (
            <ScrollArea style={{ maxHeight }} className="pr-4">
              <motion.div
                className="space-y-2"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.05 } }
                }}
              >
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item, index) => (
                    <EscalationItem
                      key={item.id}
                      item={item}
                      isSelected={selectedIds.has(item.id)}
                      onSelect={(selected) => handleSelectItem(item.id, selected)}
                      onSendReminder={() => handleSendReminder(item)}
                      onClick={onItemClick ? () => onItemClick(item.id) : undefined}
                      isReminderPending={reminderPending === item.id}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            </ScrollArea>
          )}
        </LayoutGroup>
      </CardContent>
    </Card>
  )
}

export default PunchListEscalationPanel
