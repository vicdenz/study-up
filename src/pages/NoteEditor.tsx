
import { useCallback, useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Save, 
  Tag,
  BookOpen,
  Calendar,
  Loader2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotes } from "@/hooks/useNotes";
import { useCourses } from "@/hooks/useCourses";

const NoteEditor = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const isNewNote = noteId === "new";
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [courseId, setCourseId] = useState<string>("no-course");
  const [tagsInput, setTagsInput] = useState("");
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const { notes, createNote, updateNote, isCreating, isUpdating } = useNotes();
  const { courses } = useCourses();

  // Load existing note if editing
  useEffect(() => {
    if (!isNewNote && noteId) {
      const note = notes.find(n => n.id === noteId);
      if (note) {
        setTitle(note.title);
        setContent(note.content || "");
        setCourseId(note.course_id || "no-course");
        setTagsInput(note.tags?.join(", ") || "");
        setCurrentNoteId(note.id);
      }
    }
  }, [noteId, notes, isNewNote]);

  // Auto-save function
  const saveNote = useCallback(async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    
    const tags = tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const noteData = {
      title: title.trim(),
      content: content.trim() || null,
      course_id: courseId === "no-course" ? null : courseId,
      tags: tags.length > 0 ? tags : null,
    };

    try {
      if (isNewNote && !currentNoteId) {
        // Create new note
        const newNote = await createNote(noteData);
        setCurrentNoteId(newNote.id);
        // Update URL to reflect the new note ID
        navigate(`/notebook/note/${newNote.id}`, { replace: true });
      } else if (currentNoteId) {
        // Update existing note
        await updateNote({ id: currentNoteId, ...noteData });
      }
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  }, [
    content,
    courseId,
    createNote,
    currentNoteId,
    isNewNote,
    navigate,
    tagsInput,
    title,
    updateNote,
  ]);

  // Debounced auto-save
  // Trigger auto-save on content changes
  useEffect(() => {
    if (title.trim() || content.trim()) {
      saveTimeoutRef.current = setTimeout(() => {
        void saveNote();
      }, 1000);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, courseId, saveNote, tagsInput, title]);

  // Auto-resize textarea
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.height = 'auto';
      contentRef.current.style.height = contentRef.current.scrollHeight + 'px';
    }
  }, [content]);

  const handleManualSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    void saveNote();
  };

  const getCourseNameById = (courseId: string | null) => {
    if (!courseId) return null;
    const course = courses.find(c => c.id === courseId);
    return course?.name;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/notebook")}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Notebook
            </Button>
            
            {lastSaved && (
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-1" />
                Last saved: {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {(isSaving || isCreating || isUpdating) && (
              <div className="flex items-center text-sm text-gray-500">
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Saving...
              </div>
            )}
            <Button onClick={handleManualSave} size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {/* Note Metadata */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Course (Optional)</label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-course">No course</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name} ({course.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {courseId !== "no-course" && (
                <div className="flex items-center text-sm text-blue-600">
                  <BookOpen className="h-4 w-4 mr-1" />
                  {getCourseNameById(courseId)}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tags (Optional)</label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Enter tags separated by commas"
              />
              {tagsInput && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tagsInput.split(',').map((tag, index) => (
                    tag.trim() && (
                      <Badge key={index} variant="secondary" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag.trim()}
                      </Badge>
                    )
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Note Editor */}
        <div className="bg-white rounded-lg border border-gray-200 min-h-[600px]">
          {/* Title */}
          <div className="border-b border-gray-100 p-6">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled Note"
              className="text-3xl font-bold border-none shadow-none p-0 focus-visible:ring-0 placeholder:text-gray-300"
            />
          </div>

          {/* Content */}
          <div className="p-6">
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your note here..."
              className="w-full min-h-[400px] resize-none border-none outline-none text-gray-800 leading-relaxed text-lg placeholder:text-gray-400"
              style={{ fontFamily: 'inherit' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;
