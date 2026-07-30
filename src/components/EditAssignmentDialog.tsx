
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Database } from '@/integrations/supabase/types';
import type { AssignmentUpdate } from '@/hooks/useAssignments';
import { Edit } from 'lucide-react';
import { format } from 'date-fns';

type Assignment = Database['public']['Tables']['assignments']['Row'];

interface EditAssignmentDialogProps {
  assignment: Assignment;
  onUpdate?: (data: { id: string; updates: AssignmentUpdate }) => void;
  onUpdateAssignment?: (data: { id:string; updates: AssignmentUpdate }) => void;
  isUpdating?: boolean;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const EditAssignmentDialog = ({ 
  assignment, 
  onUpdate,
  onUpdateAssignment, // Backward compatibility
  isUpdating = false,
  children,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: EditAssignmentDialogProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;

  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? setControlledOpen : setUncontrolledOpen;

  const [formData, setFormData] = useState({
    title: assignment.title,
    description: assignment.description || '',
    due_date: assignment.due_date ? format(new Date(assignment.due_date), "yyyy-MM-dd'T'HH:mm") : ''
  });

  useEffect(() => {
    if (open) {
      setFormData({
        title: assignment.title,
        description: assignment.description || '',
        due_date: assignment.due_date ? format(new Date(assignment.due_date), "yyyy-MM-dd'T'HH:mm") : ''
      });
    }
  }, [open, assignment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const updateData = {
      id: assignment.id,
      updates: {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        due_date: formData.due_date
          ? new Date(formData.due_date).toISOString()
          : null
      }
    };

    if (onUpdate) {
      onUpdate(updateData);
    } else if (onUpdateAssignment) {
      onUpdateAssignment(updateData);
    }

    // We optimistically close the dialog. It can be improved to close on mutation success.
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Assignment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Assignment Title</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Physics Lab Report"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description (Optional)</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the assignment..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-due_date">Due Date (Optional)</Label>
            <Input
              id="edit-due_date"
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating || !formData.title.trim()}>
              {isUpdating ? 'Updating...' : 'Update Assignment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAssignmentDialog;
