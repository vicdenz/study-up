
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

export type Course = Database['public']['Tables']['courses']['Row'];
type CourseInsert = Database['public']['Tables']['courses']['Insert'];
type Assignment = Database['public']['Tables']['assignments']['Row'];
type CourseMaterial = Database['public']['Tables']['course_materials']['Row'];

export interface CourseWithStats extends Course {
  assignments?: Assignment[];
  materials?: CourseMaterial[];
  assignmentCount: number;
  materialCount: number;
  nextDeadline?: string;
}

export const useCourses = () => {
  const queryClient = useQueryClient();

  const { data: courses = [], isLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: async (): Promise<CourseWithStats[]> => {
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;

      // Get assignments and materials for each course
      const coursesWithStats = await Promise.all(
        (coursesData || []).map(async (course) => {
          const [assignmentsResult, materialsResult] = await Promise.all([
            supabase
              .from('assignments')
              .select('*')
              .eq('course_id', course.id)
              .order('due_date', { ascending: true }),
            supabase
              .from('course_materials')
              .select('*')
              .eq('course_id', course.id)
          ]);

          const assignments = assignmentsResult.data || [];
          const materials = materialsResult.data || [];

          // Find next upcoming deadline
          const upcomingAssignment = assignments.find(a => a.due_date && new Date(a.due_date) > new Date());
          let nextDeadline = 'No upcoming deadlines';
          
          if (upcomingAssignment && upcomingAssignment.due_date) {
            const dueDate = new Date(upcomingAssignment.due_date);
            const today = new Date();
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) {
              nextDeadline = `${upcomingAssignment.title} due today`;
            } else if (diffDays === 1) {
              nextDeadline = `${upcomingAssignment.title} due tomorrow`;
            } else if (diffDays > 1) {
              nextDeadline = `${upcomingAssignment.title} due in ${diffDays} days`;
            }
          }

          return {
            ...course,
            assignments,
            materials,
            assignmentCount: assignments.length,
            materialCount: materials.length,
            nextDeadline
          };
        })
      );

      return coursesWithStats;
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async (newCourse: Omit<CourseInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('courses')
        .insert({ ...newCourse, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      // Track activity
      await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          activity_type: 'course_created',
          activity_description: `Created course: ${newCourse.name}`,
          related_course_id: data.id,
          related_course_name: newCourse.name,
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Course created successfully!');
    },
    onError: (error) => {
      console.error('Error creating course:', error);
      toast.error('Failed to create course');
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get course name before deletion for activity tracking
      const { data: course } = await supabase
        .from('courses')
        .select('name')
        .eq('id', courseId)
        .single();

      const [courseMaterialsResult, assignmentsResult] = await Promise.all([
        supabase
          .from('course_materials')
          .select('file_path')
          .eq('course_id', courseId),
        supabase
          .from('assignments')
          .select('id')
          .eq('course_id', courseId),
      ]);

      if (courseMaterialsResult.error) throw courseMaterialsResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;

      const assignmentIds = assignmentsResult.data?.map((assignment) => assignment.id) ?? [];
      const assignmentMaterialsResult = assignmentIds.length
        ? await supabase
          .from('assignment_materials')
          .select('file_path')
          .in('assignment_id', assignmentIds)
        : { data: [], error: null };

      if (assignmentMaterialsResult.error) throw assignmentMaterialsResult.error;

      const filePaths = [
        ...(courseMaterialsResult.data ?? []),
        ...(assignmentMaterialsResult.data ?? []),
      ]
        .map((material) => material.file_path)
        .filter((path): path is string => Boolean(path));

      if (filePaths.length) {
        const { error: storageError } = await supabase.storage
          .from('course-materials')
          .remove(filePaths);
        if (storageError) throw storageError;
      }

      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      // Track activity
      if (course) {
        await supabase
          .from('activities')
          .insert({
            user_id: user.id,
            activity_type: 'course_deleted',
            activity_description: `Deleted course: ${course.name}`,
            related_course_name: course.name,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Course deleted successfully!');
    },
    onError: (error) => {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    },
  });

  return {
    courses,
    isLoading,
    error,
    createCourse: createCourseMutation.mutateAsync,
    deleteCourse: deleteCourseMutation.mutateAsync,
    isCreating: createCourseMutation.isPending,
    isDeleting: deleteCourseMutation.isPending,
  };
};
