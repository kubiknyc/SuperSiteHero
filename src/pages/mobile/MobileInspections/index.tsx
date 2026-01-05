/**
 * Mobile Inspections Pages
 *
 * Touch-optimized inspection management for field workers.
 */

import { memo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus,
  ChevronRight,
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  User,
} from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { cn } from '../../../lib/utils';

// List view for inspections
export const MobileInspectionsList = memo(function MobileInspectionsList() {
  const navigate = useNavigate();

  // Mock data
  const inspections = [
    {
      id: '1',
      title: 'Electrical Rough-In',
      type: 'electrical',
      status: 'passed',
      date: '2024-01-15',
      inspector: 'Mike Johnson',
      location: 'Building A, Floor 2',
    },
    {
      id: '2',
      title: 'Fire Safety',
      type: 'safety',
      status: 'pending',
      date: '2024-01-18',
      inspector: 'City Inspector',
      location: 'Building B',
    },
    {
      id: '3',
      title: 'Plumbing Pressure Test',
      type: 'plumbing',
      status: 'failed',
      date: '2024-01-14',
      inspector: 'Sarah Williams',
      location: 'Building A, Floor 1',
    },
    {
      id: '4',
      title: 'Structural Framing',
      type: 'structural',
      status: 'scheduled',
      date: '2024-01-20',
      inspector: 'City Inspector',
      location: 'Building C',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Calendar className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      passed: 'default',
      failed: 'destructive',
      pending: 'secondary',
      scheduled: 'outline',
    };
    return variants[status] || 'secondary';
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Inspections</h1>
        <Button onClick={() => navigate('/inspections/new')} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Schedule
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-2 bg-blue-500/10 rounded-lg text-center">
          <p className="text-lg font-bold text-blue-500">3</p>
          <p className="text-xs text-muted-foreground">Scheduled</p>
        </div>
        <div className="p-2 bg-yellow-500/10 rounded-lg text-center">
          <p className="text-lg font-bold text-yellow-500">2</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="p-2 bg-green-500/10 rounded-lg text-center">
          <p className="text-lg font-bold text-green-500">15</p>
          <p className="text-xs text-muted-foreground">Passed</p>
        </div>
        <div className="p-2 bg-red-500/10 rounded-lg text-center">
          <p className="text-lg font-bold text-red-500">1</p>
          <p className="text-xs text-muted-foreground">Failed</p>
        </div>
      </div>

      {/* Search */}
      <Input placeholder="Search inspections..." />

      {/* Inspections list */}
      <div className="space-y-3">
        {inspections.map((inspection) => (
          <Card
            key={inspection.id}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate(`/inspections/${inspection.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {getStatusIcon(inspection.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-foreground truncate">{inspection.title}</p>
                    <Badge variant={getStatusBadge(inspection.status)}>
                      {inspection.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{inspection.location}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {inspection.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {inspection.inspector}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

// Form for scheduling inspections
export const MobileInspectionForm = memo(function MobileInspectionForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    title: '',
    type: '',
    location: '',
    date: '',
    time: '',
    inspector: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/inspections');
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-foreground">
        {isEditing ? 'Edit Inspection' : 'Schedule Inspection'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Inspection Title</Label>
          <Input
            id="title"
            placeholder="e.g., Electrical Rough-In"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="h-12"
          />
        </div>

        {/* Type */}
        <div className="space-y-2">
          <Label>Inspection Type</Label>
          <Select
            value={formData.type}
            onValueChange={(v) => setFormData({ ...formData, type: v })}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="electrical">Electrical</SelectItem>
              <SelectItem value="plumbing">Plumbing</SelectItem>
              <SelectItem value="structural">Structural</SelectItem>
              <SelectItem value="safety">Fire Safety</SelectItem>
              <SelectItem value="mechanical">Mechanical</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="e.g., Building A, Floor 2"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="h-12"
          />
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="h-12"
            />
          </div>
        </div>

        {/* Inspector */}
        <div className="space-y-2">
          <Label htmlFor="inspector">Inspector</Label>
          <Input
            id="inspector"
            placeholder="Inspector name"
            value={formData.inspector}
            onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
            className="h-12"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Any additional notes..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            {isEditing ? 'Save Changes' : 'Schedule'}
          </Button>
        </div>
      </form>
    </div>
  );
});

// Detail view for an inspection
export const MobileInspectionDetail = memo(function MobileInspectionDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Mock data
  const inspection = {
    id: '1',
    title: 'Electrical Rough-In',
    type: 'electrical',
    status: 'passed',
    date: '2024-01-15',
    time: '10:00 AM',
    inspector: 'Mike Johnson',
    location: 'Building A, Floor 2',
    notes: 'All circuits tested and verified. No issues found.',
    checklist: [
      { item: 'Wire gauge verification', passed: true },
      { item: 'Box fill calculations', passed: true },
      { item: 'Grounding continuity', passed: true },
      { item: 'Circuit identification', passed: true },
    ],
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline">{inspection.type}</Badge>
          <Badge variant={inspection.status === 'passed' ? 'default' : 'destructive'}>
            {inspection.status}
          </Badge>
        </div>
        <h1 className="text-xl font-bold text-foreground">{inspection.title}</h1>
      </div>

      {/* Details */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Location</span>
            <span className="font-medium">{inspection.location}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium">{inspection.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time</span>
            <span className="font-medium">{inspection.time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Inspector</span>
            <span className="font-medium">{inspection.inspector}</span>
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardContent className="p-4">
          <Label className="text-muted-foreground text-xs uppercase mb-3 block">
            Inspection Checklist
          </Label>
          <div className="space-y-2">
            {inspection.checklist.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                {item.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">{item.item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {inspection.notes && (
        <Card>
          <CardContent className="p-4">
            <Label className="text-muted-foreground text-xs uppercase mb-2 block">Notes</Label>
            <p className="text-foreground">{inspection.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => navigate(`/inspections/${id}/edit`)}
        >
          Edit
        </Button>
        <Button variant="outline" className="flex-1">
          Add Photos
        </Button>
      </div>
    </div>
  );
});

export default MobileInspectionsList;
