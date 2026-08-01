
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

export type StudySession = Database['public']['Tables']['study_sessions']['Row'];
type StudySessionInsert = Database['public']['Tables']['study_sessions']['Insert'];
type StudySessionUpdate = Database['public']['Tables']['study_sessions']['Update'];
type Course = Database['public']['Tables']['courses']['Row'];

export interface StudySessionWithCourse extends StudySession {
  courses: Pick<Course, 'id' | 'name' | 'color'> | null;
}

export const useStudySessions = (courseId?: string) => {
  const queryClient = useQueryClient();

  const { data: studySessions = [], isLoading, error } = useQuery({
    queryKey: ['studySessions', courseId],
    queryFn: async (): Promise<StudySessionWithCourse[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let sessionQuery = supabase.from('study_sessions').select('*').eq('user_id', user.id);
      if (courseId) {
        sessionQuery = sessionQuery.eq('course_id', courseId);
      }

      const { data: sessions, error: sessionsError } = await sessionQuery.order('scheduled_date', { ascending: true });

      if (sessionsError) {
        toast.error(`Failed to fetch study sessions: ${sessionsError.message}`);
        throw sessionsError;
      }
      if (!sessions) return [];

      const courseIds = [...new Set(sessions.map(s => s.course_id))];
      if (courseIds.length === 0) {
        return sessions.map(s => ({ ...s, courses: null }));
      }

      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, name, color')
        .in('id', courseIds);
      
      if (coursesError) {
        toast.error(`Failed to fetch course details for sessions: ${coursesError.message}`);
        // Return sessions without course details instead of failing the whole query
        return sessions.map(s => ({ ...s, courses: null }));
      }

      const coursesMap = new Map(courses.map(c => [c.id, c as Pick<Course, 'id' | 'name' | 'color'>]));

      return sessions.map(s => ({
        ...s,
        courses: coursesMap.get(s.course_id) || null,
      }));
    },
  });

  const createStudySessionMutation = useMutation({
    mutationFn: async (newSession: Omit<StudySessionInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('study_sessions')
        .insert({ ...newSession, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studySessions'] });
      toast.success('Study session created!');
    },
    onError: (err: Error) => {
      toast.error(`Failed to create session: ${err.message}`);
    },
  });

  const updateStudySessionMutation = useMutation({
    mutationFn: async (session: { id: string } & Partial<StudySessionUpdate>) => {
      const { id, ...updateData } = session;
      const { data, error } = await supabase
        .from('study_sessions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studySessions'] });
      toast.success('Study session updated!');
    },
    onError: (err: Error) => {
      toast.error(`Failed to update session: ${err.message}`);
    },
  });

  const deleteStudySessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studySessions'] });
      toast.success('Study session deleted!');
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete session: ${err.message}`);
    },
  });

  return {
    studySessions,
    isLoading,
    error,
    createStudySession: createStudySessionMutation.mutateAsync,
    updateStudySession: updateStudySessionMutation.mutateAsync,
    deleteStudySession: deleteStudySessionMutation.mutateAsync,
    isCreating: createStudySessionMutation.isPending,
    isUpdating: updateStudySessionMutation.isPending,
    isDeleting: deleteStudySessionMutation.isPending,
  };
};
