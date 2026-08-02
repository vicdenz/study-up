
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addWeeks, subWeeks } from 'date-fns';
import Navigation from '@/components/Navigation';
import PageHeader from '@/components/PageHeader';
import UserMenu from '@/components/UserMenu';
import AddStudySessionDialog from '@/components/AddStudySessionDialog';
import AddAssignmentDialog from '@/components/AddAssignmentDialog';
import TimeGridCalendar from '@/components/TimeGridCalendar';
import TimeSlotSelectionPopover from '@/components/TimeSlotSelectionPopover';
import PlannerEventSidebar from '@/components/PlannerEventSidebar';
import { useStudySessions } from '@/hooks/useStudySessions';
import { useCourses } from '@/hooks/useCourses';
import { useAllAssignments } from '@/hooks/useAssignments';
import { useStudyPlanner } from '@/hooks/useStudyPlanner';
import StudyPlanDialog from '@/components/StudyPlanDialog';
import type {
  AssignmentUpdate,
  AssignmentWithCourse,
} from '@/hooks/useAssignments';
import type { StudySessionWithCourse } from '@/hooks/useStudySessions';

type PlannerEvent = AssignmentWithCourse | StudySessionWithCourse;

const Planner = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddStudySessionDialog, setShowAddStudySessionDialog] = useState(false);
  const [showAddAssignmentDialog, setShowAddAssignmentDialog] = useState(false);
  const [showTimeSlotPopover, setShowTimeSlotPopover] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    startTime: Date;
    endTime: Date;
  } | null>(null);
  const [popoverAnchorElement, setPopoverAnchorElement] = useState<HTMLElement | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<PlannerEvent | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<'assignment' | 'study' | null>(null);

  const { studySessions, updateStudySession, deleteStudySession } = useStudySessions();
  const { courses } = useCourses();
  const {
    assignments,
    deleteAssignment,
    isDeleting,
    updateAssignment,
    isUpdating,
    toggleAssignmentCompletion,
    isTogglingCompletion,
  } = useAllAssignments();
  const { plan, generatePlan, isGenerating, addPlanToPlanner, isAdding, clearPlan } = useStudyPlanner(selectedEvent?.course_id);

  useEffect(() => {
    if (!selectedEvent) return;

    let updatedEvent;
    if (selectedEventType === 'assignment') {
      updatedEvent = assignments.find(a => a.id === selectedEvent.id);
    } else if (selectedEventType === 'study') {
      updatedEvent = studySessions.find(s => s.id === selectedEvent.id);
    }

    if (updatedEvent) {
      // Stringify to prevent re-renders from objects with same values but different references.
      if (JSON.stringify(updatedEvent) !== JSON.stringify(selectedEvent)) {
        setSelectedEvent(updatedEvent);
      }
    } else {
      // Event was likely deleted, close the sidebar.
      setSelectedEvent(null);
      setSelectedEventType(null);
    }
  }, [assignments, studySessions, selectedEvent, selectedEventType]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleTimeSlotSelect = (startTime: Date, endTime: Date, element: HTMLElement) => {
    setSelectedTimeSlot({ startTime, endTime });
    setPopoverAnchorElement(element);
    setShowTimeSlotPopover(true);
  };

  const handleDeleteAssignment = (assignmentId: string) => {
    deleteAssignment(assignmentId);
    // Clear sidebar after deletion
    setSelectedEvent(null);
    setSelectedEventType(null);
  };

  const handleDeleteStudySession = (sessionId: string) => {
    deleteStudySession(sessionId);
    // Clear sidebar after deletion
    setSelectedEvent(null);
    setSelectedEventType(null);
  };

  const handleAddStudySession = () => {
    setShowAddStudySessionDialog(true);
    setShowTimeSlotPopover(false);
  };

  const handleAddAssignment = () => {
    setShowAddAssignmentDialog(true);
    setShowTimeSlotPopover(false);
  };

  const handleCompleteAssignment = (assignment: AssignmentWithCourse) => {
    // Optimistically update the selected event in the sidebar
    setSelectedEvent(prev => (prev && prev.id === assignment.id ? { ...prev, completed: !assignment.completed } : prev));
    toggleAssignmentCompletion(assignment);
  };

  const handleUpdateAssignment = (data: { id: string; updates: AssignmentUpdate }) => {
    return updateAssignment(data);
  };

  const handleCompleteStudySession = (session: StudySessionWithCourse) => {
    // Optimistically update the selected event in the sidebar
    setSelectedEvent(prev => (prev && prev.id === session.id ? { ...prev, completed: !session.completed } : prev));
    updateStudySession({ id: session.id, completed: !session.completed });
  };

  const handlePreviousWeek = () => {
    setSelectedDate(subWeeks(selectedDate, 1));
  };

  const handleNextWeek = () => {
    setSelectedDate(addWeeks(selectedDate, 1));
  };

  const handleEventClick = (event: PlannerEvent, eventType: 'assignment' | 'study') => {
    setSelectedEvent(event);
    setSelectedEventType(eventType);
  };

  const handleCloseSidebar = () => {
    setSelectedEvent(null);
    setSelectedEventType(null);
  };

  return (
    <div className="app-background h-screen flex font-sans overflow-hidden">
      <Navigation />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <PageHeader actions={<UserMenu />}>
          <h1 className="text-xl font-semibold text-gray-900">Planner</h1>
        </PageHeader>

        <div className="p-6 flex-1 flex overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden mr-6">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle>{format(selectedDate, 'MMMM yyyy')}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousWeek}
                    className="h-8 w-8"
                    aria-label="Previous week"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextWeek}
                    className="h-8 w-8"
                    aria-label="Next week"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative overflow-hidden">
              <div className="h-full overflow-hidden" data-calendar-grid>
                <TimeGridCalendar
                  selectedDate={selectedDate}
                  onDateSelect={handleDateClick}
                  assignments={assignments}
                  studySessions={studySessions}
                  courses={courses}
                  onAddStudySession={handleAddStudySession}
                  onAddAssignment={handleAddAssignment}
                  onTimeSlotSelect={handleTimeSlotSelect}
                  onEventClick={handleEventClick}
                />
              </div>
              
              {popoverAnchorElement && (
                <TimeSlotSelectionPopover
                  open={showTimeSlotPopover}
                  onOpenChange={setShowTimeSlotPopover}
                  startTime={selectedTimeSlot?.startTime || new Date()}
                  endTime={selectedTimeSlot?.endTime || new Date()}
                  onCreateStudySession={handleAddStudySession}
                  onCreateAssignment={handleAddAssignment}
                  anchorElement={popoverAnchorElement}
                />
              )}
            </CardContent>
          </Card>

          {/* Event Details Sidebar */}
          <PlannerEventSidebar
            event={selectedEvent}
            eventType={selectedEventType}
            courses={courses}
            onClose={handleCloseSidebar}
            onUpdateAssignment={handleUpdateAssignment}
            onCompleteAssignment={handleCompleteAssignment}
            onDeleteAssignment={handleDeleteAssignment}
            onCompleteStudySession={handleCompleteStudySession}
            onDeleteStudySession={handleDeleteStudySession}
            onMakeStudyPlan={() => selectedEvent?.id && generatePlan(selectedEvent.id)}
            isGeneratingStudyPlan={isGenerating}
            isUpdating={isUpdating}
            isDeleting={isDeleting}
            isTogglingCompletion={isTogglingCompletion}
          />
        </div>
      </main>

      <AddStudySessionDialog 
        open={showAddStudySessionDialog} 
        onOpenChange={setShowAddStudySessionDialog}
        // Always use time slot START as scheduled date
        selectedDate={selectedTimeSlot?.startTime || selectedDate}
      />
      
      <AddAssignmentDialog 
        open={showAddAssignmentDialog} 
        onOpenChange={setShowAddAssignmentDialog}
        // Always use slot START for due date, not END
        initialDueDate={selectedTimeSlot?.startTime || selectedDate}
      />

      {selectedEvent && (
        <StudyPlanDialog
          open={!!plan}
          onOpenChange={(isOpen) => !isOpen && clearPlan()}
          plan={plan}
          onConfirm={() => addPlanToPlanner({ assignmentTitle: selectedEvent.title })}
          isAdding={isAdding}
          assignmentTitle={selectedEvent.title || ''}
        />
      )}
    </div>
  );
};

export default Planner;
