// File: /src/features/contacts/components/ContactCard.tsx
// Contact card component for displaying contact information

import { Phone, Mail, MapPin, Building2, Briefcase, Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Contact = Database['public']['Tables']['contacts']['Row']

export interface ContactCardProps {
  contact: Contact
  onClick?: () => void
  className?: string
}

const contactTypeColors: Record<string, string> = {
  subcontractor: 'bg-info-light text-blue-800',
  architect: 'bg-purple-100 text-purple-800',
  engineer: 'bg-success-light text-green-800',
  inspector: 'bg-orange-100 text-orange-800',
  supplier: 'bg-warning-light text-yellow-800',
  owner: 'bg-error-light text-red-800',
  consultant: 'bg-indigo-100 text-indigo-800',
  other: 'bg-muted text-foreground',
}

export function ContactCard({ contact, onClick, className }: ContactCardProps) {
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ')
  const displayName = fullName || contact.company_name || 'Unnamed Contact'

  return (
    <Card
      className={cn(
        'hover:shadow-md transition-shadow',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with name and badges */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate heading-subsection">{displayName}</h3>
              {contact.title && (
                <p className="text-sm text-secondary truncate">{contact.title}</p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {contact.is_primary && (
                <Star className="h-4 w-4 text-warning fill-yellow-500" aria-label="Primary Contact" />
              )}
              {contact.is_emergency_contact && (
                <Badge variant="destructive" className="text-xs">
                  Emergency
                </Badge>
              )}
            </div>
          </div>

          {/* Contact Type and Trade */}
          <div className="flex flex-wrap gap-2">
            <Badge
              className={cn(
                'text-xs capitalize',
                contactTypeColors[contact.contact_type] || contactTypeColors.other
              )}
            >
              {contact.contact_type}
            </Badge>
            {contact.trade && (
              <Badge variant="outline" className="text-xs">
                <Briefcase className="h-3 w-3 mr-1" />
                {contact.trade}
              </Badge>
            )}
          </div>

          {/* Company Name */}
          {contact.company_name && fullName && (
            <div className="flex items-center gap-2 text-sm text-secondary">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{contact.company_name}</span>
            </div>
          )}

          {/* Phone Numbers */}
          <div className="space-y-1">
            {contact.phone_mobile && (
              <a
                href={`tel:${contact.phone_mobile}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>{contact.phone_mobile}</span>
                <Badge variant="outline" className="text-xs">
                  Mobile
                </Badge>
              </a>
            )}
            {contact.phone_office && (
              <a
                href={`tel:${contact.phone_office}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>{contact.phone_office}</span>
                <Badge variant="outline" className="text-xs">
                  Office
                </Badge>
              </a>
            )}
            {contact.phone_fax && (
              <div className="flex items-center gap-2 text-sm text-secondary">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>{contact.phone_fax}</span>
                <Badge variant="outline" className="text-xs">
                  Fax
                </Badge>
              </div>
            )}
          </div>

          {/* Email */}
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{contact.email}</span>
            </a>
          )}

          {/* Address */}
          {(contact.address || contact.city || contact.state) && (
            <div className="flex items-start gap-2 text-sm text-secondary">
              <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 truncate">
                {contact.address && <div>{contact.address}</div>}
                {(contact.city || contact.state || contact.zip) && (
                  <div>
                    {[contact.city, contact.state, contact.zip].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <p className="text-sm text-secondary italic border-t pt-2 truncate">
              {contact.notes}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
