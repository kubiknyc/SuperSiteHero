import { Input } from '@/components/ui/input'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'

interface Contact {
  id: string
  company_name: string | null
}

interface SiteInstructionFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  status: string
  onStatusChange: (value: string) => void
  priority: string
  onPriorityChange: (value: string) => void
  subcontractorId: string
  onSubcontractorChange: (value: string) => void
  contacts: Contact[]
}

export function SiteInstructionFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  subcontractorId,
  onSubcontractorChange,
  contacts,
}: SiteInstructionFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search instructions..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="issued">Issued</SelectItem>
          <SelectItem value="acknowledged">Acknowledged</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="verified">Verified</SelectItem>
          <SelectItem value="void">Void</SelectItem>
        </SelectContent>
      </Select>

      <Select value={priority} onValueChange={onPriorityChange}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priority</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
        </SelectContent>
      </Select>

      <Select value={subcontractorId} onValueChange={onSubcontractorChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Subcontractor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Subcontractors</SelectItem>
          {contacts.map((contact) => (
            <SelectItem key={contact.id} value={contact.id}>
              {contact.company_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
