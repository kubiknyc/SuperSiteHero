/**
 * Procurement Statistics Cards
 *
 * Dashboard stat cards for procurement overview.
 */

import { Card, CardContent } from '@/components/ui/card';
import {
  ShoppingCart,
  DollarSign,
  Clock,
  Truck,
  CheckCircle,
  Building2,
} from 'lucide-react';
import type { ProcurementStats } from '@/types/procurement';

interface ProcurementStatsCardsProps {
  stats: ProcurementStats;
}

export function ProcurementStatsCards({ stats }: ProcurementStatsCardsProps) {
  const cards = [
    {
      label: 'Total POs',
      value: stats.total_pos,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Total Value',
      value: `$${stats.total_value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Awaiting Approval',
      value: stats.awaiting_approval,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      label: 'Pending Delivery',
      value: stats.pending_delivery,
      icon: Truck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Received',
      value: stats.by_status.received,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Vendors',
      value: stats.unique_vendors,
      icon: Building2,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
