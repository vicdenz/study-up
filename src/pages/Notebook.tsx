
import { useState } from "react";
import { useNavigate } from "@/lib/router";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Plus, 
  Search, 
  Tag, 
  Calendar,
  Loader2,
  Brain,
  Trash2
} from "lucide-react";
import Navigation from "@/components/Navigation";
import UserMenu from "@/components/UserMenu";
import { useNotes } from "@/hooks/useNotes";
import type { Database } from "@/integrations/supabase/types";
import { useCourses } from "@/hooks/useCourses";
import EditNoteDialog from "@/components/EditNoteDialog";
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

const Notebook = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<
    Database["public"]["Tables"]["notes"]["Row"] | null
  >(null);

  const { 
    notes, 
    isLoading, 
    deleteNote, 
    generateSummary,
    isDeleting,
    isGeneratingSummary 
  } = useNotes();
  
  const { courses } = useCourses();

  // Get all unique tags from notes
  const allTags = Array.from(
    new Set(notes.flatMap(note => note.tags || []))
  );

  // Filter notes based on search, tag, and course
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (note.content?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesTag = !selectedTag || (note.tags && note.tags.includes(selectedTag));
    
    const matchesCourse = !selectedCourseId || note.course_id === selectedCourseId;
    
    return matchesSearch && matchesTag && matchesCourse;
  });

  const getPreviewText = (content: string | null) => {
    if (!content) return "No content...";
    return content.length > 120 ? content.substring(0, 120) + "..." : content;
  };

  const getCourseNameById = (courseId: string | null) => {
    if (!courseId) return null;
    const course = courses.find(c => c.id === courseId);
    return course?.name;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleCreateNote = () => {
    navigate("/notebook/note/new");
  };

  const handleEditNote = (noteId: string) => {
    navigate(`/notebook/note/${noteId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading notes...</span>
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
            <h1 className="text-xl font-semibold text-gray-900">Knowledge Notebook</h1>
            <div className="flex items-center space-x-4">
              <Button onClick={handleCreateNote}>
                <Plus className="h-4 w-4 mr-2" />
                Create Note
              </Button>
              <UserMenu />
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={selectedCourseId || ""}
                onChange={(e) => setSelectedCourseId(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="">All courses</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags Filter */}
            {allTags.length > 0 && (
              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4 text-gray-500" />
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={selectedTag === null ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedTag(null)}
                  >
                    All tags
                  </Badge>
                  {allTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTag === tag ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes Grid */}
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {notes.length === 0 ? "No notes yet" : "No notes match your filters"}
              </h3>
              <p className="text-gray-500 mb-6">
                {notes.length === 0 
                  ? "Create your first note to get started with your knowledge notebook."
                  : "Try adjusting your search terms or filters."
                }
              </p>
              {notes.length === 0 && (
                <Button onClick={handleCreateNote}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Note
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNotes.map((note) => (
                <Card key={note.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleEditNote(note.id)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold line-clamp-2">
                          {note.title}
                        </CardTitle>
                        {note.course_id && (
                          <p className="text-sm text-blue-600 mt-1">
                            {getCourseNameById(note.course_id)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 ml-2" onClick={(e) => e.stopPropagation()}>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              disabled={isDeleting}
                              aria-label={`Delete ${note.title}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Note</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{note.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteNote(note.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* Note Preview */}
                    <p className="text-gray-600 text-sm line-clamp-3">
                      {getPreviewText(note.content)}
                    </p>

                    {/* AI Summary */}
                    {note.summary ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center mb-2">
                          <Brain className="h-4 w-4 text-blue-600 mr-2" />
                          <span className="text-sm font-medium text-blue-800">AI Summary</span>
                        </div>
                        <p className="text-sm text-blue-700">{note.summary}</p>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateSummary(note.id);
                        }}
                        disabled={isGeneratingSummary}
                        className="w-full"
                      >
                        <Brain className="h-4 w-4 mr-2" />
                        {isGeneratingSummary ? "Generating..." : "Generate AI Summary"}
                      </Button>
                    )}

                    {/* Tags */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {note.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Date */}
                    <div className="flex items-center text-xs text-gray-500 pt-2">
                      <Calendar className="h-3 w-3 mr-1" />
                      Updated {formatDate(note.updated_at!)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit Note Dialog */}
      {editingNote && (
        <EditNoteDialog
          note={editingNote}
          courses={courses}
          onClose={() => setEditingNote(null)}
        />
      )}
    </div>
  );
};

export default Notebook;
