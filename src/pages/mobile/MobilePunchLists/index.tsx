/**
 * Mobile Punch Lists Pages
 *
 * Touch-optimized punch list management for field workers.
 */

import { memo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus,
  ChevronRight,
  MapPin,
  Camera,
  CheckCircle2,
  Circle,
  AlertCircle,
  Filter,
  Search,
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

// List view for punch items
export const MobilePunchListsList = memo(function MobilePunchListsList() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'open' | 'completed'>('all');

  // Mock data
  const punchItems = [
    {
      id: '1',
      number: 'PI-001',
      title: 'Paint touch-up required',
      location: 'Room 204, 2nd Floor',
      status: 'open',
      priority: 'high',
      assignee: 'ABC Painting',
      dueDate: '2024-01-20',
    },
    {
      id: '2',
      number: 'PI-002',
      title: 'Door hardware adjustment',
      location: 'Lobby entrance',
      status: 'in_progress',
      priority: 'medium',
      assignee: 'XYZ Carpentry',
      dueDate: '2024-01-22',
    },
    {
      id: '3',
      number: 'PI-003',
      title: 'Ceiling tile replacement',
      location: 'Conference Room A',
      status: 'completed',
      priority: 'low',
      assignee: 'Interior Solutions',
      dueDate: '2024-01-15',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Circle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-green-500';
    }
  };

  const filteredItems = punchItems.filter((item) => {
    if (filter === 'all') {return true;}
    if (filter === 'open') {return item.status !== 'completed';}
    return item.status === 'completed';
  });

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Punch Lists</h1>
        <Button onClick={() => navigate('/punch-lists/new')} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Item
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items..." className="pl-10" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-red-500/10 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-500">12</p>
          <p className="text-xs text-muted-foreground">Open</p>
        </div>
        <div className="p-3 bg-yellow-500/10 rounded-lg text-center">
          <p className="text-2xl font-bold text-yellow-500">5</p>
          <p className="text-xs text-muted-foreground">In Progress</p>
        </div>
        <div className="p-3 bg-green-500/10 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-500">28</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
      </div>

      {/* Punch items list */}
      <div className="space-y-3">
        {filteredItems.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate(`/punch-lists/${item.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {getStatusIcon(item.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {item.number}
                    </span>
                    <div className={cn("w-2 h-2 rounded-full", getPriorityColor(item.priority))} />
                  </div>
                  <p className="font-medium text-foreground truncate">{item.title}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {item.location}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">{item.assignee}</span>
                    <span className="text-xs text-muted-foreground">Due: {item.dueDate}</span>
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

// Form for creating/editing punch items
export const MobilePunchItemForm = memo(function MobilePunchItemForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    priority: 'medium',
    assignee: '',
    dueDate: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/punch-lists');
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-foreground">
        {isEditing ? 'Edit Punch Item' : 'New Punch Item'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Brief description of the issue"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="h-12"
          />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="location"
              placeholder="e.g., Room 204, 2nd Floor"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="pl-10 h-12"
            />
          </div>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(v) => setFormData({ ...formData, priority: v })}
          >
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Detailed description of the issue..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
          />
        </div>

        {/* Photo attachment */}
        <div className="space-y-2">
          <Label>Photo</Label>
          <Button type="button" variant="outline" className="w-full h-14">
            <Camera className="h-5 w-5 mr-2" />
            Add Photo
          </Button>
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            className="h-12"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            {isEditing ? 'Save Changes' : 'Create Item'}
          </Button>
        </div>
      </form>
    </div>
  );
});

// Detail view for a punch item
export const MobilePunchItemDetail = memo(function MobilePunchItemDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Mock data
  const item = {
    id: '1',
    number: 'PI-001',
    title: 'Paint touch-up required',
    description: 'Wall paint is chipped near the door frame. Needs touch-up with matching color.',
    location: 'Room 204, 2nd Floor',
    status: 'open',
    priority: 'high',
    assignee: 'ABC Painting',
    dueDate: '2024-01-20',
    createdBy: 'John Doe',
    createdAt: '2024-01-15',
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-muted-foreground">{item.number}</span>
          <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
            {item.status}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              item.priority === 'high' && 'border-red-500 text-red-500',
              item.priority === 'medium' && 'border-yellow-500 text-yellow-500',
              item.priority === 'low' && 'border-green-500 text-green-500'
            )}
          >
            {item.priority}
          </Badge>
        </div>
        <h1 className="text-xl font-bold text-foreground">{item.title}</h1>
      </div>

      {/* Location */}
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <MapPin className="h-5 w-5 text-muted-foreground" />
        <span className="text-foreground">{item.location}</span>
      </div>

      {/* Description */}
      <Card>
        <CardContent className="p-4">
          <Label className="text-muted-foreground text-xs uppercase">Description</Label>
          <p className="text-foreground mt-1">{item.description}</p>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Assigned To</span>
            <span className="font-medium">{item.assignee}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Due Date</span>
            <span className="font-medium">{item.dueDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created By</span>
            <span className="font-medium">{item.createdBy}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium">{item.createdAt}</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3 pt-4">
        {item.status !== 'completed' && (
          <Button className="w-full h-12">
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Mark Complete
          </Button>
        )}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(`/punch-lists/${id}/edit`)}
          >
            Edit
          </Button>
          <Button variant="outline" className="flex-1">
            Add Photo
          </Button>
        </div>
      </div>
    </div>
  );
});

export default MobilePunchListsList;
