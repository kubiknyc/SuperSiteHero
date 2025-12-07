import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, User, Building2, FileText } from 'lucide-react'
import { SiteInstructionStatusBadge } from './SiteInstructionStatusBadge'
import { SiteInstructionPriorityBadge } from './SiteInstructionPriorityBadge'
import type { SiteInstructionWithRelations } from '../hooks/useSiteInstructions'

interface SiteInstructionCardProps {
  instruction: SiteInstructionWithRelations
}

export function SiteInstructionCard({ instruction }: SiteInstructionCardProps) {
  const referenceNumber = instruction.reference_number || instruction.instruction_number || 'N/A'

  return (
    <Link to={`/site-instructions/${instruction.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <FileText className="h-4 w-4" />
                <span className="font-mono">{referenceNumber}</span>
              </div>
              <CardTitle className="text-base line-clamp-2">{instruction.title}</CardTitle>
            </div>
            <div className="flex flex-col items-end gap-1">
              <SiteInstructionStatusBadge status={instruction.status} />
              <SiteInstructionPriorityBadge priority={instruction.priority} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {instruction.description}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {instruction.subcontractor && (
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                <span>{instruction.subcontractor.company_name}</span>
              </div>
            )}
            {instruction.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Due: {format(new Date(instruction.due_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            {instruction.issued_by_user && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>By: {instruction.issued_by_user.full_name}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
