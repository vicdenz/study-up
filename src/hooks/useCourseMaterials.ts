import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import {
  extractMaterialText,
} from '@/lib/material-files';
import {
  errorMessage,
  safeStorageFileName,
} from '@/lib/material-validation';

export type CourseMaterial = Database['public']['Tables']['course_materials']['Row'];

export const useCourseMaterials = (courseId: string) => {
  const queryClient = useQueryClient();

  const { data: materials = [], isLoading, error } = useQuery({
    queryKey: ['courseMaterials', courseId],
    queryFn: async (): Promise<CourseMaterial[]> => {
      if (!courseId) return [];

      const { data, error } = await supabase
        .from('course_materials')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return Promise.all((data || []).map(async (material) => {
        if (!material.file_path) return material;
        const { data: signedUrl } = await supabase.storage
          .from('course-materials')
          .createSignedUrl(material.file_path, 60 * 60);

        return { ...material, url: signedUrl?.signedUrl ?? null };
      }));
    },
    enabled: !!courseId,
  });

  const uploadMaterialMutation = useMutation({
    mutationFn: async ({ course_id, title, type, file }: { 
      course_id: string; 
      title: string; 
      type: string; 
      file: File; 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const content = await extractMaterialText(file);

      // Upload file to storage
      const fileName = `${crypto.randomUUID()}-${safeStorageFileName(file.name)}`;
      const filePath = `${course_id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('course-materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save material record to database
      const { data, error: insertError } = await supabase
        .from('course_materials')
        .insert({
          course_id,
          title,
          type,
          url: null,
          file_path: filePath,
          content, // Save extracted content
        })
        .select()
        .single();

      if (insertError) {
        await supabase.storage.from('course-materials').remove([filePath]);
        throw insertError;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseMaterials', courseId] });
      toast.success('Material uploaded successfully!');
    },
    onError: (error) => {
      console.error('Error uploading material:', error);
      toast.error(`Failed to upload material: ${errorMessage(error)}`);
    },
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (material: CourseMaterial) => {
      // Delete file from storage
      if (material.file_path) {
        const { error: deleteError } = await supabase.storage
          .from('course-materials')
          .remove([material.file_path]);
        
        if (deleteError) {
          throw deleteError;
        }
      }

      // Delete record from database
      const { error } = await supabase
        .from('course_materials')
        .delete()
        .eq('id', material.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseMaterials', courseId] });
      toast.success('Material deleted successfully!');
    },
    onError: (error) => {
      console.error('Error deleting material:', error);
      toast.error('Failed to delete material');
    },
  });

  return {
    materials,
    isLoading,
    error,
    uploadMaterial: uploadMaterialMutation.mutateAsync,
    deleteMaterial: deleteMaterialMutation.mutateAsync,
    isUploading: uploadMaterialMutation.isPending,
    isDeleting: deleteMaterialMutation.isPending,
  };
};
