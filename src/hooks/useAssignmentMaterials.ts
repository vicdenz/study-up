
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

export type AssignmentMaterial = Database['public']['Tables']['assignment_materials']['Row'];

export const useAssignmentMaterials = (assignmentId?: string) => {
  const queryClient = useQueryClient();

  const { data: materials = [], isLoading, error } = useQuery({
    queryKey: ['assignment_materials', assignmentId],
    queryFn: async (): Promise<AssignmentMaterial[]> => {
      if (!assignmentId) return [];
      const { data, error } = await supabase
        .from('assignment_materials')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return Promise.all((data || []).map(async (material) => {
        if (!material.file_path) return material;
        const { data: signedUrl } = await supabase.storage
          .from('course-materials')
          .createSignedUrl(material.file_path, 60 * 60);

        return { ...material, url: signedUrl?.signedUrl ?? null };
      }));
    },
    enabled: !!assignmentId,
  });

  const { mutateAsync: uploadMaterial, isPending: isUploading } = useMutation({
    mutationFn: async (newMaterial: { title: string; type: string; file: File; assignment_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const file = newMaterial.file;
      const content = await extractMaterialText(file);

      const filePath = `assignment_materials/${user.id}/${newMaterial.assignment_id}/${crypto.randomUUID()}-${safeStorageFileName(file.name)}`;
      
      const { error: uploadError } = await supabase.storage
        .from('course-materials')
        .upload(filePath, newMaterial.file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('assignment_materials')
        .insert({
          assignment_id: newMaterial.assignment_id,
          title: newMaterial.title,
          type: newMaterial.type,
          url: null,
          file_path: filePath,
          content, // Save extracted content
        });

      if (dbError) {
        await supabase.storage.from('course-materials').remove([filePath]);
        throw dbError;
      }
    },
    onSuccess: (_, variables) => {
      toast.success('Material uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['assignment_materials', variables.assignment_id] });
    },
    onError: (error: unknown) => {
      toast.error(`Failed to upload material: ${errorMessage(error)}`);
    },
  });

  const { mutateAsync: deleteMaterial, isPending: isDeleting } = useMutation({
    mutationFn: async (material: AssignmentMaterial) => {
      if (material.file_path) {
        const { error: storageError } = await supabase.storage
          .from('course-materials')
          .remove([material.file_path]);
        if (storageError) {
          throw storageError;
        }
      }

      const { error: dbError } = await supabase
        .from('assignment_materials')
        .delete()
        .eq('id', material.id);
      
      if (dbError) throw dbError;
      return material;
    },
    onSuccess: (deletedMaterial) => {
      toast.success('Material deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['assignment_materials', deletedMaterial.assignment_id] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete material: ${error.message}`);
    },
  });

  return { materials, isLoading, error, uploadMaterial, isUploading, deleteMaterial, isDeleting };
};
