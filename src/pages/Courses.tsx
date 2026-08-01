
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, FileText, Users, Brain, Loader2, MessageSquare, Trash2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import UserMenu from "@/components/UserMenu";
import AddCourseDialog from "@/components/AddCourseDialog";
import { useCourses } from "@/hooks/useCourses";
import { useNavigate } from "@/lib/router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Courses = () => {
  const { courses, isLoading, createCourse, deleteCourse, isCreating, isDeleting } = useCourses();
  const navigate = useNavigate();

  const handleAddCourse = async (courseData: {
    name: string;
    code: string;
    description?: string;
    color: string;
  }) => {
    return createCourse(courseData);
  };

  const handleDeleteCourse = (courseId: string) => {
    void deleteCourse(courseId);
  };

  const handleAskAI = (courseId: string, courseName: string) => {
    // Navigate to AI Tutor with course context
    navigate('/ai-tutor', { 
      state: { 
        courseId, 
        courseName,
        context: `I'm working on ${courseName}. Help me with questions related to this course.`
      } 
    });
  };

  const handleViewCourse = (courseId: string) => {
    navigate(`/courses/${courseId}`);
  };

  if (isLoading) {
    return (
      <div className="app-background min-h-screen flex">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading courses...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-background min-h-screen flex">
      <Navigation />
      
      <main className="min-w-0 flex-1">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-violet-100/80 bg-white/80 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Courses</h1>
            <div className="flex items-center space-x-4">
              <AddCourseDialog onAddCourse={handleAddCourse} isCreating={isCreating} />
              <UserMenu />
            </div>
          </div>
        </header>

        <div className="p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">My Courses</h2>
            <p className="text-gray-600">Manage your courses, track progress, and access AI-powered features.</p>
          </div>

          {courses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No courses yet</h3>
              <p className="text-gray-500 mb-6">Get started by adding your first course.</p>
              <AddCourseDialog onAddCourse={handleAddCourse} isCreating={isCreating} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Card 
                  key={course.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleViewCourse(course.id)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 ${course.color} rounded-full`}></div>
                        <div>
                          <CardTitle className="text-lg font-semibold">{course.name}</CardTitle>
                          <p className="text-sm text-gray-500">{course.code}</p>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => e.stopPropagation()}
                            disabled={isDeleting}
                            aria-label={`Delete ${course.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Course</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{course.name}"? This action cannot be undone and will also delete all associated assignments and materials.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteCourse(course.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{course.progress || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`${course.color} h-2 rounded-full`}
                          style={{ width: `${course.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {course.nextDeadline}
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center text-gray-600">
                          <FileText className="h-4 w-4 mr-1" />
                          {course.materialCount} materials
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Users className="h-4 w-4 mr-1" />
                          {course.assignmentCount} assignments
                        </div>
                      </div>

                      <div className="flex space-x-2 pt-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewCourse(course.id);
                          }}
                        >
                          <BookOpen className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAskAI(course.id, course.name);
                          }}
                        >
                          <Brain className="h-4 w-4 mr-1" />
                          Ask AI
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card 
                className="bg-blue-50 border-blue-200 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/planner')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <Brain className="h-8 w-8 text-blue-600" />
                    <div>
                      <h4 className="font-semibold text-gray-900">AI Study Planner</h4>
                      <p className="text-sm text-gray-600">Generate optimized study schedules</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="bg-green-50 border-green-200 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/upload')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-green-600" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Bulk Upload</h4>
                      <p className="text-sm text-gray-600">Upload multiple course materials</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="bg-purple-50 border-purple-200 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/ai-tutor')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="h-8 w-8 text-purple-600" />
                    <div>
                      <h4 className="font-semibold text-gray-900">AI Tutor</h4>
                      <p className="text-sm text-gray-600">Ask questions and get instant help</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Courses;
