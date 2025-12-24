// @ts-nocheck
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Truck,
  Plus,
  Search,
  Filter,
  Wrench,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
} from 'lucide-react'
import { useEquipment, useEquipmentStatistics } from '@/features/equipment/hooks/useEquipment'
import {
  getEquipmentStatusColor,
  getEquipmentStatusLabel,
  getEquipmentTypeLabel,
} from '@/types/equipment'

export function EquipmentPage() {
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('project') || undefined
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const { data: equipment, isLoading } = useEquipment({
    status: statusFilter || undefined,
    search: search || undefined,
  })
  const { data: projects } = useProjectsList()
  const { data: stats } = useEquipmentStatistics()

  // Filter equipment by search
  const filteredEquipment = equipment?.filter(eq => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        eq.name.toLowerCase().includes(searchLower) ||
        eq.equipment_id?.toLowerCase().includes(searchLower) ||
        eq.serial_number?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" className="heading-page">
              <Truck className="h-6 w-6" />
              Equipment
            </h1>
            <p className="text-muted mt-1">
              Manage equipment, assignments, and maintenance
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Equipment
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-info-light rounded-lg">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted">Total Equipment</p>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success-light rounded-lg">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted">Available</p>
                  <p className="text-2xl font-bold">{stats?.available || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-info-light rounded-lg">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted">In Use</p>
                  <p className="text-2xl font-bold">{stats?.in_use || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning-light rounded-lg">
                  <Wrench className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted">In Maintenance</p>
                  <p className="text-2xl font-bold">{stats?.maintenance || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
            <Input
              placeholder="Search equipment..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="in_use">In Use</option>
            <option value="maintenance">Maintenance</option>
            <option value="out_of_service">Out of Service</option>
          </select>
        </div>

        {/* Equipment List */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted">Loading equipment...</div>
            ) : filteredEquipment?.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-muted">No equipment found</p>
                <p className="text-sm text-disabled">Add equipment to get started</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredEquipment?.map((eq) => (
                  <div
                    key={eq.id}
                    className="py-4 flex items-center justify-between hover:bg-surface px-2 -mx-2 rounded cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        <Truck className="h-6 w-6 text-secondary" />
                      </div>
                      <div>
                        <h3 className="font-medium" className="heading-subsection">{eq.name}</h3>
                        <p className="text-sm text-muted">
                          {eq.equipment_id && `ID: ${eq.equipment_id}`}
                          {eq.equipment_id && eq.serial_number && ' | '}
                          {eq.serial_number && `S/N: ${eq.serial_number}`}
                        </p>
                        <p className="text-sm text-disabled">
                          {getEquipmentTypeLabel(eq.equipment_type)}
                          {eq.make && ` - ${eq.make}`}
                          {eq.model && ` ${eq.model}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted">
                          {eq.current_hours?.toLocaleString() || 0} hours
                        </p>
                        {eq.hourly_rate && (
                          <p className="text-xs text-disabled">
                            ${eq.hourly_rate}/hr
                          </p>
                        )}
                      </div>
                      <Badge className={getEquipmentStatusColor(eq.status)}>
                        {getEquipmentStatusLabel(eq.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

export default EquipmentPage
