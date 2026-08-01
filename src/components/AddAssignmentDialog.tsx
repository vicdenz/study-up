
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAllAssignments } from '@/hooks/useAssignments';
import { useCourses } from '@/hooks/useCourses';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

interface AddAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDueDate?: Date;
  initialCourseId?: string;
}

const AddAssignmentDialog = ({
  open,
  onOpenChange,
  initialDueDate,
  initialCourseId,
}: AddAssignmentDialogProps) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    course_id: ''
  });

  const { createAssignment, isCreating } = useAllAssignments();
  const { courses } = useCourses();

  // Set initial due date when dialog opens, preserving HH:mm and date
  useEffect(() => {
    if (open && initialDueDate) {
      const isoString = format(initialDueDate, "yyyy-MM-dd'T'HH:mm");
      setFormData(prev => ({ ...prev, due_date: isoString }));
    }
    // If no initialDueDate (slot), clear due_date
    if (open && !initialDueDate) {
      setFormData(prev => ({ ...prev, due_date: '' }));
    }
    if (open && initialCourseId) {
      setFormData(prev => ({ ...prev, course_id: initialCourseId }));
    }
  }, [open, initialDueDate, initialCourseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.course_id) return;

    try {
      await createAssignment({
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        due_date: formData.due_date
          ? new Date(formData.due_date).toISOString()
          : null,
        course_id: formData.course_id,
      });

      // Reset form and close dialog
      setFormData({
        title: '',
        description: '',
        due_date: '',
        course_id: ''
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating assignment:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Assignment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Assignment Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Physics Lab Report"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course">Course</Label>
            <Select
              value={formData.course_id}
              onValueChange={(value) => setFormData({ ...formData, course_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the assignment..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date (Optional)</Label>
            <Input
              id="due_date"
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !formData.title.trim() || !formData.course_id}
            >
              {isCreating ? 'Creating...' : 'Create Assignment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAssignmentDialog;
