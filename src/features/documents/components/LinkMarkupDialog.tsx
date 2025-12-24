// File: /src/features/documents/components/LinkMarkupDialog.tsx
// Dialog for linking a markup to RFIs, tasks, or punch items

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Link2,
  FileQuestion,
  CheckSquare,
  AlertCircle,
  Search,
  X,
  ExternalLink,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export type LinkableItemType = 'rfi' | 'task' | 'punch_item'

export interface LinkableItem {
  id: string
  type: LinkableItemType
  title: string
  number?: string
  status?: string
}

interface LinkMarkupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  currentLink?: {
    id: string | null
    type: string | null
  }
  onLink: (itemId: string, itemType: LinkableItemType) => Promise<void>
  onUnlink: () => Promise<void>
}

const typeIcons: Record<LinkableItemType, React.ReactNode> = {
  rfi: <FileQuestion className="h-4 w-4" />,
  task: <CheckSquare className="h-4 w-4" />,
  punch_item: <AlertCircle className="h-4 w-4" />,
}

const typeLabels: Record<LinkableItemType, string> = {
  rfi: 'RFIs',
  task: 'Tasks',
  punch_item: 'Punch Items',
}

export function LinkMarkupDialog({
  open,
  onOpenChange,
  projectId,
  currentLink,
  onLink,
  onUnlink,
}: LinkMarkupDialogProps) {
  const [activeTab, setActiveTab] = useState<LinkableItemType>('rfi')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLinking, setIsLinking] = useState(false)

  // Fetch RFIs
  const { data: rfis = [] } = useQuery({
    queryKey: ['linkable-rfis', projectId],
    queryFn: async () => {
      // First get the RFI workflow type ID
      const workflowTypeResult = await supabase
        .from('workflow_types')
        .select('id')
        .eq('name', 'RFI')
        .single()

      if (workflowTypeResult.error || !workflowTypeResult.data?.id) {
        return []
      }

      const { data, error } = await supabase
        .from('workflow_items')
        .select('id, title, reference_number, status')
        .eq('project_id', projectId)
        .eq('workflow_type_id', workflowTypeResult.data.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {throw error}
      return (data || []).map(item => ({
        id: item.id,
        type: 'rfi' as LinkableItemType,
        title: item.title || 'Untitled',
        number: item.reference_number || undefined,
        status: item.status || undefined,
      }))
    },
    enabled: open && activeTab === 'rfi',
  })

  // Fetch Tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['linkable-tasks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, status')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {throw error}
      return (data || []).map(item => ({
        id: item.id,
        type: 'task' as LinkableItemType,
        title: item.title || 'Untitled',
        status: item.status || undefined,
      }))
    },
    enabled: open && activeTab === 'task',
  })

  // Fetch Punch Items
  const { data: punchItems = [] } = useQuery({
    queryKey: ['linkable-punch-items', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('punch_items')
        .select('id, title, status')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {throw error}
      return (data || []).map((item: any) => ({
        id: item.id,
        type: 'punch_item' as LinkableItemType,
        title: item.title || 'Untitled',
        number: undefined,
        status: item.status || undefined,
      }))
    },
    enabled: open && activeTab === 'punch_item',
  })

  const getItems = (): LinkableItem[] => {
    switch (activeTab) {
      case 'rfi':
        return rfis
      case 'task':
        return tasks
      case 'punch_item':
        return punchItems
      default:
        return []
    }
  }

  const filteredItems = getItems().filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.number?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleLink = async (item: LinkableItem) => {
    setIsLinking(true)
    try {
      await onLink(item.id, item.type)
      toast.success(`Linked to ${typeLabels[item.type].slice(0, -1)}`)
      onOpenChange(false)
    } catch {
      toast.error('Failed to link markup')
    } finally {
      setIsLinking(false)
    }
  }

  const handleUnlink = async () => {
    setIsLinking(true)
    try {
      await onUnlink()
      toast.success('Link removed')
      onOpenChange(false)
    } catch {
      toast.error('Failed to remove link')
    } finally {
      setIsLinking(false)
    }
  }

  const isLinked = currentLink?.id && currentLink?.type

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Markup to Item
          </DialogTitle>
        </DialogHeader>

        {isLinked && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {typeIcons[currentLink.type as LinkableItemType]}
              <span className="text-sm">
                Currently linked to {currentLink.type?.replace('_', ' ')}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnlink}
              disabled={isLinking}
            >
              <X className="h-4 w-4 mr-1" />
              Unlink
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as LinkableItemType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rfi" className="flex items-center gap-1">
              {typeIcons.rfi}
              RFIs
            </TabsTrigger>
            <TabsTrigger value="task" className="flex items-center gap-1">
              {typeIcons.task}
              Tasks
            </TabsTrigger>
            <TabsTrigger value="punch_item" className="flex items-center gap-1">
              {typeIcons.punch_item}
              Punch
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-disabled" />
              <Input
                placeholder={`Search ${typeLabels[activeTab].toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <TabsContent value="rfi" className="mt-4">
            <ItemList
              items={filteredItems}
              onSelect={handleLink}
              isLinking={isLinking}
              currentLinkId={currentLink?.id}
            />
          </TabsContent>
          <TabsContent value="task" className="mt-4">
            <ItemList
              items={filteredItems}
              onSelect={handleLink}
              isLinking={isLinking}
              currentLinkId={currentLink?.id}
            />
          </TabsContent>
          <TabsContent value="punch_item" className="mt-4">
            <ItemList
              items={filteredItems}
              onSelect={handleLink}
              isLinking={isLinking}
              currentLinkId={currentLink?.id}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ItemListProps {
  items: LinkableItem[]
  onSelect: (item: LinkableItem) => void
  isLinking: boolean
  currentLinkId?: string | null
}

function ItemList({ items, onSelect, isLinking, currentLinkId }: ItemListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        <p>No items found</p>
      </div>
    )
  }

  return (
    <div className="max-h-64 overflow-y-auto space-y-1">
      {items.map(item => (
        <div
          key={item.id}
          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
            item.id === currentLinkId
              ? 'bg-blue-50 border-blue-300'
              : 'hover:bg-surface border-border'
          }`}
          onClick={() => !isLinking && onSelect(item)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {item.number && (
                <span className="text-sm font-mono text-muted">
                  #{item.number}
                </span>
              )}
              <span className="text-sm font-medium truncate">{item.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {item.status && (
              <Badge variant="outline" className="text-xs">
                {item.status}
              </Badge>
            )}
            {item.id === currentLinkId ? (
              <Badge variant="default" className="text-xs">
                Linked
              </Badge>
            ) : (
              <ExternalLink className="h-4 w-4 text-disabled" />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default LinkMarkupDialog
