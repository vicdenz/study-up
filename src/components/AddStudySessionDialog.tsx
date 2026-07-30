
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCourses } from '@/hooks/useCourses';
import { useStudySessions } from '@/hooks/useStudySessions';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  course_id: z.string().min(1, 'Please select a course'),
  description: z.string().optional(),
  scheduled_date: z.date({
    required_error: 'Please select a date',
  }),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/, 'Please select a time'),
  duration: z.number().min(15, 'Duration must be at least 15 minutes'),
});

type FormData = z.infer<typeof formSchema>;

interface AddStudySessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
}

const AddStudySessionDialog = ({ open, onOpenChange, selectedDate }: AddStudySessionDialogProps) => {
  const { courses } = useCourses();
  const { createStudySession, isCreating } = useStudySessions();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      course_id: '',
      description: '',
      scheduled_date: selectedDate || new Date(),
      scheduled_time: format(selectedDate || new Date(), 'HH:mm'),
      duration: 60,
    },
  });

  React.useEffect(() => {
    if (selectedDate) {
      form.setValue('scheduled_date', selectedDate);
      form.setValue('scheduled_time', format(selectedDate, 'HH:mm'));
    }
  }, [selectedDate, form]);

  const onSubmit = async (data: FormData) => {
    const [hours, minutes] = data.scheduled_time.split(':').map(Number);
    const scheduledDate = new Date(data.scheduled_date);
    scheduledDate.setHours(hours, minutes, 0, 0);

    try {
      await createStudySession({
        title: data.title.trim(),
        course_id: data.course_id,
        description: data.description?.trim() || null,
        scheduled_date: scheduledDate.toISOString(),
        duration: data.duration,
        completed: false,
      });
      onOpenChange(false);
      form.reset();
    } catch {
      // The mutation displays the actionable error and the form remains open.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Study Session</DialogTitle>
          <DialogDescription>
            Schedule a new study session for your courses.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter session title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="course_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scheduled_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < startOfDay(new Date())}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scheduled_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={15}
                      step={15}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any notes or goals for this session"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Session'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudySessionDialog;
