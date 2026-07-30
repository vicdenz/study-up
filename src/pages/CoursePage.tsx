import { useParams, useNavigate, Link } from "@/lib/router";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, FileText, Brain, ArrowLeft, Plus, Loader2, Download, Eye, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import Navigation from "@/components/Navigation";
import UserMenu from "@/components/UserMenu";
import { useCourses } from "@/hooks/useCourses";
import { useAssignments } from "@/hooks/useAssignments";
import type { Assignment } from "@/hooks/useAssignments";
import type { AssignmentUpdate } from "@/hooks/useAssignments";
import { useCourseMaterials } from "@/hooks/useCourseMaterials";
import AddAssignmentDialog from "@/components/AddAssignmentDialog";
import AddMaterialDialog from "@/components/AddMaterialDialog";
import EditAssignmentDialog from "@/components/EditAssignmentDialog";
import { useState } from "react";
import { downloadFile } from "@/lib/download-file";
import { toast } from "sonner";

const CoursePage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [showAddAssignmentDialog, setShowAddAssignmentDialog] = useState(false);
  
  const { courses, isLoading: coursesLoading } = useCourses();
  const { 
    assignments, 
    isLoading: assignmentsLoading, 
    updateAssignment,
    isUpdating,
    deleteAssignment,
    toggleAssignmentCompletion,
    isTogglingCompletion
  } = useAssignments(courseId || '');
  const { materials, isLoading: materialsLoading, uploadMaterial, deleteMaterial, isUploading } = useCourseMaterials(courseId || '');

  const course = courses.find(c => c.id === courseId);

  // Calculate progress based on completed assignments
  const completedAssignments = assignments?.filter(a => a.completed).length || 0;
  const totalAssignments = assignments?.length || 0;
  const calculatedProgress = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

  const handleUpdateAssignment = (updates: { id: string; updates: AssignmentUpdate }) =>
    updateAssignment(updates);

  const handleDeleteAssignment = (assignment: Assignment) => {
    void deleteAssignment(assignment);
  };

  const handleToggleCompletion = (assignment: Assignment) => {
    void toggleAssignmentCompletion(assignment);
  };

  const handleAddMaterial = (materialData: {
    title: string;
    type: string;
    file: File;
  }) => {
    if (courseId) {
      return uploadMaterial({
        ...materialData,
        course_id: courseId
      });
    }
    return Promise.reject(new Error("A course is required before uploading"));
  };

  const handleAskAI = () => {
    if (course) {
      navigate('/ai-tutor', { 
        state: { 
          courseId: course.id, 
          courseName: course.name,
          context: `I'm working on ${course.name} (${course.code}). Help me with questions related to this course.`
        } 
      });
    }
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

  if (coursesLoading || assignmentsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading course...</span>
          </div>
        </main>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Course not found</h2>
            <Button onClick={() => navigate('/courses')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
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
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 ${course.color} rounded-full`}></div>
              <h1 className="text-2xl font-bold text-gray-900">{course.name}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => navigate('/courses')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Courses
              </Button>
              <UserMenu />
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Course Header */}
          <div className="mb-8">
            <p className="text-lg text-gray-600 mb-2">{course.code}</p>
            {course.description && (
              <p className="text-gray-600">{course.description}</p>
            )}
          </div>

          {/* Course Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Assignments</p>
                    <p className="text-2xl font-bold text-gray-900">{assignments?.length || 0}</p>
                    <p className="text-xs text-gray-500">{completedAssignments} completed</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Materials</p>
                    <p className="text-2xl font-bold text-gray-900">{materials?.length || 0}</p>
                    <p className="text-xs text-gray-500">Course materials</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Progress</p>
                    <p className="text-2xl font-bold text-gray-900">{calculatedProgress}%</p>
                    <p className="text-xs text-gray-500">Course completion</p>
                  </div>
                  <div className={`w-8 h-8 ${course.color} rounded-full opacity-80`}></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="flex space-x-4">
              <Button onClick={() => setShowAddAssignmentDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Assignment
              </Button>
              <AddMaterialDialog onAddMaterial={handleAddMaterial} isUploading={isUploading} />
              <Button variant="outline" onClick={handleAskAI}>
                <Brain className="h-4 w-4 mr-2" />
                Ask AI About This Course
              </Button>
            </div>
          </div>

          {/* Assignments and Materials Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Assignments</span>
                  <Button onClick={() => setShowAddAssignmentDialog(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Assignment
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assignments && assignments.length > 0 ? (
                  <div className="space-y-4">
                    {assignments.map((assignment) => (
                      <div key={assignment.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <Checkbox
                              checked={assignment.completed || false}
                              onCheckedChange={() => handleToggleCompletion(assignment)}
                              disabled={isTogglingCompletion}
                              aria-label={`Mark ${assignment.title} as ${assignment.completed ? 'incomplete' : 'complete'}`}
                            />
                            <Link to={`/courses/${courseId}/assignments/${assignment.id}`} className="flex-1 cursor-pointer">
                              <h4 className={`font-semibold ${assignment.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                {assignment.title}
                              </h4>
                              {assignment.description && (
                                <p className={`text-sm mt-1 ${assignment.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {assignment.description}
                                </p>
                              )}
                              {assignment.due_date && (
                                <div className={`flex items-center mt-2 text-sm ${assignment.completed ? 'text-gray-400' : 'text-gray-500'}`}>
                                  <Calendar className="h-4 w-4 mr-1" />
                                  Due: {new Date(assignment.due_date).toLocaleDateString()}
                                </div>
                              )}
                            </Link>
                          </div>
                          <div className="flex items-center space-x-1 ml-4">
                            <Button asChild variant="ghost" size="sm">
                              <Link to={`/courses/${courseId}/assignments/${assignment.id}`}>
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">View {assignment.title}</span>
                              </Link>
                            </Button>
                            <EditAssignmentDialog
                              assignment={assignment}
                              onUpdateAssignment={handleUpdateAssignment}
                              isUpdating={isUpdating}
                            />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label={`Delete ${assignment.title}`}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{assignment.title}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteAssignment(assignment)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h4>
                    <p className="text-gray-500 mb-4">Start by adding your first assignment.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Course Materials */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Course Materials</span>
                  <AddMaterialDialog onAddMaterial={handleAddMaterial} isUploading={isUploading} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {materialsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading materials...</span>
                  </div>
                ) : materials && materials.length > 0 ? (
                  <div className="space-y-3">
                    {materials.map((material) => (
                      <div key={material.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{getFileIcon(material.type)}</span>
                          <div>
                            <p className="font-medium text-gray-900">{material.title}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(material.created_at!).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            disabled={!material.url}
                            aria-label={`View ${material.title}`}
                            onClick={() => material.url && window.open(material.url, '_blank', 'noopener,noreferrer')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            disabled={!material.url}
                            aria-label={`Download ${material.title}`}
                            onClick={() => {
                              if (!material.url) return;
                              void downloadFile(material.url, material.title).catch((error) => {
                                console.error("Material download failed:", error);
                                toast.error("Failed to download material");
                              });
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            aria-label={`Delete ${material.title}`}
                            onClick={() => deleteMaterial(material)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No materials yet</h4>
                    <p className="text-gray-500 mb-4">Upload course materials to get started.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <AddAssignmentDialog 
        open={showAddAssignmentDialog} 
        onOpenChange={setShowAddAssignmentDialog}
        initialCourseId={courseId}
      />
    </div>
  );
};

export default CoursePage;
