import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

export type Assignment = Database['public']['Tables']['assignments']['Row'];
type AssignmentInsert = Database['public']['Tables']['assignments']['Insert'];
export type AssignmentUpdate = Database['public']['Tables']['assignments']['Update'];
export type AssignmentWithCourse = Assignment & {
  courses: { name: string; color: string | null; code: string };
};

export const useAssignments = (courseId: string) => {
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading, error } = useQuery({
    queryKey: ['assignments', courseId],
    queryFn: async (): Promise<Assignment[]> => {
      let query = supabase.from('assignments').select('*');
      
      // If courseId is provided and not empty, filter by course
      if (courseId && courseId.trim() !== '') {
        query = query.eq('course_id', courseId);
      }
      
      const { data, error } = await query.order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (newAssignment: Omit<AssignmentInsert, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('assignments')
        .insert(newAssignment)
        .select()
        .single();

      if (error) throw error;

      // Get course name for activity tracking if course_id is provided
      if (newAssignment.course_id) {
        const { data: course } = await supabase
          .from('courses')
          .select('name')
          .eq('id', newAssignment.course_id)
          .single();

        // Track activity
        await supabase
          .from('activities')
          .insert({
            user_id: user.id,
            activity_type: 'assignment_created',
            activity_description: `Created assignment: ${newAssignment.title}`,
            related_course_id: newAssignment.course_id,
            related_course_name: course?.name || 'Unknown Course',
          });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', courseId] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Assignment created successfully!');
    },
    onError: (error) => {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment');
    },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: AssignmentUpdate }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('assignments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Get course name for activity tracking
      const { data: course } = await supabase
        .from('courses')
        .select('name')
        .eq('id', courseId)
        .single();

      // Track activity
      await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          activity_type: 'assignment_updated',
          activity_description: `Updated assignment: ${data.title}`,
          related_course_id: courseId,
          related_course_name: course?.name || 'Unknown Course',
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', courseId] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Assignment updated successfully!');
    },
    onError: (error) => {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignment: Assignment) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignment.id);

      if (error) throw error;

      // Get course name for activity tracking
      const { data: course } = await supabase
        .from('courses')
        .select('name')
        .eq('id', courseId)
        .single();

      // Track activity
      await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          activity_type: 'assignment_deleted',
          activity_description: `Deleted assignment: ${assignment.title}`,
          related_course_id: courseId,
          related_course_name: course?.name || 'Unknown Course',
        });

      return assignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', courseId] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Assignment deleted successfully!');
    },
    onError: (error) => {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment');
    },
  });

  const toggleAssignmentCompletionMutation = useMutation({
    mutationFn: async (assignment: Assignment) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('assignments')
        .update({ completed: !assignment.completed })
        .eq('id', assignment.id)
        .select()
        .single();

      if (error) throw error;

      // Get course name for activity tracking
      const { data: course } = await supabase
        .from('courses')
        .select('name')
        .eq('id', courseId)
        .single();

      // Track activity
      await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          activity_type: assignment.completed ? 'assignment_uncompleted' : 'assignment_completed',
          activity_description: `${assignment.completed ? 'Uncompleted' : 'Completed'} assignment: ${assignment.title}`,
          related_course_id: courseId,
          related_course_name: course?.name || 'Unknown Course',
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', courseId] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: (error) => {
      console.error('Error updating assignment completion:', error);
      toast.error('Failed to update assignment');
    },
  });

  return {
    assignments,
    isLoading,
    error,
    createAssignment: createAssignmentMutation.mutateAsync,
    isCreating: createAssignmentMutation.isPending,
    updateAssignment: updateAssignmentMutation.mutateAsync,
    isUpdating: updateAssignmentMutation.isPending,
    deleteAssignment: deleteAssignmentMutation.mutateAsync,
    isDeleting: deleteAssignmentMutation.isPending,
    toggleAssignmentCompletion: toggleAssignmentCompletionMutation.mutateAsync,
    isTogglingCompletion: toggleAssignmentCompletionMutation.isPending,
  };
};

// Create a new hook to get all assignments for the planner
export const useAllAssignments = () => {
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading, error } = useQuery({
    queryKey: ['assignments', 'all'],
    queryFn: async (): Promise<AssignmentWithCourse[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          courses!inner(name, color, code)
        `)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return (data as AssignmentWithCourse[]) || [];
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (newAssignment: Omit<AssignmentInsert, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('assignments')
        .insert(newAssignment)
        .select()
        .single();

      if (error) throw error;

      // Get course name for activity tracking if course_id is provided
      if (newAssignment.course_id) {
        const { data: course } = await supabase
          .from('courses')
          .select('name')
          .eq('id', newAssignment.course_id)
          .single();

        // Track activity
        await supabase
          .from('activities')
          .insert({
            user_id: user.id,
            activity_type: 'assignment_created',
            activity_description: `Created assignment: ${newAssignment.title}`,
            related_course_id: newAssignment.course_id,
            related_course_name: course?.name || 'Unknown Course',
          });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Assignment created successfully!');
    },
    onError: (error) => {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment');
    },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: AssignmentUpdate }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get assignment details before update for activity tracking
      const { data: originalAssignment, error: fetchError } = await supabase
        .from('assignments')
        .select('*, courses(name)')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('assignments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Track activity
      await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          activity_type: 'assignment_updated',
          activity_description: `Updated assignment: ${updates.title || originalAssignment.title}`,
          related_course_id: originalAssignment.course_id,
          related_course_name: originalAssignment.courses?.name || 'Unknown Course',
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Assignment updated successfully!');
    },
    onError: (error) => {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    },
  });
  
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get assignment details before deletion for activity tracking
      const { data: assignment, error: fetchError } = await supabase
        .from('assignments')
        .select('*, courses(name)')
        .eq('id', assignmentId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      // Track activity
      await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          activity_type: 'assignment_deleted',
          activity_description: `Deleted assignment: ${assignment.title}`,
          related_course_id: assignment.course_id,
          related_course_name: assignment.courses?.name || 'Unknown Course',
        });

      return assignmentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Assignment deleted successfully!');
    },
    onError: (error) => {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment');
    },
  });

  const toggleAssignmentCompletionMutation = useMutation({
    mutationFn: async (assignment: AssignmentWithCourse) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('assignments')
        .update({ completed: !assignment.completed })
        .eq('id', assignment.id)
        .select()
        .single();

      if (error) throw error;

      // Track activity
      await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          activity_type: assignment.completed ? 'assignment_uncompleted' : 'assignment_completed',
          activity_description: `${assignment.completed ? 'Uncompleted' : 'Completed'} assignment: ${assignment.title}`,
          related_course_id: assignment.course_id,
          related_course_name: assignment.courses?.name || 'Unknown Course',
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: (error) => {
      console.error('Error updating assignment completion:', error);
      toast.error('Failed to update assignment');
    },
  });

  return {
    assignments,
    isLoading,
    error,
    createAssignment: createAssignmentMutation.mutateAsync,
    isCreating: createAssignmentMutation.isPending,
    updateAssignment: updateAssignmentMutation.mutateAsync,
    isUpdating: updateAssignmentMutation.isPending,
    deleteAssignment: deleteAssignmentMutation.mutateAsync,
    isDeleting: deleteAssignmentMutation.isPending,
    toggleAssignmentCompletion: toggleAssignmentCompletionMutation.mutateAsync,
    isTogglingCompletion: toggleAssignmentCompletionMutation.isPending,
  };
};
