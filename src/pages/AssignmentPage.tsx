import { useParams, useNavigate, Link } from '@/lib/router';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, MessageSquare, Calendar, Edit, Brain, X, Paperclip, Download, Eye, Trash2 } from 'lucide-react';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import Navigation from '@/components/Navigation';
import UserMenu from '@/components/UserMenu';
import { useAssignment } from '@/hooks/useAssignment';
import { useAiChats } from '@/hooks/useAiChats';
import type { Database } from '@/integrations/supabase/types';
import EditAssignmentDialog from '@/components/EditAssignmentDialog';
import { useAssignments } from '@/hooks/useAssignments';
import type { AssignmentUpdate } from '@/hooks/useAssignments';
import { useQueryClient } from '@tanstack/react-query';
import { useAssignmentMaterials } from '@/hooks/useAssignmentMaterials';
import AddAssignmentMaterialDialog from '@/components/AddAssignmentMaterialDialog';
import { useStudyPlanner } from '@/hooks/useStudyPlanner';
import StudyPlanDialog from '@/components/StudyPlanDialog';
import { downloadFile } from '@/lib/download-file';
import { toast } from 'sonner';

type AiChat = Database['public']['Tables']['ai_chats']['Row'];
type AssignmentMaterial = Database['public']['Tables']['assignment_materials']['Row'];

const AssignmentPage = () => {
  const { courseId, assignmentId } = useParams<{ courseId: string; assignmentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { assignment, isLoading: assignmentLoading } = useAssignment(assignmentId);
  const { chats, isLoading: chatsLoading, unlinkChat, isUnlinking } = useAiChats(assignmentId);
  const { materials, isLoading: materialsLoading, uploadMaterial, isUploading, deleteMaterial, isDeleting } = useAssignmentMaterials(assignmentId);
  const { updateAssignment, isUpdating } = useAssignments(courseId);
  const { plan, generatePlan, isGenerating, addPlanToPlanner, isAdding, clearPlan } = useStudyPlanner(courseId);

  const handleChatClick = (chat: AiChat) => {
    navigate('/ai-tutor', { state: { chatToLoad: chat } });
  };
  
  const handleUpdateAssignment = async (data: { id: string; updates: AssignmentUpdate }) => {
    if (!updateAssignment) return;
    await updateAssignment(data);
    await queryClient.invalidateQueries({ queryKey: ['assignment', assignmentId] });
  };

  const handleNewChat = () => {
    if (!assignment) return;
    navigate('/ai-tutor', {
      state: {
        courseId: courseId,
        courseName: assignment.courses?.name,
        assignmentId: assignment.id,
        assignmentDetails: {
          title: assignment.title,
          description: assignment.description || 'No description provided.',
        },
      }
    });
  };

  const handleAddMaterial = (data: { title: string; type: string; file: File; assignment_id: string; }) => {
    if (!assignmentId) return;
    uploadMaterial(data);
  };

  const handleDeleteMaterial = (material: AssignmentMaterial) => {
      deleteMaterial(material);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '📷';
    if (type.startsWith('video/')) return '🎥';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('document')) return '📝';
    if (type.includes('presentation')) return '📊';
    if (type.includes('spreadsheet')) return '📈';
    return '📎';
  };

  if (assignmentLoading || chatsLoading || materialsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Navigation />
        <main className="flex-1 flex items-center justify-center text-center">
          <div>
            <h2 className="text-2xl font-bold mb-4">Assignment not found</h2>
            <Button onClick={() => navigate(`/courses/${courseId}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Course
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Navigation />
      <main className="flex-1">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="icon" onClick={() => navigate(`/courses/${courseId}`)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{assignment.title}</h1>
                <p className="text-sm text-gray-500">
                  Part of <Link to={`/courses/${courseId}`} className="text-blue-600 hover:underline">{assignment.courses?.name}</Link>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => assignmentId && generatePlan(assignmentId)} disabled={isGenerating || !assignment?.due_date} title={!assignment?.due_date ? "An assignment must have a due date to generate a study plan." : ""}>
                <Brain className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating Plan...' : 'Make a Study Plan'}
              </Button>
              <EditAssignmentDialog
                assignment={assignment}
                onUpdate={handleUpdateAssignment}
                isUpdating={isUpdating}
              >
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Assignment
                </Button>
              </EditAssignmentDialog>
              <UserMenu />
            </div>
          </div>
        </header>

        <div className="p-6 max-w-4xl mx-auto">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{assignment.description || 'No description provided.'}</p>
              </div>
              {assignment.due_date && (
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Due on {new Date(assignment.due_date).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Paperclip className="h-5 w-5 mr-2" />
                  Assignment Materials
                </div>
                {assignmentId && (
                  <AddAssignmentMaterialDialog
                    assignmentId={assignmentId}
                    onAddMaterial={handleAddMaterial}
                    isUploading={isUploading}
                  />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {materials && materials.length > 0 ? (
                <ul className="space-y-3">
                  {materials.map(material => (
                    <li key={material.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3 flex-grow">
                        <span className="text-2xl">{getFileIcon(material.type)}</span>
                        <div>
                          <p className="font-semibold">{material.title}</p>
                          <p className="text-sm text-gray-500">
                            Uploaded on {new Date(material.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!material.url}
                          aria-label={`View ${material.title}`}
                          onClick={() => material.url && window.open(material.url, '_blank', 'noopener,noreferrer')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                         <Button 
                          variant="ghost" 
                          size="icon"
                          disabled={!material.url}
                          aria-label={`Download ${material.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!material.url) return;
                            void downloadFile(material.url, material.title).catch((error) => {
                              console.error('Material download failed:', error);
                              toast.error('Failed to download material');
                            });
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" disabled={isDeleting} onClick={(e) => e.stopPropagation()}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Material?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{material.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteMaterial(material)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No materials have been added to this assignment yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Linked AI Tutor Chats
                </div>
                <Button size="sm" onClick={handleNewChat}>
                  <Brain className="h-4 w-4 mr-2" />
                  Start New Chat
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chats && chats.length > 0 ? (
                <ul className="space-y-3">
                  {chats.map(chat => (
                    <li key={chat.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <button
                        onClick={() => handleChatClick(chat)}
                        className="flex-grow text-left"
                      >
                        <p className="font-semibold">{chat.title}</p>
                        <p className="text-sm text-gray-500">
                          Saved on {new Date(chat.created_at).toLocaleString()}
                        </p>
                      </button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" disabled={isUnlinking}>
                            <X className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Unlink Chat?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to unlink "{chat.title}" from this assignment? The chat itself will not be deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => unlinkChat(chat.id)} className="bg-destructive hover:bg-destructive/90">Unlink</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No AI chats have been linked to this assignment yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      {assignment && (
        <StudyPlanDialog
          open={!!plan}
          onOpenChange={(isOpen) => !isOpen && clearPlan()}
          plan={plan}
          onConfirm={() => addPlanToPlanner({ assignmentTitle: assignment.title })}
          isAdding={isAdding}
          assignmentTitle={assignment.title}
        />
      )}
    </div>
  );
};

export default AssignmentPage;
